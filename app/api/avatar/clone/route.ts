import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { supabaseAdmin } from "@/lib/db/supabase"
import {
  createVoiceClone,
  getVoiceCloneStatus,
  listVoiceModels,
  uploadToFalStorage,
} from "@/lib/avatar"

/**
 * POST /api/avatar/clone
 * Create a new voice clone from an audio sample
 */
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const formData = await req.formData()
    const audioFile = formData.get("audio") as File | null
    const imageFile = formData.get("image") as File | null
    const name = formData.get("name") as string | null

    if (!audioFile) {
      return NextResponse.json(
        { error: "Audio sample is required (3-30 seconds of clear speech)" },
        { status: 400 }
      )
    }

    // Validate audio file
    if (!audioFile.type.startsWith("audio/")) {
      return NextResponse.json(
        { error: "Invalid audio file type" },
        { status: 400 }
      )
    }

    // Convert File to Buffer
    const audioBuffer = Buffer.from(await audioFile.arrayBuffer())

    // Create voice clone
    const voiceResult = await createVoiceClone(
      audioBuffer,
      name || `Voice_${session.user.id.slice(0, 8)}`,
      `Voice clone for user ${session.user.id}`
    )

    // Upload avatar image if provided
    let avatarImageUrl: string | null = null
    if (imageFile && imageFile.type.startsWith("image/")) {
      const imageBuffer = Buffer.from(await imageFile.arrayBuffer())
      avatarImageUrl = await uploadToFalStorage(
        imageBuffer,
        `avatar_${session.user.id}.${imageFile.type.split("/")[1]}`,
        imageFile.type
      )
    }

    // Store avatar profile in database
    const { data: profile, error: dbError } = await supabaseAdmin
      .from("avatar_profiles")
      .upsert({
        user_id: session.user.id,
        voice_model_id: voiceResult.modelId,
        voice_name: voiceResult.name,
        voice_status: voiceResult.status,
        avatar_image_url: avatarImageUrl,
        updated_at: new Date().toISOString(),
      }, {
        onConflict: "user_id",
      })
      .select()
      .single()

    if (dbError) {
      console.error("Database error:", dbError)
      // Continue even if DB fails - voice clone was created
    }

    return NextResponse.json({
      success: true,
      voiceModelId: voiceResult.modelId,
      voiceName: voiceResult.name,
      voiceStatus: voiceResult.status,
      avatarImageUrl,
      message: voiceResult.status === "ready"
        ? "Voice clone created successfully"
        : "Voice clone is being processed. Check status in a few seconds.",
    })
  } catch (error: any) {
    console.error("Voice clone error:", error)
    return NextResponse.json(
      { error: error?.message || "Failed to create voice clone" },
      { status: 500 }
    )
  }
}

/**
 * GET /api/avatar/clone
 * Get user's voice clone status and list
 */
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { searchParams } = new URL(req.url)
    const modelId = searchParams.get("modelId")

    // If modelId provided, check specific status
    if (modelId) {
      const status = await getVoiceCloneStatus(modelId)
      return NextResponse.json({ status })
    }

    // Otherwise, get user's profile from database
    const { data: profile, error: dbError } = await supabaseAdmin
      .from("avatar_profiles")
      .select("*")
      .eq("user_id", session.user.id)
      .single()

    if (dbError && dbError.code !== "PGRST116") {
      console.error("Database error:", dbError)
    }

    // Also list all voice models (for development/debugging)
    let voiceModels: Awaited<ReturnType<typeof listVoiceModels>> = []
    try {
      voiceModels = await listVoiceModels()
    } catch (e) {
      console.error("Error listing voice models:", e)
    }

    return NextResponse.json({
      profile: profile || null,
      voiceModels,
    })
  } catch (error: any) {
    console.error("Get clone status error:", error)
    return NextResponse.json(
      { error: error?.message || "Failed to get voice clone status" },
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/avatar/clone
 * Delete a voice clone
 */
export async function DELETE(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { modelId } = await req.json()

    if (!modelId) {
      return NextResponse.json(
        { error: "Model ID is required" },
        { status: 400 }
      )
    }

    // Verify user owns this voice model
    const { data: profile } = await supabaseAdmin
      .from("avatar_profiles")
      .select("voice_model_id")
      .eq("user_id", session.user.id)
      .eq("voice_model_id", modelId)
      .single()

    if (!profile) {
      return NextResponse.json(
        { error: "Voice model not found or not owned by user" },
        { status: 404 }
      )
    }

    // Delete from Fish Audio
    const { deleteVoiceModel } = await import("@/lib/avatar")
    await deleteVoiceModel(modelId)

    // Update database
    await supabaseAdmin
      .from("avatar_profiles")
      .update({
        voice_model_id: null,
        voice_status: null,
        updated_at: new Date().toISOString(),
      })
      .eq("user_id", session.user.id)

    return NextResponse.json({
      success: true,
      message: "Voice clone deleted",
    })
  } catch (error: any) {
    console.error("Delete clone error:", error)
    return NextResponse.json(
      { error: error?.message || "Failed to delete voice clone" },
      { status: 500 }
    )
  }
}
