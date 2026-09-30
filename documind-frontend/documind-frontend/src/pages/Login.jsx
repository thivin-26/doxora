import { useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { Mail, Lock, ArrowRight, Loader2, Sparkles, KeyRound } from "lucide-react";
import Button from "../components/Button";
import { useAuth } from "../context/useAuth";

export default function Login() {
  const [params] = useSearchParams();
  const [mode, setMode] = useState(params.get("mode") === "signup" ? "signup" : "login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [showForgot, setShowForgot] = useState(false);

  const { signInWithPassword, signUp, signInWithGoogle, resetPassword, isDemoMode } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setNotice("");
    setLoading(true);
    try {
      if (showForgot) {
        const { error: resetErr } = await resetPassword(email);
        if (resetErr) throw resetErr;
        setNotice("Password reset link sent! Check your inbox.");
        setShowForgot(false);
      } else if (mode === "login") {
        const { error: loginErr } = await signInWithPassword(email, password);
        if (loginErr) throw loginErr;
        navigate("/dashboard");
      } else {
        const { error: signupErr } = await signUp(email, password);
        if (signupErr) throw signupErr;
        navigate("/dashboard");
      }
    } catch (err) {
      setError(err.message || "Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setError("");
    setNotice("");
    setGoogleLoading(true);
    try {
      const { error: googleErr } = await signInWithGoogle();
      if (googleErr) throw googleErr;
      navigate("/dashboard");
    } catch (err) {
      setError(err.message || "Failed to sign in with Google.");
    } finally {
      setGoogleLoading(false);
    }
  };

  return (
    <div className="min-h-dvh bg-ink-950 bg-grid flex items-center justify-center px-5 py-16 relative overflow-hidden">
      {/* Background ambient lighting */}
      <div className="absolute top-1/3 left-1/2 -translate-x-1/2 h-[420px] w-[700px] rounded-full bg-amber-500/10 blur-[140px] pointer-events-none" />
      <div className="absolute top-1/4 -left-20 h-[300px] w-[300px] rounded-full bg-yellow-400/8 blur-[100px] pointer-events-none" />

      <div className="relative w-full max-w-md z-10">
        <Link to="/" className="flex items-center justify-center gap-3 mb-8 group">
          <img
            src="/doxora-logo.png"
            alt="DOXORA Logo"
            className="h-12 w-auto object-contain mix-blend-screen group-hover:scale-105 transition-transform"
          />
          <div className="flex flex-col text-left">
            <span className="font-display font-extrabold text-2xl text-gold-royal tracking-[0.2em] leading-none">
              DOXORA
            </span>
            <span className="text-[9px] font-semibold text-amber-400/80 tracking-[0.25em] uppercase mt-0.5">
              AI DOCUMENT STUDIO
            </span>
          </div>
        </Link>

        <div className="rounded-2xl border border-amber-400/30 bg-ink-800/85 backdrop-blur-xl p-8 shadow-[0_0_40px_rgba(247,210,104,0.12)]">
          <h1 className="font-display text-2xl font-bold text-white text-center mb-1">
            {showForgot
              ? "Reset your password"
              : mode === "login"
              ? "Welcome back"
              : "Create your royal account"}
          </h1>
          <p className="text-xs text-ink-300 text-center mb-6">
            {showForgot
              ? "Enter your email to receive a password reset link."
              : mode === "login"
              ? "Sign in to access your sovereign documents and AI sessions."
              : "Start parsing, chatting, and synthesizing documents instantly."}
          </p>

          {isDemoMode && (
            <div className="mb-5 rounded-xl border border-amber-400/30 bg-amber-500/10 px-4 py-2.5 text-xs text-amber-200 flex items-center gap-2">
              <Sparkles size={15} className="shrink-0 text-amber-400" />
              <span>Firebase Ready: Instant local demo enabled. Add Firebase keys in <code className="text-amber-300 font-mono">.env</code> to link live project.</span>
            </div>
          )}

          {error && (
            <div className="mb-5 rounded-xl border border-red-400/30 bg-red-500/15 px-4 py-2.5 text-xs text-red-200">
              {error}
            </div>
          )}
          {notice && (
            <div className="mb-5 rounded-xl border border-emerald-400/30 bg-emerald-500/15 px-4 py-2.5 text-xs text-emerald-200">
              {notice}
            </div>
          )}

          {/* Social Sign In Options */}
          {!showForgot && (
            <>
              <button
                type="button"
                onClick={handleGoogleSignIn}
                disabled={googleLoading || loading}
                className="w-full h-11 rounded-xl bg-ink-900/90 border border-white/10 hover:border-amber-400/50 hover:bg-white/5 transition-all text-xs font-semibold text-white flex items-center justify-center gap-3 cursor-pointer shadow-sm mb-4"
              >
                {googleLoading ? (
                  <Loader2 size={16} className="animate-spin text-amber-400" />
                ) : (
                  <svg className="w-4 h-4" viewBox="0 0 24 24">
                    <path
                      fill="#4285F4"
                      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                    />
                    <path
                      fill="#34A853"
                      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                    />
                    <path
                      fill="#FBBC05"
                      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                    />
                    <path
                      fill="#EA4335"
                      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                    />
                  </svg>
                )}
                <span>Continue with Google</span>
              </button>

              <div className="relative my-5">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-white/10" />
                </div>
                <div className="relative flex justify-center text-[10px] uppercase">
                  <span className="bg-ink-850 px-3 text-ink-400 font-medium">Or continue with email</span>
                </div>
              </div>
            </>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="email" className="block text-xs font-medium text-ink-200 mb-1.5">
                Email address
              </label>
              <div className="relative">
                <Mail size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-400" />
                <input
                  id="email"
                  type="email"
                  required
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  className="w-full h-11 rounded-xl bg-ink-900/90 border border-white/10 pl-10 pr-4 text-xs text-white placeholder:text-ink-500 focus:outline-none focus:ring-2 focus:ring-amber-400 focus:border-transparent transition-all"
                />
              </div>
            </div>

            {!showForgot && (
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label htmlFor="password" className="block text-xs font-medium text-ink-200">
                    Password
                  </label>
                  {mode === "login" && (
                    <button
                      type="button"
                      onClick={() => setShowForgot(true)}
                      className="text-[11px] text-amber-400 hover:text-amber-300 transition-colors"
                    >
                      Forgot password?
                    </button>
                  )}
                </div>
                <div className="relative">
                  <Lock size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-400" />
                  <input
                    id="password"
                    type="password"
                    required
                    minLength={6}
                    autoComplete={mode === "login" ? "current-password" : "new-password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full h-11 rounded-xl bg-ink-900/90 border border-white/10 pl-10 pr-4 text-xs text-white placeholder:text-ink-500 focus:outline-none focus:ring-2 focus:ring-amber-400 focus:border-transparent transition-all"
                  />
                </div>
              </div>
            )}

            <Button type="submit" className="w-full mt-2 shadow-[0_0_20px_rgba(230,184,59,0.3)]" disabled={loading}>
              {loading ? (
                <Loader2 size={16} className="animate-spin" />
              ) : showForgot ? (
                <>
                  Send Reset Link <KeyRound size={15} />
                </>
              ) : (
                <>
                  {mode === "login" ? "Log in" : "Sign up"} <ArrowRight size={15} />
                </>
              )}
            </Button>
          </form>

          {showForgot ? (
            <p className="mt-5 text-center text-xs text-ink-400">
              Remembered your password?{" "}
              <button
                type="button"
                className="text-amber-400 hover:text-amber-300 font-medium cursor-pointer"
                onClick={() => setShowForgot(false)}
              >
                Back to log in
              </button>
            </p>
          ) : (
            <p className="mt-6 text-center text-xs text-ink-400">
              {mode === "login" ? "Don't have an account?" : "Already have an account?"}{" "}
              <button
                type="button"
                className="text-amber-400 hover:text-amber-300 font-medium cursor-pointer"
                onClick={() => {
                  setError("");
                  setNotice("");
                  setMode(mode === "login" ? "signup" : "login");
                }}
              >
                {mode === "login" ? "Sign up" : "Log in"}
              </button>
            </p>
          )}
        </div>

        <p className="mt-6 text-center text-xs text-ink-400">
          <Link to="/" className="hover:text-amber-300 transition-colors">
            ← Back to home
          </Link>
        </p>
      </div>
    </div>
  );
}
