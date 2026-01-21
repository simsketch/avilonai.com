import Link from "next/link"
import { Button } from "@/components/ui/button"
import {
  MessageCircle,
  Video,
  Shield,
  Sparkles,
  Users,
  Mic,
  Upload,
  Play,
  ArrowRight,
  ArrowLeft,
  Check,
  Leaf,
  RefreshCw,
  Clock,
  Zap,
  ChevronRight
} from "lucide-react"

export default function HowItWorks() {
  return (
    <main className="min-h-screen overflow-hidden">
      {/* Decorative background elements */}
      <div className="fixed inset-0 -z-10 gradient-mesh" />
      <div className="fixed top-20 left-[10%] w-72 h-72 bg-terracotta-light/20 blob animate-float -z-10" />
      <div className="fixed top-[60%] right-[5%] w-64 h-64 bg-sage-light/30 blob-2 animate-float -z-10" style={{ animationDelay: '2s' }} />

      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-white/70 backdrop-blur-lg border-b border-border/30">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-terracotta to-coral flex items-center justify-center">
              <Leaf className="w-5 h-5 text-white" />
            </div>
            <span className="font-display text-xl text-deep-brown">Avilon</span>
          </Link>
          <div className="flex items-center gap-4">
            <Link href="/login">
              <Button variant="ghost" className="text-deep-brown hover:bg-soft-sand rounded-xl">
                Sign In
              </Button>
            </Link>
            <Link href="/signup">
              <Button className="bg-gradient-to-r from-terracotta to-coral hover:from-terracotta/90 hover:to-coral/90 rounded-xl warm-shadow">
                Get Started
              </Button>
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="pt-32 pb-16 px-6">
        <div className="max-w-4xl mx-auto text-center">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-muted-foreground hover:text-deep-brown transition-colors mb-8"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to home
          </Link>

          <h1 className="font-display text-4xl md:text-5xl text-deep-brown mb-6">
            How Avilon Works
          </h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Create a digital twin of anyone in minutes. Practice difficult conversations
            until you feel confident. Here's exactly how it works.
          </p>
        </div>
      </section>

      {/* Video Demo Section */}
      <section className="py-12 px-6">
        <div className="max-w-4xl mx-auto">
          <div className="glass-card rounded-3xl p-8 warm-shadow-lg">
            <div className="aspect-video rounded-2xl bg-gradient-to-br from-deep-brown/90 to-deep-brown overflow-hidden relative flex items-center justify-center">
              <div className="text-center text-white/80 space-y-4">
                <div className="w-20 h-20 mx-auto rounded-full bg-white/10 backdrop-blur-sm flex items-center justify-center cursor-pointer hover:bg-white/20 transition-colors group">
                  <Play className="w-8 h-8 ml-1 group-hover:scale-110 transition-transform" />
                </div>
                <p className="font-display text-lg">Watch a 2-minute demo</p>
                <p className="text-sm text-white/60">See Avilon in action</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Time indicator */}
      <section className="py-8 px-6">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center justify-center gap-3 text-muted-foreground">
            <Clock className="w-5 h-5 text-sage" />
            <span className="text-sm">Total setup time: <strong className="text-deep-brown">Under 2 minutes</strong></span>
          </div>
        </div>
      </section>

      {/* Step 1 */}
      <section className="py-16 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div className="space-y-6">
              <div className="inline-flex items-center gap-2 px-4 py-2 bg-terracotta/10 rounded-full">
                <span className="w-6 h-6 rounded-full bg-gradient-to-r from-terracotta to-coral text-white text-sm font-medium flex items-center justify-center">1</span>
                <span className="text-terracotta font-medium">Upload Their Photo</span>
              </div>

              <h2 className="font-display text-3xl text-deep-brown">
                Start with a single photo
              </h2>

              <p className="text-muted-foreground text-lg">
                Upload any clear, front-facing photo of the person you want to practice
                talking to. This could be your partner, parent, boss, or anyone else.
              </p>

              <div className="space-y-3">
                {[
                  "Works with any standard photo (JPG, PNG)",
                  "Best results with clear, well-lit images",
                  "Face should be clearly visible",
                  "One photo is all you need"
                ].map((item, index) => (
                  <div key={index} className="flex items-start gap-3">
                    <div className="w-5 h-5 rounded-full bg-sage/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <Check className="w-3 h-3 text-sage" />
                    </div>
                    <span className="text-deep-brown text-sm">{item}</span>
                  </div>
                ))}
              </div>

              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Zap className="w-4 h-4 text-coral" />
                <span>Takes about <strong>10 seconds</strong></span>
              </div>
            </div>

            <div className="relative">
              <div className="glass-card rounded-3xl p-8 warm-shadow">
                <div className="border-2 border-dashed border-border rounded-2xl p-12 text-center space-y-4 hover:border-terracotta/40 hover:bg-terracotta-light/5 transition-all cursor-pointer">
                  <div className="w-16 h-16 mx-auto rounded-2xl bg-gradient-to-br from-terracotta-light/30 to-coral/20 flex items-center justify-center">
                    <Upload className="w-8 h-8 text-terracotta/60" />
                  </div>
                  <div>
                    <p className="font-medium text-deep-brown">Drop photo here</p>
                    <p className="text-sm text-muted-foreground">or click to browse</p>
                  </div>
                </div>
                <div className="mt-4 flex items-center gap-3">
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-sage-light to-sage/30 flex items-center justify-center">
                    <Users className="w-6 h-6 text-sage" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-deep-brown">mom_photo.jpg</p>
                    <p className="text-xs text-muted-foreground">Uploaded successfully</p>
                  </div>
                  <Check className="w-5 h-5 text-sage" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Connector */}
      <div className="flex justify-center py-4">
        <div className="w-px h-16 bg-gradient-to-b from-terracotta/30 to-sage/30" />
      </div>

      {/* Step 2 */}
      <section className="py-16 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div className="order-2 lg:order-1 relative">
              <div className="glass-card rounded-3xl p-8 warm-shadow">
                <div className="space-y-6">
                  <div className="flex items-center gap-4">
                    <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-coral/20 to-terracotta-light/30 flex items-center justify-center">
                      <Mic className="w-8 h-8 text-coral" />
                    </div>
                    <div>
                      <p className="font-medium text-deep-brown">Voice Sample</p>
                      <p className="text-sm text-muted-foreground">10-30 seconds of audio</p>
                    </div>
                  </div>

                  {/* Waveform visualization */}
                  <div className="bg-soft-sand/50 rounded-xl p-4">
                    <div className="flex items-center gap-3 mb-3">
                      <div className="w-8 h-8 rounded-full bg-coral flex items-center justify-center">
                        <Play className="w-4 h-4 text-white ml-0.5" />
                      </div>
                      <div className="flex-1 flex items-end gap-0.5 h-8">
                        {[...Array(40)].map((_, i) => (
                          <div
                            key={i}
                            className="flex-1 bg-coral/40 rounded-full"
                            style={{ height: `${20 + Math.sin(i * 0.3) * 15 + Math.random() * 10}px` }}
                          />
                        ))}
                      </div>
                      <span className="text-xs text-muted-foreground">0:18</span>
                    </div>
                  </div>

                  <div className="flex gap-3">
                    <Button variant="outline" className="flex-1 rounded-xl">
                      <Upload className="w-4 h-4 mr-2" />
                      Upload File
                    </Button>
                    <Button className="flex-1 rounded-xl bg-gradient-to-r from-terracotta to-coral">
                      <Mic className="w-4 h-4 mr-2" />
                      Record
                    </Button>
                  </div>
                </div>
              </div>
            </div>

            <div className="order-1 lg:order-2 space-y-6">
              <div className="inline-flex items-center gap-2 px-4 py-2 bg-sage/10 rounded-full">
                <span className="w-6 h-6 rounded-full bg-gradient-to-r from-sage to-sage-light text-white text-sm font-medium flex items-center justify-center">2</span>
                <span className="text-sage font-medium">Add Their Voice</span>
              </div>

              <h2 className="font-display text-3xl text-deep-brown">
                Clone their voice with a short sample
              </h2>

              <p className="text-muted-foreground text-lg">
                Upload a voice memo, video clip, or any audio of them speaking.
                Our AI learns their unique voice patterns and speech style.
              </p>

              <div className="space-y-3">
                {[
                  "10-30 seconds of clear speech",
                  "Can use a voicemail, video clip, or voice note",
                  "AI captures tone, pacing, and speech patterns",
                  "Works with most audio/video formats"
                ].map((item, index) => (
                  <div key={index} className="flex items-start gap-3">
                    <div className="w-5 h-5 rounded-full bg-sage/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <Check className="w-3 h-3 text-sage" />
                    </div>
                    <span className="text-deep-brown text-sm">{item}</span>
                  </div>
                ))}
              </div>

              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Zap className="w-4 h-4 text-coral" />
                <span>Processing takes about <strong>30 seconds</strong></span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Connector */}
      <div className="flex justify-center py-4">
        <div className="w-px h-16 bg-gradient-to-b from-sage/30 to-coral/30" />
      </div>

      {/* Step 3 */}
      <section className="py-16 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div className="space-y-6">
              <div className="inline-flex items-center gap-2 px-4 py-2 bg-coral/10 rounded-full">
                <span className="w-6 h-6 rounded-full bg-gradient-to-r from-coral to-terracotta text-white text-sm font-medium flex items-center justify-center">3</span>
                <span className="text-coral font-medium">Start Rehearsing</span>
              </div>

              <h2 className="font-display text-3xl text-deep-brown">
                Practice the conversation
              </h2>

              <p className="text-muted-foreground text-lg">
                Now comes the magic. Have a real-time video conversation with their
                digital twin. Say what you need to say, hear how they might respond,
                and keep practicing until you feel ready.
              </p>

              <div className="space-y-3">
                {[
                  "Real-time video with lip-synced responses",
                  "AI generates realistic responses based on context",
                  "Retry as many times as you need",
                  "Get optional communication tips and suggestions"
                ].map((item, index) => (
                  <div key={index} className="flex items-start gap-3">
                    <div className="w-5 h-5 rounded-full bg-sage/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <Check className="w-3 h-3 text-sage" />
                    </div>
                    <span className="text-deep-brown text-sm">{item}</span>
                  </div>
                ))}
              </div>

              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <RefreshCw className="w-4 h-4 text-coral" />
                <span><strong>Unlimited retries</strong> on all plans</span>
              </div>
            </div>

            <div className="relative">
              <div className="glass-card rounded-3xl p-6 warm-shadow-lg">
                <div className="aspect-[4/3] rounded-2xl bg-gradient-to-br from-deep-brown/90 to-deep-brown overflow-hidden relative">
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="text-center text-white/80 space-y-3">
                      <div className="w-20 h-20 mx-auto rounded-full bg-gradient-to-br from-terracotta to-coral flex items-center justify-center animate-breathe">
                        <Video className="w-9 h-9" />
                      </div>
                      <p className="font-display">Live Conversation</p>
                    </div>
                  </div>

                  {/* Waveform at bottom */}
                  <div className="absolute bottom-4 left-4 right-4 flex items-end justify-center gap-1 h-8">
                    {[...Array(25)].map((_, i) => (
                      <div
                        key={i}
                        className="w-1 bg-coral/60 rounded-full animate-pulse"
                        style={{
                          height: `${12 + Math.sin(i * 0.4) * 10 + Math.random() * 8}px`,
                          animationDelay: `${i * 0.05}s`
                        }}
                      />
                    ))}
                  </div>
                </div>

                {/* Controls */}
                <div className="mt-4 flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">Practice attempt #3</span>
                  <div className="flex gap-2">
                    <Button size="sm" variant="outline" className="rounded-xl text-xs">
                      <RefreshCw className="w-3 h-3 mr-1" />
                      Retry
                    </Button>
                    <Button size="sm" className="rounded-xl text-xs bg-gradient-to-r from-terracotta to-coral">
                      <Mic className="w-3 h-3 mr-1" />
                      Speak
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section className="py-24 px-6 bg-gradient-to-b from-soft-sand/50 to-transparent">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="font-display text-3xl text-deep-brown mb-4">
              What makes it feel real
            </h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Our AI doesn't just generate random responses. It creates a believable
              simulation based on the context you provide.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              {
                icon: <Video className="w-6 h-6" />,
                title: "Lip-Synced Video",
                description: "Responses are delivered as realistic video with accurate lip movements"
              },
              {
                icon: <Mic className="w-6 h-6" />,
                title: "Cloned Voice",
                description: "Hear responses in their actual voice, with their speech patterns"
              },
              {
                icon: <Sparkles className="w-6 h-6" />,
                title: "Personality Context",
                description: "Tell us about them, and the AI adapts its responses accordingly"
              },
              {
                icon: <Shield className="w-6 h-6" />,
                title: "100% Private",
                description: "Your conversations and uploaded media are never shared"
              }
            ].map((feature, index) => (
              <div key={index} className="glass-card rounded-2xl p-6 text-center">
                <div className="w-12 h-12 mx-auto rounded-xl bg-gradient-to-br from-terracotta-light/30 to-coral/20 flex items-center justify-center text-terracotta mb-4">
                  {feature.icon}
                </div>
                <h3 className="font-display text-lg text-deep-brown mb-2">{feature.title}</h3>
                <p className="text-sm text-muted-foreground">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section className="py-24 px-6">
        <div className="max-w-3xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="font-display text-3xl text-deep-brown mb-4">
              Common Questions
            </h2>
          </div>

          <div className="space-y-4">
            {[
              {
                q: "How realistic are the responses?",
                a: "The AI generates responses based on the personality context you provide. While it can't perfectly predict what someone will say, it creates believable responses that help you prepare for different scenarios."
              },
              {
                q: "What if I don't have an audio sample of them?",
                a: "You can describe their voice characteristics and we'll generate a similar-sounding voice. However, for best results, even a short voicemail or video clip works great."
              },
              {
                q: "Is my data private?",
                a: "Absolutely. Your uploaded photos, audio, and conversations are encrypted and never shared. You can delete all your data at any time."
              },
              {
                q: "Can I practice multiple conversations with different people?",
                a: "Yes! You can create multiple digital twins for different people in your life—your partner, parents, boss, etc."
              },
              {
                q: "What's included in the free tier?",
                a: "The free tier includes 5 practice sessions per month with one digital twin. Paid plans offer unlimited sessions and multiple twins."
              }
            ].map((faq, index) => (
              <div key={index} className="glass-card rounded-2xl p-6">
                <h3 className="font-display text-lg text-deep-brown mb-2">{faq.q}</h3>
                <p className="text-muted-foreground">{faq.a}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-24 px-6">
        <div className="max-w-4xl mx-auto">
          <div className="glass-card rounded-3xl p-12 md:p-16 warm-shadow-lg text-center relative overflow-hidden">
            <div className="absolute top-0 right-0 w-64 h-64 bg-terracotta-light/20 blob -z-10" />
            <div className="absolute bottom-0 left-0 w-48 h-48 bg-sage-light/30 blob-2 -z-10" />

            <div className="relative space-y-6">
              <div className="w-16 h-16 mx-auto rounded-2xl bg-gradient-to-br from-terracotta to-coral flex items-center justify-center animate-breathe-slow">
                <MessageCircle className="w-8 h-8 text-white" />
              </div>
              <h2 className="font-display text-3xl md:text-4xl text-deep-brown">
                Ready to practice?
              </h2>
              <p className="text-muted-foreground max-w-xl mx-auto text-lg">
                Create your first digital twin in under 2 minutes.
                No credit card required.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center pt-4">
                <Link href="/signup">
                  <Button size="lg" className="w-full sm:w-auto h-14 px-10 text-lg font-display bg-gradient-to-r from-terracotta to-coral hover:from-terracotta/90 hover:to-coral/90 rounded-2xl warm-shadow-lg organic-hover">
                    Get Started Free
                    <ArrowRight className="ml-2 h-5 w-5" />
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 px-6 border-t border-border/30">
        <div className="max-w-6xl mx-auto">
          <div className="flex flex-col md:flex-row justify-between items-center gap-6">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-terracotta to-coral flex items-center justify-center">
                <Leaf className="w-4 h-4 text-white" />
              </div>
              <span className="font-display text-lg text-deep-brown">Avilon</span>
            </div>
            <div className="flex gap-8 text-sm text-muted-foreground">
              <Link href="/privacy" className="hover:text-deep-brown transition-colors">Privacy</Link>
              <Link href="/terms" className="hover:text-deep-brown transition-colors">Terms</Link>
              <Link href="/support" className="hover:text-deep-brown transition-colors">Support</Link>
            </div>
            <p className="text-sm text-muted-foreground">
              © 2025 Avilon. All rights reserved.
            </p>
          </div>
        </div>
      </footer>
    </main>
  )
}
