import { motion, AnimatePresence } from "motion/react";
import { X, Heart, Star, Sparkles } from "lucide-react";
import ReactMarkdown from "react-markdown";
import { format } from "date-fns";
import GlassPanel from "./GlassPanel";
import { doc, updateDoc } from "firebase/firestore";
import { db } from "../lib/firebase";
import { cn } from "../lib/utils";
import { useState, useEffect } from "react";

interface Letter {
  id: string;
  title: string;
  content: string;
  publishDate: any;
  isFavorite: boolean;
  isRead?: boolean;
}

const BRIDGE_SECRET = "cupid-forever-bridge-2024";

export default function LetterReader({ letter, onClose }: { letter: Letter; onClose: () => void }) {
  const [isFavorite, setIsFavorite] = useState(letter.isFavorite);
  const date = letter.publishDate?.toDate ? letter.publishDate.toDate() : new Date();
  const isPersistedLetter = letter.id !== "preview" && !letter.id.startsWith("vault-");

  useEffect(() => {
    // Audio logic
    const audio = new Audio("/audio/ambient-loop.mp3");
    audio.loop = true;
    audio.volume = 0;
    
    const playAudio = async () => {
      try {
        await audio.play();
        // Fade in
        let vol = 0;
        const fadeInterval = setInterval(() => {
          vol += 0.01;
          if (vol >= 0.3) {
            audio.volume = 0.3;
            clearInterval(fadeInterval);
          } else {
            audio.volume = vol;
          }
        }, 100);
      } catch (e) {
        console.warn("Audio autoplay blocked or file missing:", e);
      }
    };

    playAudio();

    // Mark as read when opened
    const markAsRead = async () => {
      if (!isPersistedLetter) return;
      try {
        await updateDoc(doc(db, "letters", letter.id), { isRead: true });
      } catch (e) {
        console.error("Error marking as read:", e);
      }
    };
    markAsRead();

    // Haptic feedback
    if ("vibrate" in navigator) {
      setTimeout(() => {
        navigator.vibrate([30, 50, 30]);
      }, 500);
    }

    return () => {
      // Fade out and cleanup
      let vol = audio.volume;
      const fadeOutInterval = setInterval(() => {
        vol -= 0.05;
        if (vol <= 0) {
          audio.pause();
          clearInterval(fadeOutInterval);
        } else {
          audio.volume = vol;
        }
      }, 50);
    };
  }, [letter.id, isPersistedLetter]);

  const toggleFavorite = async () => {
    try {
      const newFav = !isFavorite;
      setIsFavorite(newFav);
      if (isPersistedLetter) {
        await updateDoc(doc(db, "letters", letter.id), { isFavorite: newFav });
      }

      if (newFav && isPersistedLetter) {
        // Push to Forever Book Bridge
        await fetch("/api/bridge/favorite", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-Bridge-Secret": BRIDGE_SECRET
          },
          body: JSON.stringify({
            letterId: letter.id,
            title: letter.title,
            content: letter.content,
            date: date.toISOString()
          })
        });
      }
    } catch (e) {
      console.error("Bridge Error:", e);
    }
  };

  // Splitting content for staggered typing effect
  const paragraphs = letter.content.split('\n\n').filter(Boolean);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 md:p-12 bg-black/60 backdrop-blur-sm"
    >
      <GlassPanel className="w-full max-w-3xl h-[85vh] flex flex-col p-0 overflow-hidden shadow-[0_0_50px_rgba(244,63,94,0.1)]">
        {/* Header */}
        <div className="p-8 md:px-12 flex justify-between items-center border-b border-white/5 bg-white/5">
          <div className="flex items-center gap-4">
            <button 
              onClick={onClose}
              className="p-2 -ml-2 rounded-full hover:bg-white/10 transition-colors text-white/40 hover:text-white"
            >
              <X className="w-6 h-6" />
            </button>
            <div className="space-y-1">
              <p className="text-[10px] uppercase tracking-[0.2em] text-pink-400 font-bold">
                 Daily Aurora • {format(date, "MMMM do, yyyy")}
              </p>
              <h2 className="text-2xl font-light italic font-serif text-white">{letter.title}</h2>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <button 
              onClick={toggleFavorite}
              className={cn(
                "p-3 border border-white/10 rounded-xl transition-all",
                isFavorite ? "bg-pink-500/10 text-pink-500" : "bg-white/5 text-white/40 hover:text-white"
              )}
            >
              <Star className={cn("w-5 h-5", isFavorite && "fill-pink-500")} />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-10 md:p-20 custom-scrollbar relative">
          <div className="absolute top-0 right-0 p-12 text-white/5 pointer-events-none">
             <Heart size={120} fill="currentColor" />
          </div>
          
          <div className="max-w-xl mx-auto relative z-10">
            <motion.h1 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 1 }}
              className="text-4xl font-light italic font-serif text-white mb-10 decoration-pink-500/30 underline underline-offset-8"
            >
               To my dearest Razia,
            </motion.h1>

            <div className="markdown-body">
              {paragraphs.map((para, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ 
                    duration: 1, 
                    delay: 0.5 + i * 0.4,
                    ease: "easeOut"
                  }}
                >
                  <ReactMarkdown>{para}</ReactMarkdown>
                </motion.div>
              ))}
            </div>

            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.5 + paragraphs.length * 0.4 + 0.5 }}
              className="mt-20 pt-12 border-t border-white/5 flex items-center justify-between"
            >
               <div className="space-y-1 text-white/40">
                  <p className="font-serif italic text-xl text-pink-500/70">Always yours,</p>
                  <p className="text-sm font-medium tracking-widest uppercase">Your Tinkerer</p>
               </div>
               <button 
                 onClick={toggleFavorite}
                 className="px-6 py-3 bg-white text-black text-xs font-bold uppercase tracking-widest rounded-full hover:bg-pink-100 transition-all shadow-xl"
               >
                 {isFavorite ? "In Forever Book" : "Save to Forever Book"}
               </button>
            </motion.div>
          </div>
        </div>
      </GlassPanel>
    </motion.div>
  );
}


// Remove local cn
