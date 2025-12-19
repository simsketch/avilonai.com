const TAVUS_API_BASE_URL = "https://tavusapi.com/v2"
const TAVUS_API_KEY = process.env.TAVUS_API_KEY

if (!TAVUS_API_KEY) {
  console.warn("TAVUS_API_KEY is not set")
}

interface TavusReplica {
  replica_id: string
  replica_name: string
  thumbnail_video_url?: string
  status: string
  replica_type: "user" | "system"
  created_at: string
}

interface TavusPersona {
  persona_id: string
  persona_name: string
  system_prompt: string
  context: string
  created_at: string
}

interface TavusConversation {
  conversation_id: string
  conversation_url: string
  conversation_name: string
  status: string
  created_at: string
}

/**
 * Get all stock replicas from Tavus
 */
export async function getStockReplicas(): Promise<TavusReplica[]> {
  try {
    const response = await fetch(
      `${TAVUS_API_BASE_URL}/replicas?replica_type=system`,
      {
        method: "GET",
        headers: {
          "x-api-key": TAVUS_API_KEY || "",
          "Content-Type": "application/json",
        },
      }
    )

    if (!response.ok) {
      const error = await response.text()
      throw new Error(`Failed to fetch replicas: ${error}`)
    }

    const data = await response.json()
    return data.data || []
  } catch (error) {
    console.error("Error fetching stock replicas:", error)
    throw error
  }
}

/**
 * Get an existing persona by ID
 */
export async function getPersona(personaId: string): Promise<TavusPersona> {
  try {
    const response = await fetch(`${TAVUS_API_BASE_URL}/personas/${personaId}`, {
      method: "GET",
      headers: {
        "x-api-key": TAVUS_API_KEY || "",
        "Content-Type": "application/json",
      },
    })

    if (!response.ok) {
      const error = await response.text()
      console.error(`Tavus API error (${response.status}):`, error)
      throw new Error(`Failed to get persona: ${error}`)
    }

    const data = await response.json()
    console.log('Tavus persona retrieved:', data)
    return data
  } catch (error) {
    console.error("Error getting persona:", error)
    throw error
  }
}

/**
 * Create a persona with custom system prompt for therapy
 */
export async function createPersona(
  systemPrompt: string,
  personaName: string = "Avilon Therapist"
): Promise<TavusPersona> {
  try {
    const response = await fetch(`${TAVUS_API_BASE_URL}/personas`, {
      method: "POST",
      headers: {
        "x-api-key": TAVUS_API_KEY || "",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        persona_name: personaName,
        system_prompt: systemPrompt,
        context: "You are conducting a video therapy session. The patient can see and hear you.",
      }),
    })

    if (!response.ok) {
      const error = await response.text()
      throw new Error(`Failed to create persona: ${error}`)
    }

    const data = await response.json()
    return data
  } catch (error) {
    console.error("Error creating persona:", error)
    throw error
  }
}

/**
 * Create a conversation with a replica and persona
 */
export async function createConversation(
  replicaId: string,
  personaId: string,
  conversationName: string = "Therapy Session"
): Promise<TavusConversation> {
  try {
    const response = await fetch(`${TAVUS_API_BASE_URL}/conversations`, {
      method: "POST",
      headers: {
        "x-api-key": TAVUS_API_KEY || "",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        replica_id: replicaId,
        persona_id: personaId,
        conversation_name: conversationName,
      }),
    })

    if (!response.ok) {
      const error = await response.text()
      console.error(`Tavus API error (${response.status}):`, error)
      throw new Error(`Failed to create conversation: ${error}`)
    }

    const data = await response.json()
    console.log('Tavus conversation created:', data)
    return data
  } catch (error) {
    console.error("Error creating conversation:", error)
    throw error
  }
}

/**
 * End a conversation
 */
export async function endConversation(conversationId: string): Promise<void> {
  try {
    const response = await fetch(
      `${TAVUS_API_BASE_URL}/conversations/${conversationId}`,
      {
        method: "DELETE",
        headers: {
          "x-api-key": TAVUS_API_KEY || "",
          "Content-Type": "application/json",
        },
      }
    )

    if (!response.ok) {
      const error = await response.text()
      console.error(`Tavus API error (${response.status}):`, error)
      throw new Error(`Failed to end conversation: ${error}`)
    }

    console.log(`Ended conversation: ${conversationId}`)
  } catch (error) {
    console.error("Error ending conversation:", error)
    throw error
  }
}

/**
 * Find a female stock replica (preferring "Gigi" or similar)
 */
export async function findFemaleReplica(): Promise<TavusReplica | null> {
  try {
    const replicas = await getStockReplicas()

    // Try to find "Gigi" first
    const gigi = replicas.find((r) =>
      r.replica_name.toLowerCase().includes("gigi")
    )
    if (gigi) return gigi

    // Fallback to any female-sounding name
    const femaleNames = ["emma", "sarah", "lisa", "maria", "anna", "sophia", "jessica"]
    const femaleReplica = replicas.find((r) =>
      femaleNames.some((name) => r.replica_name.toLowerCase().includes(name))
    )
    if (femaleReplica) return femaleReplica

    // Return first available stock replica
    return replicas[0] || null
  } catch (error) {
    console.error("Error finding female replica:", error)
    return null
  }
}
