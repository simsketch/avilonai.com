"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Cpu, AlertCircle, Leaf, ArrowLeft, Mic, MicOff, Volume2, VolumeX, User, Sparkles, Subtitles } from "lucide-react"
import { useToast } from "@/components/ui/use-toast"
import { connectToPipecat, type VisemeType, phonemeToViseme, type AvatarType } from "@/lib/pipecat/client"
import Daily, { DailyCall } from "@daily-co/daily-js"
import dynamic from "next/dynamic"

// Dynamically import RPMAvatar to avoid SSR issues with Three.js
const RPMAvatar = dynamic(
  () => import("./rpm-avatar").then((mod) => mod.RPMAvatar),
  { ssr: false, loading: () => <div className="flex items-center justify-center h-full"><div className="animate-spin w-8 h-8 border-4 border-violet-500 border-t-transparent rounded-full" /></div> }
)

// Re-export AvatarType for external use
export type { AvatarType }

// Module-level singleton to prevent duplicate Daily instances across React Strict Mode remounts
let globalDailyCall: DailyCall | null = null
let globalConnectionPromise: Promise<{ roomUrl: string; token: string; botId: string; avatarType: AvatarType }> | null = null
let globalSessionId: string | null = null

// Caption message structure
interface CaptionMessage {
  speaker: "user" | "bot"
  text: string
  isFinal: boolean
  timestamp: number
}

interface PipecatVideoInterfaceProps {
  sessionId: string
  avatarType?: AvatarType
  onBack?: () => void
}

// Simple avatar mouth shapes (sprite indices)
const MOUTH_SHAPES: Record<VisemeType, string> = {
  neutral: "M 50,70 Q 50,75 50,70", // Neutral line
  aa: "M 35,65 Q 50,85 65,65", // Open wide
  ee: "M 30,70 Q 50,75 70,70", // Wide smile
  oo: "M 40,65 Q 50,80 60,65 Q 50,70 40,65", // Round
  closed: "M 40,70 L 60,70", // Closed line
  fv: "M 35,68 Q 50,72 65,68", // Slight open
}

export function PipecatVideoInterface({ sessionId, avatarType: initialAvatarType = "sprite", onBack }: PipecatVideoInterfaceProps) {
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isConnected, setIsConnected] = useState(false)
  const [isMuted, setIsMuted] = useState(false)
  const [isBotSpeaking, setIsBotSpeaking] = useState(false)
  const [currentViseme, setCurrentViseme] = useState<VisemeType>("neutral")
  const [botId, setBotId] = useState<string | null>(null)
  const [activeAvatarType, setActiveAvatarType] = useState<AvatarType>(initialAvatarType)

  // Captioning state
  const [captions, setCaptions] = useState<CaptionMessage[]>([])
  const [showCaptions, setShowCaptions] = useState(true)

  const canvasRef = useRef<HTMLCanvasElement>(null)
  const videoRef = useRef<HTMLVideoElement>(null)
  const animationRef = useRef<number | null>(null)
  const mountedRef = useRef(true)
  const onBackRef = useRef(onBack)
  const { toast } = useToast()

  // Keep ref in sync with prop
  useEffect(() => {
    onBackRef.current = onBack
  }, [onBack])

  // Draw avatar on canvas
  const drawAvatar = useCallback((viseme: VisemeType, speaking: boolean) => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext("2d")
    if (!ctx) return

    const width = canvas.width
    const height = canvas.height
    const centerX = width / 2
    const centerY = height / 2

    // Clear canvas
    ctx.clearRect(0, 0, width, height)

    // Background gradient
    const gradient = ctx.createRadialGradient(centerX, centerY, 0, centerX, centerY, 150)
    gradient.addColorStop(0, "#f5f0e8")
    gradient.addColorStop(1, "#e8e0d5")
    ctx.fillStyle = gradient
    ctx.fillRect(0, 0, width, height)

    // Face circle
    ctx.beginPath()
    ctx.arc(centerX, centerY - 20, 80, 0, Math.PI * 2)
    ctx.fillStyle = "#fad9b5"
    ctx.fill()
    ctx.strokeStyle = "#e8c9a0"
    ctx.lineWidth = 2
    ctx.stroke()

    // Eyes
    const eyeY = centerY - 40
    const eyeOffset = 25

    // Left eye
    ctx.beginPath()
    ctx.arc(centerX - eyeOffset, eyeY, 8, 0, Math.PI * 2)
    ctx.fillStyle = "#ffffff"
    ctx.fill()
    ctx.beginPath()
    ctx.arc(centerX - eyeOffset, eyeY, 4, 0, Math.PI * 2)
    ctx.fillStyle = "#4a3728"
    ctx.fill()

    // Right eye
    ctx.beginPath()
    ctx.arc(centerX + eyeOffset, eyeY, 8, 0, Math.PI * 2)
    ctx.fillStyle = "#ffffff"
    ctx.fill()
    ctx.beginPath()
    ctx.arc(centerX + eyeOffset, eyeY, 4, 0, Math.PI * 2)
    ctx.fillStyle = "#4a3728"
    ctx.fill()

    // Mouth based on viseme
    ctx.beginPath()
    const mouthY = centerY + 10
    const mouthPath = new Path2D()

    switch (viseme) {
      case "aa":
        // Wide open mouth
        ctx.ellipse(centerX, mouthY, 20, 15, 0, 0, Math.PI * 2)
        ctx.fillStyle = "#8b4513"
        ctx.fill()
        break
      case "ee":
        // Wide smile
        ctx.moveTo(centerX - 25, mouthY)
        ctx.quadraticCurveTo(centerX, mouthY + 10, centerX + 25, mouthY)
        ctx.strokeStyle = "#8b4513"
        ctx.lineWidth = 3
        ctx.stroke()
        break
      case "oo":
        // Round mouth
        ctx.beginPath()
        ctx.arc(centerX, mouthY, 10, 0, Math.PI * 2)
        ctx.fillStyle = "#8b4513"
        ctx.fill()
        break
      case "fv":
        // Slight open
        ctx.moveTo(centerX - 15, mouthY)
        ctx.quadraticCurveTo(centerX, mouthY + 5, centerX + 15, mouthY)
        ctx.strokeStyle = "#8b4513"
        ctx.lineWidth = 3
        ctx.stroke()
        break
      case "closed":
        // Closed mouth
        ctx.moveTo(centerX - 15, mouthY)
        ctx.lineTo(centerX + 15, mouthY)
        ctx.strokeStyle = "#8b4513"
        ctx.lineWidth = 2
        ctx.stroke()
        break
      default:
        // Neutral slight smile
        ctx.moveTo(centerX - 15, mouthY - 2)
        ctx.quadraticCurveTo(centerX, mouthY + 3, centerX + 15, mouthY - 2)
        ctx.strokeStyle = "#8b4513"
        ctx.lineWidth = 2
        ctx.stroke()
    }

    // Speaking indicator glow
    if (speaking) {
      ctx.beginPath()
      ctx.arc(centerX, centerY - 20, 90, 0, Math.PI * 2)
      ctx.strokeStyle = "rgba(139, 92, 246, 0.5)"
      ctx.lineWidth = 4
      ctx.stroke()
    }

    // Name label
    ctx.fillStyle = "#4a3728"
    ctx.font = "16px system-ui"
    ctx.textAlign = "center"
    ctx.fillText("Avilon", centerX, height - 30)
  }, [])

  // Animation loop
  useEffect(() => {
    const animate = () => {
      drawAvatar(currentViseme, isBotSpeaking)
      animationRef.current = requestAnimationFrame(animate)
    }
    animate()

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current)
      }
    }
  }, [currentViseme, isBotSpeaking, drawAvatar])

  // Animate mouth when speaking (cycle through visemes)
  useEffect(() => {
    if (!isBotSpeaking) {
      setCurrentViseme("neutral")
      return
    }

    // Cycle through speaking mouth shapes
    const speakingShapes: VisemeType[] = ["aa", "ee", "oo", "aa", "fv", "closed", "aa", "ee"]
    let index = 0

    const interval = setInterval(() => {
      setCurrentViseme(speakingShapes[index])
      index = (index + 1) % speakingShapes.length
    }, 120) // Change mouth shape every 120ms for natural speech animation

    return () => clearInterval(interval)
  }, [isBotSpeaking])

  // Cleanup function - only called on explicit end session, not on unmount
  const cleanupCall = useCallback(async (force: boolean = false) => {
    if (!force && !globalDailyCall) return

    // Clean up audio element
    const audioEl = document.getElementById("pipecat-bot-audio")
    if (audioEl) {
      audioEl.remove()
    }

    if (globalDailyCall) {
      try {
        await globalDailyCall.leave()
        globalDailyCall.destroy()
      } catch (e) {
        console.log("Cleanup error (expected):", e)
      }
      globalDailyCall = null
      globalConnectionPromise = null
      globalSessionId = null
    }
  }, [])

  // Connect to Pipecat session using module-level singleton
  const connectToSession = useCallback(async () => {
    // If we already have a connection for this session, just sync state
    if (globalDailyCall && globalSessionId === sessionId) {
      console.log("Reusing existing Daily connection")
      const meetingState = globalDailyCall.meetingState()
      if (meetingState === "joined-meeting") {
        setIsConnected(true)
        setIsLoading(false)
      }
      return
    }

    // If there's a different session's connection, clean it up first
    if (globalDailyCall && globalSessionId !== sessionId) {
      console.log("Cleaning up previous session connection")
      await cleanupCall(true)
    }

    try {
      setIsLoading(true)
      setError(null)

      // Use existing connection promise or create new one (prevents duplicate API calls)
      if (!globalConnectionPromise || globalSessionId !== sessionId) {
        globalSessionId = sessionId
        globalConnectionPromise = connectToPipecat(sessionId, activeAvatarType)
      }

      const { roomUrl, token, botId: newBotId, avatarType: serverAvatarType } = await globalConnectionPromise

      // Update avatar type from server response
      if (serverAvatarType) {
        setActiveAvatarType(serverAvatarType)
      }

      // Check if component is still mounted
      if (!mountedRef.current) return

      setBotId(newBotId)

      console.log("Connecting to Pipecat room:", roomUrl)

      // Only create call object if we don't have one
      if (!globalDailyCall) {
        const call = Daily.createCallObject({
          audioSource: true,
          videoSource: false, // Audio only
        })

        globalDailyCall = call

        // Set up event handlers
        call.on("joined-meeting", async () => {
          console.log("Joined Pipecat meeting")

          // Ensure local audio is enabled for microphone input
          try {
            await call.setLocalAudio(true)
          } catch (e) {
            console.log("Audio setup note:", e)
          }

          if (mountedRef.current) {
            setIsConnected(true)
            setIsLoading(false)
            toast({
              title: "Connected",
              description: "You're now in a real-time AI session",
            })
          }
        })

        call.on("left-meeting", () => {
          console.log("Left Pipecat meeting")
          if (mountedRef.current) {
            setIsConnected(false)
          }
        })

        call.on("error", (e) => {
          console.error("Daily.co error:", e)
          if (mountedRef.current) {
            setError(e?.error?.msg || e?.errorMsg || "Connection error")
            setIsLoading(false)
          }
        })

        call.on("participant-joined", (e) => {
          console.log("Participant joined:", e?.participant?.user_name)
        })

        call.on("participant-left", async (e) => {
          console.log("Participant left:", e?.participant?.user_name)
          // If the bot left, end the session
          if (e?.participant?.user_name === "Avilon" && mountedRef.current) {
            toast({
              title: "Session Ended",
              description: "The AI assistant has left the session",
            })
            // Clean up and go back
            await cleanupCall(true)
            onBackRef.current?.()
          }
        })

        // Handle audio and video from bot (for playback)
        call.on("track-started", (e) => {
          if (e?.participant?.user_name === "Avilon") {
            if (e?.track?.kind === "audio") {
              console.log("Bot audio track started, binding to audio element")

              // Create an audio element to play the bot's audio
              const audioEl = document.createElement("audio")
              audioEl.id = "pipecat-bot-audio"
              audioEl.autoplay = true

              // Get the audio track and create a media stream
              const track = e.track
              if (track) {
                const stream = new MediaStream([track])
                audioEl.srcObject = stream
                audioEl.play().catch((err) => {
                  console.log("Audio autoplay blocked, user interaction required:", err)
                })

                // Remove any existing audio element
                const existing = document.getElementById("pipecat-bot-audio")
                if (existing) existing.remove()

                document.body.appendChild(audioEl)
              }
            } else if (e?.track?.kind === "video") {
              console.log("Bot video track started (Simli avatar)")

              // Attach video track to video element for Simli avatar
              const track = e.track
              if (track && videoRef.current) {
                const stream = new MediaStream([track])
                videoRef.current.srcObject = stream
                videoRef.current.play().catch((err) => {
                  console.log("Video autoplay blocked:", err)
                })
              }
            }
          }
        })

        // Use active-speaker-change to detect when bot is actually speaking
        call.on("active-speaker-change", (e) => {
          if (mountedRef.current) {
            const isBotActive = e?.activeSpeaker?.peerId &&
              call.participants()?.[e.activeSpeaker.peerId]?.user_name === "Avilon"
            setIsBotSpeaking(!!isBotActive)
            if (!isBotActive) {
              setCurrentViseme("neutral")
            }
          }
        })

        call.on("track-stopped", (e) => {
          if (e?.participant?.user_name === "Avilon" && e?.track?.kind === "audio") {
            console.log("Bot audio track stopped")

            // Clean up audio element
            const audioEl = document.getElementById("pipecat-bot-audio")
            if (audioEl) {
              audioEl.remove()
            }
          }
        })

        // Handle app messages (for viseme events and captions)
        call.on("app-message", (e) => {
          if (!mountedRef.current) return

          // Debug logging for all app messages
          console.log("[Pipecat] App message received:", e?.data?.type, e?.data)

          if (e?.data?.type === "viseme") {
            const viseme = phonemeToViseme(e.data.phoneme)
            setCurrentViseme(viseme)
          } else if (e?.data?.type === "caption") {
            // Handle caption messages from transcription sender
            const caption: CaptionMessage = {
              speaker: e.data.speaker,
              text: e.data.text,
              isFinal: e.data.is_final,
              timestamp: Date.now(),
            }

            setCaptions((prev) => {
              // If this is an interim caption, replace the last non-final caption from same speaker
              if (!caption.isFinal) {
                const lastIndex = prev.findIndex(
                  (c) => c.speaker === caption.speaker && !c.isFinal
                )
                if (lastIndex !== -1) {
                  const updated = [...prev]
                  updated[lastIndex] = caption
                  return updated
                }
              } else {
                // Final caption: remove any interim from same speaker and add final
                const filtered = prev.filter(
                  (c) => c.speaker !== caption.speaker || c.isFinal
                )
                return [...filtered, caption].slice(-10) // Keep last 10 captions
              }
              return [...prev, caption].slice(-10)
            })
          } else if (e?.data?.type === "speaking_state") {
            setIsBotSpeaking(e.data.is_speaking)
            if (!e.data.is_speaking) {
              setCurrentViseme("neutral")
            }
          }
        })

        // Join the room
        await call.join({ url: roomUrl, token })
      }
    } catch (err: any) {
      console.error("Pipecat connection error:", err)
      globalConnectionPromise = null // Allow retry
      globalSessionId = null
      if (mountedRef.current) {
        setError(err?.message || "Failed to connect")
        setIsLoading(false)
        toast({
          title: "Connection Failed",
          description: err?.message || "Could not connect to real-time AI",
          variant: "destructive",
        })
      }
    }
  }, [sessionId, activeAvatarType, toast, cleanupCall])

  // Initialize connection
  useEffect(() => {
    mountedRef.current = true
    connectToSession()

    return () => {
      // Only mark as unmounted - don't cleanup the singleton
      // This allows React Strict Mode remounts to reuse the connection
      mountedRef.current = false
    }
  }, [connectToSession])

  // Handle mute toggle
  const toggleMute = () => {
    if (globalDailyCall) {
      globalDailyCall.setLocalAudio(!isMuted)
      setIsMuted(!isMuted)
    }
  }

  // Handle end session
  const handleEndSession = useCallback(async () => {
    await cleanupCall(true)
    onBack?.()
  }, [cleanupCall, onBack])

  // Handle retry
  const handleRetry = useCallback(async () => {
    // Clean up any existing connection
    await cleanupCall(true)
    setError(null)
    // Small delay to ensure cleanup is complete
    setTimeout(() => {
      connectToSession()
    }, 100)
  }, [connectToSession, cleanupCall])

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[calc(100vh-8rem)] p-6">
        <div className="fixed top-20 left-10 w-48 h-48 bg-violet-200/20 blob animate-float -z-10" />
        <div className="fixed bottom-20 right-10 w-40 h-40 bg-purple-200/30 blob-2 animate-float -z-10" style={{ animationDelay: '2s' }} />

        <div className="glass-card rounded-3xl p-10 warm-shadow-lg max-w-md w-full">
          <div className="text-center space-y-6">
            <div className="relative">
              <div className="w-24 h-24 mx-auto">
                <div className="absolute inset-0 bg-gradient-to-br from-violet-500 to-purple-600 rounded-full animate-breathe" />
                <div className="absolute inset-3 bg-gradient-to-br from-violet-300 to-purple-400 rounded-full animate-breathe-slow opacity-70" style={{ animationDelay: '0.5s' }} />
                <div className="absolute inset-6 bg-white/80 rounded-full flex items-center justify-center">
                  <Cpu className="h-6 w-6 text-violet-600" />
                </div>
              </div>
            </div>
            <div className="space-y-2">
              <h3 className="font-display text-xl text-deep-brown">
                Connecting to Real-time AI
              </h3>
              <p className="text-sm text-muted-foreground">
                Setting up your instant conversation...
              </p>
            </div>
          </div>
        </div>
      </div>
    )
  }

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
                Connection Failed
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
                onClick={handleRetry}
                className="flex-1 h-12 rounded-xl bg-gradient-to-r from-violet-500 to-purple-600 hover:from-violet-600 hover:to-purple-700"
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
      style={{ height: 'calc(100dvh - 4rem)' }}
    >
      {/* Decorative blobs */}
      <div className="fixed top-20 right-10 w-32 h-32 bg-violet-200/20 blob animate-float -z-10 opacity-50" />
      <div className="fixed bottom-40 left-5 w-24 h-24 bg-purple-200/20 blob-2 animate-float -z-10 opacity-50" style={{ animationDelay: '3s' }} />

      {/* Main Container */}
      <div className="flex-1 flex flex-col glass-card rounded-3xl overflow-hidden warm-shadow-lg">
        {/* Header */}
        <div className="px-4 md:px-6 py-3 md:py-4 border-b border-border/30 bg-gradient-to-r from-white/80 to-violet-50/80 backdrop-blur-sm">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center animate-breathe-slow">
                <Cpu className="w-5 h-5 text-white" />
              </div>
              <div>
                <h2 className="font-display text-base md:text-lg text-deep-brown">
                  Real-time AI Session
                </h2>
                <p className="text-xs text-muted-foreground hidden sm:block">
                  {isConnected ? "Connected • Instant responses" : "Connecting..."}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {/* Captions toggle */}
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowCaptions(!showCaptions)}
                className={`rounded-xl ${showCaptions ? "bg-violet-100 text-violet-600" : "hover:bg-violet-100"}`}
                title={showCaptions ? "Hide captions" : "Show captions"}
              >
                <Subtitles className="h-4 w-4" />
              </Button>
              {/* Mute button */}
              <Button
                variant="ghost"
                size="sm"
                onClick={toggleMute}
                className={`rounded-xl ${isMuted ? "bg-red-100 text-red-600" : "hover:bg-violet-100"}`}
              >
                {isMuted ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
              </Button>
              {/* End button */}
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

        {/* Avatar Area */}
        <div className="flex-1 relative bg-gradient-to-b from-violet-50/50 to-purple-50/50 flex items-center justify-center overflow-hidden">
          {/* Simli Video Avatar */}
          {activeAvatarType === "simli" && (
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted={false}
              className="max-w-full max-h-full rounded-2xl shadow-lg"
              style={{ objectFit: "cover" }}
            />
          )}

          {/* Sprite Canvas Avatar */}
          {activeAvatarType === "sprite" && (
            <canvas
              ref={canvasRef}
              width={400}
              height={400}
              className="max-w-full max-h-full"
              style={{ imageRendering: "auto" }}
            />
          )}

          {/* Ready Player Me 3D Avatar */}
          {activeAvatarType === "rpm" && (
            <RPMAvatar
              viseme={currentViseme}
              isSpeaking={isBotSpeaking}
              className="w-full h-full min-h-[300px]"
            />
          )}

          {/* Speaking indicator */}
          {isBotSpeaking && (
            <div className="absolute bottom-20 left-1/2 -translate-x-1/2 flex items-center gap-2 px-4 py-2 bg-white/80 rounded-full shadow-md">
              <div className="flex gap-1">
                <div className="w-2 h-2 bg-violet-500 rounded-full animate-bounce" />
                <div className="w-2 h-2 bg-violet-500 rounded-full animate-bounce" style={{ animationDelay: "0.1s" }} />
                <div className="w-2 h-2 bg-violet-500 rounded-full animate-bounce" style={{ animationDelay: "0.2s" }} />
              </div>
              <span className="text-sm text-violet-600 font-medium">Avilon is speaking</span>
            </div>
          )}

          {/* Captions */}
          {showCaptions && captions.length > 0 && (
            <div className="absolute bottom-4 left-4 right-4 space-y-2">
              {captions.slice(-3).map((caption, idx) => (
                <div
                  key={`${caption.speaker}-${caption.timestamp}-${idx}`}
                  className={`px-4 py-2 rounded-xl text-sm ${
                    caption.speaker === "bot"
                      ? "bg-violet-100/90 text-violet-800 ml-auto max-w-[80%]"
                      : "bg-white/90 text-gray-800 mr-auto max-w-[80%]"
                  } ${!caption.isFinal ? "opacity-70" : ""}`}
                >
                  <span className="font-medium">
                    {caption.speaker === "bot" ? "Avilon: " : "You: "}
                  </span>
                  {caption.text}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Tip */}
      <div className="mt-4 p-4 bg-gradient-to-r from-violet-100/50 to-purple-100/50 border border-violet-200/30 rounded-2xl">
        <p className="text-sm text-violet-700 text-center">
          <strong className="font-medium">Tip:</strong> Just speak naturally. Avilon responds instantly with sub-second latency.
          {isMuted && " Your microphone is muted."}
        </p>
      </div>
    </div>
  )
}
