import { supabaseAdmin } from "@/lib/db/supabase"

// Crisis keywords that trigger immediate intervention
const CRISIS_KEYWORDS = [
  "suicide",
  "suicidal",
  "kill myself",
  "kill my self",
  "end my life",
  "end it all",
  "want to die",
  "better off dead",
  "no reason to live",
  "self harm",
  "self-harm",
  "hurt myself",
  "hurt my self",
]

export interface CrisisDetection {
  isCrisis: boolean
  detectedKeywords: string[]
  message: string
}

export const CRISIS_RESOURCES = `
🚨 **Crisis Support Resources**

If you're in immediate danger, please:

1. **Call 988** - Suicide & Crisis Lifeline (US)
   - Available 24/7
   - Free and confidential support

2. **Text "HELLO" to 741741** - Crisis Text Line
   - Text-based support
   - Available 24/7

3. **Go to your nearest emergency room**

4. **International Crisis Lines**: https://findahelpline.com

You are not alone. Help is available, and people care about you.
`

export function detectCrisis(message: string): CrisisDetection {
  const lowerMessage = message.toLowerCase()
  const detectedKeywords: string[] = []

  for (const keyword of CRISIS_KEYWORDS) {
    if (lowerMessage.includes(keyword)) {
      detectedKeywords.push(keyword)
    }
  }

  return {
    isCrisis: detectedKeywords.length > 0,
    detectedKeywords,
    message,
  }
}

export async function logCrisisIncident(
  userId: string,
  message: string,
  detectedKeywords: string[],
  sessionId?: string
): Promise<void> {
  try {
    const { error } = await supabaseAdmin.from("crisis_logs").insert({
      user_id: userId,
      session_id: sessionId || null,
      message,
      detected_keywords: detectedKeywords,
    })

    if (error) {
      console.error("Error logging crisis incident:", error)
    }
  } catch (error) {
    console.error("Error logging crisis incident:", error)
  }
}

export function getCrisisResponse(): string {
  return `I'm very concerned about what you've shared. Your safety is the top priority right now.

${CRISIS_RESOURCES}

I'm here to support you, but I'm not equipped to handle crisis situations. Please reach out to one of these resources immediately. They have trained professionals who can provide the help you need right now.

Would you like to talk about what's making you feel this way, while also committing to reaching out to crisis support?`
}
