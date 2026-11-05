import { useState } from "react";
import { motion } from "motion/react";
import {
  Shield,
  Bell,
  User,
  Heart,
  Lock,
  CheckCircle2,
  LogOut,
  Sparkles,
  Bot
} from "lucide-react";
import GlassPanel from "./GlassPanel";
import { UserProfile } from "../types";
import { auth } from "../lib/firebase";
import { JarvisDashboard } from "./JarvisDashboard";

interface SettingsScreenProps {
  currentProfile: UserProfile | null;
  partnerProfile?: UserProfile | null;
  onPreviewPartnerRole?: () => void;
  isPreviewingPartner?: boolean;
}

export default function SettingsScreen({
  currentProfile,
  partnerProfile,
  onPreviewPartnerRole,
  isPreviewingPartner = false
}: SettingsScreenProps) {
  const [activeTab, setActiveTab] = useState<"general" | "notifications" | "jarvis">("general");
  const [notifyDailyMessage, setNotifyDailyMessage] = useState(true);
  const [notifySpecialDates, setNotifySpecialDates] = useState(true);
  const [notifyQuietHours, setNotifyQuietHours] = useState(true);
  const [toastMsg, setToastMsg] = useState("");

  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(""), 3500);
  };

  const handleSaveNotifications = () => {
    showToast("Discreet notification preferences updated.");
  };

  return (
    <div className="space-y-8 max-w-4xl mx-auto px-4 sm:px-6">
      {/* Title & Navigation Tabs */}
      <div className="border-b border-white/10 pb-6 space-y-4">
        <div>
          <h1 className="text-3xl font-serif-title font-light text-white tracking-tight">
            Settings, Privacy & Permissions
          </h1>
          <p className="text-xs sm:text-sm text-white/60 font-light mt-1">
            Manage your profile, discreet notifications, privacy boundaries, and Jarvis AI ecosystem.
          </p>
        </div>

        {/* Tab Selector */}
        <div className="flex items-center gap-2 overflow-x-auto pt-2">
          <button
            onClick={() => setActiveTab("general")}
            className={`px-4 py-2 rounded-xl text-xs font-medium transition flex items-center gap-1.5 whitespace-nowrap ${
              activeTab === "general"
                ? "bg-rose-500/20 text-rose-200 border border-rose-500/30"
                : "text-white/60 hover:text-white hover:bg-white/5"
            }`}
          >
            <User className="w-3.5 h-3.5" />
            <span>General & Partner</span>
          </button>
          <button
            onClick={() => setActiveTab("notifications")}
            className={`px-4 py-2 rounded-xl text-xs font-medium transition flex items-center gap-1.5 whitespace-nowrap ${
              activeTab === "notifications"
                ? "bg-rose-500/20 text-rose-200 border border-rose-500/30"
                : "text-white/60 hover:text-white hover:bg-white/5"
            }`}
          >
            <Bell className="w-3.5 h-3.5" />
            <span>Discreet Notifications</span>
          </button>
          <button
            onClick={() => setActiveTab("jarvis")}
            className={`px-4 py-2 rounded-xl text-xs font-medium transition flex items-center gap-1.5 whitespace-nowrap ${
              activeTab === "jarvis"
                ? "bg-amber-500/25 text-amber-200 border border-amber-500/40"
                : "text-white/60 hover:text-white hover:bg-white/5"
            }`}
          >
            <Bot className="w-3.5 h-3.5 text-amber-400" />
            <span>Jarvis AI Ecosystem</span>
            <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-amber-500/20 text-amber-300 font-mono">v2.5</span>
          </button>
        </div>
      </div>

      {toastMsg && (
        <motion.div
          initial={{ opacity: 0, y: -5 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-3 bg-emerald-500/20 border border-emerald-500/30 rounded-xl text-center text-emerald-200 text-xs flex items-center justify-center gap-2"
        >
          <CheckCircle2 className="w-4 h-4" />
          <span>{toastMsg}</span>
        </motion.div>
      )}

      {/* Tab: General & Partner */}
      {activeTab === "general" && (
        <div className="space-y-6 animate-fadeIn">
          {/* Profile Card */}
          <GlassPanel className="p-6 rounded-2xl border border-white/10 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-rose-500 to-amber-500 flex items-center justify-center text-white">
                <User className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-lg font-medium text-white">{currentProfile?.displayName || "My Love"}</h3>
                <span className="text-xs text-white/50">{currentProfile?.email}</span>
                <div className="mt-1 flex items-center gap-2">
                  <span className="px-2 py-0.5 rounded-full bg-white/10 text-white/70 text-[10px] uppercase font-mono">
                    Role: {currentProfile?.role === "admin" ? "Owner / Raaziq" : "Partner / Razia"}
                  </span>
                  {isPreviewingPartner && (
                    <span className="px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 text-[10px] font-mono">
                      Partner Preview Active
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Owner partner preview toggle */}
            {currentProfile?.role === "admin" && onPreviewPartnerRole && (
              <div className="pt-4 border-t border-white/10 flex items-center justify-between">
                <div>
                  <strong className="text-xs text-white block">Preview Partner Experience</strong>
                  <span className="text-[11px] text-white/50">
                    Switch perspective to see how Razia views the application without exposing admin editor tools.
                  </span>
                </div>
                <button
                  onClick={onPreviewPartnerRole}
                  className={`px-3 py-1.5 rounded-xl text-xs font-medium border transition-all ${
                    isPreviewingPartner
                      ? "bg-amber-500/30 border-amber-500/50 text-amber-200"
                      : "bg-white/5 border-white/10 text-white/70 hover:text-white"
                  }`}
                >
                  {isPreviewingPartner ? "Exit Preview" : "Preview Partner View"}
                </button>
              </div>
            )}
          </GlassPanel>

          {/* Partner Connection */}
          <GlassPanel className="p-6 rounded-2xl border border-white/10 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-rose-300">
                <Heart className="w-5 h-5 fill-rose-300" />
                <h3 className="text-sm font-medium text-white">Connected Partner</h3>
              </div>
              <span className="text-xs px-2.5 py-0.5 rounded-full bg-emerald-500/15 text-emerald-300 font-mono">
                Paired
              </span>
            </div>
            <p className="text-xs text-white/60">
              Connected with: <strong className="text-white/90">{partnerProfile?.displayName || "Razia"}</strong> ({partnerProfile?.email || "razia@cupid.com"})
            </p>
          </GlassPanel>

          {/* Security & Sign Out */}
          <GlassPanel className="p-6 rounded-2xl border border-white/10 space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <h3 className="text-sm font-medium text-white">Security & Session</h3>
                <span className="text-xs text-white/50">Encrypted transmission, Firebase Auth authenticated</span>
              </div>
              <button
                onClick={() => auth.signOut()}
                className="px-4 py-2 rounded-xl bg-rose-500/20 hover:bg-rose-500/30 border border-rose-500/30 text-rose-300 text-xs font-medium flex items-center gap-2 transition-colors"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>Sign Out</span>
              </button>
            </div>
          </GlassPanel>
        </div>
      )}

      {/* Tab: Discreet Notifications */}
      {activeTab === "notifications" && (
        <div className="space-y-6 animate-fadeIn">
          <GlassPanel className="p-6 rounded-2xl border border-white/10 space-y-4">
            <div className="flex items-center gap-2 text-amber-300">
              <Bell className="w-5 h-5" />
              <h3 className="text-sm font-medium text-white">Discreet Notifications</h3>
            </div>
            <p className="text-xs text-white/50">
              Privacy guarantee: Notifications never show sensitive period or health details in public push banners.
            </p>

            <div className="space-y-3 text-xs">
              <label className="flex items-center justify-between p-3 rounded-xl bg-white/5 border border-white/5 cursor-pointer">
                <div>
                  <strong className="text-white block font-medium">Daily Message Availability</strong>
                  <span className="text-white/50">Gentle ping when today's little box is ready to be opened</span>
                </div>
                <input
                  type="checkbox"
                  checked={notifyDailyMessage}
                  onChange={(e) => setNotifyDailyMessage(e.target.checked)}
                  className="accent-amber-500 rounded"
                />
              </label>

              <label className="flex items-center justify-between p-3 rounded-xl bg-white/5 border border-white/5 cursor-pointer">
                <div>
                  <strong className="text-white block font-medium">Special Milestones & Anniversaries</strong>
                  <span className="text-white/50">Reminders for upcoming anniversary time capsules and planned dates</span>
                </div>
                <input
                  type="checkbox"
                  checked={notifySpecialDates}
                  onChange={(e) => setNotifySpecialDates(e.target.checked)}
                  className="accent-amber-500 rounded"
                />
              </label>

              <label className="flex items-center justify-between p-3 rounded-xl bg-white/5 border border-white/5 cursor-pointer">
                <div>
                  <strong className="text-white block font-medium">Discreet Wording Only</strong>
                  <span className="text-white/50">Never mention medical or period words on lockscreen</span>
                </div>
                <input
                  type="checkbox"
                  checked={notifyQuietHours}
                  onChange={(e) => setNotifyQuietHours(e.target.checked)}
                  className="accent-amber-500 rounded"
                />
              </label>
            </div>

            <div className="flex justify-end pt-2">
              <button
                onClick={handleSaveNotifications}
                className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/15 text-white text-xs font-medium"
              >
                Save Notification Preferences
              </button>
            </div>
          </GlassPanel>
        </div>
      )}

      {/* Tab: Jarvis Ecosystem Dashboard */}
      {activeTab === "jarvis" && (
        <JarvisDashboard />
      )}
    </div>
  );
}
