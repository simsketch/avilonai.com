import { NextRequest, NextResponse } from "next/server"
import { supabaseAdmin } from "@/lib/db/supabase"

export async function POST(req: NextRequest) {
  try {
    const { email, password } = await req.json()

    if (!email || !password) {
      return NextResponse.json(
        { error: "Email and password are required" },
        { status: 400 }
      )
    }

    // Create user with Supabase Auth
    const { data, error } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true, // Auto-confirm for POC
    })

    if (error) {
      console.error("Signup error:", error)
      return NextResponse.json(
        { error: error.message || "Failed to create account" },
        { status: 400 }
      )
    }

    return NextResponse.json({ success: true, userId: data.user.id })
  } catch (error) {
    console.error("Signup error:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
