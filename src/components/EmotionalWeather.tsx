import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Zap, Battery, BatteryMedium, BatteryLow, BatteryWarning, Heart, Sparkles, Wind, Droplets, Star, Coffee, Moon, Flame, Ghost, Cloudy, Smile, Music, User, UserPlus } from "lucide-react";
import GlassPanel from "./GlassPanel";
import { db, handleFirestoreError, OperationType } from "../lib/firebase";
import { collection, query, where, onSnapshot, setDoc, doc, Timestamp } from "firebase/firestore";
import { format } from "date-fns";
import { cn } from "../lib/utils";
import { notifyPartner } from "../lib/notifications";

interface WeatherData {
  userId: string;
  socialBattery: number;
  emotion: string;
  connectionBid?: string;
  note?: string;
  updatedAt: any;
}

interface FloatingParticle {
  id: number;
  emoji: string;
  left: string;
  top: string;
  scale: number;
  duration: number;
  delay: number;
}

const EMOTIONS = [
  { label: "Energized ✨", icon: Sparkles, color: "text-amber-400", bg: "bg-amber-400/10", border: "border-amber-400/20" },
  { label: "Calm & Cozy 🌿", icon: Wind, color: "text-emerald-400", bg: "bg-emerald-400/10", border: "border-emerald-400/20" },
  { label: "Lovesick 💗", icon: Heart, color: "text-rose-400", bg: "bg-rose-400/10", border: "border-rose-400/20" },
  { label: "I Miss You 🥺", icon: Heart, color: "text-pink-400", bg: "bg-pink-400/10", border: "border-pink-400/20" },
  { label: "On Cloud 9 ☁️", icon: Star, color: "text-sky-300", bg: "bg-sky-300/10", border: "border-sky-300/20" },
  { label: "Silly & Goofy 🤪", icon: Smile, color: "text-yellow-400", bg: "bg-yellow-400/10", border: "border-yellow-400/20" },
  { label: "Soft & Mushy 🍮", icon: Moon, color: "text-purple-300", bg: "bg-purple-300/10", border: "border-purple-300/20" },
  { label: "Spicy & Feisty 🔥", icon: Flame, color: "text-orange-400", bg: "bg-orange-400/10", border: "border-orange-400/20" },
  { label: "Overwhelmed 🌊", icon: Zap, color: "text-indigo-400", bg: "bg-indigo-400/10", border: "border-indigo-400/20" },
  { label: "Drained 🪫", icon: Droplets, color: "text-blue-400", bg: "bg-blue-400/10", border: "border-blue-400/20" },
  { label: "Need a Hug 🫂", icon: Cloudy, color: "text-violet-300", bg: "bg-violet-300/10", border: "border-violet-300/20" },
  { label: "Brain Full 🫠", icon: Ghost, color: "text-slate-400", bg: "bg-slate-400/10", border: "border-slate-400/20" },
  { label: "Caffeinated ☕", icon: Coffee, color: "text-amber-600", bg: "bg-amber-600/10", border: "border-amber-600/20" },
  { label: "In My Feels 🎵", icon: Music, color: "text-fuchsia-400", bg: "bg-fuchsia-400/10", border: "border-fuchsia-400/20" },
];

const CONNECTION_BIDS = [
  "Listen to me",
  "Reassure me",
  "Hug me tight",
  "Spend quality time",
  "Pray with me",
  "Make me laugh",
  "Tell me I'm pretty",
  "Dance with me",
  "Just sit with me",
  "Send me a voice note",
  "Cook something together",
  "Watch something silly",
];

export default function EmotionalWeather({ userId, userEmail }: { userId: string; userEmail: string }) {
  const [myWeather, setMyWeather] = useState<WeatherData | null>(null);
  const [partnerWeather, setPartnerWeather] = useState<WeatherData | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [draftBattery, setDraftBattery] = useState(50);
  const [draftEmotion, setDraftEmotion] = useState("Calm & Cozy 🌿");
  const [draftConnectionBid, setDraftConnectionBid] = useState("");
  const [draftNote, setDraftNote] = useState("");
  const today = format(new Date(), 'yyyy-MM-dd');

  // Floating Particles based on selected emotion
  const [floatingParticles, setFloatingParticles] = useState<FloatingParticle[]>([]);

  useEffect(() => {
    // Listen for today's weather for both users
    const q = query(
      collection(db, "weather"),
      where("date", "==", today)
    );

    return onSnapshot(q, (snapshot) => {
      let nextMyWeather: WeatherData | null = null;
      let nextPartnerWeather: WeatherData | null = null;
      snapshot.docs.forEach(doc => {
        const data = doc.data() as WeatherData;
        if (data.userId === userId) {
          nextMyWeather = data;
        } else {
          nextPartnerWeather = data;
        }
      });
      setMyWeather(nextMyWeather);
      setPartnerWeather(nextPartnerWeather);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, "weather");
    });
  }, [userId, today]);

  useEffect(() => {
    if (!myWeather) return;
    setDraftBattery(myWeather.socialBattery ?? 50);
    setDraftEmotion(myWeather.emotion || "Calm & Cozy 🌿");
    setDraftConnectionBid(myWeather.connectionBid || "");
    setDraftNote(myWeather.note || "");
  }, [myWeather]);

  // Update floating particles when active emotion changes
  useEffect(() => {
    const emojiMatch = draftEmotion.match(/[\p{Emoji}\u200d]+/gu);
    const emoji = emojiMatch ? emojiMatch[0] : "✨";
    const newParticles = Array.from({ length: 10 }, (_, i) => ({
      id: i,
      emoji,
      left: `${10 + Math.random() * 80}%`,
      top: `${15 + Math.random() * 70}%`,
      scale: Math.random() * 0.6 + 0.5,
      duration: Math.random() * 6 + 6,
      delay: Math.random() * -5,
    }));
    setFloatingParticles(newParticles);
  }, [draftEmotion]);

  const handleSubmit = async (socialBattery: number, emotion: string, connectionBid: string, note: string) => {
    setSubmitting(true);
    try {
      const weatherDoc = doc(db, "weather", `${userId}-${today}`);
      await setDoc(weatherDoc, {
        userId,
        date: today,
        socialBattery,
        emotion,
        connectionBid,
        note: note.trim(),
        updatedAt: Timestamp.now()
      });

      const bidSuffix = connectionBid ? ` • Bid: ${connectionBid}` : "";
      const noteSuffix = note.trim() ? ` • Note: ${note.trim()}` : "";
      const isMohammed = userEmail === "mraaziqp@gmail.com" || userEmail === "backupe9@gmail.com";
      const senderName = isMohammed ? "Your Husband" : "Your Wife";
      await notifyPartner(
        userId,
        "Emotional weather updated",
        `Status: ${emotion} • Social battery: ${socialBattery}%${bidSuffix}${noteSuffix}`,
        senderName,
        "feeling"
      );

      // Email dispatch
      fetch("/api/notify-robust", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId,
          title: "Emotional Weather Updated 🌡️",
          body: `Status: ${emotion} • Social battery: ${socialBattery}%${bidSuffix}${noteSuffix}`,
          senderName,
          theme: "feeling"
        })
      }).catch(err => console.error("Email notify error:", err));

    } catch (e) {
      handleFirestoreError(e, OperationType.WRITE, "weather");
    } finally {
      setSubmitting(false);
    }
  };

  const getBatteryIcon = (val: number) => {
    if (val > 75) return <Battery className="text-emerald-400" />;
    if (val > 40) return <BatteryMedium className="text-amber-400" />;
    if (val > 15) return <BatteryLow className="text-orange-400" />;
    return <BatteryWarning className="text-rose-500 animate-pulse" />;
  };

  const getBatteryDescription = (val: number) => {
    if (val > 80) return { text: "Supercharged: Let's do something fun! ⚡", color: "text-emerald-400" };
    if (val > 55) return { text: "Good: Cozy conversations & warm tea ☕", color: "text-teal-400" };
    if (val > 35) return { text: "Steady: Cozy parallel play & low energy 🕯️", color: "text-amber-400" };
    if (val > 15) return { text: "Low Battery: Needs quiet comfort & soft words 🧸", color: "text-orange-400" };
    return { text: "Sub-zero: Do Not Disturb & bring chocolate ❄️", color: "text-rose-400" };
  };

  const batteryInfo = getBatteryDescription(draftBattery);
  const isMohammed = userEmail === "mraaziqp@gmail.com" || userEmail === "backupe9@gmail.com";
  const partnerName = isMohammed ? "Razia" : "Mohammed";

  return (
    <div className="space-y-6">
      <div className="flex flex-col lg:flex-row gap-6">
        
        {/* Input Section */}
        <GlassPanel className="flex-1 p-8 space-y-8 relative overflow-hidden">
          
          {/* Ambient Particles */}
          <div className="absolute inset-0 pointer-events-none overflow-hidden opacity-[0.07] z-0">
            {floatingParticles.map((p) => (
              <motion.span
                key={p.id}
                animate={{
                  y: [-20, 20, -20],
                  x: [-15, 15, -15],
                  opacity: [0.2, 0.8, 0.2],
                  scale: [p.scale, p.scale * 1.25, p.scale],
                }}
                transition={{
                  duration: p.duration,
                  repeat: Infinity,
                  delay: p.delay,
                  ease: "easeInOut",
                }}
                className="absolute text-3xl select-none"
                style={{
                  left: p.left,
                  top: p.top,
                }}
              >
                {p.emoji}
              </motion.span>
            ))}
          </div>

          <div className="space-y-1 relative z-10">
            <p className="text-xs uppercase tracking-[0.4em] text-blue-400 font-bold">Daily Check-in</p>
            <h2 className="text-3xl font-light italic font-serif text-white">Your Emotional Weather</h2>
          </div>

          <div className="space-y-6 relative z-10">
            {/* Battery Slider */}
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <label className="text-sm font-medium text-white/60">Social Battery</label>
                <div className="flex items-center gap-2">
                  {getBatteryIcon(draftBattery)}
                  <span className="text-lg font-serif italic text-white">{draftBattery}%</span>
                </div>
              </div>
              <input 
                type="range" 
                min="0" max="100" 
                value={draftBattery}
                onChange={(e) => setDraftBattery(parseInt(e.target.value))}
                className="w-full h-1 bg-white/10 rounded-lg appearance-none cursor-pointer accent-blue-500"
              />
              <div className="flex justify-between items-center text-[10px] uppercase tracking-widest text-white/20 font-bold">
                 <span>Drained</span>
                 <span className={cn("text-xs font-semibold normal-case tracking-normal", batteryInfo.color)}>
                   {batteryInfo.text}
                 </span>
                 <span>Fully Charged</span>
              </div>
            </div>

            {/* Emotion grid */}
            <div className="space-y-4">
              <label className="text-sm font-medium text-white/60">Primary Emotion</label>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                {EMOTIONS.map((e) => (
                  <button
                    key={e.label}
                    onClick={() => setDraftEmotion(e.label)}
                    className={cn(
                      "flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl border text-xs font-semibold transition-all cursor-pointer active:scale-95",
                      draftEmotion === e.label 
                       ? `${e.bg} ${e.border} ${e.color} shadow-lg scale-105 border-white/20`
                       : "bg-white/5 border-transparent text-white/40 hover:bg-white/10 hover:text-white"
                    )}
                  >
                    <e.icon size={13} className="shrink-0" />
                    <span className="truncate">{e.label}</span>
                  </button>
                ))}
              </div>

              {/* Bids for connection */}
              <div className="space-y-2 pt-4">
                <label className="text-sm font-medium text-white/60">Connection Bid (What you need most right now)</label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {CONNECTION_BIDS.map((bid) => (
                    <button
                      key={bid}
                      type="button"
                      onClick={() => setDraftConnectionBid(draftConnectionBid === bid ? "" : bid)}
                      className={cn(
                        "px-3 py-2 rounded-xl border text-[11px] font-semibold text-center transition-all cursor-pointer active:scale-95",
                        draftConnectionBid === bid
                          ? "bg-pink-500/15 border-pink-500/30 text-pink-300 shadow-md"
                          : "bg-white/5 border-transparent text-white/50 hover:bg-white/10 hover:text-white"
                      )}
                    >
                      {bid}
                    </button>
                  ))}
                </div>
                <p className="text-[9px] uppercase tracking-widest text-white/20">Inspired by Gottman "bids for connection"</p>
              </div>

              {/* Note */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-white/60">Message for your partner (optional)</label>
                <textarea
                  value={draftNote}
                  onChange={(e) => setDraftNote(e.target.value)}
                  maxLength={140}
                  rows={3}
                  placeholder="Example: I need an extra hug tonight."
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder:text-white/30 focus:outline-none focus:border-blue-500/50 transition-colors shadow-inner"
                />
                <p className="text-[10px] uppercase tracking-widest text-white/20 text-right">{draftNote.length}/140</p>
              </div>

              <button
                onClick={() => handleSubmit(draftBattery, draftEmotion, draftConnectionBid, draftNote)}
                disabled={submitting}
                className="w-full py-3 rounded-xl bg-blue-500 hover:bg-blue-600 text-white text-xs font-bold uppercase tracking-widest transition-colors shadow-lg active:scale-95 cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {submitting ? "Transmitting Weather..." : "Save Daily Weather"}
              </button>
            </div>
          </div>
        </GlassPanel>

        {/* Combined Synergy Card */}
        <GlassPanel className="lg:w-96 p-8 relative overflow-hidden flex flex-col justify-between group">
          <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/5 blur-3xl pointer-events-none rounded-full" />
          
          <div className="space-y-8 relative z-10">
            <h3 className="text-[10px] font-bold uppercase tracking-[0.2em] text-white/40 border-b border-white/5 pb-4">Evening Synergy</h3>
            
            <div className="space-y-6">
              {/* My Weather */}
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center text-white/45 shadow-sm">
                  <User size={20} />
                </div>
                <div className="flex-1 space-y-1">
                  <div className="flex justify-between items-center">
                    <p className="text-[10px] font-bold uppercase tracking-widest text-white/60">You</p>
                    <span className="text-[9px] text-white/20">{myWeather ? "Updated" : "Waiting..."}</span>
                  </div>
                  {myWeather ? (
                    <div className="flex items-center gap-2.5">
                      {getBatteryIcon(myWeather.socialBattery)}
                      <span className="text-sm text-white font-medium italic">{myWeather.emotion}</span>
                    </div>
                  ) : (
                    <p className="text-xs text-white/20 italic">Not set yet</p>
                  )}
                </div>
              </div>

              {/* Partner Weather */}
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-2xl bg-pink-500/10 border border-pink-500/20 flex items-center justify-center text-pink-400 shadow-sm">
                  <UserPlus size={20} />
                </div>
                <div className="flex-1 space-y-1">
                  <div className="flex justify-between items-center">
                    <p className="text-[10px] font-bold uppercase tracking-widest text-white/60">{partnerName}</p>
                    <span className="text-[9px] text-white/20">{partnerWeather ? "Updated" : "Silent"}</span>
                  </div>
                  {partnerWeather ? (
                    <div className="space-y-1.5">
                      <div className="flex items-center gap-2.5">
                        {getBatteryIcon(partnerWeather.socialBattery)}
                        <span className="text-sm text-white font-medium italic">{partnerWeather.emotion}</span>
                      </div>
                      {partnerWeather.connectionBid && (
                        <p className="text-[11px] text-blue-200/80 leading-relaxed font-medium">
                          wants to: <span className="italic underline underline-offset-2 decoration-blue-500/30">{partnerWeather.connectionBid}</span>
                        </p>
                      )}
                      {partnerWeather.note && (
                        <p className="text-[11px] text-pink-200/75 italic leading-relaxed">"{partnerWeather.note}"</p>
                      )}
                    </div>
                  ) : (
                    <p className="text-xs text-white/20 italic">No update yet</p>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Compatibility Synergy Note (Handwritten layout style) */}
          <div className="mt-8 pt-6 border-t border-white/5 relative z-10">
            {myWeather && partnerWeather ? (
              <div className="space-y-4">
                <div className="p-5 bg-gradient-to-br from-pink-500/10 via-purple-500/5 to-transparent border border-pink-500/20 rounded-2xl flex flex-col gap-2 shadow-lg relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-8 h-8 bg-pink-500/5 rounded-bl-xl pointer-events-none" />
                  <div className="flex items-center gap-1.5 border-b border-white/5 pb-1.5">
                    <Heart size={12} className="text-pink-400 fill-pink-400/20" />
                    <p className="text-[9px] font-bold uppercase tracking-wider text-pink-300">Love Forecast Suggestion</p>
                  </div>
                  <p className="text-xs leading-relaxed text-pink-100 font-serif italic">
                    {partnerWeather.connectionBid ? (
                      `Make today special. Turn toward her bid: "${partnerWeather.connectionBid}". Be present and loving.`
                    ) : partnerWeather.socialBattery < 35 || myWeather.socialBattery < 35 ? (
                      "Both of your energies are on reserve. Engagement level: low effort. Order takeaway, dim the lamps, and enjoy parallel silent presence."
                    ) : (partnerWeather.socialBattery > 70 && myWeather.socialBattery > 70) ? (
                      "Vibes match perfectly! High energy tonight. Go for a sweet Cape Town evening walk or cook a new recipe together!"
                    ) : (
                      `Asymmetrical energy detected. ${myWeather.socialBattery > partnerWeather.socialBattery ? "You have" : `${partnerName} has`} more charge. Keep things quiet and protect the other's peace.`
                    )}
                  </p>
                </div>
                
                <div className="flex bg-white/3 rounded-xl p-3 text-center border border-white/5 shadow-inner">
                  <div className="w-full">
                    <p className="text-[8px] uppercase tracking-widest text-white/40 font-bold mb-1">Synergy Activity</p>
                    <p className="text-xs text-white font-medium">
                      {partnerWeather.socialBattery < 35 || myWeather.socialBattery < 35 ? "🍿 Cozy Movie Sanctuary" : (partnerWeather.socialBattery > 70 && myWeather.socialBattery > 70) ? "🚗 Cape Town Date Out" : "🍵 Quiet Parallel Reading"}
                    </p>
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-center py-6 text-white/20 space-y-2">
                <p className="text-[9px] uppercase tracking-widest font-bold animate-pulse">Waiting for both check-ins</p>
                <p className="text-[10px] italic">Daily synergy suggestion will unlock once both of you submit weather.</p>
              </div>
            )}
          </div>
        </GlassPanel>
      </div>
    </div>
  );
}
