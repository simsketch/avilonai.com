"use client"

import { useEffect, useState } from "react"
import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { formatDistanceToNow, format } from "date-fns"
import Link from "next/link"
import { MessageSquare, TrendingUp, FileText, AlertCircle, Clock, ArrowRight } from "lucide-react"
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts"

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
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
      <header className="bg-white/80 backdrop-blur-md border-b border-slate-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">Avilon</h1>
          <div className="flex items-center gap-4">
            <span className="text-sm text-slate-600">
              {session?.user?.email}
            </span>
            <Button variant="outline" onClick={() => router.push("/api/auth/signout")} className="hover:bg-slate-50 transition-colors">
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
          <Card className="shadow-md hover:shadow-lg transition-all duration-300 border-slate-200 bg-gradient-to-br from-white to-blue-50">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-slate-700">
                Recent Mood
              </CardTitle>
              <div className="p-2 bg-blue-100 rounded-lg">
                <TrendingUp className="h-4 w-4 text-blue-600" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                {recentMoodScore ? `${recentMoodScore}/10` : "N/A"}
              </div>
              <p className="text-xs text-slate-600 mt-1">
                Average: {avgMoodScore}
              </p>
            </CardContent>
          </Card>

          <Card className="shadow-md hover:shadow-lg transition-all duration-300 border-slate-200 bg-gradient-to-br from-white to-indigo-50">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-slate-700">
                Total Sessions
              </CardTitle>
              <div className="p-2 bg-indigo-100 rounded-lg">
                <MessageSquare className="h-4 w-4 text-indigo-600" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">{data.sessions.length}</div>
              <p className="text-xs text-slate-600 mt-1">
                Therapy conversations
              </p>
            </CardContent>
          </Card>

          <Card className="shadow-md hover:shadow-lg transition-all duration-300 border-slate-200 bg-gradient-to-br from-white to-purple-50">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-slate-700">
                Session Notes
              </CardTitle>
              <div className="p-2 bg-purple-100 rounded-lg">
                <FileText className="h-4 w-4 text-purple-600" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">{data.notes.length}</div>
              <p className="text-xs text-slate-600 mt-1">
                Saved summaries
              </p>
            </CardContent>
          </Card>
        </div>

        {data.moodTrend.length > 0 && (
          <Card className="shadow-md hover:shadow-lg transition-shadow">
            <CardHeader>
              <CardTitle>Mood Trend</CardTitle>
              <CardDescription>
                Your mood scores over recent sessions
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <AreaChart
                  data={data.moodTrend.slice(0, 14).reverse().map((item, index) => ({
                    name: format(new Date(item.date), "MMM d"),
                    mood: item.score,
                    index: index + 1
                  }))}
                  margin={{ top: 10, right: 30, left: 0, bottom: 0 }}
                >
                  <defs>
                    <linearGradient id="colorMood" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.8}/>
                      <stop offset="95%" stopColor="#6366f1" stopOpacity={0.1}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis
                    dataKey="name"
                    stroke="#64748b"
                    tick={{ fill: '#64748b', fontSize: 12 }}
                  />
                  <YAxis
                    domain={[0, 10]}
                    stroke="#64748b"
                    tick={{ fill: '#64748b', fontSize: 12 }}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'white',
                      border: '1px solid #e2e8f0',
                      borderRadius: '8px',
                      boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
                    }}
                    labelStyle={{ color: '#1e293b', fontWeight: 600 }}
                    formatter={(value: number | undefined) => [`${value ?? 0}/10`, 'Mood']}
                  />
                  <Area
                    type="monotone"
                    dataKey="mood"
                    stroke="#3b82f6"
                    strokeWidth={3}
                    fillOpacity={1}
                    fill="url(#colorMood)"
                    animationDuration={1000}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        )}

        <Card className="shadow-md hover:shadow-lg transition-shadow">
          <CardHeader>
            <CardTitle>Recent Sessions</CardTitle>
            <CardDescription>
              Your therapy session history
            </CardDescription>
          </CardHeader>
          <CardContent>
            {data.sessions.length === 0 ? (
              <p className="text-slate-500 text-center py-8">
                No sessions yet. Start your first session!
              </p>
            ) : (
              <div className="space-y-3">
                {data.sessions.slice(0, 5).map((session) => (
                  <Link key={session.id} href={`/chat?sessionId=${session.id}`}>
                    <div className="group flex items-center justify-between p-4 border border-slate-200 rounded-xl hover:bg-gradient-to-r hover:from-blue-50 hover:to-indigo-50 hover:border-blue-300 transition-all duration-300 cursor-pointer">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <div className="p-2 bg-blue-100 rounded-lg group-hover:bg-blue-200 transition-colors">
                            <MessageSquare className="h-4 w-4 text-blue-600" />
                          </div>
                          <span className="font-semibold text-slate-800">
                            {session.session_type === "quick_checkin"
                              ? "Quick Check-in"
                              : session.session_type === "emotional_conversation"
                              ? "Emotional Conversation"
                              : "Guided CBT"}
                          </span>
                          {session.mood_score && (
                            <span className="px-2 py-1 bg-slate-100 text-sm text-slate-700 rounded-full">
                              Mood: {session.mood_score}/10
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-2 text-sm text-slate-500">
                          <Clock className="h-3 w-3" />
                          <span>{formatDistanceToNow(new Date(session.created_at), { addSuffix: true })}</span>
                        </div>
                      </div>
                      <ArrowRight className="h-5 w-5 text-slate-400 group-hover:text-blue-600 group-hover:translate-x-1 transition-all" />
                    </div>
                  </Link>
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
