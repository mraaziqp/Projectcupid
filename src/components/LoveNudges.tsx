import { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import GlassPanel from "./GlassPanel";
import { notifyPartner } from "../lib/notifications";
import { cn } from "../lib/utils";
import { Send, Sparkles, Heart } from "lucide-react";

interface LoveNudgesProps {
  userId: string;
  userEmail: string;
}

const NUDGES = [
  { text: "Thinking of you... 💭", emoji: "💭", subject: "Thinking of you", body: "Just wanted to let you know you're on my mind! 💭" },
  { text: "Digital Kiss 💋", emoji: "💋", subject: "Digital Kiss", body: "Mwah! Here is a digital kiss just for you! 💋" },
  { text: "Warm Hug 🫂", emoji: "🫂", subject: "Warm Hug", body: "Sending you a giant, warm, digital hug! 🫂" },
  { text: "I miss you 🥺", emoji: "🥺", subject: "I miss you", body: "Counting down the moments until I see you again. 🥺" },
  { text: "You got this! 💪", emoji: "💪", subject: "You got this!", body: "Cheering you on! You're amazing, my love! 💪" },
  { text: "Soft Tickle 🧸", emoji: "🧸", subject: "Soft Tickle", body: "Tickle tickle! Sending you cozy thoughts! 🧸" }
];

const FEELINGS = [
  { text: "Lovesick 💗", emoji: "💗", subject: "Lovesick", body: "I am feeling absolutely lovesick for you right now! 💗" },
  { text: "Calm & Cozy 🌿", emoji: "🌿", subject: "Calm & Cozy", body: "Feeling peaceful, calm, and cozy. 🌿" },
  { text: "Cuddle Monster 🧸", emoji: "🧸", subject: "Cuddle Monster", body: "Warning: Cuddle monster mode activated. Need cuddles! 🧸" },
  { text: "Spicy & Feisty 🔥", emoji: "🔥", subject: "Spicy & Feisty", body: "Feeling a bit spicy and feisty today! 🔥" },
  { text: "Drained & Needs You 🪫", emoji: "🪫", subject: "Drained & Needs You", body: "My battery is running low and I need your warmth. 🪫" },
  { text: "Soft & Mushy 🍮", emoji: "🍮", subject: "Soft & Mushy", body: "Feeling soft, emotional, and super mushy. 🍮" }
];

const EMOJI_OPTIONS = ["❤️", "💋", "🫂", "🥺", "🔥", "✨", "🧸", "🍮", "💭", "🌸", "🌹", "💍", "🍯", "🍫", "🍵", "💌"];

interface Particle {
  id: number;
  emoji: string;
  x: number;
  y: number;
  targetX: number;
  targetY: number;
  scale: number;
  rotate: number;
  duration: number;
}

export default function LoveNudges({ userId, userEmail }: LoveNudgesProps) {
  const [activeTab, setActiveTab] = useState<"nudges" | "feelings">("nudges");
  const [sending, setSending] = useState(false);
  const [status, setStatus] = useState<{ type: "success" | "error"; message: string } | null>(null);

  // Emitter Particle State
  const [particles, setParticles] = useState<Particle[]>([]);

  // Custom composer state
  const [customText, setCustomText] = useState("");
  const [customEmoji, setCustomEmoji] = useState("❤️");
  const [customTheme, setCustomTheme] = useState<"pink" | "teal" | "purple" | "amber">("pink");

  const isMohammed = userEmail === "mraaziqp@gmail.com" || userEmail === "backupe9@gmail.com";
  const senderName = isMohammed ? "Your Husband" : "Your Wife";
  const partnerName = isMohammed ? "Razia" : "Mohammed";

  const triggerParticleBurst = (emoji: string, event?: React.MouseEvent<HTMLButtonElement>) => {
    let startX = 150;
    let startY = 100;
    
    if (event) {
      const rect = event.currentTarget.getBoundingClientRect();
      const parentRect = event.currentTarget.parentElement?.getBoundingClientRect();
      if (parentRect) {
        startX = event.clientX - parentRect.left;
        startY = event.clientY - parentRect.top;
      } else {
        startX = event.clientX - rect.left;
        startY = event.clientY - rect.top;
      }
    }

    const count = 10;
    const newParticles = Array.from({ length: count }, (_, i) => {
      const angle = Math.random() * Math.PI * 2;
      const velocity = 40 + Math.random() * 80;
      return {
        id: Math.random() + Date.now() + i,
        emoji,
        x: startX,
        y: startY,
        targetX: startX + Math.cos(angle) * velocity,
        targetY: startY - (80 + Math.random() * 80),
        scale: Math.random() * 0.7 + 0.7,
        rotate: (Math.random() - 0.5) * 90,
        duration: 0.8 + Math.random() * 0.7
      };
    });

    setParticles((prev) => [...prev, ...newParticles]);
    setTimeout(() => {
      setParticles((prev) => prev.filter((p) => !newParticles.find((n) => n.id === p.id)));
    }, 2000);
  };

  const handleSendNudge = async (nudgeText: string, bodyText: string, emoji: string, event: React.MouseEvent<HTMLButtonElement>) => {
    if (sending) return;
    setSending(true);
    setStatus(null);
    triggerParticleBurst(emoji, event);

    try {
      await notifyPartner(
        userId,
        `${senderName} sent you a Nudge`,
        bodyText,
        senderName,
        "nudge"
      );

      // Trigger Resend email API too
      fetch("/api/notify-robust", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId,
          title: `${senderName} sent you a Nudge`,
          body: bodyText,
          senderName,
          theme: "nudge"
        })
      }).catch(err => console.error("Email send warning:", err));

      setStatus({
        type: "success",
        message: `Nudge "${nudgeText}" sent to ${partnerName}! 💕`
      });
      setTimeout(() => setStatus(null), 4000);
    } catch (error) {
      console.error(error);
      setStatus({
        type: "error",
        message: "Failed to transmit nudge. Please try again."
      });
    } finally {
      setSending(false);
    }
  };

  const handleSendFeeling = async (feelingText: string, bodyText: string, emoji: string, event: React.MouseEvent<HTMLButtonElement>) => {
    if (sending) return;
    setSending(true);
    setStatus(null);
    triggerParticleBurst(emoji, event);

    try {
      await notifyPartner(
        userId,
        `${senderName} is feeling ${feelingText}`,
        bodyText,
        senderName,
        "feeling"
      );

      fetch("/api/notify-robust", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId,
          title: `${senderName} is feeling ${feelingText}`,
          body: bodyText,
          senderName,
          theme: "feeling"
        })
      }).catch(err => console.error("Email send warning:", err));

      setStatus({
        type: "success",
        message: `Shared that you are feeling "${feelingText}" with ${partnerName}! ✨`
      });
      setTimeout(() => setStatus(null), 4000);
    } catch (error) {
      console.error(error);
      setStatus({
        type: "error",
        message: "Failed to share feeling. Please try again."
      });
    } finally {
      setSending(false);
    }
  };

  const handleSendCustom = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customText.trim() || sending) return;
    setSending(true);
    setStatus(null);

    const bodyText = `${customEmoji} ${customText.trim()}`;
    const subjectText = `${senderName} sent you a Custom Vibe`;

    try {
      await notifyPartner(
        userId,
        subjectText,
        bodyText,
        senderName,
        customTheme === "pink" ? "nudge" : customTheme === "purple" ? "feeling" : "general"
      );

      // Email dispatch
      fetch("/api/notify-robust", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId,
          title: subjectText,
          body: bodyText,
          senderName,
          theme: customTheme === "pink" ? "nudge" : customTheme === "purple" ? "feeling" : "general"
        })
      }).catch(err => console.error("Custom email send failed:", err));

      triggerParticleBurst(customEmoji);
      setCustomText("");

      setStatus({
        type: "success",
        message: `Custom vibe "${customEmoji} ${customText.substring(0, 12)}..." shared with ${partnerName}! 💖`
      });
      setTimeout(() => setStatus(null), 4000);
    } catch (error) {
      console.error(error);
      setStatus({
        type: "error",
        message: "Failed to send custom vibe."
      });
    } finally {
      setSending(false);
    }
  };

  const themeClasses = {
    pink: "from-rose-500/10 via-pink-500/5 to-transparent border-pink-500/30 text-pink-300 shadow-pink-500/5",
    teal: "from-emerald-500/10 via-teal-500/5 to-transparent border-teal-500/30 text-teal-300 shadow-teal-500/5",
    purple: "from-purple-500/10 via-indigo-500/5 to-transparent border-purple-500/30 text-purple-300 shadow-purple-500/5",
    amber: "from-amber-500/10 via-yellow-500/5 to-transparent border-amber-500/30 text-amber-300 shadow-amber-500/5",
  };

  const activeVibeColor = {
    pink: "bg-pink-500 border-pink-500/30 text-white",
    teal: "bg-teal-500 border-teal-500/30 text-white",
    purple: "bg-purple-500 border-purple-500/30 text-white",
    amber: "bg-amber-500 border-amber-500/30 text-white",
  };

  return (
    <GlassPanel className="p-8 space-y-8 relative overflow-hidden group">
      {/* Background radial glow */}
      <div className="absolute -top-12 -right-12 w-32 h-32 bg-pink-500/5 blur-3xl rounded-full pointer-events-none transition-all duration-700 group-hover:bg-pink-500/10" />

      {/* Particle Overlay */}
      <div className="absolute inset-0 pointer-events-none z-50 overflow-hidden">
        <AnimatePresence>
          {particles.map((p) => (
            <motion.span
              key={p.id}
              initial={{ x: p.x, y: p.y, scale: 0, opacity: 1, rotate: 0 }}
              animate={{
                x: p.targetX,
                y: p.targetY,
                scale: p.scale,
                rotate: p.rotate,
                opacity: [1, 0.9, 0],
              }}
              exit={{ opacity: 0 }}
              transition={{ duration: p.duration, ease: "easeOut" }}
              className="absolute text-2xl select-none"
            >
              {p.emoji}
            </motion.span>
          ))}
        </AnimatePresence>
      </div>
      
      <div className="space-y-1">
        <p className="text-[10px] uppercase tracking-[0.4em] text-pink-500 font-bold">Cupid Connect</p>
        <h2 className="text-3xl font-light italic font-serif text-white">Love Signals</h2>
        <p className="text-xs text-white/40">Transmit quick signals or draft a custom postcard alert directly to her inbox and screen.</p>
      </div>

      {/* Tabs */}
      <div className="flex bg-white/5 p-1 rounded-2xl border border-white/5 relative z-10">
        <button
          onClick={() => setActiveTab("nudges")}
          className={cn(
            "flex-1 py-2.5 text-xs font-bold uppercase tracking-wider rounded-xl transition-all cursor-pointer",
            activeTab === "nudges" ? "bg-white text-black shadow-md font-semibold" : "text-white/40 hover:text-white"
          )}
        >
          Love Nudges
        </button>
        <button
          onClick={() => setActiveTab("feelings")}
          className={cn(
            "flex-1 py-2.5 text-xs font-bold uppercase tracking-wider rounded-xl transition-all cursor-pointer",
            activeTab === "feelings" ? "bg-white text-black shadow-md font-semibold" : "text-white/40 hover:text-white"
          )}
        >
          My Feelings
        </button>
      </div>

      {/* Grid Container */}
      <div className="relative">
        <AnimatePresence mode="wait">
          {activeTab === "nudges" ? (
            <motion.div
              key="nudges"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="grid grid-cols-2 md:grid-cols-3 gap-4"
            >
              {NUDGES.map((nudge) => (
                <button
                  key={nudge.text}
                  disabled={sending}
                  onClick={(e) => handleSendNudge(nudge.text, nudge.body, nudge.emoji, e)}
                  className="p-4 bg-white/5 border border-white/10 hover:border-pink-500/30 hover:bg-pink-500/5 rounded-2xl text-left transition-all duration-300 group flex flex-col justify-between h-24 cursor-pointer active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed shadow-md hover:shadow-lg"
                >
                  <span className="text-[9px] uppercase tracking-widest text-white/20 group-hover:text-pink-400 font-bold transition-colors">Transmit Nudge</span>
                  <span className="text-sm font-medium text-white/80 group-hover:text-white line-clamp-2 transition-all">{nudge.text}</span>
                </button>
              ))}
            </motion.div>
          ) : (
            <motion.div
              key="feelings"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="grid grid-cols-2 md:grid-cols-3 gap-4"
            >
              {FEELINGS.map((feeling) => (
                <button
                  key={feeling.text}
                  disabled={sending}
                  onClick={(e) => handleSendFeeling(feeling.text, feeling.body, feeling.emoji, e)}
                  className="p-4 bg-white/5 border border-white/10 hover:border-purple-500/30 hover:bg-purple-500/5 rounded-2xl text-left transition-all duration-300 group flex flex-col justify-between h-24 cursor-pointer active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed shadow-md hover:shadow-lg"
                >
                  <span className="text-[9px] uppercase tracking-widest text-white/20 group-hover:text-purple-400 font-bold transition-colors">Broadcast Vibe</span>
                  <span className="text-sm font-medium text-white/80 group-hover:text-white line-clamp-2 transition-all">{feeling.text}</span>
                </button>
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Custom Composer & Postcard Preview */}
      <div className="border-t border-white/5 pt-8 space-y-6">
        <div className="flex items-center gap-2">
          <Sparkles size={14} className="text-pink-500 animate-pulse" />
          <h3 className="text-[10px] font-bold uppercase tracking-widest text-white/40">Custom Digital Postcard Composer</h3>
        </div>

        <div className="flex flex-col xl:flex-row gap-6">
          {/* Postcard Customizer Inputs */}
          <form onSubmit={handleSendCustom} className="flex-1 space-y-4">
            <div className="space-y-2">
              <label className="text-xs text-white/50 font-semibold">1. Choose Postcard Theme</label>
              <div className="flex gap-2">
                {(["pink", "teal", "purple", "amber"] as const).map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setCustomTheme(t)}
                    className={cn(
                      "flex-1 py-1.5 rounded-lg border text-[10px] uppercase font-bold tracking-widest transition-all cursor-pointer",
                      customTheme === t 
                        ? activeVibeColor[t]
                        : "bg-white/5 border-transparent text-white/40 hover:bg-white/10"
                    )}
                  >
                    {t}
                  </button>
                ))}
              </div>
            </div>

            {/* Emoji Grid */}
            <div className="space-y-2">
              <label className="text-xs text-white/50 font-semibold">2. Select Postcard Stamp Emoji</label>
              <div className="grid grid-cols-8 gap-2 bg-white/3 p-2.5 rounded-xl border border-white/5">
                {EMOJI_OPTIONS.map((emo) => (
                  <button
                    key={emo}
                    type="button"
                    onClick={() => setCustomEmoji(emo)}
                    className={cn(
                      "w-8 h-8 rounded-lg flex items-center justify-center text-lg transition-transform hover:scale-125 cursor-pointer active:scale-95",
                      customEmoji === emo ? "bg-white/15 border border-white/20 scale-110" : ""
                    )}
                  >
                    {emo}
                  </button>
                ))}
              </div>
            </div>

            {/* Text Input */}
            <div className="space-y-2">
              <label className="text-xs text-white/50 font-semibold">3. Craft Custom Message</label>
              <div className="relative">
                <input
                  type="text"
                  value={customText}
                  onChange={(e) => setCustomText(e.target.value.slice(0, 100))}
                  placeholder="Type a loving message for her..."
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-white/20 focus:ring-1 focus:ring-white/10 placeholder:text-white/25 pr-12 shadow-inner"
                />
                <button
                  type="submit"
                  disabled={sending || !customText.trim()}
                  className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-lg bg-white text-black hover:bg-pink-100 flex items-center justify-center transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  <Send size={14} />
                </button>
              </div>
              <p className="text-[9px] uppercase tracking-wider text-white/20 text-right">{customText.length}/100 characters</p>
            </div>
          </form>

          {/* Digital Card Preview (Glassmorphic post card) */}
          <div className="w-full xl:w-72 flex flex-col items-center justify-center">
            <p className="text-[9px] uppercase tracking-widest text-white/20 font-bold mb-3">Live Postcard Preview</p>
            
            <motion.div
              style={{ perspective: 1000 }}
              whileHover={{ rotateY: 3, rotateX: -3, scale: 1.02 }}
              className={cn(
                "w-full h-44 rounded-3xl p-5 border bg-gradient-to-br flex flex-col justify-between relative overflow-hidden transition-all duration-500 shadow-2xl backdrop-blur-md",
                themeClasses[customTheme]
              )}
            >
              {/* Star backdrop decoration */}
              <div className="absolute inset-0 pointer-events-none opacity-20">
                <span className="absolute top-2 left-6 text-[8px] animate-pulse">✦</span>
                <span className="absolute bottom-6 right-8 text-[6px] animate-pulse" style={{ animationDelay: '1s' }}>✦</span>
              </div>

              {/* Top part: stamp & header */}
              <div className="flex justify-between items-start">
                <div>
                  <h4 className="text-[10px] uppercase tracking-[0.2em] opacity-40 font-bold">Cupid Postcard</h4>
                  <p className="text-[8px] opacity-30 tracking-wider">Cape Town Office</p>
                </div>
                
                {/* Stamp */}
                <div className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-xl shadow-lg relative">
                  <div className="absolute inset-0 border border-dashed border-white/20 rounded-lg m-0.5" />
                  {customEmoji}
                </div>
              </div>

              {/* Middle: message content */}
              <div className="my-2 max-h-16 overflow-y-auto custom-scrollbar">
                <p className="text-sm font-serif italic text-white/95 leading-snug break-words">
                  "{customText.trim() || "Your message will appear here..."}"
                </p>
              </div>

              {/* Bottom part: names */}
              <div className="flex justify-between items-end border-t border-white/5 pt-2">
                <span className="text-[8px] opacity-40 uppercase tracking-widest">From: {senderName}</span>
                <span className="text-[8px] opacity-40 uppercase tracking-widest">To: {partnerName}</span>
              </div>
            </motion.div>
          </div>
        </div>
      </div>

      {status && (
        <div
          className={cn(
            "p-3.5 rounded-2xl text-center text-xs animate-pulse font-medium border relative z-10",
            status.type === "success" 
              ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400" 
              : "bg-rose-500/10 border-rose-500/20 text-rose-400"
          )}
        >
          {status.message}
        </div>
      )}
    </GlassPanel>
  );
}
