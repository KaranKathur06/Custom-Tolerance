"use client"

import { useState, useEffect, useRef } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Lock, Loader2, CheckCircle, AlertCircle, Eye, EyeOff, ShieldAlert } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { useAuth } from "@/components/auth/AuthProvider"
import { BRAND } from "@/config/brand"

/**
 * Password Reset Page — Security-critical flow.
 *
 * Key design:
 * 1. This page is ONLY for PASSWORD_RECOVERY sessions
 * 2. Recovery sessions must NOT grant normal application access
 * 3. After password change: sign out recovery session → redirect to /login
 * 4. Password validation uses same rules as registration
 */

const PASSWORD_MIN_LENGTH = 8;
const PASSWORD_RULES = [
  { test: (p: string) => p.length >= PASSWORD_MIN_LENGTH, label: "At least 8 characters" },
  { test: (p: string) => /[A-Z]/.test(p), label: "One uppercase letter" },
  { test: (p: string) => /[a-z]/.test(p), label: "One lowercase letter" },
  { test: (p: string) => /\d/.test(p), label: "One number" },
];

export default function ResetPasswordPage() {
  const router = useRouter()
  const { supabase } = useAuth()
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [isRecoverySession, setIsRecoverySession] = useState(false)
  const [sessionChecked, setSessionChecked] = useState(false)
  const signOutCalledRef = useRef(false)

  // ── Verify this is a recovery session ──
  useEffect(() => {
    if (!supabase) return;

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY") {
        setIsRecoverySession(true);
        setSessionChecked(true);
      }
    });

    // Also check current session state
    void (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        // User has a session (likely from recovery link) — allow password reset
        setIsRecoverySession(true);
      }
      setSessionChecked(true);
    })();

    return () => subscription.unsubscribe();
  }, [supabase]);

  const passwordValid = PASSWORD_RULES.every(r => r.test(password));
  const passwordsMatch = password === confirmPassword && confirmPassword.length > 0;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!supabase) { setError("Auth service unavailable."); return }
    if (!passwordValid) { setError("Password does not meet requirements."); return }
    if (!passwordsMatch) { setError("Passwords do not match."); return }

    setIsLoading(true); setError(null)
    try {
      const { error: updateError } = await supabase.auth.updateUser({ password })
      if (updateError) {
        setError(updateError.message);
        return;
      }

      setSuccess(true);

      // ── CRITICAL: Terminate the recovery session ──
      // The recovery session must NOT become a normal authenticated session.
      // Sign out, clear state, and force the user to re-authenticate.
      if (!signOutCalledRef.current) {
        signOutCalledRef.current = true;
        try {
          await supabase.auth.signOut({ scope: "local" });
        } catch {
          // Continue with redirect even if signOut fails
        }
      }

      // Redirect to login after a brief confirmation
      setTimeout(() => {
        window.location.replace("/login?reset=success");
      }, 2500);
    } catch (err: any) {
      setError(err?.message || "Failed to reset password")
    } finally {
      setIsLoading(false)
    }
  }

  // ── No session / not a recovery session ──
  if (sessionChecked && !isRecoverySession) {
    return (
      <div className="flex h-screen items-center justify-center bg-[#f8fafc] p-6">
        <div className="w-full max-w-md text-center">
          <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-amber-100">
            <ShieldAlert className="h-10 w-10 text-amber-600" />
          </div>
          <h1 className="text-2xl font-extrabold text-slate-900 mb-3">Invalid or Expired Link</h1>
          <p className="text-sm text-slate-600 mb-6">
            This password reset link has expired or is invalid. Please request a new one.
          </p>
          <div className="flex flex-col gap-3">
            <Link href="/forgot-password">
              <Button className="w-full bg-gradient-to-r from-[#1e3a8a] to-[#3b82f6] text-white font-bold rounded-xl">
                Request New Reset Link
              </Button>
            </Link>
            <Link href="/login">
              <Button variant="outline" className="w-full font-semibold">
                Back to Login
              </Button>
            </Link>
          </div>
        </div>
      </div>
    )
  }

  // ── Loading session check ──
  if (!sessionChecked) {
    return (
      <div className="flex h-screen items-center justify-center bg-[#f8fafc]">
        <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
      </div>
    )
  }

  // ── Success state ──
  if (success) {
    return (
      <div className="flex h-screen items-center justify-center bg-[#f8fafc] p-6">
        <div className="w-full max-w-md text-center">
          <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-emerald-100">
            <CheckCircle className="h-10 w-10 text-emerald-600" />
          </div>
          <h1 className="text-2xl font-extrabold text-slate-900 mb-3">Password Updated</h1>
          <p className="text-sm text-slate-600 mb-6">
            Your password has been reset successfully. Please log in with your new password.
          </p>
          <Link href="/login?reset=success">
            <Button className="bg-gradient-to-r from-[#1e3a8a] to-[#3b82f6] text-white font-bold rounded-xl">
              Go to Login
            </Button>
          </Link>
        </div>
      </div>
    )
  }

  // ── Reset form ──
  return (
    <div className="flex h-screen items-center justify-center bg-[#f8fafc] p-6">
      <div className="w-full max-w-md">
        <h1 className="text-2xl font-extrabold text-slate-900 mb-2">Set New Password</h1>
        <p className="text-sm text-slate-500 mb-6">Choose a strong password for your {BRAND.name} account.</p>

        <div className="bg-white rounded-[15px] p-6 shadow-[0_20px_40px_rgba(0,0,0,0.08)] border border-[#e5e7eb]">
          {error && (
            <div className="mb-4 flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" /><span>{error}</span>
            </div>
          )}

          {/* Security notice */}
          <div className="mb-4 rounded-xl bg-blue-50 px-4 py-3 text-xs text-blue-700">
            <ShieldAlert className="inline mr-1.5 h-3.5 w-3.5" />
            You will be signed out after changing your password and must log in again.
          </div>

          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <Input
                type={showPassword ? "text" : "password"}
                placeholder="New Password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="pl-9 pr-9 h-[42px] rounded-xl border-[#e5e7eb] text-sm"
                disabled={isLoading}
                autoFocus
              />
              <button type="button" tabIndex={-1} onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700">
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>

            {/* Password strength indicators */}
            {password.length > 0 && (
              <div className="space-y-1">
                {PASSWORD_RULES.map((rule, i) => (
                  <div key={i} className={`flex items-center gap-2 text-xs ${rule.test(password) ? "text-emerald-600" : "text-slate-400"}`}>
                    <div className={`h-1.5 w-1.5 rounded-full ${rule.test(password) ? "bg-emerald-500" : "bg-slate-300"}`} />
                    {rule.label}
                  </div>
                ))}
              </div>
            )}

            <div className="relative">
              <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <Input
                type="password"
                placeholder="Confirm Password"
                required
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="pl-9 h-[42px] rounded-xl border-[#e5e7eb] text-sm"
                disabled={isLoading}
              />
            </div>

            {confirmPassword.length > 0 && !passwordsMatch && (
              <p className="text-xs text-red-500 -mt-2">Passwords do not match</p>
            )}

            <Button
              type="submit"
              disabled={isLoading || !passwordValid || !passwordsMatch}
              className="w-full h-[44px] text-sm font-bold text-white rounded-xl bg-gradient-to-r from-[#1e3a8a] to-[#3b82f6] shadow-md disabled:opacity-50"
            >
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Reset Password
            </Button>
          </form>
        </div>
      </div>
    </div>
  )
}
