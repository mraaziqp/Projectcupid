import { motion, AnimatePresence } from "motion/react";
import { X, Heart, Star } from "lucide-react";
import ReactMarkdown from "react-markdown";
import { format } from "date-fns";
import GlassPanel from "./GlassPanel";
import { doc, updateDoc, collection, query, where, onSnapshot, addDoc, Timestamp, orderBy } from "firebase/firestore";
import { db } from "../lib/firebase";
import { cn } from "../lib/utils";
import { useState, useEffect } from "react";
import { notifyPartner } from "../lib/notifications";

interface Letter {
  id: string;
  title: string;
  content: string;
  publishDate: any;
  isFavorite: boolean;
  isRead?: boolean;
  authorId?: string;
}

interface LetterReply {
  id: string;
  letterId: string;
  content: string;
  authorId: string;
  authorName?: string;
  createdAt?: any;
}

const BRIDGE_SECRET = "cupid-forever-bridge-2024";

export default function LetterReader({
  letter,
  onClose,
  currentUserId,
  currentUserName,
  canReply = false,
}: {
  letter: Letter;
  onClose: () => void;
  currentUserId?: string;
  currentUserName?: string;
  canReply?: boolean;
}) {
  const [isFavorite, setIsFavorite] = useState(letter.isFavorite);
  const [replies, setReplies] = useState<LetterReply[]>([]);
  const [replyText, setReplyText] = useState("");
  const [sendingReply, setSendingReply] = useState(false);
  const [replyState, setReplyState] = useState<{ type: "success" | "error"; message: string } | null>(null);
  const date = letter.publishDate?.toDate ? letter.publishDate.toDate() : new Date();
  const isPersistedLetter = letter.id !== "preview" && !letter.id.startsWith("vault-");
  const letterIsFromCurrentUser = Boolean(currentUserId && letter.authorId === currentUserId);
  const salutationLine = letterIsFromCurrentUser ? "A note from your heart," : "To my dearest Razia,";

  useEffect(() => {
    if (!isPersistedLetter) {
      setReplies([]);
      return;
    }

    const repliesQuery = query(
      collection(db, "letter_replies"),
      where("letterId", "==", letter.id),
      orderBy("createdAt", "asc")
    );

    return onSnapshot(repliesQuery, (snapshot) => {
      const docs = snapshot.docs.map((replyDoc) => ({
        id: replyDoc.id,
        ...(replyDoc.data() as Omit<LetterReply, "id">),
      }));

      setReplies(docs);
    });
  }, [letter.id, isPersistedLetter]);

  const sendReply = async () => {
    if (!isPersistedLetter || !currentUserId || !replyText.trim()) return;

    setSendingReply(true);
    setReplyState(null);
    try {
      await addDoc(collection(db, "letter_replies"), {
        letterId: letter.id,
        content: replyText.trim(),
        authorId: currentUserId,
        authorName: currentUserName || "Razia",
        createdAt: Timestamp.now(),
      });

      await notifyPartner(
        currentUserId,
        "Razia replied to your letter",
        `Reply on: ${letter.title}`
      );

      setReplyText("");
      setReplyState({ type: "success", message: "Reply sent." });
    } catch (error) {
      console.error("Error sending reply:", error);
      setReplyState({ type: "error", message: "Could not send reply right now." });
    } finally {
      setSendingReply(false);
    }
  };

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
                {salutationLine}
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

            {isPersistedLetter && (
              <div className="mt-8 space-y-4 border-t border-white/5 pt-8">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-bold uppercase tracking-widest text-white/40">Replies</h3>
                  <span className="text-[10px] uppercase tracking-widest text-white/20">{replies.length} messages</span>
                </div>

                <div className="space-y-3">
                  {replies.length === 0 && (
                    <p className="text-sm text-white/30">No replies yet.</p>
                  )}

                  <AnimatePresence>
                    {replies.map((reply) => {
                      const replyDate = reply.createdAt?.toDate ? reply.createdAt.toDate() : null;
                      const isMine = currentUserId && reply.authorId === currentUserId;
                      return (
                        <motion.div
                          key={reply.id}
                          initial={{ opacity: 0, y: 8 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -8 }}
                          className={cn(
                            "rounded-2xl border px-4 py-3",
                            isMine
                              ? "bg-pink-500/10 border-pink-500/20"
                              : "bg-white/5 border-white/10"
                          )}
                        >
                          <div className="flex items-center justify-between gap-4 mb-2">
                            <span className="text-[10px] uppercase tracking-widest text-white/40 font-bold">
                              {reply.authorName || "Razia"}
                            </span>
                            <span className="text-[10px] text-white/30">
                              {replyDate ? format(replyDate, "MMM d, h:mm a") : "Just now"}
                            </span>
                          </div>
                          <p className="text-sm text-white/80 leading-relaxed whitespace-pre-wrap">{reply.content}</p>
                        </motion.div>
                      );
                    })}
                  </AnimatePresence>
                </div>

                {canReply && currentUserId && (
                  <div className="space-y-3 pt-2">
                    <textarea
                      value={replyText}
                      onChange={(e) => setReplyText(e.target.value)}
                      onKeyDown={(e) => {
                        if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
                          e.preventDefault();
                          void sendReply();
                        }
                      }}
                      placeholder="Reply to this letter..."
                      rows={3}
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder:text-white/20 resize-none focus:outline-none focus:border-pink-500/40"
                    />
                    <button
                      onClick={sendReply}
                      disabled={sendingReply || !replyText.trim()}
                      className="px-5 py-2 rounded-xl bg-white text-black text-xs font-bold uppercase tracking-widest hover:bg-pink-100 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {sendingReply ? "Sending..." : "Send Reply"}
                    </button>
                    <p className="text-[11px] text-white/35">Tip: Press Ctrl/Cmd + Enter to send quickly.</p>
                    {replyState && (
                      <p className={cn("text-xs", replyState.type === "success" ? "text-emerald-300" : "text-rose-300")}>
                        {replyState.message}
                      </p>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </GlassPanel>
    </motion.div>
  );
}


// Remove local cn
