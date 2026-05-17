import { lazy, Suspense, useState, useEffect } from "react";
import { collection, query, where, orderBy, onSnapshot, addDoc, Timestamp } from "firebase/firestore";
import { db, handleFirestoreError, OperationType } from "../lib/firebase";
import LetterCard from "./LetterCard";
import { AnimatePresence, motion } from "motion/react";
import { BookHeart, Package, Heart, Share2, Send } from "lucide-react";
import GlassPanel from "./GlassPanel";
import { cn } from "../lib/utils";
import { User } from "firebase/auth";
import { UserProfile } from "../hooks/useAuth";
import { notifyPartner } from "../lib/notifications";

const LetterReader = lazy(() => import("./LetterReader"));
const Vault = lazy(() => import("./Vault"));
const LunarCycle = lazy(() => import("./LunarCycle"));
const EmotionalWeather = lazy(() => import("./EmotionalWeather"));
const UsDrop = lazy(() => import("./UsDrop"));

interface Letter {
  id: string;
  title: string;
  content: string;
  publishDate: any;
  isFavorite: boolean;
  isRead?: boolean;
  authorId?: string;
}

export default function Dashboard({ user, profile }: { user: User; profile: UserProfile | null }) {
  const [letters, setLetters] = useState<Letter[]>([]);
  const [selectedLetter, setSelectedLetter] = useState<Letter | null>(null);
  const [view, setView] = useState<'history' | 'vault' | 'connection'>('history');
  const [filter, setFilter] = useState<'all' | 'favorites'>('all');
  const [loading, setLoading] = useState(true);
  const [letterTitle, setLetterTitle] = useState("");
  const [letterContent, setLetterContent] = useState("");
  const [sendingLetter, setSendingLetter] = useState(false);
  const [sendState, setSendState] = useState<{ type: "success" | "error"; message: string } | null>(null);

  useEffect(() => {
    const q = query(
      collection(db, "letters"),
      where("isPublished", "==", true),
      where("publishDate", "<=", new Date()),
      orderBy("publishDate", "desc")
    );

    return onSnapshot(q, (snapshot) => {
      const docs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Letter));
      setLetters(docs);
      setLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, "letters");
    });
  }, []);

  const filteredLetters = filter === 'favorites' 
    ? letters.filter(l => l.isFavorite) 
    : letters;

  const handleSendLetterBack = async () => {
    const trimmedContent = letterContent.trim();
    if (!trimmedContent) return;

    const trimmedTitle = letterTitle.trim();
    const finalTitle = trimmedTitle || `A note from ${profile?.displayName?.split(" ")[0] || "Razia"}`;

    setSendingLetter(true);
    setSendState(null);
    try {
      await addDoc(collection(db, "letters"), {
        title: finalTitle,
        content: trimmedContent,
        publishDate: Timestamp.now(),
        isPublished: true,
        isFavorite: false,
        isRead: false,
        authorId: user.uid,
        authorRole: "reader",
        recipientRole: "admin",
        createdAt: Timestamp.now(),
      });

      await notifyPartner(
        user.uid,
        "Razia sent you a letter",
        finalTitle
      );

      setLetterTitle("");
      setLetterContent("");
      setSendState({ type: "success", message: "Letter sent successfully." });
    } catch (error) {
      try {
        handleFirestoreError(error, OperationType.CREATE, "letters");
      } catch {
        setSendState({ type: "error", message: "Could not send right now. Please try again." });
      }
    } finally {
      setSendingLetter(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto px-6 space-y-6 pb-32">
      <main className="flex flex-col lg:flex-row gap-6">
        {/* Left Column: Main View */}
        <div className="flex-[1.8] space-y-6">
          <AnimatePresence mode="wait">
            {view === 'history' ? (
              <motion.div
                key="history"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
              >
                <div className="flex flex-col md:flex-row justify-between items-end gap-6 mb-8">
                  <div className="space-y-2">
                    <motion.p 
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      className="text-xs uppercase tracking-[0.3em] text-pink-500 font-bold"
                    >
                       Welcome Home, {profile?.displayName?.split(" ")[0] || "Love"}
                    </motion.p>
                    <motion.h1 
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.1 }}
                      className="text-5xl md:text-6xl font-light italic font-serif text-white tracking-tight"
                    >
                      Your Daily Aurora
                    </motion.h1>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <AnimatePresence mode="popLayout">
                    {filteredLetters.map((letter, index) => (
                      <div key={letter.id}>
                        <LetterCard 
                          letter={letter} 
                          index={index} 
                          onClick={() => setSelectedLetter(letter)} 
                        />
                      </div>
                    ))}
                  </AnimatePresence>
                  
                  {loading && (
                    <div className="col-span-full py-20 text-center animate-pulse text-white/20">
                      Fetching the latest aurora...
                    </div>
                  )}
                  
                  {!loading && filteredLetters.length === 0 && (
                    <div className="col-span-full py-32 text-center space-y-4">
                       <GlassPanel className="max-w-md mx-auto p-12">
                         <Package className="w-12 h-12 text-white/10 mx-auto mb-4" />
                         <p className="text-white/40">No letters in your {filter === 'favorites' ? 'Forever Book' : 'vault'} yet. They will appear here daily.</p>
                       </GlassPanel>
                    </div>
                  )}
                </div>
              </motion.div>
            ) : view === 'vault' ? (
              <motion.div
                key="vault"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
              >
                <Suspense fallback={<div className="py-20 text-center text-white/30">Loading vault...</div>}>
                  <Vault onOpenLetter={setSelectedLetter} />
                </Suspense>
              </motion.div>
            ) : (
              <motion.div
                key="connection"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                className="space-y-12"
              >
                <Suspense fallback={<div className="py-20 text-center text-white/30">Loading connection features...</div>}>
                  <LunarCycle userId={user.uid} isAdmin={false} />
                  <EmotionalWeather userId={user.uid} userEmail={user.email || ""} />
                  <UsDrop userId={user.uid} />
                </Suspense>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Right Column: Widgets */}
        <aside className="flex-1 flex flex-col gap-6">
          {/* Navigation/Filter Widget */}
          <GlassPanel className="p-6 flex flex-col gap-4">
             <h3 className="text-xs font-bold uppercase tracking-widest text-white/50">Collections</h3>
             <div className="flex flex-col gap-2">
               <button
                 onClick={() => { setView('history'); setFilter('all'); }}
                 className={cn(
                   "flex items-center justify-between gap-2 px-4 py-3 rounded-2xl transition-all text-sm font-semibold border",
                   view === 'history' && filter === 'all' ? "bg-white/10 border-white/20 text-white" : "text-white/40 border-transparent hover:bg-white/5"
                 )}
               >
                 <div className="flex items-center gap-3">
                    <BookHeart className="w-4 h-4" />
                    <span>Daily Letters</span>
                 </div>
                 <span className="text-[10px] bg-white/10 px-2 py-0.5 rounded-full">{letters.length}</span>
               </button>
               <button
                 onClick={() => { setView('history'); setFilter('favorites'); }}
                 className={cn(
                   "flex items-center justify-between gap-2 px-4 py-3 rounded-2xl transition-all text-sm font-semibold border",
                   view === 'history' && filter === 'favorites' ? "bg-pink-500/10 border-pink-500/20 text-pink-400" : "text-white/40 border-transparent hover:bg-white/5"
                 )}
               >
                 <div className="flex items-center gap-3">
                    <Heart className="w-4 h-4" />
                    <span>Forever Book</span>
                 </div>
                 <span className="text-[10px] bg-pink-500/20 px-2 py-0.5 rounded-full">{letters.filter(l => l.isFavorite).length}</span>
               </button>
               <button
                 onClick={() => { setView('connection'); }}
                 className={cn(
                   "flex items-center justify-between gap-2 px-4 py-3 rounded-2xl transition-all text-sm font-semibold border",
                   view === 'connection' ? "bg-blue-500/10 border-blue-500/20 text-blue-400" : "text-white/40 border-transparent hover:bg-white/5"
                 )}
               >
                 <div className="flex items-center gap-3">
                    <Share2 className="w-4 h-4" />
                    <span>Connection</span>
                 </div>
               </button>
             </div>
          </GlassPanel>

          {/* Vault Widget */}
          <GlassPanel className={cn(
            "p-6 flex flex-col gap-4 bg-gradient-to-br transition-all",
            view === 'vault' ? "from-pink-500/20 to-transparent border-pink-500/30" : "from-white/5 to-transparent"
          )}>
             <h3 className="text-xs font-bold uppercase tracking-widest text-white/50">The Vault</h3>
             <div className="space-y-3">
                <div onClick={() => setView('vault')} className="p-4 bg-white/5 border border-white/10 rounded-2xl flex items-center justify-between group cursor-pointer hover:bg-white/10 transition-all">
                  <span className="text-sm font-medium text-white/80">Permanent Letters</span>
                  <div className="w-6 h-6 rounded-full bg-white/10 flex items-center justify-center text-pink-400">
                    <Heart size={12} fill="currentColor" />
                  </div>
                </div>
             </div>
             <button 
               onClick={() => setView(view === 'vault' ? 'history' : 'vault')}
               className={cn(
                 "mt-2 w-full py-3 border border-white/10 rounded-xl text-[10px] font-bold uppercase tracking-widest transition-all",
                 view === 'vault' ? "text-pink-400 border-pink-500/30 bg-pink-500/10" : "text-white/40 hover:text-white hover:bg-white/5"
               )}
             >
               {view === 'vault' ? "Close the Vault" : "Explore the Vault"}
             </button>
          </GlassPanel>

          {/* Write Back Widget */}
          <GlassPanel className="p-6 space-y-4">
            <div className="space-y-1">
              <h3 className="text-xs font-bold uppercase tracking-widest text-white/50">Write Back</h3>
              <p className="text-xs text-white/40">Send Razia-to-Mohammed letters from your side too.</p>
            </div>

            <input
              value={letterTitle}
              onChange={(e) => setLetterTitle(e.target.value)}
              placeholder="Letter title (optional)"
              className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-sm text-white placeholder:text-white/20 focus:outline-none focus:border-pink-500/40"
            />
            <textarea
              value={letterContent}
              onChange={(e) => setLetterContent(e.target.value)}
              placeholder="Write your heart out..."
              rows={4}
              className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-sm text-white placeholder:text-white/20 resize-none focus:outline-none focus:border-pink-500/40"
            />
            <button
              onClick={handleSendLetterBack}
              disabled={sendingLetter || !letterContent.trim()}
              className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-white text-black text-xs font-bold uppercase tracking-widest hover:bg-pink-100 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Send className="w-4 h-4" />
              {sendingLetter ? "Sending..." : "Send Letter"}
            </button>
            {sendState && (
              <p
                className={cn(
                  "text-xs",
                  sendState.type === "success" ? "text-emerald-300" : "text-rose-300"
                )}
              >
                {sendState.message}
              </p>
            )}
          </GlassPanel>

          {/* Hardware Widget */}
          <div className="h-48 bg-gradient-to-br from-blue-600/10 to-purple-600/10 backdrop-blur-2xl border border-white/10 rounded-[32px] p-8 relative overflow-hidden flex flex-col justify-end">
            <div className="absolute top-0 right-0 p-6 text-white/5 pointer-events-none transform rotate-12">
               <Heart size={80} fill="currentColor" />
            </div>
            <h3 className="text-xs font-bold uppercase tracking-widest text-white/30 mb-3 block">Hardware Hub</h3>
            <div className="space-y-1">
              <div className="text-2xl font-light italic font-serif">ESP32 Lamp</div>
              <div className="flex items-center gap-2">
                {letters.some(l => !l.isRead) ? (
                  <>
                    <div className="w-2 h-2 bg-pink-500 rounded-full animate-pulse"></div>
                    <span className="text-sm text-pink-400 font-medium">Pulse Mode: Aurora</span>
                  </>
                ) : (
                  <>
                    <div className="w-2 h-2 bg-blue-500/40 rounded-full"></div>
                    <span className="text-sm text-white/40 font-medium">Mode: Resting</span>
                  </>
                )}
              </div>
            </div>
          </div>
        </aside>
      </main>

      {/* Letter Reader Modal */}
      <AnimatePresence>
        {selectedLetter && (
          <Suspense fallback={null}>
            <LetterReader 
              letter={selectedLetter} 
              onClose={() => setSelectedLetter(null)}
              currentUserId={user.uid}
              currentUserName={profile?.displayName || "Razia"}
              canReply={selectedLetter.authorId !== user.uid}
            />
          </Suspense>
        )}
      </AnimatePresence>
    </div>
  );
}


