import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { supabaseAdmin } from "@/lib/db/supabase"
import { createConversation } from "@/lib/tavus/client"

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { sessionId, sessionType, moodScore } = await req.json()

    if (!sessionId) {
      return NextResponse.json({ error: "Session ID required" }, { status: 400 })
    }

    // Use specific Tavus replica and persona
    // These IDs are from the Tavus dashboard and can be reused across sessions
    // NOTE: Do not modify this persona in Tavus UI - it breaks the config
    const replicaId = "ref2207648cd"  // Elon replica
    const replicaName = "Elon"
    const personaId = "p78ab7d2f228"  // Working persona with condensed context

    console.log(`Using replica: ${replicaName} (${replicaId})`)
    console.log(`Using persona: ${personaId}`)

    // Log the full request for debugging
    console.log(`Creating conversation with:`, {
      replica_id: replicaId,
      persona_id: personaId,
      conversation_name: `Therapy Session - ${new Date().toISOString()}`
    })

    // Create Tavus conversation with existing persona
    const conversation = await createConversation(
      replicaId,
      personaId,
      `Therapy Session - ${new Date().toISOString()}`,
      {
        customGreeting: "Hi there! I'm so glad you could join me today. How are you feeling? I'm here to listen and support you.",
        conversationalContext: `This is a therapy session. The user has started a ${sessionType || 'general'} session with a mood score of ${moodScore || 'not specified'}. Be warm, empathetic, and supportive. Listen actively and ask thoughtful follow-up questions.`
      }
    )

    console.log(`Created conversation:`, JSON.stringify(conversation, null, 2))

    // Update session in database with video conversation details
    const { error: updateError } = await supabaseAdmin
      .from("chat_sessions")
      .update({
        is_video_session: true,
        conversation_id: conversation.conversation_id,
        conversation_url: conversation.conversation_url,
      })
      .eq("id", sessionId)
      .eq("user_id", session.user.id)

    if (updateError) {
      console.error("Error updating session:", updateError)
      return NextResponse.json(
        { error: "Failed to update session" },
        { status: 500 }
      )
    }

    return NextResponse.json({
      conversationUrl: conversation.conversation_url,
      conversationId: conversation.conversation_id,
      replicaName: replicaName,
    })
  } catch (error: any) {
    console.error("Tavus conversation error:", error)
    return NextResponse.json(
      { error: error?.message || "Failed to create video session" },
      { status: 500 }
    )
  }
}
