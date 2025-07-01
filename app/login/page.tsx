"use client"

import type React from "react"
import { useState } from "react"
import { signIn, signInWithBadge } from "@/lib/auth"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Badge } from "lucide-react"

export default function Login() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [badgeId, setBadgeId] = useState("")
  const [error, setError] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [isBadgeLoading, setIsBadgeLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError("")

    const { data, error: authError } = await signIn(email, password)

    if (authError) {
      setError("Ongeldige inloggegevens")
    } else if (data.user) {
      // Gebruik window.location.href voor een harde redirect
      window.location.href = "/"
    }

    setIsLoading(false)
  }

  const handleBadgeSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!badgeId.trim()) return

    setIsBadgeLoading(true)
    setError("")

    const { data, error: authError } = await signInWithBadge(badgeId.trim())

    if (authError) {
      setError("Badge niet gevonden of niet geregistreerd")
    } else if (data.user) {
      // Gebruik window.location.href voor een harde redirect (identiek aan email/password login)
      window.location.href = "/"
    }

    setIsBadgeLoading(false)
  }

  const handleScanBadge = () => {
    const badgeInput = document.getElementById("badgeId") as HTMLInputElement
    if (badgeInput) {
      badgeInput.focus()
      setBadgeId("") // Clear any existing value
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <div className="flex items-center">
              <div className="relative w-10 h-10 mr-2">
                <div className="w-10 h-10 border-4 border-red-500 rounded-full relative">
                  <div className="absolute -top-1 -left-1 w-3 h-3 bg-red-500 rounded-full"></div>
                </div>
              </div>
              <div className="text-lg font-bold text-red-500 tracking-wide">INTERFLON</div>
            </div>
          </div>
          <CardTitle>Inloggen</CardTitle>
          <CardDescription>
            Voer je inloggegevens in of scan je badge om toegang te krijgen tot de Product Registratie app
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">E-mailadres</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                placeholder="naam@interflon.com"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Wachtwoord</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                placeholder="••••••••"
              />
            </div>
            {error && (
              <Alert className="border-red-200 bg-red-50">
                <AlertDescription className="text-red-800">{error}</AlertDescription>
              </Alert>
            )}
            <Button type="submit" className="w-full bg-red-600 hover:bg-red-700" disabled={isLoading}>
              {isLoading ? "Bezig met inloggen..." : "Inloggen"}
            </Button>
          </form>

          {/* Badge Login Section */}
          <div className="mt-4 pt-4 border-t border-gray-200">
            <div className="text-center text-sm text-gray-600 mb-3">Of log in met je badge</div>

            {/* Scan Badge Button */}
            <Button type="button" onClick={handleScanBadge} className="w-full bg-blue-600 hover:bg-blue-700 mb-3">
              <Badge className="mr-2 h-4 w-4" />
              Scan badge
            </Button>

            <form onSubmit={handleBadgeSubmit} className="space-y-3">
              <div className="space-y-2">
                <Label htmlFor="badgeId">Badge ID</Label>
                <Input
                  id="badgeId"
                  type="text"
                  value={badgeId}
                  onChange={(e) => setBadgeId(e.target.value)}
                  placeholder="Badge ID verschijnt hier..."
                  className="text-center"
                />
              </div>
              <Button
                type="submit"
                variant="outline"
                className="w-full border-red-200 text-red-600 hover:bg-red-50 bg-transparent"
                disabled={isBadgeLoading || !badgeId.trim()}
              >
                <Badge className="mr-2 h-4 w-4" />
                {isBadgeLoading ? "Bezig met inloggen..." : "Inloggen met badge"}
              </Button>
            </form>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
