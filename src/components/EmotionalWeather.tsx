import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Cloud, Sun, CloudRain, Zap, Battery, BatteryMedium, BatteryLow, BatteryWarning, Heart, User, UserPlus, Sparkles, Wind, Droplets } from "lucide-react";
import GlassPanel from "./GlassPanel";
import { db, handleFirestoreError, OperationType } from "../lib/firebase";
import { collection, query, where, orderBy, limit, onSnapshot, setDoc, doc, Timestamp, getDocs } from "firebase/firestore";
import { format } from "date-fns";
import { cn } from "../lib/utils";

interface WeatherData {
  userId: string;
  socialBattery: number;
  emotion: string;
  note?: string;
  updatedAt: any;
}

const EMOTIONS = [
  { label: "Energized", icon: Sparkles, color: "text-amber-400", bg: "bg-amber-400/10", border: "border-amber-400/20" },
  { label: "Calm", icon: Wind, color: "text-emerald-400", bg: "bg-emerald-400/10", border: "border-emerald-400/20" },
  { label: "Needing Affection", icon: Heart, color: "text-rose-400", bg: "bg-rose-400/10", border: "border-rose-400/20" },
  { label: "Overwhelmed", icon: Zap, color: "text-indigo-400", bg: "bg-indigo-400/10", border: "border-indigo-400/20" },
  { label: "Drained", icon: Droplets, color: "text-blue-400", bg: "bg-blue-400/10", border: "border-blue-400/20" },
];

export default function EmotionalWeather({ userId, userEmail }: { userId: string; userEmail: string }) {
  const [myWeather, setMyWeather] = useState<WeatherData | null>(null);
  const [partnerWeather, setPartnerWeather] = useState<WeatherData | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [draftBattery, setDraftBattery] = useState(50);
  const [draftEmotion, setDraftEmotion] = useState("Calm");
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
  }, [myWeather]);

  const handleSubmit = async (socialBattery: number, emotion: string) => {
    setSubmitting(true);
    try {
      const weatherDoc = doc(db, "weather", `${userId}-${today}`);
      await setDoc(weatherDoc, {
        userId,
        date: today,
        socialBattery,
        emotion,
        updatedAt: Timestamp.now()
      });
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

               <button
                 onClick={() => handleSubmit(draftBattery, draftEmotion)}
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
                         <div className="flex items-center gap-3">
                            {getBatteryIcon(partnerWeather.socialBattery)}
                            <span className="text-sm text-white font-medium italic">{partnerWeather.emotion}</span>
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
                        {partnerWeather.socialBattery < 30 || myWeather.socialBattery < 30 ? (
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
