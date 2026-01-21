import Link from "next/link"
import { Button } from "@/components/ui/button"
import {
  MessageCircle,
  Video,
  Shield,
  Sparkles,
  Brain,
  Heart,
  Users,
  Mic,
  Play,
  ArrowRight,
  Check,
  Leaf,
  RefreshCw
} from "lucide-react"

export default function Home() {
  return (
    <main className="min-h-screen overflow-hidden">
      {/* Decorative background elements */}
      <div className="fixed inset-0 -z-10 gradient-mesh" />
      <div className="fixed top-20 left-[10%] w-72 h-72 bg-terracotta-light/20 blob animate-float -z-10" />
      <div className="fixed top-[40%] right-[5%] w-64 h-64 bg-sage-light/30 blob-2 animate-float -z-10" style={{ animationDelay: '2s' }} />
      <div className="fixed bottom-[20%] left-[15%] w-48 h-48 bg-coral/15 blob animate-float -z-10" style={{ animationDelay: '4s' }} />

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

      {/* Hero Section */}
      <section className="pt-32 pb-20 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div className="space-y-8">
              <div className="inline-flex items-center gap-2 px-4 py-2 bg-sage-light/30 rounded-full text-sage text-sm font-medium">
                <Sparkles className="w-4 h-4" />
                AI Conversation Rehearsal
              </div>

              <h1 className="font-display text-4xl md:text-5xl lg:text-6xl text-deep-brown leading-tight">
                Practice the conversation
                <span className="text-gradient"> before it happens</span>
              </h1>

              <p className="text-lg text-muted-foreground max-w-lg">
                Create a digital twin of your partner, parent, boss, or anyone you need
                to talk to. Rehearse difficult conversations in a safe space before
                having them for real.
              </p>

              <div className="flex flex-col sm:flex-row gap-4">
                <Link href="/signup">
                  <Button size="lg" className="w-full sm:w-auto h-14 px-8 text-lg font-display bg-gradient-to-r from-terracotta to-coral hover:from-terracotta/90 hover:to-coral/90 rounded-2xl warm-shadow-lg organic-hover">
                    Start Practicing
                    <ArrowRight className="ml-2 h-5 w-5" />
                  </Button>
                </Link>
                <Button size="lg" variant="outline" className="w-full sm:w-auto h-14 px-8 text-lg rounded-2xl border-border/50 hover:bg-soft-sand">
                  <Play className="mr-2 h-5 w-5" />
                  See How It Works
                </Button>
              </div>

              <div className="flex items-center gap-6 pt-4">
                <div className="flex -space-x-3">
                  {[1, 2, 3, 4].map((i) => (
                    <div
                      key={i}
                      className="w-10 h-10 rounded-full bg-gradient-to-br from-sage-light to-terracotta-light border-2 border-white"
                    />
                  ))}
                </div>
                <p className="text-sm text-muted-foreground">
                  <span className="font-semibold text-deep-brown">2,500+</span> conversations practiced
                </p>
              </div>
            </div>

            {/* Hero Visual */}
            <div className="relative">
              <div className="glass-card rounded-3xl p-8 warm-shadow-lg">
                <div className="aspect-square rounded-2xl bg-gradient-to-br from-deep-brown/90 to-deep-brown overflow-hidden relative">
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="text-center text-white/80 space-y-4">
                      <div className="w-24 h-24 mx-auto rounded-full bg-gradient-to-br from-terracotta to-coral flex items-center justify-center animate-breathe">
                        <Video className="w-10 h-10" />
                      </div>
                      <p className="font-display text-lg">Their Digital Twin</p>
                      <p className="text-sm text-white/60">Looks & sounds like them</p>
                    </div>
                  </div>
                  {/* Decorative waveform */}
                  <div className="absolute bottom-6 left-6 right-6 flex items-end justify-center gap-1 h-12">
                    {[...Array(20)].map((_, i) => (
                      <div
                        key={i}
                        className="w-1.5 bg-coral/60 rounded-full animate-pulse"
                        style={{
                          height: `${20 + Math.sin(i * 0.5) * 15 + Math.random() * 10}px`,
                          animationDelay: `${i * 0.1}s`
                        }}
                      />
                    ))}
                  </div>
                </div>
              </div>
              {/* Floating badges */}
              <div className="absolute -top-4 -right-4 glass-card rounded-2xl px-4 py-3 warm-shadow animate-float">
                <div className="flex items-center gap-2">
                  <Mic className="w-5 h-5 text-terracotta" />
                  <span className="text-sm font-medium text-deep-brown">Voice Cloning</span>
                </div>
              </div>
              <div className="absolute -bottom-4 -left-4 glass-card rounded-2xl px-4 py-3 warm-shadow animate-float" style={{ animationDelay: '1s' }}>
                <div className="flex items-center gap-2">
                  <RefreshCw className="w-5 h-5 text-sage" />
                  <span className="text-sm font-medium text-deep-brown">Unlimited Retries</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Use Case Pills */}
      <section className="py-12 border-y border-border/30 bg-white/50 backdrop-blur-sm">
        <div className="max-w-6xl mx-auto px-6">
          <p className="text-center text-muted-foreground mb-8">Practice conversations with anyone</p>
          <div className="flex flex-wrap justify-center items-center gap-4">
            {['Partner', 'Parent', 'Boss', 'Ex', 'Therapist', 'Friend', 'Sibling', 'Colleague'].map((item) => (
              <span key={item} className="px-5 py-2 rounded-full bg-soft-sand/70 font-medium text-deep-brown text-sm">{item}</span>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="py-24 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="font-display text-3xl md:text-4xl text-deep-brown mb-4">
              How It Works
            </h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Create their digital twin in minutes. Practice as many times as you need.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {[
              {
                step: "01",
                icon: <Users className="w-7 h-7" />,
                title: "Upload Their Photo",
                description: "A single photo of the person you want to practice talking to. That's all we need."
              },
              {
                step: "02",
                icon: <Mic className="w-7 h-7" />,
                title: "Add Their Voice",
                description: "Upload a short audio clip or video. Our AI learns their unique voice and speech patterns."
              },
              {
                step: "03",
                icon: <MessageCircle className="w-7 h-7" />,
                title: "Start Rehearsing",
                description: "Have the conversation. Get their likely responses. Retry until you feel confident."
              }
            ].map((item, index) => (
              <div key={index} className="relative">
                <div className="glass-card rounded-3xl p-8 h-full warm-shadow hover:warm-shadow-lg transition-all duration-300 group">
                  <div className="absolute -top-4 left-8 px-3 py-1 bg-gradient-to-r from-terracotta to-coral text-white text-sm font-medium rounded-full">
                    Step {item.step}
                  </div>
                  <div className="pt-4 space-y-4">
                    <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-sage-light/50 to-sage/30 flex items-center justify-center text-sage group-hover:scale-110 transition-transform">
                      {item.icon}
                    </div>
                    <h3 className="font-display text-xl text-deep-brown">{item.title}</h3>
                    <p className="text-muted-foreground">{item.description}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-24 px-6 bg-gradient-to-b from-soft-sand/50 to-transparent">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="font-display text-3xl md:text-4xl text-deep-brown mb-4">
              More Than a Roleplay
            </h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Avilon uses advanced AI to simulate realistic responses based on
              personality patterns—so you can truly prepare.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[
              {
                icon: <Brain className="w-6 h-6" />,
                title: "Realistic Responses",
                description: "AI generates responses based on personality context you provide. It feels like talking to them.",
                color: "terracotta"
              },
              {
                icon: <RefreshCw className="w-6 h-6" />,
                title: "Practice Until Ready",
                description: "Retry the conversation as many times as you need. Find the words that work.",
                color: "coral"
              },
              {
                icon: <Heart className="w-6 h-6" />,
                title: "Emotional Preparation",
                description: "Process your feelings before the real conversation. Reduce anxiety and surprises.",
                color: "sage"
              },
              {
                icon: <Shield className="w-6 h-6" />,
                title: "Complete Privacy",
                description: "Your conversations and uploaded media stay completely private. We never share or sell data.",
                color: "sage"
              },
              {
                icon: <Video className="w-6 h-6" />,
                title: "Real-Time Video",
                description: "Lip-synced video responses make it feel like a real face-to-face conversation.",
                color: "terracotta"
              },
              {
                icon: <Sparkles className="w-6 h-6" />,
                title: "Communication Tips",
                description: "Get optional guidance on healthy communication patterns and de-escalation techniques.",
                color: "coral"
              }
            ].map((feature, index) => (
              <div
                key={index}
                className="glass-card rounded-2xl p-6 hover:warm-shadow transition-all duration-300 group"
              >
                <div className={`w-12 h-12 rounded-xl bg-${feature.color}/10 flex items-center justify-center text-${feature.color} mb-4 group-hover:scale-110 transition-transform`}>
                  {feature.icon}
                </div>
                <h3 className="font-display text-lg text-deep-brown mb-2">{feature.title}</h3>
                <p className="text-sm text-muted-foreground">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Use Cases */}
      <section className="py-24 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            <div className="space-y-8">
              <h2 className="font-display text-3xl md:text-4xl text-deep-brown">
                Prepare for the conversations
                <span className="text-gradient"> that matter most</span>
              </h2>
              <p className="text-muted-foreground text-lg">
                Some conversations are too important to wing. Practice first,
                so you can show up as your best self when it counts.
              </p>

              <div className="space-y-4">
                {[
                  "Tell your partner something difficult",
                  "Set boundaries with a parent",
                  "Ask your boss for a raise or promotion",
                  "Reconnect with an estranged family member",
                  "Navigate a conflict with a friend",
                  "Prepare for a tough breakup conversation"
                ].map((item, index) => (
                  <div key={index} className="flex items-start gap-3">
                    <div className="w-6 h-6 rounded-full bg-sage/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <Check className="w-4 h-4 text-sage" />
                    </div>
                    <span className="text-deep-brown">{item}</span>
                  </div>
                ))}
              </div>

              <Link href="/signup">
                <Button size="lg" className="h-14 px-8 text-lg font-display bg-gradient-to-r from-terracotta to-coral hover:from-terracotta/90 hover:to-coral/90 rounded-2xl warm-shadow organic-hover">
                  Try It Free
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Button>
              </Link>
            </div>

            <div className="relative">
              <div className="glass-card rounded-3xl p-6 warm-shadow-lg">
                <div className="space-y-4">
                  {/* Sample conversation */}
                  <div className="flex gap-3">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-terracotta to-coral flex-shrink-0 flex items-center justify-center text-white text-xs font-medium">You</div>
                    <div className="glass-card rounded-2xl rounded-tl-md p-4 flex-1">
                      <p className="text-sm text-deep-brown">
                        "Mom, I need to talk to you about something. I've decided to move across the country for this job opportunity."
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-3 justify-end">
                    <div className="bg-gradient-to-br from-sage-light to-sage/30 rounded-2xl rounded-tr-md p-4 max-w-[80%]">
                      <p className="text-sm text-deep-brown">
                        "What? You're leaving? But what about the holidays? I thought you were happy here. Is this about what I said last week?"
                      </p>
                    </div>
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-sage to-sage-light flex-shrink-0 flex items-center justify-center text-white text-xs font-medium">Mom</div>
                  </div>
                  <div className="flex gap-3">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-terracotta to-coral flex-shrink-0 flex items-center justify-center text-white text-xs font-medium">You</div>
                    <div className="glass-card rounded-2xl rounded-tl-md p-4 flex-1">
                      <p className="text-sm text-deep-brown">
                        "This isn't about that. I love you, and we'll still see each other. This is just something I need to do for myself..."
                      </p>
                    </div>
                  </div>
                </div>
                <div className="mt-4 pt-4 border-t border-border/30 flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">Practice attempt #3</span>
                  <Button size="sm" variant="ghost" className="text-terracotta text-xs">
                    <RefreshCw className="w-3 h-3 mr-1" />
                    Try a different approach
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="py-24 px-6 bg-gradient-to-b from-transparent to-soft-sand/50">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="font-display text-3xl md:text-4xl text-deep-brown mb-4">
              Real Stories
            </h2>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            {[
              {
                quote: "I practiced telling my dad about my career change for a week before doing it for real. When the moment came, I felt so much more prepared. The conversation went better than I ever expected.",
                author: "Michael R.",
                role: "Marketing Director"
              },
              {
                quote: "Used this before a difficult conversation with my partner about our future. Being able to hear how my words might land helped me find a gentler approach.",
                author: "Sarah K.",
                role: "Teacher"
              },
              {
                quote: "I was dreading asking for a raise. After practicing with my boss's 'twin,' I walked in confident. Got the raise, plus a title bump.",
                author: "James T.",
                role: "Software Engineer"
              }
            ].map((testimonial, index) => (
              <div key={index} className="glass-card rounded-3xl p-8 warm-shadow">
                <div className="flex gap-1 mb-4">
                  {[...Array(5)].map((_, i) => (
                    <div key={i} className="w-5 h-5 rounded-full bg-coral/80" />
                  ))}
                </div>
                <p className="text-deep-brown mb-6 leading-relaxed">"{testimonial.quote}"</p>
                <div>
                  <p className="font-medium text-deep-brown">{testimonial.author}</p>
                  <p className="text-sm text-muted-foreground">{testimonial.role}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-24 px-6">
        <div className="max-w-4xl mx-auto">
          <div className="glass-card rounded-3xl p-12 md:p-16 warm-shadow-lg text-center relative overflow-hidden">
            {/* Background decoration */}
            <div className="absolute top-0 right-0 w-64 h-64 bg-terracotta-light/20 blob -z-10" />
            <div className="absolute bottom-0 left-0 w-48 h-48 bg-sage-light/30 blob-2 -z-10" />

            <div className="relative space-y-6">
              <div className="w-16 h-16 mx-auto rounded-2xl bg-gradient-to-br from-terracotta to-coral flex items-center justify-center animate-breathe-slow">
                <MessageCircle className="w-8 h-8 text-white" />
              </div>
              <h2 className="font-display text-3xl md:text-4xl text-deep-brown">
                Ready to practice that conversation?
              </h2>
              <p className="text-muted-foreground max-w-xl mx-auto text-lg">
                Create their digital twin in under 2 minutes. Practice until you're ready.
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
              <p className="text-sm text-muted-foreground">
                Free tier includes 5 practice sessions per month
              </p>
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

          {/* Important Notice */}
          <div className="mt-8 pt-8 border-t border-border/30">
            <p className="text-xs text-muted-foreground text-center max-w-3xl mx-auto">
              <strong>Important:</strong> Avilon is a conversation rehearsal tool designed to help you prepare for difficult discussions.
              It is not a replacement for professional mental health care or relationship counseling. If you're experiencing a crisis,
              please contact a mental health professional or call 988 (Suicide & Crisis Lifeline).
            </p>
          </div>
        </div>
      </footer>
    </main>
  )
}
