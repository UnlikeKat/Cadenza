"use client"

import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Upload, Music, Sparkles, FileUp, FileText, Keyboard, BarChart3, ArrowRight } from "lucide-react"
import { useEffect, useState, useRef } from "react"
import { useSession } from "next-auth/react"
import Link from "next/link"

export default function CadenzaLanding() {
  const { data: session } = useSession()
  const [mounted, setMounted] = useState(false)
  const [hoveredIcon, setHoveredIcon] = useState<number | null>(null)
  const [pianoOpacity, setPianoOpacity] = useState(0.3)

  const featuresRef = useRef<HTMLDivElement>(null)
  const [featuresVisible, setFeaturesVisible] = useState(false)

  useEffect(() => {
    setMounted(true)

    const handleScroll = () => {
      const currentScrollY = window.scrollY

      // Calculate piano opacity based on scroll position
      // Fade out completely after scrolling 200px
      const fadeThreshold = 200
      const newOpacity = Math.max(0, 0.3 - (currentScrollY / fadeThreshold) * 0.3)
      setPianoOpacity(newOpacity)

      // Check if features section is in view
      if (featuresRef.current) {
        const rect = featuresRef.current.getBoundingClientRect()
        const isVisible = rect.top < window.innerHeight * 0.75
        if (isVisible && !featuresVisible) {
          setFeaturesVisible(true)
        }
      }
    }

    window.addEventListener("scroll", handleScroll)
    handleScroll() // Check initial state
    return () => window.removeEventListener("scroll", handleScroll)
  }, [featuresVisible])

  // Generate piano keys with proper positioning
  const generatePianoKeys = (): Array<{ type: string; position: number; key: string }> => {
    const keys: Array<{ type: string; position: number; key: string }> = []
    const octaves = 5 // 5 octaves
    
    for (let octave = 0; octave < octaves; octave++) {
      // Pattern: C, C#, D, D#, E, F, F#, G, G#, A, A#, B
      // White keys: C, D, E, F, G, A, B (7 per octave)
      // Black keys after: C, D, F, G, A (5 per octave, skip after E and B)
      
      const blackKeyOffsets = [
        { afterWhite: 0, offset: 0.96 },   // C# - shifted even more right
        { afterWhite: 1, offset: 0.91 },   // D# - shifted even more right
        { afterWhite: 3, offset: 0.94 },   // F# - shifted even more right
        { afterWhite: 4, offset: 0.94 },   // G# - shifted even more right
        { afterWhite: 5, offset: 0.91 },   // A# - shifted even more right
      ]
      
      blackKeyOffsets.forEach((blackKey, idx) => {
        const absoluteWhiteKeyIndex = octave * 7 + blackKey.afterWhite
        keys.push({
          type: 'black',
          position: absoluteWhiteKeyIndex + blackKey.offset,
          key: `black-${octave}-${idx}`
        })
      })
    }
    
    return keys
  }

  return (
    <div className="min-h-screen cosmic-bg text-white overflow-hidden">
      <div className="fixed inset-0 cosmic-grid opacity-40 pointer-events-none" />

      {mounted && (
        <>
          {/* Elegant floating musical notes and symbols - EXPANDED */}
          <div className="fixed inset-0 pointer-events-none overflow-hidden opacity-20">
            {/* Musical notes floating */}
            <div className="absolute top-20 left-[10%] text-6xl text-purple-400 animate-float" style={{ animationDelay: "0s", animationDuration: "8s" }}>
              ♪
            </div>
            <div className="absolute top-40 right-[15%] text-5xl text-blue-400 animate-float" style={{ animationDelay: "2s", animationDuration: "10s" }}>
              ♫
            </div>
            <div className="absolute bottom-32 left-[20%] text-7xl text-purple-300 animate-float" style={{ animationDelay: "1s", animationDuration: "9s" }}>
              ♩
            </div>
            <div className="absolute bottom-20 right-[25%] text-6xl text-cyan-400 animate-float" style={{ animationDelay: "3s", animationDuration: "11s" }}>
              ♬
            </div>
            <div className="absolute top-[60%] left-[5%] text-5xl text-pink-400 animate-float" style={{ animationDelay: "1.5s", animationDuration: "7s" }}>
              ♭
            </div>
            <div className="absolute top-[45%] right-[8%] text-6xl text-purple-400 animate-float" style={{ animationDelay: "2.5s", animationDuration: "8.5s" }}>
              ♯
            </div>
            
            {/* Additional musical notes */}
            <div className="absolute top-[25%] left-[30%] text-5xl text-cyan-300 animate-float" style={{ animationDelay: "3.5s", animationDuration: "9.5s" }}>
              ♪
            </div>
            <div className="absolute bottom-[45%] right-[40%] text-6xl text-blue-300 animate-float" style={{ animationDelay: "4s", animationDuration: "10.5s" }}>
              ♫
            </div>
            <div className="absolute top-[70%] right-[50%] text-5xl text-purple-300 animate-float" style={{ animationDelay: "2.8s", animationDuration: "8.8s" }}>
              ♩
            </div>
            <div className="absolute bottom-[60%] left-[45%] text-6xl text-pink-300 animate-float" style={{ animationDelay: "3.2s", animationDuration: "9.2s" }}>
              ♬
            </div>
            
            {/* More sharps and flats */}
            <div className="absolute top-[35%] right-[20%] text-5xl text-blue-400 animate-float" style={{ animationDelay: "4.5s", animationDuration: "11s" }}>
              ♯
            </div>
            <div className="absolute bottom-[50%] left-[25%] text-5xl text-cyan-400 animate-float" style={{ animationDelay: "5s", animationDuration: "10s" }}>
              ♭
            </div>
            <div className="absolute top-[80%] left-[70%] text-6xl text-purple-300 animate-float" style={{ animationDelay: "3.8s", animationDuration: "9.8s" }}>
              ♯
            </div>
            <div className="absolute bottom-[70%] right-[60%] text-5xl text-pink-300 animate-float" style={{ animationDelay: "4.2s", animationDuration: "10.2s" }}>
              ♭
            </div>
            
            {/* Treble and bass clefs */}
            <div className="absolute top-[30%] left-[80%] text-8xl text-blue-300 animate-float opacity-30" style={{ animationDelay: "0.5s", animationDuration: "12s" }}>
              𝄞
            </div>
            <div className="absolute bottom-[40%] right-[70%] text-7xl text-purple-300 animate-float opacity-30" style={{ animationDelay: "1.8s", animationDuration: "10s" }}>
              𝄢
            </div>
            
            {/* Additional clefs */}
            <div className="absolute top-[50%] left-[15%] text-7xl text-cyan-300 animate-float opacity-25" style={{ animationDelay: "5.5s", animationDuration: "13s" }}>
              𝄞
            </div>
            <div className="absolute bottom-[15%] right-[35%] text-8xl text-purple-300 animate-float opacity-25" style={{ animationDelay: "6s", animationDuration: "11.5s" }}>
              𝄢
            </div>
            
            {/* Natural signs and other symbols */}
            <div className="absolute top-[40%] left-[60%] text-5xl text-blue-300 animate-float opacity-30" style={{ animationDelay: "6.5s", animationDuration: "10.8s" }}>
              ♮
            </div>
            <div className="absolute bottom-[30%] left-[80%] text-6xl text-cyan-300 animate-float opacity-30" style={{ animationDelay: "7s", animationDuration: "11.2s" }}>
              𝄪
            </div>
            <div className="absolute top-[65%] right-[12%] text-5xl text-pink-300 animate-float opacity-30" style={{ animationDelay: "7.5s", animationDuration: "9.5s" }}>
              𝄫
            </div>
          </div>

          {/* Subtle glowing orbs for depth */}
          <div className="fixed inset-0 pointer-events-none overflow-hidden">
            <div className="absolute top-[15%] left-[12%] w-64 h-64 bg-purple-500/10 rounded-full blur-3xl animate-pulse-slow" />
            <div className="absolute top-[50%] right-[10%] w-80 h-80 bg-blue-500/10 rounded-full blur-3xl animate-pulse-slow" style={{ animationDelay: "2s" }} />
            <div className="absolute bottom-[20%] left-[60%] w-72 h-72 bg-cyan-500/10 rounded-full blur-3xl animate-pulse-slow" style={{ animationDelay: "4s" }} />
            <div className="absolute top-[70%] left-[25%] w-56 h-56 bg-pink-500/10 rounded-full blur-3xl animate-pulse-slow" style={{ animationDelay: "1s" }} />
          </div>

          {/* Piano keys accent - REALISTIC LAYOUT matching real piano proportions with fade on scroll */}
          <div 
            className="fixed top-0 left-0 right-0 pointer-events-none overflow-hidden transition-opacity duration-300"
            style={{ opacity: pianoOpacity }}
          >
            <div className="relative h-32" style={{
              maskImage: 'linear-gradient(to bottom, rgba(0,0,0,1) 0%, rgba(0,0,0,0.5) 70%, rgba(0,0,0,0) 100%)',
              WebkitMaskImage: 'linear-gradient(to bottom, rgba(0,0,0,1) 0%, rgba(0,0,0,0.5) 70%, rgba(0,0,0,0) 100%)'
            }}>
              {/* White keys - full height, 35 keys = 5 octaves */}
              <div className="flex absolute inset-0">
                {[...Array(35)].map((_, i) => (
                  <div
                    key={`white-${i}`}
                    className="flex-1 border-r border-purple-400/50 bg-transparent h-full"
                  />
                ))}
              </div>
              
              {/* Black keys - positioned realistically according to real piano layout */}
              <div className="absolute top-0 left-0 right-0 h-20">
                {generatePianoKeys().map((key) => {
                  const whiteKeyWidth = 100 / 35 // percentage width of each white key
                  const leftPosition = key.position * whiteKeyWidth
                  const blackKeyWidthPercent = whiteKeyWidth * 0.6 // Black keys are 60% width of white keys
                  
                  return (
                    <div
                      key={key.key}
                      className="absolute rounded-b-lg shadow-lg"
                      style={{ 
                        left: `${leftPosition}%`,
                        width: `${blackKeyWidthPercent}%`,
                        height: '100%',
                        transform: 'translateX(-50%)',
                        zIndex: 10,
                        backgroundColor: 'rgba(167, 139, 250, 0.85)',
                        borderLeft: '1px solid rgba(167, 139, 250, 0.9)',
                        borderRight: '1px solid rgba(167, 139, 250, 0.9)'
                      }}
                    />
                  )
                })}
              </div>
              
              {/* White key separation lines - only visible below black keys */}
              <div className="absolute top-20 left-0 right-0 flex" style={{ height: 'calc(100% - 5rem)' }}>
                {[...Array(35)].map((_, i) => (
                  <div
                    key={`separator-${i}`}
                    className="flex-1 border-r border-purple-400/50 bg-transparent"
                  />
                ))}
              </div>
            </div>
          </div>

          {/* Sound wave visualization */}
          <div className="fixed inset-0 pointer-events-none overflow-hidden opacity-8">
            <svg className="absolute w-full h-full" xmlns="http://www.w3.org/2000/svg">
              {/* Single smooth sound wave at top */}
              <path 
                d="M0,300 Q100,250 200,300 T400,300 T600,300 T800,300 T1000,300 T1200,300 T1400,300 T1600,300 T1800,300 T2000,300" 
                stroke="url(#waveGradient1)" 
                strokeWidth="1.5" 
                fill="none"
                opacity="0.6"
                className="animate-wave-gentle"
              />
              
              <defs>
                <linearGradient id="waveGradient1" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="#a78bfa" stopOpacity="0.3" />
                  <stop offset="50%" stopColor="#60a5fa" stopOpacity="0.5" />
                  <stop offset="100%" stopColor="#a78bfa" stopOpacity="0.3" />
                </linearGradient>
              </defs>
            </svg>
          </div>
        </>
      )}

      {/* Hero Section */}
      <section className="relative min-h-screen flex items-center justify-center px-4 py-20">
        <div className="max-w-5xl mx-auto text-center z-10">
          <div className="animate-float">
            <h1
              className="text-8xl md:text-9xl font-display font-normal gradient-text drop-shadow-2xl leading-tight"
              style={{
                fontFamily: "'Great Vibes', cursive",
                textShadow: '0 0 40px rgba(139, 92, 246, 0.5), 0 0 80px rgba(59, 130, 246, 0.3)'
              }}
            >
              Cadenza
            </h1>
          </div>

          <p className="text-2xl md:text-3xl font-semibold mb-4 text-purple-200">Your Music Practice Companion</p>

          <p className="text-lg md:text-xl text-gray-300 mb-12 max-w-3xl mx-auto leading-relaxed">
            Upload sheet music, play along with interactive note highlighting, and get instant AI-powered feedback on
            your performance
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
            <Link href={session ? "/dashboard" : "/auth/signup"}>
              <Button
                size="lg"
                className="text-lg px-8 py-6 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 glow-effect transition-all duration-300 hover:scale-105 hover:glow-effect-strong"
              >
                {session ? "Go to Dashboard" : "Start Practicing Now"}
              </Button>
            </Link>
            <Button
              size="lg"
              variant="outline"
              className="text-lg px-8 py-6 border-2 border-purple-400/50 text-purple-100 hover:bg-purple-500/20 hover:border-purple-300 hover:text-white transition-all duration-300 hover:scale-105 bg-transparent backdrop-blur-sm"
            >
              Watch Demo
            </Button>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="relative py-20 px-4" ref={featuresRef}>
        <div className="max-w-7xl mx-auto">
          <h2 className="text-4xl md:text-5xl font-bold text-center mb-16 gradient-text-subtle">Powerful Features</h2>

          <div className="grid md:grid-cols-3 gap-8">
            <Card
              className={`glass-card border-purple-400/40 hover:scale-105 transition-all duration-300 hover:glow-effect group ${featuresVisible ? "animate-scroll-reveal" : "opacity-0"}`}
              style={{ borderWidth: "2px" }}
            >
              <CardContent className="p-8">
                <div className="w-16 h-16 rounded-full bg-gradient-to-br from-purple-600 to-blue-600 flex items-center justify-center mb-6 glow-effect group-hover:glow-effect-strong group-hover:scale-110 transition-all duration-300 backdrop-blur-sm">
                  <Upload className="w-8 h-8 text-white group-hover:scale-110 transition-transform duration-300" />
                </div>
                <h3 className="text-2xl font-bold mb-4 text-purple-100">Upload Any Format</h3>
                <p className="text-gray-300 mb-4 leading-relaxed">
                  Seamlessly import your sheet music in multiple formats
                </p>
                <ul className="space-y-2 text-gray-400">
                  <li className="flex items-center gap-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-purple-400" />
                    Support for MusicXML (.xml, .musicxml)
                  </li>
                  <li className="flex items-center gap-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-blue-400" />
                    MIDI files (.mid, .midi)
                  </li>
                  <li className="flex items-center gap-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-purple-400" />
                    Instant processing & rendering
                  </li>
                </ul>
              </CardContent>
            </Card>

            <Card
              className={`glass-card border-blue-400/40 hover:scale-105 transition-all duration-300 hover:glow-effect group ${featuresVisible ? "animate-scroll-reveal delay-100" : "opacity-0"}`}
              style={{ borderWidth: "2px" }}
            >
              <CardContent className="p-8">
                <div className="w-16 h-16 rounded-full bg-gradient-to-br from-blue-600 to-cyan-600 flex items-center justify-center mb-6 glow-effect group-hover:glow-effect-strong group-hover:scale-110 transition-all duration-300 backdrop-blur-sm">
                  <Music className="w-8 h-8 text-white group-hover:scale-110 transition-transform duration-300" />
                </div>
                <h3 className="text-2xl font-bold mb-4 text-blue-100">Interactive Playback</h3>
                <p className="text-gray-300 mb-4 leading-relaxed">
                  Follow along with intelligent real-time highlighting
                </p>
                <ul className="space-y-2 text-gray-400">
                  <li className="flex items-center gap-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-blue-400" />
                    Real-time note highlighting
                  </li>
                  <li className="flex items-center gap-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-cyan-400" />
                    Follow-along cursor
                  </li>
                  <li className="flex items-center gap-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-blue-400" />
                    Beautiful professional notation
                  </li>
                </ul>
              </CardContent>
            </Card>

            <Card
              className={`glass-card border-purple-400/40 hover:scale-105 transition-all duration-300 hover:glow-effect group ${featuresVisible ? "animate-scroll-reveal delay-200" : "opacity-0"}`}
              style={{ borderWidth: "2px" }}
            >
              <CardContent className="p-8">
                <div className="w-16 h-16 rounded-full bg-gradient-to-br from-purple-600 to-pink-600 flex items-center justify-center mb-6 glow-effect group-hover:glow-effect-strong group-hover:scale-110 transition-all duration-300 backdrop-blur-sm">
                  <Sparkles className="w-8 h-8 text-white group-hover:scale-110 transition-transform duration-300" />
                </div>
                <h3 className="text-2xl font-bold mb-4 text-purple-100">AI Performance Feedback</h3>
                <p className="text-gray-300 mb-4 leading-relaxed">Get detailed insights to improve your playing</p>
                <ul className="space-y-2 text-gray-400">
                  <li className="flex items-center gap-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-purple-400" />
                    Note accuracy tracking (94% example)
                  </li>
                  <li className="flex items-center gap-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-pink-400" />
                    Timing & rhythm analysis (±45ms example)
                  </li>
                  <li className="flex items-center gap-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-purple-400" />
                    Dynamic expression scoring (88% example)
                  </li>
                </ul>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section className="relative py-20 px-4">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-4xl md:text-5xl font-bold text-center mb-16 gradient-text-subtle">How It Works</h2>

          <div className="relative">
            <div className="hidden md:block absolute top-1/2 left-0 right-0 h-1 bg-gradient-to-r from-purple-500/60 via-blue-500/60 to-purple-500/60 -translate-y-1/2 opacity-50" />

            <div className="grid md:grid-cols-4 gap-8 relative">
              <div className="flex flex-col items-center text-center">
                <div
                  className="w-24 h-24 rounded-full bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center mb-6 glow-effect relative z-10 border-4 border-purple-800/50 transition-all duration-300 hover:scale-110 cursor-pointer backdrop-blur-sm"
                  onMouseEnter={() => setHoveredIcon(1)}
                  onMouseLeave={() => setHoveredIcon(null)}
                >
                  <div className="absolute -top-2 -right-2 w-8 h-8 rounded-full bg-purple-400 flex items-center justify-center text-sm font-bold animate-pulse-glow backdrop-blur-sm">
                    1
                  </div>
                  <FileUp
                    className={`w-10 h-10 text-white transition-all duration-300 ${hoveredIcon === 1 ? "scale-125 animate-icon-pop" : ""}`}
                  />
                </div>
                <h3 className="text-xl font-bold mb-2 text-purple-100">Upload</h3>
                <p className="text-gray-300 text-sm leading-relaxed">Upload your sheet music in any supported format</p>
              </div>

              <div className="flex flex-col items-center text-center">
                <div
                  className="w-24 h-24 rounded-full bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center mb-6 glow-effect relative z-10 border-4 border-blue-800/50 transition-all duration-300 hover:scale-110 cursor-pointer backdrop-blur-sm"
                  onMouseEnter={() => setHoveredIcon(2)}
                  onMouseLeave={() => setHoveredIcon(null)}
                >
                  <div className="absolute -top-2 -right-2 w-8 h-8 rounded-full bg-blue-400 flex items-center justify-center text-sm font-bold animate-pulse-glow backdrop-blur-sm">
                    2
                  </div>
                  <FileText
                    className={`w-10 h-10 text-white transition-all duration-300 ${hoveredIcon === 2 ? "scale-125 animate-icon-pop" : ""}`}
                  />
                </div>
                <h3 className="text-xl font-bold mb-2 text-blue-100">Display</h3>
                <p className="text-gray-300 text-sm leading-relaxed">View beautifully rendered professional notation</p>
              </div>

              <div className="flex flex-col items-center text-center">
                <div
                  className="w-24 h-24 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center mb-6 glow-effect relative z-10 border-4 border-purple-800/50 transition-all duration-300 hover:scale-110 cursor-pointer backdrop-blur-sm"
                  onMouseEnter={() => setHoveredIcon(3)}
                  onMouseLeave={() => setHoveredIcon(null)}
                >
                  <div className="absolute -top-2 -right-2 w-8 h-8 rounded-full bg-purple-400 flex items-center justify-center text-sm font-bold animate-pulse-glow backdrop-blur-sm">
                    3
                  </div>
                  <Keyboard
                    className={`w-10 h-10 text-white transition-all duration-300 ${hoveredIcon === 3 ? "scale-125 animate-icon-pop" : ""}`}
                  />
                </div>
                <h3 className="text-xl font-bold mb-2 text-purple-100">Play Along</h3>
                <p className="text-gray-300 text-sm leading-relaxed">Practice with real-time note highlighting</p>
              </div>

              <div className="flex flex-col items-center text-center">
                <div
                  className="w-24 h-24 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center mb-6 glow-effect relative z-10 border-4 border-blue-800/50 transition-all duration-300 hover:scale-110 cursor-pointer backdrop-blur-sm"
                  onMouseEnter={() => setHoveredIcon(4)}
                  onMouseLeave={() => setHoveredIcon(null)}
                >
                  <div className="absolute -top-2 -right-2 w-8 h-8 rounded-full bg-blue-400 flex items-center justify-center text-sm font-bold animate-pulse-glow backdrop-blur-sm">
                    4
                  </div>
                  <BarChart3
                    className={`w-10 h-10 text-white transition-all duration-300 ${hoveredIcon === 4 ? "scale-125 animate-icon-pop" : ""}`}
                  />
                </div>
                <h3 className="text-xl font-bold mb-2 text-blue-100">Get Feedback</h3>
                <p className="text-gray-300 text-sm leading-relaxed">Receive AI-powered performance insights</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Performance Dashboard Preview */}
      <section className="relative py-20 px-4">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-4xl md:text-5xl font-bold text-center mb-16 gradient-text-subtle">Track Your Progress</h2>

          <div className="grid md:grid-cols-3 gap-6">
            <Card className="glass-card border-green-400/35 hover:scale-105 transition-all duration-300 hover:glow-effect">
              <CardContent className="p-8">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-gray-200">Note Accuracy</h3>
                  <Sparkles className="w-5 h-5 text-green-300" />
                </div>
                <div className="text-5xl font-bold mb-4 text-green-300">94%</div>
                <div className="w-full h-3 bg-gray-700/60 rounded-full overflow-hidden backdrop-blur-sm">
                  <div
                    className="h-full bg-gradient-to-r from-green-400 to-emerald-300 rounded-full glow-effect"
                    style={{ width: "94%" }}
                  />
                </div>
                <p className="text-sm text-gray-300 mt-3">Excellent precision!</p>
              </CardContent>
            </Card>

            <Card className="glass-card border-yellow-400/35 hover:scale-105 transition-all duration-300 hover:glow-effect">
              <CardContent className="p-8">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-gray-200">Timing</h3>
                  <BarChart3 className="w-5 h-5 text-yellow-300" />
                </div>
                <div className="text-5xl font-bold mb-4 text-yellow-300">±45ms</div>
                <div className="w-full h-3 bg-gray-700/60 rounded-full overflow-hidden backdrop-blur-sm">
                  <div
                    className="h-full bg-gradient-to-r from-yellow-400 to-amber-300 rounded-full glow-effect"
                    style={{ width: "78%" }}
                  />
                </div>
                <p className="text-sm text-gray-300 mt-3">Great rhythm control</p>
              </CardContent>
            </Card>

            <Card className="glass-card border-blue-400/35 hover:scale-105 transition-all duration-300 hover:glow-effect">
              <CardContent className="p-8">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-gray-200">Dynamics</h3>
                  <Music className="w-5 h-5 text-blue-300" />
                </div>
                <div className="text-5xl font-bold mb-4 text-blue-300">88%</div>
                <div className="w-full h-3 bg-gray-700/60 rounded-full overflow-hidden backdrop-blur-sm">
                  <div
                    className="h-full bg-gradient-to-r from-blue-400 to-cyan-300 rounded-full glow-effect"
                    style={{ width: "88%" }}
                  />
                </div>
                <p className="text-sm text-gray-300 mt-3">Expressive playing</p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="relative py-20 px-4">
        <div className="max-w-4xl mx-auto">
          <div className="gradient-border rounded-2xl p-12 text-center hover:scale-105 transition-all duration-300">
            <h2 className="text-4xl md:text-5xl font-bold mb-4 gradient-text-subtle">Free During Beta</h2>
            <p className="text-xl text-gray-300 mb-8 leading-relaxed">
              Get unlimited access to all features. No credit card required.
            </p>
            <Button
              size="lg"
              className="text-lg px-10 py-6 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 glow-effect transition-all duration-300 hover:scale-110 hover:glow-effect-strong"
            >
              Start Free Today <ArrowRight className="ml-2 w-5 h-5" />
            </Button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="relative py-16 px-4 border-t border-purple-800/30">
        <div className="max-w-7xl mx-auto">
          <div className="grid md:grid-cols-4 gap-8 mb-8">
            <div>
              <h3 className="text-2xl font-bold gradient-text-subtle mb-4">Cadenza</h3>
              <p className="text-gray-300 text-sm leading-relaxed">
                Music practice companion for musicians of all levels.
              </p>
            </div>

            <div>
              <h4 className="font-semibold text-purple-100 mb-4">Features</h4>
              <ul className="space-y-2 text-sm text-gray-300">
                <li className="hover:text-purple-200 transition-colors cursor-pointer">Sheet Music Upload</li>
                <li className="hover:text-purple-200 transition-colors cursor-pointer">Interactive Playback</li>
                <li className="hover:text-purple-200 transition-colors cursor-pointer">AI Feedback</li>
                <li className="hover:text-purple-200 transition-colors cursor-pointer">Progress Tracking</li>
              </ul>
            </div>

            <div>
              <h4 className="font-semibold text-blue-100 mb-4">Technology</h4>
              <ul className="space-y-2 text-sm text-gray-300">
                <li className="hover:text-blue-200 transition-colors cursor-pointer">MusicXML Support</li>
                <li className="hover:text-blue-200 transition-colors cursor-pointer">MIDI Integration</li>
                <li className="hover:text-blue-200 transition-colors cursor-pointer">AI Analysis</li>
                <li className="hover:text-blue-200 transition-colors cursor-pointer">Real-time Processing</li>
              </ul>
            </div>

            <div>
              <h4 className="font-semibold text-purple-100 mb-4">Links</h4>
              <ul className="space-y-2 text-sm text-gray-300">
                <li className="hover:text-purple-200 transition-colors cursor-pointer">About Us</li>
                <li className="hover:text-purple-200 transition-colors cursor-pointer">Documentation</li>
                <li className="hover:text-purple-200 transition-colors cursor-pointer">Support</li>
                <li className="hover:text-purple-200 transition-colors cursor-pointer">Privacy Policy</li>
              </ul>
            </div>
          </div>

          <div className="pt-8 border-t border-purple-800/30 text-center text-sm text-gray-400">
            <p>© 2025 Cadenza. All rights reserved. Built with passion for musicians.</p>
          </div>
        </div>
      </footer>
    </div>
  )
}