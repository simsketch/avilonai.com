/**
 * Voice Cloning Client using Fish Audio API
 *
 * Fish Audio provides instant voice cloning from short audio samples.
 * Docs: https://docs.fish.audio/
 */

const FISH_AUDIO_API_URL = "https://api.fish.audio"
const FISH_AUDIO_API_KEY = process.env.FISH_AUDIO_API_KEY

if (!FISH_AUDIO_API_KEY) {
  console.warn("FISH_AUDIO_API_KEY is not set")
}

export interface VoiceModel {
  id: string
  name: string
  description?: string
  createdAt: string
  sampleUrl?: string
}

export interface VoiceCloneResult {
  modelId: string
  name: string
  status: "processing" | "ready" | "failed"
}

export interface TTSRequest {
  text: string
  voiceId: string
  format?: "mp3" | "wav" | "opus"
  speed?: number // 0.5 to 2.0
}

export interface TTSResponse {
  audioUrl: string
  audioData?: ArrayBuffer
  duration: number
}

/**
 * Create a voice clone from an audio sample
 * Uses Fish Audio's model creation API
 */
export async function createVoiceClone(
  audioFile: Buffer | Blob,
  name: string,
  description?: string
): Promise<VoiceCloneResult> {
  const formData = new FormData()

  // Convert Buffer to Blob if needed
  let audioBlob: Blob
  if (audioFile instanceof Blob) {
    audioBlob = audioFile
  } else {
    const arrayBuffer = audioFile.buffer.slice(audioFile.byteOffset, audioFile.byteOffset + audioFile.byteLength) as ArrayBuffer
    audioBlob = new Blob([arrayBuffer], { type: "audio/wav" })
  }

  // Fish Audio model creation parameters
  formData.append("type", "tts")
  formData.append("title", name)
  formData.append("train_mode", "fast") // Instantly available
  formData.append("visibility", "private")
  formData.append("voices", audioBlob, "voice_sample.wav")

  if (description) {
    formData.append("description", description)
  }

  const response = await fetch(`${FISH_AUDIO_API_URL}/model`, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${FISH_AUDIO_API_KEY}`,
    },
    body: formData,
  })

  if (!response.ok) {
    const error = await response.text()
    console.error("Fish Audio clone error:", response.status, error)
    throw new Error(`Failed to create voice clone: ${error}`)
  }

  const data = await response.json()

  return {
    modelId: data._id || data.id,
    name: data.title || name,
    status: data.state === "trained" ? "ready" : "processing",
  }
}

/**
 * Check the status of a voice clone
 */
export async function getVoiceCloneStatus(modelId: string): Promise<VoiceCloneResult> {
  const response = await fetch(`${FISH_AUDIO_API_URL}/model/${modelId}`, {
    method: "GET",
    headers: {
      "Authorization": `Bearer ${FISH_AUDIO_API_KEY}`,
    },
  })

  if (!response.ok) {
    const error = await response.text()
    throw new Error(`Failed to get voice status: ${error}`)
  }

  const data = await response.json()

  return {
    modelId: data._id || data.id,
    name: data.title,
    status: data.state === "trained" ? "ready" : data.state === "failed" ? "failed" : "processing",
  }
}

/**
 * List all voice models for the current user
 */
export async function listVoiceModels(): Promise<VoiceModel[]> {
  const response = await fetch(`${FISH_AUDIO_API_URL}/model?self=true`, {
    method: "GET",
    headers: {
      "Authorization": `Bearer ${FISH_AUDIO_API_KEY}`,
    },
  })

  if (!response.ok) {
    const error = await response.text()
    throw new Error(`Failed to list voices: ${error}`)
  }

  const data = await response.json()
  const items = data.items || data.data || []

  return items.map((v: any) => ({
    id: v._id || v.id,
    name: v.title || v.name,
    description: v.description,
    createdAt: v.created_at,
    sampleUrl: v.cover_image,
  }))
}

/**
 * Generate speech from text using a cloned voice
 * Returns audio as ArrayBuffer for streaming or URL for download
 */
export async function textToSpeech(request: TTSRequest): Promise<TTSResponse> {
  const { text, voiceId, format = "mp3" } = request

  const response = await fetch(`${FISH_AUDIO_API_URL}/v1/tts`, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${FISH_AUDIO_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      text,
      reference_id: voiceId,
      format,
      latency: "normal",
    }),
  })

  if (!response.ok) {
    const error = await response.text()
    console.error("Fish Audio TTS error:", response.status, error)
    throw new Error(`Failed to generate speech: ${error}`)
  }

  const audioData = await response.arrayBuffer()

  // Estimate duration (rough calculation based on text length)
  const estimatedDuration = text.length * 0.06 // ~60ms per character

  return {
    audioUrl: "", // Will be created from audioData if needed
    audioData,
    duration: estimatedDuration,
  }
}

/**
 * Generate speech and return as streaming response
 * For real-time applications
 */
export async function textToSpeechStream(
  text: string,
  voiceId: string,
  format: "mp3" | "wav" | "opus" = "opus"
): Promise<ReadableStream<Uint8Array>> {
  const response = await fetch(`${FISH_AUDIO_API_URL}/v1/tts`, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${FISH_AUDIO_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      text,
      reference_id: voiceId,
      format,
      latency: "balanced",
    }),
  })

  if (!response.ok) {
    const error = await response.text()
    throw new Error(`Failed to stream speech: ${error}`)
  }

  if (!response.body) {
    throw new Error("No response body for streaming")
  }

  return response.body
}

/**
 * Delete a voice model
 */
export async function deleteVoiceModel(modelId: string): Promise<void> {
  const response = await fetch(`${FISH_AUDIO_API_URL}/model/${modelId}`, {
    method: "DELETE",
    headers: {
      "Authorization": `Bearer ${FISH_AUDIO_API_KEY}`,
    },
  })

  if (!response.ok) {
    const error = await response.text()
    throw new Error(`Failed to delete voice: ${error}`)
  }
}
