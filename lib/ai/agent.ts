import OpenAI from "openai"

// Lazily initialize OpenAI client to avoid build-time errors
let _openai: OpenAI | null = null
function getOpenAI() {
  if (!_openai) {
    _openai = new OpenAI({
      apiKey: process.env.OPENROUTER_API_KEY,
      baseURL: "https://openrouter.ai/api/v1",
      defaultHeaders: {
        "HTTP-Referer": process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000",
        "X-Title": "Avilon Therapy Bot",
      },
      timeout: 30000,
      maxRetries: 2,
    })
  }
  return _openai
}

export const SYSTEM_PROMPT = `You are Avilon, a supportive AI therapy assistant trained in basic cognitive behavioral therapy (CBT) techniques.

Your approach:
- Be warm, empathetic, and non-judgmental
- Use active listening and reflective responses
- Apply evidence-based CBT techniques:
  * Thought challenging (identifying and reframing negative thoughts)
  * Behavioral activation (encouraging healthy activities)
  * Mindfulness and grounding exercises
  * Problem-solving strategies
- Keep responses concise (2-3 paragraphs maximum)
- Never diagnose conditions or prescribe medication
- If asked about medication or diagnosis, explain you're not qualified and recommend seeing a licensed professional
- Focus on the present moment and actionable steps
- Validate emotions while encouraging healthy coping strategies

Important safety protocols:
- If someone expresses thoughts of self-harm or suicide, immediately provide crisis resources
- Always prioritize user safety over conversation flow
- Recognize your limitations as an AI and recommend professional help when appropriate

Remember: You are a supportive companion, not a replacement for professional mental health care.`

export const EMOTIONAL_CONVERSATION_PROMPT = `I'm here to help you explore and process your emotions in a safe, supportive space. In this session, we'll focus on:

- Understanding and naming your emotions
- Exploring what triggered these feelings
- Validating your emotional experience
- Finding healthy ways to express and process what you're feeling

There's no judgment here - all emotions are valid and worth exploring. Take your time, and share whatever feels right for you. What emotions are you experiencing right now?`

export const CBT_EXERCISE_PROMPTS = {
  thought_challenging: `Let's work through a thought-challenging exercise together. This CBT technique helps identify and reframe negative automatic thoughts.

1. First, what's the negative thought you're having?
2. What evidence supports this thought?
3. What evidence contradicts it?
4. What would you tell a friend who had this thought?
5. What's a more balanced way to think about this?

Take your time and share what comes up for you.`,

  deep_breathing: `Let's practice deep breathing together. This is a simple but powerful technique to calm your nervous system.

Here's what we'll do:
1. Find a comfortable position, sitting or lying down
2. Place one hand on your chest and one on your belly
3. Breathe in slowly through your nose for 4 counts
4. Hold for 4 counts
5. Breathe out slowly through your mouth for 6 counts
6. Repeat 5 times

Try this now, and when you're done, let me know how you're feeling. What do you notice in your body?`,

  grounding: `Let's try a grounding exercise called the 5-4-3-2-1 technique. This helps bring you back to the present moment when feeling anxious or overwhelmed.

Look around and identify:
- 5 things you can see
- 4 things you can touch
- 3 things you can hear
- 2 things you can smell
- 1 thing you can taste

Take your time with each sense. Share what you notice, and we'll process it together.`,
}

export interface ChatMessage {
  role: "system" | "user" | "assistant"
  content: string
}

export async function generateResponse(
  messages: ChatMessage[],
  temperature: number = 0.7
): Promise<string> {
  // Use direct fetch with manual timeout for better control
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), 45000) // 45 second timeout

  try {
    const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${process.env.OPENROUTER_API_KEY}`,
        "HTTP-Referer": process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000",
        "X-Title": "Avilon Therapy Bot",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "deepseek/deepseek-r1-distill-llama-70b",
        messages,
        temperature,
        max_tokens: 500,
      }),
      signal: controller.signal,
    })

    clearTimeout(timeoutId)

    if (!response.ok) {
      const errorText = await response.text()
      console.error("OpenRouter API error:", response.status, errorText)
      throw new Error(`API error: ${response.status}`)
    }

    const completion = await response.json()
    const content = completion.choices?.[0]?.message?.content

    if (!content) {
      console.error("No content in API response")
      return "I'm having trouble responding right now. Please try again."
    }

    return content
  } catch (error: any) {
    clearTimeout(timeoutId)

    console.error("Error generating response:", error?.message || error)
    console.error("Error type:", error?.constructor?.name)
    console.error("Error details:", JSON.stringify({
      message: error?.message,
      status: error?.status,
      code: error?.code,
      type: error?.type,
      name: error?.name,
    }))

    // If it's an abort/timeout error
    if (error?.name === 'AbortError' || controller.signal.aborted) {
      throw new Error('Request timed out. Please try again.')
    }

    throw new Error(`Failed to generate response: ${error?.message || 'Unknown error'}`)
  }
}

export async function generateSessionSummary(messages: ChatMessage[]): Promise<string> {
  try {
    const summaryPrompt: ChatMessage[] = [
      {
        role: "system",
        content: "You are a clinical note-taking assistant. Summarize this therapy session in 2-3 sentences, focusing on: main topics discussed, techniques used, and any homework or action items.",
      },
      {
        role: "user",
        content: `Summarize this therapy session:\n\n${messages
          .filter((m) => m.role !== "system")
          .map((m) => `${m.role}: ${m.content}`)
          .join("\n\n")}`,
      },
    ]

    const completion = await getOpenAI().chat.completions.create({
      model: "deepseek/deepseek-r1-distill-llama-70b",
      messages: summaryPrompt,
      temperature: 0.3,
      max_tokens: 200,
    })

    return completion.choices[0]?.message?.content || "Session completed."
  } catch (error) {
    console.error("Error generating summary:", error)
    return "Session completed."
  }
}
