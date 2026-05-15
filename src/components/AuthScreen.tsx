import { useState } from "react";
import { Heart, LogIn } from "lucide-react";
import { signIn } from "../lib/firebase";
import GlassPanel from "./GlassPanel";
import { motion } from "motion/react";

export default function AuthScreen() {
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    setLoading(true);
    try {
      await signIn();
    } catch (error) {
      console.error(error);
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

        <button
          onClick={handleLogin}
          disabled={loading}
          className="w-full flex items-center justify-center gap-3 bg-white text-black font-semibold py-4 rounded-xl hover:bg-neutral-200 transition-colors disabled:opacity-50"
        >
          <LogIn className="w-5 h-5" />
          {loading ? "Connecting..." : "Sign in to Enter"}
        </button>

        <p className="text-xs text-neutral-500 uppercase tracking-widest pt-4">
          Strictly Private • Forever Secure
        </p>
      </GlassPanel>
    </div>
  );
}
