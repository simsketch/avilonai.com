import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { supabaseAdmin } from "@/lib/db/supabase"
import {
  generateAvatarResponse,
  processAudioInput,
  transcribeAudio,
  toChatMessages,
  type ConversationConfig,
} from "@/lib/avatar"
import { SYSTEM_PROMPT, type ChatMessage } from "@/lib/ai/agent"

/**
 * POST /api/avatar/generate
 * Generate a lip-synced video response from text or audio input
 */
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const contentType = req.headers.get("content-type") || ""

    // Handle multipart form data (audio input)
    if (contentType.includes("multipart/form-data")) {
      return handleAudioInput(req, session.user.id)
    }

    // Handle JSON (text input)
    return handleTextInput(req, session.user.id)
  } catch (error: any) {
    console.error("Avatar generate error:", error)
    return NextResponse.json(
      { error: error?.message || "Failed to generate avatar response" },
      { status: 500 }
    )
  }
}

/**
 * Handle text input - generate response from text
 */
async function handleTextInput(req: NextRequest, userId: string) {
  const { text, sessionId, messageHistory } = await req.json()

  if (!text) {
    return NextResponse.json(
      { error: "Text input is required" },
      { status: 400 }
    )
  }

  // Get user's avatar profile
  const config = await getAvatarConfig(userId)

  if (!config) {
    return NextResponse.json(
      { error: "No avatar profile found. Please create a voice clone first." },
      { status: 400 }
    )
  }

  // Build conversation history
  const conversationHistory: ChatMessage[] = [
    { role: "system", content: SYSTEM_PROMPT },
  ]

  if (messageHistory && Array.isArray(messageHistory)) {
    messageHistory.forEach((msg: any) => {
      conversationHistory.push({
        role: msg.role,
        content: msg.content,
      })
    })
  }

  // Generate avatar response with video
  const response = await generateAvatarResponse(
    text,
    conversationHistory,
    config
  )

  // Store messages in database
  if (sessionId) {
    await storeMessages(userId, sessionId, text, response.text)
  }

  return NextResponse.json({
    userText: text,
    responseText: response.text,
    audioUrl: response.audioUrl,
    videoUrl: response.videoUrl,
  })
}

/**
 * Handle audio input - transcribe and generate response
 */
async function handleAudioInput(req: NextRequest, userId: string) {
  const formData = await req.formData()
  const audioFile = formData.get("audio") as File | null
  const sessionId = formData.get("sessionId") as string | null
  const messageHistoryJson = formData.get("messageHistory") as string | null

  if (!audioFile) {
    return NextResponse.json(
      { error: "Audio input is required" },
      { status: 400 }
    )
  }

  // Get user's avatar profile
  const config = await getAvatarConfig(userId)

  if (!config) {
    return NextResponse.json(
      { error: "No avatar profile found. Please create a voice clone first." },
      { status: 400 }
    )
  }

  // Convert audio file to buffer
  const audioBuffer = Buffer.from(await audioFile.arrayBuffer())

  // Build conversation history
  const conversationHistory: ChatMessage[] = [
    { role: "system", content: SYSTEM_PROMPT },
  ]

  if (messageHistoryJson) {
    try {
      const messageHistory = JSON.parse(messageHistoryJson)
      messageHistory.forEach((msg: any) => {
        conversationHistory.push({
          role: msg.role,
          content: msg.content,
        })
      })
    } catch (e) {
      console.error("Error parsing message history:", e)
    }
  }

  // Process audio and generate response
  const response = await processAudioInput(
    audioBuffer,
    conversationHistory,
    config
  )

  // Store messages in database
  if (sessionId) {
    await storeMessages(userId, sessionId, response.userText, response.responseText)
  }

  return NextResponse.json({
    userText: response.userText,
    responseText: response.responseText,
    audioUrl: response.audioUrl,
    videoUrl: response.videoUrl,
  })
}

/**
 * Get avatar configuration for a user
 */
async function getAvatarConfig(userId: string): Promise<ConversationConfig | null> {
  const { data: profile, error } = await supabaseAdmin
    .from("avatar_profiles")
    .select("*")
    .eq("user_id", userId)
    .single()

  if (error || !profile) {
    console.log("No avatar profile found for user:", userId)
    return null
  }

  if (!profile.voice_model_id || !profile.avatar_image_url) {
    console.log("Avatar profile incomplete:", profile)
    return null
  }

  return {
    voiceId: profile.voice_model_id,
    avatarImageUrl: profile.avatar_image_url,
    systemPrompt: SYSTEM_PROMPT,
  }
}

/**
 * Store messages in database
 */
async function storeMessages(
  userId: string,
  sessionId: string,
  userText: string,
  assistantText: string
) {
  try {
    // Store user message
    await supabaseAdmin.from("messages").insert({
      user_id: userId,
      session_id: sessionId,
      role: "user",
      content: userText,
    })

    // Store assistant message
    await supabaseAdmin.from("messages").insert({
      user_id: userId,
      session_id: sessionId,
      role: "assistant",
      content: assistantText,
    })
  } catch (error) {
    console.error("Error storing messages:", error)
  }
}
