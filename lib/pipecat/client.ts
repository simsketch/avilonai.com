/**
 * Pipecat client helpers for connecting to real-time AI sessions.
 */

export type AvatarType = "simli" | "sprite" | "rpm"

export interface PipecatConnectionResponse {
  roomUrl: string
  token: string
  botId: string
  avatarType: AvatarType
}

/**
 * Connect to a Pipecat session via the API.
 *
 * @param sessionId - The chat session ID
 * @param avatarType - Type of avatar to use: "simli" for photorealistic, "sprite" for client-side, "rpm" for Ready Player Me
 * @returns Connection details including room URL and token
 */
export async function connectToPipecat(
  sessionId: string,
  avatarType: AvatarType = "sprite"
): Promise<PipecatConnectionResponse> {
  const response = await fetch("/api/pipecat/connect", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ sessionId, avatarType }),
  })

  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.error || "Failed to connect to real-time service")
  }

  return response.json()
}

/**
 * Viseme types for lip sync animation.
 * Maps to standard mouth shapes.
 */
export type VisemeType =
  | "neutral"
  | "aa" // Open mouth (ah, a)
  | "ee" // Wide mouth (ee, i)
  | "oo" // Round mouth (oo, u)
  | "closed" // Closed mouth (m, b, p)
  | "fv" // Lower lip tucked (f, v)

/**
 * Map phoneme to viseme for lip sync.
 */
export function phonemeToViseme(phoneme: string): VisemeType {
  const phonemeMap: Record<string, VisemeType> = {
    // Open mouth sounds
    a: "aa",
    ah: "aa",
    aa: "aa",
    ae: "aa",
    ao: "aa",
    aw: "aa",
    ay: "aa",

    // Wide mouth sounds
    e: "ee",
    ee: "ee",
    eh: "ee",
    ey: "ee",
    ih: "ee",
    iy: "ee",
    y: "ee",

    // Round mouth sounds
    o: "oo",
    oo: "oo",
    oh: "oo",
    ow: "oo",
    oy: "oo",
    uh: "oo",
    uw: "oo",
    w: "oo",

    // Closed mouth sounds
    m: "closed",
    b: "closed",
    p: "closed",
    n: "closed",
    ng: "closed",

    // F/V sounds
    f: "fv",
    v: "fv",

    // Default
    sil: "neutral",
    sp: "neutral",
  }

  return phonemeMap[phoneme.toLowerCase()] || "neutral"
}

/**
 * Simple avatar state for rendering.
 */
export interface AvatarState {
  viseme: VisemeType
  isSpeaking: boolean
  isListening: boolean
}

/**
 * Create initial avatar state.
 */
export function createInitialAvatarState(): AvatarState {
  return {
    viseme: "neutral",
    isSpeaking: false,
    isListening: false,
  }
}
