import { useState } from "react";
import { Heart, LogIn, Sparkles } from "lucide-react";
import { signIn, signInAsTest } from "../lib/firebase";
import GlassPanel from "./GlassPanel";
import { motion } from "motion/react";

export default function AuthScreen() {
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleLogin = async () => {
    setLoading(true);
    setErrorMessage(null);
    try {
      await signIn();
    } catch (error: any) {
      console.error(error);
      setErrorMessage(error?.message || "Sign in failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };


  return (
    <div className="min-h-screen flex items-center justify-center p-6">
      <GlassPanel className="max-w-md w-full p-8 text-center space-y-8">
        <motion.div
           initial={{ scale: 0.8, rotate: -10 }}
           animate={{ scale: 1, rotate: 0 }}
           transition={{ duration: 1, repeat: Infinity, repeatType: "reverse" }}
           className="mx-auto w-16 h-16 bg-rose-500/20 rounded-2xl flex items-center justify-center"
        >
          <Heart className="w-8 h-8 text-rose-500 fill-rose-500/50" />
        </motion.div>
        
        <div className="space-y-4">
          <h1 className="text-4xl font-serif text-white tracking-tight">Project Cupid</h1>
          <p className="text-neutral-400">
            A private space for our most beautiful connection.
          </p>
        </div>

        <div className="space-y-3">
          <button
            onClick={handleLogin}
            disabled={loading}
            className="w-full flex items-center justify-center gap-3 bg-white text-black font-semibold py-4 rounded-xl hover:bg-neutral-200 transition-colors disabled:opacity-50"
          >
            <LogIn className="w-5 h-5" />
            {loading ? "Connecting..." : "Sign in to Enter"}
          </button>

        </div>

        {errorMessage && (
          <p className="text-sm text-rose-300 bg-rose-950/40 border border-rose-500/30 rounded-lg p-3">
            {errorMessage}
          </p>
        )}

        <p className="text-xs text-neutral-500 uppercase tracking-widest pt-4">
          Strictly Private • Forever Secure
        </p>
      </GlassPanel>
    </div>
  );
}
