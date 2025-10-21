"use client"

import { useState, useRef, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Label } from "@/components/ui/label"
import { useToast } from "@/components/ui/use-toast"
import { Send, AlertTriangle } from "lucide-react"

interface Message {
  role: "user" | "assistant"
  content: string
  timestamp: Date
  isCrisis?: boolean
}

interface ChatInterfaceProps {
  sessionId?: string
}

export function ChatInterface({ sessionId }: ChatInterfaceProps) {
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [currentSessionId, setCurrentSessionId] = useState(sessionId)
  const [sessionType, setSessionType] = useState<"quick_checkin" | "guided_cbt">("quick_checkin")
  const [cbtExercise, setCbtExercise] = useState<"thought_challenging" | "deep_breathing" | "grounding" | null>(null)
  const [moodScore, setMoodScore] = useState<number | null>(null)
  const [sessionStarted, setSessionStarted] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const { toast } = useToast()

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  const startSession = async () => {
    if (moodScore === null) {
      toast({
        title: "Mood Score Required",
        description: "Please rate your current mood before starting.",
        variant: "destructive",
      })
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

      // Add initial assistant message
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

  if (!sessionStarted) {
    return (
      <div className="max-w-2xl mx-auto p-6">
        <Card>
          <CardHeader>
            <CardTitle>Start a New Session</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div>
              <Label>How are you feeling today? (1-10)</Label>
              <p className="text-sm text-gray-600 mb-2">
                1 = Very low, 10 = Excellent
              </p>
              <Select
                value={moodScore?.toString()}
                onValueChange={(value) => setMoodScore(parseInt(value))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select your mood score" />
                </SelectTrigger>
                <SelectContent>
                  {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((score) => (
                    <SelectItem key={score} value={score.toString()}>
                      {score}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Session Type</Label>
              <Select
                value={sessionType}
                onValueChange={(value) =>
                  setSessionType(value as "quick_checkin" | "guided_cbt")
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="quick_checkin">
                    Quick Check-in (Unstructured Chat)
                  </SelectItem>
                  <SelectItem value="guided_cbt">
                    Guided CBT Exercise
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            {sessionType === "guided_cbt" && (
              <div>
                <Label>Choose an Exercise</Label>
                <Select
                  value={cbtExercise || ""}
                  onValueChange={(value) =>
                    setCbtExercise(value as typeof cbtExercise)
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select a CBT exercise" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="thought_challenging">
                      Thought Challenging
                    </SelectItem>
                    <SelectItem value="deep_breathing">
                      Deep Breathing
                    </SelectItem>
                    <SelectItem value="grounding">
                      5-4-3-2-1 Grounding
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}

            <Button onClick={startSession} className="w-full">
              Start Session
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-[calc(100vh-8rem)] max-w-4xl mx-auto p-6">
      <Card className="flex-1 flex flex-col">
        <CardHeader className="border-b">
          <div className="flex items-center justify-between">
            <CardTitle>Chat with Avilon</CardTitle>
            <span className="text-sm text-gray-500">
              {sessionType === "quick_checkin" ? "Quick Check-in" : "Guided CBT"}
            </span>
          </div>
        </CardHeader>
        <CardContent className="flex-1 overflow-y-auto p-6 space-y-4">
          {messages.map((message, index) => (
            <div
              key={index}
              className={`flex ${
                message.role === "user" ? "justify-end" : "justify-start"
              }`}
            >
              <div
                className={`max-w-[80%] rounded-lg p-4 ${
                  message.role === "user"
                    ? "bg-blue-600 text-white"
                    : message.isCrisis
                    ? "bg-red-50 border-2 border-red-500 text-gray-900"
                    : "bg-gray-100 text-gray-900"
                }`}
              >
                {message.isCrisis && (
                  <div className="flex items-center gap-2 mb-2 text-red-600 font-semibold">
                    <AlertTriangle className="h-4 w-4" />
                    <span>Crisis Support</span>
                  </div>
                )}
                <p className="whitespace-pre-wrap">{message.content}</p>
                <p
                  className={`text-xs mt-2 ${
                    message.role === "user" ? "text-blue-100" : "text-gray-500"
                  }`}
                >
                  {message.timestamp.toLocaleTimeString()}
                </p>
              </div>
            </div>
          ))}
          {isLoading && (
            <div className="flex justify-start">
              <div className="bg-gray-100 rounded-lg p-4">
                <div className="flex space-x-2">
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" />
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce delay-100" />
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce delay-200" />
                </div>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </CardContent>
        <div className="border-t p-4">
          <div className="flex gap-2">
            <Textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Type your message... (Press Enter to send, Shift+Enter for new line)"
              className="flex-1 min-h-[60px] max-h-[120px]"
              disabled={isLoading}
            />
            <Button
              onClick={sendMessage}
              disabled={!input.trim() || isLoading}
              className="self-end"
            >
              <Send className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </Card>
    </div>
  )
}
