import { useState, useEffect } from "react";
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
  const [draftEmotion, setDraftEmotion] = useState("Calm");
  const [draftConnectionBid, setDraftConnectionBid] = useState("");
  const [draftNote, setDraftNote] = useState("");
  const today = format(new Date(), 'yyyy-MM-dd');

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
    setDraftEmotion(myWeather.emotion || "Calm");
    setDraftConnectionBid(myWeather.connectionBid || "");
    setDraftNote(myWeather.note || "");
  }, [myWeather]);

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
        senderName
      );
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

  return (
    <div className="space-y-6">
      <div className="flex flex-col lg:flex-row gap-6">
        {/* Input Section */}
        <GlassPanel className="flex-1 p-8 space-y-8">
           <div className="space-y-1">
             <p className="text-xs uppercase tracking-[0.4em] text-blue-500 font-bold">Daily Check-in</p>
             <h2 className="text-3xl font-light italic font-serif text-white">Your Emotional Weather</h2>
           </div>

           <div className="space-y-6">
             <div className="space-y-4">
               <div className="flex justify-between items-center">
                 <label className="text-sm font-medium text-white/60">Social Battery</label>
                 <span className="text-lg font-serif italic text-white">{draftBattery}%</span>
               </div>
               <input 
                 type="range" 
                 min="0" max="100" 
                 value={draftBattery}
                 onChange={(e) => setDraftBattery(parseInt(e.target.value))}
                 className="w-full h-1 bg-white/10 rounded-lg appearance-none cursor-pointer accent-blue-500"
               />
               <div className="flex justify-between text-[10px] uppercase tracking-widest text-white/20 font-bold">
                  <span>Drained</span>
                  <span>Fully Charged</span>
               </div>
             </div>

             <div className="space-y-4">
               <label className="text-sm font-medium text-white/60">Primary Emotion</label>
               <div className="flex flex-wrap gap-3">
                 {EMOTIONS.map((e) => (
                   <button
                     key={e.label}
                     onClick={() => setDraftEmotion(e.label)}
                     className={cn(
                       "flex items-center gap-2 px-4 py-2.5 rounded-xl border text-xs font-semibold transition-all",
                       draftEmotion === e.label 
                        ? `${e.bg} ${e.border} ${e.color} shadow-lg scale-105`
                        : "bg-white/5 border-transparent text-white/40 hover:bg-white/10"
                     )}
                   >
                     <e.icon size={14} />
                     {e.label}
                   </button>
                 ))}
               </div>

               <div className="space-y-2 pt-2">
                 <label className="text-sm font-medium text-white/60">Connection Bid (What you need most right now)</label>
                 <div className="flex flex-wrap gap-2">
                   {CONNECTION_BIDS.map((bid) => (
                     <button
                       key={bid}
                       onClick={() => setDraftConnectionBid(draftConnectionBid === bid ? "" : bid)}
                       className={cn(
                         "px-3 py-2 rounded-xl border text-[11px] font-semibold transition-all",
                         draftConnectionBid === bid
                           ? "bg-pink-500/15 border-pink-500/30 text-pink-300"
                           : "bg-white/5 border-transparent text-white/50 hover:bg-white/10"
                       )}
                     >
                       {bid}
                     </button>
                   ))}
                 </div>
                 <p className="text-[10px] uppercase tracking-widest text-white/25">Inspired by Gottman "bids for connection"</p>
               </div>

               <div className="space-y-2">
                 <label className="text-sm font-medium text-white/60">Message for your partner (optional)</label>
                 <textarea
                   value={draftNote}
                   onChange={(e) => setDraftNote(e.target.value)}
                   maxLength={140}
                   rows={3}
                   placeholder="Example: I need an extra hug tonight."
                   className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-sm text-white placeholder:text-white/30 focus:outline-none focus:border-blue-500/50"
                 />
                 <p className="text-[10px] uppercase tracking-widest text-white/30">{draftNote.length}/140</p>
               </div>

               <button
                 onClick={() => handleSubmit(draftBattery, draftEmotion, draftConnectionBid, draftNote)}
                 disabled={submitting}
                 className="px-4 py-2.5 rounded-xl bg-blue-500 text-white text-xs font-bold uppercase tracking-widest hover:bg-blue-600 transition-colors disabled:opacity-60"
               >
                 {submitting ? "Saving..." : "Save Check-in"}
               </button>
             </div>
           </div>
        </GlassPanel>

        {/* Combined View */}
        <GlassPanel className="lg:w-96 p-8 relative overflow-hidden flex flex-col justify-between">
           <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/10 blur-3xl pointer-events-none" />
           
           <div className="space-y-8 relative z-10">
              <h3 className="text-xs font-bold uppercase tracking-[0.2em] text-white/40 border-b border-white/5 pb-4">Evening Synergy</h3>
              
              <div className="space-y-8">
                 {/* My Weather */}
                 <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center text-white/40">
                       <User size={20} />
                    </div>
                    <div className="flex-1 space-y-1">
                       <div className="flex justify-between items-center">
                          <p className="text-xs font-bold uppercase tracking-widest text-white/60">You</p>
                          <span className="text-[10px] text-white/20">{myWeather ? "Updated" : "Waiting..."}</span>
                       </div>
                       {myWeather ? (
                         <div className="flex items-center gap-3">
                            {getBatteryIcon(myWeather.socialBattery)}
                            <span className="text-sm text-white font-medium italic">{myWeather.emotion}</span>
                         </div>
                       ) : (
                         <p className="text-sm text-white/20 italic">Not set yet</p>
                       )}
                    </div>
                 </div>

                 {/* Partner Weather */}
                 <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-2xl bg-pink-500/10 border border-pink-500/20 flex items-center justify-center text-pink-400">
                       <UserPlus size={20} />
                    </div>
                    <div className="flex-1 space-y-1">
                       <div className="flex justify-between items-center">
                          <p className="text-xs font-bold uppercase tracking-widest text-white/60">{userEmail === 'backupe9@gmail.com' ? 'Razia' : 'Mohammed'}</p>
                          <span className="text-[10px] text-white/20">{partnerWeather ? "Updated" : "Silent"}</span>
                       </div>
                       {partnerWeather ? (
                         <div className="space-y-2">
                           <div className="flex items-center gap-3">
                              {getBatteryIcon(partnerWeather.socialBattery)}
                              <span className="text-sm text-white font-medium italic">{partnerWeather.emotion}</span>
                           </div>
                           {partnerWeather.connectionBid ? (
                             <p className="text-xs text-blue-200/80">
                               Connection Bid: <span className="italic">{partnerWeather.connectionBid}</span>
                             </p>
                           ) : null}
                           {partnerWeather.note ? (
                             <p className="text-xs text-pink-200/80 italic">"{partnerWeather.note}"</p>
                           ) : null}
                         </div>
                       ) : (
                         <p className="text-sm text-white/20 italic">No update yet</p>
                       )}
                    </div>
                 </div>
              </div>
           </div>

           <div className="mt-12 pt-6 border-t border-white/5">
              {myWeather && partnerWeather ? (
                <div className="space-y-4">
                  <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl flex items-center gap-4">
                     <div className="w-8 h-8 rounded-full bg-emerald-400/20 flex items-center justify-center text-emerald-400">
                        <Heart size={14} fill="currentColor" />
                     </div>
                     <p className="text-xs text-emerald-200/80 leading-relaxed italic">
                        {partnerWeather.connectionBid ? (
                          `Turn toward her bid today: ${partnerWeather.connectionBid}.`
                        ) : partnerWeather.socialBattery < 30 || myWeather.socialBattery < 30 ? (
                          "Sanctuary Mode engaged. Order takeout, dim the lights, and put on a low-effort movie tonight."
                        ) : (partnerWeather.socialBattery > 75 && myWeather.socialBattery > 75) ? (
                          "Synergy is high! Perfect night for co-op gaming (Overcooked! 2?) or a night out in Cape Town."
                        ) : (
                          "Asymmetrical energy detected. Focus on a balanced evening—maybe some parallel play or a quiet dinner."
                        )}
                     </p>
                  </div>
                  
                  <div className="flex gap-2">
                     <div className="flex-1 bg-white/5 rounded-xl p-3 text-center border border-white/5">
                        <p className="text-[8px] uppercase tracking-widest text-white/40 font-bold mb-1">Matchmaker Suggestion</p>
                        <p className="text-[10px] text-white">
                           {partnerWeather.socialBattery < 30 || myWeather.socialBattery < 30 ? "🎬 Movie Night" : (partnerWeather.socialBattery > 75 && myWeather.socialBattery > 75) ? "🎮 Date Night Out" : "🍝 Quiet Dinner"}
                        </p>
                     </div>
                  </div>
                </div>
              ) : (
                <p className="text-[10px] text-center uppercase tracking-widest text-white/10">Synchronizing Signals...</p>
              )}
           </div>
        </GlassPanel>
      </div>
    </div>
  );
}
