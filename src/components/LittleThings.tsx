import { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  Sparkles,
  Gift,
  Heart,
  CheckCircle,
  Plus,
  RefreshCw,
  Coffee,
  CheckCircle2,
  X,
  HelpCircle,
  Eye,
  MessageSquare,
  Smile
} from "lucide-react";
import GlassPanel from "./GlassPanel";
import FeatureHeader from "./help/FeatureHeader";
import EmptyState from "./help/EmptyState";
import {
  LoveVoucher,
  DailyActOfLove,
  SurprisePoolItem,
  UserProfile
} from "../types";
import {
  INITIAL_LOVE_VOUCHERS,
  INITIAL_DAILY_ACTS,
  INITIAL_SURPRISE_POOL
} from "../lib/seedData";
import { format } from "date-fns";
import { dispatchEmailNotification } from "../lib/emailService";

interface LittleThingsProps {
  currentProfile: UserProfile | null;
  partnerProfile?: UserProfile | null;
}

interface DailyQuestion {
  id: string;
  question: string;
  dateStr: string;
  answers: {
    raaziq?: string;
    razia?: string;
  };
}

interface NoticedMoment {
  id: string;
  author: string;
  authorId: string;
  dateStr: string;
  text: string;
  category: "thoughtful" | "funny" | "kindness" | "achievement";
}

const SAMPLE_DAILY_QUESTIONS = [
  "What is one little thing that made you smile today?",
  "What is something you would love for us to do together this coming weekend?",
  "What is one thing you appreciated about each other today?",
  "What is a shared memory from our journey that you wish we could relive?",
  "What is something you are peacefully looking forward to in our shared future?",
  "If we could take a spontaneous one-day escape tomorrow, where would we go?"
];

export default function LittleThings({ currentProfile, partnerProfile }: LittleThingsProps) {
  const [activeTab, setActiveTab] = useState<"vouchers" | "daily_question" | "noticed" | "acts">("vouchers");

  const currentUserId = currentProfile?.uid || "raaziq";
  const currentUserRole = currentProfile?.role || "reader";
  const authorName = currentProfile?.displayName || (currentUserRole === "admin" ? "Raaziq" : "Razia");
  const isRaaziq = currentUserRole === "admin";

  // Vouchers state
  const [vouchers, setVouchers] = useState<LoveVoucher[]>(INITIAL_LOVE_VOUCHERS);
  const [showAddVoucherModal, setShowAddVoucherModal] = useState(false);
  const [voucherTitle, setVoucherTitle] = useState("");
  const [voucherDesc, setVoucherDesc] = useState("");
  const [voucherCat, setVoucherCat] = useState("Care");

  // Surprise Generator state
  const [surprisePool, setSurprisePool] = useState<SurprisePoolItem[]>(INITIAL_SURPRISE_POOL);
  const [currentSurprise, setCurrentSurprise] = useState<SurprisePoolItem | null>(INITIAL_SURPRISE_POOL[0]);
  const [isSpinningSurprise, setIsSpinningSurprise] = useState(false);

  // Daily Acts state
  const [acts, setActs] = useState<DailyActOfLove[]>(INITIAL_DAILY_ACTS);
  const [completedActs, setCompletedActs] = useState<string[]>([]);
  const [showAddActModal, setShowAddActModal] = useState(false);
  const [newActIdea, setNewActIdea] = useState("");

  // Daily Question state
  const todayDateStr = format(new Date(), "yyyy-MM-dd");
  const [todaysQuestion] = useState<string>(() => {
    const dayIndex = Math.abs(new Date().getDate()) % SAMPLE_DAILY_QUESTIONS.length;
    return SAMPLE_DAILY_QUESTIONS[dayIndex];
  });
  const [myAnswer, setMyAnswer] = useState("");
  const [questionAnswers, setQuestionAnswers] = useState<{ raaziq?: string; razia?: string }>({
    raaziq: "Seeing your smile when we sat together after a long day.",
    razia: ""
  });
  const [answeredToday, setAnsweredToday] = useState(false);

  // Noticed Moments state
  const [noticedMoments, setNoticedMoments] = useState<NoticedMoment[]>([
    {
      id: "n_1",
      author: "Raaziq",
      authorId: "raaziq",
      dateStr: todayDateStr,
      text: "I noticed how softly you made sure everything was quiet while I was focusing. Your thoughtfulness never goes unseen.",
      category: "thoughtful"
    },
    {
      id: "n_2",
      author: "Razia",
      authorId: "razia",
      dateStr: todayDateStr,
      text: "I noticed you remembered to grab my favorite sweet treat without me even having to ask.",
      category: "kindness"
    }
  ]);
  const [showAddNoticedModal, setShowAddNoticedModal] = useState(false);
  const [noticedText, setNoticedText] = useState("");
  const [noticedCat, setNoticedCat] = useState<NoticedMoment["category"]>("thoughtful");

  const [toastMsg, setToastMsg] = useState("");

  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(""), 3500);
  };

  const handleRedeemVoucher = (id: string) => {
    setVouchers(prev =>
      prev.map(v => {
        if (v.id === id) {
          const nextState = !v.isRedeemed;
          return {
            ...v,
            isRedeemed: nextState,
            redeemedAt: nextState ? format(new Date(), "yyyy-MM-dd") : undefined
          };
        }
        return v;
      })
    );
    showToast("Voucher status updated!");
  };

  const handleCreateVoucher = (e: React.FormEvent) => {
    e.preventDefault();
    if (!voucherTitle.trim()) return;

    const newVoucher: LoveVoucher = {
      id: `voucher_${Date.now()}`,
      title: voucherTitle.trim(),
      description: voucherDesc.trim(),
      creatorId: currentUserId,
      creatorName: authorName,
      recipientRole: currentUserRole === "admin" ? "reader" : "admin",
      isRedeemed: false,
      category: voucherCat,
      createdAt: new Date().toISOString()
    };

    setVouchers(prev => [newVoucher, ...prev]);
    setShowAddVoucherModal(false);
    setVoucherTitle("");
    setVoucherDesc("");
    showToast("Digital love voucher gifted!");

    if (partnerProfile?.email) {
      dispatchEmailNotification({
        recipientEmail: partnerProfile.email,
        recipientName: partnerProfile.displayName || "My Beloved",
        senderName: authorName,
        eventType: "voucher.gifted",
        title: `A New Love Voucher for You: ${newVoucher.title} 🎟️`,
        previewText: newVoucher.description,
        deepLink: window.location.origin
      }).catch(err => console.warn("Email error:", err));
    }
  };

  const handleGenerateSurprise = () => {
    if (surprisePool.length === 0 || isSpinningSurprise) return;
    setIsSpinningSurprise(true);

    setTimeout(() => {
      const randomIdx = Math.floor(Math.random() * surprisePool.length);
      setCurrentSurprise(surprisePool[randomIdx]);
      setIsSpinningSurprise(false);
      showToast("Spun a new sweet gesture!");
    }, 600);
  };

  const handleToggleActDone = (id: string) => {
    setCompletedActs(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  const handleAddAct = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newActIdea.trim()) return;

    const newAct: DailyActOfLove = {
      id: `act_${Date.now()}`,
      idea: newActIdea.trim(),
      category: "comfort", isCustom: true
    };

    setActs(prev => [newAct, ...prev]);
    setNewActIdea("");
    setShowAddActModal(false);
    showToast("Added new kindness idea!");
  };

  const handleSubmitDailyAnswer = (e: React.FormEvent) => {
    e.preventDefault();
    if (!myAnswer.trim()) return;

    const key = isRaaziq ? "raaziq" : "razia";
    setQuestionAnswers(prev => ({
      ...prev,
      [key]: myAnswer.trim()
    }));
    setAnsweredToday(true);
    setMyAnswer("");
    showToast("Answer shared! Both reflections are visible below.");
  };

  const handleAddNoticed = (e: React.FormEvent) => {
    e.preventDefault();
    if (!noticedText.trim()) return;

    const newNotice: NoticedMoment = {
      id: `notice_${Date.now()}`,
      author: authorName,
      authorId: currentUserId,
      dateStr: todayDateStr,
      text: noticedText.trim(),
      category: noticedCat
    };

    setNoticedMoments(prev => [newNotice, ...prev]);
    setNoticedText("");
    setShowAddNoticedModal(false);
    showToast("Everyday appreciation recorded!");
  };

  return (
    <div className="space-y-8 max-w-5xl mx-auto px-4 sm:px-6 animate-fadeIn pb-12">
      {/* Self-Explanatory Header */}
      <FeatureHeader
        title="Little Things That Mean Everything"
        badge="Connection"
        subtitle="Everyday appreciation, love vouchers, daily questions, and spontaneous kindness"
        description="Great marriages are built from a million quiet, thoughtful moments. Gift vouchers, answer today's relationship question, and notice the small kindnesses."
        helpDetails={{
          howItWorks:
            "This space holds everyday romantic rituals. Redeem vouchers when you want a massage or sweet treat, answer the daily question together to spark deep conversation, and log little things you noticed your partner do.",
          tips: [
            "Love Vouchers can be redeemed anytime by either partner.",
            "Our Daily Question updates each day with thoughtful relationship reflections.",
            "Little Things I Noticed lets you celebrate everyday gestures that often go unsaid."
          ],
          privacyNote: "Everything in Little Things is shared openly between Raaziq and Razia to nurture connection."
        }}
        primaryAction={{
          label:
            activeTab === "vouchers"
              ? "Gift a Voucher"
              : activeTab === "noticed"
              ? "Notice Something"
              : "Spin a Surprise",
          onClick: () => {
            if (activeTab === "vouchers") setShowAddVoucherModal(true);
            else if (activeTab === "noticed") setShowAddNoticedModal(true);
            else handleGenerateSurprise();
          },
          icon: <Plus className="w-4 h-4" />
        }}
      />

      {toastMsg && (
        <motion.div
          initial={{ opacity: 0, y: -5 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-3 bg-emerald-500/20 border border-emerald-500/30 rounded-xl text-center text-emerald-200 text-xs flex items-center justify-center gap-2 shadow-lg"
        >
          <CheckCircle2 className="w-4 h-4" />
          <span>{toastMsg}</span>
        </motion.div>
      )}

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-white/10 pb-2 overflow-x-auto">
        <button
          onClick={() => setActiveTab("vouchers")}
          className={`px-4 py-2 rounded-xl text-xs font-serif transition flex items-center gap-1.5 whitespace-nowrap ${
            activeTab === "vouchers"
              ? "bg-rose-500/25 text-rose-200 border border-rose-500/40"
              : "text-stone-400 hover:text-white hover:bg-white/5"
          }`}
        >
          <Gift className="w-3.5 h-3.5" />
          <span>Love Vouchers ({vouchers.length})</span>
        </button>

        <button
          onClick={() => setActiveTab("daily_question")}
          className={`px-4 py-2 rounded-xl text-xs font-serif transition flex items-center gap-1.5 whitespace-nowrap ${
            activeTab === "daily_question"
              ? "bg-rose-500/25 text-rose-200 border border-rose-500/40"
              : "text-stone-400 hover:text-white hover:bg-white/5"
          }`}
        >
          <MessageSquare className="w-3.5 h-3.5" />
          <span>Our Daily Question</span>
        </button>

        <button
          onClick={() => setActiveTab("noticed")}
          className={`px-4 py-2 rounded-xl text-xs font-serif transition flex items-center gap-1.5 whitespace-nowrap ${
            activeTab === "noticed"
              ? "bg-rose-500/25 text-rose-200 border border-rose-500/40"
              : "text-stone-400 hover:text-white hover:bg-white/5"
          }`}
        >
          <Eye className="w-3.5 h-3.5" />
          <span>Little Things I Noticed ({noticedMoments.length})</span>
        </button>

        <button
          onClick={() => setActiveTab("acts")}
          className={`px-4 py-2 rounded-xl text-xs font-serif transition flex items-center gap-1.5 whitespace-nowrap ${
            activeTab === "acts"
              ? "bg-rose-500/25 text-rose-200 border border-rose-500/40"
              : "text-stone-400 hover:text-white hover:bg-white/5"
          }`}
        >
          <Sparkles className="w-3.5 h-3.5" />
          <span>Acts & Surprise Wheel</span>
        </button>
      </div>

      {/* TAB 1: LOVE VOUCHERS */}
      {activeTab === "vouchers" && (
        <div className="space-y-6 animate-fadeIn">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {vouchers.map(v => (
              <GlassPanel
                key={v.id}
                className={`p-5 rounded-2xl border transition-all flex flex-col justify-between ${
                  v.isRedeemed
                    ? "opacity-60 border-white/5 bg-black/30"
                    : "border-rose-300/20 hover:border-rose-400/50 hover:shadow-lg"
                }`}
              >
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="px-2 py-0.5 rounded text-[10px] font-mono uppercase bg-rose-500/20 text-rose-300">
                      {v.category}
                    </span>
                    {v.isRedeemed ? (
                      <span className="text-[10px] font-mono text-emerald-400 flex items-center gap-1">
                        <CheckCircle className="w-3 h-3" />
                        Redeemed
                      </span>
                    ) : (
                      <span className="text-[10px] font-mono text-amber-300">Ready to redeem</span>
                    )}
                  </div>
                  <h4 className="text-base font-serif text-white font-medium">{v.title}</h4>
                  <p className="text-xs text-stone-300 font-serif italic leading-relaxed">{v.description}</p>
                </div>

                <div className="mt-4 pt-3 border-t border-white/10 flex items-center justify-between">
                  <span className="text-[10px] text-stone-500 font-serif">From: {v.creatorName}</span>
                  <button
                    onClick={() => handleRedeemVoucher(v.id)}
                    className={`px-3 py-1 rounded-xl text-xs font-serif transition ${
                      v.isRedeemed
                        ? "bg-white/5 text-stone-400 hover:text-white"
                        : "bg-rose-600/80 hover:bg-rose-500 text-white shadow-sm"
                    }`}
                  >
                    {v.isRedeemed ? "Mark Unused" : "Redeem Now"}
                  </button>
                </div>
              </GlassPanel>
            ))}
          </div>
        </div>
      )}

      {/* TAB 2: OUR DAILY QUESTION */}
      {activeTab === "daily_question" && (
        <div className="space-y-6 animate-fadeIn max-w-3xl mx-auto">
          <GlassPanel className="p-6 sm:p-8 rounded-3xl border-rose-300/30 text-center space-y-4">
            <span className="px-3 py-1 rounded-full text-[10px] font-mono tracking-widest uppercase bg-rose-500/20 text-rose-300 border border-rose-500/30">
              Today's Reflection Question
            </span>
            <h3 className="text-xl sm:text-2xl font-serif text-white font-medium leading-snug">
              "{todaysQuestion}"
            </h3>
            <p className="text-xs text-stone-400 font-serif italic">
              A gentle prompt to reflect on together before you sleep or as you start your morning.
            </p>

            {/* Answer Box */}
            <form onSubmit={handleSubmitDailyAnswer} className="space-y-3 pt-2 text-left">
              <label className="text-xs font-mono uppercase tracking-wider text-stone-300 block">
                Your Answer ({authorName}):
              </label>
              <textarea
                rows={3}
                required
                value={myAnswer}
                onChange={e => setMyAnswer(e.target.value)}
                placeholder="Share your sincere, heartfelt reflection..."
                className="w-full p-3 bg-black/40 border border-white/20 rounded-2xl text-xs sm:text-sm font-serif text-white placeholder-stone-500 focus:outline-none focus:border-rose-400 leading-relaxed"
              />
              <div className="flex justify-end">
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-gradient-to-r from-rose-600 to-rose-500 hover:from-rose-500 hover:to-rose-400 text-white text-xs font-serif font-semibold shadow-md transition hover:scale-105 active:scale-95"
                >
                  Share Answer
                </button>
              </div>
            </form>
          </GlassPanel>

          {/* Reflections Shared */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <GlassPanel className="p-5 rounded-2xl border-white/10 space-y-2">
              <div className="flex items-center justify-between text-xs pb-2 border-b border-white/10">
                <span className="font-serif font-bold text-rose-300">Raaziq's Reflection</span>
                <span className="text-[10px] font-mono text-stone-500">{todayDateStr}</span>
              </div>
              <p className="text-xs sm:text-sm font-serif italic text-stone-200 leading-relaxed">
                "{questionAnswers.raaziq || "Waiting to write today's thought..."}"
              </p>
            </GlassPanel>

            <GlassPanel className="p-5 rounded-2xl border-white/10 space-y-2">
              <div className="flex items-center justify-between text-xs pb-2 border-b border-white/10">
                <span className="font-serif font-bold text-rose-300">Razia's Reflection</span>
                <span className="text-[10px] font-mono text-stone-500">{todayDateStr}</span>
              </div>
              <p className="text-xs sm:text-sm font-serif italic text-stone-200 leading-relaxed">
                "{questionAnswers.razia || "Waiting for Razia to write her thought..."}"
              </p>
            </GlassPanel>
          </div>
        </div>
      )}

      {/* TAB 3: LITTLE THINGS I NOTICED */}
      {activeTab === "noticed" && (
        <div className="space-y-6 animate-fadeIn">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {noticedMoments.map(n => (
              <GlassPanel key={n.id} className="p-5 rounded-2xl border-white/10 space-y-3">
                <div className="flex items-center justify-between pb-2 border-b border-white/10 text-xs">
                  <span className="px-2 py-0.5 rounded text-[10px] font-mono uppercase bg-amber-500/20 text-amber-300">
                    {n.category}
                  </span>
                  <span className="text-[10px] font-mono text-stone-500">{n.dateStr}</span>
                </div>
                <p className="text-xs sm:text-sm font-serif italic text-stone-200 leading-relaxed">
                  "{n.text}"
                </p>
                <div className="text-right text-[11px] font-serif text-stone-400">
                  — Noticed by <strong className="text-white">{n.author}</strong>
                </div>
              </GlassPanel>
            ))}
          </div>
        </div>
      )}

      {/* TAB 4: ACTS & SURPRISE WHEEL */}
      {activeTab === "acts" && (
        <div className="space-y-6 animate-fadeIn">
          {/* Surprise Gesture Box */}
          <GlassPanel className="p-6 sm:p-8 rounded-3xl border-rose-300/30 text-center space-y-4">
            <span className="px-3 py-1 rounded-full text-[10px] font-mono uppercase bg-rose-500/20 text-rose-300">
              Spontaneous Romantic Gesture
            </span>
            <h3 className="text-xl sm:text-2xl font-serif text-white font-medium">
              "{currentSurprise?.title || "Make her favorite tea and listen to her day."}"
            </h3>
            <p className="text-xs text-stone-300 font-serif italic max-w-md mx-auto">
              {currentSurprise?.content}
            </p>
            <div className="pt-2">
              <button
                onClick={handleGenerateSurprise}
                disabled={isSpinningSurprise}
                className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-rose-600 to-rose-500 hover:from-rose-500 hover:to-rose-400 text-white text-xs font-serif font-semibold shadow-md transition flex items-center gap-1.5 mx-auto"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isSpinningSurprise ? "animate-spin" : ""}`} />
                <span>Spin a New Idea</span>
              </button>
            </div>
          </GlassPanel>

          {/* Daily Acts Checklist */}
          <div className="space-y-3">
            <h4 className="text-xs font-mono uppercase tracking-wider text-stone-400">
              Daily Acts of Love Checklist
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {acts.map(act => {
                const isDone = completedActs.includes(act.id);
                return (
                  <GlassPanel
                    key={act.id}
                    onClick={() => handleToggleActDone(act.id)}
                    className={`p-4 rounded-xl border cursor-pointer transition flex items-center justify-between ${
                      isDone
                        ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-200"
                        : "border-white/10 hover:border-white/20 text-stone-300"
                    }`}
                  >
                    <span className="text-xs font-serif">{act.idea}</span>
                    <div
                      className={`w-5 h-5 rounded-md border flex items-center justify-center transition ${
                        isDone
                          ? "bg-emerald-500 border-emerald-400 text-white"
                          : "border-white/30"
                      }`}
                    >
                      {isDone && <CheckCircle className="w-3.5 h-3.5" />}
                    </div>
                  </GlassPanel>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Add Voucher Modal */}
      {showAddVoucherModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fadeIn">
          <GlassPanel className="relative w-full max-w-md p-6 rounded-3xl border-rose-300/30 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-white/10">
              <h3 className="text-lg font-serif text-white font-medium">Gift a Love Voucher</h3>
              <button onClick={() => setShowAddVoucherModal(false)} className="text-stone-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleCreateVoucher} className="space-y-4 pt-3 text-xs font-serif">
              <div>
                <label className="text-stone-300 block mb-1">Voucher Title</label>
                <input
                  type="text"
                  required
                  value={voucherTitle}
                  onChange={e => setVoucherTitle(e.target.value)}
                  placeholder="e.g. 20-minute shoulder massage"
                  className="w-full px-3 py-2 rounded-xl bg-black/40 border border-white/20 text-white focus:outline-none focus:border-rose-400 font-sans"
                />
              </div>
              <div>
                <label className="text-stone-300 block mb-1">Description / Terms of Love</label>
                <textarea
                  rows={3}
                  value={voucherDesc}
                  onChange={e => setVoucherDesc(e.target.value)}
                  placeholder="Redeemable on demand, no expiration date..."
                  className="w-full px-3 py-2 rounded-xl bg-black/40 border border-white/20 text-white focus:outline-none focus:border-rose-400 font-sans"
                />
              </div>
              <div>
                <label className="text-stone-300 block mb-1">Category</label>
                <select
                  value={voucherCat}
                  onChange={e => setVoucherCat(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-stone-900 border border-white/20 text-white focus:outline-none focus:border-rose-400 font-sans"
                >
                  <option value="Care">Care & Pampering</option>
                  <option value="Adventure">Adventure & Outing</option>
                  <option value="Sweet">Sweet Treats</option>
                  <option value="Peace">Quiet Time & Rest</option>
                </select>
              </div>
              <div className="flex justify-end gap-2 pt-2 border-t border-white/10">
                <button
                  type="button"
                  onClick={() => setShowAddVoucherModal(false)}
                  className="px-4 py-2 text-stone-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-serif font-semibold shadow-md transition"
                >
                  Gift Voucher
                </button>
              </div>
            </form>
          </GlassPanel>
        </div>
      )}

      {/* Add Noticed Moment Modal */}
      {showAddNoticedModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fadeIn">
          <GlassPanel className="relative w-full max-w-md p-6 rounded-3xl border-rose-300/30 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-white/10">
              <h3 className="text-lg font-serif text-white font-medium">Record a Thoughtful Gesture</h3>
              <button onClick={() => setShowAddNoticedModal(false)} className="text-stone-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleAddNoticed} className="space-y-4 pt-3 text-xs font-serif">
              <div>
                <label className="text-stone-300 block mb-1">What did you notice?</label>
                <textarea
                  rows={3}
                  required
                  value={noticedText}
                  onChange={e => setNoticedText(e.target.value)}
                  placeholder="I noticed how sweetly you..."
                  className="w-full px-3 py-2 rounded-xl bg-black/40 border border-white/20 text-white focus:outline-none focus:border-rose-400 font-serif leading-relaxed"
                />
              </div>
              <div>
                <label className="text-stone-300 block mb-1">Category</label>
                <select
                  value={noticedCat}
                  onChange={e => setNoticedCat(e.target.value as any)}
                  className="w-full px-3 py-2 rounded-xl bg-stone-900 border border-white/20 text-white focus:outline-none focus:border-rose-400 font-sans"
                >
                  <option value="thoughtful">Thoughtful Gesture</option>
                  <option value="kindness">Act of Kindness</option>
                  <option value="funny">Something Funny</option>
                  <option value="achievement">Small Achievement</option>
                </select>
              </div>
              <div className="flex justify-end gap-2 pt-2 border-t border-white/10">
                <button
                  type="button"
                  onClick={() => setShowAddNoticedModal(false)}
                  className="px-4 py-2 text-stone-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-serif font-semibold shadow-md transition"
                >
                  Record Appreciation
                </button>
              </div>
            </form>
          </GlassPanel>
        </div>
      )}
    </div>
  );
}
