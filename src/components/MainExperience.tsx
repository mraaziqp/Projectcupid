import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  Heart,
  Home,
  BookHeart,
  Gift,
  ShieldCheck,
  Compass,
  Sparkles,
  Settings,
  Edit3,
  Menu,
  X,
  LogOut,
  Bell,
  BookOpen,
  Shield,
  HelpCircle
} from "lucide-react";
import { User as FirebaseUser } from "firebase/auth";
import { UserProfile, MessageBoxItem, DailyBoxSelection } from "../types";
import { auth, db } from "../lib/firebase";
import { collection, query, where, orderBy, onSnapshot } from "firebase/firestore";
import { getPartnerProfile } from "../lib/utils";

import HomeDashboard from "./HomeDashboard";
import OurLove from "./OurLove";
import MessageBoxes from "./MessageBoxes";
import MemoryBook from "./MemoryBook";
import HerWellbeing from "./HerWellbeing";
import OurFuture from "./OurFuture";
import LittleThings from "./LittleThings";
import SettingsScreen from "./SettingsScreen";
import AdminCommandCentre from "./AdminCommandCentre";
import AdminEditor from "./AdminEditor";
import LetterReader from "./LetterReader";

import { DailyWelcomeModal } from "./welcome/DailyWelcomeModal";
import { OnboardingModal } from "./help/OnboardingModal";
import {
  getDailyWelcomeState,
  isWelcomeConfigEnabled
} from "../lib/welcomeService";
import { getOrSelectDailyBox } from "../lib/messageBoxService";

interface MainExperienceProps {
  user: FirebaseUser;
  profile: UserProfile | null;
}

export type AppSpace =
  | "home"
  | "love"
  | "boxes"
  | "memory_book"
  | "wellbeing"
  | "future"
  | "little"
  | "settings"
  | "admin_centre"
  | "write_letter";

export default function MainExperience({ user, profile }: MainExperienceProps) {
  const [activeSpace, setActiveSpace] = useState<AppSpace>("home");
  const [partnerProfile, setPartnerProfile] = useState<UserProfile | null>(null);
  const [letters, setLetters] = useState<any[]>([]);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isPreviewingPartner, setIsPreviewingPartner] = useState(false);
  const [selectedLetter, setSelectedLetter] = useState<any | null>(null);

  // Daily Welcome & Onboarding State
  const [showDailyWelcome, setShowDailyWelcome] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [dailyMessage, setDailyMessage] = useState<MessageBoxItem | null>(null);
  const [dailySelection, setDailySelection] = useState<DailyBoxSelection | null>(null);
  const [isDailyDeferred, setIsDailyDeferred] = useState(false);

  const effectiveRole = isPreviewingPartner ? "sanctuary_owner" : profile?.role || "sanctuary_owner";
  const isAdmin = effectiveRole === "admin";
  const displayName = profile?.displayName || (isAdmin ? "Raaziq" : "Razia");

  useEffect(() => {
    const fetchPartner = async () => {
      const partner = await getPartnerProfile(profile);
      setPartnerProfile(partner as any);
    };
    if (profile) fetchPartner();
  }, [profile]);

  // Letters Realtime Subscription
  useEffect(() => {
    const q = query(
      collection(db, "letters"),
      where("isPublished", "==", true),
      orderBy("publishDate", "desc")
    );

    const unsub = onSnapshot(
      q,
      (snapshot) => {
        const docs = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
        setLetters(docs);
      },
      (err) => {
        console.warn("Could not load letters snapshot:", err);
      }
    );
    return () => unsub();
  }, []);

  // Daily Welcome Session Initialization
  useEffect(() => {
    const initSession = async () => {
      try {
        const { selection, message } = await getOrSelectDailyBox(user.uid);
        setDailySelection(selection);
        setDailyMessage(message);

        const welcomeState = getDailyWelcomeState(user.uid);
        if (welcomeState.status === "unseen" && isWelcomeConfigEnabled() && !selection.isOpened) {
          setShowDailyWelcome(true);
        } else if (welcomeState.status === "deferred" || (!selection.isOpened && welcomeState.status !== "opened")) {
          setIsDailyDeferred(true);
        }

        // Check first-time onboarding
        const hasCompletedOnboarding = localStorage.getItem(`cupid_onboarding_completed_${user.uid}`);
        if (!hasCompletedOnboarding && welcomeState.status !== "unseen") {
          setShowOnboarding(true);
        }
      } catch (e) {
        console.warn("Daily session init error:", e);
      }
    };

    initSession();
  }, [user.uid]);

  const navItems = [
    { id: "home", label: "Home", icon: Home },
    { id: "love", label: "Our Love", icon: BookHeart },
    { id: "boxes", label: "Message Boxes", icon: Gift, hasBadge: isDailyDeferred },
    { id: "memory_book", label: "Memory Book", icon: BookOpen },
    { id: "wellbeing", label: "Her Wellbeing", icon: ShieldCheck },
    { id: "future", label: "Our Future", icon: Compass },
    { id: "little", label: "Little Things", icon: Sparkles }
  ];

  return (
    <div className="min-h-screen text-white relative pb-24 md:pb-16">
      {/* UNIVERSAL TOP NAVIGATION BAR */}
      <header className="fixed top-3 sm:top-5 left-3 sm:left-6 right-3 sm:right-6 z-40 max-w-6xl mx-auto">
        <div className="flex items-center justify-between h-14 md:h-16 px-4 md:px-6 bg-[#0e0c12]/75 backdrop-blur-2xl border border-white/10 rounded-2xl shadow-xl transition-all">
          {/* Brand Logo & Title */}
          <div
            onClick={() => setActiveSpace("home")}
            className="flex items-center gap-2.5 cursor-pointer select-none group"
          >
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-rose-500 to-amber-500 flex items-center justify-center shadow-[0_0_15px_rgba(244,63,94,0.3)] group-hover:scale-105 transition-transform">
              <Heart className="w-4 h-4 text-white fill-white" />
            </div>
            <div className="hidden sm:block">
              <span className="text-sm font-semibold tracking-wider uppercase font-serif-title text-white/95">
                Project Cupid
              </span>
              <span className="text-[10px] text-rose-300 block font-mono -mt-1 tracking-widest">
                Our Little Universe • 4.0
              </span>
            </div>
          </div>

          {/* Unopened Daily Surprise Reminder Pill */}
          {isDailyDeferred && dailyMessage && !dailyMessage.isOpened && (
            <button
              onClick={() => setShowDailyWelcome(true)}
              className="hidden md:flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-gradient-to-r from-rose-500/20 via-amber-500/20 to-rose-500/20 border border-rose-400/40 text-amber-200 text-xs font-serif shadow-lg animate-pulse hover:scale-105 transition"
            >
              <Gift className="w-3.5 h-3.5 text-rose-400" />
              <span>Today's Gift Waiting (Tap to Open)</span>
            </button>
          )}

          {/* Desktop Navigation Links */}
          <nav className="hidden lg:flex items-center gap-1 xl:gap-2">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeSpace === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => setActiveSpace(item.id as AppSpace)}
                  className={`px-2.5 xl:px-3 py-1.5 rounded-xl text-xs font-medium transition-all flex items-center gap-1.5 relative ${
                    isActive
                      ? "bg-white/10 text-white font-semibold border border-white/15 shadow-sm"
                      : "text-white/60 hover:text-white hover:bg-white/5"
                  }`}
                >
                  <Icon className={`w-3.5 h-3.5 ${isActive ? "text-rose-400" : ""}`} />
                  <span>{item.label}</span>
                  {item.hasBadge && (
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-400 absolute top-1.5 right-1.5 animate-pulse" />
                  )}
                </button>
              );
            })}
          </nav>

          {/* Right Action Icons */}
          <div className="flex items-center gap-2 sm:gap-3">
            {/* Admin Command Centre Shortcut for Raaziq */}
            {profile?.role === "admin" && (
              <button
                onClick={() => setActiveSpace("admin_centre")}
                className={`p-2 sm:px-3 py-1.5 rounded-xl border text-xs font-serif transition-all flex items-center gap-1.5 ${
                  activeSpace === "admin_centre"
                    ? "bg-rose-500/30 text-rose-200 border-rose-500/50 shadow-sm"
                    : "bg-white/5 border-white/10 text-stone-300 hover:text-white hover:bg-white/10"
                }`}
                title="Admin Command Centre"
              >
                <Shield className="w-3.5 h-3.5 text-rose-400" />
                <span className="hidden xl:inline">Command Centre</span>
              </button>
            )}

            {/* Quick Letter Write (Admin only) */}
            {profile?.role === "admin" && (
              <button
                onClick={() => setActiveSpace(activeSpace === "write_letter" ? "home" : "write_letter")}
                className={`p-2 rounded-xl border text-xs font-medium transition-all flex items-center gap-1.5 ${
                  activeSpace === "write_letter"
                    ? "bg-rose-500 text-white border-rose-400"
                    : "bg-white/5 border-white/10 text-white/70 hover:text-white hover:bg-white/10"
                }`}
                title="Write a Letter"
              >
                <Edit3 className="w-3.5 h-3.5" />
                <span className="hidden md:inline">Write</span>
              </button>
            )}

            {/* Tour / Help Button */}
            <button
              onClick={() => setShowOnboarding(true)}
              className="p-2 rounded-xl bg-white/5 border border-white/10 text-white/50 hover:text-white transition"
              title="Interactive App Tour"
            >
              <HelpCircle className="w-4 h-4" />
            </button>

            {/* Settings Screen */}
            <button
              onClick={() => setActiveSpace("settings")}
              className={`p-2 rounded-xl border transition-all ${
                activeSpace === "settings"
                  ? "bg-white/15 border-white/25 text-white"
                  : "bg-white/5 border-white/10 text-white/50 hover:text-white"
              }`}
              title="Settings & Privacy"
            >
              <Settings className="w-4 h-4" />
            </button>

            {/* Mobile Menu Hamburger */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="lg:hidden p-2 rounded-xl bg-white/5 border border-white/10 text-white/70 hover:text-white"
              aria-label="Toggle navigation menu"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>
      </header>

      {/* MOBILE FULL DRAWER NAVIGATION */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="fixed inset-x-3 top-20 z-40 lg:hidden p-5 rounded-3xl bg-[#121017]/95 backdrop-blur-2xl border border-white/15 shadow-2xl space-y-3"
          >
            <div className="flex items-center justify-between pb-3 border-b border-white/10 text-xs text-white/50">
              <span>Signed in as <strong className="text-white">{displayName}</strong></span>
              <button
                onClick={() => auth.signOut()}
                className="text-rose-400 hover:text-rose-300 flex items-center gap-1"
              >
                <LogOut className="w-3.5 h-3.5" /> Sign out
              </button>
            </div>

            <div className="grid grid-cols-2 gap-2 pt-1">
              {navItems.map((item) => {
                const Icon = item.icon;
                const isActive = activeSpace === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => {
                      setActiveSpace(item.id as AppSpace);
                      setMobileMenuOpen(false);
                    }}
                    className={`p-3 rounded-2xl border text-left flex items-center gap-2.5 transition-all ${
                      isActive
                        ? "bg-rose-500/20 border-rose-500/40 text-rose-200 font-medium"
                        : "bg-white/5 border-white/5 text-white/70"
                    }`}
                  >
                    <Icon className="w-4 h-4 shrink-0 text-amber-300" />
                    <span className="text-xs truncate">{item.label}</span>
                  </button>
                );
              })}

              {profile?.role === "admin" && (
                <button
                  onClick={() => {
                    setActiveSpace("admin_centre");
                    setMobileMenuOpen(false);
                  }}
                  className="p-3 rounded-2xl border border-rose-500/30 bg-rose-950/20 text-rose-200 text-left flex items-center gap-2.5"
                >
                  <Shield className="w-4 h-4 shrink-0 text-rose-400" />
                  <span className="text-xs truncate">Admin Command</span>
                </button>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* MOBILE BOTTOM NAVIGATION BAR */}
      <div className="fixed bottom-3 left-3 right-3 z-40 lg:hidden max-w-md mx-auto">
        <div className="h-14 px-3 bg-[#0d0b12]/90 backdrop-blur-2xl border border-white/15 rounded-2xl shadow-2xl flex items-center justify-around">
          {navItems.slice(0, 5).map((item) => {
            const Icon = item.icon;
            const isActive = activeSpace === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveSpace(item.id as AppSpace)}
                className={`flex flex-col items-center justify-center w-12 h-12 rounded-xl transition-all relative ${
                  isActive ? "text-rose-400 scale-105" : "text-white/40 hover:text-white"
                }`}
              >
                <Icon className="w-5 h-5" />
                <span className="text-[9px] font-mono mt-0.5">{item.label.split(" ")[0]}</span>
                {item.hasBadge && (
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-400 absolute top-1.5 right-2" />
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* MAIN SPACES CONTAINER */}
      <main className="pt-24 sm:pt-28">
        <AnimatePresence mode="wait">
          {activeSpace === "home" && (
            <motion.div
              key="home"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.3 }}
            >
              <HomeDashboard
                currentProfile={profile}
                partnerProfile={partnerProfile}
                onNavigate={(tab) => setActiveSpace(tab as AppSpace)}
                allLetters={letters}
              />
            </motion.div>
          )}

          {activeSpace === "love" && (
            <motion.div
              key="love"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.3 }}
            >
              <OurLove
                currentProfile={profile}
                partnerProfile={partnerProfile}
                allLetters={letters}
                onLetterSelect={(l) => setSelectedLetter(l)}
              />
            </motion.div>
          )}

          {activeSpace === "boxes" && (
            <motion.div
              key="boxes"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.3 }}
            >
              <MessageBoxes
                currentProfile={profile}
                partnerProfile={partnerProfile}
              />
            </motion.div>
          )}

          {activeSpace === "memory_book" && (
            <motion.div
              key="memory_book"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.3 }}
            >
              <MemoryBook
                currentProfile={profile}
                partnerProfile={partnerProfile}
              />
            </motion.div>
          )}

          {activeSpace === "wellbeing" && (
            <motion.div
              key="wellbeing"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.3 }}
            >
              <HerWellbeing
                currentProfile={profile}
                partnerProfile={partnerProfile}
                isPartnerView={isAdmin}
              />
            </motion.div>
          )}

          {activeSpace === "future" && (
            <motion.div
              key="future"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.3 }}
            >
              <OurFuture
                currentProfile={profile}
                partnerProfile={partnerProfile}
              />
            </motion.div>
          )}

          {activeSpace === "little" && (
            <motion.div
              key="little"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.3 }}
            >
              <LittleThings
                currentProfile={profile}
                partnerProfile={partnerProfile}
              />
            </motion.div>
          )}

          {activeSpace === "settings" && (
            <motion.div
              key="settings"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.3 }}
            >
              <SettingsScreen
                currentProfile={profile}
                partnerProfile={partnerProfile}
                onPreviewPartnerRole={() => setIsPreviewingPartner(!isPreviewingPartner)}
                isPreviewingPartner={isPreviewingPartner}
              />
            </motion.div>
          )}

          {activeSpace === "admin_centre" && (
            <motion.div
              key="admin_centre"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.3 }}
            >
              <AdminCommandCentre
                currentProfile={profile}
                partnerProfile={partnerProfile}
                onNavigateHome={() => setActiveSpace("home")}
                onReplayOnboarding={() => setShowOnboarding(true)}
              />
            </motion.div>
          )}

          {activeSpace === "write_letter" && (
            <motion.div
              key="write_letter"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.3 }}
            >
              <AdminEditor
                userEmail={user.email || ""}
                userId={user.uid}
                onPublished={() => setActiveSpace("love")}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Letter Reader Modal */}
      {selectedLetter && (
        <LetterReader
          letter={selectedLetter}
          onClose={() => setSelectedLetter(null)}
          currentUserId={user.uid}
        />
      )}

      {/* Signature Experience: Daily Magical Welcome Modal */}
      <AnimatePresence>
        {showDailyWelcome && dailyMessage && (
          <DailyWelcomeModal
            userId={user.uid}
            userRole={effectiveRole}
            dailyMessage={dailyMessage}
            dailySelection={dailySelection}
            onClose={() => {
              setShowDailyWelcome(false);
              setIsDailyDeferred(true);
            }}
            onExploreApp={() => {
              setShowDailyWelcome(false);
              setIsDailyDeferred(false);
            }}
            onSaveToMemoryBook={() => {
              setActiveSpace("memory_book");
            }}
          />
        )}
      </AnimatePresence>

      {/* Interactive First-Time Onboarding Modal */}
      <AnimatePresence>
        {showOnboarding && (
          <OnboardingModal
            userId={user.uid}
            onClose={() => setShowOnboarding(false)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
