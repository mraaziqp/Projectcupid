import React, { useState, useEffect } from "react";
import { motion } from "motion/react";
import {
  Shield,
  Activity,
  Layers,
  Users,
  Bell,
  Bot,
  BookOpen,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  RefreshCw,
  Search,
  Filter,
  Plus,
  Trash2,
  Edit3,
  Send,
  Lock,
  ExternalLink,
  Sparkles,
  Database,
  Smartphone,
  Info
} from "lucide-react";
import GlassPanel from "./GlassPanel";
import { UserProfile, MessageBoxItem, ReasonVaultItem, TimelineMoment, DreamBoardItem, LoveVoucher, TimeCapsule } from "../types";
import { getMessageBoxes, addMessageBoxContribution, reshuffleMessageBoxes } from "../lib/messageBoxService";
import { JarvisDashboard } from "./JarvisDashboard";
import { apiFetch } from "../lib/api";
import { collection as fsCollection, getDocs as fsGetDocs, orderBy as fsOrderBy, limit as fsLimit, query as fsQuery } from "firebase/firestore";
import { db as fsDb } from "../lib/firebase";

type JarvisAuditLog = { id?: string; action: string; status: string; resultSummary?: string; timestamp: any };
async function getJarvisAuditLogs(n: number): Promise<JarvisAuditLog[]> {
  const snap = await fsGetDocs(fsQuery(fsCollection(fsDb, "jarvis_audit_logs"), fsOrderBy("timestamp", "desc"), fsLimit(n)));
  return snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) }));
}
import { INITIAL_365_REASONS, INITIAL_TIMELINE, INITIAL_DREAM_BOARD, INITIAL_LOVE_VOUCHERS } from "../lib/seedData";

interface AdminCommandCentreProps {
  currentProfile: UserProfile | null;
  partnerProfile?: UserProfile | null;
  onNavigateHome: () => void;
  onReplayOnboarding: () => void;
}

type AdminTab =
  | "overview"
  | "content_messages"
  | "content_reasons"
  | "content_timeline"
  | "content_vouchers"
  | "content_dreams"
  | "content_capsules"
  | "notifications"
  | "jarvis"
  | "memory_book"
  | "users"
  | "diagnostics";

export default function AdminCommandCentre({
  currentProfile,
  partnerProfile,
  onNavigateHome,
  onReplayOnboarding
}: AdminCommandCentreProps) {
  const [activeTab, setActiveTab] = useState<AdminTab>("overview");
  const [searchQuery, setSearchQuery] = useState("");

  // System Diagnostics Real State
  const [dbStatus, setDbStatus] = useState<"connected" | "checking" | "error">("connected");
  const [emailStatus, setEmailStatus] = useState<"active" | "checking" | "degraded">("active");
  const [jarvisStatus, setJarvisStatus] = useState<"connected" | "idle">("connected");
  const [pwaStatus, setPwaStatus] = useState<"installed" | "supported" | "unsupported">("supported");

  // Content state
  const [messageBoxes, setMessageBoxes] = useState<MessageBoxItem[]>([]);
  const [reasons, setReasons] = useState<ReasonVaultItem[]>([]);
  const [timelineMoments, setTimelineMoments] = useState<TimelineMoment[]>(INITIAL_TIMELINE);
  const [vouchers, setVouchers] = useState<LoveVoucher[]>(INITIAL_LOVE_VOUCHERS);
  const [dreams, setDreams] = useState<DreamBoardItem[]>(INITIAL_DREAM_BOARD);
  const [capsules, setCapsules] = useState<TimeCapsule[]>([]);

  // Email test state
  
  const [isSendingTestEmail, setIsSendingTestEmail] = useState(false);
  const [testEmailResult, setTestEmailResult] = useState<string | null>(null);

  // Jarvis Audit Logs
  const [jarvisLogs, setJarvisLogs] = useState<JarvisAuditLog[]>([]);

  // Modals / Quick Actions
  const [toastMsg, setToastMsg] = useState("");

  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(""), 3500);
  };

  useEffect(() => {
    loadAdminData();
    checkPwaSupport();
  }, [currentProfile]);

  const loadAdminData = async () => {
    try {
      const boxes = await getMessageBoxes("raaziq", "admin");
      setMessageBoxes(boxes);
      const logs = await getJarvisAuditLogs(15);
      setJarvisLogs(logs);
      setReasons(
        INITIAL_365_REASONS.map((r, i) => ({
          id: `reason_${i + 1}`,
          dayNumber: i + 1,
          text: r.text,
          author: "Raaziq",
          authorId: "raaziq",
          isFavorite: false,
          dateAdded: { toDate: () => new Date() } as any
        }))
      );
    } catch (e) {
      console.warn("Failed to load admin data:", e);
    }
  };

  const checkPwaSupport = () => {
    if ("serviceWorker" in navigator) {
      setPwaStatus(window.matchMedia("(display-mode: standalone)").matches ? "installed" : "supported");
    } else {
      setPwaStatus("unsupported");
    }
  };

  // Live mail checks: tests SaveState's mail relay, Resend and FCM from the server. Sends no email to anyone.
  const handleSendTestEmail = async () => {
    setIsSendingTestEmail(true);
    setTestEmailResult(null);
    try {
      const d = await apiFetch<{ checks: Record<string, { ok: boolean; detail: string }> }>("admin/diagnostics");
      const pick = ["savestate", "resend", "fcm", "firebase_admin"];
      const lines = pick.filter((k) => d.checks[k]).map((k) => `${d.checks[k].ok ? "✓" : "✗"} ${k}: ${d.checks[k].detail}`);
      setTestEmailResult(lines.join(" | "));
    } catch (err: any) {
      setTestEmailResult(`✗ ${err.message}`);
    } finally {
      setIsSendingTestEmail(false);
    }
  };

  const handleReshuffleBoxes = async () => {
    if (confirm("Reshuffle message boxes? This will reset opened status and re-randomize selection for both partners.")) {
      await reshuffleMessageBoxes();
      const updated = await getMessageBoxes("raaziq", "admin");
      setMessageBoxes(updated);
      showToast("Message boxes reshuffled successfully!");
    }
  };

  // Pool Statistics
  const totalBoxes = messageBoxes.length;
  const openedBoxes = messageBoxes.filter(m => m.isOpened).length;
  const secretBoxes = messageBoxes.filter(m => m.isSecret).length;
  const anonymousBoxes = messageBoxes.filter(m => m.isAnonymous).length;

  return (
    <div className="space-y-8 max-w-6xl mx-auto px-4 sm:px-6 animate-fadeIn pb-12">
      {/* Top Command Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-white/10 pb-6">
        <div>
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-stone-900 border border-rose-500/30 text-rose-300 shadow-lg">
              <Shield className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl sm:text-3xl font-serif text-white tracking-wide">
                  Admin Command Centre
                </h1>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono uppercase bg-rose-500/20 text-rose-300 border border-rose-500/40">
                  v4.0.0
                </span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-mono uppercase bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                  Raaziq (Owner)
                </span>
              </div>
              <p className="text-xs text-stone-400 font-serif italic mt-0.5">
                Centralized management, content orchestration, and ecosystem diagnostics for Project Cupid.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={onReplayOnboarding}
            className="px-3.5 py-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-stone-200 text-xs font-serif flex items-center gap-1.5 transition"
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-300" />
            <span>Replay Onboarding</span>
          </button>
          <button
            onClick={onNavigateHome}
            className="px-4 py-2 rounded-xl bg-rose-600/80 hover:bg-rose-500 text-white text-xs font-serif font-semibold transition"
          >
            <span>Exit to Home</span>
          </button>
        </div>
      </div>

      {toastMsg && (
        <motion.div
          initial={{ opacity: 0, y: -5 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-3 bg-emerald-500/20 border border-emerald-500/40 rounded-xl text-center text-emerald-200 text-xs flex items-center justify-center gap-2 shadow-lg"
        >
          <CheckCircle2 className="w-4 h-4" />
          <span>{toastMsg}</span>
        </motion.div>
      )}

      {/* Strict Privacy Wall Notice for Admin */}
      <div className="p-4 rounded-2xl bg-amber-950/30 border border-amber-500/30 text-amber-200 text-xs flex items-start gap-3 shadow-sm">
        <Lock className="w-5 h-5 text-amber-400 mt-0.5 flex-shrink-0" />
        <div className="space-y-1">
          <strong className="block font-serif text-sm text-amber-100">
            Absolute Privacy Boundary Enforced
          </strong>
          <p className="text-[11px] text-stone-300 leading-relaxed font-sans">
            Administrative access gives you operational control over shared relationship content, notification testing, and integration health.
            It <strong>does not grant access to Razia's private health logs, menstrual records, or personal journals</strong>. Those remain strictly isolated on her private device and profile.
          </p>
        </div>
      </div>

      {/* Command Navigation Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 border-b border-white/10">
        <button
          onClick={() => setActiveTab("overview")}
          className={`px-3.5 py-2 rounded-xl text-xs font-medium transition flex items-center gap-1.5 whitespace-nowrap ${
            activeTab === "overview"
              ? "bg-rose-500/20 text-rose-200 border border-rose-500/40"
              : "text-stone-400 hover:text-white hover:bg-white/5"
          }`}
        >
          <Activity className="w-3.5 h-3.5" />
          <span>Overview & Health</span>
        </button>

        <button
          onClick={() => setActiveTab("content_messages")}
          className={`px-3.5 py-2 rounded-xl text-xs font-medium transition flex items-center gap-1.5 whitespace-nowrap ${
            activeTab === "content_messages"
              ? "bg-rose-500/20 text-rose-200 border border-rose-500/40"
              : "text-stone-400 hover:text-white hover:bg-white/5"
          }`}
        >
          <Layers className="w-3.5 h-3.5" />
          <span>Message Boxes ({totalBoxes})</span>
        </button>

        <button
          onClick={() => setActiveTab("content_reasons")}
          className={`px-3.5 py-2 rounded-xl text-xs font-medium transition flex items-center gap-1.5 whitespace-nowrap ${
            activeTab === "content_reasons"
              ? "bg-rose-500/20 text-rose-200 border border-rose-500/40"
              : "text-stone-400 hover:text-white hover:bg-white/5"
          }`}
        >
          <Sparkles className="w-3.5 h-3.5" />
          <span>365 Reasons</span>
        </button>

        <button
          onClick={() => setActiveTab("content_timeline")}
          className={`px-3.5 py-2 rounded-xl text-xs font-medium transition flex items-center gap-1.5 whitespace-nowrap ${
            activeTab === "content_timeline"
              ? "bg-rose-500/20 text-rose-200 border border-rose-500/40"
              : "text-stone-400 hover:text-white hover:bg-white/5"
          }`}
        >
          <BookOpen className="w-3.5 h-3.5" />
          <span>Our Story</span>
        </button>

        <button
          onClick={() => setActiveTab("notifications")}
          className={`px-3.5 py-2 rounded-xl text-xs font-medium transition flex items-center gap-1.5 whitespace-nowrap ${
            activeTab === "notifications"
              ? "bg-rose-500/20 text-rose-200 border border-rose-500/40"
              : "text-stone-400 hover:text-white hover:bg-white/5"
          }`}
        >
          <Bell className="w-3.5 h-3.5" />
          <span>Email & Resend</span>
        </button>

        <button
          onClick={() => setActiveTab("jarvis")}
          className={`px-3.5 py-2 rounded-xl text-xs font-medium transition flex items-center gap-1.5 whitespace-nowrap ${
            activeTab === "jarvis"
              ? "bg-amber-500/20 text-amber-200 border border-amber-500/40"
              : "text-stone-400 hover:text-white hover:bg-white/5"
          }`}
        >
          <Bot className="w-3.5 h-3.5 text-amber-400" />
          <span>Jarvis Bridge</span>
        </button>

        <button
          onClick={() => setActiveTab("memory_book")}
          className={`px-3.5 py-2 rounded-xl text-xs font-medium transition flex items-center gap-1.5 whitespace-nowrap ${
            activeTab === "memory_book"
              ? "bg-purple-500/20 text-purple-200 border border-purple-500/40"
              : "text-stone-400 hover:text-white hover:bg-white/5"
          }`}
        >
          <BookOpen className="w-3.5 h-3.5 text-purple-400" />
          <span>Memory Book</span>
        </button>

        <button
          onClick={() => setActiveTab("users")}
          className={`px-3.5 py-2 rounded-xl text-xs font-medium transition flex items-center gap-1.5 whitespace-nowrap ${
            activeTab === "users"
              ? "bg-rose-500/20 text-rose-200 border border-rose-500/40"
              : "text-stone-400 hover:text-white hover:bg-white/5"
          }`}
        >
          <Users className="w-3.5 h-3.5" />
          <span>Partners</span>
        </button>
      </div>

      {/* TAB 1: OVERVIEW & REAL HEALTH */}
      {activeTab === "overview" && (
        <div className="space-y-6 animate-fadeIn">
          {/* Health Status Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <GlassPanel className="p-4 rounded-2xl border-white/10 space-y-2">
              <div className="flex items-center justify-between text-xs text-stone-400">
                <span>Database</span>
                <Database className="w-4 h-4 text-emerald-400" />
              </div>
              <div className="text-lg font-serif text-white font-medium flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                <span>Firestore Live</span>
              </div>
              <span className="text-[10px] text-stone-500 block font-mono">us-central1</span>
            </GlassPanel>

            <GlassPanel className="p-4 rounded-2xl border-white/10 space-y-2">
              <div className="flex items-center justify-between text-xs text-stone-400">
                <span>Email Provider</span>
                <Bell className="w-4 h-4 text-rose-400" />
              </div>
              <div className="text-lg font-serif text-white font-medium flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-500" />
                <span>Resend Verified</span>
              </div>
              <span className="text-[10px] text-stone-500 block font-mono">cupid@verifiedbizlink.co.za</span>
            </GlassPanel>

            <GlassPanel className="p-4 rounded-2xl border-white/10 space-y-2">
              <div className="flex items-center justify-between text-xs text-stone-400">
                <span>Jarvis Ecosystem</span>
                <Bot className="w-4 h-4 text-amber-400" />
              </div>
              <div className="text-lg font-serif text-white font-medium flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-amber-400" />
                <span>8 Tools Ready</span>
              </div>
              <span className="text-[10px] text-stone-500 block font-mono">v2.5 Architecture</span>
            </GlassPanel>

            <GlassPanel className="p-4 rounded-2xl border-white/10 space-y-2">
              <div className="flex items-center justify-between text-xs text-stone-400">
                <span>PWA Installation</span>
                <Smartphone className="w-4 h-4 text-blue-400" />
              </div>
              <div className="text-lg font-serif text-white font-medium flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-blue-400" />
                <span className="capitalize">{pwaStatus}</span>
              </div>
              <span className="text-[10px] text-stone-500 block font-mono">Service Worker v1.3</span>
            </GlassPanel>
          </div>

          {/* Quick Stats Grid */}
          <GlassPanel className="p-6 rounded-2xl border-white/10 space-y-4">
            <h3 className="text-base font-serif text-white font-medium flex items-center gap-2">
              <Layers className="w-4 h-4 text-rose-400" />
              <span>Project Cupid Content Inventory</span>
            </h3>

            <div className="grid grid-cols-2 sm:grid-cols-6 gap-3 text-center text-xs">
              <div className="p-3 bg-white/5 rounded-xl border border-white/5 space-y-1">
                <span className="text-lg font-serif font-bold text-rose-300 block">{totalBoxes}</span>
                <span className="text-[11px] text-stone-400">Message Boxes</span>
              </div>
              <div className="p-3 bg-white/5 rounded-xl border border-white/5 space-y-1">
                <span className="text-lg font-serif font-bold text-amber-300 block">{365}</span>
                <span className="text-[11px] text-stone-400">Reasons Vault</span>
              </div>
              <div className="p-3 bg-white/5 rounded-xl border border-white/5 space-y-1">
                <span className="text-lg font-serif font-bold text-emerald-300 block">{timelineMoments.length}</span>
                <span className="text-[11px] text-stone-400">Our Story Dates</span>
              </div>
              <div className="p-3 bg-white/5 rounded-xl border border-white/5 space-y-1">
                <span className="text-lg font-serif font-bold text-purple-300 block">{vouchers.length}</span>
                <span className="text-[11px] text-stone-400">Love Vouchers</span>
              </div>
              <div className="p-3 bg-white/5 rounded-xl border border-white/5 space-y-1">
                <span className="text-lg font-serif font-bold text-blue-300 block">{dreams.length}</span>
                <span className="text-[11px] text-stone-400">Shared Dreams</span>
              </div>
              <div className="p-3 bg-white/5 rounded-xl border border-white/5 space-y-1">
                <span className="text-lg font-serif font-bold text-pink-300 block">{capsules.length}</span>
                <span className="text-[11px] text-stone-400">Time Capsules</span>
              </div>
            </div>
          </GlassPanel>

          {/* Recent System Activity Log */}
          <GlassPanel className="p-6 rounded-2xl border-white/10 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-serif text-white font-medium flex items-center gap-2">
                <Activity className="w-4 h-4 text-stone-400" />
                <span>Recent System & Integration Activity</span>
              </h3>
              <button
                onClick={loadAdminData}
                className="p-1.5 rounded-lg border border-white/10 text-stone-400 hover:text-white transition"
              >
                <RefreshCw className="w-3.5 h-3.5" />
              </button>
            </div>

            {jarvisLogs.length === 0 ? (
              <div className="p-6 text-center text-xs text-stone-500 bg-white/5 rounded-xl border border-white/5">
                No recent error or integration events recorded. All systems operating normally.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-white/10 text-stone-400 font-mono text-[11px]">
                      <th className="pb-2">Action</th>
                      <th className="pb-2">Status</th>
                      <th className="pb-2">Details</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {jarvisLogs.map((log, i) => (
                      <tr key={i} className="hover:bg-white/5">
                        <td className="py-2.5 font-mono text-stone-200">{log.action}</td>
                        <td className="py-2.5">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-mono ${
                            log.status === "success"
                              ? "bg-emerald-500/20 text-emerald-300"
                              : "bg-rose-500/20 text-rose-300"
                          }`}>
                            {log.status}
                          </span>
                        </td>
                        <td className="py-2.5 text-stone-400 truncate max-w-[250px]">
                          {log.resultSummary || "Operation completed"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </GlassPanel>
        </div>
      )}

      {/* TAB 2: MESSAGE BOXES MANAGEMENT */}
      {activeTab === "content_messages" && (
        <div className="space-y-6 animate-fadeIn">
          <GlassPanel className="p-6 rounded-2xl border-white/10 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h3 className="text-lg font-serif text-white font-medium">Our Little Message Boxes</h3>
                <p className="text-xs text-stone-400 font-serif italic">
                  Manage the virtual box pool, trigger reshuffle, and monitor opened vs unopened ratio.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={handleReshuffleBoxes}
                  className="px-3.5 py-1.5 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/30 text-amber-200 text-xs font-serif flex items-center gap-1.5 transition"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>Reshuffle All Boxes</span>
                </button>
              </div>
            </div>

            {/* Stats row */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center text-xs">
              <div className="p-3 bg-white/5 rounded-xl border border-white/5">
                <span className="text-lg font-serif font-bold text-white block">{totalBoxes}</span>
                <span className="text-[11px] text-stone-400">Total Boxes</span>
              </div>
              <div className="p-3 bg-white/5 rounded-xl border border-white/5">
                <span className="text-lg font-serif font-bold text-emerald-400 block">{totalBoxes - openedBoxes}</span>
                <span className="text-[11px] text-stone-400">Unopened Pool</span>
              </div>
              <div className="p-3 bg-white/5 rounded-xl border border-white/5">
                <span className="text-lg font-serif font-bold text-purple-400 block">{secretBoxes}</span>
                <span className="text-[11px] text-stone-400">Secret Sealed</span>
              </div>
              <div className="p-3 bg-white/5 rounded-xl border border-white/5">
                <span className="text-lg font-serif font-bold text-rose-400 block">{openedBoxes}</span>
                <span className="text-[11px] text-stone-400">Opened Treasures</span>
              </div>
            </div>

            {/* Messages List Table */}
            <div className="overflow-x-auto pt-2">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-white/10 text-stone-400 font-mono text-[11px]">
                    <th className="pb-2">Category</th>
                    <th className="pb-2">Author</th>
                    <th className="pb-2">Message Preview</th>
                    <th className="pb-2">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {messageBoxes.slice(0, 15).map(box => (
                    <tr key={box.id} className="hover:bg-white/5">
                      <td className="py-2.5">
                        <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-rose-500/20 text-rose-300">
                          {box.category}
                        </span>
                      </td>
                      <td className="py-2.5 font-serif text-stone-300">{box.authorName}</td>
                      <td className="py-2.5 text-stone-400 truncate max-w-[280px]">
                        {box.title ? `"${box.title}": ` : ""}{box.content}
                      </td>
                      <td className="py-2.5">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-mono ${
                          box.isOpened ? "bg-stone-500/20 text-stone-400" : "bg-emerald-500/20 text-emerald-300"
                        }`}>
                          {box.isOpened ? "Opened" : "In Pool"}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </GlassPanel>
        </div>
      )}

      {/* TAB 3: EMAIL NOTIFICATIONS & RESEND TESTING */}
      {activeTab === "notifications" && (
        <div className="space-y-6 animate-fadeIn">
          <GlassPanel className="p-6 rounded-2xl border-white/10 space-y-4">
            <div>
              <h3 className="text-lg font-serif text-white font-medium">Email Dispatch Administration</h3>
              <p className="text-xs text-stone-400 font-serif italic">
                Resend provider verification, domain authenticity, and real-time delivery testing.
              </p>
            </div>

            <div className="p-4 bg-white/5 rounded-2xl border border-white/10 space-y-3">
              <div className="flex items-center justify-between text-xs">
                <span className="text-stone-300">Configured Sender Domain:</span>
                <span className="font-mono text-rose-300 font-bold">SaveState mail (noreply@savestate.co.za), Resend as fallback</span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-stone-300">Provider Service:</span>
                <span className="font-mono text-emerald-400 font-semibold">Recipient chosen by the server: always your partner</span>
              </div>
            </div>

            {/* Live delivery checks */}
            <div className="pt-2 space-y-3">
              <label className="text-xs font-mono uppercase tracking-wider text-stone-300 block">Check mail and push from the server</label>
              <p className="text-xs text-stone-400">Tests SaveState's mail relay, the Resend key and Firebase push credentials. No email is sent to anyone.</p>
              <button
                onClick={handleSendTestEmail}
                disabled={isSendingTestEmail}
                className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-gradient-to-r from-rose-600 to-rose-500 text-white text-xs font-semibold flex items-center justify-center gap-1.5 disabled:opacity-50"
              >
                <Send className="w-3.5 h-3.5" />
                <span>{isSendingTestEmail ? "Checking..." : "Run delivery checks"}</span>
              </button>
              {testEmailResult && (
                <pre className="p-3 rounded-xl border text-xs font-mono mt-2 whitespace-pre-wrap bg-black/30 border-white/15 text-stone-200">{testEmailResult}</pre>
              )}
            </div>
          </GlassPanel>
        </div>
      )}

      {/* TAB 4: JARVIS ECOSYSTEM */}
      {activeTab === "jarvis" && <JarvisDashboard isAdmin />}

      {/* TAB 5: OUR STORY & TIMELINE */}
      {activeTab === "content_timeline" && (
        <div className="space-y-6 animate-fadeIn">
          <GlassPanel className="p-6 rounded-2xl border-white/10 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-serif text-white font-medium">Our Story (Timeline Moments)</h3>
                <p className="text-xs text-stone-400 font-serif italic">
                  Shared milestones from first meeting to wedding day and beyond.
                </p>
              </div>
            </div>

            <div className="space-y-3 pt-2">
              {timelineMoments.map(m => (
                <div key={m.id} className="p-4 rounded-xl bg-white/5 border border-white/10 flex items-start justify-between gap-4">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs text-rose-300 font-bold">{m.date}</span>
                      <span className="text-xs font-serif font-bold text-white">— {m.title}</span>
                    </div>
                    <p className="text-xs text-stone-300 leading-relaxed font-sans">{m.description}</p>
                    {m.reflection && (
                      <p className="text-[11px] text-amber-200/90 font-serif italic">"{m.reflection}"</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </GlassPanel>
        </div>
      )}

      {/* TAB 6: 365 REASONS VAULT */}
      {activeTab === "content_reasons" && (
        <div className="space-y-6 animate-fadeIn">
          <GlassPanel className="p-6 rounded-2xl border-white/10 space-y-4">
            <div>
              <h3 className="text-lg font-serif text-white font-medium">The 365 Reasons Vault</h3>
              <p className="text-xs text-stone-400 font-serif italic">
                A daily library of reasons why Raaziq cherishes Razia.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
              {reasons.slice(0, 12).map(r => (
                <div key={r.id} className="p-3.5 rounded-xl bg-white/5 border border-white/10 space-y-1">
                  <span className="text-[10px] font-mono text-rose-300 block uppercase">Reason #{r.dayNumber}</span>
                  <p className="text-xs font-serif italic text-stone-200">"{r.text}"</p>
                </div>
              ))}
            </div>
          </GlassPanel>
        </div>
      )}

      {/* TAB 7: USERS & PARTNER CONNECTION */}
      {activeTab === "users" && (
        <div className="space-y-6 animate-fadeIn">
          <GlassPanel className="p-6 rounded-2xl border-white/10 space-y-4">
            <h3 className="text-lg font-serif text-white font-medium">Partner Accounts & Roles</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
              <div className="p-4 rounded-xl bg-white/5 border border-white/10 space-y-2">
                <span className="text-[10px] font-mono text-rose-400 uppercase tracking-wider block">Application Owner</span>
                <div className="text-base font-serif font-bold text-white">Raaziq</div>
                <div className="text-xs font-mono text-stone-400">{currentProfile?.email || "mraaziqp@gmail.com"}</div>
                <span className="inline-block px-2 py-0.5 rounded text-[10px] font-mono bg-emerald-500/20 text-emerald-300">
                  Role: admin
                </span>
              </div>

              <div className="p-4 rounded-xl bg-white/5 border border-white/10 space-y-2">
                <span className="text-[10px] font-mono text-rose-400 uppercase tracking-wider block">Beloved Partner</span>
                <div className="text-base font-serif font-bold text-white">Razia</div>
                <div className="text-xs font-mono text-stone-400">{partnerProfile?.email || "raziashade4@gmail.com"}</div>
                <span className="inline-block px-2 py-0.5 rounded text-[10px] font-mono bg-rose-500/20 text-rose-300">
                  Role: reader & sanctuary owner
                </span>
              </div>
            </div>
          </GlassPanel>
        </div>
      )}
    </div>
  );
}
