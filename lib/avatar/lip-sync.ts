/**
 * Lip Sync Client using Replicate API
 *
 * Uses SadTalker model for realistic lip-synced talking head videos
 * from a single image and audio input.
 * Docs: https://replicate.com/docs
 * Model: https://replicate.com/cjwbw/sadtalker
 */

const REPLICATE_API_URL = "https://api.replicate.com/v1"
const REPLICATE_API_KEY = process.env.REPLICATE_API_KEY

if (!REPLICATE_API_KEY) {
  console.warn("REPLICATE_API_KEY is not set")
}

// SadTalker model version (check for latest at https://replicate.com/cjwbw/sadtalker)
const SADTALKER_MODEL = "cjwbw/sadtalker:a519cc0cfebaaeade068b23899165a11ec76aaa1d2b313d40d214f204ec957a3"

export interface LipSyncRequest {
  imageUrl: string // URL of face image
  audioUrl: string // URL of audio file
}

export interface LipSyncResult {
  requestId: string
  status: "starting" | "processing" | "succeeded" | "failed" | "canceled"
  videoUrl?: string
  error?: string
}

export interface LipSyncResponse {
  video: {
    url: string
    content_type: string
    file_name: string
    file_size: number
  }
}

interface ReplicatePrediction {
  id: string
  status: "starting" | "processing" | "succeeded" | "failed" | "canceled"
  output?: string | string[]
  error?: string
  urls: {
    get: string
    cancel: string
  }
}

/**
 * Submit a lip sync job to Replicate
 * Returns a prediction ID for polling status
 */
export async function submitLipSyncJob(request: LipSyncRequest): Promise<string> {
  const { imageUrl, audioUrl } = request

  const response = await fetch(`${REPLICATE_API_URL}/predictions`, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${REPLICATE_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      version: SADTALKER_MODEL.split(":")[1],
      input: {
        source_image: imageUrl,
        driven_audio: audioUrl,
        preprocess: "crop", // or "resize", "full"
        still_mode: false,
        use_enhancer: false, // Set to true for better quality but slower
        result_format: "mp4",
      },
    }),
  })

  if (!response.ok) {
    const error = await response.text()
    console.error("Replicate submit error:", response.status, error)
    throw new Error(`Failed to submit lip sync job: ${error}`)
  }

  const data: ReplicatePrediction = await response.json()
  return data.id
}

/**
 * Check the status of a lip sync job
 */
export async function getLipSyncStatus(predictionId: string): Promise<LipSyncResult> {
  const response = await fetch(`${REPLICATE_API_URL}/predictions/${predictionId}`, {
    method: "GET",
    headers: {
      "Authorization": `Bearer ${REPLICATE_API_KEY}`,
    },
  })

  if (!response.ok) {
    const error = await response.text()
    throw new Error(`Failed to get status: ${error}`)
  }

  const data: ReplicatePrediction = await response.json()

  return {
    requestId: data.id,
    status: data.status,
    videoUrl: typeof data.output === "string" ? data.output : data.output?.[0],
    error: data.error,
  }
}

/**
 * Get the result of a completed lip sync job
 */
export async function getLipSyncResult(predictionId: string): Promise<LipSyncResponse> {
  const status = await getLipSyncStatus(predictionId)

  if (status.status !== "succeeded") {
    throw new Error(`Job not completed: ${status.status}`)
  }

  if (!status.videoUrl) {
    throw new Error("No video URL in result")
  }

  return {
    video: {
      url: status.videoUrl,
      content_type: "video/mp4",
      file_name: "output.mp4",
      file_size: 0, // Unknown until downloaded
    },
  }
}

/**
 * Generate lip-synced video synchronously (waits for completion)
 * For simpler use cases where you don't need to poll
 */
export async function generateLipSyncVideo(
  request: LipSyncRequest,
  timeoutMs: number = 120000 // 2 minutes default
): Promise<string> {
  const { imageUrl, audioUrl } = request

  // Submit the job
  const predictionId = await submitLipSyncJob(request)

  // Poll for completion
  const startTime = Date.now()
  while (Date.now() - startTime < timeoutMs) {
    const status = await getLipSyncStatus(predictionId)

    if (status.status === "succeeded" && status.videoUrl) {
      return status.videoUrl
    }

    if (status.status === "failed" || status.status === "canceled") {
      throw new Error(`Lip sync failed: ${status.error || status.status}`)
    }

    // Wait before polling again
    await new Promise((resolve) => setTimeout(resolve, 1000))
  }

  throw new Error("Lip sync generation timed out")
}

/**
 * Generate lip-synced video with webhook callback
 * For production use with async processing
 */
export async function generateLipSyncVideoWithWebhook(
  request: LipSyncRequest,
  webhookUrl: string
): Promise<string> {
  const { imageUrl, audioUrl } = request

  const response = await fetch(`${REPLICATE_API_URL}/predictions`, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${REPLICATE_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      version: SADTALKER_MODEL.split(":")[1],
      input: {
        source_image: imageUrl,
        driven_audio: audioUrl,
        preprocess: "crop",
        still_mode: false,
        use_enhancer: false,
        result_format: "mp4",
      },
      webhook: webhookUrl,
      webhook_events_filter: ["completed"],
    }),
  })

  if (!response.ok) {
    const error = await response.text()
    throw new Error(`Failed to submit job: ${error}`)
  }

  const data: ReplicatePrediction = await response.json()
  return data.id
}

/**
 * Upload a file and get a public URL
 * Replicate accepts URLs directly, so we use a data URL or external hosting
 * For production, consider using S3, Cloudinary, or similar
 */
export async function uploadToStorage(
  file: Buffer | Blob,
  filename: string,
  contentType: string
): Promise<string> {
  // Convert to base64 data URL (works for smaller files)
  let base64: string

  if (file instanceof Blob) {
    const arrayBuffer = await file.arrayBuffer()
    base64 = Buffer.from(arrayBuffer).toString("base64")
  } else {
    base64 = file.toString("base64")
  }

  // Return as data URL (Replicate accepts these)
  return `data:${contentType};base64,${base64}`
}

/**
 * Alias for uploadToStorage (for backward compatibility)
 */
export const uploadToFalStorage = uploadToStorage

/**
 * Convert base64 to a data URL
 */
export async function base64ToUrl(
  base64Data: string,
  filename: string,
  contentType: string
): Promise<string> {
  // Remove data URL prefix if present
  const base64Clean = base64Data.replace(/^data:[^;]+;base64,/, "")
  return `data:${contentType};base64,${base64Clean}`
}

/**
 * Alias for base64ToUrl (for backward compatibility)
 */
export const base64ToFalUrl = base64ToUrl

/**
 * Optimized lip sync for shorter segments
 * Uses faster settings for lower latency
 */
export async function generateLipSyncSegment(
  imageUrl: string,
  audioUrl: string,
  segmentDuration: number = 2
): Promise<string> {
  // For real-time, we prioritize speed over quality
  const response = await fetch(`${REPLICATE_API_URL}/predictions`, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${REPLICATE_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      version: SADTALKER_MODEL.split(":")[1],
      input: {
        source_image: imageUrl,
        driven_audio: audioUrl,
        preprocess: "crop",
        still_mode: true, // Faster processing
        use_enhancer: false, // Faster processing
        result_format: "mp4",
      },
    }),
  })

  if (!response.ok) {
    const error = await response.text()
    throw new Error(`Failed to generate segment: ${error}`)
  }

  const prediction: ReplicatePrediction = await response.json()

  // Poll for result with shorter timeout
  const startTime = Date.now()
  while (Date.now() - startTime < 60000) {
    const status = await getLipSyncStatus(prediction.id)

    if (status.status === "succeeded" && status.videoUrl) {
      return status.videoUrl
    }

    if (status.status === "failed" || status.status === "canceled") {
      throw new Error(`Segment generation failed: ${status.error || status.status}`)
    }

    await new Promise((resolve) => setTimeout(resolve, 500))
  }

  throw new Error("Segment generation timed out")
}

/**
 * Cancel a running prediction
 */
export async function cancelLipSyncJob(predictionId: string): Promise<void> {
  const response = await fetch(`${REPLICATE_API_URL}/predictions/${predictionId}/cancel`, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${REPLICATE_API_KEY}`,
    },
  })

  if (!response.ok) {
    const error = await response.text()
    console.error("Failed to cancel prediction:", error)
  }
}
