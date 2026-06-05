import { lazy, Suspense, useEffect, useMemo, useState } from "react";
import { collection, query, orderBy, onSnapshot, doc, updateDoc, deleteDoc, Timestamp } from "firebase/firestore";
import { db, handleFirestoreError, OperationType } from "../lib/firebase";
import { List, Plus, Heart, Eye, Edit3, Save, Trash2, X, Clock4, CheckCircle2, Inbox, Send, Archive, Search, Filter } from "lucide-react";
import GlassPanel from "./GlassPanel";
import { format } from "date-fns";
import { User } from "firebase/auth";
import { UserProfile } from "../hooks/useAuth";
import { AnimatePresence } from "motion/react";
import { cn } from "../lib/utils";
import { notifyPartner } from "../lib/notifications";

const LunarCycle = lazy(() => import("./LunarCycle"));
const EmotionalWeather = lazy(() => import("./EmotionalWeather"));
const UsDrop = lazy(() => import("./UsDrop"));
const AdminEditor = lazy(() => import("./AdminEditor"));
const LetterReader = lazy(() => import("./LetterReader"));
const Vault = lazy(() => import("./Vault"));

interface LetterRecord {
  id: string;
  title: string;
  content: string;
  publishDate: any;
  isPublished: boolean;
  isFavorite: boolean;
  isRead?: boolean;
  authorId?: string;
  authorRole?: string;
  recipientRole?: string;
}

export default function AdminDashboard({ user, profile }: { user: User; profile: UserProfile | null }) {
  const [history, setHistory] = useState<LetterRecord[]>([]);
  const [view, setView] = useState<"write" | "list" | "vault" | "radar">("list");
  const [listFilter, setListFilter] = useState<"received" | "sent" | "all">("received");
  const [searchTerm, setSearchTerm] = useState("");
  const [unreadOnly, setUnreadOnly] = useState(false);
  const [sortOrder, setSortOrder] = useState<"newest" | "oldest">("newest");
  const [selectedLetter, setSelectedLetter] = useState<LetterRecord | null>(null);
  const [editingLetter, setEditingLetter] = useState<LetterRecord | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editContent, setEditContent] = useState("");
  const [editPublishDate, setEditPublishDate] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const q = query(collection(db, "letters"), orderBy("createdAt", "desc"));
    return onSnapshot(
      q,
      (snapshot) => {
        setHistory(
          snapshot.docs.map((d) => {
            const data = d.data() as Omit<LetterRecord, "id">;
            return {
              id: d.id,
              ...data,
              isFavorite: Boolean(data.isFavorite),
              isRead: Boolean(data.isRead),
            };
          })
        );
      },
      (error) => {
        handleFirestoreError(error, OperationType.LIST, "letters (admin)");
      }
    );
  }, []);

  const openEditModal = (item: LetterRecord) => {
    setEditingLetter(item);
    setEditTitle(item.title || "");
    setEditContent(item.content || "");
    const dateValue = item.publishDate?.toDate ? item.publishDate.toDate() : new Date();
    setEditPublishDate(format(dateValue, "yyyy-MM-dd'T'HH:mm"));
  };

  const handleSaveEdit = async () => {
    if (!editingLetter || !editTitle.trim() || !editContent.trim()) {
      return;
    }

    setSaving(true);
    try {
      await updateDoc(doc(db, "letters", editingLetter.id), {
        title: editTitle.trim(),
        content: editContent.trim(),
        publishDate: Timestamp.fromDate(new Date(editPublishDate)),
        isPublished: true,
        authorId: editingLetter.authorId || user.uid,
      });

      // Keep notification failures non-blocking so successful edits still complete.
      try {
        await notifyPartner(
          user.uid,
          "A letter was updated.",
          `A revised letter is waiting: ${editTitle.trim()}`
        );
      } catch (notifyError) {
        console.error("Failed to notify partner after edit:", notifyError);
      }

      setEditingLetter(null);
      alert("Letter updated successfully.");
    } catch (e) {
      handleFirestoreError(e, OperationType.UPDATE, `letters/${editingLetter.id}`);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (item: LetterRecord) => {
    const confirmed = window.confirm(`Delete letter "${item.title}"? This cannot be undone.`);
    if (!confirmed) {
      return;
    }

    try {
      await deleteDoc(doc(db, "letters", item.id));
      if (selectedLetter?.id === item.id) {
        setSelectedLetter(null);
      }
    } catch (e) {
      handleFirestoreError(e, OperationType.DELETE, `letters/${item.id}`);
    }
  };

  const isVisibleToReaderNow = (item: LetterRecord) => {
    const publishDate = item.publishDate?.toDate ? item.publishDate.toDate() : new Date();
    return item.isPublished && publishDate.getTime() <= Date.now();
  };

  const receivedLetters = history.filter((item) => item.authorId && item.authorId !== user.uid);
  const sentLetters = history.filter((item) => !item.authorId || item.authorId === user.uid);

  const filteredHistory = useMemo(() => {
    const scopeFiltered =
      listFilter === "received" ? receivedLetters :
      listFilter === "sent" ? sentLetters :
      history;

    const queryText = searchTerm.trim().toLowerCase();

    const refined = scopeFiltered.filter((item) => {
      const matchesUnread = unreadOnly ? !item.isRead : true;
      if (!matchesUnread) return false;

      if (!queryText) return true;
      const title = item.title?.toLowerCase?.() || "";
      const content = item.content?.toLowerCase?.() || "";
      return title.includes(queryText) || content.includes(queryText);
    });

    return [...refined].sort((a, b) => {
      const aTime = a.publishDate?.toDate ? a.publishDate.toDate().getTime() : 0;
      const bTime = b.publishDate?.toDate ? b.publishDate.toDate().getTime() : 0;
      return sortOrder === "newest" ? bTime - aTime : aTime - bTime;
    });
  }, [history, listFilter, receivedLetters, searchTerm, sentLetters, sortOrder, unreadOnly]);

  const unreadFromHerCount = receivedLetters.filter((item) => !item.isRead).length;

  return (
    <div className="max-w-5xl mx-auto px-6 pb-32 space-y-8">
      <div className="flex justify-between items-end">
        <div className="space-y-1">
          <p className="text-[10px] uppercase tracking-[0.3em] text-pink-500 font-bold">Welcome, {profile?.displayName?.split(" ")[0] || "Curator"}</p>
          <h1 className="text-4xl font-light italic font-serif text-white">Cupid Command</h1>
        </div>
        <div className="flex bg-white/5 p-1 rounded-2xl border border-white/10 backdrop-blur-xl">
          <button
            onClick={() => setView("write")}
            className={cn(
              "px-6 py-3 rounded-xl text-xs font-bold uppercase tracking-widest flex items-center gap-2 transition-all",
              view === "write" ? "bg-white text-black shadow-xl" : "text-white/40 hover:text-white"
            )}
          >
            <Plus className="w-4 h-4" /> Write
          </button>
          <button
            onClick={() => setView("list")}
            className={cn(
              "px-6 py-3 rounded-xl text-xs font-bold uppercase tracking-widest flex items-center gap-2 transition-all",
              view === "list" ? "bg-white text-black shadow-xl" : "text-white/40 hover:text-white"
            )}
          >
            <List className="w-4 h-4" /> Letters
            {unreadFromHerCount > 0 && (
              <span className="ml-1 min-w-5 h-5 px-1 rounded-full bg-pink-500 text-white text-[10px] leading-5 text-center">
                {unreadFromHerCount}
              </span>
            )}
          </button>
          <button
            onClick={() => setView("vault")}
            className={cn(
              "px-6 py-3 rounded-xl text-xs font-bold uppercase tracking-widest flex items-center gap-2 transition-all",
              view === "vault" ? "bg-white text-black shadow-xl" : "text-white/40 hover:text-white"
            )}
          >
            <Archive className="w-4 h-4" /> Vault
          </button>
          <button
            onClick={() => setView("radar")}
            className={cn(
              "px-6 py-3 rounded-xl text-xs font-bold uppercase tracking-widest flex items-center gap-2 transition-all",
              view === "radar" ? "bg-white text-black shadow-xl" : "text-white/40 hover:text-white"
            )}
          >
            <Heart className="w-4 h-4" /> Radar
          </button>
        </div>
      </div>

      {view === "write" ? (
        <Suspense fallback={<div className="py-20 text-center text-white/30">Loading editor...</div>}>
          <AdminEditor userId={user.uid} userEmail={user.email || ""} onPublished={() => setView("list")} />
        </Suspense>
      ) : view === "list" ? (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <GlassPanel className="p-5">
              <p className="text-[10px] uppercase tracking-widest text-white/40 font-bold mb-2">From Razia</p>
              <div className="text-3xl font-light italic font-serif text-white">{receivedLetters.length}</div>
            </GlassPanel>
            <GlassPanel className="p-5">
              <p className="text-[10px] uppercase tracking-widest text-white/40 font-bold mb-2">Unopened From Her</p>
              <div className="text-3xl font-light italic font-serif text-pink-400">{unreadFromHerCount}</div>
            </GlassPanel>
            <GlassPanel className="p-5">
              <p className="text-[10px] uppercase tracking-widest text-white/40 font-bold mb-2">Sent By You</p>
              <div className="text-3xl font-light italic font-serif text-white">{sentLetters.length}</div>
            </GlassPanel>
          </div>

          <GlassPanel className="p-4 flex flex-wrap items-center gap-2">
            <button
              onClick={() => setListFilter("received")}
              className={cn(
                "px-4 py-2 rounded-xl text-[11px] font-bold uppercase tracking-widest flex items-center gap-2 border",
                listFilter === "received"
                  ? "bg-pink-500/15 border-pink-500/40 text-pink-300"
                  : "bg-white/5 border-white/10 text-white/50 hover:text-white"
              )}
            >
              <Inbox className="w-3.5 h-3.5" /> Inbox From Her
            </button>
            <button
              onClick={() => setListFilter("sent")}
              className={cn(
                "px-4 py-2 rounded-xl text-[11px] font-bold uppercase tracking-widest flex items-center gap-2 border",
                listFilter === "sent"
                  ? "bg-blue-500/15 border-blue-500/40 text-blue-300"
                  : "bg-white/5 border-white/10 text-white/50 hover:text-white"
              )}
            >
              <Send className="w-3.5 h-3.5" /> Sent By You
            </button>
            <button
              onClick={() => setListFilter("all")}
              className={cn(
                "px-4 py-2 rounded-xl text-[11px] font-bold uppercase tracking-widest flex items-center gap-2 border",
                listFilter === "all"
                  ? "bg-white/15 border-white/40 text-white"
                  : "bg-white/5 border-white/10 text-white/50 hover:text-white"
              )}
            >
              <List className="w-3.5 h-3.5" /> All Letters
            </button>
            <button
              onClick={() => setUnreadOnly((prev) => !prev)}
              className={cn(
                "px-4 py-2 rounded-xl text-[11px] font-bold uppercase tracking-widest flex items-center gap-2 border",
                unreadOnly
                  ? "bg-amber-500/15 border-amber-500/40 text-amber-300"
                  : "bg-white/5 border-white/10 text-white/50 hover:text-white"
              )}
            >
              <Filter className="w-3.5 h-3.5" /> Unread Only
            </button>
            <button
              onClick={() => setSortOrder((prev) => (prev === "newest" ? "oldest" : "newest"))}
              className="px-4 py-2 rounded-xl text-[11px] font-bold uppercase tracking-widest flex items-center gap-2 border bg-white/5 border-white/10 text-white/50 hover:text-white"
            >
              {sortOrder === "newest" ? "Newest First" : "Oldest First"}
            </button>
            <div className="ml-auto w-full md:w-auto md:min-w-[280px] relative">
              <Search className="w-4 h-4 text-white/30 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search title or content..."
                className="w-full bg-white/5 border border-white/10 rounded-xl pl-10 pr-3 py-2 text-sm text-white placeholder:text-white/25 focus:outline-none focus:border-pink-500/30"
              />
            </div>
          </GlassPanel>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {filteredHistory.map((item) => {
              const fromRazia = item.authorId && item.authorId !== user.uid;
              const visibleNow = isVisibleToReaderNow(item);
              return (
                <GlassPanel key={item.id} className="p-6 space-y-4 hover:border-white/20 transition-all">
                  <div className="space-y-1">
                    <h3 className="text-xl font-light italic font-serif text-white">{item.title}</h3>
                    <p className="text-[10px] uppercase tracking-widest text-white/30 font-bold">
                      {item.publishDate?.toDate ? format(item.publishDate.toDate(), "PPpp") : "No publish date"}
                    </p>
                    <p className="text-sm text-white/45 leading-relaxed line-clamp-2 pt-1">{item.content}</p>
                  </div>

                  <div className="flex items-center justify-between gap-3 flex-wrap">
                    <span
                      className={cn(
                        "px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest border",
                        fromRazia
                          ? "bg-pink-500/10 text-pink-300 border-pink-500/20"
                          : visibleNow
                          ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                          : "bg-amber-500/10 text-amber-300 border-amber-500/20"
                      )}
                    >
                      {fromRazia ? "From Razia" : visibleNow ? "Visible To Her" : "Scheduled / Hidden"}
                    </span>
                    {item.isRead ? (
                      <span className="text-[10px] uppercase tracking-widest text-blue-300 flex items-center gap-1">
                        <CheckCircle2 className="w-3.5 h-3.5" /> Opened
                      </span>
                    ) : (
                      <span className="text-[10px] uppercase tracking-widest text-white/40 flex items-center gap-1">
                        <Clock4 className="w-3.5 h-3.5" /> Unopened
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-2 pt-2">
                    <button
                      onClick={() => setSelectedLetter(item)}
                      className="px-3 py-2 rounded-lg bg-white/10 hover:bg-white/15 text-white text-[11px] font-bold uppercase tracking-widest flex items-center gap-2"
                    >
                      <Eye className="w-4 h-4" /> Open
                    </button>
                    {!fromRazia && (
                      <button
                        onClick={() => openEditModal(item)}
                        className="px-3 py-2 rounded-lg bg-blue-500/10 border border-blue-500/30 text-blue-300 text-[11px] font-bold uppercase tracking-widest flex items-center gap-2"
                      >
                        <Edit3 className="w-4 h-4" /> Edit
                      </button>
                    )}
                    <button
                      onClick={() => handleDelete(item)}
                      className="px-3 py-2 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-300 text-[11px] font-bold uppercase tracking-widest flex items-center gap-2"
                    >
                      <Trash2 className="w-4 h-4" /> Delete
                    </button>
                  </div>
                </GlassPanel>
              );
            })}
          </div>

          {filteredHistory.length === 0 && (
            <GlassPanel className="p-12 text-center">
              <p className="text-white/40">
                {listFilter === "received" ? "No letters from Razia yet." : listFilter === "sent" ? "No letters sent by you yet." : "No letters yet."}
              </p>
            </GlassPanel>
          )}
        </div>
      ) : view === "vault" ? (
        <Suspense fallback={<div className="py-20 text-center text-white/30">Loading vault...</div>}>
          <Vault onOpenLetter={setSelectedLetter} />
        </Suspense>
      ) : (
        <Suspense fallback={<div className="py-20 text-center text-white/30">Loading radar...</div>}>
          <div className="space-y-12">
            <LunarCycle userId={user.uid} isAdmin={true} />
            <EmotionalWeather userId={user.uid} userEmail={user.email || ""} />
            <UsDrop userId={user.uid} />
          </div>
        </Suspense>
      )}

      <AnimatePresence>
        {selectedLetter && (
          <Suspense fallback={null}>
            <LetterReader
              letter={selectedLetter}
              onClose={() => setSelectedLetter(null)}
              currentUserId={user.uid}
              currentUserName={profile?.displayName || "Mohammed"}
              canReply={selectedLetter.authorId !== user.uid}
            />
          </Suspense>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {editingLetter && (
          <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm p-6 flex items-center justify-center">
            <GlassPanel className="w-full max-w-3xl p-6 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-xl font-serif italic text-white">Edit Letter</h3>
                <button
                  onClick={() => setEditingLetter(null)}
                  className="p-2 rounded-lg hover:bg-white/10 text-white/60"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <input
                value={editTitle}
                onChange={(e) => setEditTitle(e.target.value)}
                placeholder="Letter Title"
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white"
              />

              <textarea
                value={editContent}
                onChange={(e) => setEditContent(e.target.value)}
                placeholder="Letter Content"
                rows={10}
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white resize-y"
              />

              <input
                type="datetime-local"
                value={editPublishDate}
                onChange={(e) => setEditPublishDate(e.target.value)}
                className="bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white"
              />

              <div className="flex items-center justify-end gap-2">
                <button
                  onClick={() => setEditingLetter(null)}
                  className="px-4 py-2 rounded-lg border border-white/20 text-white/70"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveEdit}
                  disabled={saving}
                  className="px-4 py-2 rounded-lg bg-white text-black font-semibold flex items-center gap-2 disabled:opacity-60"
                >
                  <Save className="w-4 h-4" />
                  {saving ? "Saving..." : "Save Changes"}
                </button>
              </div>
            </GlassPanel>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
