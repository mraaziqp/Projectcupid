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
      <div onClick={onClick} className="p-8 space-y-6">
        <div className="flex justify-between items-start">
          <div className="space-y-1">
            <p className="text-[10px] uppercase tracking-[0.2em] text-pink-400 font-bold">
              Daily Aurora • {format(date, "MMMM do, yyyy")}
            </p>
            <h3 className="text-3xl font-light italic font-serif text-white/90 leading-tight group-hover:text-pink-100 transition-colors">
              {letter.title}
            </h3>
          </div>
          {letter.isFavorite && (
            <Star className="w-5 h-5 text-pink-400 fill-pink-400/20" />
          )}
        </div>
        
        <div className="flex items-center gap-2 text-white/40 group-hover:text-white/80 transition-colors">
          <span className="text-xs font-bold uppercase tracking-widest">Open Letter</span>
          <ChevronRight className="w-4 h-4 translate-x-0 group-hover:translate-x-1 transition-transform" />
        </div>
      </div>
    </GlassPanel>
  );
}
