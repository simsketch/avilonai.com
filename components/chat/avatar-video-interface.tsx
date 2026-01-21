"use client"

import { useState, useEffect, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Video, AlertCircle, Mic, MicOff, Volume2, VolumeX, ArrowLeft, Sparkles, Leaf } from "lucide-react"
import { useToast } from "@/components/ui/use-toast"

interface AvatarVideoInterfaceProps {
  sessionId: string
  onBack?: () => void
}

interface AvatarConfig {
  voiceModelId: string
  avatarImageUrl: string
  voiceName: string
}

interface StreamingConfig {
  sttApiKey: string
  sttWebSocketUrl: string
  vadSettings: {
    endpointing: number
    minSpeechDuration: number
    encoding: string
    sampleRate: number
    channels: number
  }
  expiresAt: string
}

interface ConversationMessage {
  role: "user" | "assistant"
  text: string
  videoUrl?: string
  audioUrl?: string
}

export function AvatarVideoInterface({ sessionId, onBack }: AvatarVideoInterfaceProps) {
  // State
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [avatarConfig, setAvatarConfig] = useState<AvatarConfig | null>(null)
  const [streamingConfig, setStreamingConfig] = useState<StreamingConfig | null>(null)
  const [isRecording, setIsRecording] = useState(false)
  const [isProcessing, setIsProcessing] = useState(false)
  const [isMuted, setIsMuted] = useState(false)
  const [currentVideoUrl, setCurrentVideoUrl] = useState<string | null>(null)
  const [messages, setMessages] = useState<ConversationMessage[]>([])
  const [transcription, setTranscription] = useState("")
  const [greeting, setGreeting] = useState("")

  // Refs
  const videoRef = useRef<HTMLVideoElement>(null)
  const audioContextRef = useRef<AudioContext | null>(null)
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const audioChunksRef = useRef<Blob[]>([])
  const wsRef = useRef<WebSocket | null>(null)
  const { toast } = useToast()

  // Initialize session
  useEffect(() => {
    initializeSession()
    return () => {
      cleanup()
    }
  }, [sessionId])

  const cleanup = () => {
    if (wsRef.current) {
      wsRef.current.close()
    }
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      mediaRecorderRef.current.stop()
    }
    if (audioContextRef.current) {
      audioContextRef.current.close()
    }
  }

  const initializeSession = async () => {
    try {
      setIsLoading(true)
      setError(null)

      const response = await fetch("/api/avatar/stream", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || "Failed to start avatar session")
      }

      const data = await response.json()

      if (!data.avatarConfig) {
        throw new Error("No avatar profile found. Please set up your avatar first.")
      }

      setAvatarConfig(data.avatarConfig)
      setStreamingConfig(data.streaming)
      setGreeting(data.greeting)

      // Generate initial greeting video
      await generateGreeting(data.greeting, data.avatarConfig)

      toast({
        title: "Avatar Session Ready",
        description: `Connected with ${data.avatarConfig.voiceName || "your avatar"}`,
      })
    } catch (error: any) {
      console.error("Avatar session error:", error)
      setError(error.message || "Failed to start avatar session")
      toast({
        title: "Error",
        description: error.message || "Failed to start avatar session",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const generateGreeting = async (greetingText: string, config: AvatarConfig) => {
    try {
      setIsProcessing(true)

      const response = await fetch("/api/avatar/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text: greetingText,
          sessionId,
          messageHistory: [],
        }),
      })

      if (!response.ok) {
        throw new Error("Failed to generate greeting")
      }

      const data = await response.json()

      setCurrentVideoUrl(data.videoUrl)
      setMessages([{
        role: "assistant",
        text: data.responseText,
        videoUrl: data.videoUrl,
        audioUrl: data.audioUrl,
      }])

      // Auto-play greeting video
      if (videoRef.current && data.videoUrl) {
        videoRef.current.src = data.videoUrl
        videoRef.current.play().catch(console.error)
      }
    } catch (error) {
      console.error("Greeting generation error:", error)
      // Continue without greeting video
    } finally {
      setIsProcessing(false)
    }
  }

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          sampleRate: streamingConfig?.vadSettings.sampleRate || 16000,
          channelCount: streamingConfig?.vadSettings.channels || 1,
          echoCancellation: true,
          noiseSuppression: true,
        },
      })

      audioChunksRef.current = []

      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: "audio/webm;codecs=opus",
      })

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data)
        }
      }

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: "audio/webm" })
        await processAudioInput(audioBlob)

        // Stop all tracks
        stream.getTracks().forEach((track) => track.stop())
      }

      mediaRecorderRef.current = mediaRecorder
      mediaRecorder.start(100) // Collect data every 100ms
      setIsRecording(true)
      setTranscription("")

      // Optional: Connect to Deepgram for real-time transcription
      connectToSTT()
    } catch (error: any) {
      console.error("Recording error:", error)
      toast({
        title: "Microphone Error",
        description: error.message || "Could not access microphone",
        variant: "destructive",
      })
    }
  }

  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      mediaRecorderRef.current.stop()
      setIsRecording(false)
    }

    if (wsRef.current) {
      wsRef.current.close()
      wsRef.current = null
    }
  }

  const connectToSTT = () => {
    if (!streamingConfig) return

    try {
      const ws = new WebSocket(streamingConfig.sttWebSocketUrl, [
        "token",
        streamingConfig.sttApiKey,
      ])

      ws.onopen = () => {
        console.log("STT WebSocket connected")
      }

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data)
          if (data.type === "Results" && data.channel?.alternatives?.[0]) {
            const transcript = data.channel.alternatives[0].transcript
            if (transcript) {
              setTranscription((prev) => {
                if (data.is_final) {
                  return prev + transcript + " "
                }
                return prev.split(" ").slice(0, -1).join(" ") + " " + transcript
              })
            }
          }
        } catch (e) {
          console.error("STT message parse error:", e)
        }
      }

      ws.onerror = (error) => {
        console.error("STT WebSocket error:", error)
      }

      ws.onclose = () => {
        console.log("STT WebSocket closed")
      }

      wsRef.current = ws
    } catch (error) {
      console.error("STT connection error:", error)
    }
  }

  const processAudioInput = async (audioBlob: Blob) => {
    try {
      setIsProcessing(true)

      const formData = new FormData()
      formData.append("audio", audioBlob, "recording.webm")
      formData.append("sessionId", sessionId)
      formData.append("messageHistory", JSON.stringify(messages.map((m) => ({
        role: m.role,
        content: m.text,
      }))))

      const response = await fetch("/api/avatar/generate", {
        method: "POST",
        body: formData,
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || "Failed to generate response")
      }

      const data = await response.json()

      // Add user message
      setMessages((prev) => [
        ...prev,
        {
          role: "user",
          text: data.userText,
        },
        {
          role: "assistant",
          text: data.responseText,
          videoUrl: data.videoUrl,
          audioUrl: data.audioUrl,
        },
      ])

      // Play response video
      setCurrentVideoUrl(data.videoUrl)
      if (videoRef.current && data.videoUrl) {
        videoRef.current.src = data.videoUrl
        videoRef.current.play().catch(console.error)
      }

      setTranscription("")
    } catch (error: any) {
      console.error("Process audio error:", error)
      toast({
        title: "Error",
        description: error.message || "Failed to process audio",
        variant: "destructive",
      })
    } finally {
      setIsProcessing(false)
    }
  }

  const toggleMute = () => {
    if (videoRef.current) {
      videoRef.current.muted = !isMuted
      setIsMuted(!isMuted)
    }
  }

  const handleEndSession = () => {
    cleanup()
    onBack?.()
  }

  // Loading state
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[calc(100vh-8rem)] p-6">
        {/* Decorative blobs */}
        <div className="fixed top-20 left-10 w-48 h-48 bg-terracotta-light/20 blob animate-float -z-10" />
        <div className="fixed bottom-20 right-10 w-40 h-40 bg-sage-light/30 blob-2 animate-float -z-10" style={{ animationDelay: '2s' }} />

        <div className="glass-card rounded-3xl p-10 warm-shadow-lg max-w-md w-full">
          <div className="text-center space-y-6">
            {/* Animated loading */}
            <div className="relative">
              <div className="w-24 h-24 mx-auto">
                <div className="absolute inset-0 bg-gradient-to-br from-terracotta to-coral rounded-full animate-breathe" />
                <div className="absolute inset-3 bg-gradient-to-br from-sage-light to-sage rounded-full animate-breathe-slow opacity-70" style={{ animationDelay: '0.5s' }} />
                <div className="absolute inset-6 bg-white/80 rounded-full flex items-center justify-center">
                  <Video className="h-6 w-6 text-terracotta" />
                </div>
              </div>
            </div>
            <div className="space-y-2">
              <h3 className="font-display text-xl text-deep-brown">
                Preparing Your Session
              </h3>
              <p className="text-sm text-muted-foreground">
                Setting up your AI therapy companion...
              </p>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // Error state
  if (error) {
    return (
      <div className="flex items-center justify-center min-h-[calc(100vh-8rem)] p-6">
        <div className="glass-card rounded-3xl p-8 warm-shadow-lg max-w-md w-full">
          <div className="text-center space-y-6">
            <div className="w-16 h-16 mx-auto bg-red-100 rounded-full flex items-center justify-center">
              <AlertCircle className="h-8 w-8 text-red-500" />
            </div>
            <div className="space-y-2">
              <h3 className="font-display text-xl text-deep-brown">
                Unable to Start Session
              </h3>
              <p className="text-sm text-red-600 bg-red-50 rounded-xl p-3">
                {error}
              </p>
            </div>
            <div className="flex gap-3">
              {onBack && (
                <Button
                  variant="ghost"
                  onClick={onBack}
                  className="flex-1 h-12 rounded-xl hover:bg-soft-sand"
                >
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Go Back
                </Button>
              )}
              <Button
                onClick={initializeSession}
                className="flex-1 h-12 rounded-xl bg-gradient-to-r from-terracotta to-coral hover:from-terracotta/90 hover:to-coral/90 warm-shadow"
              >
                Try Again
              </Button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div
      className="flex flex-col max-w-6xl mx-auto p-4 md:p-6"
      style={{ height: "calc(100dvh - 4rem)" }}
    >
      {/* Decorative blobs */}
      <div className="fixed top-20 right-10 w-32 h-32 bg-sage-light/20 blob animate-float -z-10 opacity-50" />
      <div className="fixed bottom-40 left-5 w-24 h-24 bg-coral/10 blob-2 animate-float -z-10 opacity-50" style={{ animationDelay: '3s' }} />

      {/* Main Container */}
      <div className="flex-1 flex flex-col glass-card rounded-3xl overflow-hidden warm-shadow-lg">
        {/* Header */}
        <div className="px-4 md:px-6 py-3 md:py-4 border-b border-border/30 bg-gradient-to-r from-white/80 to-warm-cream/80 backdrop-blur-sm">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-terracotta to-coral flex items-center justify-center animate-breathe-slow">
                <Leaf className="w-5 h-5 text-white" />
              </div>
              <div>
                <h2 className="font-display text-base md:text-lg text-deep-brown">
                  {avatarConfig?.voiceName ? `Session with ${avatarConfig.voiceName}` : "Video Session"}
                </h2>
                <p className="text-xs text-muted-foreground hidden sm:block">
                  AI-powered conversation
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="icon"
                onClick={toggleMute}
                className="h-9 w-9 rounded-xl hover:bg-soft-sand"
              >
                {isMuted ? (
                  <VolumeX className="h-4 w-4 text-muted-foreground" />
                ) : (
                  <Volume2 className="h-4 w-4 text-terracotta" />
                )}
              </Button>
              {onBack && (
                <Button
                  variant="outline"
                  onClick={handleEndSession}
                  size="sm"
                  className="rounded-xl border-border/50 hover:bg-soft-sand"
                >
                  End
                </Button>
              )}
            </div>
          </div>
        </div>

        {/* Video Area */}
        <div className="flex-1 relative bg-gradient-to-b from-deep-brown/90 to-deep-brown overflow-hidden">
          {/* Video display */}
          <div className="absolute inset-0 flex items-center justify-center">
            {currentVideoUrl ? (
              <video
                ref={videoRef}
                className="max-w-full max-h-full object-contain rounded-lg"
                playsInline
                autoPlay
                muted={isMuted}
                onEnded={() => {
                  // Video finished playing
                }}
              />
            ) : avatarConfig?.avatarImageUrl ? (
              <div className="relative">
                <img
                  src={avatarConfig.avatarImageUrl}
                  alt="Avatar"
                  className="max-w-full max-h-full object-contain opacity-80 rounded-2xl"
                />
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="bg-black/30 backdrop-blur-sm rounded-full p-4">
                    <Sparkles className="h-8 w-8 text-white/80 animate-breathe" />
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-white/50 text-center">
                <Video className="h-16 w-16 mx-auto mb-4 opacity-50" />
                <p className="text-sm">Avatar video will appear here</p>
              </div>
            )}
          </div>

          {/* Processing overlay */}
          {isProcessing && (
            <div className="absolute inset-0 bg-deep-brown/70 backdrop-blur-sm flex items-center justify-center">
              <div className="text-center text-white space-y-4">
                <div className="relative">
                  <div className="w-16 h-16 mx-auto">
                    <div className="absolute inset-0 bg-gradient-to-br from-terracotta to-coral rounded-full animate-breathe" />
                    <div className="absolute inset-2 bg-gradient-to-br from-sage-light to-sage rounded-full animate-breathe-slow opacity-70" style={{ animationDelay: '0.3s' }} />
                  </div>
                </div>
                <p className="text-lg font-display">Generating response...</p>
              </div>
            </div>
          )}

          {/* Transcription overlay */}
          {(isRecording || transcription) && (
            <div className="absolute bottom-24 left-4 right-4">
              <div className="glass-card rounded-2xl p-4 backdrop-blur-md bg-white/10 border-white/20">
                <p className="text-white text-sm">
                  {transcription || "Listening..."}
                  {isRecording && <span className="animate-pulse ml-1 text-coral">|</span>}
                </p>
              </div>
            </div>
          )}

          {/* Microphone button */}
          <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2">
            <div className="relative">
              {isRecording && (
                <div className="absolute inset-0 -m-2 rounded-full bg-coral/30 animate-pulse-ring" />
              )}
              <Button
                size="lg"
                className={`
                  rounded-full w-16 h-16 transition-all duration-300 ease-organic
                  ${isRecording
                    ? "bg-gradient-to-br from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 scale-110"
                    : "bg-gradient-to-br from-terracotta to-coral hover:from-terracotta/90 hover:to-coral/90"
                  }
                  warm-shadow-lg
                `}
                onClick={isRecording ? stopRecording : startRecording}
                disabled={isProcessing}
              >
                {isRecording ? (
                  <MicOff className="h-7 w-7" />
                ) : (
                  <Mic className="h-7 w-7" />
                )}
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Tip */}
      <div className="mt-4 p-4 bg-gradient-to-r from-sage-light/30 to-sage/20 border border-sage/20 rounded-2xl">
        <p className="text-sm text-sage text-center">
          <strong className="font-medium">Tip:</strong> Press the microphone button to speak, then press again to send.
          Your avatar will respond with a personalized video.
        </p>
      </div>
    </div>
  )
}
