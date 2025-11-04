"use client"

import { useSession } from "next-auth/react"
import { useRouter, useSearchParams } from "next/navigation"
import { useEffect, Suspense } from "react"
import { ChatInterface } from "@/components/chat/chat-interface"

function ChatContent() {
  const searchParams = useSearchParams()
  const sessionId = searchParams.get("sessionId")

  return <ChatInterface sessionId={sessionId || undefined} />
}

export default function ChatPage() {
  const { status } = useSession()
  const router = useRouter()

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login")
    }
  }, [status, router])

  if (status === "loading") {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto" />
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    )
  }

  return (
    <div
      className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50"
      style={{
        minHeight: '100dvh', // Dynamic viewport height for better mobile support
        overscrollBehavior: 'none', // Prevent bounce scrolling on iOS
      }}
    >
      <header
        className="bg-white/80 backdrop-blur-md border-b border-slate-200 sticky top-0 z-10"
        style={{
          paddingTop: 'env(safe-area-inset-top)', // Handle iPhone notch
        }}
      >
        <div className="max-w-7xl mx-auto px-4 md:px-6 py-3 md:py-4 flex items-center justify-between">
          <h1 className="text-xl md:text-2xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">Avilon</h1>
          <button
            onClick={() => router.push("/dashboard")}
            className="text-xs md:text-sm text-slate-600 hover:text-slate-900 transition-colors"
          >
            Back to Dashboard
          </button>
        </div>
      </header>
      <Suspense fallback={
        <div className="flex items-center justify-center min-h-[calc(100vh-8rem)]">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto" />
            <p className="mt-4 text-gray-600">Loading chat...</p>
          </div>
        </div>
      }>
        <ChatContent />
      </Suspense>
    </div>
  )
}
