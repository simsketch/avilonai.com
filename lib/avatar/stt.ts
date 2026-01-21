/**
 * Speech-to-Text Client using Deepgram API
 *
 * Deepgram provides fast, accurate speech recognition
 * with real-time streaming support.
 * Docs: https://developers.deepgram.com/docs
 */

const DEEPGRAM_API_URL = "https://api.deepgram.com/v1"
const DEEPGRAM_API_KEY = process.env.DEEPGRAM_API_KEY

if (!DEEPGRAM_API_KEY) {
  console.warn("DEEPGRAM_API_KEY is not set")
}

export interface TranscriptionResult {
  text: string
  confidence: number
  words?: Array<{
    word: string
    start: number
    end: number
    confidence: number
  }>
  duration: number
  isFinal: boolean
}

export interface TranscriptionOptions {
  language?: string // e.g., "en-US", "es", "fr"
  model?: "nova-2" | "nova" | "enhanced" | "base"
  punctuate?: boolean
  profanityFilter?: boolean
  redact?: string[] // e.g., ["pci", "ssn"]
  diarize?: boolean // speaker separation
  smartFormat?: boolean
  utterances?: boolean
  keywords?: string[] // boost specific words
}

/**
 * Transcribe an audio file (pre-recorded)
 */
export async function transcribeAudio(
  audioData: Buffer | ArrayBuffer,
  options: TranscriptionOptions = {}
): Promise<TranscriptionResult> {
  const {
    language = "en-US",
    model = "nova-2",
    punctuate = true,
    profanityFilter = false,
    smartFormat = true,
  } = options

  const params = new URLSearchParams({
    language,
    model,
    punctuate: String(punctuate),
    profanity_filter: String(profanityFilter),
    smart_format: String(smartFormat),
  })

  // Convert Buffer to ArrayBuffer for fetch compatibility
  let body: ArrayBuffer
  if (Buffer.isBuffer(audioData)) {
    body = audioData.buffer.slice(audioData.byteOffset, audioData.byteOffset + audioData.byteLength) as ArrayBuffer
  } else {
    body = audioData
  }

  const response = await fetch(`${DEEPGRAM_API_URL}/listen?${params}`, {
    method: "POST",
    headers: {
      "Authorization": `Token ${DEEPGRAM_API_KEY}`,
      "Content-Type": "audio/wav",
    },
    body,
  })

  if (!response.ok) {
    const error = await response.text()
    console.error("Deepgram transcription error:", response.status, error)
    throw new Error(`Failed to transcribe audio: ${error}`)
  }

  const data = await response.json()
  const result = data.results?.channels?.[0]?.alternatives?.[0]

  if (!result) {
    throw new Error("No transcription result")
  }

  return {
    text: result.transcript || "",
    confidence: result.confidence || 0,
    words: result.words,
    duration: data.metadata?.duration || 0,
    isFinal: true,
  }
}

/**
 * Transcribe audio from a URL
 */
export async function transcribeFromUrl(
  audioUrl: string,
  options: TranscriptionOptions = {}
): Promise<TranscriptionResult> {
  const {
    language = "en-US",
    model = "nova-2",
    punctuate = true,
    profanityFilter = false,
    smartFormat = true,
  } = options

  const params = new URLSearchParams({
    language,
    model,
    punctuate: String(punctuate),
    profanity_filter: String(profanityFilter),
    smart_format: String(smartFormat),
  })

  const response = await fetch(`${DEEPGRAM_API_URL}/listen?${params}`, {
    method: "POST",
    headers: {
      "Authorization": `Token ${DEEPGRAM_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ url: audioUrl }),
  })

  if (!response.ok) {
    const error = await response.text()
    throw new Error(`Failed to transcribe from URL: ${error}`)
  }

  const data = await response.json()
  const result = data.results?.channels?.[0]?.alternatives?.[0]

  return {
    text: result?.transcript || "",
    confidence: result?.confidence || 0,
    words: result?.words,
    duration: data.metadata?.duration || 0,
    isFinal: true,
  }
}

/**
 * Get WebSocket URL for real-time streaming transcription
 * Client-side should connect to this URL and send audio chunks
 */
export function getStreamingUrl(options: TranscriptionOptions = {}): string {
  const {
    language = "en-US",
    model = "nova-2",
    punctuate = true,
    smartFormat = true,
    utterances = true,
  } = options

  const params = new URLSearchParams({
    language,
    model,
    punctuate: String(punctuate),
    smart_format: String(smartFormat),
    utterances: String(utterances),
    interim_results: "true",
    vad_events: "true",
    endpointing: "300", // 300ms silence for utterance end
  })

  return `wss://api.deepgram.com/v1/listen?${params}`
}

/**
 * Get API key for client-side streaming
 * In production, use a scoped/temporary key
 */
export function getStreamingApiKey(): string {
  return DEEPGRAM_API_KEY || ""
}

/**
 * Create a temporary streaming session key (more secure for production)
 */
export async function createStreamingSession(
  expiresInSeconds: number = 300
): Promise<{ key: string; expiresAt: Date }> {
  const response = await fetch(`${DEEPGRAM_API_URL}/projects`, {
    method: "GET",
    headers: {
      "Authorization": `Token ${DEEPGRAM_API_KEY}`,
    },
  })

  if (!response.ok) {
    // For now, return the main key (in production, use scoped keys)
    return {
      key: DEEPGRAM_API_KEY || "",
      expiresAt: new Date(Date.now() + expiresInSeconds * 1000),
    }
  }

  // In production, create a scoped key here
  return {
    key: DEEPGRAM_API_KEY || "",
    expiresAt: new Date(Date.now() + expiresInSeconds * 1000),
  }
}

/**
 * Real-time streaming transcription handler (server-side)
 * For use with WebSocket proxy
 */
export interface StreamingTranscriptionMessage {
  type: "Results" | "Metadata" | "Error" | "UtteranceEnd"
  channel_index?: number[]
  duration?: number
  start?: number
  is_final?: boolean
  speech_final?: boolean
  channel?: {
    alternatives: Array<{
      transcript: string
      confidence: number
      words?: Array<{
        word: string
        start: number
        end: number
        confidence: number
      }>
    }>
  }
  error?: string
}

/**
 * Parse a streaming transcription message
 */
export function parseStreamingMessage(
  message: StreamingTranscriptionMessage
): TranscriptionResult | null {
  if (message.type === "Error") {
    console.error("Deepgram streaming error:", message.error)
    return null
  }

  if (message.type !== "Results") {
    return null
  }

  const alternative = message.channel?.alternatives?.[0]
  if (!alternative) {
    return null
  }

  return {
    text: alternative.transcript || "",
    confidence: alternative.confidence || 0,
    words: alternative.words,
    duration: message.duration || 0,
    isFinal: message.is_final || message.speech_final || false,
  }
}

/**
 * VAD (Voice Activity Detection) settings for optimal conversation
 */
export const VAD_SETTINGS = {
  // Silence duration before considering speech ended
  endpointing: 300, // ms
  // Minimum speech duration to trigger transcription
  minSpeechDuration: 100, // ms
  // Audio encoding settings
  encoding: "linear16",
  sampleRate: 16000,
  channels: 1,
}
