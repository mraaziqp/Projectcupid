import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  Compass,
  Sparkles,
  Calendar,
  Lock,
  Unlock,
  CheckCircle,
  Plus,
  Heart,
  Clock,
  Coffee,
  Trees,
  CheckCircle2,
  X
} from "lucide-react";
import GlassPanel from "./GlassPanel";
import {
  DreamBoardItem,
  FutureLetter,
  DatePlan,
  MarriageTradition,
  TimeCapsule,
  AnniversaryAnswers,
  UserProfile
} from "../types";
import {
  INITIAL_DREAM_BOARD,
  INITIAL_DATE_PLANS,
  INITIAL_TRADITIONS
} from "../lib/seedData";
import { db } from "../lib/firebase";
import { collection, doc, getDocs, setDoc, Timestamp } from "firebase/firestore";
import { format } from "date-fns";

interface OurFutureProps {
  currentProfile: UserProfile | null;
  partnerProfile?: UserProfile | null;
}

const DREAM_CATEGORIES = [
  "All",
  "Dreams That Cost Nothing",
  "Home",
  "Experiences",
  "Travel",
  "Family"
];

const ANNIVERSARY_QUESTIONS = [
  { key: "favoriteMemory", label: "What was your favourite memory together this year?" },
  { key: "feltLoved", label: "What did your partner do that made you feel most deeply loved?" },
  { key: "overcameTogether", label: "What challenge did we overcome as a team?" },
  { key: "gratefulFor", label: "What are you most grateful for in our marriage right now?" },
  { key: "nextYearDreams", label: "What do you dream about us doing or creating in the coming year?" },
  { key: "messageToMarriedSelf", label: "What would you tell the versions of ourselves who just got married?" }
];

export default function OurFuture({ currentProfile, partnerProfile }: OurFutureProps) {
  const [activeTab, setActiveTab] = useState<"dreams" | "capsule" | "dates" | "traditions" | "letters">("dreams");

  const currentUserId = currentProfile?.uid || "guest";
  const currentUserRole = currentProfile?.role || "reader";
  const partnerName = partnerProfile?.displayName || (currentUserRole === "admin" ? "Razia" : "Raaziq");
  const authorName = currentProfile?.displayName || (currentUserRole === "admin" ? "Raaziq" : "Razia");

  // Dream Board State
  const [dreams, setDreams] = useState<DreamBoardItem[]>(INITIAL_DREAM_BOARD);
  const [dreamCategory, setDreamCategory] = useState("All");
  const [showAddDreamModal, setShowAddDreamModal] = useState(false);
  const [dreamTitle, setDreamTitle] = useState("");
  const [dreamDesc, setDreamDesc] = useState("");
  const [dreamCat, setDreamCat] = useState("Home");
  const [isFreeDream, setIsFreeDream] = useState(false);

  // Time Capsule State
  const [capsules, setCapsules] = useState<TimeCapsule[]>([
    {
      id: "capsule_1",
      yearNumber: 1,
      title: "1st Anniversary Marriage Time Capsule",
      anniversaryDate: "1st Anniversary",
      isSealed: true,
      unlockDate: "1st Anniversary",
      partner1Answers: {
        favoriteMemory: "Our quiet evenings sitting by the window in Cape Town.",
        feltLoved: "How you always make sure I have tea and never let me feel alone.",
        overcameTogether: "Navigating our new routines and setting up our home with joy.",
        gratefulFor: "The peace and tranquility Allah placed in our marriage.",
        nextYearDreams: "To travel to the mountains and read books under the open sky.",
        messageToMarriedSelf: "Be gentle with each other. Love grows in the quiet moments."
      },
      createdAt: new Date()
    }
  ]);
  const [showCapsuleModal, setShowCapsuleModal] = useState(false);
  const [selectedCapsule, setSelectedCapsule] = useState<TimeCapsule | null>(null);
  const [answers, setAnswers] = useState<AnniversaryAnswers>({
    favoriteMemory: "",
    feltLoved: "",
    overcameTogether: "",
    gratefulFor: "",
    nextYearDreams: "",
    messageToMarriedSelf: ""
  });

  // Date Planner State
  const [datePlans, setDatePlans] = useState<DatePlan[]>(INITIAL_DATE_PLANS);
  const [showAddDateModal, setShowAddDateModal] = useState(false);
  const [dateTitle, setDateTitle] = useState("");
  const [dateDesc, setDateDesc] = useState("");
  const [dateCat, setDateCat] = useState("Free");

  // Traditions State
  const [traditions, setTraditions] = useState<MarriageTradition[]>(INITIAL_TRADITIONS);
  const [showAddTraditionModal, setShowAddTraditionModal] = useState(false);
  const [tradTitle, setTradTitle] = useState("");
  const [tradFreq, setTradFreq] = useState<MarriageTradition["frequency"]>("weekly");
  const [tradDesc, setTradDesc] = useState("");

  // Future Letters State
  const [futureLetters, setFutureLetters] = useState<FutureLetter[]>([
    {
      id: "fut_1",
      title: "To Us on Our 5th Anniversary",
      content: "If you are reading this, five years of marriage have passed. Remember how we started with simple hopes, big dreams, and complete trust in Allah. I love you more today than yesterday.",
      authorId: "raaziq",
      authorName: "Raaziq",
      releaseDate: "2029-01-01",
      isOpened: false,
      createdAt: new Date()
    }
  ]);
  const [showAddFutureLetterModal, setShowAddFutureLetterModal] = useState(false);
  const [futureLetterTitle, setFutureLetterTitle] = useState("");
  const [futureLetterContent, setFutureLetterContent] = useState("");
  const [futureLetterReleaseDate, setFutureLetterReleaseDate] = useState("");

  const [toastMsg, setToastMsg] = useState("");

  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(""), 3500);
  };

  const handleAddDream = (e: React.FormEvent) => {
    e.preventDefault();
    if (!dreamTitle.trim()) return;

    const newDream: DreamBoardItem = {
      id: `dream_${Date.now()}`,
      title: dreamTitle.trim(),
      description: dreamDesc.trim(),
      category: isFreeDream ? "Free" : (dreamCat as any),
      isCostNothing: isFreeDream,
      progress: 10,
      isCompleted: false,
      createdAt: new Date().toISOString()
    };

    setDreams(prev => [newDream, ...prev]);
    setShowAddDreamModal(false);
    setDreamTitle("");
    setDreamDesc("");
    setIsFreeDream(false);
    showToast("Dream added to your shared board!");
  };

  const handleToggleDreamCompleted = (id: string) => {
    setDreams(prev =>
      prev.map(d => (d.id === id ? { ...d, isCompleted: !d.isCompleted, progress: !d.isCompleted ? 100 : 50 } : d))
    );
  };

  const handleSaveCapsuleAnswers = (e: React.FormEvent) => {
    e.preventDefault();
    const newCapsule: TimeCapsule = {
      id: `capsule_${Date.now()}`,
      yearNumber: capsules.length + 1,
      title: `Year ${capsules.length + 1} Marriage Time Capsule`,
      anniversaryDate: format(new Date(), "yyyy-MM-dd"),
      isSealed: true,
      unlockDate: "Next Anniversary",
      partner1Answers: answers,
      createdAt: new Date()
    };

    setCapsules(prev => [newCapsule, ...prev]);
    setShowCapsuleModal(false);
    setAnswers({
      favoriteMemory: "",
      feltLoved: "",
      overcameTogether: "",
      gratefulFor: "",
      nextYearDreams: "",
      messageToMarriedSelf: ""
    });
    showToast("Marriage Time Capsule successfully sealed!");
  };

  const handleAddDatePlan = (e: React.FormEvent) => {
    e.preventDefault();
    if (!dateTitle.trim()) return;

    const newPlan: DatePlan = {
      id: `date_${Date.now()}`,
      title: dateTitle.trim(),
      description: dateDesc.trim(),
      category: dateCat as any,
      isCompleted: false,
      costEstimate: dateCat === "Free" ? "Free" : "$",
      createdAt: new Date().toISOString()
    };

    setDatePlans(prev => [newPlan, ...prev]);
    setShowAddDateModal(false);
    setDateTitle("");
    setDateDesc("");
    showToast("Date idea added to your planner!");
  };

  const handleToggleDateDone = (id: string) => {
    setDatePlans(prev =>
      prev.map(p => (p.id === id ? { ...p, isCompleted: !p.isCompleted } : p))
    );
  };

  const handleAddTradition = (e: React.FormEvent) => {
    e.preventDefault();
    if (!tradTitle.trim()) return;

    const newTrad: MarriageTradition = {
      id: `trad_${Date.now()}`,
      title: tradTitle.trim(),
      frequency: tradFreq,
      description: tradDesc.trim()
    };

    setTraditions(prev => [...prev, newTrad]);
    setShowAddTraditionModal(false);
    setTradTitle("");
    setTradDesc("");
    showToast("Marriage tradition established!");
  };

  const handleAddFutureLetter = (e: React.FormEvent) => {
    e.preventDefault();
    if (!futureLetterTitle.trim() || !futureLetterContent.trim() || !futureLetterReleaseDate) return;

    const newLetter: FutureLetter = {
      id: `fut_${Date.now()}`,
      title: futureLetterTitle.trim(),
      content: futureLetterContent.trim(),
      authorId: currentUserId,
      authorName,
      releaseDate: futureLetterReleaseDate,
      isOpened: false,
      createdAt: new Date()
    };

    setFutureLetters(prev => [newLetter, ...prev]);
    setShowAddFutureLetterModal(false);
    setFutureLetterTitle("");
    setFutureLetterContent("");
    setFutureLetterReleaseDate("");
    showToast("Letter to the future sealed!");
  };

  // Filtered dreams
  const filteredDreams = dreams.filter(d => {
    if (dreamCategory === "Dreams That Cost Nothing") return d.isCostNothing;
    if (dreamCategory !== "All" && d.category !== dreamCategory) return false;
    return true;
  });

  return (
    <div className="space-y-8 max-w-5xl mx-auto px-4 sm:px-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/10 pb-6">
        <div className="space-y-1">
          <div className="inline-flex items-center gap-2 px-3 py-0.5 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-300 text-xs tracking-widest uppercase">
            <Compass className="w-3.5 h-3.5" />
            <span>Shared Future & Horizon</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-serif-title font-light text-white tracking-tight">
            Our Shared Future & Traditions
          </h1>
          <p className="text-xs sm:text-sm text-white/60 font-light">
            Dream boards, free date ideas, marriage traditions, and annual anniversary time capsules.
          </p>
        </div>

        <button
          onClick={() => {
            if (activeTab === "dreams") setShowAddDreamModal(true);
            else if (activeTab === "capsule") setShowCapsuleModal(true);
            else if (activeTab === "dates") setShowAddDateModal(true);
            else if (activeTab === "traditions") setShowAddTraditionModal(true);
            else setShowAddFutureLetterModal(true);
          }}
          className="px-4 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-rose-500 hover:from-amber-600 hover:to-rose-600 text-white text-xs font-medium shadow-md transition-all flex items-center gap-2 self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>
            {activeTab === "dreams" && "Add a Dream"}
            {activeTab === "capsule" && "Seal Time Capsule"}
            {activeTab === "dates" && "Add Date Idea"}
            {activeTab === "traditions" && "Add Tradition"}
            {activeTab === "letters" && "Write Future Letter"}
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
      <div className="flex overflow-x-auto gap-2 pb-2 custom-scrollbar">
        {[
          { id: "dreams", label: "Shared Dream Board", icon: Sparkles },
          { id: "capsule", label: "Marriage Time Capsule", icon: Lock },
          { id: "dates", label: "Date Planner", icon: Calendar },
          { id: "traditions", label: "Our Traditions", icon: Coffee },
          { id: "letters", label: "Future Letters", icon: Clock }
        ].map(tab => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`px-3.5 py-2 rounded-xl text-xs font-medium whitespace-nowrap transition-all flex items-center gap-2 ${
                isActive
                  ? "bg-amber-500/20 border border-amber-500/40 text-amber-200 shadow-sm"
                  : "bg-white/5 border border-white/5 text-white/60 hover:text-white"
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* TAB 1: SHARED DREAM BOARD */}
      {activeTab === "dreams" && (
        <div className="space-y-6">
          {/* Category filter pills */}
          <div className="flex overflow-x-auto gap-2 pb-1 custom-scrollbar">
            {DREAM_CATEGORIES.map(cat => (
              <button
                key={cat}
                onClick={() => setDreamCategory(cat)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                  dreamCategory === cat
                    ? "bg-amber-500/30 text-amber-200 border border-amber-500/40"
                    : "bg-white/5 text-white/60 hover:text-white"
                }`}
              >
                {cat}
              </button>
            ))}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filteredDreams.map(dream => (
              <GlassPanel
                key={dream.id}
                className="p-5 rounded-2xl border border-white/10 hover:border-amber-500/30 transition-all flex flex-col justify-between space-y-4"
              >
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-mono ${
                      dream.isCostNothing
                        ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                        : "bg-amber-500/10 text-amber-300"
                    }`}>
                      {dream.isCostNothing ? "✨ Dreams That Cost Nothing" : dream.category}
                    </span>
                    <button
                      onClick={() => handleToggleDreamCompleted(dream.id)}
                      className={`text-xs flex items-center gap-1 transition-colors ${
                        dream.isCompleted ? "text-emerald-400" : "text-white/40 hover:text-white"
                      }`}
                    >
                      <CheckCircle className="w-4 h-4" />
                      <span>{dream.isCompleted ? "Achieved" : "Mark Achieved"}</span>
                    </button>
                  </div>

                  <h4 className="font-serif text-lg text-white/95 font-medium">{dream.title}</h4>
                  <p className="text-white/65 text-xs font-light leading-relaxed">{dream.description}</p>
                </div>

                {/* Progress bar */}
                <div className="pt-2 border-t border-white/5 space-y-1">
                  <div className="flex justify-between text-[10px] text-white/40 font-mono">
                    <span>Progress</span>
                    <span>{dream.progress}%</span>
                  </div>
                  <div className="w-full h-1.5 rounded-full bg-white/5 overflow-hidden">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-amber-400 to-rose-400 transition-all duration-500"
                      style={{ width: `${dream.progress}%` }}
                    />
                  </div>
                </div>
              </GlassPanel>
            ))}
          </div>
        </div>
      )}

      {/* TAB 2: THE MARRIAGE TIME CAPSULE */}
      {activeTab === "capsule" && (
        <div className="space-y-6">
          <div className="p-6 rounded-3xl bg-gradient-to-b from-amber-500/10 to-rose-950/20 border border-amber-500/25 space-y-3 text-center max-w-2xl mx-auto">
            <Lock className="w-8 h-8 text-amber-400 mx-auto" />
            <h3 className="text-2xl font-serif-title font-light text-white">The Annual Marriage Time Capsule</h3>
            <p className="text-xs text-white/60 leading-relaxed">
              Every year on our anniversary, both of us answer the same 6 sacred questions. The capsule is sealed and saved forever to watch our marriage deepen year after year.
            </p>
            <div className="pt-2">
              <button
                onClick={() => setShowCapsuleModal(true)}
                className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-rose-500 text-white font-medium text-xs shadow-md"
              >
                Answer & Seal This Year's Capsule
              </button>
            </div>
          </div>

          {/* Sealed capsules history */}
          <div className="space-y-4">
            <h4 className="text-sm font-mono uppercase tracking-widest text-white/50">Sealed Anniversary Capsules</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {capsules.map(cap => (
                <GlassPanel
                  key={cap.id}
                  className="p-5 rounded-2xl border border-white/10 hover:border-amber-500/30 transition-all space-y-3 cursor-pointer"
                  onClick={() => setSelectedCapsule(cap)}
                >
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-amber-300 font-mono uppercase">{cap.anniversaryDate}</span>
                    <span className="px-2 py-0.5 rounded-md bg-white/10 text-white/70 text-[10px] flex items-center gap-1">
                      <Lock className="w-3 h-3" /> Sealed
                    </span>
                  </div>
                  <h4 className="font-serif text-lg text-white/95 font-medium">{cap.title}</h4>
                  <p className="text-white/60 text-xs italic">
                    Tap to open and read our reflections from this anniversary year.
                  </p>
                </GlassPanel>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: DATE PLANNER */}
      {activeTab === "dates" && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-xl font-serif-title font-light text-white">Our Date Planner</h3>
              <p className="text-xs text-white/50">Prioritizing connection over spending — free dates, cozy at-home nights, and Cape Town adventures.</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {datePlans.map(plan => (
              <GlassPanel key={plan.id} className="p-5 rounded-2xl border border-white/10 space-y-3 flex flex-col justify-between">
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="px-2.5 py-0.5 rounded-full bg-white/5 border border-white/10 text-amber-300 font-mono text-[10px]">
                      {plan.category} ({plan.costEstimate})
                    </span>
                    <button
                      onClick={() => handleToggleDateDone(plan.id)}
                      className={`text-xs flex items-center gap-1 transition-colors ${
                        plan.isCompleted ? "text-emerald-400" : "text-white/40 hover:text-white"
                      }`}
                    >
                      <CheckCircle className="w-4 h-4" />
                      <span>{plan.isCompleted ? "Completed" : "Mark Done"}</span>
                    </button>
                  </div>
                  <h4 className="font-serif text-lg text-white font-medium">{plan.title}</h4>
                  <p className="text-white/65 text-xs font-light leading-relaxed">{plan.description}</p>
                </div>
              </GlassPanel>
            ))}
          </div>
        </div>
      )}

      {/* TAB 4: MARRIAGE TRADITIONS */}
      {activeTab === "traditions" && (
        <div className="space-y-6">
          <div className="space-y-1">
            <h3 className="text-xl font-serif-title font-light text-white">Our Marriage Traditions</h3>
            <p className="text-xs text-white/50">Habits, rituals, and rhythms that keep our foundation strong.</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {traditions.map(trad => (
              <GlassPanel key={trad.id} className="p-5 rounded-2xl border border-white/10 space-y-3">
                <span className="text-[10px] uppercase font-mono tracking-widest text-rose-300">{trad.frequency}</span>
                <h4 className="font-serif text-base text-white font-medium">{trad.title}</h4>
                <p className="text-white/65 text-xs font-light leading-relaxed">{trad.description}</p>
              </GlassPanel>
            ))}
          </div>
        </div>
      )}

      {/* TAB 5: FUTURE LETTERS */}
      {activeTab === "letters" && (
        <div className="space-y-6">
          <div className="space-y-1">
            <h3 className="text-xl font-serif-title font-light text-white">Letters to Our Future Selves</h3>
            <p className="text-xs text-white/50">Letters written today, locked until a future anniversary or milestone.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {futureLetters.map(fl => (
              <GlassPanel key={fl.id} className="p-5 rounded-2xl border border-white/10 space-y-3">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-amber-400 font-mono text-[10px]">Unlocks: {fl.releaseDate}</span>
                  <span className="flex items-center gap-1 text-white/40 text-[10px]">
                    <Lock className="w-3 h-3" /> Sealed
                  </span>
                </div>
                <h4 className="font-serif text-lg text-white font-medium">{fl.title}</h4>
                <p className="text-white/60 text-xs italic">
                  Written by {fl.authorName}. Sealed until {fl.releaseDate}.
                </p>
              </GlassPanel>
            ))}
          </div>
        </div>
      )}

      {/* MODALS */}
      {/* 1. Add Dream Modal */}
      <AnimatePresence>
        {showAddDreamModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-md bg-[#161318] border border-amber-500/30 rounded-3xl p-6 sm:p-8 shadow-2xl space-y-4 relative"
            >
              <button
                onClick={() => setShowAddDreamModal(false)}
                className="absolute top-5 right-5 p-2 text-white/40 hover:text-white rounded-full bg-white/5"
              >
                <X className="w-4 h-4" />
              </button>

              <div className="space-y-1">
                <span className="text-[11px] font-mono uppercase tracking-widest text-amber-300">Shared Dream Board</span>
                <h3 className="text-2xl font-serif-title text-white">Add a New Dream</h3>
              </div>

              <form onSubmit={handleAddDream} className="space-y-4 text-xs">
                <div>
                  <label className="text-white/60 mb-1 block">Dream Title *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Rainy Sunday Book Reading & Zero Screens"
                    value={dreamTitle}
                    onChange={(e) => setDreamTitle(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-white focus:outline-none"
                  />
                </div>

                <div>
                  <label className="text-white/60 mb-1 block">Description</label>
                  <textarea
                    rows={3}
                    placeholder="Describe this vision or experience..."
                    value={dreamDesc}
                    onChange={(e) => setDreamDesc(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-white focus:outline-none resize-none"
                  />
                </div>

                <label className="flex items-center gap-2 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={isFreeDream}
                    onChange={(e) => setIsFreeDream(e.target.checked)}
                    className="rounded accent-emerald-500"
                  />
                  <span className="text-white/90">This is a "Dream That Costs Nothing" ✨</span>
                </label>

                {!isFreeDream && (
                  <div>
                    <label className="text-white/60 mb-1 block">Category</label>
                    <select
                      value={dreamCat}
                      onChange={(e) => setDreamCat(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl bg-neutral-900 border border-white/10 text-white focus:outline-none"
                    >
                      <option value="Home">Home & Sanctuary</option>
                      <option value="Experiences">Experiences</option>
                      <option value="Travel">Travel & Umrah</option>
                      <option value="Family">Family & Future</option>
                    </select>
                  </div>
                )}

                <div className="flex justify-end gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowAddDreamModal(false)}
                    className="px-4 py-2 rounded-xl bg-white/5 text-white/60"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-medium shadow-md"
                  >
                    Add Dream
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* 2. Answer Time Capsule Modal */}
      <AnimatePresence>
        {showCapsuleModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-xl max-h-[90vh] overflow-y-auto custom-scrollbar bg-[#161318] border border-amber-500/30 rounded-3xl p-6 sm:p-8 shadow-2xl space-y-5 relative"
            >
              <button
                onClick={() => setShowCapsuleModal(false)}
                className="absolute top-5 right-5 p-2 text-white/40 hover:text-white rounded-full bg-white/5"
              >
                <X className="w-4 h-4" />
              </button>

              <div className="space-y-1">
                <span className="text-[11px] font-mono uppercase tracking-widest text-amber-300">Anniversary Ritual</span>
                <h3 className="text-2xl font-serif-title text-white">Seal This Year's Time Capsule</h3>
                <p className="text-xs text-white/60">
                  Take your time to answer these 6 questions honestly. Once sealed, this capsule is saved to read on future anniversaries.
                </p>
              </div>

              <form onSubmit={handleSaveCapsuleAnswers} className="space-y-4 text-xs">
                {ANNIVERSARY_QUESTIONS.map(q => (
                  <div key={q.key}>
                    <label className="text-white/80 font-medium mb-1 block">{q.label}</label>
                    <textarea
                      required
                      rows={2}
                      value={(answers as any)[q.key]}
                      onChange={(e) => setAnswers(prev => ({ ...prev, [q.key]: e.target.value }))}
                      className="w-full px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-white focus:outline-none resize-none font-serif leading-relaxed"
                    />
                  </div>
                ))}

                <div className="flex justify-end gap-3 pt-4">
                  <button
                    type="button"
                    onClick={() => setShowCapsuleModal(false)}
                    className="px-4 py-2 rounded-xl bg-white/5 text-white/60"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-rose-500 text-white font-medium shadow-md flex items-center gap-2"
                  >
                    <Lock className="w-4 h-4" />
                    <span>Seal Capsule Forever</span>
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* 3. View Sealed Capsule Details Modal */}
      <AnimatePresence>
        {selectedCapsule && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-xl max-h-[90vh] overflow-y-auto custom-scrollbar bg-[#161318] border border-amber-500/30 rounded-3xl p-6 sm:p-8 shadow-2xl space-y-6 relative"
            >
              <button
                onClick={() => setSelectedCapsule(null)}
                className="absolute top-5 right-5 p-2 text-white/40 hover:text-white rounded-full bg-white/5"
              >
                <X className="w-4 h-4" />
              </button>

              <div className="space-y-1">
                <span className="text-[11px] font-mono uppercase tracking-widest text-amber-300">
                  {selectedCapsule.anniversaryDate}
                </span>
                <h3 className="text-2xl font-serif-title text-white">{selectedCapsule.title}</h3>
              </div>

              {selectedCapsule.partner1Answers && (
                <div className="space-y-4">
                  {ANNIVERSARY_QUESTIONS.map(q => (
                    <div key={q.key} className="p-3.5 rounded-xl bg-white/5 border border-white/5 space-y-1 text-xs">
                      <span className="text-white/40 block text-[10px] uppercase font-mono">{q.label}</span>
                      <p className="font-serif text-sm text-amber-100/90 italic leading-relaxed">
                        "{(selectedCapsule.partner1Answers as any)[q.key]}"
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* 4. Add Date Modal */}
      <AnimatePresence>
        {showAddDateModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-md bg-[#161318] border border-amber-500/30 rounded-3xl p-6 sm:p-8 shadow-2xl space-y-4 relative"
            >
              <button
                onClick={() => setShowAddDateModal(false)}
                className="absolute top-5 right-5 p-2 text-white/40 hover:text-white rounded-full bg-white/5"
              >
                <X className="w-4 h-4" />
              </button>

              <div className="space-y-1">
                <span className="text-[11px] font-mono uppercase tracking-widest text-amber-300">Date Planner</span>
                <h3 className="text-2xl font-serif-title text-white">Add a Date Idea</h3>
              </div>

              <form onSubmit={handleAddDatePlan} className="space-y-4 text-xs">
                <div>
                  <label className="text-white/60 mb-1 block">Title *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Sunset picnic on Clifton beach"
                    value={dateTitle}
                    onChange={(e) => setDateTitle(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-white focus:outline-none"
                  />
                </div>

                <div>
                  <label className="text-white/60 mb-1 block">Description</label>
                  <textarea
                    rows={3}
                    placeholder="What will we do, bring, or talk about?"
                    value={dateDesc}
                    onChange={(e) => setDateDesc(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-white focus:outline-none resize-none"
                  />
                </div>

                <div>
                  <label className="text-white/60 mb-1 block">Category</label>
                  <select
                    value={dateCat}
                    onChange={(e) => setDateCat(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-neutral-900 border border-white/10 text-white focus:outline-none"
                  >
                    <option value="Free">Free / Low-Cost</option>
                    <option value="At-Home">Cozy At-Home</option>
                    <option value="Outdoor">Outdoor / Cape Town</option>
                    <option value="Conversation">Deep Conversation Evening</option>
                    <option value="Creative">Creative / Cooking</option>
                  </select>
                </div>

                <div className="flex justify-end gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowAddDateModal(false)}
                    className="px-4 py-2 rounded-xl bg-white/5 text-white/60"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-medium shadow-md"
                  >
                    Save Date Idea
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
