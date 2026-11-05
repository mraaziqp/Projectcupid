import React from "react";
import { motion } from "motion/react";
import { Sparkles, Crown } from "lucide-react";

interface KeepsakeBoxProps {
  isOpen: boolean;
  onOpen: () => void;
  disabled?: boolean;
  specialTitle?: string;
}

export const KeepsakeBox: React.FC<KeepsakeBoxProps> = ({
  isOpen,
  onOpen,
  disabled = false,
  specialTitle = "A Special Occasion"
}) => {
  return (
    <div className="relative flex flex-col items-center justify-center select-none py-6">
      {/* Golden Aura / Ambient Halo */}
      <div className="absolute w-96 h-80 bg-gradient-to-tr from-amber-500/25 via-rose-500/20 to-purple-500/10 rounded-full blur-3xl pointer-events-none animate-pulse" />

      {/* Keepsake Box 3D Container */}
      <motion.div
        animate={
          isOpen
            ? { scale: 1.02, y: 15 }
            : {
                y: [0, -6, 0],
                transition: { repeat: Infinity, duration: 4, ease: "easeInOut" }
              }
        }
        className="relative w-80 sm:w-96 cursor-pointer group"
        onClick={() => {
          if (!isOpen && !disabled) onOpen();
        }}
      >
        {/* Special Occasion Banner Tag */}
        <div className="text-center mb-3">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-mono tracking-widest uppercase bg-gradient-to-r from-amber-500/20 to-rose-500/20 border border-amber-400/40 text-amber-200 shadow-lg">
            <Crown className="w-3 h-3 text-amber-300" />
            <span>{specialTitle}</span>
          </span>
        </div>

        {/* Outer Keepsake Box Body (Belle Époque Style) */}
        <div className="relative w-full aspect-[16/11] rounded-2xl bg-gradient-to-br from-[#7a2e48] via-[#541c30] to-[#360e1d] shadow-[0_25px_60px_rgba(0,0,0,0.7),0_0_30px_rgba(235,178,102,0.3)] border-2 border-[#d4af37] overflow-hidden">
          {/* Filigree Brass Corner Ornaments */}
          <div className="absolute top-2 left-2 w-8 h-8 border-t-2 border-l-2 border-[#e6ca65] rounded-tl pointer-events-none" />
          <div className="absolute top-2 right-2 w-8 h-8 border-t-2 border-r-2 border-[#e6ca65] rounded-tr pointer-events-none" />
          <div className="absolute bottom-2 left-2 w-8 h-8 border-b-2 border-l-2 border-[#e6ca65] rounded-bl pointer-events-none" />
          <div className="absolute bottom-2 right-2 w-8 h-8 border-b-2 border-r-2 border-[#e6ca65] rounded-br pointer-events-none" />

          {/* Ornate Oval Medallion on Lid */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-48 h-32 rounded-[50%] bg-gradient-to-br from-[#f2e2c4] via-[#dfc298] to-[#bfa075] border-2 border-[#ffd700] shadow-[inset_0_2px_8px_rgba(0,0,0,0.3),0_4px_15px_rgba(0,0,0,0.5)] flex flex-col items-center justify-center p-3 text-center">
            <div className="w-full h-full border border-dashed border-[#8c6b3e] rounded-[50%] flex flex-col items-center justify-center space-y-0.5">
              <span className="text-[9px] font-mono tracking-widest text-[#5c3a21] uppercase">BELLE ÉPOQUE</span>
              <span className="text-base font-serif italic font-bold text-[#451e2b]">Raaziq & Razia</span>
              <span className="text-[8px] font-serif text-[#785436] tracking-wider">Treasured Forever</span>
            </div>
          </div>

          {/* Hinged Box Lid (Upper Portion 3D Tilt) */}
          <motion.div
            initial={false}
            animate={
              isOpen
                ? { rotateX: -110, y: -20, opacity: 0.15 }
                : { rotateX: 0, y: 0, opacity: 1 }
            }
            transition={{ duration: 0.9, ease: "easeInOut" }}
            style={{ transformOrigin: "top" }}
            className="absolute inset-0 bg-gradient-to-b from-[#6b233a] to-[#401222] pointer-events-none border-b-2 border-[#d4af37]"
          >
            {/* Soft Floral Rosette Stamped Patterns */}
            <div className="absolute top-3 left-4 text-xs text-rose-300/40">🌸</div>
            <div className="absolute top-3 right-4 text-xs text-rose-300/40">🌸</div>
          </motion.div>

          {/* Ornate Golden Clasp / Lock in Front */}
          <motion.div
            animate={
              isOpen
                ? { scale: 0, opacity: 0 }
                : { scale: 1, opacity: 1 }
            }
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.95 }}
            className="absolute bottom-4 left-1/2 -translate-x-1/2 z-20"
          >
            <div className="w-12 h-14 bg-gradient-to-b from-[#ffd700] via-[#d4af37] to-[#aa820a] rounded-lg border border-[#fff2a3] shadow-[0_4px_12px_rgba(0,0,0,0.5)] flex flex-col items-center justify-center gap-1 group-hover:shadow-[0_0_20px_rgba(255,215,0,0.8)] transition">
              <div className="w-3 h-3 rounded-full bg-red-950 border border-amber-300 shadow-inner flex items-center justify-center">
                <div className="w-1 h-1 rounded-full bg-red-500 animate-ping" />
              </div>
              <div className="w-4 h-1.5 bg-amber-950 rounded-full" />
            </div>
          </motion.div>
        </div>

        {/* Hover Hint */}
        {!isOpen && (
          <div className="mt-4 text-center">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-serif italic text-amber-200/90 bg-black/40 backdrop-blur-md border border-amber-400/30 group-hover:border-amber-400 group-hover:text-amber-100 transition shadow-lg">
              <Sparkles className="w-3 h-3 text-amber-300 animate-pulse" />
              <span>Tap the golden clasp to unlock</span>
            </span>
          </div>
        )}
      </motion.div>
    </div>
  );
};
