/**
 * Avatar Module - Open Source Conversation Simulator
 *
 * Provides voice cloning, lip sync, and real-time conversation
 * capabilities using managed APIs (Fish Audio, Replicate, Deepgram).
 */

// Voice Cloning (Fish Audio)
export {
  createVoiceClone,
  getVoiceCloneStatus,
  listVoiceModels,
  textToSpeech,
  textToSpeechStream,
  deleteVoiceModel,
  type VoiceModel,
  type VoiceCloneResult,
  type TTSRequest,
  type TTSResponse,
} from "./voice-clone"

// Lip Sync (Replicate - SadTalker model)
export {
  submitLipSyncJob,
  getLipSyncStatus,
  getLipSyncResult,
  generateLipSyncVideo,
  generateLipSyncVideoWithWebhook,
  uploadToStorage,
  uploadToFalStorage, // Backward compatible alias
  base64ToUrl,
  base64ToFalUrl, // Backward compatible alias
  generateLipSyncSegment,
  cancelLipSyncJob,
  type LipSyncRequest,
  type LipSyncResult,
  type LipSyncResponse,
} from "./lip-sync"

// Speech-to-Text (Deepgram)
export {
  transcribeAudio,
  transcribeFromUrl,
  getStreamingUrl,
  getStreamingApiKey,
  createStreamingSession,
  parseStreamingMessage,
  VAD_SETTINGS,
  type TranscriptionResult,
  type TranscriptionOptions,
  type StreamingTranscriptionMessage,
} from "./stt"

// Streaming & Conversation
export {
  generateAvatarResponse,
  processAudioInput,
  getStreamingConfig,
  createConversationSession,
  addMessage,
  toChatMessages,
  AudioBuffer,
  blobToDataUrl,
  createAudioBlob,
  type ConversationConfig,
  type ConversationMessage,
  type ConversationState,
  type StreamingConfig,
  type VideoSegment,
  type AudioChunk,
} from "./streaming"
