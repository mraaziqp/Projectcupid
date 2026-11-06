import { useState } from "react";
import { Heart, LogIn, KeyRound } from "lucide-react";
import { signIn, signInWithSaveState } from "../lib/firebase";
import GlassPanel from "./GlassPanel";
import { motion } from "motion/react";

export default function AuthScreen() {
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState<"savestate" | "google" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notLinked, setNotLinked] = useState(false);

  const handleSaveState = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading("savestate");
    setError(null);
    setNotLinked(false);
    try {
      await signInWithSaveState(identifier.trim(), password);
    } catch (err: any) {
      setError(err?.message || "Sign in failed. Please try again.");
      setNotLinked(err?.code === "not_linked");
      setPassword("");
    } finally {
      setLoading(null);
    }
  };

  const handleGoogle = async () => {
    setLoading("google");
    setError(null);
    try {
      await signIn();
    } catch (err: any) {
      setError(err?.message || "Google sign in failed. Please try again.");
    } finally {
      setLoading(null);
    }
  };

  return (
    <div className="min-h-[100dvh] flex items-center justify-center p-4 sm:p-6">
      <GlassPanel className="max-w-md w-full p-6 sm:p-8 text-center space-y-6">
        <motion.div
          initial={{ scale: 0.8, rotate: -10 }}
          animate={{ scale: 1, rotate: 0 }}
          transition={{ duration: 1 }}
          className="mx-auto w-16 h-16 bg-rose-500/20 rounded-2xl flex items-center justify-center"
        >
          <Heart className="w-8 h-8 text-rose-500 fill-rose-500/50" />
        </motion.div>

        <div className="space-y-3">
          <h1 className="text-4xl font-serif text-white tracking-tight">Project Cupid</h1>
          <p className="text-neutral-400">A private space for our most beautiful connection.</p>
        </div>

        <form onSubmit={handleSaveState} className="space-y-3 text-left">
          <label className="block text-[11px] uppercase tracking-widest text-white/50">Sign in with your SaveState account</label>
          <input
            value={identifier}
            onChange={(e) => setIdentifier(e.target.value)}
            placeholder="SaveState username"
            autoComplete="username"
            autoCapitalize="none"
            className="w-full px-4 py-3.5 rounded-xl bg-white/5 border border-white/10 text-white placeholder:text-white/30 focus:outline-none focus:border-rose-400/50"
            required
          />
          <input
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            type="password"
            placeholder="Password"
            autoComplete="current-password"
            className="w-full px-4 py-3.5 rounded-xl bg-white/5 border border-white/10 text-white placeholder:text-white/30 focus:outline-none focus:border-rose-400/50"
            required
          />
          <button
            type="submit"
            disabled={!!loading}
            className="w-full flex items-center justify-center gap-3 bg-white text-black font-semibold py-4 rounded-xl hover:bg-neutral-200 transition-colors disabled:opacity-50"
          >
            <KeyRound className="w-5 h-5" />
            {loading === "savestate" ? "Checking with SaveState…" : "Enter"}
          </button>
        </form>

        <div className="flex items-center gap-3 text-[11px] text-white/30 uppercase tracking-widest">
          <span className="flex-1 h-px bg-white/10" /> or <span className="flex-1 h-px bg-white/10" />
        </div>

        <button
          onClick={handleGoogle}
          disabled={!!loading}
          className="w-full flex items-center justify-center gap-2 bg-white/5 border border-white/10 text-white/80 text-sm py-3 rounded-xl hover:bg-white/10 transition-colors disabled:opacity-50"
        >
          <LogIn className="w-4 h-4" />
          {loading === "google" ? "Connecting…" : "Sign in with Google"}
        </button>

        {error && (
          <div className="text-sm text-rose-300 bg-rose-950/40 border border-rose-500/30 rounded-lg p-3 text-left space-y-1">
            <p>{error}</p>
            {notLinked && <p className="text-xs text-rose-200/80">Sign in with Google once, then open Settings → SaveState to link your account.</p>}
          </div>
        )}

        <p className="text-xs text-neutral-500 uppercase tracking-widest pt-2">Strictly Private • Forever Secure</p>
      </GlassPanel>
    </div>
  );
}
