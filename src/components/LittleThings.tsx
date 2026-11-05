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
  Tv,
  CheckCircle2,
  X
} from "lucide-react";
import GlassPanel from "./GlassPanel";
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

export default function LittleThings({ currentProfile, partnerProfile }: LittleThingsProps) {
  const [activeTab, setActiveTab] = useState<"vouchers" | "surprise" | "acts">("vouchers");

  const currentUserId = currentProfile?.uid || "guest";
  const currentUserRole = currentProfile?.role || "reader";
  const authorName = currentProfile?.displayName || (currentUserRole === "admin" ? "Raaziq" : "Razia");

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
    }, 600);
  };

  const handleToggleActDone = (id: string) => {
    setCompletedActs(prev =>
      prev.includes(id) ? prev.filter(a => a !== id) : [...prev, id]
    );
  };

  const handleAddAct = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newActIdea.trim()) return;

    const newAct: DailyActOfLove = {
      id: `act_${Date.now()}`,
      idea: newActIdea.trim(),
      category: "service",
      isCustom: true
    };

    setActs(prev => [newAct, ...prev]);
    setShowAddActModal(false);
    setNewActIdea("");
    showToast("Daily act of kindness added!");
  };

  return (
    <div className="space-y-8 max-w-5xl mx-auto px-4 sm:px-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/10 pb-6">
        <div className="space-y-1">
          <div className="inline-flex items-center gap-2 px-3 py-0.5 rounded-full bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs tracking-widest uppercase">
            <Gift className="w-3.5 h-3.5" />
            <span>Connection & Play</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-serif-title font-light text-white tracking-tight">
            Little Things & Surprises
          </h1>
          <p className="text-xs sm:text-sm text-white/60 font-light">
            Digital love vouchers, spontaneous surprise generator, and daily acts of kindness.
          </p>
        </div>

        <button
          onClick={() => {
            if (activeTab === "vouchers") setShowAddVoucherModal(true);
            else if (activeTab === "acts") setShowAddActModal(true);
            else handleGenerateSurprise();
          }}
          className="px-4 py-2 rounded-xl bg-gradient-to-r from-rose-500 to-amber-500 hover:from-rose-600 hover:to-amber-600 text-white text-xs font-medium shadow-md transition-all flex items-center gap-2 self-start sm:self-auto"
        >
          {activeTab === "vouchers" && <Plus className="w-4 h-4" />}
          {activeTab === "acts" && <Plus className="w-4 h-4" />}
          {activeTab === "surprise" && <RefreshCw className={`w-4 h-4 ${isSpinningSurprise ? "animate-spin" : ""}`} />}
          <span>
            {activeTab === "vouchers" && "Create Love Voucher"}
            {activeTab === "acts" && "Add Act of Love"}
            {activeTab === "surprise" && "Spin for Surprise"}
          </span>
        </button>
      </div>

      {toastMsg && (
        <motion.div
          initial={{ opacity: 0, y: -5 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-3 bg-emerald-500/20 border border-emerald-500/30 rounded-xl text-center text-emerald-200 text-xs flex items-center justify-center gap-2"
        >
          <CheckCircle2 className="w-4 h-4" />
          <span>{toastMsg}</span>
        </motion.div>
      )}

      {/* Tabs */}
      <div className="flex gap-2 border-b border-white/5 pb-2">
        {[
          { id: "vouchers", label: "Love Vouchers", icon: Gift },
          { id: "surprise", label: "Surprise Generator", icon: Sparkles },
          { id: "acts", label: "Daily Acts of Love", icon: Heart }
        ].map(tab => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`px-3.5 py-2 rounded-xl text-xs font-medium whitespace-nowrap transition-all flex items-center gap-2 ${
                isActive
                  ? "bg-rose-500/20 border border-rose-500/40 text-rose-200 shadow-sm"
                  : "bg-white/5 border border-white/5 text-white/60 hover:text-white"
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* TAB 1: LOVE VOUCHERS */}
      {activeTab === "vouchers" && (
        <div className="space-y-6">
          <div className="space-y-1">
            <h3 className="text-xl font-serif-title font-light text-white">Your Digital Love Vouchers</h3>
            <p className="text-xs text-white/50">Coupons of care, treats, and affection that either partner can redeem.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {vouchers.map(v => (
              <GlassPanel
                key={v.id}
                className={`p-6 rounded-2xl border transition-all flex flex-col justify-between space-y-4 ${
                  v.isRedeemed
                    ? "border-white/5 bg-white/[0.02] opacity-60"
                    : "border-amber-500/30 bg-gradient-to-br from-amber-500/5 to-rose-500/5"
                }`}
              >
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="px-2.5 py-0.5 rounded-full bg-amber-500/10 text-amber-300 font-mono text-[10px] uppercase">
                      {v.category || "Care"}
                    </span>
                    <span className="text-[11px] text-white/40 font-mono">
                      Gifted by {v.creatorName}
                    </span>
                  </div>

                  <h4 className="font-serif text-lg text-white font-medium">{v.title}</h4>
                  <p className="text-white/70 text-xs font-light leading-relaxed">{v.description}</p>
                </div>

                <div className="pt-3 border-t border-white/10 flex items-center justify-between">
                  {v.isRedeemed ? (
                    <span className="text-xs text-emerald-400 font-mono flex items-center gap-1.5">
                      <CheckCircle className="w-4 h-4" /> Redeemed on {v.redeemedAt}
                    </span>
                  ) : (
                    <span className="text-xs text-amber-300 font-mono">Available to Redeem</span>
                  )}

                  <button
                    onClick={() => handleRedeemVoucher(v.id)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-all ${
                      v.isRedeemed
                        ? "bg-white/5 text-white/40 hover:text-white"
                        : "bg-gradient-to-r from-amber-400 to-rose-400 text-black shadow-md hover:opacity-90"
                    }`}
                  >
                    {v.isRedeemed ? "Unmark" : "Redeem Voucher"}
                  </button>
                </div>
              </GlassPanel>
            ))}
          </div>
        </div>
      )}

      {/* TAB 2: SURPRISE GENERATOR */}
      {activeTab === "surprise" && (
        <div className="space-y-6 max-w-xl mx-auto text-center">
          <div className="space-y-2">
            <h3 className="text-2xl font-serif-title font-light text-white">The Random Surprise Generator</h3>
            <p className="text-xs text-white/50">
              Need a spontaneous smile? Spin to reveal a random compliment, memory, free date idea, or romantic challenge.
            </p>
          </div>

          <GlassPanel className="p-8 rounded-3xl border border-amber-500/30 bg-gradient-to-b from-white/[0.07] to-amber-950/20 space-y-6 relative">
            <motion.div
              animate={isSpinningSurprise ? { rotate: 360, scale: [1, 1.1, 1] } : {}}
              transition={{ duration: 0.6 }}
              className="w-16 h-16 mx-auto rounded-2xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-300"
            >
              <Sparkles className="w-8 h-8" />
            </motion.div>

            {currentSurprise && (
              <div className="space-y-3">
                <span className="text-[10px] uppercase font-mono tracking-widest text-amber-300/80">
                  {currentSurprise.type.replace("_", " ")}
                </span>
                <h4 className="font-serif-title text-xl text-white font-medium">{currentSurprise.title}</h4>
                <p className="text-base font-serif italic text-white/90 leading-relaxed max-w-md mx-auto">
                  "{currentSurprise.content}"
                </p>
              </div>
            )}

            <button
              onClick={handleGenerateSurprise}
              disabled={isSpinningSurprise}
              className="px-6 py-3 rounded-full bg-gradient-to-r from-amber-400 to-rose-400 text-black font-medium text-xs shadow-lg shadow-amber-500/20 inline-flex items-center gap-2 hover:opacity-95 transition-opacity"
            >
              <RefreshCw className={`w-4 h-4 ${isSpinningSurprise ? "animate-spin" : ""}`} />
              <span>{isSpinningSurprise ? "Picking something special..." : "Generate Another Surprise"}</span>
            </button>
          </GlassPanel>
        </div>
      )}

      {/* TAB 3: DAILY ACTS OF LOVE */}
      {activeTab === "acts" && (
        <div className="space-y-6">
          <div className="space-y-1">
            <h3 className="text-xl font-serif-title font-light text-white">Daily Acts of Love & Kindness</h3>
            <p className="text-xs text-white/50">Thoughtful everyday gestures to make each other feel treasured.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {acts.map(act => {
              const isDone = completedActs.includes(act.id);
              return (
                <GlassPanel
                  key={act.id}
                  className={`p-4 rounded-xl border transition-all flex items-center justify-between gap-3 ${
                    isDone ? "border-emerald-500/30 bg-emerald-950/10" : "border-white/10"
                  }`}
                >
                  <div className="space-y-1 text-xs">
                    <span className="text-[10px] uppercase font-mono text-rose-300">{act.category}</span>
                    <p className={`font-light leading-relaxed ${isDone ? "line-through text-white/40" : "text-white/85"}`}>
                      {act.idea}
                    </p>
                  </div>

                  <button
                    onClick={() => handleToggleActDone(act.id)}
                    className={`p-2 rounded-xl border transition-colors shrink-0 ${
                      isDone
                        ? "bg-emerald-500 text-black border-emerald-400"
                        : "bg-white/5 border-white/10 text-white/40 hover:text-white"
                    }`}
                    title={isDone ? "Done!" : "Mark completed"}
                  >
                    <CheckCircle className="w-4 h-4" />
                  </button>
                </GlassPanel>
              );
            })}
          </div>
        </div>
      )}

      {/* CREATE VOUCHER MODAL */}
      <AnimatePresence>
        {showAddVoucherModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-md bg-[#161318] border border-amber-500/30 rounded-3xl p-6 sm:p-8 shadow-2xl space-y-4 relative"
            >
              <button
                onClick={() => setShowAddVoucherModal(false)}
                className="absolute top-5 right-5 p-2 text-white/40 hover:text-white rounded-full bg-white/5"
              >
                <X className="w-4 h-4" />
              </button>

              <div className="space-y-1">
                <span className="text-[11px] font-mono uppercase tracking-widest text-amber-300">Love Vouchers</span>
                <h3 className="text-2xl font-serif-title text-white">Gift a Voucher</h3>
              </div>

              <form onSubmit={handleCreateVoucher} className="space-y-4 text-xs">
                <div>
                  <label className="text-white/60 mb-1 block">Voucher Title *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Unconditional Foot Massage..."
                    value={voucherTitle}
                    onChange={(e) => setVoucherTitle(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-white focus:outline-none"
                  />
                </div>

                <div>
                  <label className="text-white/60 mb-1 block">Description *</label>
                  <textarea
                    required
                    rows={3}
                    placeholder="Details of the treat or pampering..."
                    value={voucherDesc}
                    onChange={(e) => setVoucherDesc(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-white focus:outline-none resize-none font-serif"
                  />
                </div>

                <div>
                  <label className="text-white/60 mb-1 block">Category</label>
                  <select
                    value={voucherCat}
                    onChange={(e) => setVoucherCat(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-neutral-900 border border-white/10 text-white focus:outline-none"
                  >
                    <option value="Pampering">Pampering & Relaxation</option>
                    <option value="Care">Acts of Care</option>
                    <option value="Service">Chores & Service</option>
                    <option value="Entertainment">Entertainment & Movies</option>
                    <option value="Food">Food & Treats</option>
                  </select>
                </div>

                <div className="flex justify-end gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowAddVoucherModal(false)}
                    className="px-4 py-2 rounded-xl bg-white/5 text-white/60"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-rose-500 text-white font-medium shadow-md"
                  >
                    Gift Voucher
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ADD ACT MODAL */}
      <AnimatePresence>
        {showAddActModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-md bg-[#161318] border border-rose-500/30 rounded-3xl p-6 sm:p-8 shadow-2xl space-y-4 relative"
            >
              <button
                onClick={() => setShowAddActModal(false)}
                className="absolute top-5 right-5 p-2 text-white/40 hover:text-white rounded-full bg-white/5"
              >
                <X className="w-4 h-4" />
              </button>

              <div className="space-y-1">
                <span className="text-[11px] font-mono uppercase tracking-widest text-rose-300">Daily Kindness</span>
                <h3 className="text-2xl font-serif-title text-white">Add an Act of Love</h3>
              </div>

              <form onSubmit={handleAddAct} className="space-y-4 text-xs">
                <div>
                  <label className="text-white/60 mb-1 block">Idea / Gesture *</label>
                  <textarea
                    required
                    rows={3}
                    placeholder="e.g. Leave a handwritten dua note in their bag..."
                    value={newActIdea}
                    onChange={(e) => setNewActIdea(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-white focus:outline-none resize-none font-serif"
                  />
                </div>

                <div className="flex justify-end gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowAddActModal(false)}
                    className="px-4 py-2 rounded-xl bg-white/5 text-white/60"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 rounded-xl bg-rose-500 hover:bg-rose-600 text-white font-medium shadow-md"
                  >
                    Add Idea
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
