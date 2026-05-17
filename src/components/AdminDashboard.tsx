import { lazy, Suspense, useEffect, useState } from "react";
import { collection, query, orderBy, onSnapshot, doc, updateDoc, deleteDoc, Timestamp } from "firebase/firestore";
import { db, handleFirestoreError, OperationType } from "../lib/firebase";
import { List, Plus, Heart, Eye, Edit3, Save, Trash2, X, Clock4, CheckCircle2 } from "lucide-react";
import GlassPanel from "./GlassPanel";
import { format } from "date-fns";
import { User } from "firebase/auth";
import { UserProfile } from "../hooks/useAuth";
import { AnimatePresence } from "motion/react";
import { cn } from "../lib/utils";

const LunarCycle = lazy(() => import("./LunarCycle"));
const EmotionalWeather = lazy(() => import("./EmotionalWeather"));
const UsDrop = lazy(() => import("./UsDrop"));
const AdminEditor = lazy(() => import("./AdminEditor"));
const LetterReader = lazy(() => import("./LetterReader"));

interface LetterRecord {
  id: string;
  title: string;
  content: string;
  publishDate: any;
  isPublished: boolean;
  isFavorite: boolean;
  isRead?: boolean;
  authorId?: string;
}

export default function AdminDashboard({ user, profile }: { user: User; profile: UserProfile | null }) {
  const [history, setHistory] = useState<LetterRecord[]>([]);
  const [view, setView] = useState<"write" | "list" | "radar">("write");
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
              onClick={() => setView("radar")}
              className={cn(
                "px-6 py-3 rounded-xl text-xs font-bold uppercase tracking-widest flex items-center gap-2 transition-all",
                view === "radar" ? "bg-white text-black shadow-xl" : "text-white/40 hover:text-white"
              )}
            >
              <Heart className="w-4 h-4" /> Connection
            </button>
          <button
            onClick={() => setView("radar")}
            className={cn(
              "px-6 py-3 rounded-xl text-xs font-bold uppercase tracking-widest flex items-center gap-2 transition-all",
              view === "radar" ? "bg-white text-black shadow-xl" : "text-white/40 hover:text-white"
            )}
          >
            <Activity className="w-4 h-4" /> Radar
          </button>
        </div>
      </div>

      {view === "write" ? (
        <Suspense fallback={<div className="py-20 text-center text-white/30">Loading editor...</div>}>
          <AdminEditor userId={user.uid} onPublished={() => setView("list")} />
        </Suspense>
      ) : view === "list" ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {history.map((item) => {
            const visibleNow = isVisibleToReaderNow(item);
            return (
              <GlassPanel key={item.id} className="p-6 space-y-4 hover:border-white/20 transition-all">
                <div className="space-y-1">
                  <h3 className="text-xl font-light italic font-serif text-white">{item.title}</h3>
                  <p className="text-[10px] uppercase tracking-widest text-white/30 font-bold">
                    {item.publishDate?.toDate ? format(item.publishDate.toDate(), "PPpp") : "No publish date"}
                  </p>
                </div>

                <div className="flex items-center justify-between gap-3 flex-wrap">
                  <span
                    className={cn(
                      "px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest border",
                      visibleNow
                        ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                        : "bg-amber-500/10 text-amber-300 border-amber-500/20"
                    )}
                  >
                    {visibleNow ? "Visible To Her" : "Scheduled / Hidden"}
                  </span>
                  {item.isRead ? (
                    <span className="text-[10px] uppercase tracking-widest text-blue-300 flex items-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5" /> Read
                    </span>
                  ) : (
                    <span className="text-[10px] uppercase tracking-widest text-white/40 flex items-center gap-1">
                      <Clock4 className="w-3.5 h-3.5" /> Unread
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
                  <button
                    onClick={() => openEditModal(item)}
                    className="px-3 py-2 rounded-lg bg-blue-500/10 border border-blue-500/30 text-blue-300 text-[11px] font-bold uppercase tracking-widest flex items-center gap-2"
                  >
                    <Edit3 className="w-4 h-4" /> Edit
                  </button>
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
            <LetterReader letter={selectedLetter} onClose={() => setSelectedLetter(null)} />
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
