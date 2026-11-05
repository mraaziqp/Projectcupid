import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  Gift,
  Heart,
  Sparkles,
  Send,
  Lock,
  Eye,
  Plus,
  Smile,
  Archive,
  Star,
  Calendar,
  User,
  Filter,
  CheckCircle2,
  RefreshCw,
  X
} from "lucide-react";
import GlassPanel from "./GlassPanel";
import { MessageBoxItem, DailyBoxSelection, UserProfile } from "../types";
import {
  getOrSelectDailyBox,
  markBoxAsOpened,
  getMessageBoxes,
  addMessageBoxContribution,
  toggleBoxFavorite,
  reactToMessageBox,
  getTodayDateStr
} from "../lib/messageBoxService";
import { dispatchEmailNotification } from "../lib/emailService";

interface MessageBoxesProps {
  currentProfile: UserProfile | null;
  partnerProfile?: UserProfile | null;
}

const CATEGORIES = [
  "Love",
  "Compliments",
  "Encouragement",
  "Funny",
  "Inside jokes",
  "Memories",
  "Appreciation",
  "Questions",
  "Little challenges",
  "Date ideas",
  "Reassurance",
  "Random thoughts",
  "Future dreams"
];

const REACTION_EMOJIS = ["❤️", "🥰", "😂", "🥺", "✨", "🌸", "🤲"];

export default function MessageBoxes({ currentProfile, partnerProfile }: MessageBoxesProps) {
  const [dailySelection, setDailySelection] = useState<DailyBoxSelection | null>(null);
  const [dailyMessage, setDailyMessage] = useState<MessageBoxItem | null>(null);
  const [secondDailyMessage, setSecondDailyMessage] = useState<MessageBoxItem | null>(null);
  const [allMessages, setAllMessages] = useState<MessageBoxItem[]>([]);
  const [isOpening, setIsOpening] = useState(false);
  const [isOpened, setIsOpened] = useState(false);
  const [loading, setLoading] = useState(true);

  // Archive & Filters
  const [archiveFilter, setArchiveFilter] = useState<string>("all");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");

  // Contribution Modal State
  const [showAddModal, setShowAddModal] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newContent, setNewContent] = useState("");
  const [newCategory, setNewCategory] = useState("Love");
  const [customCategory, setCustomCategory] = useState("");
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [isSecret, setIsSecret] = useState(true);
  const [scheduledDate, setScheduledDate] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [successToast, setSuccessToast] = useState("");

  const currentUserId = currentProfile?.uid || "guest";
  const currentUserRole = currentProfile?.role || "reader";
  const authorDisplayName = currentProfile?.displayName || (currentUserRole === "admin" ? "Raaziq" : "Razia");

  useEffect(() => {
    loadDailyAndArchive();
  }, [currentUserId]);

  const loadDailyAndArchive = async () => {
    setLoading(true);
    try {
      const { selection, message, secondMessage } = await getOrSelectDailyBox(currentUserId);
      setDailySelection(selection);
      setDailyMessage(message);
      setSecondDailyMessage(secondMessage || null);

      // Check if already opened today
      const alreadyOpened = Boolean(
        selection.isOpened ||
        message.isOpened ||
        (selection.openedBy && selection.openedBy.includes(currentUserId))
      );
      setIsOpened(alreadyOpened);

      const list = await getMessageBoxes(currentUserId, currentUserRole);
      setAllMessages(list);
    } catch (e) {
      console.error("Failed to load message boxes:", e);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenBox = async () => {
    if (!dailySelection || !dailyMessage || isOpened) return;
    setIsOpening(true);

    setTimeout(async () => {
      setIsOpening(false);
      setIsOpened(true);
      await markBoxAsOpened(dailySelection.date, dailyMessage.id, currentUserId);
      if (secondDailyMessage) {
        await markBoxAsOpened(dailySelection.date, secondDailyMessage.id, currentUserId);
      }
      // Refresh list to update opened status
      const list = await getMessageBoxes(currentUserId, currentUserRole);
      setAllMessages(list);
    }, 1200);
  };

  const handleFavoriteToggle = async (message: MessageBoxItem) => {
    await toggleBoxFavorite(message.id, Boolean(message.isFavorite));
    setAllMessages(prev =>
      prev.map(m => (m.id === message.id ? { ...m, isFavorite: !m.isFavorite } : m))
    );
    if (dailyMessage?.id === message.id) {
      setDailyMessage(prev => prev ? { ...prev, isFavorite: !prev.isFavorite } : null);
    }
  };

  const handleReact = async (messageId: string, emoji: string) => {
    await reactToMessageBox(messageId, currentUserId, emoji);
    setAllMessages(prev =>
      prev.map(m => {
        if (m.id === messageId) {
          const reactions = { ...(m.reactions || {}) };
          reactions[currentUserId] = emoji;
          return { ...m, reactions };
        }
        return m;
      })
    );
    if (dailyMessage?.id === messageId) {
      setDailyMessage(prev => {
        if (!prev) return null;
        const reactions = { ...(prev.reactions || {}) };
        reactions[currentUserId] = emoji;
        return { ...prev, reactions };
      });
    }
  };

  const handleCreateMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newContent.trim()) return;

    setSubmitting(true);
    try {
      const finalCategory = customCategory.trim() || newCategory;
      await addMessageBoxContribution({
        title: newTitle.trim() || undefined,
        content: newContent.trim(),
        authorId: currentUserId,
        authorName: isAnonymous ? "Someone who adores you" : authorDisplayName,
        authorRole: currentUserRole,
        category: finalCategory,
        isAnonymous,
        isSecret,
        scheduledDate: scheduledDate || undefined,
        isFavorite: false
      });

      setSuccessToast("Your secret message has been sealed in the boxes!");
      setNewTitle("");
      setNewContent("");
      setScheduledDate("");
      setShowAddModal(false);

      // Refresh boxes
      const list = await getMessageBoxes(currentUserId, currentUserRole);
      setAllMessages(list);

      // Notify partner discreetly via email
      if (partnerProfile?.email) {
        dispatchEmailNotification({
          recipientEmail: partnerProfile.email,
          recipientName: partnerProfile.displayName || "My Beloved",
          senderName: isAnonymous ? "Someone who adores you" : authorDisplayName,
          eventType: "message_box.contributed",
          title: "A Little Surprise Was Just Sealed For You",
          previewText: isSecret
            ? "A little surprise note has been tucked inside your virtual boxes for you to find."
            : newContent.slice(0, 100),
          deepLink: window.location.origin
        }).catch(err => console.warn("Email dispatch error:", err));
      }

      setTimeout(() => setSuccessToast(""), 4000);
    } catch (e) {
      console.error("Failed to add message:", e);
    } finally {
      setSubmitting(false);
    }
  };

  // Archive filtered
  const openedArchive = allMessages.filter(m => m.isOpened);
  const filteredArchive = openedArchive.filter(m => {
    if (archiveFilter === "favorites" && !m.isFavorite) return false;
    if (selectedCategory !== "all" && m.category !== selectedCategory) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchTitle = m.title?.toLowerCase().includes(q);
      const matchBody = m.content.toLowerCase().includes(q);
      const matchAuthor = m.authorName.toLowerCase().includes(q);
      if (!matchTitle && !matchBody && !matchAuthor) return false;
    }
    return true;
  });

  return (
    <div className="space-y-12 max-w-5xl mx-auto px-4 sm:px-6">
      {/* Header */}
      <div className="text-center space-y-3">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-300 text-xs tracking-widest uppercase">
          <Sparkles className="w-3.5 h-3.5" />
          <span>Signature Ritual</span>
        </div>
        <h1 className="text-3xl sm:text-5xl font-light font-serif-title tracking-tight text-white/95">
          Our Little Message Boxes
        </h1>
        <p className="text-sm sm:text-base text-white/60 max-w-xl mx-auto font-light">
          A shared collection of virtual boxes containing little surprises, memories, compliments, and love notes. Every day, one random box is revealed.
        </p>

        <div className="pt-2 flex justify-center gap-3">
          <button
            onClick={() => setShowAddModal(true)}
            className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-rose-500 to-amber-600 hover:from-rose-600 hover:to-amber-700 text-white text-xs sm:text-sm font-medium transition-all shadow-lg shadow-rose-500/20 flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            <span>Drop a Message in the Box</span>
          </button>
        </div>
      </div>

      {successToast && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-3 bg-emerald-500/20 border border-emerald-500/30 rounded-xl text-center text-emerald-200 text-xs sm:text-sm flex items-center justify-center gap-2"
        >
          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          <span>{successToast}</span>
        </motion.div>
      )}

      {/* TODAY'S REVEAL BOX SECTION */}
      <div className="relative">
        <GlassPanel className="p-6 sm:p-10 border border-amber-500/20 bg-gradient-to-b from-white/[0.07] to-amber-950/[0.12] rounded-3xl overflow-hidden relative shadow-2xl">
          {/* Subtle decorative ornaments */}
          <div className="absolute top-0 right-0 w-48 h-48 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute bottom-0 left-0 w-48 h-48 bg-rose-500/10 rounded-full blur-3xl pointer-events-none" />

          {loading ? (
            <div className="py-16 text-center space-y-3">
              <Gift className="w-10 h-10 text-amber-400 mx-auto animate-bounce" />
              <p className="text-white/60 text-sm">Preparing today's secret surprise...</p>
            </div>
          ) : !isOpened ? (
            /* SEALED BOX STATE */
            <div className="py-8 sm:py-14 text-center max-w-md mx-auto space-y-6">
              <motion.div
                animate={isOpening ? { scale: [1, 1.15, 0.9, 1.2], rotate: [0, -5, 5, 0] } : { y: [0, -6, 0] }}
                transition={isOpening ? { duration: 1.2 } : { repeat: Infinity, duration: 4, ease: "easeInOut" }}
                className="relative inline-block cursor-pointer select-none"
                onClick={handleOpenBox}
              >
                {/* Glowing Aura Box */}
                <div className="w-28 h-28 sm:w-36 sm:h-36 mx-auto rounded-3xl bg-gradient-to-tr from-amber-500 via-rose-500 to-amber-300 p-[1.5px] shadow-[0_0_35px_rgba(245,158,11,0.25)] flex items-center justify-center">
                  <div className="w-full h-full bg-[#110e14] rounded-[22px] flex flex-col items-center justify-center relative overflow-hidden group">
                    <div className="absolute inset-0 bg-gradient-to-b from-amber-500/10 to-transparent group-hover:opacity-100 transition-opacity" />
                    <Gift className="w-12 h-12 sm:w-16 sm:h-16 text-amber-300 group-hover:scale-110 transition-transform duration-300" />
                    <span className="text-[10px] uppercase tracking-widest text-amber-200/70 font-mono mt-1">Tap to Open</span>
                  </div>
                </div>

                {/* Wax seal effect */}
                <div className="absolute -bottom-2 -right-2 bg-gradient-to-br from-rose-600 to-red-700 text-white p-2 rounded-full shadow-lg border border-rose-300/40">
                  <Heart className="w-4 h-4 fill-white" />
                </div>
              </motion.div>

              <div className="space-y-2">
                <span className="text-xs uppercase tracking-widest text-amber-300/80 font-mono">Today's Daily Box</span>
                <h3 className="text-2xl sm:text-3xl font-serif-title font-light text-white">
                  There's a little something waiting for you
                </h3>
                <p className="text-xs sm:text-sm text-white/50 max-w-xs mx-auto">
                  One unopened surprise was chosen for today ({getTodayDateStr()}). Tap the sealed box to reveal what's inside.
                </p>
              </div>

              <button
                onClick={handleOpenBox}
                disabled={isOpening}
                className="px-6 py-3 rounded-full bg-gradient-to-r from-amber-400 to-rose-400 text-black font-medium text-sm hover:opacity-90 transition-opacity shadow-lg shadow-amber-500/20 inline-flex items-center gap-2"
              >
                <Sparkles className="w-4 h-4" />
                <span>{isOpening ? "Opening the Envelope..." : "Open Today's Message"}</span>
              </button>
            </div>
          ) : (
            /* REVEALED MESSAGE STATE */
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="space-y-6"
            >
              <div className="flex flex-wrap items-center justify-between border-b border-white/10 pb-4 gap-2">
                <div className="flex items-center gap-2">
                  <div className="p-2 bg-amber-500/20 rounded-xl text-amber-300">
                    <Gift className="w-5 h-5" />
                  </div>
                  <div>
                    <span className="text-[10px] uppercase font-mono tracking-widest text-amber-400/80">Today's Revealed Note</span>
                    <h3 className="text-lg font-serif-title text-white/90">
                      {dailyMessage?.title || `From ${dailyMessage?.authorName}`}
                    </h3>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <span className="px-2.5 py-1 rounded-full bg-white/5 border border-white/10 text-white/70 text-xs">
                    {dailyMessage?.category}
                  </span>
                  <button
                    onClick={() => dailyMessage && handleFavoriteToggle(dailyMessage)}
                    className={`p-2 rounded-xl border transition-colors ${
                      dailyMessage?.isFavorite
                        ? "bg-rose-500/20 border-rose-500/40 text-rose-400"
                        : "bg-white/5 border-white/10 text-white/40 hover:text-white"
                    }`}
                    title="Save to Favourites"
                  >
                    <Star className={`w-4 h-4 ${dailyMessage?.isFavorite ? "fill-current" : ""}`} />
                  </button>
                </div>
              </div>

              {/* Message Paper Presentation */}
              <div className="p-6 sm:p-8 rounded-2xl bg-[#16141a] border border-amber-500/20 relative shadow-inner">
                <div className="text-xl sm:text-2xl font-serif leading-relaxed text-amber-100/95 whitespace-pre-line italic">
                  "{dailyMessage?.content}"
                </div>

                <div className="mt-6 pt-4 border-t border-white/10 flex flex-wrap items-center justify-between gap-4 text-xs text-white/60">
                  <div className="flex items-center gap-2">
                    <User className="w-3.5 h-3.5 text-amber-300" />
                    <span>Written with love by <strong className="text-white/90 font-medium">{dailyMessage?.authorName}</strong></span>
                  </div>
                  <div className="flex items-center gap-2 font-mono text-[11px] text-white/40">
                    <Calendar className="w-3 h-3" />
                    <span>Revealed on {getTodayDateStr()}</span>
                  </div>
                </div>

                {/* Reactions */}
                <div className="mt-4 pt-3 flex flex-wrap items-center gap-2">
                  <span className="text-[11px] text-white/40 font-mono">React:</span>
                  {REACTION_EMOJIS.map(emoji => {
                    const isMyReaction = dailyMessage?.reactions?.[currentUserId] === emoji;
                    return (
                      <button
                        key={emoji}
                        onClick={() => dailyMessage && handleReact(dailyMessage.id, emoji)}
                        className={`px-2.5 py-1 rounded-lg text-sm border transition-all ${
                          isMyReaction
                            ? "bg-amber-500/30 border-amber-500/50 scale-110"
                            : "bg-white/5 border-white/10 hover:bg-white/10"
                        }`}
                      >
                        {emoji}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Second message if dual reveal day */}
              {secondDailyMessage && (
                <div className="mt-8 p-6 sm:p-8 rounded-2xl bg-[#14161a] border border-rose-500/20 relative">
                  <div className="flex items-center justify-between mb-4">
                    <span className="text-xs uppercase font-mono tracking-widest text-rose-300">Shared Dual Reveal Special</span>
                    <span className="text-xs text-white/60">From {secondDailyMessage.authorName}</span>
                  </div>
                  <div className="text-xl font-serif text-white/90 italic">
                    "{secondDailyMessage.content}"
                  </div>
                </div>
              )}
            </motion.div>
          )}
        </GlassPanel>
      </div>

      {/* ARCHIVE OF PREVIOUSLY OPENED MESSAGES */}
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/10 pb-4">
          <div className="flex items-center gap-2">
            <Archive className="w-5 h-5 text-amber-400" />
            <h2 className="text-xl sm:text-2xl font-serif-title font-light">Memory Box Archive</h2>
            <span className="text-xs px-2 py-0.5 rounded-full bg-white/10 text-white/60 font-mono">
              {openedArchive.length} opened
            </span>
          </div>

          {/* Filter options */}
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => setArchiveFilter("all")}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                archiveFilter === "all" ? "bg-white/20 text-white" : "bg-white/5 text-white/60 hover:text-white"
              }`}
            >
              All Opened
            </button>
            <button
              onClick={() => setArchiveFilter("favorites")}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-colors ${
                archiveFilter === "favorites" ? "bg-rose-500/30 text-rose-300 border border-rose-500/40" : "bg-white/5 text-white/60 hover:text-white"
              }`}
            >
              <Star className="w-3.5 h-3.5 fill-rose-300" />
              <span>Favorites</span>
            </button>
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="px-2.5 py-1.5 rounded-lg bg-neutral-900 border border-white/10 text-xs text-white/80 focus:outline-none"
            >
              <option value="all">All Categories</option>
              {CATEGORIES.map(c => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Search */}
        <input
          type="text"
          placeholder="Search through opened memories, notes, and jokes..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-sm text-white placeholder-white/30 focus:outline-none focus:border-amber-400/50"
        />

        {/* Message Grid */}
        {filteredArchive.length === 0 ? (
          <div className="py-12 text-center text-white/40 text-sm italic bg-white/[0.02] border border-white/5 rounded-2xl">
            No opened messages matching this filter yet. Check back each day as new boxes are revealed!
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filteredArchive.map((msg) => (
              <GlassPanel
                key={msg.id}
                className="p-5 border border-white/10 hover:border-amber-500/30 transition-all rounded-2xl space-y-3 flex flex-col justify-between"
              >
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="px-2 py-0.5 rounded-md bg-amber-500/10 text-amber-300/80 font-mono text-[10px]">
                      {msg.category}
                    </span>
                    <button
                      onClick={() => handleFavoriteToggle(msg)}
                      className="text-white/40 hover:text-rose-400 transition-colors"
                    >
                      <Star className={`w-3.5 h-3.5 ${msg.isFavorite ? "fill-rose-400 text-rose-400" : ""}`} />
                    </button>
                  </div>
                  {msg.title && (
                    <h4 className="font-serif font-medium text-white/90 text-base">{msg.title}</h4>
                  )}
                  <p className="text-white/70 text-sm font-light italic leading-relaxed line-clamp-4">
                    "{msg.content}"
                  </p>
                </div>

                <div className="pt-3 border-t border-white/5 flex items-center justify-between text-[11px] text-white/40">
                  <span>From: <strong className="text-white/80 font-medium">{msg.authorName}</strong></span>
                  <div className="flex items-center gap-1.5">
                    {msg.reactions && Object.values(msg.reactions).map((emo, idx) => (
                      <span key={idx} className="text-xs">{emo}</span>
                    ))}
                  </div>
                </div>
              </GlassPanel>
            ))}
          </div>
        )}
      </div>

      {/* ADD CONTRIBUTION MODAL */}
      <AnimatePresence>
        {showAddModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-lg bg-[#141217] border border-amber-500/30 rounded-3xl p-6 sm:p-8 shadow-2xl relative space-y-5"
            >
              <button
                onClick={() => setShowAddModal(false)}
                className="absolute top-5 right-5 p-2 text-white/40 hover:text-white rounded-full bg-white/5"
              >
                <X className="w-4 h-4" />
              </button>

              <div className="space-y-1">
                <span className="text-[11px] font-mono uppercase tracking-widest text-amber-400">Secret Contribution</span>
                <h3 className="text-2xl font-serif-title text-white">Add to the Virtual Boxes</h3>
                <p className="text-xs text-white/50">
                  Write something sweet, funny, or memorable. It will be sealed in the collection and revealed on a random future day!
                </p>
              </div>

              <form onSubmit={handleCreateMessage} className="space-y-4">
                <div>
                  <label className="text-xs text-white/60 mb-1 block">Title (Optional)</label>
                  <input
                    type="text"
                    placeholder="e.g. A quick smile for you..."
                    value={newTitle}
                    onChange={(e) => setNewTitle(e.target.value)}
                    className="w-full px-3.5 py-2 rounded-xl bg-white/5 border border-white/10 text-sm text-white focus:outline-none focus:border-amber-400/50"
                  />
                </div>

                <div>
                  <label className="text-xs text-white/60 mb-1 block">Your Message *</label>
                  <textarea
                    required
                    rows={4}
                    placeholder="Write your note, memory, challenge, compliment, or joke..."
                    value={newContent}
                    onChange={(e) => setNewContent(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-white/5 border border-white/10 text-sm text-white focus:outline-none focus:border-amber-400/50 resize-none font-serif leading-relaxed"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs text-white/60 mb-1 block">Category</label>
                    <select
                      value={newCategory}
                      onChange={(e) => setNewCategory(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl bg-neutral-900 border border-white/10 text-xs text-white focus:outline-none"
                    >
                      {CATEGORIES.map(c => (
                        <option key={c} value={c}>{c}</option>
                      ))}
                      <option value="custom">+ Custom Category</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-xs text-white/60 mb-1 block">Scheduled Release Date (Optional)</label>
                    <input
                      type="date"
                      value={scheduledDate}
                      onChange={(e) => setScheduledDate(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl bg-neutral-900 border border-white/10 text-xs text-white focus:outline-none"
                    />
                  </div>
                </div>

                {newCategory === "custom" && (
                  <div>
                    <label className="text-xs text-white/60 mb-1 block">Custom Category Name</label>
                    <input
                      type="text"
                      placeholder="e.g. Cape Town Dreams"
                      value={customCategory}
                      onChange={(e) => setCustomCategory(e.target.value)}
                      className="w-full px-3.5 py-2 rounded-xl bg-white/5 border border-white/10 text-sm text-white focus:outline-none focus:border-amber-400/50"
                    />
                  </div>
                )}

                {/* Privacy & Author options */}
                <div className="p-3.5 rounded-xl bg-white/[0.03] border border-white/10 space-y-2 text-xs">
                  <label className="flex items-center gap-2 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={isSecret}
                      onChange={(e) => setIsSecret(e.target.checked)}
                      className="rounded accent-amber-500"
                    />
                    <span className="text-white/80">Keep secret from partner until revealed (Recommended)</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={isAnonymous}
                      onChange={(e) => setIsAnonymous(e.target.checked)}
                      className="rounded accent-amber-500"
                    />
                    <span className="text-white/80">Sign as anonymous ("Someone who adores you")</span>
                  </label>
                </div>

                <div className="flex justify-end gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowAddModal(false)}
                    className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-white/60 text-xs"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submitting || !newContent.trim()}
                    className="px-5 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-rose-500 hover:from-amber-600 hover:to-rose-600 text-white font-medium text-xs shadow-md transition-all flex items-center gap-2"
                  >
                    <Send className="w-3.5 h-3.5" />
                    <span>{submitting ? "Sealing..." : "Seal in Message Box"}</span>
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
