import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"

const PIPECAT_SERVICE_URL = process.env.PIPECAT_SERVICE_URL || "http://localhost:8080"

export async function GET() {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Return Simli API key and pipecat service URL for frontend to use
    const apiKey = process.env.SIMLI_API_KEY
    const faceId = process.env.SIMLI_FACE_ID

    if (!apiKey) {
      return NextResponse.json(
        { error: "Simli API key not configured" },
        { status: 500 }
      )
    }

    // Convert HTTP URL to WebSocket URL
    const wsUrl = PIPECAT_SERVICE_URL.replace(/^http/, "ws")

    return NextResponse.json({
      apiKey,
      faceId: faceId || "",
      pipecatWsUrl: wsUrl,
    })
  } catch (error: any) {
    console.error("Simli config error:", error)
    return NextResponse.json(
      { error: error?.message || "Failed to get Simli configuration" },
      { status: 500 }
    )
  }
}
