"use client"

import { useEffect, useState } from "react"
import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { format } from "date-fns"
import Link from "next/link"
import { MessageSquare, TrendingUp, FileText, AlertCircle } from "lucide-react"

interface DashboardData {
  profile: any
  sessions: any[]
  notes: any[]
  moodTrend: Array<{ date: string; score: number }>
}

export default function DashboardPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [data, setData] = useState<DashboardData | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login")
    }
  }, [status, router])

  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await fetch("/api/dashboard")
        if (!response.ok) throw new Error("Failed to fetch data")
        const dashboardData = await response.json()
        setData(dashboardData)
      } catch (error) {
        console.error("Error fetching dashboard data:", error)
      } finally {
        setIsLoading(false)
      }
    }

    if (status === "authenticated") {
      fetchData()
    }
  }, [status])

  if (status === "loading" || isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto" />
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    )
  }

  if (!data?.profile) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <Card className="max-w-md">
          <CardHeader>
            <CardTitle>Welcome to Avilon!</CardTitle>
            <CardDescription>
              Before we begin, let's complete your intake assessment.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Link href="/intake">
              <Button className="w-full">Complete Intake</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    )
  }

  const avgMoodScore =
    data.moodTrend.length > 0
      ? (
          data.moodTrend.reduce((sum, item) => sum + item.score, 0) /
          data.moodTrend.length
        ).toFixed(1)
      : "N/A"

  const recentMoodScore =
    data.moodTrend.length > 0 ? data.moodTrend[0].score : null

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <h1 className="text-2xl font-bold text-blue-600">Avilon</h1>
          <div className="flex items-center gap-4">
            <span className="text-sm text-gray-600">
              {session?.user?.email}
            </span>
            <Button variant="outline" onClick={() => router.push("/api/auth/signout")}>
              Sign Out
            </Button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-3xl font-bold">
              Welcome back, {data.profile.name}
            </h2>
            <p className="text-gray-600 mt-1">
              How can I support you today?
            </p>
          </div>
          <Link href="/chat">
            <Button size="lg">
              <MessageSquare className="mr-2 h-4 w-4" />
              Start New Session
            </Button>
          </Link>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">
                Recent Mood
              </CardTitle>
              <TrendingUp className="h-4 w-4 text-gray-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {recentMoodScore ? `${recentMoodScore}/10` : "N/A"}
              </div>
              <p className="text-xs text-gray-600 mt-1">
                Average: {avgMoodScore}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">
                Total Sessions
              </CardTitle>
              <MessageSquare className="h-4 w-4 text-gray-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{data.sessions.length}</div>
              <p className="text-xs text-gray-600 mt-1">
                Therapy conversations
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">
                Session Notes
              </CardTitle>
              <FileText className="h-4 w-4 text-gray-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{data.notes.length}</div>
              <p className="text-xs text-gray-600 mt-1">
                Saved summaries
              </p>
            </CardContent>
          </Card>
        </div>

        {data.moodTrend.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Mood Trend</CardTitle>
              <CardDescription>
                Your mood scores over recent sessions
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-48 flex items-end justify-between gap-2">
                {data.moodTrend.slice(0, 10).reverse().map((item, index) => (
                  <div
                    key={index}
                    className="flex-1 flex flex-col items-center"
                  >
                    <div
                      className="w-full bg-blue-500 rounded-t"
                      style={{ height: `${(item.score / 10) * 100}%` }}
                    />
                    <span className="text-xs text-gray-600 mt-1">
                      {item.score}
                    </span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader>
            <CardTitle>Recent Sessions</CardTitle>
            <CardDescription>
              Your therapy session history
            </CardDescription>
          </CardHeader>
          <CardContent>
            {data.sessions.length === 0 ? (
              <p className="text-gray-500 text-center py-8">
                No sessions yet. Start your first session!
              </p>
            ) : (
              <div className="space-y-4">
                {data.sessions.slice(0, 5).map((session) => (
                  <div
                    key={session.id}
                    className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50"
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">
                          {session.session_type === "quick_checkin"
                            ? "Quick Check-in"
                            : "Guided CBT"}
                        </span>
                        {session.mood_score && (
                          <span className="text-sm text-gray-600">
                            Mood: {session.mood_score}/10
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-gray-500">
                        {format(new Date(session.created_at), "PPp")}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="bg-blue-50 border-blue-200">
          <CardHeader>
            <div className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-blue-600" />
              <CardTitle className="text-blue-900">Crisis Support</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="text-sm text-blue-900">
            <p className="mb-2">
              If you're experiencing a mental health crisis:
            </p>
            <ul className="space-y-1 ml-4">
              <li>Call 988 - Suicide & Crisis Lifeline</li>
              <li>Text "HELLO" to 741741 - Crisis Text Line</li>
              <li>Go to your nearest emergency room</li>
            </ul>
          </CardContent>
        </Card>
      </main>
    </div>
  )
}
