import { Heart, Lock, Mic, Video, Mail, BookOpen, FileText, Star } from "lucide-react";
import type { Memory } from "../../lib/memoryGarden/model";

export const SOURCE_LABEL: Record<string, string> = {
  cupid: "Cupid", savestate: "SaveState", weddingapp: "WeddingApp", memory_book: "Memory Book", letters: "Letters", timeline: "Our Story", us_drops: "Memory Drops", jarvis: "Jarvis",
};

export function formatMemoryDate(m: Pick<Memory, "memoryDate" | "datePrecision">) {
  const d = new Date(`${m.memoryDate}T12:00:00`);
  if (Number.isNaN(d.getTime())) return m.memoryDate;
  if (m.datePrecision === "year") return String(d.getFullYear());
  if (m.datePrecision === "month") return d.toLocaleDateString(undefined, { month: "long", year: "numeric" });
  return d.toLocaleDateString(undefined, { day: "numeric", month: "long", year: "numeric" });
}

const TYPE_ICON: Record<string, any> = { video: Video, voice: Mic, letter: Mail, booklet: BookOpen, text: FileText };

/** A polaroid. The thumbnail is stored on the memory, so the garden never downloads full images to draw a grid. */
export default function MemoryCard({ memory, uid, onOpen, tilt = 0 }: { memory: Memory; uid: string; onOpen: () => void; tilt?: number }) {
  const Icon = TYPE_ICON[memory.mediaType];
  const fav = memory.favouritedBy.includes(uid);
  return (
    <button
      onClick={onOpen}
      style={{ transform: `rotate(${tilt}deg)` }}
      className="group text-left bg-[#fbf6ea] p-2.5 pb-4 rounded-[3px] shadow-[0_6px_18px_rgba(0,0,0,0.35)] hover:shadow-[0_10px_28px_rgba(0,0,0,0.45)] hover:-translate-y-1 hover:rotate-0 transition-all duration-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#c9a46a] w-full"
      aria-label={`Open memory: ${memory.title}`}
    >
      <div className="relative aspect-[4/5] bg-[#ece2cc] overflow-hidden rounded-[2px]">
        {memory.thumbnail ? (
          <img src={memory.thumbnail} alt="" loading="lazy" className="w-full h-full object-cover sepia-[.08] group-hover:scale-[1.03] transition-transform duration-500" />
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center p-4 text-center bg-[radial-gradient(circle_at_30%_20%,#f6eedc,#e6d8b9)]">
            {Icon ? <Icon className="w-7 h-7 text-[#8a6f4e] mb-2" /> : <Heart className="w-7 h-7 text-[#b77a7a] mb-2" />}
            <p className="font-serif italic text-[13px] text-[#6d5a43] line-clamp-5">{memory.caption || memory.title}</p>
          </div>
        )}
        <div className="absolute top-1.5 right-1.5 flex gap-1">
          {memory.visibility === "private" && <span className="p-1 rounded-full bg-black/50 text-white" title="Private to you"><Lock className="w-3 h-3" /></span>}
          {memory.isSpecialOccasion && <span className="p-1 rounded-full bg-[#b8955a]/90 text-white" title="Special occasion"><Star className="w-3 h-3" /></span>}
          {fav && <span className="p-1 rounded-full bg-[#c98b8b]/90 text-white" title="Favourite"><Heart className="w-3 h-3 fill-white" /></span>}
        </div>
        {Icon && memory.thumbnail && <span className="absolute bottom-1.5 left-1.5 p-1 rounded-full bg-black/45 text-white"><Icon className="w-3 h-3" /></span>}
      </div>
      <div className="px-1 pt-2.5 space-y-0.5">
        <h4 className="font-serif text-[15px] leading-snug text-[#3e3326] line-clamp-1">{memory.title}</h4>
        <div className="flex items-center justify-between text-[10.5px] text-[#8b7a62]">
          <span>{formatMemoryDate(memory)}</span>
          <span className="uppercase tracking-wider">{SOURCE_LABEL[memory.source] ?? memory.source}</span>
        </div>
      </div>
    </button>
  );
}
