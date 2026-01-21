/**
 * Streaming Utilities for Real-time Avatar Conversation
 *
 * Orchestrates the conversation flow:
 * User speech → STT → LLM → TTS → Lip Sync → Video
 */

import { textToSpeech, textToSpeechStream } from "./voice-clone"
import { generateLipSyncVideo, uploadToFalStorage } from "./lip-sync"
import { transcribeAudio, getStreamingUrl, getStreamingApiKey, VAD_SETTINGS } from "./stt"
import { generateResponse, ChatMessage } from "../ai/agent"

export interface ConversationConfig {
  voiceId: string // Voice clone ID for TTS
  avatarImageUrl: string // Face image for lip sync
  systemPrompt?: string
}

export interface ConversationMessage {
  role: "user" | "assistant"
  content: string
  audioUrl?: string
  videoUrl?: string
  timestamp: number
}

export interface ConversationState {
  id: string
  config: ConversationConfig
  messages: ConversationMessage[]
  isProcessing: boolean
  lastActivity: number
}

/**
 * Generate a complete response with audio and video
 * This is the main pipeline for conversation turns
 */
export async function generateAvatarResponse(
  userText: string,
  conversationHistory: ChatMessage[],
  config: ConversationConfig
): Promise<{
  text: string
  audioUrl: string
  videoUrl: string
}> {
  // Step 1: Generate LLM response
  const responseText = await generateResponse([
    ...conversationHistory,
    { role: "user", content: userText },
  ])

  // Step 2: Generate speech with cloned voice
  const ttsResult = await textToSpeech({
    text: responseText,
    voiceId: config.voiceId,
    format: "mp3",
  })

  // Upload audio to fal.ai storage for lip sync
  const audioUrl = await uploadToFalStorage(
    Buffer.from(ttsResult.audioData!),
    "response.mp3",
    "audio/mpeg"
  )

  // Step 3: Generate lip-synced video
  const videoUrl = await generateLipSyncVideo({
    imageUrl: config.avatarImageUrl,
    audioUrl,
  })

  return {
    text: responseText,
    audioUrl,
    videoUrl,
  }
}

/**
 * Process audio input and generate full response
 * For non-streaming use case
 */
export async function processAudioInput(
  audioData: Buffer,
  conversationHistory: ChatMessage[],
  config: ConversationConfig
): Promise<{
  userText: string
  responseText: string
  audioUrl: string
  videoUrl: string
}> {
  // Step 1: Transcribe user audio
  const transcription = await transcribeAudio(audioData)

  if (!transcription.text || transcription.confidence < 0.5) {
    throw new Error("Could not understand audio input")
  }

  // Step 2: Generate response with avatar
  const response = await generateAvatarResponse(
    transcription.text,
    conversationHistory,
    config
  )

  return {
    userText: transcription.text,
    responseText: response.text,
    audioUrl: response.audioUrl,
    videoUrl: response.videoUrl,
  }
}

/**
 * Streaming configuration for client-side use
 */
export interface StreamingConfig {
  sttApiKey: string
  sttWebSocketUrl: string
  vadSettings: typeof VAD_SETTINGS
}

/**
 * Get configuration for client-side streaming
 */
export function getStreamingConfig(): StreamingConfig {
  return {
    sttApiKey: getStreamingApiKey(),
    sttWebSocketUrl: getStreamingUrl({
      model: "nova-2",
      language: "en-US",
      punctuate: true,
      smartFormat: true,
      utterances: true,
    }),
    vadSettings: VAD_SETTINGS,
  }
}

/**
 * Video segment queue for smooth playback
 */
export interface VideoSegment {
  id: string
  videoUrl: string
  audioUrl: string
  text: string
  duration: number
  timestamp: number
}

/**
 * Create a conversation session
 */
export function createConversationSession(
  config: ConversationConfig
): ConversationState {
  return {
    id: `conv_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`,
    config,
    messages: [],
    isProcessing: false,
    lastActivity: Date.now(),
  }
}

/**
 * Add message to conversation history
 */
export function addMessage(
  state: ConversationState,
  message: Omit<ConversationMessage, "timestamp">
): ConversationState {
  return {
    ...state,
    messages: [
      ...state.messages,
      { ...message, timestamp: Date.now() },
    ],
    lastActivity: Date.now(),
  }
}

/**
 * Convert conversation state to ChatMessage format for LLM
 */
export function toChatMessages(
  state: ConversationState,
  systemPrompt?: string
): ChatMessage[] {
  const messages: ChatMessage[] = []

  if (systemPrompt || state.config.systemPrompt) {
    messages.push({
      role: "system",
      content: systemPrompt || state.config.systemPrompt!,
    })
  }

  for (const msg of state.messages) {
    messages.push({
      role: msg.role,
      content: msg.content,
    })
  }

  return messages
}

/**
 * Audio chunk manager for WebSocket streaming
 */
export interface AudioChunk {
  data: ArrayBuffer
  timestamp: number
  isFinal: boolean
}

/**
 * Buffer audio chunks for processing
 */
export class AudioBuffer {
  private chunks: AudioChunk[] = []
  private totalDuration: number = 0

  add(chunk: AudioChunk): void {
    this.chunks.push(chunk)
    this.totalDuration += chunk.data.byteLength / (VAD_SETTINGS.sampleRate * 2)
  }

  getBuffer(): ArrayBuffer {
    const totalLength = this.chunks.reduce((sum, c) => sum + c.data.byteLength, 0)
    const combined = new Uint8Array(totalLength)
    let offset = 0

    for (const chunk of this.chunks) {
      combined.set(new Uint8Array(chunk.data), offset)
      offset += chunk.data.byteLength
    }

    return combined.buffer
  }

  clear(): void {
    this.chunks = []
    this.totalDuration = 0
  }

  get duration(): number {
    return this.totalDuration
  }

  get hasData(): boolean {
    return this.chunks.length > 0
  }
}

/**
 * Helper to convert blob to base64 data URL
 */
export async function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result as string)
    reader.onerror = reject
    reader.readAsDataURL(blob)
  })
}

/**
 * Helper to create audio blob from chunks
 */
export function createAudioBlob(
  chunks: Uint8Array[],
  mimeType: string = "audio/webm;codecs=opus"
): Blob {
  // Convert Uint8Array chunks to ArrayBuffer for Blob compatibility
  const parts = chunks.map(chunk =>
    chunk.buffer.slice(chunk.byteOffset, chunk.byteOffset + chunk.byteLength) as ArrayBuffer
  )
  return new Blob(parts, { type: mimeType })
}
