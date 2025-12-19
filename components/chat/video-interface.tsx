"use client"

import { useState, useEffect, useRef } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Video, AlertCircle, Loader2 } from "lucide-react"
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
        <Card className="w-full max-w-md shadow-lg">
          <CardContent className="pt-6">
            <div className="text-center space-y-4">
              <div className="flex justify-center">
                <div className="relative">
                  <Video className="h-16 w-16 text-blue-600 animate-pulse" />
                  <Loader2 className="h-8 w-8 text-indigo-600 animate-spin absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2" />
                </div>
              </div>
              <div>
                <h3 className="text-lg font-semibold text-slate-800">
                  Preparing Video Session
                </h3>
                <p className="text-sm text-slate-600 mt-2">
                  Connecting you with your AI therapist...
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-[calc(100vh-8rem)] p-6">
        <Card className="w-full max-w-md shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-red-600">
              <AlertCircle className="h-5 w-5" />
              Unable to Start Video Session
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-sm text-red-800">{error}</p>
            </div>
            <div className="flex gap-2">
              {onBack && (
                <Button variant="outline" onClick={onBack} className="flex-1">
                  Go Back
                </Button>
              )}
              <Button
                onClick={() => {
                  initializingRef.current = false
                  initializedRef.current = false
                  initializeVideoSession()
                }}
                className="flex-1"
              >
                Try Again
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  console.log('Rendering VideoInterface:', { conversationUrl, conversationId, replicaName, isLoading, error })

  return (
    <div
      className="flex flex-col max-w-6xl mx-auto p-4 md:p-6"
      style={{
        height: 'calc(100dvh - 8rem)', // Dynamic viewport height for better mobile support
      }}
    >
      <Card className="flex-1 flex flex-col shadow-lg border-slate-200 overflow-hidden">
        <CardHeader className="border-b border-slate-200 bg-white/50 backdrop-blur-sm py-3 md:py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 md:gap-3">
              <div className="p-1.5 md:p-2 bg-gradient-to-r from-blue-100 to-indigo-100 rounded-lg">
                <Video className="h-4 w-4 md:h-5 md:w-5 text-blue-600" />
              </div>
              <div>
                <CardTitle className="text-slate-800 text-sm md:text-base">
                  Video Session with {replicaName || "Avilon"}
                </CardTitle>
                <p className="text-xs md:text-sm text-slate-600 mt-0.5 md:mt-1 hidden sm:block">
                  Face-to-face therapy conversation
                </p>
              </div>
            </div>
            {onBack && (
              <Button variant="outline" onClick={handleEndSession} size="sm" className="text-xs md:text-sm">
                End
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent
          className="flex-1 p-0 relative bg-gradient-to-b from-slate-900 to-slate-800 overflow-hidden"
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
              <p className="text-white">Loading video...</p>
            </div>
          )}
        </CardContent>
      </Card>
      <div className="mt-3 md:mt-4 p-3 md:p-4 bg-blue-50 border border-blue-200 rounded-lg">
        <p className="text-xs md:text-sm text-blue-900">
          <strong>Tip:</strong> Make sure your camera and microphone are enabled for the best experience.
          {' '}You can end the video session at any time by clicking "End" above.
        </p>
      </div>
    </div>
  )
}
