"use client"

import { useRef, useEffect, useState, Suspense } from "react"
import { Canvas, useFrame, useLoader } from "@react-three/fiber"
import { OrbitControls, useGLTF, Environment } from "@react-three/drei"
import * as THREE from "three"
import type { VisemeType } from "@/lib/pipecat/client"

// Ready Player Me viseme mapping to morph target names
// RPM avatars use ARKit-compatible blend shapes
const VISEME_TO_MORPH: Record<VisemeType, string[]> = {
  neutral: [],
  aa: ["viseme_aa", "jawOpen"],
  ee: ["viseme_E", "mouthSmile"],
  oo: ["viseme_O", "mouthFunnel"],
  closed: ["viseme_PP", "mouthClose"],
  fv: ["viseme_FF"],
}

// Morph target weights for each viseme
const VISEME_WEIGHTS: Record<VisemeType, number> = {
  neutral: 0,
  aa: 0.8,
  ee: 0.6,
  oo: 0.7,
  closed: 0.5,
  fv: 0.4,
}

interface AvatarModelProps {
  url: string
  viseme: VisemeType
  isSpeaking: boolean
}

function AvatarModel({ url, viseme, isSpeaking }: AvatarModelProps) {
  const { scene } = useGLTF(url)
  const groupRef = useRef<THREE.Group>(null)
  const currentWeights = useRef<Record<string, number>>({})
  const initialized = useRef(false)

  // Get the target weight for a morph target based on current viseme
  const getTargetWeight = (morphName: string): number => {
    if (!isSpeaking) return 0
    const morphNames = VISEME_TO_MORPH[viseme] || []
    const weight = VISEME_WEIGHTS[viseme] || 0
    return morphNames.includes(morphName) ? weight : 0
  }

  // Smooth animation loop - traverse the RENDERED scene directly
  useFrame((_, delta) => {
    const group = groupRef.current
    if (!group) return

    const lerpSpeed = Math.min(12 * delta, 1) // Smooth interpolation

    // Find and animate all skinned meshes with morph targets
    group.traverse((child) => {
      if (!(child instanceof THREE.SkinnedMesh)) return
      if (!child.morphTargetDictionary || !child.morphTargetInfluences) return

      const dict = child.morphTargetDictionary
      const influences = child.morphTargetInfluences

      // Log on first run for debugging
      if (!initialized.current) {
        console.log("Animating mesh:", child.name, "morphs:", Object.keys(dict).slice(0, 10))
      }

      // Apply viseme morph targets
      Object.keys(dict).forEach((morphName) => {
        const idx = dict[morphName]
        if (influences[idx] === undefined) return

        const target = getTargetWeight(morphName)
        const current = currentWeights.current[morphName] ?? 0
        const newValue = THREE.MathUtils.lerp(current, target, lerpSpeed)

        influences[idx] = newValue
        currentWeights.current[morphName] = newValue
      })

      // Add subtle idle blinking when not speaking
      if (!isSpeaking) {
        const time = Date.now() / 1000
        const blink = Math.sin(time * 0.5) > 0.95 ? 1 : 0

        const blinkNames = ["eyeBlinkLeft", "eyeBlink_L", "eyeBlinkRight", "eyeBlink_R"]
        blinkNames.forEach((name) => {
          const idx = dict[name]
          if (idx !== undefined) {
            influences[idx] = blink
          }
        })
      }
    })

    initialized.current = true
  })

  return (
    <group ref={groupRef}>
      <primitive
        object={scene}
        scale={2.2}
        position={[0, -3.1, 0]}
        rotation={[0, 0, 0]}
      />
    </group>
  )
}

// Loading placeholder
function AvatarLoading() {
  return (
    <mesh>
      <sphereGeometry args={[0.5, 32, 32]} />
      <meshStandardMaterial color="#8b5cf6" wireframe />
    </mesh>
  )
}

interface RPMAvatarProps {
  avatarUrl?: string
  viseme: VisemeType
  isSpeaking: boolean
  className?: string
}

// Default Ready Player Me avatar URL (a sample half-body avatar)
const DEFAULT_AVATAR_URL = "https://models.readyplayer.me/64bfa15f0e72c63d7c3934a6.glb?morphTargets=ARKit,Oculus+Visemes"

export function RPMAvatar({
  avatarUrl = DEFAULT_AVATAR_URL,
  viseme,
  isSpeaking,
  className = "",
}: RPMAvatarProps) {
  const [error, setError] = useState<string | null>(null)

  // Ensure avatar URL has morph targets parameter
  const processedUrl = avatarUrl.includes("morphTargets")
    ? avatarUrl
    : `${avatarUrl}${avatarUrl.includes("?") ? "&" : "?"}morphTargets=ARKit,Oculus+Visemes`

  if (error) {
    return (
      <div className={`flex items-center justify-center bg-gradient-to-b from-violet-100 to-purple-100 rounded-2xl ${className}`}>
        <div className="text-center p-4">
          <p className="text-violet-600 font-medium">Avatar Error</p>
          <p className="text-sm text-muted-foreground">{error}</p>
        </div>
      </div>
    )
  }

  return (
    <div className={`relative ${className}`}>
      <Canvas
        camera={{ position: [0, 0.4, 1], fov: 35 }}
        style={{ background: "transparent" }}
        onError={() => setError("Failed to load 3D avatar")}
      >
        <ambientLight intensity={0.6} />
        <directionalLight position={[5, 5, 5]} intensity={0.8} />
        <directionalLight position={[-5, 5, -5]} intensity={0.3} />

        <Suspense fallback={<AvatarLoading />}>
          <AvatarModel
            url={processedUrl}
            viseme={viseme}
            isSpeaking={isSpeaking}
          />
          <Environment preset="apartment" />
        </Suspense>

        <OrbitControls
          enablePan={false}
          enableZoom={false}
          minPolarAngle={Math.PI / 2.5}
          maxPolarAngle={Math.PI / 2}
          target={[0, 0.35, 0]}
        />
      </Canvas>

      {/* Speaking indicator overlay */}
      {isSpeaking && (
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 px-3 py-1.5 bg-violet-500/90 text-white text-sm rounded-full flex items-center gap-2">
          <div className="flex gap-0.5">
            <div className="w-1.5 h-1.5 bg-white rounded-full animate-bounce" />
            <div className="w-1.5 h-1.5 bg-white rounded-full animate-bounce" style={{ animationDelay: "0.1s" }} />
            <div className="w-1.5 h-1.5 bg-white rounded-full animate-bounce" style={{ animationDelay: "0.2s" }} />
          </div>
          Speaking
        </div>
      )}
    </div>
  )
}

// Preload the default avatar
useGLTF.preload(DEFAULT_AVATAR_URL)
