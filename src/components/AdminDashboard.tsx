import { useState, useEffect } from "react";
import { collection, addDoc, query, orderBy, onSnapshot, Timestamp } from "firebase/firestore";
import { db, handleFirestoreError, OperationType } from "../lib/firebase";
import { Sparkles, Send, Calendar, List, Plus, Activity } from "lucide-react";
import GlassPanel from "./GlassPanel";
import LunarCycle from "./LunarCycle";
import EmotionalWeather from "./EmotionalWeather";
import UsDrop from "./UsDrop";
import { format } from "date-fns";
import { User } from "firebase/auth";
import { UserProfile } from "../hooks/useAuth";
import AdminEditor from "./AdminEditor";

import { cn } from "../lib/utils";

export default function AdminDashboard({ user, profile }: { user: User; profile: UserProfile | null }) {
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [publishDate, setPublishDate] = useState(format(new Date(), "yyyy-MM-dd'T'HH:mm"));
  const [isGenerating, setIsGenerating] = useState(false);
  const [history, setHistory] = useState<any[]>([]);
  const [view, setView] = useState<'write' | 'list' | 'radar'>('write');

  useEffect(() => {
    const q = query(collection(db, "letters"), orderBy("createdAt", "desc"));
    return onSnapshot(q, (snapshot) => {
      setHistory(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, "letters (admin)");
    });
  }, []);

  const handleGenerate = async () => {
    if (!title) return alert("Please enter a title for focus");
    setIsGenerating(true);
    try {
      const res = await fetch("/api/cupid/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: `Write a letter titled: ${title}. ${content ? 'Start with this draft: ' + content : ''}` }),
      });
      const data = await res.json();
      setContent(data.letter);
    } catch (e) {
      console.error(e);
    } finally {
      setIsGenerating(false);
    }
  };

  const handlePublish = async () => {
    if (!title || !content) return;
    try {
      await addDoc(collection(db, "letters"), {
        title,
        content,
        publishDate: Timestamp.fromDate(new Date(publishDate)),
        isPublished: true,
        isFavorite: false,
        createdAt: Timestamp.now(),
        authorId: "backupe9@gmail.com", // Static for now, or match auth.currentUser.uid
      });
      setTitle("");
      setContent("");
      alert("Letter Published!");
      setView('list');
    } catch (e) {
      handleFirestoreError(e, OperationType.WRITE, "letters");
    }
  };

  return (
    <div className="max-w-5xl mx-auto px-6 pb-32 space-y-8">
      <div className="flex justify-between items-end">
        <div className="space-y-1">
          <p className="text-[10px] uppercase tracking-[0.3em] text-pink-500 font-bold">Curator Workspace</p>
          <h1 className="text-4xl font-light italic font-serif text-white">Cupid Command</h1>
        </div>
        <div className="flex bg-white/5 p-1 rounded-2xl border border-white/10 backdrop-blur-xl">
           <button onClick={() => setView('write')} className={cn("px-6 py-3 rounded-xl text-xs font-bold uppercase tracking-widest flex items-center gap-2 transition-all", view === 'write' ? "bg-white text-black shadow-xl" : "text-white/40 hover:text-white")}>
              <Plus className="w-4 h-4" /> Write
           </button>
           <button onClick={() => setView('list')} className={cn("px-6 py-3 rounded-xl text-xs font-bold uppercase tracking-widest flex items-center gap-2 transition-all", view === 'list' ? "bg-white text-black shadow-xl" : "text-white/40 hover:text-white")}>
              <List className="w-4 h-4" /> History
           </button>
           <button onClick={() => setView('radar')} className={cn("px-6 py-3 rounded-xl text-xs font-bold uppercase tracking-widest flex items-center gap-2 transition-all", view === 'radar' ? "bg-white text-black shadow-xl" : "text-white/40 hover:text-white")}>
              <Activity className="w-4 h-4" /> Radar
           </button>
        </div>
      </div>

      {view === 'write' ? (
        <AdminEditor userId={user.uid} />
      ) : view === 'list' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {history.map(item => (
            <GlassPanel key={item.id} className="p-6 flex justify-between items-center group cursor-pointer hover:border-white/20 transition-all">
              <div className="space-y-1">
                <h3 className="text-xl font-light italic font-serif text-white group-hover:text-pink-200 transition-colors">{item.title}</h3>
                <p className="text-[10px] uppercase tracking-widest text-white/30 font-bold">{format(item.publishDate.toDate(), "PPpp")}</p>
              </div>
              <div className="flex items-center gap-3">
                 <span className={cn("px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest", item.isPublished ? "bg-green-500/10 text-green-400 border border-green-500/20" : "bg-amber-500/10 text-amber-400 border border-amber-500/20")}>
                   {item.isPublished ? "Live" : "Draft"}
                 </span>
              </div>
            </GlassPanel>
          ))}
        </div>
      ) : (
        <div className="space-y-12">
           <LunarCycle userId={user.uid} isAdmin={true} />
           <EmotionalWeather userId={user.uid} userEmail={user.email || ""} />
           <UsDrop userId={user.uid} />
        </div>
      )}
    </div>
  );
}


