import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { supabaseAdmin } from "@/lib/db/supabase"

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Fetch patient profile
    const { data: profile } = await supabaseAdmin
      .from("patient_profiles")
      .select("*")
      .eq("user_id", session.user.id)
      .single()

    // Fetch chat sessions with mood scores
    const { data: sessions } = await supabaseAdmin
      .from("chat_sessions")
      .select("*")
      .eq("user_id", session.user.id)
      .order("created_at", { ascending: false })
      .limit(20)

    // Fetch session notes
    const { data: notes } = await supabaseAdmin
      .from("session_notes")
      .select("*")
      .eq("user_id", session.user.id)
      .order("created_at", { ascending: false })
      .limit(10)

    // Calculate mood trend
    const moodTrend = sessions
      ?.filter((s) => s.mood_score !== null)
      .map((s) => ({
        date: s.created_at,
        score: s.mood_score,
      }))

    return NextResponse.json({
      profile: profile?.intake_data || null,
      sessions: sessions || [],
      notes: notes || [],
      moodTrend: moodTrend || [],
    })
  } catch (error) {
    console.error("Dashboard error:", error)
    return NextResponse.json(
      { error: "Failed to fetch dashboard data" },
      { status: 500 }
    )
  }
}
