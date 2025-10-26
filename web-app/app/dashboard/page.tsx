'use client';

import { useSession } from 'next-auth/react';
import Link from 'next/link';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

export default function DashboardPage() {
  const { data: session } = useSession();

  return (
    <div className="min-h-screen cosmic-bg text-white relative overflow-hidden">
      <div className="fixed inset-0 cosmic-grid opacity-40 pointer-events-none" />

      {/* Floating musical notes background */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden opacity-10">
        <div className="absolute top-[12%] left-[8%] text-7xl text-purple-400 animate-float" style={{ animationDelay: "0s", animationDuration: "9s" }}>
          ♪
        </div>
        <div className="absolute top-[25%] right-[15%] text-6xl text-cyan-400 animate-float" style={{ animationDelay: "1.2s", animationDuration: "10s" }}>
          ♫
        </div>
        <div className="absolute bottom-[20%] left-[12%] text-8xl text-pink-400 animate-float" style={{ animationDelay: "0.6s", animationDuration: "11s" }}>
          𝄞
        </div>
        <div className="absolute top-[45%] right-[18%] text-7xl text-blue-300 animate-float" style={{ animationDelay: "1.8s", animationDuration: "8s" }}>
          ♩
        </div>
        <div className="absolute bottom-[35%] right-[10%] text-6xl text-purple-300 animate-float" style={{ animationDelay: "1s", animationDuration: "12s" }}>
          ♬
        </div>
        <div className="absolute top-[60%] left-[20%] text-5xl text-cyan-300 animate-float" style={{ animationDelay: "2.2s", animationDuration: "9s" }}>
          ♭
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-12 relative z-10">
        {/* Header */}
        <div className="mb-12">
          <h1 className="text-5xl md:text-6xl font-bold mb-4">
            <span className="gradient-text">Welcome Back!</span>
          </h1>
          <p className="text-2xl text-white">
            Hi, <span className="text-purple-400 font-semibold">{session?.user?.name || session?.user?.email}</span> 👋
          </p>
          <p className="text-lg text-white mt-2">
            What would you like to practice today?
          </p>
        </div>

        {/* Activity Cards */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* Upload New Piece */}
          <Link href="/upload" className="group">
            <Card className="glass-card border-purple-400/40 hover:border-purple-400 transition-all duration-300 hover:scale-105 h-full" style={{ borderWidth: "2px" }}>
              <CardHeader>
                <div className="w-16 h-16 bg-gradient-to-br from-purple-500 to-blue-500 rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                  <svg className="w-8 h-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" />
                  </svg>
                </div>
                <CardTitle className="text-2xl text-white">Upload New Piece</CardTitle>
                <CardDescription className="text-gray-300 text-base">
                  Upload a MusicXML or MIDI file to start practicing
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button className="w-full bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500">
                  Get Started →
                </Button>
              </CardContent>
            </Card>
          </Link>

          {/* My Library - Coming Soon */}
          <Card className="glass-card border-gray-500/40 opacity-60 h-full" style={{ borderWidth: "2px" }}>
            <CardHeader>
              <div className="w-16 h-16 bg-gradient-to-br from-gray-500 to-gray-600 rounded-xl flex items-center justify-center mb-4">
                <svg className="w-8 h-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                </svg>
              </div>
              <CardTitle className="text-2xl text-white">My Library</CardTitle>
              <CardDescription className="text-gray-300 text-base">
                Access your saved music pieces
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button disabled className="w-full bg-gray-600">
                Coming Soon
              </Button>
            </CardContent>
          </Card>

          {/* Practice History - Coming Soon */}
          <Card className="glass-card border-gray-500/40 opacity-60 h-full" style={{ borderWidth: "2px" }}>
            <CardHeader>
              <div className="w-16 h-16 bg-gradient-to-br from-gray-500 to-gray-600 rounded-xl flex items-center justify-center mb-4">
                <svg className="w-8 h-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
              </div>
              <CardTitle className="text-2xl text-white">Practice History</CardTitle>
              <CardDescription className="text-gray-300 text-base">
                Track your practice sessions and progress
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button disabled className="w-full bg-gray-600">
                Coming Soon
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Quick Stats */}
        <div className="mt-12 grid md:grid-cols-3 gap-6">
          <Card className="glass-card border-purple-400/30" style={{ borderWidth: "2px" }}>
            <CardHeader>
              <CardTitle className="text-gray-300 text-sm font-medium">Total Pieces</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-4xl font-bold gradient-text">0</p>
              <p className="text-gray-400 text-sm mt-1">Upload your first piece!</p>
            </CardContent>
          </Card>

          <Card className="glass-card border-blue-400/30" style={{ borderWidth: "2px" }}>
            <CardHeader>
              <CardTitle className="text-gray-300 text-sm font-medium">Practice Time</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-4xl font-bold gradient-text">0h 0m</p>
              <p className="text-gray-400 text-sm mt-1">Start practicing today!</p>
            </CardContent>
          </Card>

          <Card className="glass-card border-cyan-400/30" style={{ borderWidth: "2px" }}>
            <CardHeader>
              <CardTitle className="text-gray-300 text-sm font-medium">Streak</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-4xl font-bold gradient-text">0 days</p>
              <p className="text-gray-400 text-sm mt-1">Keep going!</p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
