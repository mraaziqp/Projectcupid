import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Plus, Link as LinkIcon, FileText, Camera, Send, Trash2, Heart } from "lucide-react";
import GlassPanel from "./GlassPanel";
import { db, handleFirestoreError, OperationType } from "../lib/firebase";
import { collection, query, orderBy, limit, onSnapshot, addDoc, Timestamp, deleteDoc, doc } from "firebase/firestore";
import { format } from "date-fns";
import { cn } from "../lib/utils";
import { notifyPartner } from "../lib/notifications";

interface Drop {
  id: string;
  userId: string;
  type: "note" | "link" | "media";
  content: string;
  category: string;
  createdAt: any;
}

const CATEGORIES = ["Next Date Idea", "Future Home Stuff", "Random Memories", "Inspiration"];

export default function UsDrop({ userId }: { userId: string }) {
  const [drops, setDrops] = useState<Drop[]>([]);
  const [content, setContent] = useState("");
  const [type, setType] = useState<Drop["type"]>("note");
  const [category, setCategory] = useState(CATEGORIES[0]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const q = query(collection(db, "us_drops"), orderBy("createdAt", "desc"), limit(20));
    return onSnapshot(q, (snapshot) => {
      setDrops(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Drop)));
      setLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, "us_drops");
    });
  }, []);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim()) return;

    try {
      await addDoc(collection(db, "us_drops"), {
        userId,
        type,
        content,
        category,
        createdAt: Timestamp.now()
      });

      const preview = content.substring(0, 60) + (content.length > 60 ? "..." : "");
      notifyPartner(userId, "New Memory Drop 💫", `${category}: ${preview}`).catch((err) => {
        console.error("Failed to notify partner of new drop:", err);
      });

      setContent("");
    } catch (e) {
      handleFirestoreError(e, OperationType.WRITE, "us_drops");
    }
  };

  const deleteDrop = async (id: string) => {
    try {
      await deleteDoc(doc(db, "us_drops", id));
    } catch (e) {
      handleFirestoreError(e, OperationType.DELETE, "us_drops");
    }
  };

  return (
    <div className="space-y-8">
      <div className="space-y-1">
        <p className="text-xs uppercase tracking-[0.4em] text-pink-500 font-bold">Collaborative Board</p>
        <h2 className="text-3xl font-light italic font-serif text-white">The "Us" Drop</h2>
      </div>

      <GlassPanel className="p-6">
        <form onSubmit={handleAdd} className="space-y-4">
           <div className="flex flex-wrap gap-2">
             {CATEGORIES.map(cat => (
               <button
                 key={cat}
                 type="button"
                 onClick={() => setCategory(cat)}
                 className={cn(
                   "px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest transition-all",
                   category === cat ? "bg-pink-500 text-white" : "bg-white/5 text-white/40 hover:bg-white/10"
                 )}
               >
                 {cat}
               </button>
             ))}
           </div>
           
           <div className="relative">
              <textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder={type === 'link' ? "Paste a link..." : "Drop a note or inspiration..."}
                className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 text-white placeholder:text-white/20 focus:outline-none focus:border-pink-500/50 min-h-[100px] resize-none"
              />
              <div className="absolute bottom-4 right-4 flex items-center gap-2">
                 <button 
                   type="button"
                   onClick={() => setType('note')}
                   className={cn("p-2 rounded-lg transition-all", type === 'note' ? "bg-white/10 text-white" : "text-white/20 hover:text-white/40")}
                 >
                   <FileText size={16} />
                 </button>
                 <button 
                   type="button"
                   onClick={() => setType('link')}
                   className={cn("p-2 rounded-lg transition-all", type === 'link' ? "bg-white/10 text-white" : "text-white/20 hover:text-white/40")}
                 >
                   <LinkIcon size={16} />
                 </button>
                 <button 
                   type="submit"
                   className="p-2 bg-pink-500 text-white rounded-lg hover:bg-pink-600 transition-all shadow-[0_0_15px_rgba(236,72,153,0.3)]"
                 >
                   <Send size={16} />
                 </button>
              </div>
           </div>
        </form>
      </GlassPanel>

      {loading && (
        <GlassPanel className="p-6 text-center text-white/40">
          Loading shared drops...
        </GlassPanel>
      )}

      {!loading && drops.length === 0 && (
        <GlassPanel className="p-6 text-center text-white/40">
          No drops yet. Start with a date idea, memory, or a sweet note.
        </GlassPanel>
      )}

      <div className="columns-1 md:columns-2 lg:columns-3 gap-6 space-y-6">
        <AnimatePresence mode="popLayout">
          {drops.map((drop, i) => (
            <motion.div
              layout
              key={drop.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="break-inside-avoid"
            >
              <GlassPanel className="p-6 space-y-4 hover:border-white/20 transition-all group overflow-hidden">
                <div className="flex justify-between items-start">
                   <div className="bg-white/5 px-2 py-1 rounded text-[8px] font-bold uppercase tracking-widest text-white/40">
                     {drop.category}
                   </div>
                   <button 
                     onClick={() => deleteDrop(drop.id)}
                     className="opacity-0 group-hover:opacity-100 p-1 text-white/20 hover:text-rose-500 transition-all"
                   >
                     <Trash2 size={12} />
                   </button>
                </div>

                <div className="space-y-2">
                   {drop.type === 'link' ? (
                     <a 
                       href={drop.content.startsWith('http') ? drop.content : `https://${drop.content}`} 
                       target="_blank" 
                       rel="noopener noreferrer"
                       className="text-pink-400 hover:underline flex items-center gap-2 break-all text-sm font-medium"
                     >
                       <LinkIcon size={14} className="shrink-0" />
                       {drop.content}
                     </a>
                   ) : (
                     <p className="text-sm text-white/80 leading-relaxed whitespace-pre-wrap">{drop.content}</p>
                   )}
                </div>

                <div className="flex items-center justify-between pt-4 border-t border-white/5">
                   <div className="flex items-center gap-2">
                      <div className={cn(
                        "w-6 h-6 rounded-full flex items-center justify-center text-[10px] text-white/60",
                        drop.userId === userId ? "bg-blue-500/20" : "bg-pink-500/20"
                      )}>
                         {drop.userId === userId ? "Me" : "R"}
                      </div>
                      <span className="text-[10px] text-white/20">
                        {drop.createdAt?.toDate ? format(drop.createdAt.toDate(), 'MMM d, h:mm a') : 'Just now'}
                      </span>
                   </div>
                   <Heart size={12} className="text-white/10 group-hover:text-pink-500/50 transition-colors" />
                </div>
              </GlassPanel>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </div>
  );
}
