import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { getStockReplicas } from "@/lib/tavus/client"

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const replicas = await getStockReplicas()

    return NextResponse.json({
      replicas: replicas.map((r) => ({
        id: r.replica_id,
        name: r.replica_name,
        thumbnail: r.thumbnail_video_url,
        type: r.replica_type,
      })),
    })
  } catch (error: any) {
    console.error("Error fetching replicas:", error)
    return NextResponse.json(
      { error: error?.message || "Failed to fetch replicas" },
      { status: 500 }
    )
  }
}
