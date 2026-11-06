import { format } from "date-fns";
import { Heart, Star, ChevronRight } from "lucide-react";
import GlassPanel from "./GlassPanel";
import { cn } from "../lib/utils";

interface Letter {
  id: string;
  title: string;
  publishDate: any;
  isFavorite: boolean;
}

export default function LetterCard({ letter, onClick, index }: { letter: Letter; onClick: () => void; index: number }) {
  const date = letter.publishDate?.toDate ? letter.publishDate.toDate() : new Date();

  return (
    <GlassPanel
      delay={index * 0.1}
      className="group cursor-pointer hover:border-white/20 transition-all hover:-translate-y-1"
    >
      <div onClick={onClick} className="p-4 md:p-6 lg:p-8 space-y-4 md:space-y-6">
        <div className="flex justify-between items-start gap-3">
          <div className="space-y-1 flex-1 min-w-0">
            <p className="text-[9px] md:text-[10px] uppercase tracking-[0.2em] text-pink-400 font-bold">
              {format(date, "MMM do")}
            </p>
            <h3 className="text-lg md:text-2xl lg:text-3xl font-light italic font-serif text-white/90 leading-tight group-hover:text-pink-100 transition-colors break-words">
              {letter.title}
            </h3>
          </div>
          {letter.isFavorite && (
            <Star className="w-4 md:w-5 h-4 md:h-5 text-pink-400 fill-pink-400/20 flex-shrink-0" />
          )}
        </div>

        <div className="flex items-center gap-2 text-white/40 group-hover:text-white/80 transition-colors">
          <span className="text-[10px] md:text-xs font-bold uppercase tracking-widest">Open</span>
          <ChevronRight className="w-3 md:w-4 h-3 md:h-4 translate-x-0 group-hover:translate-x-1 transition-transform" />
        </div>
      </div>
    </GlassPanel>
  );
}
