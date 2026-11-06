import { useEffect, useMemo, useRef, useState } from "react";
import { motion } from "motion/react";
import { X, Heart, ChevronLeft, ChevronRight, Lock, Users, Trash2, Pencil, Check, Sparkles, FolderHeart, Plus, Bot } from "lucide-react";
import MediaView from "./MediaView";
import { formatMemoryDate, SOURCE_LABEL } from "./MemoryCard";
import {
  addMediaToMemory, deleteMemory, markOpened, preparePhoto, react, savePerspective, setCollectionMembership,
  toggleFavourite, updateMemory, useMemoryExtras, type MemoryCollection,
} from "../../lib/memoryGarden/client";
import { apiFetch } from "../../lib/api";
import type { Memory } from "../../lib/memoryGarden/model";
import type { UserProfile } from "../../types";

const EMOJIS = ["❤️", "🥹", "😂", "🌸", "✨", "🤍"];

export default function MemoryTheatre({ memory, list, uid, me, partner, collections, onClose, onNavigate }: {
  memory: Memory; list: Memory[]; uid: string; me: UserProfile | null; partner?: UserProfile | null;
  collections: MemoryCollection[]; onClose: () => void; onNavigate: (id: string) => void;
}) {
  const [slide, setSlide] = useState(0);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState({ title: memory.title, caption: memory.caption, memoryDate: memory.memoryDate, tags: memory.tags.join(", "), visibility: memory.visibility });
  const [myText, setMyText] = useState("");
  const [myShared, setMyShared] = useState(false);
  const [note, setNote] = useState("");
  const [msg, setMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const isOwner = memory.ownerId === uid;
  const isShared = memory.visibility === "shared";
  const { perspectives, reactions } = useMemoryExtras(memory.id, uid, isShared);
  const mine = perspectives.find((p) => p.authorId === uid);
  const theirs = perspectives.find((p) => p.authorId !== uid && p.shared);
  const myReaction = reactions.find((r) => r.userId === uid);
  const idx = list.findIndex((m) => m.id === memory.id);
  const nameOf = (id: string) => (id === uid ? "You" : partner?.uid === id ? partner.displayName ?? "Them" : "Them");

  useEffect(() => { markOpened(memory); setSlide(0); setEditing(false); setMsg(null); }, [memory.id]);
  useEffect(() => { setMyText(mine?.text ?? ""); setMyShared(mine?.shared ?? false); }, [mine?.text, mine?.shared]);
  useEffect(() => { setDraft({ title: memory.title, caption: memory.caption, memoryDate: memory.memoryDate, tags: memory.tags.join(", "), visibility: memory.visibility }); }, [memory]);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowRight" && idx < list.length - 1) onNavigate(list[idx + 1].id);
      if (e.key === "ArrowLeft" && idx > 0) onNavigate(list[idx - 1].id);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [idx, list, onClose, onNavigate]);

  // Stay put underneath while a memory is open.
  useEffect(() => {
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = previous; };
  }, []);

  // Swipe sideways on the picture: next file in this memory, then the next memory.
  const touch = useRef<{ x: number; y: number } | null>(null);
  const onTouchEnd = (e: React.TouchEvent) => {
    const start = touch.current;
    touch.current = null;
    if (!start) return;
    const dx = e.changedTouches[0].clientX - start.x;
    const dy = e.changedTouches[0].clientY - start.y;
    if (Math.abs(dx) < 60 || Math.abs(dx) < Math.abs(dy) * 1.5) return;
    if (dx < 0) {
      if (slide < media.length - 1) setSlide(slide + 1);
      else if (idx < list.length - 1) onNavigate(list[idx + 1].id);
    } else {
      if (slide > 0) setSlide(slide - 1);
      else if (idx > 0) onNavigate(list[idx - 1].id);
    }
  };

  const run = async (f: () => Promise<unknown>, ok?: string) => {
    setBusy(true); setMsg(null);
    try { await f(); if (ok) setMsg(ok); } catch (e: any) { setMsg(e?.message ?? "That didn't work."); } finally { setBusy(false); }
  };

  const saveEdit = () => run(async () => {
    if (draft.visibility === "shared" && memory.visibility === "private" && !confirm("Share this memory with your partner?")) return;
    await updateMemory(memory.id, { title: draft.title.trim() || memory.title, caption: draft.caption, memoryDate: draft.memoryDate, tags: draft.tags.split(",").map((t) => t.trim()).filter(Boolean), visibility: draft.visibility, status: "organised" });
    setEditing(false);
  }, "Saved.");

  const addPhoto = async (f?: File) => {
    if (!f) return;
    await run(async () => { const p = await preparePhoto(f); await addMediaToMemory(memory.id, { kind: "photo", data: p.data }, p.thumbnail); }, "Photo added.");
  };

  const myCollections = useMemo(() => collections.filter((c) => c.visibility === "shared" || c.ownerId === uid), [collections, uid]);
  const media = memory.media;

  return (
    <div className="fixed inset-0 z-[60] bg-[#0b0a08]/90 backdrop-blur-md overflow-y-auto overscroll-contain" role="dialog" aria-modal="true" aria-label={memory.title}>
      <div className="min-h-full flex items-start sm:items-center justify-center p-0 sm:p-6">
        <motion.div initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} className="relative w-full max-w-5xl bg-[#f7f0e1] text-[#3e3326] sm:rounded-3xl overflow-hidden shadow-2xl grid lg:grid-cols-[1.35fr_1fr]">
          <button onClick={onClose} className="fixed sm:absolute top-[calc(0.75rem+env(safe-area-inset-top))] right-3 z-10 p-2.5 rounded-full bg-black/60 text-white hover:bg-black/70 flex items-center justify-center" aria-label="Close"><X className="w-5 h-5" /></button>

          <div onTouchStart={(e) => { touch.current = { x: e.touches[0].clientX, y: e.touches[0].clientY }; }} onTouchEnd={onTouchEnd} className="relative bg-[#1b1712] min-h-[260px] lg:min-h-[560px] flex items-center justify-center">
            {media.length ? (
              <MediaView memory={memory} index={slide} className="w-full h-full max-h-[62dvh] lg:max-h-[75vh]" />
            ) : (
              <div className="px-6 py-14 sm:p-10 text-center max-w-md">
                <Sparkles className="w-7 h-7 text-[#c9a46a] mx-auto mb-4" />
                <p className="font-serif italic text-xl text-[#efe3c8] leading-relaxed whitespace-pre-line">{memory.caption || memory.title}</p>
              </div>
            )}
            {media.length > 1 && (
              <>
                <button disabled={slide === 0} onClick={() => setSlide((s) => s - 1)} className="absolute left-3 top-1/2 -translate-y-1/2 p-2 rounded-full bg-black/40 text-white disabled:opacity-30" aria-label="Previous file"><ChevronLeft /></button>
                <button disabled={slide >= media.length - 1} onClick={() => setSlide((s) => s + 1)} className="absolute right-3 top-1/2 -translate-y-1/2 p-2 rounded-full bg-black/40 text-white disabled:opacity-30" aria-label="Next file"><ChevronRight /></button>
                <span className="absolute bottom-3 left-1/2 -translate-x-1/2 text-xs text-white/80 bg-black/40 px-2 py-0.5 rounded-full">{slide + 1} / {media.length}</span>
              </>
            )}
            <div className="absolute bottom-3 left-3 flex gap-2">
              {idx > 0 && <button onClick={() => onNavigate(list[idx - 1].id)} className="px-3 py-1.5 rounded-full bg-black/40 text-white text-xs">← Earlier</button>}
              {idx < list.length - 1 && <button onClick={() => onNavigate(list[idx + 1].id)} className="px-3 py-1.5 rounded-full bg-black/40 text-white text-xs">Later →</button>}
            </div>
          </div>

          <div className="p-5 sm:p-6 pb-[calc(1.5rem+env(safe-area-inset-bottom))] space-y-5 max-h-none lg:max-h-[86vh] lg:overflow-y-auto">
            {!editing ? (
              <div className="space-y-2">
                <p className="text-[11px] uppercase tracking-[0.22em] text-[#8a7a5c]">{formatMemoryDate(memory)}{memory.location ? ` · ${memory.location}` : ""}</p>
                <h2 className="font-serif text-2xl sm:text-3xl leading-tight break-words">{memory.title}</h2>
                {media.length > 0 && memory.caption && <p className="font-serif text-[15px] leading-relaxed text-[#54473a] whitespace-pre-line">{memory.caption}</p>}
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {memory.tags.map((t) => <span key={t} className="text-[11px] px-2 py-0.5 rounded-full bg-[#e7dcc3] text-[#6b5a43]">#{t}</span>)}
                </div>
              </div>
            ) : (
              <div className="space-y-2">
                <input value={draft.title} onChange={(e) => setDraft({ ...draft, title: e.target.value })} maxLength={120} className="w-full px-3 py-2 rounded-xl bg-white/70 border border-[#e2d4b6] font-serif text-xl" aria-label="Title" />
                <textarea value={draft.caption} onChange={(e) => setDraft({ ...draft, caption: e.target.value })} maxLength={4000} rows={4} className="w-full px-3 py-2 rounded-xl bg-white/70 border border-[#e2d4b6] font-serif" aria-label="Caption" />
                <div className="grid grid-cols-2 gap-2">
                  <input type="date" value={draft.memoryDate} onChange={(e) => setDraft({ ...draft, memoryDate: e.target.value })} className="px-3 py-2 rounded-xl bg-white/70 border border-[#e2d4b6] text-sm" aria-label="Date" />
                  <input value={draft.tags} onChange={(e) => setDraft({ ...draft, tags: e.target.value })} placeholder="tags, comma separated" className="px-3 py-2 rounded-xl bg-white/70 border border-[#e2d4b6] text-sm" aria-label="Tags" />
                </div>
                <div className="flex gap-2 text-xs">
                  <button onClick={() => setDraft({ ...draft, visibility: "shared" })} className={`px-3 py-1.5 rounded-lg border ${draft.visibility === "shared" ? "bg-[#6b7a4f] text-white" : "bg-white/60 border-[#e2d4b6]"}`}><Users className="inline w-3 h-3 mr-1" />Shared</button>
                  <button onClick={() => setDraft({ ...draft, visibility: "private" })} className={`px-3 py-1.5 rounded-lg border ${draft.visibility === "private" ? "bg-[#5a4636] text-white" : "bg-white/60 border-[#e2d4b6]"}`}><Lock className="inline w-3 h-3 mr-1" />Private to me</button>
                </div>
                <div className="flex gap-2">
                  <button disabled={busy} onClick={saveEdit} className="px-4 py-2 rounded-xl bg-[#6b7a4f] text-white text-sm flex items-center gap-1"><Check className="w-4 h-4" /> Save</button>
                  <button onClick={() => setEditing(false)} className="px-4 py-2 rounded-xl bg-white/60 border border-[#e2d4b6] text-sm">Cancel</button>
                </div>
              </div>
            )}

            <div className="flex flex-wrap items-center gap-2">
              <button onClick={() => run(() => toggleFavourite(memory, uid))} className={`px-3 py-1.5 rounded-full text-xs flex items-center gap-1 border ${memory.favouritedBy.includes(uid) ? "bg-[#c98b8b] text-white border-[#c98b8b]" : "bg-white/60 border-[#e2d4b6]"}`}>
                <Heart className={`w-3.5 h-3.5 ${memory.favouritedBy.includes(uid) ? "fill-white" : ""}`} /> Favourite
              </button>
              {isOwner && !editing && <button onClick={() => setEditing(true)} className="px-3 py-1.5 rounded-full text-xs bg-white/60 border border-[#e2d4b6] flex items-center justify-center gap-1"><Pencil className="w-3.5 h-3.5" /> Edit</button>}
              {isOwner && media.length < 12 && me?.savestate && (
                <label className="px-3 py-1.5 rounded-full text-xs bg-white/60 border border-[#e2d4b6] flex items-center gap-1 cursor-pointer"><Plus className="w-3.5 h-3.5" /> Photo<input type="file" accept="image/*" className="sr-only" onChange={(e) => addPhoto(e.target.files?.[0])} /></label>
              )}
              {isOwner && isShared && <button disabled={busy} onClick={() => run(() => apiFetch("memories/share-with-jarvis", { body: { id: memory.id } }), "Jarvis can now remember this with you.")} className="px-3 py-1.5 rounded-full text-xs bg-white/60 border border-[#e2d4b6] flex items-center justify-center gap-1"><Bot className="w-3.5 h-3.5" /> Share with Jarvis</button>}
              {isOwner && <button disabled={busy} onClick={() => confirm(memory.source === "cupid" ? "Delete this memory? Its files in Cupid's SaveState album go too." : "Remove this from the garden? The original stays where it came from.") && run(() => deleteMemory(memory.id).then(onClose))} className="px-3 py-1.5 rounded-full text-xs text-[#8a3f3f] bg-white/60 border border-[#e2d4b6] flex items-center gap-1"><Trash2 className="w-3.5 h-3.5" /> {memory.source === "cupid" ? "Delete" : "Remove"}</button>}
            </div>

            {myCollections.length > 0 && (
              <div>
                <p className="text-[11px] uppercase tracking-widest text-[#8a7a5c] mb-1.5 flex items-center gap-1"><FolderHeart className="w-3.5 h-3.5" /> Collections</p>
                <div className="flex flex-wrap gap-1.5">
                  {myCollections.map((c) => {
                    const inIt = memory.collectionIds.includes(c.id);
                    const can = isOwner || (isShared && c.visibility === "shared");
                    return <button key={c.id} disabled={!can || busy} onClick={() => run(() => setCollectionMembership(memory, c.id, !inIt))} className={`text-[11px] px-2.5 py-1 rounded-full border ${inIt ? "bg-[#b8955a] text-white border-[#b8955a]" : "bg-white/60 border-[#e2d4b6]"} disabled:opacity-50`}>{c.name}</button>;
                  })}
                </div>
              </div>
            )}

            {isShared && (
              <div className="space-y-3 border-t border-[#e7dbc1] pt-4">
                <p className="text-[11px] uppercase tracking-widest text-[#8a7a5c]">Two perspectives</p>
                {theirs && (
                  <blockquote className="font-serif italic text-[15px] leading-relaxed bg-white/60 border-l-4 border-[#c98b8b] rounded-r-xl p-3">
                    {theirs.text}<footer className="not-italic text-[11px] text-[#8a7a5c] mt-1">— {nameOf(theirs.authorId)}</footer>
                  </blockquote>
                )}
                <textarea value={myText} onChange={(e) => setMyText(e.target.value)} rows={3} maxLength={4000} placeholder="How you remember it…" className="w-full px-3 py-2 rounded-xl bg-white/70 border border-[#e2d4b6] font-serif text-sm" aria-label="Your perspective" />
                <div className="flex items-center justify-between">
                  <label className="text-xs flex items-center gap-1.5"><input type="checkbox" checked={myShared} onChange={(e) => setMyShared(e.target.checked)} className="accent-[#6b7a4f]" /> Let {partner?.displayName ?? "them"} read it</label>
                  <button disabled={busy || !myText.trim()} onClick={() => run(() => savePerspective(memory.id, uid, myText.trim(), myShared), myShared ? "Your perspective is shared." : "Saved, just for you.")} className="px-3 py-1.5 rounded-lg bg-[#6b7a4f] text-white text-xs disabled:opacity-50">Save</button>
                </div>
              </div>
            )}

            {isShared && (
              <div className="space-y-2 border-t border-[#e7dbc1] pt-4">
                <div className="flex flex-wrap gap-1.5">
                  {EMOJIS.map((e) => (
                    <button key={e} onClick={() => run(() => react(memory.id, uid, myReaction?.emoji === e ? "" : e, note))} className={`w-11 h-11 rounded-full text-lg border ${myReaction?.emoji === e ? "bg-[#f0d9d9] border-[#c98b8b]" : "bg-white/60 border-[#e2d4b6]"}`} aria-label={`React ${e}`}>{e}</button>
                  ))}
                </div>
                <div className="flex gap-2">
                  <input value={note} onChange={(e) => setNote(e.target.value)} maxLength={280} placeholder="Add a little note" className="flex-1 px-3 py-1.5 rounded-lg bg-white/70 border border-[#e2d4b6] text-sm" />
                  <button disabled={!note.trim()} onClick={() => run(() => react(memory.id, uid, myReaction?.emoji || "🤍", note).then(() => setNote("")))} className="px-3 py-1.5 rounded-lg bg-white/70 border border-[#e2d4b6] text-xs disabled:opacity-50">Leave note</button>
                </div>
                {reactions.filter((r) => r.note || r.userId !== uid).map((r) => (
                  <p key={r.id} className="text-xs text-[#5e4f3b]"><span className="mr-1">{r.emoji}</span>{r.note && <span className="font-serif italic">“{r.note}”</span>} <span className="text-[#9a8a70]">— {nameOf(r.userId)}</span></p>
                ))}
              </div>
            )}

            <div className="border-t border-[#e7dbc1] pt-3 text-[11px] text-[#8a7a5c] space-y-0.5">
              <p>{isShared ? <><Users className="inline w-3 h-3 mr-1" />Shared between you</> : <><Lock className="inline w-3 h-3 mr-1" />Private to {isOwner ? "you" : "its owner"}</>}</p>
              <p>From {memory.provenance?.label ?? SOURCE_LABEL[memory.source]}{memory.source !== "cupid" ? " · the original stays there" : ""}</p>
            </div>
            {msg && <p className="text-xs bg-white/70 border border-[#e2d4b6] rounded-lg p-2">{msg}</p>}
          </div>
        </motion.div>
      </div>
    </div>
  );
}
