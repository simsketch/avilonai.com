import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { supabaseAdmin } from "@/lib/db/supabase"

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const data = await req.json()

    // Calculate PHQ-2 and GAD-2 scores
    const phq2Score = parseInt(data.phq2_1) + parseInt(data.phq2_2)
    const gad2Score = parseInt(data.gad2_1) + parseInt(data.gad2_2)

    const intakeData = {
      name: data.name,
      age: data.age,
      mainConcern: data.mainConcern,
      phq2: {
        q1: parseInt(data.phq2_1),
        q2: parseInt(data.phq2_2),
        score: phq2Score,
      },
      gad2: {
        q1: parseInt(data.gad2_1),
        q2: parseInt(data.gad2_2),
        score: gad2Score,
      },
      emergencyContact: data.emergencyContact,
      completedAt: new Date().toISOString(),
    }

    // Upsert patient profile
    const { error } = await supabaseAdmin
      .from("patient_profiles")
      .upsert({
        user_id: session.user.id,
        intake_data: intakeData,
      })

    if (error) {
      console.error("Database error:", error)
      return NextResponse.json(
        { error: "Failed to save intake data" },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Intake error:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
