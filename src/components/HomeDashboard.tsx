import { useState, useEffect } from "react";
import { motion } from "motion/react";
import {
  Heart,
  Gift,
  Sparkles,
  Calendar,
  Compass,
  ShieldCheck,
  BookHeart,
  ArrowRight,
  Smile,
  Clock,
  Star,
  Lock
} from "lucide-react";
import GlassPanel from "./GlassPanel";
import { UserProfile, MessageBoxItem, ReasonVaultItem, TimelineMoment } from "../types";
import { getOrSelectDailyBox, getTodayDateStr } from "../lib/messageBoxService";
import { INITIAL_365_REASONS, INITIAL_TIMELINE } from "../lib/seedData";
import DailyMemory from "./garden/DailyMemory";
import { ChevronDown } from "lucide-react";
import EmotionalWeather from "./EmotionalWeather";
import { format } from "date-fns";

interface HomeDashboardProps {
  currentProfile: UserProfile | null;
  partnerProfile?: UserProfile | null;
  onNavigate: (tabId: string) => void;
  allLetters: any[];
  onOpenMemory?: (memoryId?: string) => void;
}

export default function HomeDashboard({
  currentProfile,
  partnerProfile,
  onNavigate,
  onOpenMemory,
  allLetters
}: HomeDashboardProps) {
  const [dailyBoxMessage, setDailyBoxMessage] = useState<MessageBoxItem | null>(null);
  const [isBoxOpened, setIsBoxOpened] = useState(false);
  const [todayReason, setTodayReason] = useState<ReasonVaultItem | null>(null);

  const currentUserId = currentProfile?.uid || "guest";
  const currentUserRole = currentProfile?.role || "reader";
  const displayName = currentProfile?.displayName || (currentUserRole === "admin" ? "Raaziq" : "Razia");
  const partnerName = partnerProfile?.displayName || (currentUserRole === "admin" ? "Razia" : "Raaziq");

  useEffect(() => {
    loadHomeData();
  }, [currentUserId]);

  const loadHomeData = async () => {
    try {
      const { selection, message } = await getOrSelectDailyBox(currentUserId);
      setDailyBoxMessage(message);
      setIsBoxOpened(Boolean(selection.isOpened || message.isOpened));
    } catch (e) {
      console.warn("Home box load failed:", e);
    }

    // Pick a reason corresponding to day of year or random
    const dayOfYear = Math.floor((Date.now() - new Date(new Date().getFullYear(), 0, 0).getTime()) / 1000 / 60 / 60 / 24);
    const reasonIndex = dayOfYear % INITIAL_365_REASONS.length;
    setTodayReason({
      id: `reason_${reasonIndex}`,
      ...INITIAL_365_REASONS[reasonIndex]
    });
  };

  return (
    <div className="space-y-6 sm:space-y-10 max-w-5xl mx-auto px-4 sm:px-6">
      {/* Warm Welcome Banner */}
      <div className="text-center space-y-2 sm:space-y-3 pt-1 sm:pt-2">
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="hidden sm:inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs tracking-widest uppercase font-mono"
        >
          <Heart className="w-3.5 h-3.5 fill-rose-300" />
          <span>Our Little Universe</span>
        </motion.div>

        <h1 className="text-3xl sm:text-6xl font-serif-title font-light text-white tracking-tight">
          Welcome Home, <span className="text-rose-200 italic">{displayName}</span>
        </h1>
        <p className="hidden sm:block text-base text-white/60 max-w-lg mx-auto font-light leading-relaxed">
          A private digital home for our marriage, love, daily surprises, and wellbeing.
        </p>
      </div>

      {/* THE MEMORY GARDEN: TODAY'S MEMORY */}
      {currentProfile?.uid && (
        <DailyMemory uid={currentProfile.uid} onOpenGarden={(id) => (onOpenMemory ? onOpenMemory(id) : onNavigate("garden"))} />
      )}

      {/* SIGNATURE HIGHLIGHT: TODAY'S MESSAGE BOX WIDGET */}
      <div className="relative">
        <GlassPanel className="p-4 sm:p-8 rounded-3xl border border-amber-500/25 bg-gradient-to-r from-amber-500/10 via-rose-500/5 to-purple-900/10 relative overflow-hidden shadow-2xl">
          <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4 md:gap-6">
            <div className="flex items-center gap-4 sm:gap-5">
              <motion.div
                animate={{ y: [0, -4, 0] }}
                transition={{ repeat: Infinity, duration: 3.5, ease: "easeInOut" }}
                className="shrink-0 w-14 h-14 sm:w-20 sm:h-20 rounded-2xl bg-gradient-to-tr from-amber-400 to-rose-500 p-[1.5px] shadow-[0_0_20px_rgba(245,158,11,0.25)] shrink-0 flex items-center justify-center cursor-pointer"
                onClick={() => onNavigate("boxes")}
              >
                <div className="w-full h-full bg-[#141117] rounded-[15px] flex items-center justify-center">
                  <Gift className="w-8 h-8 sm:w-10 sm:h-10 text-amber-300" />
                </div>
              </motion.div>

              <div className="space-y-1 text-left min-w-0">
                <div className="hidden sm:flex items-center justify-start gap-2">
                  <span className="text-[11px] uppercase font-mono tracking-widest text-amber-300">
                    Signature Daily Ritual
                  </span>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-white/10 text-white/60">
                    {getTodayDateStr()}
                  </span>
                </div>
                <h3 className="text-lg sm:text-2xl leading-snug font-serif-title font-light text-white">
                  {isBoxOpened ? "Today's Message Has Been Revealed" : "A Little Something is Waiting for You"}
                </h3>
                <p className="hidden sm:block text-sm text-white/60 font-light max-w-md">
                  {isBoxOpened
                    ? dailyBoxMessage?.content.substring(0, 80) + "..."
                    : "Tap to open today's sealed virtual message box and discover what was written for you."}
                </p>
              </div>
            </div>

            <button
              onClick={() => onNavigate("boxes")}
              className="px-5 py-3 rounded-full bg-gradient-to-r from-amber-400 to-rose-400 text-black font-medium text-xs sm:text-sm hover:opacity-95 transition-opacity shadow-lg shadow-amber-500/20 flex items-center gap-2 shrink-0"
            >
              <Sparkles className="w-4 h-4" />
              <span>{isBoxOpened ? "View Opened Box" : "Open Today's Box"}</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </GlassPanel>
      </div>

      {/* TODAY'S REASON & FEATURED WEDDING MEMORY (2 COLUMNS) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Today's Reason */}
        <GlassPanel className="p-6 rounded-3xl border border-white/10 space-y-4 flex flex-col justify-between">
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="text-[10px] uppercase font-mono tracking-widest text-rose-300">
                Today's Reason to Appreciate You
              </span>
              <Star className="w-4 h-4 text-amber-400 fill-amber-400" />
            </div>
            <h4 className="font-serif-title text-xl text-white font-medium">From the 365 Reasons Vault</h4>
            <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/5 text-base sm:text-lg font-serif italic text-white/90 leading-relaxed">
              "{todayReason?.text || "The way you bring peace and light to our home every single day."}"
            </div>
          </div>

          <div className="flex items-center justify-between pt-2 border-t border-white/5 text-xs text-white/40">
            <span>Reason #{todayReason?.dayNumber || 1} • By {todayReason?.author || partnerName}</span>
            <button
              onClick={() => onNavigate("love")}
              className="text-rose-300 hover:text-rose-200 text-xs flex items-center gap-1 font-medium"
            >
              <span>Explore Vault</span>
              <ArrowRight className="w-3 h-3" />
            </button>
          </div>
        </GlassPanel>

        {/* Featured Wedding Memory */}
        <GlassPanel className="p-6 rounded-3xl border border-white/10 space-y-4 flex flex-col justify-between overflow-hidden">
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="text-[10px] uppercase font-mono tracking-widest text-amber-300">
                Featured Relationship Memory
              </span>
              <Calendar className="w-4 h-4 text-white/40" />
            </div>
            <h4 className="font-serif-title text-xl text-white font-medium">Mr & Mrs Parker</h4>
            <div className="rounded-xl overflow-hidden max-h-36 border border-white/10 shadow-md">
              <img
                src="/wedding.jpg"
                alt="Our Wedding"
                className="w-full h-36 object-cover hover:scale-105 transition-transform duration-500"
              />
            </div>
            <p className="text-xs text-white/65 font-serif italic">
              "Surrounded by our loved ones, making our sacred covenant under Allah's guidance."
            </p>
          </div>

          <div className="pt-2 border-t border-white/5 flex items-center justify-between text-xs text-white/40">
            <span>Our Sacred Beginning</span>
            <button
              onClick={() => onNavigate("love")}
              className="text-amber-300 hover:text-amber-200 text-xs flex items-center gap-1 font-medium"
            >
              <span>Our Story</span>
              <ArrowRight className="w-3 h-3" />
            </button>
          </div>
        </GlassPanel>
      </div>

      {/* EMOTIONAL WEATHER: how each of us is today (folded on phones, open on desktop) */}
      {currentProfile?.uid && (
        <details
          open={typeof window !== "undefined" && window.innerWidth >= 1024}
          className="group rounded-3xl border border-white/10 bg-white/[0.03] overflow-hidden"
        >
          <summary className="list-none cursor-pointer px-5 py-4 flex items-center justify-between gap-3 [&::-webkit-details-marker]:hidden">
            <span>
              <span className="block font-serif text-lg text-white">How are you today?</span>
              <span className="block text-xs text-white/60">Share your emotional weather with each other</span>
            </span>
            <ChevronDown className="w-5 h-5 text-white/60 transition-transform group-open:rotate-180 shrink-0" />
          </summary>
          <div className="p-2 sm:p-4 border-t border-white/5">
            <EmotionalWeather userId={currentProfile.uid} userEmail={currentProfile.email} currentProfile={currentProfile} partnerProfile={partnerProfile} />
          </div>
        </details>
      )}

      {/* QUICK ACCESS PORTAL CARDS (THE 6 SPACES) */}
      <div className="space-y-4">
        <div className="flex items-center justify-between border-b border-white/10 pb-2">
          <h3 className="text-xl font-serif-title font-light text-white">Explore Our Spaces</h3>
          <span className="text-xs text-white/40 font-mono">6 Private Pillars</span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3.5">
          {/* 1. Our Love */}
          <GlassPanel
            className="p-5 rounded-2xl border border-rose-500/20 hover:border-rose-500/50 transition-all cursor-pointer space-y-2 group"
            onClick={() => onNavigate("love")}
          >
            <div className="w-9 h-9 rounded-xl bg-rose-500/20 flex items-center justify-center text-rose-300 group-hover:scale-110 transition-transform">
              <BookHeart className="w-5 h-5" />
            </div>
            <h4 className="font-serif text-base text-white group-hover:text-rose-200 transition-colors">Our Love</h4>
            <p className="text-[11px] text-white/50 leading-relaxed font-light">
              Love letters, 365 reasons vault, Safe Space, and timeline.
            </p>
          </GlassPanel>

          {/* 2. Message Boxes */}
          <GlassPanel
            className="p-5 rounded-2xl border border-amber-500/20 hover:border-amber-500/50 transition-all cursor-pointer space-y-2 group"
            onClick={() => onNavigate("boxes")}
          >
            <div className="w-9 h-9 rounded-xl bg-amber-500/20 flex items-center justify-center text-amber-300 group-hover:scale-110 transition-transform">
              <Gift className="w-5 h-5" />
            </div>
            <h4 className="font-serif text-base text-white group-hover:text-amber-200 transition-colors">Message Boxes</h4>
            <p className="text-[11px] text-white/50 leading-relaxed font-light">
              Daily unopened surprises, secret notes, and revealed archive.
            </p>
          </GlassPanel>

          {/* 3. Her Wellbeing */}
          <GlassPanel
            className="p-5 rounded-2xl border border-emerald-500/20 hover:border-emerald-500/50 transition-all cursor-pointer space-y-2 group"
            onClick={() => onNavigate("wellbeing")}
          >
            <div className="w-9 h-9 rounded-xl bg-emerald-500/20 flex items-center justify-center text-emerald-300 group-hover:scale-110 transition-transform">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <h4 className="font-serif text-base text-white group-hover:text-emerald-200 transition-colors">Her Wellbeing</h4>
            <p className="text-[11px] text-white/50 leading-relaxed font-light">
              Privacy-first cycle tracking, symptom log, self-care & health.
            </p>
          </GlassPanel>

          {/* 4. Our Future */}
          <GlassPanel
            className="p-5 rounded-2xl border border-sky-500/20 hover:border-sky-500/50 transition-all cursor-pointer space-y-2 group"
            onClick={() => onNavigate("future")}
          >
            <div className="w-9 h-9 rounded-xl bg-sky-500/20 flex items-center justify-center text-sky-300 group-hover:scale-110 transition-transform">
              <Compass className="w-5 h-5" />
            </div>
            <h4 className="font-serif text-base text-white group-hover:text-sky-200 transition-colors">Our Future</h4>
            <p className="text-[11px] text-white/50 leading-relaxed font-light">
              Shared dream board, date planner, traditions, and Time Capsule.
            </p>
          </GlassPanel>

          {/* 5. Little Things */}
          <GlassPanel
            className="p-5 rounded-2xl border border-purple-500/20 hover:border-purple-500/50 transition-all cursor-pointer space-y-2 group"
            onClick={() => onNavigate("little")}
          >
            <div className="w-9 h-9 rounded-xl bg-purple-500/20 flex items-center justify-center text-purple-300 group-hover:scale-110 transition-transform">
              <Sparkles className="w-5 h-5" />
            </div>
            <h4 className="font-serif text-base text-white group-hover:text-purple-200 transition-colors">Little Things</h4>
            <p className="text-[11px] text-white/50 leading-relaxed font-light">
              Redeemable love vouchers, surprise generator, and daily acts.
            </p>
          </GlassPanel>

          {/* 6. Settings & Security */}
          <GlassPanel
            className="p-5 rounded-2xl border border-white/10 hover:border-white/30 transition-all cursor-pointer space-y-2 group"
            onClick={() => onNavigate("settings")}
          >
            <div className="w-9 h-9 rounded-xl bg-white/10 flex items-center justify-center text-white/70 group-hover:scale-110 transition-transform">
              <Lock className="w-5 h-5" />
            </div>
            <h4 className="font-serif text-base text-white group-hover:text-white transition-colors">Settings & Privacy</h4>
            <p className="text-[11px] text-white/50 leading-relaxed font-light">
              Security settings, partner linking, notifications, and profile.
            </p>
          </GlassPanel>
        </div>
      </div>
    </div>
  );
}
