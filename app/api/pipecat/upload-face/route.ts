import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"

const PIPECAT_SERVICE_URL = process.env.PIPECAT_SERVICE_URL || "http://localhost:8080"

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const formData = await req.formData()
    const file = formData.get("file") as File | null

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 })
    }

    // Check file type
    if (!file.type.startsWith("image/")) {
      return NextResponse.json({ error: "File must be an image" }, { status: 400 })
    }

    // Check file size (10MB max)
    if (file.size > 10 * 1024 * 1024) {
      return NextResponse.json({ error: "File too large (max 10MB)" }, { status: 400 })
    }

    // Forward the file to Pipecat service
    const pipecatFormData = new FormData()
    pipecatFormData.append("file", file)

    const response = await fetch(`${PIPECAT_SERVICE_URL}/upload-face`, {
      method: "POST",
      body: pipecatFormData,
    })

    if (!response.ok) {
      const error = await response.text()
      console.error("Pipecat upload error:", error)
      return NextResponse.json(
        { error: "Failed to create avatar from photo" },
        { status: 500 }
      )
    }

    const data = await response.json()

    return NextResponse.json({
      face_id: data.face_id,
      message: data.message || "Avatar created successfully",
    })
  } catch (error: any) {
    console.error("Upload face error:", error)
    return NextResponse.json(
      { error: error?.message || "Failed to upload photo" },
      { status: 500 }
    )
  }
}
