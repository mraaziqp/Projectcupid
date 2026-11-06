import { useEffect, useMemo, useState } from "react";
import { Heart, Shuffle, Sprout, Eye } from "lucide-react";
import { DAILY_LABELS, pickDailyMemory, type Memory } from "../../lib/memoryGarden/model";
import { loadDailyState, saveDailyState, todayLocal, toggleFavourite, useMemories } from "../../lib/memoryGarden/client";
import { formatMemoryDate, SOURCE_LABEL } from "./MemoryCard";

/**
 * "A little moment from our story…" on Home. Shared memories only. The pick is
 * the same all day for both of you; "show me another" is remembered. Missing a
 * day costs nothing — there are no streaks.
 */
export default function DailyMemory({ uid, onOpenGarden }: { uid: string; onOpenGarden: (memoryId?: string) => void }) {
  const { memories, loading } = useMemories(uid);
  const date = todayLocal();
  const [state, setState] = useState<{ skip: number; recentIds: string[] } | null>(null);

  useEffect(() => { loadDailyState(uid, date).then(setState).catch(() => setState({ skip: 0, recentIds: [] })); }, [uid, date]);

  const pick = useMemo(() => (state ? pickDailyMemory(memories, { date, skip: state.skip, recentIds: state.recentIds }) : null), [memories, state, date]);

  useEffect(() => { if (pick && state) saveDailyState(uid, date, pick.memory.id, state.skip); }, [pick?.memory.id]);

  if (loading || !state) return <div className="h-40 rounded-3xl bg-white/5 animate-pulse" />;

  if (!pick) {
    return (
      <div className="rounded-3xl p-6 bg-[#f7f0e1] text-[#3e3326] border border-[#e2d4b6] flex flex-col sm:flex-row items-center gap-4">
        <Sprout className="w-10 h-10 text-[#6b7a4f] shrink-0" />
        <div className="flex-1 text-center sm:text-left">
          <p className="font-serif text-xl">Your garden is waiting for its first memory.</p>
          <p className="text-sm text-[#7a6a55]">Once you save a shared moment, a little piece of your story will greet you here each day.</p>
        </div>
        <button onClick={() => onOpenGarden()} className="px-4 py-2 rounded-full bg-[#6b7a4f] text-white text-sm">Open the Memory Garden</button>
      </div>
    );
  }

  const m: Memory = pick.memory;
  const fav = m.favouritedBy.includes(uid);
  return (
    <div className="rounded-3xl overflow-hidden bg-[#f7f0e1] text-[#3e3326] border border-[#e2d4b6] shadow-[0_10px_40px_rgba(0,0,0,0.25)] grid sm:grid-cols-[220px_1fr]">
      <button onClick={() => onOpenGarden(m.id)} className="relative bg-[#ece2cc] aspect-[16/10] sm:aspect-auto block w-full" aria-label={`Relive ${m.title}`}>
        {m.thumbnail ? <img src={m.thumbnail} alt="" className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center p-5 font-serif italic text-[#6d5a43] text-sm">{(m.caption || m.title).slice(0, 160)}</div>}
      </button>
      <div className="p-4 sm:p-5 space-y-1.5 sm:space-y-2">
        <p className="text-[11px] uppercase tracking-[0.22em] text-[#8a7a5c]">{DAILY_LABELS[pick.category]}</p>
        <h3 className="font-serif text-xl sm:text-2xl leading-tight line-clamp-2">{m.title}</h3>
        <p className="text-xs text-[#8a7a5c]">{formatMemoryDate(m)} · {m.provenance?.label ?? SOURCE_LABEL[m.source]}</p>
        {m.caption && m.thumbnail && <p className="font-serif text-sm text-[#54473a] line-clamp-2">{m.caption}</p>}
        <div className="flex flex-wrap gap-2 pt-2">
          <button onClick={() => onOpenGarden(m.id)} className="px-3 py-1.5 rounded-full flex-1 sm:flex-none justify-center bg-[#6b7a4f] text-white text-xs flex items-center gap-1"><Eye className="w-3.5 h-3.5" /> Relive it</button>
          <button onClick={() => toggleFavourite(m, uid).catch(() => {})} className={`px-3 py-1.5 rounded-full flex-1 sm:flex-none justify-center text-xs flex items-center gap-1 border ${fav ? "bg-[#c98b8b] text-white border-[#c98b8b]" : "bg-white/70 border-[#e2d4b6]"}`}><Heart className={`w-3.5 h-3.5 ${fav ? "fill-white" : ""}`} /> Favourite</button>
          <button onClick={() => setState((s) => (s ? { ...s, skip: s.skip + 1 } : s))} className="px-3 py-1.5 rounded-full flex-1 sm:flex-none justify-center bg-white/70 border border-[#e2d4b6] text-xs flex items-center gap-1"><Shuffle className="w-3.5 h-3.5" /> Another</button>
        </div>
      </div>
    </div>
  );
}
