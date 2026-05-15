import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Sparkles, Send, Calendar, Clock, Eye, Edit3, Settings, BrainCircuit, CheckCircle, AlertCircle } from "lucide-react";
import GlassPanel from "./GlassPanel";
import LetterReader from "./LetterReader";
import { db, handleFirestoreError, OperationType } from "../lib/firebase";
import { collection, addDoc, Timestamp, query, orderBy, limit, onSnapshot, getDocs, where } from "firebase/firestore";
import { format } from "date-fns";
import { cn } from "../lib/utils";
import { generateOllamaDraft } from "../lib/ollama";

export default function AdminEditor({ userId }: { userId: string }) {
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [publishDate, setPublishDate] = useState(format(new Date(), "yyyy-MM-dd'T'HH:mm"));
  const [loading, setLoading] = useState(false);
  const [aiLocal, setAiLocal] = useState(false);
  const [aiOptimizing, setAiOptimizing] = useState(false);
  const [aiProofreading, setAiProofreading] = useState(false);
  const [scheduledLetters, setScheduledLetters] = useState<any[]>([]);

  useEffect(() => {
    const q = query(collection(db, "letters"), orderBy("publishDate", "desc"), limit(5));
    return onSnapshot(q, (snap) => {
      setScheduledLetters(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });
  }, []);

  const handlePublish = async () => {
    if (!title || !content) return;
    setLoading(true);
    try {
      await addDoc(collection(db, "letters"), {
        title,
        content,
        publishDate: Timestamp.fromDate(new Date(publishDate)),
        isPublished: true,
        isFavorite: false,
        isRead: false,
        authorId: userId,
        createdAt: Timestamp.now(),
      });

      // Trigger Notification for Razia
      const raziaQuery = query(collection(db, "users"), where("role", "==", "reader"), limit(1));
      const raziaSnap = await getDocs(raziaQuery);
      if (!raziaSnap.empty) {
        const raziaId = raziaSnap.docs[0].id;
        await addDoc(collection(db, "notifications"), {
          userId: raziaId,
          title: "A new aurora is glowing.",
          body: "Your daily letter is waiting.",
          read: false,
          createdAt: Timestamp.now()
        });
      }

      setTitle("");
      setContent("");
      alert("Letter successfully transmitted to aurora.");
    } catch (e) {
      handleFirestoreError(e, OperationType.WRITE, "letters");
    } finally {
      setLoading(false);
    }
  };

  const handleAIRefine = async () => {
    if (!content) return;
    setAiOptimizing(true);
    try {
      if (!aiLocal) {
        alert("Cloud AI not connected. Please toggle Local AI (Ollama) to refine scripts.");
        return;
      }
      const prompt = `You are an AI assistant helping a poet and engineer write a personal letter to his fiancée, Razia. 
      The tone should be cinematic, intimate, and sincere. 
      Refine the following draft while keeping its core emotional message:
      
      ${content}`;
      const refined = await generateOllamaDraft(prompt);
      setContent(refined);
    } catch (e) {
      alert("AI Refinement failed. Is Ollama running locally at port 11434?");
    } finally {
      setAiOptimizing(false);
    }
  };

  const handleProofread = async () => {
    if (!content) return;
    setAiProofreading(true);
    try {
      if (!aiLocal) {
        alert("Cloud AI not connected. Please toggle Local AI (Ollama) for proofreading.");
        return;
      }
      const prompt = `You are an expert copyeditor. Fix all spelling and grammatical errors in the following text. Do NOT change the meaning, tone, or emotional resonance of the letter. Output ONLY the corrected text.
      
      Text:
      ${content}`;
      const corrected = await generateOllamaDraft(prompt);
      setContent(corrected);
    } catch (e) {
      alert("Proofreading failed. Is Ollama running locally at port 11434?");
    } finally {
      setAiProofreading(false);
    }
  };

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-end">
        <div className="space-y-1">
          <p className="text-xs uppercase tracking-[0.4em] text-pink-500 font-bold">Cupid Command</p>
          <h2 className="text-3xl font-light italic font-serif text-white">The Writer's Studio</h2>
        </div>
        
        <div className="flex items-center gap-4 bg-white/5 border border-white/10 p-1.5 rounded-2xl">
           <button 
             onClick={() => setAiLocal(!aiLocal)}
             className={cn(
               "flex items-center gap-2 px-4 py-2 rounded-xl text-[10px] font-bold uppercase tracking-widest transition-all",
               aiLocal ? "bg-emerald-500 text-white shadow-lg" : "text-white/40 hover:text-white"
             )}
           >
             <BrainCircuit size={14} />
             Local AI {aiLocal ? "ON" : "OFF"}
           </button>
        </div>
      </div>

      <div className="flex flex-col xl:flex-row gap-6 h-[70vh]">
        {/* Editor Pane */}
        <GlassPanel className="flex-1 flex flex-col overflow-hidden p-0">
           <div className="p-4 border-b border-white/5 flex items-center justify-between bg-white/3">
             <div className="flex items-center gap-3">
               <Edit3 size={16} className="text-white/40" />
               <span className="text-xs font-bold uppercase tracking-widest text-white/60">Script Draft</span>
             </div>
             <div className="flex items-center gap-3">
                <input 
                  type="datetime-local" 
                  value={publishDate}
                  onChange={(e) => setPublishDate(e.target.value)}
                  className="bg-transparent text-[10px] text-white/40 border border-white/10 rounded-lg px-3 py-1.5 focus:outline-none focus:border-pink-500/50"
                />
                <button 
                  onClick={handleAIRefine}
                  disabled={aiOptimizing || aiProofreading}
                  className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-pink-500/10 text-pink-400 border border-pink-500/20 text-[10px] font-bold uppercase tracking-widest hover:bg-pink-500/20 transition-all disabled:opacity-50"
                >
                  <Sparkles size={12} className={aiOptimizing ? "animate-spin" : ""} />
                  Refine
                </button>
                <button 
                  onClick={handleProofread}
                  disabled={aiOptimizing || aiProofreading}
                  className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[10px] font-bold uppercase tracking-widest hover:bg-emerald-500/20 transition-all disabled:opacity-50"
                >
                  <CheckCircle size={12} className={aiProofreading ? "animate-pulse" : ""} />
                  Proofread
                </button>
             </div>
           </div>
           
           <div className="flex-1 flex flex-col p-8 space-y-6 overflow-y-auto custom-scrollbar">
              <input 
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Letter Title..."
                className="bg-transparent text-4xl font-serif italic font-light text-white placeholder:text-white/10 border-none focus:ring-0 p-0"
              />
              <textarea 
                value={content}
                onChange={(e) => setContent(e.target.value)}
                spellCheck={true}
                placeholder="Write your heart out, Mohammed..."
                className={cn(
                  "flex-1 bg-transparent text-lg text-white/70 placeholder:text-white/10 border-none focus:ring-0 p-0 resize-none font-sans leading-relaxed transition-all",
                  (aiOptimizing || aiProofreading) && "opacity-50 scale-[0.99] blur-[1px] cursor-wait"
                )}
              />
           </div>

           <div className="p-6 border-t border-white/5 bg-white/3">
              <button 
                onClick={handlePublish}
                disabled={loading || !title || !content}
                className="w-full flex items-center justify-center gap-3 py-4 bg-white text-black rounded-2xl text-xs font-bold uppercase tracking-[0.2em] hover:bg-white/90 transition-all shadow-[0_0_20px_rgba(255,255,255,0.2)] disabled:opacity-50 disabled:cursor-not-allowed group"
              >
                <div className="group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform">
                  <Send size={16} />
                </div>
                Transmit to Aurora
              </button>
           </div>
        </GlassPanel>

        {/* Preview Pane */}
        <div className="hidden xl:flex flex-[0.8] flex-col gap-6">
           <GlassPanel className="flex-1 overflow-hidden p-0 relative">
              <div className="absolute top-4 left-4 z-20 flex items-center gap-2 bg-black/40 backdrop-blur-md border border-white/10 px-3 py-1.5 rounded-full">
                 <Eye size={12} className="text-white/40" />
                 <span className="text-[10px] font-bold uppercase tracking-widest text-white/60">Razia's View</span>
              </div>
              <div className="h-full scale-[0.9] origin-center">
                 <LetterReader 
                   letter={{ 
                     id: "preview", 
                     title: title || "Sample Title", 
                     content: content || "The content of your letter will appear here exactly as she will see it...", 
                     publishDate: Timestamp.now(),
                     isFavorite: false
                   }} 
                   onClose={() => {}} 
                 />
              </div>
           </GlassPanel>
        </div>
      </div>

      {/* Timeline */}
      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <Clock size={16} className="text-white/40" />
          <h3 className="text-xs font-bold uppercase tracking-[0.2em] text-white/40">Upcoming Aurora Events</h3>
        </div>
        <div className="flex gap-4 overflow-x-auto pb-4 custom-scrollbar">
           {scheduledLetters.map((l) => (
             <motion.div 
               key={l.id}
               whileHover={{ y: -5 }}
               className="min-w-[280px] p-6 bg-white/5 border border-white/10 rounded-2xl space-y-4"
             >
                <div className="flex justify-between items-center">
                  <div className="text-[10px] font-bold uppercase tracking-widest text-white/20">
                    {format(l.publishDate.toDate(), 'MMMM d, h:mm a')}
                  </div>
                  {l.isRead ? <CheckCircle size={12} className="text-emerald-400" /> : <AlertCircle size={12} className="text-white/10" />}
                </div>
                <h4 className="text-lg font-serif italic text-white/80 line-clamp-1">{l.title}</h4>
                <p className="text-xs text-white/40 line-clamp-2 leading-relaxed">{l.content}</p>
             </motion.div>
           ))}
        </div>
      </div>
    </div>
  );
}
