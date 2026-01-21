import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { supabaseAdmin } from "@/lib/db/supabase"
import {
  getStreamingConfig,
  createStreamingSession,
  type StreamingConfig,
} from "@/lib/avatar"

/**
 * GET /api/avatar/stream
 * Get streaming configuration for real-time conversation
 * Returns STT WebSocket URL and API key for client-side streaming
 */
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Get user's avatar profile to verify they have one set up
    const { data: profile } = await supabaseAdmin
      .from("avatar_profiles")
      .select("*")
      .eq("user_id", session.user.id)
      .single()

    const hasProfile = profile?.voice_model_id && profile?.avatar_image_url

    // Get streaming configuration
    const streamingConfig = getStreamingConfig()

    // Create temporary streaming session for more secure API key handling
    const streamSession = await createStreamingSession(300) // 5 minute session

    return NextResponse.json({
      hasAvatarProfile: hasProfile,
      profile: hasProfile ? {
        voiceModelId: profile.voice_model_id,
        avatarImageUrl: profile.avatar_image_url,
        voiceName: profile.voice_name,
      } : null,
      streaming: {
        sttApiKey: streamSession.key,
        sttWebSocketUrl: streamingConfig.sttWebSocketUrl,
        vadSettings: streamingConfig.vadSettings,
        expiresAt: streamSession.expiresAt.toISOString(),
      },
    })
  } catch (error: any) {
    console.error("Stream config error:", error)
    return NextResponse.json(
      { error: error?.message || "Failed to get streaming config" },
      { status: 500 }
    )
  }
}

/**
 * POST /api/avatar/stream
 * Create a new streaming conversation session
 */
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { sessionId, sessionType, moodScore } = await req.json()

    // Get user's avatar profile
    const { data: profile } = await supabaseAdmin
      .from("avatar_profiles")
      .select("*")
      .eq("user_id", session.user.id)
      .single()

    if (!profile?.voice_model_id || !profile?.avatar_image_url) {
      return NextResponse.json(
        { error: "No avatar profile found. Please create a voice clone first." },
        { status: 400 }
      )
    }

    // Create or update chat session with avatar mode
    if (sessionId) {
      const { error: updateError } = await supabaseAdmin
        .from("chat_sessions")
        .update({
          is_video_session: true,
          session_mode: "avatar",
          updated_at: new Date().toISOString(),
        })
        .eq("id", sessionId)
        .eq("user_id", session.user.id)

      if (updateError) {
        console.error("Error updating session:", updateError)
      }
    }

    // Get streaming configuration
    const streamingConfig = getStreamingConfig()
    const streamSession = await createStreamingSession(1800) // 30 minute session

    return NextResponse.json({
      sessionId,
      avatarConfig: {
        voiceModelId: profile.voice_model_id,
        avatarImageUrl: profile.avatar_image_url,
        voiceName: profile.voice_name,
      },
      streaming: {
        sttApiKey: streamSession.key,
        sttWebSocketUrl: streamingConfig.sttWebSocketUrl,
        vadSettings: streamingConfig.vadSettings,
        expiresAt: streamSession.expiresAt.toISOString(),
      },
      greeting: getGreetingMessage(sessionType, moodScore),
    })
  } catch (error: any) {
    console.error("Stream session error:", error)
    return NextResponse.json(
      { error: error?.message || "Failed to create streaming session" },
      { status: 500 }
    )
  }
}

/**
 * Generate a greeting message based on session context
 */
function getGreetingMessage(sessionType?: string, moodScore?: number): string {
  const greetings = {
    emotional: "Hi there! I'm here to help you explore and process your emotions today. How are you feeling?",
    cbt: "Hello! I'm ready to guide you through some cognitive behavioral exercises. What would you like to work on?",
    meditation: "Welcome. Let's take a moment to breathe and center ourselves. Are you ready to begin?",
    default: "Hi! I'm so glad you could join me today. How are you feeling? I'm here to listen and support you.",
  }

  let greeting = greetings[sessionType as keyof typeof greetings] || greetings.default

  if (moodScore !== undefined && moodScore < 5) {
    greeting = "I can see you might be going through a tough time. I'm here for you. Take your time, and share whatever feels right."
  }

  return greeting
}
