import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  BookOpen,
  Heart,
  Star,
  Plus,
  Search,
  Filter,
  CheckCircle2,
  Sparkles,
  Calendar,
  Image as ImageIcon,
  Tag,
  Share2,
  X
} from "lucide-react";
import GlassPanel from "./GlassPanel";
import FeatureHeader from "./help/FeatureHeader";
import EmptyState from "./help/EmptyState";
import { MemoryBookItem, getScrapbookMemories, addScrapbookMemory, syncMemoryToEcosystem } from "../lib/memoryBookService";
import { UserProfile } from "../types";

interface MemoryBookProps {
  currentProfile: UserProfile | null;
  partnerProfile?: UserProfile | null;
}

export const MemoryBook: React.FC<MemoryBookProps> = ({
  currentProfile,
  partnerProfile
}) => {
  const [memories, setMemories] = useState<MemoryBookItem[]>([]);
  const [activeCategory, setActiveCategory] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [onlyFavorites, setOnlyFavorites] = useState(false);

  // New Memory Modal State
  const [showAddModal, setShowAddModal] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newNarrative, setNewNarrative] = useState("");
  const [newDateStr, setNewDateStr] = useState(new Date().toISOString().split("T")[0]);
  const [newPhotoUrl, setNewPhotoUrl] = useState("");
  const [newCategory, setNewCategory] = useState<MemoryBookItem["category"]>("milestone");
  const [newTagsStr, setNewTagsStr] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [toastMsg, setToastMsg] = useState("");

  const currentUserId = currentProfile?.uid || "raaziq";
  const authorName = currentProfile?.displayName || (currentProfile?.role === "admin" ? "Raaziq" : "Razia");

  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(""), 3500);
  };

  useEffect(() => {
    loadMemories();
  }, []);

  const loadMemories = async () => {
    try {
      setMemories(await getScrapbookMemories());
    } catch (e) {
      console.error("Could not load the Memory Book:", e);
      showToast("Couldn't load the Memory Book. Check your connection and try again.");
    }
  };

  const handleCreateMemory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim() || !newNarrative.trim()) return;

    setIsSubmitting(true);
    try {
      const tags = newTagsStr
        .split(",")
        .map(t => t.trim().toLowerCase())
        .filter(Boolean);

      const added = await addScrapbookMemory({
        title: newTitle.trim(),
        narrative: newNarrative.trim(),
        dateStr: newDateStr,
        photoUrl: newPhotoUrl.trim() || undefined,
        category: newCategory,
        tags: tags.length ? tags : ["memory"],
        author: authorName,
        authorId: currentUserId,
        isFavorite: false
      });

      setMemories(prev => [added, ...prev]);
      setShowAddModal(false);
      setNewTitle("");
      setNewNarrative("");
      setNewPhotoUrl("");
      setNewTagsStr("");
      showToast("Treasured forever in Our Memory Book!");
    } catch (e) {
      console.error("Failed to add memory:", e);
      showToast("That memory wasn't saved. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSyncToEcosystem = async (memory: MemoryBookItem) => {
    showToast(`Sharing "${memory.title}" with Jarvis...`);
    const res = await syncMemoryToEcosystem(memory);
    if (res.success) {
      showToast("Kept forever: Jarvis has it now.");
      setMemories(prev =>
        prev.map(m => (m.id === memory.id ? { ...m, syncStatus: "synced", externalBridgeId: res.bridgeId } : m))
      );
    } else {
      showToast(`Not shared: ${res.error ?? "Jarvis didn't answer"}. Try again later.`);
    }
  };

  // Filtered Memories
  const filtered = memories.filter(m => {
    if (onlyFavorites && !m.isFavorite) return false;
    if (activeCategory !== "all" && m.category !== activeCategory) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchTitle = m.title.toLowerCase().includes(q);
      const matchText = m.narrative.toLowerCase().includes(q);
      const matchTags = m.tags.some(t => t.includes(q));
      return matchTitle || matchText || matchTags;
    }
    return true;
  });

  return (
    <div className="space-y-8 max-w-5xl mx-auto px-4 sm:px-6 animate-fadeIn pb-12">
      {/* Self-Explanatory Feature Header */}
      <FeatureHeader
        title="Our Memory Book"
        badge="Scrapbook"
        subtitle="A sacred digital scrapbook preserving our most meaningful moments, traditions, and milestones"
        description="Every photograph, handwritten memory, and milestone here is treasured forever and connected to the wider Jarvis Second Brain ecosystem."
        helpDetails={{
          howItWorks:
            "Our Memory Book acts as our digital heirloom. Add photographs, personal reflections, and milestone dates. Authorized entries synchronize safely with the ecosystem's Forever Book, while keeping your private health records strictly walled off.",
          tips: [
            "Click 'Keep this memory forever' on any entry to ensure it's mirrored into the Second Brain.",
            "Use categories to organize wedding moments, quiet evenings, and shared traditions.",
            "Click the heart to save your favorite memories for the daily memory replay."
          ],
          privacyNote: "Only shared relationship memories are stored here. Private journals and health records are never synced."
        }}
        primaryAction={{
          label: "Add to Scrapbook",
          onClick: () => setShowAddModal(true),
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

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white/5 p-3 rounded-2xl border border-white/10">
        <div className="flex items-center gap-2 w-full sm:w-auto overflow-x-auto pb-1 sm:pb-0">
          {["all", "wedding", "milestone", "tradition", "daily_treasure"].map(cat => (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className={`px-3 py-1.5 rounded-xl text-xs font-serif transition whitespace-nowrap ${
                activeCategory === cat
                  ? "bg-rose-500/25 text-rose-200 border border-rose-500/40"
                  : "text-stone-400 hover:text-white hover:bg-white/5"
              }`}
            >
              {cat === "all" ? "All Treasures" : cat.replace("_", " ")}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <div className="relative flex-1 sm:w-56">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Search memories or tags..."
              className="w-full pl-9 pr-3 py-1.5 bg-black/40 border border-white/10 rounded-xl text-xs text-white placeholder-stone-500 focus:outline-none focus:border-rose-400 font-serif"
            />
          </div>

          <button
            onClick={() => setOnlyFavorites(!onlyFavorites)}
            className={`p-2 rounded-xl border transition ${
              onlyFavorites
                ? "bg-amber-500/20 border-amber-500/40 text-amber-300"
                : "border-white/10 text-stone-400 hover:text-white"
            }`}
            title="Favorites only"
          >
            <Star className={`w-4 h-4 ${onlyFavorites ? "fill-amber-400" : ""}`} />
          </button>
        </div>
      </div>

      {/* Scrapbook Memories Grid */}
      {filtered.length === 0 ? (
        <EmptyState
          title="No Scrapbook Memories Found"
          description="Your memory book is waiting for its first shared story. Add a photograph, anniversary date, or quiet moment together."
          actionLabel="Add First Memory"
          onAction={() => setShowAddModal(true)}
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
          {filtered.map((item, idx) => {
            const rotateDeg = idx % 2 === 0 ? "rotate-[-1deg]" : "rotate-[1deg]";
            return (
              <motion.div
                key={item.id}
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: idx * 0.05 }}
                className={`relative bg-gradient-to-br from-[#faf6ee] via-[#f7f0e1] to-[#ede3cf] text-stone-900 rounded-3xl p-6 sm:p-7 shadow-[0_15px_40px_rgba(0,0,0,0.4)] border border-[#dfc298] transition-all hover:scale-[1.01] hover:shadow-[0_20px_50px_rgba(0,0,0,0.5)] ${rotateDeg}`}
              >
                {/* Vintage Washi Tape Decor in Corner */}
                <div className="absolute -top-3 left-8 w-20 h-5 bg-rose-300/40 border border-rose-400/40 shadow-sm rotate-[-4deg] pointer-events-none rounded-[1px] backdrop-blur-[1px]" />
                
                {/* Photo if present (Polaroid Frame Style) */}
                {item.photoUrl && (
                  <div className="mb-5 p-2.5 bg-white rounded-2xl shadow-md border border-stone-200">
                    <img
                      src={item.photoUrl}
                      alt={item.title}
                      className="w-full h-56 object-cover rounded-xl"
                    />
                    <div className="pt-2 text-center text-[11px] font-serif italic text-stone-500">
                      {item.title}
                    </div>
                  </div>
                )}

                {/* Header: Date & Category */}
                <div className="flex items-center justify-between pb-3 border-b border-[#dfc298]/80 text-xs">
                  <div className="flex items-center gap-2 font-mono text-[11px] text-stone-600">
                    <Calendar className="w-3.5 h-3.5 text-rose-700" />
                    <span>{item.dateStr}</span>
                  </div>
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono uppercase bg-rose-200/80 text-rose-900 font-semibold border border-rose-300">
                    {item.category.replace("_", " ")}
                  </span>
                </div>

                {/* Title */}
                <h3 className="text-xl font-serif text-[#541c30] font-bold mt-3 tracking-wide">
                  {item.title}
                </h3>

                {/* Narrative */}
                <p className="mt-2.5 font-serif text-stone-800 text-sm sm:text-base leading-relaxed italic whitespace-pre-wrap">
                  "{item.narrative}"
                </p>

                {/* Tags */}
                {item.tags && item.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mt-4">
                    {item.tags.map((t, i) => (
                      <span
                        key={i}
                        className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-stone-200/70 text-stone-700"
                      >
                        #{t}
                      </span>
                    ))}
                  </div>
                )}

                {/* Footer Attribution & Ecosystem Sync */}
                <div className="mt-5 pt-3 border-t border-[#dfc298]/60 flex items-center justify-between text-xs">
                  <span className="font-serif text-stone-600 text-[11px]">
                    Preserved by <strong className="text-stone-900">{item.author}</strong>
                  </span>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleSyncToEcosystem(item)}
                      className={`px-3 py-1 rounded-xl text-[11px] font-mono transition flex items-center gap-1 border ${
                        item.syncStatus === "synced"
                          ? "bg-emerald-100 text-emerald-800 border-emerald-300"
                          : "bg-white/80 hover:bg-white text-stone-700 border-stone-300 shadow-sm"
                      }`}
                      title="Synchronize with Jarvis Second Brain"
                    >
                      <Sparkles className="w-3 h-3 text-amber-600" />
                      <span>{item.syncStatus === "synced" ? "Synced" : "Keep Forever"}</span>
                    </button>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}

      {/* Add Memory Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fadeIn">
          <GlassPanel className="relative w-full max-w-lg p-6 sm:p-8 rounded-3xl border-rose-300/30 overflow-hidden shadow-2xl">
            <div className="flex items-center justify-between pb-4 border-b border-white/10">
              <h3 className="text-xl font-serif text-white font-medium">Add to Our Memory Book</h3>
              <button
                onClick={() => setShowAddModal(false)}
                className="text-stone-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateMemory} className="space-y-4 pt-4 text-xs font-serif">
              <div>
                <label className="text-stone-300 block mb-1">Memory Title</label>
                <input
                  type="text"
                  required
                  value={newTitle}
                  onChange={e => setNewTitle(e.target.value)}
                  placeholder="e.g. Our First Trip to the Coast"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-black/40 border border-white/20 text-white placeholder-stone-500 focus:outline-none focus:border-rose-400 font-sans"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-stone-300 block mb-1">Date or Era</label>
                  <input
                    type="date"
                    required
                    value={newDateStr}
                    onChange={e => setNewDateStr(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-black/40 border border-white/20 text-white focus:outline-none focus:border-rose-400 font-sans"
                  />
                </div>
                <div>
                  <label className="text-stone-300 block mb-1">Category</label>
                  <select
                    value={newCategory}
                    onChange={e => setNewCategory(e.target.value as any)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-stone-900 border border-white/20 text-white focus:outline-none focus:border-rose-400 font-sans"
                  >
                    <option value="wedding">Wedding</option>
                    <option value="milestone">Milestone</option>
                    <option value="tradition">Tradition</option>
                    <option value="daily_treasure">Daily Treasure</option>
                    <option value="travel">Travel</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="text-stone-300 block mb-1">Story & Narrative</label>
                <textarea
                  rows={4}
                  required
                  value={newNarrative}
                  onChange={e => setNewNarrative(e.target.value)}
                  placeholder="Write the heartfelt story, what made you laugh, or why this moment was unforgettable..."
                  className="w-full px-3.5 py-2.5 rounded-xl bg-black/40 border border-white/20 text-white placeholder-stone-500 focus:outline-none focus:border-rose-400 font-serif leading-relaxed"
                />
              </div>

              <div>
                <label className="text-stone-300 block mb-1">Photo URL (Optional)</label>
                <input
                  type="text"
                  value={newPhotoUrl}
                  onChange={e => setNewPhotoUrl(e.target.value)}
                  placeholder="e.g. /wedding.jpg or https://..."
                  className="w-full px-3.5 py-2.5 rounded-xl bg-black/40 border border-white/20 text-white placeholder-stone-500 focus:outline-none focus:border-rose-400 font-sans"
                />
              </div>

              <div>
                <label className="text-stone-300 block mb-1">Tags (comma separated)</label>
                <input
                  type="text"
                  value={newTagsStr}
                  onChange={e => setNewTagsStr(e.target.value)}
                  placeholder="e.g. anniversary, laughter, dinner, summer"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-black/40 border border-white/20 text-white placeholder-stone-500 focus:outline-none focus:border-rose-400 font-sans"
                />
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-white/10">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 rounded-xl text-stone-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2 rounded-xl bg-gradient-to-r from-rose-600 to-rose-500 hover:from-rose-500 hover:to-rose-400 text-white font-serif font-semibold shadow-md transition disabled:opacity-50"
                >
                  {isSubmitting ? "Preserving..." : "Preserve in Scrapbook"}
                </button>
              </div>
            </form>
          </GlassPanel>
        </div>
      )}
    </div>
  );
};
export default MemoryBook;
