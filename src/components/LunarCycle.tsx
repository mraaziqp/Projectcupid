import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Moon, Sparkles, Heart, Activity, Info, Calendar, ChevronRight, Utensils, Coffee, Thermometer, CheckCircle } from "lucide-react";
import GlassPanel from "./GlassPanel";
import { db, handleFirestoreError, OperationType } from "../lib/firebase";
import { collection, query, where, orderBy, limit, onSnapshot, addDoc, Timestamp, updateDoc, doc } from "firebase/firestore";
import { differenceInDays, format, startOfDay, addDays as addDaysFn, addMonths } from "date-fns";
import { cn } from "../lib/utils";

interface CycleData {
  id: string;
  startDate: any; // Timestamp
  duration: number;
}

interface CareQuest {
  id: string;
  userId: string;
  craving: string;
  status: 'pending' | 'fulfilled';
  createdAt: any;
}

type Phase = "Menstrual" | "Follicular" | "Ovulatory" | "Luteal";

const PHASES: Record<Phase, { range: [number, number]; color: string; advice: string; partner: string }> = {
  Menstrual: {
    range: [1, 5],
    color: "from-rose-500 to-pink-600",
    advice: "Your body is working hard today. Focus on hydration and iron-rich foods like dark chocolate or spinach. Be gentle with yourself.",
    partner: "Razia is in her Menstrual phase. She might be feeling a bit fatigued or overwhelmed. Great time for a back rub and fetching her a heating pad."
  },
  Follicular: {
    range: [6, 11],
    color: "from-emerald-400 to-teal-500",
    advice: "Energy levels are rising! Great time for new projects or light exercise. Your skin is likely glowing today.",
    partner: "She's in her Follicular phase. Energy is returning. It's a great time for an active date or trying something new together!"
  },
  Ovulatory: {
    range: [12, 16],
    color: "from-blue-400 to-indigo-500",
    advice: "Communication and social energy are at their peak. You're likely feeling confident and radiant.",
    partner: "She's in her Ovulatory phase. Social battery is high! Plan a night out or a gathering with friends."
  },
  Luteal: {
    range: [17, 28],
    color: "from-purple-500 to-indigo-600",
    advice: "You might feel like nested vibes today. Focus on cozy comforts and light tasks. Magnesium-rich foods can help withPMS symptoms.",
    partner: "Razia is likely in her Luteal phase. She might be feeling a bit more sensitive or easily overwhelmed. Tonight is a great night to cook dinner and put on a movie."
  }
};

export default function LunarCycle({ userId, isAdmin }: { userId: string; isAdmin: boolean }) {
  const [cycle, setCycle] = useState<CycleData | null>(null);
  const [loading, setLoading] = useState(true);
  const [craving, setCraving] = useState("");
  const [activeQuests, setActiveQuests] = useState<CareQuest[]>([]);
  const [showPredictions, setShowPredictions] = useState(false);

  useEffect(() => {
    // Cycle Log
    const cycleQ = query(
      collection(db, "cycle_logs"),
      ...(isAdmin ? [] : [where("userId", "==", userId)]),
      orderBy("startDate", "desc"),
      limit(1)
    );

    const unsubCycle = onSnapshot(cycleQ, (snapshot) => {
      if (!snapshot.empty) {
        setCycle({ id: snapshot.docs[0].id, ...snapshot.docs[0].data() } as CycleData);
      }
      setLoading(false);
    });

    // Care Quests
    const questQ = query(
      collection(db, "care_quests"),
      where("status", "==", "pending"),
      orderBy("createdAt", "desc"),
      limit(5)
    );

    const unsubQuests = onSnapshot(questQ, (snapshot) => {
      setActiveQuests(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as CareQuest)));
    });

    return () => {
      unsubCycle();
      unsubQuests();
    };
  }, [userId, isAdmin]);

  const logCycleStart = async () => {
    try {
      await addDoc(collection(db, "cycle_logs"), {
        userId,
        startDate: Timestamp.now(),
        duration: 28,
        updatedAt: Timestamp.now()
      });
    } catch (e) {
      handleFirestoreError(e, OperationType.WRITE, "cycle_logs");
    }
  };

  const submitQuest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!craving.trim()) return;
    try {
      await addDoc(collection(db, "care_quests"), {
        userId,
        craving,
        status: "pending",
        createdAt: Timestamp.now()
      });
      setCraving("");
    } catch (e) {
      handleFirestoreError(e, OperationType.WRITE, "care_quests");
    }
  };

  const fulfillQuest = async (id: string, questUserId: string, cravingName: string) => {
    try {
      await updateDoc(doc(db, "care_quests", id), { status: "fulfilled" });
      
      // Notify Razia that her quest was fulfilled
      await addDoc(collection(db, "notifications"), {
        userId: questUserId, // The person who requested the craving
        title: "Side Quest Fulfilled! 💓",
        body: `Mohammed has procured: ${cravingName}`,
        read: false,
        createdAt: Timestamp.now()
      });
    } catch (e) {
      handleFirestoreError(e, OperationType.WRITE, "care_quests");
    }
  };

  if (loading) return <div className="h-48 animate-pulse bg-white/5 rounded-3xl" />;

  const getPhaseInfo = () => {
    if (!cycle) return null;
    const start = cycle.startDate.toDate();
    const now = new Date();
    const dayOfCycle = (differenceInDays(startOfDay(now), startOfDay(start)) % 28) + 1;
    
    let currentPhase: Phase = "Menstrual";
    for (const [phase, info] of Object.entries(PHASES)) {
      if (dayOfCycle >= info.range[0] && dayOfCycle <= info.range[1]) {
        currentPhase = phase as Phase;
        break;
      }
    }
    
    return { dayOfCycle, phase: currentPhase, ...PHASES[currentPhase] };
  };

  const info = getPhaseInfo();

  if (isAdmin) {
    return (
      <div className="space-y-6">
        <GlassPanel className="p-6 bg-gradient-to-br from-purple-500/10 to-transparent border-purple-500/20">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-full bg-purple-500/20 flex items-center justify-center text-purple-400">
                <Moon size={20} fill="currentColor" />
              </div>
              <div>
                <h3 className="text-xs font-bold uppercase tracking-widest text-white/50">Support Radar</h3>
                <p className="text-sm font-medium text-white/90">Razia's Lunar Cycle</p>
              </div>
            </div>
            {info && (
               <div className="px-3 py-1 bg-white/5 border border-white/10 rounded-full text-[10px] font-bold uppercase tracking-widest text-purple-400">
                 {info.phase} Phase
               </div>
            )}
          </div>

          {info ? (
            <div className="space-y-4">
              <div className="p-4 bg-white/5 border border-white/10 rounded-2xl">
                <div className="flex items-center gap-2 mb-2">
                   <Sparkles size={12} className="text-purple-400" />
                   <p className="text-[10px] text-white/40 uppercase tracking-widest font-bold">Actionable Advice</p>
                </div>
                <p className="text-sm leading-relaxed text-purple-200/80 italic">"{info.partner}"</p>
              </div>
            </div>
          ) : (
            <div className="py-4 text-center text-white/20 italic text-sm">
              Waiting for Razia to log her cycle...
            </div>
          )}
        </GlassPanel>

        {/* Quest Radar */}
        <AnimatePresence>
          {activeQuests.length > 0 && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="space-y-4"
            >
              <div className="flex items-center gap-2 px-2">
                <Utensils size={14} className="text-pink-500" />
                <h3 className="text-[10px] font-bold uppercase tracking-widest text-white/30">Active Side Quests</h3>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {activeQuests.map((quest) => (
                  <GlassPanel key={quest.id} className="p-5 border-pink-500/30 bg-pink-500/5 hover:bg-pink-500/10 transition-all flex items-center justify-between group">
                    <div className="space-y-1">
                      <p className="text-[10px] text-pink-400/60 uppercase tracking-widest font-bold font-mono">Quest: Procure {quest.craving}</p>
                      <p className="text-lg font-serif italic text-white flex items-center gap-2 group-hover:translate-x-1 transition-transform">
                        Razia wants {quest.craving}
                      </p>
                    </div>
                    <button 
                      onClick={() => fulfillQuest(quest.id, quest.userId, quest.craving)}
                      className="w-10 h-10 rounded-full bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400 hover:bg-emerald-500 hover:text-white transition-all shadow-lg"
                      title="Mark as Fulfilled"
                    >
                      <CheckCircle size={18} />
                    </button>
                  </GlassPanel>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    );
  }

  return (
    <GlassPanel className="p-8 relative overflow-hidden group">
      {/* Background Glow */}
      <div className={cn(
        "absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 blur-[100px] opacity-20 transition-all duration-1000",
        info ? `bg-gradient-to-br ${info.color}` : "bg-white/10"
      )} />

      <div className="relative z-10 space-y-8">
        <div className="flex justify-between items-start">
          <div className="space-y-1">
            <p className="text-xs uppercase tracking-[0.4em] text-pink-500 font-bold">Lunar Tracker</p>
            <h2 className="text-3xl font-light italic font-serif text-white">Your Rhythm</h2>
          </div>
          <button 
            onClick={logCycleStart}
            className="flex items-center gap-2 px-4 py-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-[10px] font-bold uppercase tracking-widest text-white/60 transition-all"
          >
            <Calendar size={14} />
            Log Period
          </button>
        </div>

        <div className="flex flex-col md:flex-row items-center gap-12">
          {/* Circular UI */}
          <div className="relative w-48 h-48 flex items-center justify-center">
            {/* Progress Ring (simplified) */}
            <svg className="w-full h-full -rotate-90">
              <circle
                cx="96" cy="96" r="88"
                fill="transparent"
                stroke="currentColor"
                strokeWidth="4"
                className="text-white/5"
              />
              {info && (
                <motion.circle
                  initial={{ pathLength: 0 }}
                  animate={{ pathLength: info.dayOfCycle / 28 }}
                  transition={{ duration: 2, ease: "easeOut" }}
                  cx="96" cy="96" r="88"
                  fill="transparent"
                  stroke="currentColor"
                  strokeWidth="8"
                  strokeLinecap="round"
                  className={cn(
                    "drop-shadow-[0_0_8px_rgba(255,255,255,0.5)]",
                    info.phase === "Menstrual" ? "text-rose-500" : 
                    info.phase === "Follicular" ? "text-emerald-400" :
                    info.phase === "Ovulatory" ? "text-blue-400" : "text-purple-500"
                  )}
                />
              )}
            </svg>
            
            <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
              <AnimatePresence mode="wait">
                <motion.div
                  key={info?.phase || "empty"}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 1.1 }}
                  className="space-y-1"
                >
                  <div className="text-4xl font-light font-serif text-white">
                    {info ? info.dayOfCycle : "—"}
                  </div>
                  <div className="text-[10px] uppercase tracking-widest text-white/30 font-bold">
                    Day of Cycle
                  </div>
                </motion.div>
              </AnimatePresence>
            </div>
          </div>

          {/* Phase Info */}
          <div className="flex-1 space-y-6">
            <AnimatePresence mode="wait">
              {info ? (
                <motion.div
                  key={info.phase}
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="space-y-4"
                >
                  <div className="flex justify-between items-center">
                    <div className={cn(
                      "inline-flex items-center gap-3 px-4 py-1.5 rounded-full border text-[10px] font-bold uppercase tracking-widest",
                      `bg-gradient-to-r ${info.color} border-white/20 text-white shadow-lg`
                    )}>
                      <Sparkles size={12} />
                      {info.phase} Phase
                    </div>
                    <button 
                      onClick={() => setShowPredictions(!showPredictions)}
                      className="text-[10px] font-bold uppercase tracking-widest text-white/30 hover:text-white transition-colors"
                    >
                      {showPredictions ? "Hide Forecast" : "See 3-Month Forecast"}
                    </button>
                  </div>
                  
                  <div className="space-y-4">
                    <div className="flex items-start gap-4 p-5 bg-white/5 border border-white/10 rounded-2xl shadow-inner">
                      <div className="mt-1 text-pink-500">
                        <Heart size={18} fill="currentColor" />
                      </div>
                      <p className="text-sm leading-relaxed text-white/70 italic">
                        "{info.advice}"
                      </p>
                    </div>
                    
                    {/* Care Quest Input */}
                    <form onSubmit={submitQuest} className="relative group">
                       <Utensils className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-white/20 group-focus-within:text-pink-500 transition-colors" />
                       <input 
                         type="text"
                         value={craving}
                         onChange={(e) => setCraving(e.target.value)}
                         placeholder="I'm craving... (e.g. Chocolate, a hug)"
                         className="w-full bg-white/5 border border-white/10 rounded-2xl pl-12 pr-4 py-3 text-sm text-white placeholder:text-white/20 focus:outline-none focus:border-pink-500/30 transition-all"
                       />
                    </form>

                    {showPredictions ? (
                      <motion.div 
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="p-4 bg-white/3 border border-white/5 rounded-2xl space-y-3"
                      >
                         <p className="text-[10px] font-bold uppercase tracking-widest text-white/20 flex items-center gap-2">
                           <Calendar size={12} /> Predictive Forecast
                         </p>
                         <div className="grid grid-cols-3 gap-2">
                            {[1, 2, 3].map(m => {
                              const date = addMonths(startOfDay(cycle!.startDate.toDate()), m);
                              return (
                                <div key={m} className="p-2 bg-white/5 rounded-lg border border-white/5 text-center">
                                  <p className="text-[8px] uppercase tracking-widest text-white/40 mb-1">{format(date, 'MMM')}</p>
                                  <p className="text-xs font-bold text-white">{format(date, 'd')}</p>
                                </div>
                              );
                            })}
                         </div>
                         <p className="text-[8px] text-center text-white/20 italic">Estimates based on your average {cycle?.duration || 28}-day cycle.</p>
                      </motion.div>
                    ) : (
                      <div className="flex gap-3">
                         <div className="flex-1 p-4 bg-white/3 border border-white/5 rounded-2xl">
                            <Activity size={16} className="text-white/20 mb-2" />
                            <p className="text-[10px] uppercase tracking-widest text-white/40 font-bold mb-1">Status</p>
                            <p className="text-xs text-white/80">Biological Signal: Active</p>
                         </div>
                         <div className="flex-1 p-4 bg-white/3 border border-white/5 rounded-2xl">
                            <Info size={16} className="text-white/20 mb-2" />
                            <p className="text-[10px] uppercase tracking-widest text-white/40 font-bold mb-1">Next Log</p>
                            <p className="text-xs text-white/80">{format(info.dayOfCycle > 21 ? startOfDay(cycle!.startDate.toDate()) : new Date(), 'MMM d')}</p>
                         </div>
                      </div>
                    )}
                  </div>
                </motion.div>
              ) : (
                <div className="py-12 text-center text-white/20 space-y-4">
                   <Moon size={48} className="mx-auto opacity-10" />
                   <p className="text-sm italic">Connect your lunar rhythm to begin receiving daily wellness tips.</p>
                </div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>
    </GlassPanel>
  );
}

function addDays(date: Date, days: number): Date {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}
