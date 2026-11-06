import React from "react";
import { motion } from "motion/react";
import { Sparkles } from "lucide-react";

interface AntiqueEnvelopeProps {
  isOpen: boolean;
  onOpen: () => void;
  disabled?: boolean;
  recipientName?: string;
}

export const AntiqueEnvelope: React.FC<AntiqueEnvelopeProps> = ({
  isOpen,
  onOpen,
  disabled = false,
  recipientName = "Love"
}) => {
  return (
    <div className="relative flex flex-col items-center justify-center select-none py-6">
      {/* Outer Glow Halo */}
      <div className="absolute w-80 h-64 bg-gradient-to-tr from-rose-500/20 via-amber-300/15 to-transparent rounded-full blur-3xl pointer-events-none animate-pulse" />

      {/* Envelope Container */}
      <motion.div
        animate={
          isOpen
            ? { scale: 1.02, y: 10 }
            : {
                y: [0, -8, 0],
                rotate: [0, 0.5, -0.5, 0],
                transition: { repeat: Infinity, duration: 4.5, ease: "easeInOut" }
              }
        }
        className="relative w-72 sm:w-84 md:w-96 cursor-pointer group"
        onClick={() => {
          if (!isOpen && !disabled) onOpen();
        }}
      >
        {/* Envelope Body with Vintage Floral Parchment Texture */}
        <div className="relative w-full aspect-[4/3] rounded-2xl bg-gradient-to-br from-[#faf4e8] via-[#f4ebd9] to-[#ebe0c8] shadow-[0_20px_50px_rgba(0,0,0,0.5),0_0_20px_rgba(223,194,152,0.3)] border border-[#dfc298] overflow-hidden">
          {/* Subtle Vintage Floral Watermark Elements */}
          <div className="absolute -top-6 -left-6 w-24 h-24 opacity-30 pointer-events-none">
            <svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M20,50 Q35,20 60,35 Q80,50 65,70 Q45,85 25,70 Z" fill="#e2a8b6" />
              <path d="M30,30 Q50,10 70,25 Q90,40 75,60" stroke="#c08081" strokeWidth="2" />
              <circle cx="50" cy="45" r="8" fill="#d9777f" />
            </svg>
          </div>
          <div className="absolute -bottom-6 -right-6 w-28 h-28 opacity-30 pointer-events-none rotate-180">
            <svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M20,50 Q35,20 60,35 Q80,50 65,70 Q45,85 25,70 Z" fill="#e2a8b6" />
              <path d="M30,30 Q50,10 70,25 Q90,40 75,60" stroke="#c08081" strokeWidth="2" />
              <circle cx="50" cy="45" r="8" fill="#d9777f" />
            </svg>
          </div>

          {/* Delicate Postage Stamp */}
          <div className="absolute top-4 right-4 w-12 h-14 border border-dashed border-rose-300/60 bg-[#fffdfa] rounded p-1 flex flex-col items-center justify-between shadow-sm">
            <div className="w-full text-center text-[7px] font-mono tracking-widest text-rose-800 uppercase">CUPID</div>
            <div className="text-base text-rose-500">♡</div>
            <div className="text-[6px] text-stone-500 font-mono">FOREVER</div>
          </div>

          {/* Calligraphic Handwriting Address */}
          <div className="absolute left-5 sm:left-6 bottom-3 sm:bottom-auto sm:top-12 sm:space-y-1 max-w-[75%] z-10">
            <div className="hidden sm:block text-[11px] font-serif italic text-stone-500 tracking-wider">A special delivery for:</div>
            <div className="text-lg sm:text-2xl leading-tight font-serif text-[#6b2a47] font-semibold tracking-wide drop-shadow-sm">
              My Dearest {recipientName}
            </div>
            <div className="hidden sm:block text-[9px] font-mono text-stone-400 tracking-widest uppercase">
              SANCTUARY OF LOVE • ROOM FOR TWO
            </div>
          </div>

          {/* Envelope Diagonal Fold Lines */}
          <svg className="absolute inset-0 w-full h-full pointer-events-none" xmlns="http://www.w3.org/2000/svg">
            <line x1="0" y1="100%" x2="50%" y2="55%" stroke="#dfc298" strokeWidth="1.5" strokeOpacity="0.7" />
            <line x1="100%" x2="50%" y2="55%" stroke="#dfc298" strokeWidth="1.5" strokeOpacity="0.7" />
            <line x1="0" y1="0" x2="50%" y2="55%" stroke="#dfc298" strokeWidth="1.5" strokeOpacity="0.4" />
            <line x1="100%" y1="0" x2="50%" y2="55%" stroke="#dfc298" strokeWidth="1.5" strokeOpacity="0.4" />
          </svg>

          {/* Animated Envelope Flap */}
          <motion.div
            initial={false}
            animate={
              isOpen
                ? { rotateX: 180, zIndex: 1, filter: "drop-shadow(0px -4px 8px rgba(0,0,0,0.15))" }
                : { rotateX: 0, zIndex: 15 }
            }
            transition={{ duration: 0.8, ease: "easeInOut" }}
            style={{ transformOrigin: "top" }}
            className="absolute top-0 left-0 right-0 h-1/2 overflow-hidden pointer-events-none"
          >
            <div
              className="w-full h-full bg-gradient-to-b from-[#f5ede0] to-[#ece1cc] border-b border-[#dfc298]"
              style={{
                clipPath: "polygon(0 0, 100% 0, 50% 100%)"
              }}
            />
          </motion.div>

          {/* Wax Seal Button (Center) */}
          <motion.div
            animate={
              isOpen
                ? { scale: 0, opacity: 0 }
                : { scale: 1, opacity: 1 }
            }
            whileHover={{ scale: 1.08 }}
            whileTap={{ scale: 0.95 }}
            className="absolute top-[52%] left-1/2 -translate-x-1/2 -translate-y-1/2 z-20 cursor-pointer"
          >
            {/* Wax Seal Circle */}
            <div className="relative w-16 h-16 rounded-full bg-gradient-to-br from-[#801b38] via-[#a62b4c] to-[#591024] shadow-[0_6px_20px_rgba(128,27,56,0.6),inset_0_2px_4px_rgba(255,255,255,0.4)] border-2 border-[#c74d6b] flex items-center justify-center group-hover:shadow-[0_0_25px_rgba(244,63,94,0.8)] transition-shadow">
              {/* Outer Scalloped Edge Ring */}
              <div className="absolute inset-1 rounded-full border border-dashed border-[#e6738f]/60 pointer-events-none" />
              
              {/* Wax Monogram / Stamp */}
              <div className="text-center font-serif text-[#ffd9e2] drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)]">
                <span className="text-xs tracking-tighter block font-bold leading-none">R&R</span>
                <span className="text-[7px] tracking-widest block uppercase text-[#fcd5df] -mt-0.5">FOREVER</span>
              </div>

              {/* Shimmer Sparkle */}
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ repeat: Infinity, duration: 8, ease: "linear" }}
                className="absolute -top-1 -right-1 text-amber-300 pointer-events-none"
              >
                <Sparkles className="w-4 h-4 fill-amber-300" />
              </motion.div>
            </div>
          </motion.div>
        </div>

        {/* Hover Cue */}
        {!isOpen && (
          <div className="mt-4 text-center">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-serif italic text-rose-200/90 bg-black/40 backdrop-blur-md border border-rose-400/30 group-hover:border-rose-400 group-hover:text-rose-100 transition shadow-lg">
              <Sparkles className="w-3 h-3 text-amber-300 animate-pulse" />
              <span>Tap the wax seal to open</span>
            </span>
          </div>
        )}
      </motion.div>
    </div>
  );
};
