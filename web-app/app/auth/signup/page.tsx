"use client"

import { useState } from "react"
import { signIn } from "next-auth/react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { FcGoogle } from "react-icons/fc"
import Link from "next/link"

export default function SignUpPage() {
  const router = useRouter()
  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState("")

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError("")

    try {
      const response = await fetch("/api/auth/register", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name,
          email,
          password,
        }),
      })

      if (!response.ok) {
        const data = await response.text()
        throw new Error(data)
      }

      // Auto sign in after registration
      await signIn("credentials", {
        email,
        password,
        redirect: false,
      })

      router.push("/")
      router.refresh()
    } catch (error: unknown) {
      if (error instanceof Error) {
        setError(error.message || "Something went wrong")
      } else {
        setError("Something went wrong")
      }
    } finally {
      setIsLoading(false)
    }
  }

  const handleGoogleSignIn = () => {
    signIn("google", { callbackUrl: "/" })
  }

  return (
    <div className="min-h-screen cosmic-bg flex items-center justify-center px-4 relative overflow-hidden">
      {/* Floating musical notes background - different from homepage */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden opacity-15">
        <div className="absolute top-[15%] left-[8%] text-7xl text-cyan-400 animate-float" style={{ animationDelay: "0s", animationDuration: "9s" }}>
          ♯
        </div>
        <div className="absolute top-[25%] right-[12%] text-6xl text-purple-400 animate-float" style={{ animationDelay: "1.5s", animationDuration: "11s" }}>
          ♭
        </div>
        <div className="absolute bottom-[20%] left-[15%] text-8xl text-pink-400 animate-float" style={{ animationDelay: "0.5s", animationDuration: "10s" }}>
          𝄞
        </div>
        <div className="absolute top-[40%] right-[20%] text-7xl text-blue-300 animate-float" style={{ animationDelay: "2s", animationDuration: "8s" }}>
          ♩
        </div>
        <div className="absolute bottom-[35%] right-[8%] text-6xl text-purple-300 animate-float" style={{ animationDelay: "1s", animationDuration: "12s" }}>
          ♫
        </div>
        <div className="absolute top-[60%] left-[25%] text-5xl text-cyan-300 animate-float" style={{ animationDelay: "2.5s", animationDuration: "9s" }}>
          ♬
        </div>
        <div className="absolute top-[10%] right-[30%] text-6xl text-pink-300 animate-float" style={{ animationDelay: "0.8s", animationDuration: "10s" }}>
          ♪
        </div>
        <div className="absolute bottom-[45%] left-[5%] text-7xl text-blue-400 animate-float" style={{ animationDelay: "1.2s", animationDuration: "11s" }}>
          ♮
        </div>
        <div className="absolute top-[70%] right-[15%] text-5xl text-purple-400 animate-float" style={{ animationDelay: "2.2s", animationDuration: "9s" }}>
          𝄢
        </div>
        <div className="absolute bottom-[10%] left-[35%] text-6xl text-cyan-400 animate-float" style={{ animationDelay: "0.3s", animationDuration: "10s" }}>
          ♬
        </div>
        <div className="absolute top-[35%] left-[40%] text-7xl text-pink-400 animate-float" style={{ animationDelay: "1.8s", animationDuration: "8s" }}>
          ♭
        </div>
        <div className="absolute bottom-[55%] right-[35%] text-5xl text-blue-300 animate-float" style={{ animationDelay: "0.6s", animationDuration: "12s" }}>
          ♯
        </div>
      </div>

      <Card className="glass-card w-full max-w-md border-purple-400/40 relative z-10" style={{ borderWidth: "2px" }}>
        <CardHeader className="space-y-1 text-center">
          <CardTitle className="text-3xl font-bold gradient-text-subtle">Create Account</CardTitle>
          <p className="text-gray-400">Sign up to start practicing with Cadenza</p>
        </CardHeader>
        <CardContent className="space-y-4">
          <Button
            type="button"
            variant="outline"
            className="w-full border-purple-400/50 hover:bg-purple-500/10 hover:border-purple-300 transition-colors text-gray-200 hover:text-white"
            onClick={handleGoogleSignIn}
          >
            <FcGoogle className="mr-2 h-5 w-5" />
            Continue with Google
          </Button>

          <div className="relative py-2">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t border-purple-400/30" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-gray-900 px-3 text-gray-400">Or continue with</span>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="p-3 text-sm text-red-400 bg-red-500/10 border border-red-500/30 rounded-md">
                {error}
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="name" className="text-gray-300">Name</Label>
              <Input
                id="name"
                type="text"
                placeholder="John Doe"
                value={name}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setName(e.target.value)}
                required
                className="bg-transparent border-purple-400/50 focus:border-purple-400"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="email" className="text-gray-300">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="name@example.com"
                value={email}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setEmail(e.target.value)}
                required
                className="bg-transparent border-purple-400/50 focus:border-purple-400"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password" className="text-gray-300">Password</Label>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setPassword(e.target.value)}
                required
                minLength={6}
                className="bg-transparent border-purple-400/50 focus:border-purple-400"
              />
              <p className="text-xs text-gray-500">Must be at least 6 characters</p>
            </div>

            <Button
              type="submit"
              className="w-full bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500"
              disabled={isLoading}
            >
              {isLoading ? "Creating account..." : "Create Account"}
            </Button>
          </form>

          <p className="text-center text-sm text-gray-400">
            Already have an account?{" "}
            <Link href="/auth/signin" className="text-purple-400 hover:text-purple-300">
              Sign in
            </Link>
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
