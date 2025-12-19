import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { endConversation } from "@/lib/tavus/client"

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { conversationId } = await req.json()

    if (!conversationId) {
      return NextResponse.json(
        { error: "Conversation ID required" },
        { status: 400 }
      )
    }

    // End the Tavus conversation
    await endConversation(conversationId)

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error("Error ending conversation:", error)
    return NextResponse.json(
      { error: error?.message || "Failed to end conversation" },
      { status: 500 }
    )
  }
}
