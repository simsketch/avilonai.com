"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Camera, AlertCircle, Leaf, ArrowLeft, Mic, MicOff, Upload, Loader2, Subtitles } from "lucide-react"
import { useToast } from "@/components/ui/use-toast"
import { SimliClient } from "simli-client"

interface SimliVideoInterfaceProps {
  sessionId: string
  onBack?: () => void
}

interface CaptionMessage {
  speaker: "user" | "bot"
  text: string
  isFinal: boolean
  timestamp: number
}

export function SimliVideoInterface({ sessionId, onBack }: SimliVideoInterfaceProps) {
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isConnected, setIsConnected] = useState(false)
  const [isMuted, setIsMuted] = useState(false)
  const [isBotSpeaking, setIsBotSpeaking] = useState(false)
  const [faceId, setFaceId] = useState<string | null>(null)
  const [isUploading, setIsUploading] = useState(false)
  const [showUpload, setShowUpload] = useState(true)

  // Captioning state
  const [captions, setCaptions] = useState<CaptionMessage[]>([])
  const [showCaptions, setShowCaptions] = useState(true)

  // Refs
  const videoRef = useRef<HTMLVideoElement>(null)
  const audioRef = useRef<HTMLAudioElement>(null)
  const simliClientRef = useRef<SimliClient | null>(null)
  const simliReadyRef = useRef(false)
  const audioBufferRef = useRef<Uint8Array[]>([])
  const wsRef = useRef<WebSocket | null>(null)
  const mediaStreamRef = useRef<MediaStream | null>(null)
  const audioContextRef = useRef<AudioContext | null>(null)
  const processorRef = useRef<ScriptProcessorNode | null>(null)
  const playbackContextRef = useRef<AudioContext | null>(null)
  const mountedRef = useRef(true)
  const botTextAccumRef = useRef("")
  const connectingRef = useRef(false)
  const greetingPhaseRef = useRef(true)

  const { toast } = useToast()

  // Resample 16-bit PCM audio from srcRate to dstRate using linear interpolation
  const resamplePCM16 = (input: Uint8Array, srcRate: number, dstRate: number): Uint8Array => {
    if (srcRate === dstRate) return input
    const srcView = new DataView(input.buffer, input.byteOffset, input.byteLength)
    const srcSamples = input.byteLength / 2
    const ratio = srcRate / dstRate
    const dstSamples = Math.floor(srcSamples / ratio)
    const output = new Uint8Array(dstSamples * 2)
    const dstView = new DataView(output.buffer)

    for (let i = 0; i < dstSamples; i++) {
      const srcPos = i * ratio
      const srcIdx = Math.floor(srcPos)
      const frac = srcPos - srcIdx
      const s0 = srcIdx < srcSamples ? srcView.getInt16(srcIdx * 2, true) : 0
      const s1 = srcIdx + 1 < srcSamples ? srcView.getInt16((srcIdx + 1) * 2, true) : s0
      const sample = Math.round(s0 + frac * (s1 - s0))
      dstView.setInt16(i * 2, Math.max(-32768, Math.min(32767, sample)), true)
    }
    return output
  }

  // Handle photo upload
  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    if (!file.type.startsWith("image/")) {
      toast({
        title: "Invalid File",
        description: "Please upload an image file",
        variant: "destructive",
      })
      return
    }

    setIsUploading(true)
    setError(null)

    try {
      const formData = new FormData()
      formData.append("file", file)

      const response = await fetch("/api/pipecat/upload-face", {
        method: "POST",
        body: formData,
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || "Failed to upload photo")
      }

      const data = await response.json()
      setFaceId(data.face_id)
      setShowUpload(false)

      toast({
        title: "Photo Uploaded",
        description: "Your avatar is being created...",
      })

      // Now connect to the WebSocket
      await connectToWebSocket(data.face_id)
    } catch (err: any) {
      console.error("Upload error:", err)
      setError(err.message || "Failed to upload photo")
      toast({
        title: "Upload Failed",
        description: err.message || "Could not create avatar from photo",
        variant: "destructive",
      })
    } finally {
      setIsUploading(false)
    }
  }

  // Connect to WebSocket backend
  const connectToWebSocket = useCallback(async (faceIdToUse: string) => {
    if (!mountedRef.current || connectingRef.current || wsRef.current) return
    connectingRef.current = true

    try {
      setIsLoading(true)
      setError(null)

      // Get Simli API key from backend
      const configResponse = await fetch("/api/pipecat/simli-config")
      if (!configResponse.ok) {
        throw new Error("Failed to get Simli configuration")
      }
      const config = await configResponse.json()

      // Store config for Simli initialization (happens after video element is rendered)
      setSimliConfig({ apiKey: config.apiKey, faceId: config.faceId || "" })

      // Connect to WebSocket for audio processing (pipecat service)
      const pipecatWsUrl = config.pipecatWsUrl || "ws://localhost:8080"
      const wsUrl = new URL("/ws/audio", pipecatWsUrl)
      wsUrl.searchParams.set("session_id", sessionId)
      wsUrl.searchParams.set("face_id", faceIdToUse === "default" ? (config.faceId || "") : faceIdToUse)

      console.log("Connecting to WebSocket:", wsUrl.toString())
      const ws = new WebSocket(wsUrl.toString())
      wsRef.current = ws

      ws.onopen = () => {
        console.log("WebSocket connected")
        if (mountedRef.current) {
          setIsConnected(true)
          setIsLoading(false)
          toast({
            title: "Connected",
            description: "Your avatar is ready for conversation",
          })
        }
      }

      ws.onmessage = async (event) => {
        if (!mountedRef.current) return

        try {
          const message = JSON.parse(event.data)

          switch (message.type) {
            case "audio":
              // Send TTS audio to Simli for avatar rendering (Simli handles audio playback via audioRef)
              if (message.data) {
                const rawAudio = Uint8Array.from(atob(message.data), (c) => c.charCodeAt(0))
                // Resample from Cartesia TTS 24kHz to Simli's expected 16kHz
                const sampleRate = message.sample_rate || 24000
                const audioData = resamplePCM16(rawAudio, sampleRate, 16000)
                setIsBotSpeaking(true)

                // Send to Simli for lip sync + audio playback
                if (simliClientRef.current && simliReadyRef.current) {
                  simliClientRef.current.sendAudioData(audioData)
                } else {
                  // Buffer audio until Simli is ready
                  audioBufferRef.current.push(audioData)
                }
              }
              break

            case "text":
              // Skip text frames during greeting phase (greeting is shown separately)
              if (greetingPhaseRef.current) break
              // Bot response text - accumulate tokens into current response
              // Add space before token if accumulator is non-empty and token doesn't start with punctuation
              const token = message.text
              if (botTextAccumRef.current && token && !/^[.,!?;:'")\]}]/.test(token)) {
                botTextAccumRef.current += " " + token
              } else {
                botTextAccumRef.current += token
              }
              setCaptions((prev) => {
                // Update the last bot caption if it exists and is being accumulated
                const lastIdx = prev.length - 1
                if (lastIdx >= 0 && prev[lastIdx].speaker === "bot" && !prev[lastIdx].isFinal) {
                  const updated = [...prev]
                  updated[lastIdx] = {
                    ...updated[lastIdx],
                    text: botTextAccumRef.current,
                  }
                  return updated
                }
                // Start a new bot caption
                return [
                  ...prev.slice(-9),
                  {
                    speaker: "bot",
                    text: botTextAccumRef.current,
                    isFinal: false,
                    timestamp: Date.now(),
                  },
                ]
              })
              break

            case "bot_response_end":
              // Mark current bot caption as final and reset accumulator
              greetingPhaseRef.current = false
              botTextAccumRef.current = ""
              setCaptions((prev) => {
                const lastIdx = prev.length - 1
                if (lastIdx >= 0 && prev[lastIdx].speaker === "bot") {
                  const updated = [...prev]
                  updated[lastIdx] = { ...updated[lastIdx], isFinal: true }
                  return updated
                }
                return prev
              })
              setIsBotSpeaking(false)
              break

            case "transcription":
              // End greeting phase on first user speech
              greetingPhaseRef.current = false
              // User transcription for captions
              // Finalize any in-progress bot caption first
              if (botTextAccumRef.current) {
                botTextAccumRef.current = ""
                setCaptions((prev) => {
                  const lastIdx = prev.length - 1
                  if (lastIdx >= 0 && prev[lastIdx].speaker === "bot" && !prev[lastIdx].isFinal) {
                    const updated = [...prev]
                    updated[lastIdx] = { ...updated[lastIdx], isFinal: true }
                    return updated
                  }
                  return prev
                })
              }
              setCaptions((prev) => {
                const filtered = message.is_final
                  ? prev.filter((c) => c.speaker !== "user" || c.isFinal)
                  : prev.filter((c) => !(c.speaker === "user" && !c.isFinal))
                return [
                  ...filtered.slice(-9),
                  {
                    speaker: "user",
                    text: message.text,
                    isFinal: message.is_final,
                    timestamp: Date.now(),
                  },
                ]
              })
              break

            case "greeting":
              // Initial greeting - show as complete caption
              setCaptions((prev) => [
                ...prev.slice(-9),
                {
                  speaker: "bot",
                  text: message.text,
                  isFinal: true,
                  timestamp: Date.now(),
                },
              ])
              break

            case "speaking_end":
              setIsBotSpeaking(false)
              break

            case "ready":
              console.log("Backend ready")
              break
          }
        } catch (err) {
          console.error("WebSocket message error:", err)
        }
      }

      ws.onerror = (err) => {
        console.error("WebSocket error:", err)
        if (mountedRef.current) {
          setError("Connection error")
          setIsLoading(false)
        }
      }

      ws.onclose = () => {
        console.log("WebSocket closed")
        if (mountedRef.current) {
          setIsConnected(false)
        }
      }

      // Start microphone capture
      await startMicrophoneCapture()
    } catch (err: any) {
      console.error("Connection error:", err)
      if (mountedRef.current) {
        setError(err.message || "Failed to connect")
        setIsLoading(false)
      }
    }
  }, [sessionId, toast])

  // Play TTS audio directly through Web Audio API
  const playAudioChunk = (pcmData: Uint8Array, sampleRate: number) => {
    try {
      if (!playbackContextRef.current) {
        playbackContextRef.current = new AudioContext({ sampleRate })
      }
      const ctx = playbackContextRef.current
      // Convert Int16 PCM to Float32
      const int16 = new Int16Array(pcmData.buffer, pcmData.byteOffset, pcmData.byteLength / 2)
      const float32 = new Float32Array(int16.length)
      for (let i = 0; i < int16.length; i++) {
        float32[i] = int16[i] / 32768
      }
      const buffer = ctx.createBuffer(1, float32.length, sampleRate)
      buffer.getChannelData(0).set(float32)
      const source = ctx.createBufferSource()
      source.buffer = buffer
      source.connect(ctx.destination)
      source.start()
    } catch (err) {
      // Silently ignore audio playback errors
    }
  }

  // Start microphone capture
  const startMicrophoneCapture = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          sampleRate: 16000,
          channelCount: 1,
          echoCancellation: true,
          noiseSuppression: true,
        },
      })

      mediaStreamRef.current = stream

      // Create audio context for processing
      const audioContext = new AudioContext({ sampleRate: 16000 })
      audioContextRef.current = audioContext

      const source = audioContext.createMediaStreamSource(stream)
      const processor = audioContext.createScriptProcessor(4096, 1, 1)
      processorRef.current = processor

      processor.onaudioprocess = (e) => {
        if (wsRef.current?.readyState === WebSocket.OPEN && !isMuted) {
          const inputData = e.inputBuffer.getChannelData(0)
          // Convert Float32 to Int16
          const pcmData = new Int16Array(inputData.length)
          for (let i = 0; i < inputData.length; i++) {
            pcmData[i] = Math.max(-32768, Math.min(32767, inputData[i] * 32768))
          }
          // Send as base64
          const base64 = btoa(String.fromCharCode(...new Uint8Array(pcmData.buffer)))
          wsRef.current.send(
            JSON.stringify({
              type: "audio",
              data: base64,
              sample_rate: 16000,
              channels: 1,
            })
          )
        }
      }

      source.connect(processor)
      processor.connect(audioContext.destination)

      console.log("Microphone capture started")
    } catch (err: any) {
      console.error("Microphone error:", err)
      toast({
        title: "Microphone Error",
        description: err.message || "Could not access microphone",
        variant: "destructive",
      })
    }
  }

  // Cleanup
  const cleanup = useCallback(() => {
    if (processorRef.current) {
      processorRef.current.disconnect()
      processorRef.current = null
    }
    if (audioContextRef.current) {
      audioContextRef.current.close()
      audioContextRef.current = null
    }
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach((track) => track.stop())
      mediaStreamRef.current = null
    }
    if (wsRef.current) {
      wsRef.current.send(JSON.stringify({ type: "stop" }))
      wsRef.current.close()
      wsRef.current = null
    }
    if (simliClientRef.current) {
      simliClientRef.current.close()
      simliClientRef.current = null
    }
    simliReadyRef.current = false
    if (playbackContextRef.current) {
      playbackContextRef.current.close()
      playbackContextRef.current = null
    }
  }, [])

  // Mount/unmount
  useEffect(() => {
    mountedRef.current = true
    return () => {
      mountedRef.current = false
      cleanup()
    }
  }, [cleanup])

  // Toggle mute
  const toggleMute = () => {
    setIsMuted(!isMuted)
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getAudioTracks().forEach((track) => {
        track.enabled = isMuted // Toggle (current state is opposite of what we want)
      })
    }
  }

  // End session
  const handleEndSession = () => {
    cleanup()
    onBack?.()
  }

  // State for storing config
  const [simliConfig, setSimliConfig] = useState<{ apiKey: string; faceId: string } | null>(null)

  // Connect on mount using default face (run once only)
  const initialConnectRef = useRef(false)
  useEffect(() => {
    if (!initialConnectRef.current && showUpload && !faceId) {
      initialConnectRef.current = true
      setShowUpload(false)
      connectToWebSocket("default")
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // Initialize Simli after video element is rendered and WebSocket is connected
  useEffect(() => {
    if (!isConnected || !videoRef.current || !audioRef.current || simliClientRef.current) {
      return
    }

    const initSimli = async () => {
      try {
        // Get config if not already fetched
        let config = simliConfig
        if (!config) {
          const configResponse = await fetch("/api/pipecat/simli-config")
          if (configResponse.ok) {
            config = await configResponse.json()
            setSimliConfig(config)
          } else {
            console.error("Failed to get Simli config")
            return
          }
        }

        if (!config) return

        const simliClient = new SimliClient()
        simliClientRef.current = simliClient

        const actualFaceId = config.faceId || "afdb6a3e-3939-40aa-92df-01604c23101c"
        console.log("Initializing Simli with faceId:", actualFaceId)

        simliClient.Initialize({
          apiKey: config!.apiKey,
          faceID: actualFaceId,
          handleSilence: true,
          maxSessionLength: 3600,
          maxIdleTime: 600,
          videoRef: videoRef.current!,
          audioRef: audioRef.current!,
          session_token: "",
          SimliURL: "s://api.simli.ai",
          maxRetryAttempts: 100,
          retryDelay_ms: 2000,
          videoReceivedTimeout: 15000,
          enableSFU: true,
          model: "fasttalk",
          enableConsoleLogs: true,
        })

        console.log("Starting Simli client...")
        await simliClient.start()
        console.log("Simli client started successfully")

        // Mark Simli as ready and flush buffered audio
        simliReadyRef.current = true
        if (audioBufferRef.current.length > 0) {
          console.log(`Flushing ${audioBufferRef.current.length} buffered audio chunks to Simli`)
          for (const chunk of audioBufferRef.current) {
            simliClient.sendAudioData(chunk)
          }
          audioBufferRef.current = []
        }
      } catch (err: any) {
        console.error("Simli initialization error:", err)
      }
    }

    initSimli()
  }, [isConnected, simliConfig])

  // Loading state
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[calc(100vh-8rem)] p-6">
        <div className="fixed top-20 left-10 w-48 h-48 bg-amber-200/20 blob animate-float -z-10" />
        <div className="fixed bottom-20 right-10 w-40 h-40 bg-orange-200/30 blob-2 animate-float -z-10" style={{ animationDelay: "2s" }} />

        <div className="glass-card rounded-3xl p-10 warm-shadow-lg max-w-md w-full">
          <div className="text-center space-y-6">
            <div className="relative">
              <div className="w-24 h-24 mx-auto">
                <div className="absolute inset-0 bg-gradient-to-br from-amber-500 to-orange-600 rounded-full animate-breathe" />
                <div className="absolute inset-3 bg-gradient-to-br from-amber-300 to-orange-400 rounded-full animate-breathe-slow opacity-70" style={{ animationDelay: "0.5s" }} />
                <div className="absolute inset-6 bg-white/80 rounded-full flex items-center justify-center">
                  <Camera className="h-6 w-6 text-amber-600" />
                </div>
              </div>
            </div>
            <div className="space-y-2">
              <h3 className="font-display text-xl text-deep-brown">Preparing Your Avatar</h3>
              <p className="text-sm text-muted-foreground">Setting up your photorealistic conversation...</p>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // Error state
  if (error && !isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[calc(100vh-8rem)] p-6">
        <div className="glass-card rounded-3xl p-8 warm-shadow-lg max-w-md w-full">
          <div className="text-center space-y-6">
            <div className="w-16 h-16 mx-auto bg-red-100 rounded-full flex items-center justify-center">
              <AlertCircle className="h-8 w-8 text-red-500" />
            </div>
            <div className="space-y-2">
              <h3 className="font-display text-xl text-deep-brown">Connection Failed</h3>
              <p className="text-sm text-red-600 bg-red-50 rounded-xl p-3">{error}</p>
            </div>
            <div className="flex gap-3">
              {onBack && (
                <Button variant="ghost" onClick={onBack} className="flex-1 h-12 rounded-xl hover:bg-soft-sand">
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Go Back
                </Button>
              )}
              <Button onClick={() => faceId && connectToWebSocket(faceId)} className="flex-1 h-12 rounded-xl bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700">
                Try Again
              </Button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // Main interface
  return (
    <div className="flex flex-col max-w-6xl mx-auto p-4 md:p-6" style={{ height: "calc(100dvh - 4rem)" }}>
      {/* Decorative blobs */}
      <div className="fixed top-20 right-10 w-32 h-32 bg-amber-200/20 blob animate-float -z-10 opacity-50" />
      <div className="fixed bottom-40 left-5 w-24 h-24 bg-orange-200/20 blob-2 animate-float -z-10 opacity-50" style={{ animationDelay: "3s" }} />

      {/* Main Container */}
      <div className="flex-1 flex flex-col glass-card rounded-3xl overflow-hidden warm-shadow-lg">
        {/* Header */}
        <div className="px-4 md:px-6 py-3 md:py-4 border-b border-border/30 bg-gradient-to-r from-white/80 to-amber-50/80 backdrop-blur-sm">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center animate-breathe-slow">
                <Camera className="w-5 h-5 text-white" />
              </div>
              <div>
                <h2 className="font-display text-base md:text-lg text-deep-brown">Photorealistic Avatar</h2>
                <p className="text-xs text-muted-foreground hidden sm:block">{isConnected ? "Connected • Your avatar is live" : "Connecting..."}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {/* Captions toggle */}
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowCaptions(!showCaptions)}
                className={`rounded-xl ${showCaptions ? "bg-amber-100 text-amber-600" : "hover:bg-amber-100"}`}
                title={showCaptions ? "Hide captions" : "Show captions"}
              >
                <Subtitles className="h-4 w-4" />
              </Button>
              {/* Mute button */}
              <Button variant="ghost" size="sm" onClick={toggleMute} className={`rounded-xl ${isMuted ? "bg-red-100 text-red-600" : "hover:bg-amber-100"}`}>
                {isMuted ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
              </Button>
              {/* End button */}
              {onBack && (
                <Button variant="outline" onClick={handleEndSession} size="sm" className="rounded-xl border-border/50 hover:bg-soft-sand">
                  End
                </Button>
              )}
            </div>
          </div>
        </div>

        {/* Video Area */}
        <div className="flex-1 relative bg-gradient-to-b from-amber-50/50 to-orange-50/50 flex items-center justify-center overflow-hidden">
          {/* Video element for Simli output */}
          <video ref={videoRef} autoPlay playsInline className="max-w-full max-h-full rounded-2xl shadow-lg" style={{ objectFit: "cover" }} />

          {/* Hidden audio element for Simli audio output */}
          <audio ref={audioRef} autoPlay className="hidden" />

          {/* Speaking indicator */}
          {isBotSpeaking && (
            <div className="absolute bottom-20 left-1/2 -translate-x-1/2 flex items-center gap-2 px-4 py-2 bg-white/80 rounded-full shadow-md">
              <div className="flex gap-1">
                <div className="w-2 h-2 bg-amber-500 rounded-full animate-bounce" />
                <div className="w-2 h-2 bg-amber-500 rounded-full animate-bounce" style={{ animationDelay: "0.1s" }} />
                <div className="w-2 h-2 bg-amber-500 rounded-full animate-bounce" style={{ animationDelay: "0.2s" }} />
              </div>
              <span className="text-sm text-amber-600 font-medium">Speaking</span>
            </div>
          )}

          {/* Captions */}
          {showCaptions && captions.length > 0 && (
            <div className="absolute bottom-4 left-4 right-4 space-y-2">
              {captions.slice(-3).map((caption, idx) => (
                <div
                  key={`${caption.speaker}-${caption.timestamp}-${idx}`}
                  className={`px-4 py-2 rounded-xl text-sm ${caption.speaker === "bot" ? "bg-amber-100/90 text-amber-800 ml-auto max-w-[80%]" : "bg-white/90 text-gray-800 mr-auto max-w-[80%]"} ${!caption.isFinal ? "opacity-70" : ""}`}
                >
                  <span className="font-medium">{caption.speaker === "bot" ? "Avilon: " : "You: "}</span>
                  {caption.text}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Tip */}
      <div className="mt-4 p-4 bg-gradient-to-r from-amber-100/50 to-orange-100/50 border border-amber-200/30 rounded-2xl">
        <p className="text-sm text-amber-700 text-center">
          <strong className="font-medium">Tip:</strong> Just speak naturally. Your avatar responds in real-time with lifelike movements.
          {isMuted && " Your microphone is muted."}
        </p>
      </div>
    </div>
  )
}
