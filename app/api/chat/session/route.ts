import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { supabaseAdmin } from "@/lib/db/supabase"
import { CBT_EXERCISE_PROMPTS, EMOTIONAL_CONVERSATION_PROMPT } from "@/lib/ai/agent"

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { sessionType, moodScore, cbtExercise } = await req.json()

    // Create new session
    const { data, error } = await supabaseAdmin
      .from("chat_sessions")
      .insert({
        user_id: session.user.id,
        session_type: sessionType,
        mood_score: moodScore,
      })
      .select()
      .single()

    if (error) {
      console.error("Database error:", error)
      return NextResponse.json(
        { error: "Failed to create session" },
        { status: 500 }
      )
    }

    // Generate initial message based on session type
    let initialMessage = `Hello! I'm Avilon, your AI therapy companion. I'm here to support you with warmth and understanding.`

    if (moodScore <= 3) {
      initialMessage += ` I notice you're feeling quite low right now. That takes courage to acknowledge. Let's work through this together.`
    } else if (moodScore <= 6) {
      initialMessage += ` I see you're having a challenging day. I'm here to listen and support you.`
    } else {
      initialMessage += ` I'm glad to hear you're in a good place today. What would you like to talk about?`
    }

    if (sessionType === "guided_cbt" && cbtExercise) {
      initialMessage += `\n\n${CBT_EXERCISE_PROMPTS[cbtExercise as keyof typeof CBT_EXERCISE_PROMPTS]}`
    } else if (sessionType === "emotional_conversation") {
      initialMessage += `\n\n${EMOTIONAL_CONVERSATION_PROMPT}`
    } else {
      initialMessage += `\n\nWhat's on your mind today?`
    }

    return NextResponse.json({
      sessionId: data.id,
      initialMessage,
    })
  } catch (error) {
    console.error("Session creation error:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
