"use client"

import { useState, useEffect, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Video, AlertCircle, Leaf, ArrowLeft, Volume2, VolumeX } from "lucide-react"
import { useToast } from "@/components/ui/use-toast"

interface VideoInterfaceProps {
  sessionId: string
  onBack?: () => void
}

export function VideoInterface({ sessionId, onBack }: VideoInterfaceProps) {
  const [conversationUrl, setConversationUrl] = useState<string | null>(null)
  const [conversationId, setConversationId] = useState<string | null>(null)
  const [replicaName, setReplicaName] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const { toast } = useToast()
  const initializingRef = useRef(false)
  const initializedRef = useRef(false)

  useEffect(() => {
    // Prevent duplicate calls from React Strict Mode
    if (initializedRef.current || initializingRef.current) return
    initializingRef.current = true
    initializeVideoSession()
  }, [sessionId])

  const handleEndSession = async () => {
    if (!conversationId) {
      onBack?.()
      return
    }

    try {
      await fetch("/api/tavus/conversation/end", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ conversationId }),
      })

      toast({
        title: "Session Ended",
        description: "Your video session has been ended.",
      })
    } catch (error) {
      console.error("Error ending session:", error)
      // Still call onBack even if ending fails
    } finally {
      onBack?.()
    }
  }

  const initializeVideoSession = async () => {
    try {
      setIsLoading(true)
      setError(null)

      const response = await fetch("/api/tavus/conversation", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || "Failed to start video session")
      }

      const data = await response.json()
      console.log('Tavus conversation response:', data)
      console.log('Setting conversation URL:', data.conversationUrl)

      setConversationUrl(data.conversationUrl)
      setConversationId(data.conversationId)
      setReplicaName(data.replicaName)
      initializedRef.current = true

      toast({
        title: "Video Session Ready",
        description: `Connected to ${data.replicaName}`,
      })
    } catch (error: any) {
      console.error("Video session error:", error)
      setError(error.message || "Failed to start video session")
      initializingRef.current = false
      toast({
        title: "Error",
        description: error.message || "Failed to start video session",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

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
                Preparing Video Session
              </h3>
              <p className="text-sm text-muted-foreground">
                Connecting you with your AI therapist...
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
                onClick={() => {
                  initializingRef.current = false
                  initializedRef.current = false
                  initializeVideoSession()
                }}
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

  console.log('Rendering VideoInterface:', { conversationUrl, conversationId, replicaName, isLoading, error })

  return (
    <div
      className="flex flex-col max-w-6xl mx-auto p-4 md:p-6"
      style={{
        height: 'calc(100dvh - 4rem)', // Dynamic viewport height for better mobile support
      }}
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
                  Session with {replicaName || "Avilon"}
                </h2>
                <p className="text-xs text-muted-foreground hidden sm:block">
                  Real-time video conversation
                </p>
              </div>
            </div>
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

        {/* Video Area */}
        <div
          className="flex-1 relative bg-gradient-to-b from-deep-brown/90 to-deep-brown overflow-hidden"
          style={{
            // Prevent mobile Safari bounce/scroll
            WebkitOverflowScrolling: 'touch',
            overscrollBehavior: 'none',
          }}
        >
          {conversationUrl ? (
            <iframe
              src={conversationUrl}
              className="w-full h-full border-0 absolute inset-0"
              allow="camera; microphone; display-capture; autoplay"
              title="Tavus Video Session"
              style={{
                // Ensure iframe fills container on mobile Safari
                width: '100%',
                height: '100%',
                border: 'none',
                overflow: 'hidden',
              }}
              onLoad={() => console.log('Tavus iframe loaded successfully')}
              onError={(e) => console.error('Tavus iframe error:', e)}
            />
          ) : (
            <div className="flex items-center justify-center h-full">
              <div className="text-white/50 text-center">
                <Video className="h-16 w-16 mx-auto mb-4 opacity-50" />
                <p className="text-sm">Loading video...</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Tip */}
      <div className="mt-4 p-4 bg-gradient-to-r from-sage-light/30 to-sage/20 border border-sage/20 rounded-2xl">
        <p className="text-sm text-sage text-center">
          <strong className="font-medium">Tip:</strong> Make sure your camera and microphone are enabled for the best experience.
          {' '}You can end the session at any time by clicking "End" above.
        </p>
      </div>
    </div>
  )
}
