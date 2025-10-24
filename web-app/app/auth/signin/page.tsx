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

export default function SignInPage() {
  const router = useRouter()
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState("")

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError("")

    try {
      const result = await signIn("credentials", {
        email,
        password,
        redirect: false,
      })

      if (result?.error) {
        setError("Invalid email or password")
      } else {
        router.push("/")
        router.refresh()
      }
    } catch (error) {
      setError("Something went wrong")
    } finally {
      setIsLoading(false)
    }
  }

  const handleGoogleSignIn = () => {
    signIn("google", { callbackUrl: "/" })
  }

  return (
    <div className="min-h-screen cosmic-bg flex items-center justify-center px-4">
      <Card className="glass-card w-full max-w-md border-purple-400/40" style={{ borderWidth: "2px" }}>
        <CardHeader className="space-y-1 text-center">
          <CardTitle className="text-3xl font-bold gradient-text-subtle">Welcome Back</CardTitle>
          <p className="text-gray-400">Sign in to continue to Cadenza</p>
        </CardHeader>
        <CardContent className="space-y-4">
          <Button
            type="button"
            variant="outline"
            className="w-full border-purple-400/50 hover:bg-purple-500/20 hover:border-purple-300"
            onClick={handleGoogleSignIn}
          >
            <FcGoogle className="mr-2 h-5 w-5" />
            Continue with Google
          </Button>

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t border-purple-400/30" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-transparent px-2 text-gray-400">Or continue with</span>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="p-3 text-sm text-red-400 bg-red-500/10 border border-red-500/30 rounded-md">
                {error}
              </div>
            )}

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
                className="bg-transparent border-purple-400/50 focus:border-purple-400"
              />
            </div>

            <Button
              type="submit"
              className="w-full bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500"
              disabled={isLoading}
            >
              {isLoading ? "Signing in..." : "Sign In"}
            </Button>
          </form>

          <p className="text-center text-sm text-gray-400">
            Don't have an account?{" "}
            <Link href="/auth/signup" className="text-purple-400 hover:text-purple-300">
              Sign up
            </Link>
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
