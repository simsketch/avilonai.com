import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { supabaseAdmin } from "@/lib/db/supabase"

const PIPECAT_SERVICE_URL = process.env.PIPECAT_SERVICE_URL || "http://localhost:8080"

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { sessionId, avatarType = "sprite" } = await req.json()

    if (!sessionId) {
      return NextResponse.json({ error: "Session ID required" }, { status: 400 })
    }

    // Validate avatar type
    const validAvatarTypes = ["simli", "sprite", "rpm"]
    if (!validAvatarTypes.includes(avatarType)) {
      return NextResponse.json({ error: "Invalid avatar type" }, { status: 400 })
    }

    // Verify session belongs to user
    const { data: chatSession, error: sessionError } = await supabaseAdmin
      .from("chat_sessions")
      .select("id, user_id")
      .eq("id", sessionId)
      .eq("user_id", session.user.id)
      .single()

    if (sessionError || !chatSession) {
      return NextResponse.json({ error: "Session not found" }, { status: 404 })
    }

    // Call Pipecat service to create room and spawn bot
    const response = await fetch(`${PIPECAT_SERVICE_URL}/connect`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        session_id: sessionId,
        avatar_type: avatarType,
      }),
    })

    if (!response.ok) {
      const error = await response.text()
      console.error("Pipecat service error:", error)
      return NextResponse.json(
        { error: "Failed to connect to real-time service" },
        { status: 500 }
      )
    }

    const data = await response.json()

    // Update session in database with pipecat room details
    const { error: updateError } = await supabaseAdmin
      .from("chat_sessions")
      .update({
        is_video_session: true,
        video_provider: "pipecat",
        pipecat_room_url: data.room_url,
        pipecat_bot_id: data.bot_id,
      })
      .eq("id", sessionId)
      .eq("user_id", session.user.id)

    if (updateError) {
      console.error("Error updating session:", updateError)
      // Don't fail - the connection is still valid
    }

    return NextResponse.json({
      roomUrl: data.room_url,
      token: data.token,
      botId: data.bot_id,
      avatarType: data.avatar_type,
    })
  } catch (error: any) {
    console.error("Pipecat connect error:", error)
    return NextResponse.json(
      { error: error?.message || "Failed to create real-time session" },
      { status: 500 }
    )
  }
}
