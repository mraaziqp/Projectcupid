import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  Heart,
  BookHeart,
  Sparkles,
  Smile,
  Shield,
  Music,
  Calendar,
  Plus,
  Star,
  Search,
  Filter,
  Volume2,
  Lock,
  Compass,
  Clock,
  Eye,
  Send,
  Camera,
  CheckCircle2,
  X
} from "lucide-react";
import GlassPanel from "./GlassPanel";
import {
  ReasonVaultItem,
  SafeSpaceItem,
  TimelineMoment,
  SharedMoment,
  AudioMemory,
  UserProfile
} from "../types";
import {
  INITIAL_365_REASONS,
  INITIAL_SAFE_SPACE,
  INITIAL_TIMELINE
} from "../lib/seedData";
import { db } from "../lib/firebase";
import {
  collection,
  doc,
  getDocs,
  setDoc,
  query,
  orderBy,
  Timestamp
} from "firebase/firestore";
import LetterReader from "./LetterReader";
import AdminEditor from "./AdminEditor";
import { format } from "date-fns";

interface OurLoveProps {
  currentProfile: UserProfile | null;
  partnerProfile?: UserProfile | null;
  allLetters: any[];
  onLetterSelect?: (letter: any) => void;
}

const VAULT_CATEGORIES = [
  "Open when you miss me",
  "Open when you're sad",
  "Open when you're overwhelmed",
  "Open when you need encouragement",
  "Open when you feel unappreciated",
  "Open when you need a laugh",
  "Open when you need reassurance",
  "Open when you need to remember how loved you are",
  "Open on your birthday",
  "Open on our anniversary",
  "Open when life gets difficult",
  "Open when you want to remember our beginning"
];

export default function OurLove({
  currentProfile,
  partnerProfile,
  allLetters,
  onLetterSelect
}: OurLoveProps) {
  const [activeSubTab, setActiveSubTab] = useState<
    "letters" | "reasons" | "safespace" | "story" | "moments" | "music"
  >("letters");

  const currentUserId = currentProfile?.uid || "guest";
  const currentUserRole = currentProfile?.role || "reader";
  const authorName = currentProfile?.displayName || (currentUserRole === "admin" ? "Raaziq" : "Razia");

  // 365 Reasons State
  const [reasons, setReasons] = useState<ReasonVaultItem[]>([]);
  const [reasonFilter, setReasonFilter] = useState<"all" | "favorites">("all");
  const [searchReason, setSearchReason] = useState("");
  const [showAddReasonModal, setShowAddReasonModal] = useState(false);
  const [newReasonText, setNewReasonText] = useState("");

  // Safe Space State
  const [safeItems, setSafeItems] = useState<SafeSpaceItem[]>(INITIAL_SAFE_SPACE);
  const [selectedSafeItem, setSelectedSafeItem] = useState<SafeSpaceItem | null>(INITIAL_SAFE_SPACE[0]);

  // Story / Timeline State
  const [timeline, setTimeline] = useState<TimelineMoment[]>(INITIAL_TIMELINE);
  const [showAddMilestoneModal, setShowAddMilestoneModal] = useState(false);
  const [milestoneDate, setMilestoneDate] = useState("");
  const [milestoneTitle, setMilestoneTitle] = useState("");
  const [milestoneDesc, setMilestoneDesc] = useState("");
  const [milestonePhoto, setMilestonePhoto] = useState("");
  const [milestoneReflection, setMilestoneReflection] = useState("");

  // Little Moments State
  const [moments, setMoments] = useState<SharedMoment[]>([]);
  const [showAddMomentModal, setShowAddMomentModal] = useState(false);
  const [momentTitle, setMomentTitle] = useState("");
  const [momentContent, setMomentContent] = useState("");
  const [momentType, setMomentType] = useState<SharedMoment["highlightType"]>("highlight");
  const [momentPrivate, setMomentPrivate] = useState(false);

  // Audio / Music State
  const [audioItems, setAudioItems] = useState<AudioMemory[]>([
    {
      id: "audio_1",
      title: "Our Song — Acoustic Memories",
      description: "The melody that played on our wedding day.",
      type: "song_link",
      url: "https://open.spotify.com",
      authorId: "raaziq",
      authorName: "Raaziq",
      isFavorite: true,
      createdAt: new Date().toISOString()
    },
    {
      id: "audio_2",
      title: "Gentle Reassurance Voice Note",
      description: "For the quiet nights when you need to hear my voice.",
      type: "voice_note",
      url: "",
      authorId: "raaziq",
      authorName: "Raaziq",
      isFavorite: true,
      createdAt: new Date().toISOString()
    }
  ]);

  // Reader / Editor modals
  const [readingLetter, setReadingLetter] = useState<any | null>(null);
  const [showWriteModal, setShowWriteModal] = useState(false);
  const [toastMsg, setToastMsg] = useState("");

  useEffect(() => {
    loadReasons();
    loadMoments();
  }, [currentUserId]);

  const loadReasons = async () => {
    try {
      const snap = await getDocs(query(collection(db, "reasons_vault"), orderBy("dayNumber", "asc")));
      if (!snap.empty) {
        setReasons(snap.docs.map(d => ({ id: d.id, ...d.data() } as ReasonVaultItem)));
        return;
      }
    } catch (e) {
      console.warn("Could not load reasons from Firestore, using initial:", e);
    }

    setReasons(
      INITIAL_365_REASONS.map((r, idx) => ({
        id: `reason_${idx}`,
        ...r,
        isFavorite: false
      }))
    );
  };

  const loadMoments = async () => {
    try {
      const snap = await getDocs(query(collection(db, "shared_moments"), orderBy("createdAt", "desc")));
      if (!snap.empty) {
        const all = snap.docs.map(d => ({ id: d.id, ...d.data() } as SharedMoment));
        // Filter out private notes of other author
        const visible = all.filter(m => !m.isPrivate || m.authorId === currentUserId);
        setMoments(visible);
        return;
      }
    } catch (e) {
      console.warn("Could not load moments from Firestore:", e);
    }

    // Default starter moments
    setMoments([
      {
        id: "moment_1",
        date: format(new Date(), "yyyy-MM-dd"),
        title: "Cape Town Rainy Evening",
        content: "We brewed fresh cinnamon tea, wrapped ourselves in one blanket, and just talked for hours without looking at our phones. Pure happiness.",
        authorId: "raaziq",
        authorName: "Raaziq",
        isPrivate: false,
        highlightType: "highlight",
        createdAt: new Date()
      }
    ]);
  };

  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(""), 3500);
  };

  const handleAddReason = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newReasonText.trim()) return;

    const nextDayNumber = reasons.length + 1;
    const newDoc = doc(collection(db, "reasons_vault"));
    const payload: ReasonVaultItem = {
      id: newDoc.id,
      dayNumber: nextDayNumber,
      text: newReasonText.trim(),
      author: authorName,
      authorId: currentUserId,
      isFavorite: false,
      dateAdded: Timestamp.now()
    };

    try {
      await setDoc(newDoc, payload);
    } catch (e) {
      console.warn("Firestore error adding reason:", e);
    }

    setReasons(prev => [...prev, payload]);
    setNewReasonText("");
    setShowAddReasonModal(false);
    showToast(`Added Reason #${nextDayNumber} to the vault!`);
  };

  const handleToggleFavoriteReason = (id: string) => {
    setReasons(prev =>
      prev.map(r => (r.id === id ? { ...r, isFavorite: !r.isFavorite } : r))
    );
  };

  const handleAddMilestone = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!milestoneTitle.trim() || !milestoneDate.trim()) return;

    const newMilestone: TimelineMoment = {
      id: `milestone_${Date.now()}`,
      date: milestoneDate,
      title: milestoneTitle.trim(),
      description: milestoneDesc.trim(),
      photoUrl: milestonePhoto.trim() || undefined,
      reflection: milestoneReflection.trim() || undefined,
      category: "milestone"
    };

    try {
      const ref = doc(collection(db, "timeline_moments"));
      await setDoc(ref, { ...newMilestone, id: ref.id, createdAt: Timestamp.now() });
    } catch (e) {
      console.warn("Firestore error adding milestone:", e);
    }

    setTimeline(prev => [...prev, newMilestone]);
    setShowAddMilestoneModal(false);
    setMilestoneDate("");
    setMilestoneTitle("");
    setMilestoneDesc("");
    setMilestonePhoto("");
    setMilestoneReflection("");
    showToast("Milestone added to Our Story!");
  };

  const handleAddMoment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!momentContent.trim()) return;

    const newMoment: SharedMoment = {
      id: `moment_${Date.now()}`,
      date: format(new Date(), "yyyy-MM-dd"),
      title: momentTitle.trim() || "A Sweet Moment",
      content: momentContent.trim(),
      authorId: currentUserId,
      authorName,
      isPrivate: momentPrivate,
      highlightType: momentType,
      createdAt: Timestamp.now()
    };

    try {
      const ref = doc(collection(db, "shared_moments"));
      await setDoc(ref, { ...newMoment, id: ref.id });
    } catch (e) {
      console.warn("Firestore error adding moment:", e);
    }

    setMoments(prev => [newMoment, ...prev]);
    setShowAddMomentModal(false);
    setMomentTitle("");
    setMomentContent("");
    showToast("Moment recorded in your relationship journal!");
  };

  // Filtered reasons
  const filteredReasons = reasons.filter(r => {
    if (reasonFilter === "favorites" && !r.isFavorite) return false;
    if (searchReason.trim()) {
      const q = searchReason.toLowerCase();
      return r.text.toLowerCase().includes(q) || r.author.toLowerCase().includes(q);
    }
    return true;
  });

  return (
    <div className="space-y-8 max-w-5xl mx-auto px-4 sm:px-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/10 pb-6">
        <div className="space-y-1">
          <div className="inline-flex items-center gap-2 px-3 py-0.5 rounded-full bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs tracking-widest uppercase">
            <Heart className="w-3.5 h-3.5 fill-rose-300" />
            <span>Our Love Sanctuary</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-serif-title font-light text-white tracking-tight">
            Our Love & Shared Memories
          </h1>
          <p className="text-xs sm:text-sm text-white/60 font-light">
            Love letters, our 365 reasons vault, safe space comfort, relationship milestones, and shared journal.
          </p>
        </div>

        <button
          onClick={() => setShowWriteModal(true)}
          className="px-4 py-2 rounded-xl bg-gradient-to-r from-rose-500 to-amber-600 hover:from-rose-600 hover:to-amber-700 text-white text-xs font-medium shadow-md transition-all flex items-center gap-2 self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>Write a Love Letter</span>
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

      {/* Sub navigation */}
      <div className="flex overflow-x-auto gap-2 pb-2 custom-scrollbar">
        {[
          { id: "letters", label: "Letter Library", icon: BookHeart },
          { id: "reasons", label: "365 Reasons Vault", icon: Sparkles },
          { id: "safespace", label: "Her Safe Space", icon: Shield },
          { id: "story", label: "Our Story Timeline", icon: Calendar },
          { id: "moments", label: "Our Little Moments", icon: Compass },
          { id: "music", label: "Music & Voice Corner", icon: Music }
        ].map(tab => {
          const Icon = tab.icon;
          const isActive = activeSubTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveSubTab(tab.id as any)}
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

      {/* TAB 1: LOVE LETTER LIBRARY */}
      {activeSubTab === "letters" && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 className="text-xl font-serif-title font-light text-white">The Love Letter Library</h3>
              <p className="text-xs text-white/50">Heartfelt letters written to be read and cherished forever.</p>
            </div>
            <span className="text-xs text-white/40 font-mono">{allLetters.length} letters archived</span>
          </div>

          {/* Letter list */}
          {allLetters.length === 0 ? (
            <div className="py-12 text-center text-white/40 text-sm italic bg-white/[0.02] border border-white/5 rounded-2xl">
              No letters published yet. Tap "Write a Love Letter" to begin your collection!
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {allLetters.map((l: any) => {
                const isScheduledFuture = l.publishDate && new Date(l.publishDate?.toDate ? l.publishDate.toDate() : l.publishDate).getTime() > Date.now();
                return (
                  <GlassPanel
                    key={l.id}
                    className="p-5 rounded-2xl border border-white/10 hover:border-rose-500/30 transition-all flex flex-col justify-between space-y-4 group cursor-pointer"
                    onClick={() => {
                      if (!isScheduledFuture) {
                        setReadingLetter(l);
                      }
                    }}
                  >
                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-xs">
                        <span className="px-2.5 py-0.5 rounded-full bg-rose-500/10 text-rose-300 font-mono text-[10px]">
                          {l.category || "Love Letter"}
                        </span>
                        {isScheduledFuture ? (
                          <span className="flex items-center gap-1 text-[11px] text-amber-400 font-mono">
                            <Lock className="w-3 h-3" /> Sealed until release
                          </span>
                        ) : (
                          <span className="text-[11px] text-white/40 font-mono">
                            {l.publishDate ? format(new Date(l.publishDate?.toDate ? l.publishDate.toDate() : l.publishDate), "MMM d, yyyy") : ""}
                          </span>
                        )}
                      </div>

                      <h4 className="font-serif text-lg text-white/95 group-hover:text-rose-200 transition-colors">
                        {l.title}
                      </h4>

                      {isScheduledFuture ? (
                        <p className="text-white/40 text-xs italic">
                          This letter is locked and scheduled to be revealed on {format(new Date(l.publishDate?.toDate ? l.publishDate.toDate() : l.publishDate), "MMMM d, yyyy")}.
                        </p>
                      ) : (
                        <p className="text-white/60 text-xs line-clamp-3 font-light leading-relaxed">
                          {l.content?.substring(0, 150)}...
                        </p>
                      )}
                    </div>

                    <div className="pt-3 border-t border-white/5 flex items-center justify-between text-[11px] text-white/40">
                      <span>Tap to read letter & envelope</span>
                      <BookHeart className="w-4 h-4 text-rose-400 opacity-60 group-hover:opacity-100 transition-opacity" />
                    </div>
                  </GlassPanel>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* TAB 2: 365 REASONS VAULT */}
      {activeSubTab === "reasons" && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h3 className="text-xl font-serif-title font-light text-white">The 365 Reasons Vault</h3>
              <p className="text-xs text-white/50">Personalized reasons why we love and appreciate each other.</p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowAddReasonModal(true)}
                className="px-3.5 py-1.5 rounded-xl bg-amber-500/20 border border-amber-500/40 text-amber-200 text-xs font-medium flex items-center gap-1.5"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add a Reason</span>
              </button>
            </div>
          </div>

          {/* Search & Filter */}
          <div className="flex flex-col sm:flex-row gap-3">
            <input
              type="text"
              placeholder="Search reasons why we love each other..."
              value={searchReason}
              onChange={(e) => setSearchReason(e.target.value)}
              className="flex-1 px-4 py-2 bg-white/5 border border-white/10 rounded-xl text-xs text-white placeholder-white/30 focus:outline-none"
            />
            <button
              onClick={() => setReasonFilter(prev => (prev === "all" ? "favorites" : "all"))}
              className={`px-3 py-2 rounded-xl text-xs flex items-center gap-1.5 transition-colors ${
                reasonFilter === "favorites" ? "bg-rose-500/30 text-rose-200 border border-rose-500/50" : "bg-white/5 text-white/60"
              }`}
            >
              <Star className="w-3.5 h-3.5" />
              <span>Favorites Only</span>
            </button>
          </div>

          {/* Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
            {filteredReasons.map(r => (
              <GlassPanel
                key={r.id}
                className="p-4 rounded-xl border border-white/10 hover:border-amber-500/30 transition-all flex flex-col justify-between space-y-3"
              >
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="font-mono text-amber-300/80 uppercase">Reason #{r.dayNumber}</span>
                    <button
                      onClick={() => handleToggleFavoriteReason(r.id)}
                      className="text-white/30 hover:text-rose-400"
                    >
                      <Star className={`w-3.5 h-3.5 ${r.isFavorite ? "fill-rose-400 text-rose-400" : ""}`} />
                    </button>
                  </div>
                  <p className="text-white/85 text-xs font-serif leading-relaxed italic">
                    "{r.text}"
                  </p>
                </div>
                <div className="text-[10px] text-white/40 text-right">
                  From: <strong className="text-white/70">{r.author}</strong>
                </div>
              </GlassPanel>
            ))}
          </div>
        </div>
      )}

      {/* TAB 3: HER SAFE SPACE */}
      {activeSubTab === "safespace" && (
        <div className="space-y-6">
          <div className="text-center max-w-xl mx-auto space-y-2">
            <span className="text-[11px] uppercase tracking-widest text-rose-300 font-mono">Personal Sanctuary</span>
            <h3 className="text-2xl sm:text-3xl font-serif-title font-light text-white">Her Safe Space</h3>
            <p className="text-xs text-white/50 leading-relaxed">
              Whenever you feel overwhelmed, tired, or need reassurance, choose how your heart feels right now for immediate comfort prepared by Raaziq.
            </p>
          </div>

          {/* Emotional Buttons */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
            {safeItems.map(item => {
              const isSelected = selectedSafeItem?.id === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => setSelectedSafeItem(item)}
                  className={`p-3 rounded-2xl border text-center transition-all ${
                    isSelected
                      ? "bg-rose-500/25 border-rose-500/50 shadow-lg shadow-rose-500/10 scale-102"
                      : "bg-white/5 border-white/5 hover:bg-white/10 text-white/70"
                  }`}
                >
                  <Heart className={`w-4 h-4 mx-auto mb-1.5 ${isSelected ? "text-rose-400 fill-rose-400" : "text-white/40"}`} />
                  <span className="text-xs font-medium block">{item.label}</span>
                </button>
              );
            })}
          </div>

          {/* Active Safe Space Message */}
          {selectedSafeItem && (
            <motion.div
              key={selectedSafeItem.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="p-6 sm:p-8 rounded-3xl bg-gradient-to-b from-white/[0.08] to-rose-950/20 border border-rose-500/30 space-y-4 relative"
            >
              <div className="flex items-center gap-2 text-rose-300">
                <Shield className="w-5 h-5" />
                <h4 className="font-serif-title text-xl text-white">{selectedSafeItem.title}</h4>
              </div>

              <div className="text-base sm:text-lg font-serif italic text-white/90 leading-relaxed whitespace-pre-line pl-4 border-l-2 border-rose-400/50">
                "{selectedSafeItem.message}"
              </div>

              {selectedSafeItem.quote && (
                <div className="pt-4 border-t border-white/10 text-xs text-amber-200/80 font-serif">
                  {selectedSafeItem.quote}
                </div>
              )}

              <div className="text-right text-xs text-white/40">
                Always with you, <strong className="text-white/80">{selectedSafeItem.authorName}</strong>
              </div>
            </motion.div>
          )}
        </div>
      )}

      {/* TAB 4: OUR STORY TIMELINE */}
      {activeSubTab === "story" && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 className="text-xl font-serif-title font-light text-white">Our Story & Milestones</h3>
              <p className="text-xs text-white/50">From the moment our paths crossed to our wedding day and beyond.</p>
            </div>
            <button
              onClick={() => setShowAddMilestoneModal(true)}
              className="px-3.5 py-1.5 rounded-xl bg-white/10 hover:bg-white/15 text-white text-xs font-medium flex items-center gap-1.5"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Milestone</span>
            </button>
          </div>

          <div className="relative border-l border-white/10 ml-4 sm:ml-6 space-y-8 pl-6">
            {timeline.map((item, idx) => (
              <div key={item.id} className="relative space-y-3">
                {/* Node indicator */}
                <div className="absolute -left-[31px] top-1.5 w-4 h-4 rounded-full bg-rose-500 border-4 border-black" />

                <div className="space-y-1">
                  <span className="text-[10px] uppercase font-mono tracking-widest text-amber-400/90">{item.date}</span>
                  <h4 className="text-lg font-serif-title font-medium text-white">{item.title}</h4>
                  <p className="text-xs sm:text-sm text-white/70 font-light leading-relaxed">
                    {item.description}
                  </p>
                </div>

                {/* Wedding photo embed if available */}
                {item.photoUrl && (
                  <div className="mt-3 max-w-md rounded-2xl overflow-hidden border border-white/15 shadow-xl">
                    <img
                      src={item.photoUrl}
                      alt={item.title}
                      className="w-full h-auto object-cover max-h-72 hover:scale-102 transition-transform duration-500"
                    />
                  </div>
                )}

                {item.reflection && (
                  <div className="p-3 rounded-xl bg-white/[0.03] border border-white/5 text-xs text-white/60 italic font-serif">
                    "{item.reflection}"
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 5: OUR LITTLE MOMENTS (Shared Journal) */}
      {activeSubTab === "moments" && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 className="text-xl font-serif-title font-light text-white">Our Little Moments</h3>
              <p className="text-xs text-white/50">Daily highlights, appreciations, and funny conversations recorded together.</p>
            </div>
            <button
              onClick={() => setShowAddMomentModal(true)}
              className="px-3.5 py-1.5 rounded-xl bg-white/10 hover:bg-white/15 text-white text-xs font-medium flex items-center gap-1.5"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Record a Moment</span>
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {moments.map(m => (
              <GlassPanel key={m.id} className="p-5 rounded-2xl border border-white/10 space-y-3 text-xs">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-mono text-amber-300 uppercase">{m.date}</span>
                  {m.isPrivate && (
                    <span className="flex items-center gap-1 text-[10px] text-white/40 font-mono">
                      <Lock className="w-3 h-3" /> Private Note
                    </span>
                  )}
                </div>
                <h4 className="text-sm font-semibold text-white/95">{m.title}</h4>
                <p className="text-white/70 font-serif italic leading-relaxed whitespace-pre-line">
                  "{m.content}"
                </p>
                <div className="pt-2 border-t border-white/5 text-[10px] text-white/40 text-right">
                  Recorded by: <strong className="text-white/70">{m.authorName}</strong>
                </div>
              </GlassPanel>
            ))}
          </div>
        </div>
      )}

      {/* TAB 6: MUSIC & VOICE CORNER */}
      {activeSubTab === "music" && (
        <div className="space-y-6">
          <div className="space-y-1">
            <h3 className="text-xl font-serif-title font-light text-white">Music & Voice Recordings</h3>
            <p className="text-xs text-white/50">Our favorite songs, acoustic memories, and voice notes.</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {audioItems.map(audio => (
              <GlassPanel key={audio.id} className="p-5 rounded-2xl border border-white/10 space-y-3 text-xs">
                <div className="flex items-center justify-between">
                  <div className="p-2 rounded-xl bg-rose-500/20 text-rose-300">
                    {audio.type === "voice_note" ? <Volume2 className="w-4 h-4" /> : <Music className="w-4 h-4" />}
                  </div>
                  <span className="text-[10px] font-mono uppercase text-white/40">{audio.type}</span>
                </div>
                <h4 className="text-sm font-medium text-white/90">{audio.title}</h4>
                <p className="text-white/60">{audio.description}</p>
                {audio.url && (
                  <a
                    href={audio.url}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1.5 text-xs text-rose-300 hover:text-rose-200 underline mt-2"
                  >
                    Open Music Link →
                  </a>
                )}
              </GlassPanel>
            ))}
          </div>
        </div>
      )}

      {/* MODALS */}
      {/* 1. Letter Reader Modal */}
      <AnimatePresence>
        {readingLetter && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md">
            <div className="w-full max-w-3xl max-h-[90vh] overflow-y-auto custom-scrollbar relative">
              <button
                onClick={() => setReadingLetter(null)}
                className="absolute top-4 right-4 z-50 p-2 text-white/60 hover:text-white bg-black/50 rounded-full"
              >
                <X className="w-5 h-5" />
              </button>
              <LetterReader
                letter={readingLetter}
                onClose={() => setReadingLetter(null)}
                currentUserId={currentUserId}
                currentUserName={authorName}
                canReply={true}
              />
            </div>
          </div>
        )}
      </AnimatePresence>

      {/* 2. Write Letter Modal */}
      <AnimatePresence>
        {showWriteModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md">
            <div className="w-full max-w-2xl max-h-[90vh] overflow-y-auto custom-scrollbar relative bg-[#131116] border border-white/10 rounded-3xl p-6 sm:p-8">
              <button
                onClick={() => setShowWriteModal(false)}
                className="absolute top-5 right-5 p-2 text-white/40 hover:text-white rounded-full bg-white/5"
              >
                <X className="w-4 h-4" />
              </button>
              <AdminEditor
                userId={currentUserId}
                userEmail={currentProfile?.email || "backupe9@gmail.com"}
                onPublished={() => {
                  setShowWriteModal(false);
                  showToast("Love letter published to library!");
                }}
              />
            </div>
          </div>
        )}
      </AnimatePresence>

      {/* 3. Add Reason Modal */}
      <AnimatePresence>
        {showAddReasonModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-md bg-[#161318] border border-amber-500/30 rounded-3xl p-6 sm:p-8 shadow-2xl space-y-4 relative"
            >
              <button
                onClick={() => setShowAddReasonModal(false)}
                className="absolute top-5 right-5 p-2 text-white/40 hover:text-white rounded-full bg-white/5"
              >
                <X className="w-4 h-4" />
              </button>

              <div className="space-y-1">
                <span className="text-[11px] font-mono uppercase tracking-widest text-amber-300">365 Reasons Vault</span>
                <h3 className="text-2xl font-serif-title text-white">Add Reason #{reasons.length + 1}</h3>
              </div>

              <form onSubmit={handleAddReason} className="space-y-4 text-xs">
                <textarea
                  required
                  rows={4}
                  placeholder="What is something you appreciate, adore, or cherish about your partner?"
                  value={newReasonText}
                  onChange={(e) => setNewReasonText(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white focus:outline-none resize-none font-serif text-sm leading-relaxed"
                />

                <div className="flex justify-end gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowAddReasonModal(false)}
                    className="px-4 py-2 rounded-xl bg-white/5 text-white/60"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-medium shadow-md"
                  >
                    Add to Vault
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* 4. Add Milestone Modal */}
      <AnimatePresence>
        {showAddMilestoneModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-md bg-[#161318] border border-rose-500/30 rounded-3xl p-6 sm:p-8 shadow-2xl space-y-4 relative"
            >
              <button
                onClick={() => setShowAddMilestoneModal(false)}
                className="absolute top-5 right-5 p-2 text-white/40 hover:text-white rounded-full bg-white/5"
              >
                <X className="w-4 h-4" />
              </button>

              <div className="space-y-1">
                <span className="text-[11px] font-mono uppercase tracking-widest text-rose-300">Our Story</span>
                <h3 className="text-2xl font-serif-title text-white">Add a Milestone</h3>
              </div>

              <form onSubmit={handleAddMilestone} className="space-y-4 text-xs">
                <div>
                  <label className="text-white/60 mb-1 block">Milestone Date / Era *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. December 2024 or 2025"
                    value={milestoneDate}
                    onChange={(e) => setMilestoneDate(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-white focus:outline-none"
                  />
                </div>

                <div>
                  <label className="text-white/60 mb-1 block">Milestone Title *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Our First Home Setup..."
                    value={milestoneTitle}
                    onChange={(e) => setMilestoneTitle(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-white focus:outline-none"
                  />
                </div>

                <div>
                  <label className="text-white/60 mb-1 block">Description</label>
                  <textarea
                    rows={3}
                    placeholder="What happened and why does it mean so much to us?"
                    value={milestoneDesc}
                    onChange={(e) => setMilestoneDesc(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-white focus:outline-none resize-none"
                  />
                </div>

                <div>
                  <label className="text-white/60 mb-1 block">Photo URL (Optional)</label>
                  <input
                    type="text"
                    placeholder="/wedding.jpg or https://..."
                    value={milestonePhoto}
                    onChange={(e) => setMilestonePhoto(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-white focus:outline-none"
                  />
                </div>

                <div>
                  <label className="text-white/60 mb-1 block">Personal Reflection</label>
                  <input
                    type="text"
                    placeholder="e.g. I knew in that moment Allah had blessed us..."
                    value={milestoneReflection}
                    onChange={(e) => setMilestoneReflection(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-white focus:outline-none"
                  />
                </div>

                <div className="flex justify-end gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowAddMilestoneModal(false)}
                    className="px-4 py-2 rounded-xl bg-white/5 text-white/60"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 rounded-xl bg-rose-500 hover:bg-rose-600 text-white font-medium shadow-md"
                  >
                    Save Milestone
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* 5. Add Moment Modal */}
      <AnimatePresence>
        {showAddMomentModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-md bg-[#161318] border border-white/20 rounded-3xl p-6 sm:p-8 shadow-2xl space-y-4 relative"
            >
              <button
                onClick={() => setShowAddMomentModal(false)}
                className="absolute top-5 right-5 p-2 text-white/40 hover:text-white rounded-full bg-white/5"
              >
                <X className="w-4 h-4" />
              </button>

              <div className="space-y-1">
                <span className="text-[11px] font-mono uppercase tracking-widest text-amber-300">Shared Journal</span>
                <h3 className="text-2xl font-serif-title text-white">Record a Little Moment</h3>
              </div>

              <form onSubmit={handleAddMoment} className="space-y-4 text-xs">
                <div>
                  <label className="text-white/60 mb-1 block">Title (Optional)</label>
                  <input
                    type="text"
                    placeholder="e.g. Afternoon laughter in the kitchen"
                    value={momentTitle}
                    onChange={(e) => setMomentTitle(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-white focus:outline-none"
                  />
                </div>

                <div>
                  <label className="text-white/60 mb-1 block">Content *</label>
                  <textarea
                    required
                    rows={4}
                    placeholder="Write down what you appreciated or loved about this moment..."
                    value={momentContent}
                    onChange={(e) => setMomentContent(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white focus:outline-none resize-none font-serif leading-relaxed"
                  />
                </div>

                <label className="flex items-center gap-2 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={momentPrivate}
                    onChange={(e) => setMomentPrivate(e.target.checked)}
                    className="rounded accent-rose-500"
                  />
                  <span className="text-white/70">Keep private to me only</span>
                </label>

                <div className="flex justify-end gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowAddMomentModal(false)}
                    className="px-4 py-2 rounded-xl bg-white/5 text-white/60"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 rounded-xl bg-gradient-to-r from-rose-500 to-amber-500 text-white font-medium shadow-md"
                  >
                    Save Moment
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
