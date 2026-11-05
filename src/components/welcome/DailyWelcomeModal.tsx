import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  Sparkles,
  Heart,
  Star,
  BookmarkCheck,
  Send,
  X,
  ChevronRight,
  Clock,
  EyeOff
} from "lucide-react";
import { AntiqueEnvelope } from "./AntiqueEnvelope";
import { KeepsakeBox } from "./KeepsakeBox";
import {
  getRandomGreeting,
  getTodaySpecialOccasion,
  setDailyWelcomeState
} from "../../lib/welcomeService";
import { MessageBoxItem, DailyBoxSelection, UserRole } from "../../types";
import { markBoxAsOpened, toggleBoxFavorite, reactToMessageBox } from "../../lib/messageBoxService";

interface DailyWelcomeModalProps {
  userId: string;
  userRole: UserRole;
  dailyMessage: MessageBoxItem | null;
  dailySelection: DailyBoxSelection | null;
  onClose: () => void;
  onExploreApp: () => void;
  onSaveToMemoryBook?: (message: MessageBoxItem) => void;
}

const REACTION_EMOJIS = ["❤️", "🥰", "🌸", "🤲", "✨", "🥺"];

export const DailyWelcomeModal: React.FC<DailyWelcomeModalProps> = ({
  userId,
  userRole,
  dailyMessage,
  dailySelection,
  onClose,
  onExploreApp,
  onSaveToMemoryBook
}) => {
  const [isOpenState, setIsOpenState] = useState(false);
  const [isRevealed, setIsRevealed] = useState(false);
  const [greeting] = useState(getRandomGreeting());
  const [specialOccasion] = useState(getTodaySpecialOccasion());
  const [isFavorite, setIsFavorite] = useState(Boolean(dailyMessage?.isFavorite));
  const [selectedReaction, setSelectedReaction] = useState<string | null>(
    dailyMessage?.reactions?.[userId] || null
  );
  const [replyText, setReplyText] = useState("");
  const [isReplying, setIsReplying] = useState(false);
  const [replySent, setReplySent] = useState(false);
  const [savedToMemory, setSavedToMemory] = useState(false);

  // If already opened earlier today, open directly
  useEffect(() => {
    if (dailySelection?.isOpened || dailyMessage?.isOpened) {
      setIsOpenState(true);
      setIsRevealed(true);
    }
  }, [dailySelection, dailyMessage]);

  const handleOpenSurprise = async () => {
    if (!dailyMessage || !dailySelection) return;
    setIsOpenState(true);

    // After animation unfolds (approx 900ms), reveal content
    setTimeout(async () => {
      setIsRevealed(true);
      setDailyWelcomeState(userId, "opened");
      await markBoxAsOpened(dailySelection.date, dailyMessage.id, userId);
    }, 950);
  };

  const handleSaveForLater = () => {
    setDailyWelcomeState(userId, "deferred");
    onClose();
  };

  const handleSkipToday = () => {
    setDailyWelcomeState(userId, "skipped");
    onClose();
  };

  const handleToggleFavorite = async () => {
    if (!dailyMessage) return;
    const next = !isFavorite;
    setIsFavorite(next);
    await toggleBoxFavorite(dailyMessage.id, isFavorite);
  };

  const handleReact = async (emoji: string) => {
    if (!dailyMessage) return;
    setSelectedReaction(emoji);
    await reactToMessageBox(dailyMessage.id, userId, emoji);
  };

  const handleSendReply = (e: React.FormEvent) => {
    e.preventDefault();
    if (!replyText.trim()) return;
    setReplySent(true);
    setIsReplying(false);
    setReplyText("");
    setTimeout(() => setReplySent(false), 4000);
  };

  const handleSaveMemory = () => {
    if (dailyMessage && onSaveToMemoryBook) {
      onSaveToMemoryBook(dailyMessage);
      setSavedToMemory(true);
      setTimeout(() => setSavedToMemory(false), 3500);
    }
  };

  const useBoxStyle = specialOccasion ? specialOccasion.style === "keepsake_box" : false;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 overflow-y-auto">
      {/* Dark Enchanted Atmosphere Backdrop */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-[#070509]/92 backdrop-blur-xl"
      />

      {/* Floating Star & Dust Particles Canvas */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-1/4 left-1/6 w-1 h-1 bg-amber-200 rounded-full animate-ping opacity-60" />
        <div className="absolute top-1/3 right-1/5 w-1.5 h-1.5 bg-rose-200 rounded-full animate-pulse opacity-75" />
        <div className="absolute bottom-1/4 left-1/3 w-1 h-1 bg-amber-100 rounded-full animate-ping opacity-50" />
        <div className="absolute top-1/2 right-1/4 w-2 h-2 bg-purple-200 rounded-full blur-[1px] animate-pulse opacity-60" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-rose-950/20 via-transparent to-transparent pointer-events-none" />
      </div>

      {/* Modal Dialog Content */}
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 15 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="relative z-10 w-full max-w-xl mx-auto flex flex-col items-center text-center my-auto"
      >
        {/* Top Dismiss Button (Safe Save for Later) */}
        <button
          onClick={handleSaveForLater}
          className="absolute -top-10 sm:-top-12 right-0 p-2 text-stone-400 hover:text-white rounded-full bg-white/5 hover:bg-white/10 transition flex items-center gap-1.5 text-xs font-mono"
          title="Save for later"
        >
          <span>Save for later</span>
          <X className="w-4 h-4" />
        </button>

        {/* Ambient Greeting Header */}
        {!isRevealed && (
          <div className="space-y-2 mb-2 px-4 animate-fadeIn">
            <span className="text-[11px] font-mono tracking-widest text-rose-300 uppercase">
              Project Cupid • Daily Gift
            </span>
            <h2 className="text-2xl sm:text-3xl font-serif text-white font-light tracking-wide drop-shadow-md">
              {greeting}
            </h2>
            <p className="text-xs sm:text-sm text-stone-300 font-serif italic max-w-md mx-auto">
              A little piece of love has been waiting for you in our private sanctuary.
            </p>
          </div>
        )}

        {/* Central Interactive Animation: Antique Envelope or Keepsake Box */}
        {!isRevealed ? (
          <div className="w-full flex flex-col items-center">
            {useBoxStyle ? (
              <KeepsakeBox
                isOpen={isOpenState}
                onOpen={handleOpenSurprise}
                specialTitle={specialOccasion?.title}
              />
            ) : (
              <AntiqueEnvelope
                isOpen={isOpenState}
                onOpen={handleOpenSurprise}
              />
            )}

            {/* 3 Explicit User Action Buttons */}
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3 w-full max-w-md mt-4 px-4">
              {/* PRIMARY: Open My Surprise */}
              <button
                onClick={handleOpenSurprise}
                disabled={isOpenState}
                className="w-full sm:w-auto px-6 py-3 rounded-2xl bg-gradient-to-r from-rose-600 via-rose-500 to-amber-600 hover:from-rose-500 hover:to-amber-500 text-white font-serif text-sm font-semibold tracking-wide shadow-[0_8px_25px_rgba(244,63,94,0.4)] hover:shadow-[0_12px_30px_rgba(244,63,94,0.6)] hover:scale-105 active:scale-95 transition-all flex items-center justify-center gap-2"
              >
                <Sparkles className="w-4 h-4 text-amber-200 animate-spin" style={{ animationDuration: "6s" }} />
                <span>Open My Surprise</span>
              </button>

              {/* SECONDARY: Save It For Later */}
              <button
                onClick={handleSaveForLater}
                className="w-full sm:w-auto px-4 py-2.5 rounded-2xl bg-white/10 hover:bg-white/15 border border-white/10 text-stone-200 text-xs font-medium tracking-wide transition flex items-center justify-center gap-1.5"
              >
                <Clock className="w-3.5 h-3.5 text-amber-300" />
                <span>Save It For Later</span>
              </button>

              {/* TERTIARY: Skip Today */}
              <button
                onClick={handleSkipToday}
                className="w-full sm:w-auto px-3.5 py-2.5 text-xs text-stone-400 hover:text-stone-200 transition flex items-center justify-center gap-1"
              >
                <EyeOff className="w-3.5 h-3.5" />
                <span>Skip Today</span>
              </button>
            </div>
          </div>
        ) : (
          /* Revealed Message Parchment Card */
          <motion.div
            initial={{ opacity: 0, y: 25, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ duration: 0.5, ease: "easeOut" }}
            className="w-full max-w-lg bg-gradient-to-br from-[#faf6ee] via-[#f7f0e1] to-[#ede3cf] text-stone-900 rounded-3xl p-6 sm:p-8 shadow-[0_25px_70px_rgba(0,0,0,0.7)] border-2 border-[#dfc298] text-left relative overflow-hidden"
          >
            {/* Watermark Stamp in Corner */}
            <div className="absolute top-4 right-4 text-rose-300/40 text-4xl select-none pointer-events-none">
              ♡
            </div>

            {/* Header info */}
            <div className="flex items-center justify-between pb-3 border-b border-[#dfc298]/80">
              <span className="px-3 py-0.5 rounded-full text-[11px] font-mono uppercase bg-rose-100 text-rose-800 border border-rose-200 font-semibold">
                {dailyMessage?.category || "Love Note"}
              </span>
              <div className="flex items-center gap-2">
                <button
                  onClick={handleToggleFavorite}
                  className="p-1.5 rounded-lg text-amber-600 hover:bg-amber-100/50 transition"
                  title="Favorite this message"
                >
                  <Star className={`w-4 h-4 ${isFavorite ? "fill-amber-500 text-amber-500" : ""}`} />
                </button>
                <button
                  onClick={handleSaveMemory}
                  className="p-1.5 rounded-lg text-rose-700 hover:bg-rose-100/50 transition"
                  title="Keep forever in Our Memory Book"
                >
                  <BookmarkCheck className={`w-4 h-4 ${savedToMemory ? "text-emerald-600" : ""}`} />
                </button>
              </div>
            </div>

            {/* Title if present */}
            {dailyMessage?.title && (
              <h3 className="text-xl font-serif text-[#6b2a47] font-bold mt-4 tracking-wide">
                {dailyMessage.title}
              </h3>
            )}

            {/* Message Body */}
            <div className="my-5 font-serif text-base sm:text-lg leading-relaxed text-stone-800 italic whitespace-pre-wrap">
              "{dailyMessage?.content || "You are the greatest blessing of my life."}"
            </div>

            {/* Author Attribution */}
            <div className="pt-2 flex items-center justify-between text-xs text-stone-500 font-serif border-t border-[#dfc298]/60">
              <span>
                From:{" "}
                <strong className="text-stone-800 font-semibold">
                  {dailyMessage?.isAnonymous ? "Someone who loves you dearly" : dailyMessage?.authorName || "Raaziq"}
                </strong>
              </span>
              <span className="text-[10px] font-mono text-stone-400">
                {dailySelection?.date || "Today"}
              </span>
            </div>

            {/* Toast for Memory Book */}
            {savedToMemory && (
              <div className="mt-3 p-2 bg-emerald-100 border border-emerald-300 rounded-xl text-emerald-900 text-xs text-center font-sans font-medium">
                ✓ Treasured forever in Our Memory Book!
              </div>
            )}

            {/* Emoji Reactions Bar */}
            <div className="mt-5 pt-3 border-t border-[#dfc298]/80">
              <div className="text-[11px] font-mono uppercase tracking-wider text-stone-500 mb-2">
                Leave a sweet reaction:
              </div>
              <div className="flex items-center gap-1.5">
                {REACTION_EMOJIS.map(emoji => (
                  <button
                    key={emoji}
                    onClick={() => handleReact(emoji)}
                    className={`w-9 h-9 rounded-xl flex items-center justify-center text-lg transition ${
                      selectedReaction === emoji
                        ? "bg-rose-200 border-2 border-rose-400 scale-110 shadow-sm"
                        : "bg-white/60 hover:bg-white border border-[#dfc298] hover:scale-105"
                    }`}
                  >
                    {emoji}
                  </button>
                ))}
              </div>
            </div>

            {/* Quick Reply Drawer / Form */}
            <div className="mt-4 pt-3 border-t border-[#dfc298]/60">
              {!isReplying && !replySent ? (
                <button
                  onClick={() => setIsReplying(true)}
                  className="text-xs font-serif italic text-rose-800 hover:text-rose-950 flex items-center gap-1.5 transition font-medium"
                >
                  <Send className="w-3.5 h-3.5 text-rose-600" />
                  <span>Send a loving reply back...</span>
                </button>
              ) : isReplying ? (
                <form onSubmit={handleSendReply} className="space-y-2">
                  <textarea
                    rows={2}
                    value={replyText}
                    onChange={e => setReplyText(e.target.value)}
                    placeholder="Write a sweet reply..."
                    className="w-full text-xs font-serif p-2.5 rounded-xl border border-stone-300 bg-white/90 text-stone-900 focus:outline-none focus:ring-2 focus:ring-rose-400"
                  />
                  <div className="flex justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => setIsReplying(false)}
                      className="px-3 py-1 text-xs text-stone-500"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="px-3.5 py-1 text-xs font-medium bg-rose-700 text-white rounded-lg hover:bg-rose-800 transition"
                    >
                      Send Reply
                    </button>
                  </div>
                </form>
              ) : (
                <div className="text-xs text-emerald-800 font-serif italic">
                  ✓ Your reply was whispered back into our universe!
                </div>
              )}
            </div>

            {/* Final Continue Button */}
            <div className="mt-6 pt-3 border-t border-[#dfc298]/80 flex justify-end">
              <button
                onClick={onExploreApp}
                className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-stone-900 to-stone-800 hover:from-stone-800 hover:to-stone-700 text-amber-100 text-xs font-serif font-medium tracking-wide shadow-md flex items-center gap-1.5 transition group"
              >
                <span>Continue into Our World</span>
                <ChevronRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
              </button>
            </div>
          </motion.div>
        )}
      </motion.div>
    </div>
  );
};
