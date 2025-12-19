import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { supabaseAdmin } from "@/lib/db/supabase"
import { generateResponse, SYSTEM_PROMPT, ChatMessage } from "@/lib/ai/agent"
import { detectCrisis, logCrisisIncident, getCrisisResponse } from "@/lib/utils/crisis-detector"

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { sessionId, message, messageHistory } = await req.json()

    // Store user message
    const { error: userMsgError } = await supabaseAdmin
      .from("messages")
      .insert({
        user_id: session.user.id,
        session_id: sessionId,
        role: "user",
        content: message,
      })

    if (userMsgError) {
      console.error("Error storing user message:", userMsgError)
    }

    // Check for crisis keywords
    const crisisDetection = detectCrisis(message)

    if (crisisDetection.isCrisis) {
      // Log crisis incident
      await logCrisisIncident(
        session.user.id,
        message,
        crisisDetection.detectedKeywords,
        sessionId
      )

      // Return crisis response
      const crisisResponse = getCrisisResponse()

      // Store assistant crisis response
      await supabaseAdmin.from("messages").insert({
        user_id: session.user.id,
        session_id: sessionId,
        role: "assistant",
        content: crisisResponse,
      })

      return NextResponse.json({
        response: crisisResponse,
        isCrisis: true,
      })
    }

    // Build conversation history for AI
    const conversationHistory: ChatMessage[] = [
      { role: "system", content: SYSTEM_PROMPT },
    ]

    // Add recent message history (last 10 messages)
    if (messageHistory && Array.isArray(messageHistory)) {
      messageHistory.forEach((msg: any) => {
        conversationHistory.push({
          role: msg.role,
          content: msg.content,
        })
      })
    }

    // Add current message
    conversationHistory.push({
      role: "user",
      content: message,
    })

    // Generate AI response
    const aiResponse = await generateResponse(conversationHistory)

    // Store assistant message
    await supabaseAdmin.from("messages").insert({
      user_id: session.user.id,
      session_id: sessionId,
      role: "assistant",
      content: aiResponse,
    })

    return NextResponse.json({
      response: aiResponse,
      isCrisis: false,
    })
  } catch (error: any) {
    console.error("Chat error:", error)
    console.error("Chat error message:", error?.message)
    console.error("Chat error stack:", error?.stack)
    return NextResponse.json(
      { error: error?.message || "Failed to generate response" },
      { status: 500 }
    )
  }
}
