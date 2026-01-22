"use client"

import { useState, useRef, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Label } from "@/components/ui/label"
import { useToast } from "@/components/ui/use-toast"
import { Send, AlertTriangle, Video, MessageSquare, User, Sparkles, Check, Heart, Brain, Wind, Leaf, Zap, Palette } from "lucide-react"
import { AvatarVideoInterface } from "./avatar-video-interface"
import { VideoInterface } from "./video-interface"
import { AvatarSetup } from "./avatar-setup"

interface Message {
  role: "user" | "assistant"
  content: string
  timestamp: Date
  isCrisis?: boolean
}

interface ChatInterfaceProps {
  sessionId?: string
}

interface AvatarProfile {
  voiceModelId: string
  avatarImageUrl: string
  voiceName: string
}

export function ChatInterface({ sessionId }: ChatInterfaceProps) {
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [currentSessionId, setCurrentSessionId] = useState(sessionId)
  const [sessionType, setSessionType] = useState<"quick_checkin" | "guided_cbt" | "emotional_conversation">("quick_checkin")
  const [sessionMode, setSessionMode] = useState<"text" | "video">("text")
  const [cbtExercise, setCbtExercise] = useState<"thought_challenging" | "deep_breathing" | "grounding" | null>(null)
  const [moodScore, setMoodScore] = useState<number | null>(null)
  const [sessionStarted, setSessionStarted] = useState(!!sessionId)
  const [isLoadingSession, setIsLoadingSession] = useState(!!sessionId)
  const [isVideoSession, setIsVideoSession] = useState(false)
  const [videoProvider, setVideoProvider] = useState<"tavus" | "custom">("tavus")

  // Avatar/Digital Twin state
  const [avatarProfile, setAvatarProfile] = useState<AvatarProfile | null>(null)
  const [isLoadingAvatar, setIsLoadingAvatar] = useState(true)
  const [showAvatarSetup, setShowAvatarSetup] = useState(false)

  const messagesEndRef = useRef<HTMLDivElement>(null)
  const { toast } = useToast()

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  // Check if user has an avatar profile
  useEffect(() => {
    checkAvatarProfile()
  }, [])

  // Load existing session messages
  useEffect(() => {
    if (sessionId) {
      loadSessionMessages(sessionId)
    }
  }, [sessionId])

  const checkAvatarProfile = async () => {
    try {
      setIsLoadingAvatar(true)
      const response = await fetch("/api/avatar/stream")

      if (response.ok) {
        const data = await response.json()
        if (data.hasAvatarProfile && data.profile) {
          setAvatarProfile(data.profile)
        }
      }
    } catch (error) {
      console.error("Error checking avatar profile:", error)
    } finally {
      setIsLoadingAvatar(false)
    }
  }

  const loadSessionMessages = async (sessionId: string) => {
    try {
      const response = await fetch(`/api/chat/messages?sessionId=${sessionId}`)
      if (!response.ok) throw new Error("Failed to load messages")

      const data = await response.json()
      const loadedMessages = data.messages.map((msg: any) => ({
        role: msg.role,
        content: msg.content,
        timestamp: new Date(msg.created_at),
      }))

      setMessages(loadedMessages)
      setCurrentSessionId(sessionId)
      setSessionStarted(true)
      setIsLoadingSession(false)
    } catch (error) {
      console.error("Error loading session:", error)
      toast({
        title: "Error",
        description: "Failed to load session messages.",
        variant: "destructive",
      })
      setIsLoadingSession(false)
    }
  }

  const startSession = async () => {
    if (moodScore === null) {
      toast({
        title: "Mood Score Required",
        description: "Please rate your current mood before starting.",
        variant: "destructive",
      })
      return
    }

    // If video mode with custom avatar but no avatar profile, show setup
    if (sessionMode === "video" && videoProvider === "custom" && !avatarProfile) {
      setShowAvatarSetup(true)
      return
    }

    try {
      const response = await fetch("/api/chat/session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionType,
          moodScore,
          cbtExercise: sessionType === "guided_cbt" ? cbtExercise : null,
        }),
      })

      if (!response.ok) throw new Error("Failed to start session")

      const data = await response.json()
      setCurrentSessionId(data.sessionId)
      setSessionStarted(true)

      // If video mode is selected, set isVideoSession to true
      if (sessionMode === "video") {
        setIsVideoSession(true)
        toast({
          title: "Starting Video Session",
          description: "Preparing your digital twin conversation...",
        })
      } else {
        // Add initial assistant message for text mode
        if (data.initialMessage) {
          setMessages([
            {
              role: "assistant",
              content: data.initialMessage,
              timestamp: new Date(),
            },
          ])
        }

        toast({
          title: "Session Started",
          description: "You can now start chatting with Avilon.",
        })
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to start session. Please try again.",
        variant: "destructive",
      })
    }
  }

  const sendMessage = async () => {
    if (!input.trim() || !currentSessionId) return

    const userMessage: Message = {
      role: "user",
      content: input,
      timestamp: new Date(),
    }

    setMessages((prev) => [...prev, userMessage])
    setInput("")
    setIsLoading(true)

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionId: currentSessionId,
          message: input,
          messageHistory: messages.slice(-10), // Send last 10 messages for context
        }),
      })

      if (!response.ok) throw new Error("Failed to send message")

      const data = await response.json()

      const assistantMessage: Message = {
        role: "assistant",
        content: data.response,
        timestamp: new Date(),
        isCrisis: data.isCrisis,
      }

      setMessages((prev) => [...prev, assistantMessage])

      if (data.isCrisis) {
        toast({
          title: "Crisis Support Resources Provided",
          description: "Please review the crisis resources in the chat.",
          variant: "destructive",
        })
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to send message. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
  }

  const handleAvatarSetupComplete = (profileData: AvatarProfile) => {
    setAvatarProfile(profileData)
    setShowAvatarSetup(false)
    // Now start the session
    toast({
      title: "Digital Twin Created!",
      description: "Starting your video session...",
    })
    // Trigger session start after avatar setup
    setTimeout(() => startSession(), 500)
  }

  // Mood emoji helper
  const getMoodEmoji = (score: number) => {
    if (score <= 2) return "😔"
    if (score <= 4) return "😕"
    if (score <= 6) return "😐"
    if (score <= 8) return "🙂"
    return "😊"
  }

  if (isLoadingSession) {
    return (
      <div className="flex items-center justify-center min-h-[calc(100vh-8rem)]">
        <div className="text-center">
          <div className="relative">
            <div className="w-16 h-16 rounded-full bg-gradient-to-br from-terracotta to-coral animate-breathe mx-auto" />
            <div className="absolute inset-0 w-16 h-16 rounded-full bg-gradient-to-br from-sage to-sage-light animate-breathe-slow mx-auto opacity-50" style={{ animationDelay: '0.5s' }} />
          </div>
          <p className="mt-6 text-muted-foreground font-medium">Loading your session...</p>
        </div>
      </div>
    )
  }

  // Show avatar setup flow
  if (showAvatarSetup) {
    return (
      <div className="max-w-2xl mx-auto p-6">
        <AvatarSetup
          onComplete={handleAvatarSetupComplete}
          onSkip={() => {
            setShowAvatarSetup(false)
            setSessionMode("text")
            toast({
              title: "Switched to Text Mode",
              description: "You can set up your digital twin later from the session options.",
            })
          }}
        />
      </div>
    )
  }

  if (!sessionStarted) {
    return (
      <div className="max-w-2xl mx-auto p-6 space-y-8">
        {/* Decorative blobs */}
        <div className="fixed top-20 left-10 w-64 h-64 bg-terracotta-light/20 blob animate-float -z-10" />
        <div className="fixed bottom-20 right-10 w-48 h-48 bg-sage-light/30 blob-2 animate-float -z-10" style={{ animationDelay: '2s' }} />

        {/* Header */}
        <div className="text-center space-y-4 fade-in-up">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gradient-to-br from-terracotta to-coral soft-glow">
            <Leaf className="w-8 h-8 text-white" />
          </div>
          <h1 className="font-display text-3xl md:text-4xl text-deep-brown">
            Begin Your Session
          </h1>
          <p className="text-muted-foreground max-w-md mx-auto">
            Take a moment to check in with yourself. Your wellness journey starts with awareness.
          </p>
        </div>

        {/* Main Card */}
        <div className="glass-card rounded-3xl p-8 warm-shadow fade-in-up fade-in-up-delay-1">
          <div className="space-y-8">
            {/* Mood Score */}
            <div className="space-y-4">
              <Label className="text-lg font-display text-deep-brown">How are you feeling today?</Label>
              <div className="grid grid-cols-5 md:grid-cols-10 gap-2">
                {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((score) => (
                  <button
                    key={score}
                    onClick={() => setMoodScore(score)}
                    className={`
                      relative p-3 rounded-xl transition-all duration-300 ease-organic
                      ${moodScore === score
                        ? "bg-gradient-to-br from-terracotta to-coral text-white scale-110 warm-shadow"
                        : "bg-soft-sand hover:bg-terracotta-light/30 text-deep-brown hover:scale-105"
                      }
                    `}
                  >
                    <span className="font-medium">{score}</span>
                    {moodScore === score && (
                      <span className="absolute -top-6 left-1/2 -translate-x-1/2 text-2xl">
                        {getMoodEmoji(score)}
                      </span>
                    )}
                  </button>
                ))}
              </div>
              <p className="text-sm text-muted-foreground text-center">
                1 = Very low &bull; 10 = Excellent
              </p>
            </div>

            {/* Session Mode */}
            <div className="space-y-4">
              <Label className="text-lg font-display text-deep-brown">Choose Your Connection</Label>
              <div className="grid grid-cols-2 gap-4">
                <button
                  onClick={() => setSessionMode("text")}
                  className={`
                    relative p-6 rounded-2xl transition-all duration-300 ease-organic group
                    ${sessionMode === "text"
                      ? "bg-gradient-to-br from-sage to-sage-light text-white warm-shadow-lg scale-[1.02]"
                      : "glass-card hover:bg-sage-light/30"
                    }
                  `}
                >
                  <div className={`
                    w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-4 transition-all
                    ${sessionMode === "text"
                      ? "bg-white/20"
                      : "bg-sage-light/50 group-hover:bg-sage/20"
                    }
                  `}>
                    <MessageSquare className={`h-7 w-7 ${
                      sessionMode === "text" ? "text-white" : "text-sage"
                    }`} />
                  </div>
                  <p className={`font-display text-lg ${
                    sessionMode === "text" ? "text-white" : "text-deep-brown"
                  }`}>Text Chat</p>
                  <p className={`text-sm mt-1 ${
                    sessionMode === "text" ? "text-white/80" : "text-muted-foreground"
                  }`}>Write your thoughts</p>
                </button>

                <button
                  onClick={() => setSessionMode("video")}
                  className={`
                    relative p-6 rounded-2xl transition-all duration-300 ease-organic group
                    ${sessionMode === "video"
                      ? "bg-gradient-to-br from-terracotta to-coral text-white warm-shadow-lg scale-[1.02]"
                      : "glass-card hover:bg-terracotta-light/30"
                    }
                  `}
                >
                  {avatarProfile && (
                    <div className="absolute top-3 right-3">
                      <div className="w-6 h-6 rounded-full bg-sage flex items-center justify-center">
                        <Check className="h-4 w-4 text-white" />
                      </div>
                    </div>
                  )}
                  <div className={`
                    w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-4 transition-all
                    ${sessionMode === "video"
                      ? "bg-white/20"
                      : "bg-terracotta-light/50 group-hover:bg-terracotta/20"
                    }
                  `}>
                    <Video className={`h-7 w-7 ${
                      sessionMode === "video" ? "text-white" : "text-terracotta"
                    }`} />
                  </div>
                  <p className={`font-display text-lg ${
                    sessionMode === "video" ? "text-white" : "text-deep-brown"
                  }`}>Video Chat</p>
                  <p className={`text-sm mt-1 ${
                    sessionMode === "video" ? "text-white/80" : "text-muted-foreground"
                  }`}>
                    {avatarProfile ? "Twin ready" : "Create your twin"}
                  </p>
                </button>
              </div>

              {/* Video Provider Selection */}
              {sessionMode === "video" && (
                <div className="space-y-4">
                  <Label className="text-sm font-medium text-deep-brown">Video Mode</Label>
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      onClick={() => setVideoProvider("tavus")}
                      className={`
                        relative p-4 rounded-xl text-left transition-all duration-300 ease-organic
                        ${videoProvider === "tavus"
                          ? "bg-gradient-to-br from-terracotta/15 to-coral/15 border-2 border-terracotta/40"
                          : "bg-soft-sand/50 border-2 border-transparent hover:border-terracotta/20"
                        }
                      `}
                    >
                      <div className="flex items-center gap-3">
                        <div className={`
                          w-10 h-10 rounded-xl flex items-center justify-center
                          ${videoProvider === "tavus" ? "bg-terracotta/20" : "bg-terracotta-light/30"}
                        `}>
                          <Zap className={`h-5 w-5 ${videoProvider === "tavus" ? "text-terracotta" : "text-terracotta/70"}`} />
                        </div>
                        <div>
                          <p className={`font-medium ${videoProvider === "tavus" ? "text-terracotta" : "text-deep-brown"}`}>
                            Quick Session
                          </p>
                          <p className="text-xs text-muted-foreground">
                            Real-time, &lt;2s latency
                          </p>
                        </div>
                      </div>
                    </button>

                    <button
                      onClick={() => setVideoProvider("custom")}
                      className={`
                        relative p-4 rounded-xl text-left transition-all duration-300 ease-organic
                        ${videoProvider === "custom"
                          ? "bg-gradient-to-br from-sage/15 to-sage-light/15 border-2 border-sage/40"
                          : "bg-soft-sand/50 border-2 border-transparent hover:border-sage/20"
                        }
                      `}
                    >
                      {avatarProfile && (
                        <div className="absolute top-2 right-2">
                          <div className="w-5 h-5 rounded-full bg-sage flex items-center justify-center">
                            <Check className="h-3 w-3 text-white" />
                          </div>
                        </div>
                      )}
                      <div className="flex items-center gap-3">
                        <div className={`
                          w-10 h-10 rounded-xl flex items-center justify-center
                          ${videoProvider === "custom" ? "bg-sage/20" : "bg-sage-light/30"}
                        `}>
                          <Palette className={`h-5 w-5 ${videoProvider === "custom" ? "text-sage" : "text-sage/70"}`} />
                        </div>
                        <div>
                          <p className={`font-medium ${videoProvider === "custom" ? "text-sage" : "text-deep-brown"}`}>
                            Custom Avatar
                          </p>
                          <p className="text-xs text-muted-foreground">
                            Your own avatar
                          </p>
                        </div>
                      </div>
                    </button>
                  </div>

                  {/* Custom Avatar Status */}
                  {videoProvider === "custom" && (
                    <div className={`
                      p-4 rounded-2xl transition-all duration-300
                      ${avatarProfile
                        ? "bg-sage-light/30 border border-sage/20"
                        : "bg-coral/10 border border-coral/20"
                      }
                    `}>
                      <div className="flex items-center gap-3">
                        <div className={`
                          w-10 h-10 rounded-full flex items-center justify-center
                          ${avatarProfile ? "bg-sage/20" : "bg-coral/20"}
                        `}>
                          {avatarProfile ? (
                            <User className="h-5 w-5 text-sage" />
                          ) : (
                            <Sparkles className="h-5 w-5 text-coral" />
                          )}
                        </div>
                        <div className="flex-1">
                          <p className={`font-medium ${avatarProfile ? "text-sage" : "text-deep-brown"}`}>
                            {avatarProfile ? "Digital Twin Ready" : "Create Your Digital Twin"}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            {avatarProfile
                              ? `Voice: ${avatarProfile.voiceName || "Custom"}`
                              : "Upload a photo & voice sample"
                            }
                          </p>
                        </div>
                        {avatarProfile && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-sage hover:text-sage/80 hover:bg-sage/10"
                            onClick={() => setShowAvatarSetup(true)}
                          >
                            Update
                          </Button>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Session Type */}
            <div className="space-y-4">
              <Label className="text-lg font-display text-deep-brown">Session Type</Label>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                {[
                  { value: "quick_checkin", icon: Heart, label: "Quick Check-in", desc: "Casual chat" },
                  { value: "emotional_conversation", icon: Brain, label: "Deep Conversation", desc: "Explore feelings" },
                  { value: "guided_cbt", icon: Wind, label: "Guided Exercise", desc: "CBT techniques" },
                ].map(({ value, icon: Icon, label, desc }) => (
                  <button
                    key={value}
                    onClick={() => setSessionType(value as typeof sessionType)}
                    className={`
                      p-4 rounded-xl text-left transition-all duration-300 ease-organic
                      ${sessionType === value
                        ? "bg-gradient-to-br from-terracotta/10 to-coral/10 border-2 border-terracotta/30"
                        : "bg-soft-sand/50 border-2 border-transparent hover:border-terracotta/20"
                      }
                    `}
                  >
                    <Icon className={`h-5 w-5 mb-2 ${
                      sessionType === value ? "text-terracotta" : "text-warm-gray"
                    }`} />
                    <p className={`font-medium ${
                      sessionType === value ? "text-terracotta" : "text-deep-brown"
                    }`}>{label}</p>
                    <p className="text-xs text-muted-foreground">{desc}</p>
                  </button>
                ))}
              </div>
            </div>

            {/* CBT Exercise Selection */}
            {sessionType === "guided_cbt" && (
              <div className="space-y-3 animate-fade-in">
                <Label className="text-deep-brown">Choose an Exercise</Label>
                <Select
                  value={cbtExercise || ""}
                  onValueChange={(value) => setCbtExercise(value as typeof cbtExercise)}
                >
                  <SelectTrigger className="rounded-xl border-border/50 bg-white/50">
                    <SelectValue placeholder="Select a CBT exercise" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="thought_challenging">Thought Challenging</SelectItem>
                    <SelectItem value="deep_breathing">Deep Breathing</SelectItem>
                    <SelectItem value="grounding">5-4-3-2-1 Grounding</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Start Button */}
            <Button
              onClick={startSession}
              disabled={isLoadingAvatar || moodScore === null}
              className="w-full h-14 rounded-2xl text-lg font-display bg-gradient-to-r from-terracotta to-coral hover:from-terracotta/90 hover:to-coral/90 transition-all duration-300 warm-shadow hover:warm-shadow-lg organic-hover disabled:opacity-50"
            >
              {sessionMode === "video" && videoProvider === "custom" && !avatarProfile
                ? "Create Digital Twin & Start"
                : sessionMode === "video" && videoProvider === "tavus"
                ? "Start Quick Session"
                : "Begin Session"
              }
            </Button>
          </div>
        </div>
      </div>
    )
  }

  // If video session is active, show appropriate video interface
  if (isVideoSession && currentSessionId) {
    if (videoProvider === "tavus") {
      return (
        <VideoInterface
          sessionId={currentSessionId}
          onBack={() => {
            setIsVideoSession(false)
            setSessionStarted(false)
          }}
        />
      )
    } else {
      return (
        <AvatarVideoInterface
          sessionId={currentSessionId}
          onBack={() => {
            setIsVideoSession(false)
            setSessionStarted(false)
          }}
        />
      )
    }
  }

  // Chat Interface
  return (
    <div className="flex flex-col h-[calc(100vh-4rem)] max-w-4xl mx-auto p-4 md:p-6">
      {/* Decorative elements */}
      <div className="fixed top-20 right-10 w-32 h-32 bg-sage-light/20 blob animate-float -z-10 opacity-50" />
      <div className="fixed bottom-40 left-5 w-24 h-24 bg-coral/10 blob-2 animate-float -z-10 opacity-50" style={{ animationDelay: '3s' }} />

      {/* Chat Container */}
      <div className="flex-1 flex flex-col glass-card rounded-3xl overflow-hidden warm-shadow-lg">
        {/* Header */}
        <div className="px-6 py-4 border-b border-border/30 bg-gradient-to-r from-white/80 to-warm-cream/80 backdrop-blur-sm">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-terracotta to-coral flex items-center justify-center animate-breathe-slow">
                <Leaf className="w-5 h-5 text-white" />
              </div>
              <div>
                <h2 className="font-display text-lg text-deep-brown">Avilon</h2>
                <p className="text-xs text-muted-foreground">Here to support you</p>
              </div>
            </div>
            <span className="px-4 py-1.5 bg-gradient-to-r from-sage-light/50 to-sage/30 text-sage rounded-full text-sm font-medium">
              {sessionType === "quick_checkin"
                ? "Check-in"
                : sessionType === "emotional_conversation"
                ? "Deep Talk"
                : "Guided CBT"}
            </span>
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4 scrollbar-thin">
          {messages.map((message, index) => (
            <div
              key={index}
              className={`flex ${message.role === "user" ? "justify-end" : "justify-start"} animate-fade-in-up`}
              style={{ animationDelay: `${index * 0.05}s` }}
            >
              <div
                className={`max-w-[85%] md:max-w-[75%] rounded-2xl p-4 ${
                  message.role === "user"
                    ? "bg-gradient-to-br from-terracotta to-coral text-white rounded-br-md"
                    : message.isCrisis
                    ? "bg-gradient-to-br from-red-50 to-red-100 border-2 border-red-300 text-deep-brown rounded-bl-md"
                    : "bg-white/80 border border-border/30 text-deep-brown rounded-bl-md warm-shadow"
                }`}
              >
                {message.isCrisis && (
                  <div className="flex items-center gap-2 mb-3 text-red-600 font-medium">
                    <AlertTriangle className="h-4 w-4" />
                    <span>Crisis Support</span>
                  </div>
                )}
                <p className="whitespace-pre-wrap leading-relaxed">{message.content}</p>
                <p
                  className={`text-xs mt-2 ${
                    message.role === "user" ? "text-white/70" : "text-muted-foreground"
                  }`}
                >
                  {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </p>
              </div>
            </div>
          ))}

          {isLoading && (
            <div className="flex justify-start animate-fade-in">
              <div className="bg-white/80 border border-border/30 rounded-2xl rounded-bl-md p-4 warm-shadow">
                <div className="flex space-x-2">
                  <div className="w-2.5 h-2.5 bg-terracotta rounded-full animate-bounce" />
                  <div className="w-2.5 h-2.5 bg-coral rounded-full animate-bounce" style={{ animationDelay: '0.1s' }} />
                  <div className="w-2.5 h-2.5 bg-sage rounded-full animate-bounce" style={{ animationDelay: '0.2s' }} />
                </div>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input Area */}
        <div className="p-4 border-t border-border/30 bg-gradient-to-r from-white/90 to-warm-cream/90 backdrop-blur-sm">
          <div className="flex gap-3 items-end">
            <Textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Share what's on your mind..."
              className="flex-1 min-h-[56px] max-h-[120px] rounded-2xl border-border/50 bg-white/70 focus:border-terracotta/50 focus:ring-terracotta/20 resize-none placeholder:text-muted-foreground/60"
              disabled={isLoading}
            />
            <Button
              onClick={sendMessage}
              disabled={!input.trim() || isLoading}
              className="h-14 w-14 rounded-2xl bg-gradient-to-br from-terracotta to-coral hover:from-terracotta/90 hover:to-coral/90 transition-all duration-300 warm-shadow hover:warm-shadow-lg disabled:opacity-50"
            >
              <Send className="h-5 w-5" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
