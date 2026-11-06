import { useState, useEffect } from "react";
import { Lock, Heart } from "lucide-react";
import GlassPanel from "./GlassPanel";
import { motion, AnimatePresence } from "motion/react";

const CORRECT_PASSWORD = "0408";

export default function PasswordGate({ children }: { children: React.ReactNode }) {
  const [password, setPassword] = useState("");
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [error, setError] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem("cupid_unlocked");
    if (saved === "true") {
      setIsUnlocked(true);
    }
  }, []);

  const tryKey = (value: string) => {
    if (value === CORRECT_PASSWORD) {
      setIsUnlocked(true);
      localStorage.setItem("cupid_unlocked", "true");
    } else {
      setError(true);
      setTimeout(() => setError(false), 500);
      setPassword("");
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    tryKey(password);
  };

  if (isUnlocked) return <>{children}</>;

  return (
    <div className="min-h-[100dvh] flex flex-col items-center justify-center gap-6 p-6 bg-neutral-950 relative overflow-hidden">
      {/* Background blobs to match theme */}
      <div className="absolute top-[-10%] left-[-10%] w-[60%] h-[60%] rounded-full bg-purple-900/20 blur-[120px] pointer-events-none"></div>
      <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] rounded-full bg-blue-900/10 blur-[100px] pointer-events-none"></div>

      <GlassPanel className="max-w-sm w-full p-10 text-center space-y-8 shadow-[0_0_50px_rgba(236,72,153,0.1)]">
        <motion.div
           animate={error ? { x: [-10, 10, -10, 10, 0] } : {}}
           className="mx-auto w-16 h-16 bg-white/5 border border-white/10 rounded-2xl flex items-center justify-center"
        >
          <Lock className={error ? "text-rose-500" : "text-white/40"} />
        </motion.div>

        <div className="space-y-2">
          <h1 className="text-3xl font-serif italic text-white">Private Space</h1>
          <p className="text-sm text-white/30 uppercase tracking-widest">Enter the Connection Key</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <input
            type="password"
            value={password}
            onChange={(e) => {
              const v = e.target.value.replace(/\D/g, "").slice(0, 4);
              setPassword(v);
              if (v.length === 4) tryKey(v);
            }}
            inputMode="numeric"
            pattern="[0-9]*"
            autoComplete="off"
            aria-label="Connection key"
            autoFocus
            maxLength={4}
            placeholder="••••"
            className="w-full bg-white/5 border border-white/10 rounded-xl py-4 pl-[0.6em] text-center text-3xl tracking-[0.6em] text-white focus:outline-none focus:border-pink-500/50 transition-colors placeholder:text-white/5"
          />
          <button
            type="submit"
            className="w-full bg-white text-black font-bold py-4 rounded-xl hover:bg-pink-100 transition-all uppercase tracking-widest text-xs"
          >
            Unlock
          </button>
        </form>

        <div className="pt-4 flex justify-center gap-1">
           {[...Array(4)].map((_, i) => (
             <div 
               key={i} 
               className={`w-2 h-2 rounded-full transition-colors ${password.length > i ? 'bg-pink-500' : 'bg-white/10'}`} 
             />
           ))}
        </div>
      </GlassPanel>
      
      <div className="text-[11px] text-white/40 uppercase tracking-[0.25em] flex items-center gap-2 whitespace-nowrap">
        Protected <Heart size={10} fill="currentColor" /> Project Cupid
      </div>
    </div>
  );
}
