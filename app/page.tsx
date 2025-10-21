import Link from "next/link"
import { Button } from "@/components/ui/button"

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-24 bg-gradient-to-b from-blue-50 to-white">
      <div className="text-center space-y-6 max-w-2xl">
        <h1 className="text-6xl font-bold text-blue-600">Avilon</h1>
        <p className="text-2xl text-gray-700">Your AI Therapy Companion</p>
        <p className="text-lg text-gray-600">
          A safe, supportive space for mental wellness. Avilon uses evidence-based
          cognitive behavioral therapy (CBT) techniques to support your mental health journey.
        </p>
        <div className="flex gap-4 justify-center pt-6">
          <Link href="/signup">
            <Button size="lg" className="text-lg px-8">
              Get Started
            </Button>
          </Link>
          <Link href="/login">
            <Button size="lg" variant="outline" className="text-lg px-8">
              Sign In
            </Button>
          </Link>
        </div>
        <div className="pt-8 text-sm text-gray-500">
          <p className="font-semibold mb-2">Important Notice:</p>
          <p>
            Avilon is not a replacement for professional mental health care.
            If you're in crisis, please call 988 (Suicide & Crisis Lifeline) or go to your nearest emergency room.
          </p>
        </div>
      </div>
    </main>
  )
}
