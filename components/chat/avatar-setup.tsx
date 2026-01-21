"use client"

import { useState, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Upload,
  Mic,
  Camera,
  Check,
  AlertCircle,
  Play,
  Square,
  User,
  Volume2,
  Sparkles,
  ArrowLeft,
  ArrowRight,
  ImageIcon,
} from "lucide-react"
import { useToast } from "@/components/ui/use-toast"

interface AvatarSetupProps {
  onComplete?: (profileData: AvatarProfileData) => void
  onSkip?: () => void
}

interface AvatarProfileData {
  voiceModelId: string
  voiceName: string
  avatarImageUrl: string
}

type SetupStep = "intro" | "image" | "voice" | "processing" | "complete"

export function AvatarSetup({ onComplete, onSkip }: AvatarSetupProps) {
  // State
  const [step, setStep] = useState<SetupStep>("intro")
  const [imageFile, setImageFile] = useState<File | null>(null)
  const [imagePreview, setImagePreview] = useState<string | null>(null)
  const [audioFile, setAudioFile] = useState<File | null>(null)
  const [audioPreview, setAudioPreview] = useState<string | null>(null)
  const [isRecording, setIsRecording] = useState(false)
  const [recordingTime, setRecordingTime] = useState(0)
  const [voiceName, setVoiceName] = useState("")
  const [isProcessing, setIsProcessing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [profileData, setProfileData] = useState<AvatarProfileData | null>(null)

  // Refs
  const imageInputRef = useRef<HTMLInputElement>(null)
  const audioInputRef = useRef<HTMLInputElement>(null)
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const audioChunksRef = useRef<Blob[]>([])
  const recordingTimerRef = useRef<NodeJS.Timeout | null>(null)
  const audioPreviewRef = useRef<HTMLAudioElement | null>(null)

  const { toast } = useToast()

  // Image handling
  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    if (!file.type.startsWith("image/")) {
      toast({
        title: "Invalid file",
        description: "Please select an image file (JPG, PNG, etc.)",
        variant: "destructive",
      })
      return
    }

    setImageFile(file)
    setImagePreview(URL.createObjectURL(file))
  }

  // Audio file handling
  const handleAudioSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    if (!file.type.startsWith("audio/")) {
      toast({
        title: "Invalid file",
        description: "Please select an audio file (MP3, WAV, etc.)",
        variant: "destructive",
      })
      return
    }

    setAudioFile(file)
    setAudioPreview(URL.createObjectURL(file))
  }

  // Recording
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          sampleRate: 16000,
          channelCount: 1,
          echoCancellation: true,
          noiseSuppression: true,
        },
      })

      audioChunksRef.current = []
      setRecordingTime(0)

      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: "audio/webm;codecs=opus",
      })

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data)
        }
      }

      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: "audio/webm" })
        const file = new File([audioBlob], "voice_sample.webm", { type: "audio/webm" })
        setAudioFile(file)
        setAudioPreview(URL.createObjectURL(audioBlob))
        stream.getTracks().forEach((track) => track.stop())
      }

      mediaRecorderRef.current = mediaRecorder
      mediaRecorder.start(100)
      setIsRecording(true)

      // Start timer
      recordingTimerRef.current = setInterval(() => {
        setRecordingTime((prev) => {
          if (prev >= 30) {
            stopRecording()
            return 30
          }
          return prev + 1
        })
      }, 1000)
    } catch (error: any) {
      toast({
        title: "Microphone Error",
        description: error.message || "Could not access microphone",
        variant: "destructive",
      })
    }
  }

  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      mediaRecorderRef.current.stop()
      setIsRecording(false)
    }

    if (recordingTimerRef.current) {
      clearInterval(recordingTimerRef.current)
      recordingTimerRef.current = null
    }
  }

  const playAudioPreview = () => {
    if (audioPreview && audioPreviewRef.current) {
      audioPreviewRef.current.play()
    }
  }

  // Submit
  const handleSubmit = async () => {
    if (!imageFile || !audioFile) {
      toast({
        title: "Missing files",
        description: "Please provide both a photo and voice sample",
        variant: "destructive",
      })
      return
    }

    setStep("processing")
    setIsProcessing(true)
    setError(null)

    try {
      const formData = new FormData()
      formData.append("image", imageFile)
      formData.append("audio", audioFile)
      if (voiceName) {
        formData.append("name", voiceName)
      }

      const response = await fetch("/api/avatar/clone", {
        method: "POST",
        body: formData,
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || "Failed to create avatar profile")
      }

      const data = await response.json()

      const profile: AvatarProfileData = {
        voiceModelId: data.voiceModelId,
        voiceName: data.voiceName,
        avatarImageUrl: data.avatarImageUrl,
      }

      setProfileData(profile)
      setStep("complete")

      toast({
        title: "Avatar Created!",
        description: "Your avatar profile has been set up successfully.",
      })
    } catch (error: any) {
      console.error("Avatar setup error:", error)
      setError(error.message || "Failed to create avatar profile")
      setStep("voice") // Go back to allow retry
      toast({
        title: "Error",
        description: error.message || "Failed to create avatar profile",
        variant: "destructive",
      })
    } finally {
      setIsProcessing(false)
    }
  }

  // Step indicator
  const StepIndicator = () => {
    const steps = ["intro", "image", "voice", "complete"]
    const currentIndex = steps.indexOf(step === "processing" ? "voice" : step)

    return (
      <div className="flex items-center justify-center gap-2 mb-8">
        {steps.slice(1).map((s, i) => (
          <div key={s} className="flex items-center">
            <div
              className={`
                w-2.5 h-2.5 rounded-full transition-all duration-300
                ${i < currentIndex ? "bg-sage" : i === currentIndex - 1 ? "bg-terracotta animate-breathe" : "bg-border"}
              `}
            />
            {i < steps.length - 2 && (
              <div className={`w-8 h-0.5 mx-1 ${i < currentIndex - 1 ? "bg-sage" : "bg-border"}`} />
            )}
          </div>
        ))}
      </div>
    )
  }

  // Render steps
  const renderIntro = () => (
    <div className="text-center space-y-8">
      {/* Animated icon */}
      <div className="relative">
        <div className="w-24 h-24 mx-auto bg-gradient-to-br from-terracotta-light to-coral/50 rounded-full flex items-center justify-center animate-breathe soft-glow">
          <User className="h-12 w-12 text-terracotta" />
        </div>
        <div className="absolute -top-2 -right-2 w-10 h-10 bg-sage-light rounded-full flex items-center justify-center animate-float">
          <Sparkles className="h-5 w-5 text-sage" />
        </div>
      </div>

      <div className="space-y-3">
        <h2 className="font-display text-2xl text-deep-brown">Create Your Digital Twin</h2>
        <p className="text-muted-foreground max-w-sm mx-auto">
          A personalized avatar that mirrors your appearance and voice for an intimate therapy experience.
        </p>
      </div>

      {/* Requirements card */}
      <div className="glass-card rounded-2xl p-5 text-left space-y-4">
        <h3 className="font-medium text-deep-brown flex items-center gap-2">
          <span className="w-6 h-6 rounded-full bg-terracotta/10 flex items-center justify-center">
            <span className="text-xs text-terracotta">?</span>
          </span>
          What you'll need
        </h3>
        <ul className="space-y-3">
          <li className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-xl bg-coral/10 flex items-center justify-center flex-shrink-0 mt-0.5">
              <Camera className="h-4 w-4 text-coral" />
            </div>
            <div>
              <p className="font-medium text-deep-brown text-sm">A clear photo</p>
              <p className="text-xs text-muted-foreground">Front-facing, well-lit</p>
            </div>
          </li>
          <li className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-xl bg-sage/10 flex items-center justify-center flex-shrink-0 mt-0.5">
              <Mic className="h-4 w-4 text-sage" />
            </div>
            <div>
              <p className="font-medium text-deep-brown text-sm">Voice sample</p>
              <p className="text-xs text-muted-foreground">5-30 seconds of speaking</p>
            </div>
          </li>
        </ul>
      </div>

      <div className="flex gap-3 pt-2">
        {onSkip && (
          <Button
            variant="ghost"
            onClick={onSkip}
            className="flex-1 h-12 rounded-xl text-muted-foreground hover:text-deep-brown hover:bg-soft-sand"
          >
            Skip for Now
          </Button>
        )}
        <Button
          onClick={() => setStep("image")}
          className="flex-1 h-12 rounded-xl bg-gradient-to-r from-terracotta to-coral hover:from-terracotta/90 hover:to-coral/90 warm-shadow organic-hover"
        >
          Get Started
          <ArrowRight className="ml-2 h-4 w-4" />
        </Button>
      </div>
    </div>
  )

  const renderImageStep = () => (
    <div className="space-y-6">
      <StepIndicator />

      <div className="text-center space-y-2">
        <h2 className="font-display text-xl text-deep-brown">Upload Your Photo</h2>
        <p className="text-sm text-muted-foreground">
          Choose a clear, front-facing photo
        </p>
      </div>

      <div
        className={`
          relative rounded-2xl p-8 text-center cursor-pointer transition-all duration-300
          ${imagePreview
            ? "bg-gradient-to-br from-sage-light/30 to-sage/10 border-2 border-sage/30"
            : "glass-card border-2 border-dashed border-border hover:border-terracotta/40 hover:bg-terracotta-light/10"
          }
        `}
        onClick={() => imageInputRef.current?.click()}
      >
        {imagePreview ? (
          <div className="space-y-4">
            <div className="relative w-32 h-32 mx-auto">
              <img
                src={imagePreview}
                alt="Preview"
                className="w-full h-full rounded-2xl object-cover warm-shadow"
              />
              <div className="absolute -bottom-2 -right-2 w-8 h-8 bg-sage rounded-full flex items-center justify-center">
                <Check className="h-4 w-4 text-white" />
              </div>
            </div>
            <p className="text-sm text-sage font-medium">Photo selected</p>
            <p className="text-xs text-muted-foreground">Click to change</p>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="w-20 h-20 mx-auto bg-gradient-to-br from-terracotta-light/30 to-coral/20 rounded-2xl flex items-center justify-center">
              <ImageIcon className="h-10 w-10 text-terracotta/60" />
            </div>
            <div>
              <p className="font-medium text-deep-brown">Click to upload</p>
              <p className="text-sm text-muted-foreground">JPG, PNG up to 10MB</p>
            </div>
          </div>
        )}
        <input
          ref={imageInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handleImageSelect}
        />
      </div>

      <div className="bg-sage-light/20 rounded-xl p-4 text-sm">
        <p className="text-sage font-medium mb-1">Tips for best results</p>
        <p className="text-muted-foreground text-xs">
          Use a well-lit photo with your face clearly visible. Avoid sunglasses or heavy shadows.
        </p>
      </div>

      <div className="flex gap-3">
        <Button
          variant="ghost"
          onClick={() => setStep("intro")}
          className="flex-1 h-12 rounded-xl hover:bg-soft-sand"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back
        </Button>
        <Button
          onClick={() => setStep("voice")}
          disabled={!imageFile}
          className="flex-1 h-12 rounded-xl bg-gradient-to-r from-terracotta to-coral hover:from-terracotta/90 hover:to-coral/90 disabled:opacity-50 disabled:cursor-not-allowed warm-shadow organic-hover"
        >
          Continue
          <ArrowRight className="ml-2 h-4 w-4" />
        </Button>
      </div>
    </div>
  )

  const renderVoiceStep = () => (
    <div className="space-y-6">
      <StepIndicator />

      <div className="text-center space-y-2">
        <h2 className="font-display text-xl text-deep-brown">Record Your Voice</h2>
        <p className="text-sm text-muted-foreground">
          Record 5-30 seconds of natural speech
        </p>
      </div>

      {/* Voice name input */}
      <div className="space-y-2">
        <Label htmlFor="voiceName" className="text-deep-brown">Voice Name (optional)</Label>
        <Input
          id="voiceName"
          placeholder="e.g., My Avatar Voice"
          value={voiceName}
          onChange={(e) => setVoiceName(e.target.value)}
          className="rounded-xl border-border/50 bg-white/50 focus:border-terracotta/50 focus:ring-terracotta/20"
        />
      </div>

      {/* Recording interface */}
      <div className="glass-card rounded-2xl p-6 text-center space-y-5">
        {isRecording ? (
          <div className="space-y-4">
            <div className="relative">
              <div className="w-24 h-24 mx-auto bg-gradient-to-br from-red-100 to-red-200 rounded-full flex items-center justify-center pulse-ring">
                <Mic className="h-12 w-12 text-red-500" />
              </div>
            </div>
            <div className="space-y-1">
              <p className="text-xl font-display text-red-600">
                {recordingTime}s
              </p>
              <p className="text-xs text-muted-foreground">of 30 seconds max</p>
            </div>
            <Button
              onClick={stopRecording}
              className="bg-red-500 hover:bg-red-600 text-white rounded-xl h-11"
            >
              <Square className="h-4 w-4 mr-2" />
              Stop Recording
            </Button>
          </div>
        ) : audioPreview ? (
          <div className="space-y-4">
            <div className="w-24 h-24 mx-auto bg-gradient-to-br from-sage-light to-sage/30 rounded-full flex items-center justify-center animate-breathe-slow">
              <Check className="h-12 w-12 text-sage" />
            </div>
            <div className="space-y-1">
              <p className="font-medium text-sage">Voice sample ready</p>
              <p className="text-sm text-muted-foreground">{recordingTime} seconds recorded</p>
            </div>
            <div className="flex gap-2 justify-center">
              <Button
                variant="outline"
                onClick={playAudioPreview}
                className="rounded-xl border-sage/30 text-sage hover:bg-sage/10"
              >
                <Play className="h-4 w-4 mr-2" />
                Preview
              </Button>
              <Button
                variant="outline"
                onClick={startRecording}
                className="rounded-xl border-terracotta/30 text-terracotta hover:bg-terracotta/10"
              >
                <Mic className="h-4 w-4 mr-2" />
                Re-record
              </Button>
            </div>
            <audio ref={audioPreviewRef} src={audioPreview} className="hidden" />
          </div>
        ) : (
          <div className="space-y-4">
            <div className="w-24 h-24 mx-auto bg-gradient-to-br from-soft-sand to-warm-cream rounded-full flex items-center justify-center">
              <Mic className="h-12 w-12 text-warm-gray" />
            </div>
            <p className="text-muted-foreground">
              Click to start recording
            </p>
            <Button
              onClick={startRecording}
              className="rounded-xl h-11 bg-gradient-to-r from-terracotta to-coral hover:from-terracotta/90 hover:to-coral/90 warm-shadow"
            >
              <Mic className="h-4 w-4 mr-2" />
              Start Recording
            </Button>
          </div>
        )}

        {/* Or upload file */}
        <div className="relative py-3">
          <div className="absolute inset-0 flex items-center">
            <span className="w-full border-t border-border/50" />
          </div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="bg-card px-3 text-muted-foreground">Or upload a file</span>
          </div>
        </div>

        <Button
          variant="ghost"
          onClick={() => audioInputRef.current?.click()}
          className="rounded-xl text-muted-foreground hover:text-deep-brown hover:bg-soft-sand"
        >
          <Upload className="h-4 w-4 mr-2" />
          Upload Audio File
        </Button>
        <input
          ref={audioInputRef}
          type="file"
          accept="audio/*"
          className="hidden"
          onChange={handleAudioSelect}
        />
      </div>

      <div className="bg-terracotta-light/20 rounded-xl p-4 text-sm">
        <p className="text-terracotta font-medium mb-1">Recording tips</p>
        <p className="text-muted-foreground text-xs">
          Read a paragraph aloud in a quiet environment. Speak naturally and clearly.
        </p>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-sm text-red-800 flex items-start gap-2">
          <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <div className="flex gap-3">
        <Button
          variant="ghost"
          onClick={() => setStep("image")}
          className="flex-1 h-12 rounded-xl hover:bg-soft-sand"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back
        </Button>
        <Button
          onClick={handleSubmit}
          disabled={!audioFile}
          className="flex-1 h-12 rounded-xl bg-gradient-to-r from-terracotta to-coral hover:from-terracotta/90 hover:to-coral/90 disabled:opacity-50 disabled:cursor-not-allowed warm-shadow organic-hover"
        >
          Create Avatar
          <Sparkles className="ml-2 h-4 w-4" />
        </Button>
      </div>
    </div>
  )

  const renderProcessing = () => (
    <div className="text-center space-y-8 py-8">
      {/* Animated processing indicator */}
      <div className="relative">
        <div className="w-24 h-24 mx-auto">
          <div className="absolute inset-0 bg-gradient-to-br from-terracotta to-coral rounded-full animate-breathe" />
          <div className="absolute inset-2 bg-gradient-to-br from-sage-light to-sage rounded-full animate-breathe-slow opacity-70" style={{ animationDelay: '0.5s' }} />
          <div className="absolute inset-4 bg-gradient-to-br from-coral to-terracotta-light rounded-full animate-breathe" style={{ animationDelay: '1s' }} />
        </div>
      </div>

      <div className="space-y-2">
        <h2 className="font-display text-xl text-deep-brown">Creating Your Avatar</h2>
        <p className="text-muted-foreground text-sm max-w-xs mx-auto">
          We're processing your voice and image to create your personalized digital twin.
        </p>
      </div>

      <div className="space-y-3 text-sm max-w-xs mx-auto">
        <div className="flex items-center gap-3 text-sage">
          <Check className="h-4 w-4" />
          <span>Uploading files...</span>
        </div>
        <div className="flex items-center gap-3 text-terracotta animate-pulse">
          <div className="w-4 h-4 rounded-full bg-terracotta/30 animate-breathe" />
          <span>Creating voice clone...</span>
        </div>
        <div className="flex items-center gap-3 text-muted-foreground/50">
          <div className="w-4 h-4 rounded-full border border-border" />
          <span>Finalizing avatar...</span>
        </div>
      </div>
    </div>
  )

  const renderComplete = () => (
    <div className="text-center space-y-8">
      {/* Success animation */}
      <div className="relative">
        <div className="w-24 h-24 mx-auto bg-gradient-to-br from-sage-light to-sage rounded-full flex items-center justify-center animate-scale-in soft-glow">
          <Check className="h-12 w-12 text-white" />
        </div>
        <div className="absolute -top-1 -right-1 w-8 h-8 bg-coral rounded-full flex items-center justify-center animate-float">
          <Sparkles className="h-4 w-4 text-white" />
        </div>
      </div>

      <div className="space-y-2">
        <h2 className="font-display text-2xl text-deep-brown">Avatar Created!</h2>
        <p className="text-muted-foreground">
          Your digital twin is ready for video conversations.
        </p>
      </div>

      {profileData && (
        <div className="glass-card rounded-2xl p-6 space-y-4">
          {imagePreview && (
            <div className="relative w-20 h-20 mx-auto">
              <img
                src={imagePreview}
                alt="Avatar"
                className="w-full h-full rounded-full object-cover warm-shadow"
              />
              <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-sage rounded-full flex items-center justify-center">
                <Check className="h-3 w-3 text-white" />
              </div>
            </div>
          )}
          <div className="flex items-center justify-center gap-2 text-muted-foreground text-sm">
            <Volume2 className="h-4 w-4 text-terracotta" />
            <span>Voice: {profileData.voiceName || "Custom Voice"}</span>
          </div>
        </div>
      )}

      <Button
        onClick={() => onComplete?.(profileData!)}
        className="w-full h-14 rounded-2xl text-lg font-display bg-gradient-to-r from-terracotta to-coral hover:from-terracotta/90 hover:to-coral/90 warm-shadow-lg organic-hover"
      >
        Start Video Session
        <ArrowRight className="ml-2 h-5 w-5" />
      </Button>
    </div>
  )

  return (
    <div className="w-full max-w-lg mx-auto">
      {/* Decorative blobs */}
      <div className="fixed top-20 left-5 w-40 h-40 bg-terracotta-light/10 blob animate-float -z-10" />
      <div className="fixed bottom-20 right-5 w-32 h-32 bg-sage-light/20 blob-2 animate-float -z-10" style={{ animationDelay: '2s' }} />

      {/* Card */}
      <div className="glass-card rounded-3xl p-8 warm-shadow-lg">
        {/* Header */}
        <div className="flex items-center gap-3 mb-8">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-terracotta-light to-coral/30 flex items-center justify-center">
            <User className="h-5 w-5 text-terracotta" />
          </div>
          <div>
            <h3 className="font-display text-lg text-deep-brown">Avatar Setup</h3>
            <p className="text-xs text-muted-foreground">Create your digital twin</p>
          </div>
        </div>

        {/* Content */}
        {step === "intro" && renderIntro()}
        {step === "image" && renderImageStep()}
        {step === "voice" && renderVoiceStep()}
        {step === "processing" && renderProcessing()}
        {step === "complete" && renderComplete()}
      </div>
    </div>
  )
}
