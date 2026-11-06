import { useCallback, useEffect, useState } from "react";
import { CheckCircle2, XCircle, RefreshCw, Loader2, User } from "lucide-react";
import GlassPanel from "./GlassPanel";
import { apiFetch } from "../lib/api";

type Check = { ok: boolean; detail: string };
type Person = { name: string; email: string; role: string; savestateLinked: boolean; pushOn: boolean; emailOn: boolean };
interface Diagnostics { ok: boolean; at: string; checks: Record<string, Check>; people?: Person[] }

/** Each row is several checks; it is active only when all of them pass. */
const ROWS: Array<{ name: string; what: string; keys: string[] }> = [
  { name: "Email", what: "Sends letters and notes to each other's inbox", keys: ["resend"] },
  { name: "SaveState", what: "Sign-in, profile pictures and photo storage", keys: ["savestate", "session_secret", "album_pin"] },
  { name: "Database", what: "Letters, memories and everything else", keys: ["firebase_admin", "firestore_named_db"] },
  { name: "Sign-in", what: "Google and SaveState accounts", keys: ["auth"] },
  { name: "Phone notifications", what: "Push alerts to your phones", keys: ["fcm", "vapid_key"] },
  { name: "Letter drafting", what: "Gemini helps refine and proofread", keys: ["gemini"] },
  { name: "Jarvis: activity", what: "Cupid sends Jarvis its heartbeat and logs", keys: ["jarvis"] },
  { name: "Jarvis: tools", what: "Lets Jarvis call Cupid's tools", keys: ["jarvis_api_key"] },
  { name: "Wedding photos", what: "Public photos from the wedding site", keys: ["weddingapp"] },
  { name: "Memory bridge", what: "Other apps can add to the Memory Book", keys: ["bridge_secret"] },
  { name: "Daily sync", what: "The nightly job that sends logs to Jarvis", keys: ["cron_secret"] },
];

/** Every connection, tested live from the server. Secret values are never shown. */
export default function ConnectionsPanel() {
  const [data, setData] = useState<Diagnostics | null>(null);
  const [busy, setBusy] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setBusy(true);
    setError(null);
    try { setData(await apiFetch<Diagnostics>("admin/diagnostics")); }
    catch (e: any) { setError(e?.message ?? "Couldn't run the checks."); }
    finally { setBusy(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const rows = data ? ROWS.map((r) => {
    const checks = r.keys.map((k) => data.checks[k]).filter(Boolean);
    const failing = checks.filter((c) => !c.ok);
    return { ...r, ok: checks.length > 0 && failing.length === 0, detail: (failing[0] ?? checks[0])?.detail ?? "not checked" };
  }) : [];
  const active = rows.filter((r) => r.ok).length;

  return (
    <div className="space-y-4">
      <GlassPanel className="p-5 sm:p-6 space-y-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h3 className="text-lg font-serif text-white">Connections</h3>
            <p className="text-xs text-white/60">{data ? `${active} of ${rows.length} active · checked ${new Date(data.at).toLocaleTimeString()}` : "Checking every service live…"}</p>
          </div>
          <button onClick={load} disabled={busy} className="px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-xs text-white/85 flex items-center gap-1.5 disabled:opacity-50">
            {busy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />} Check again
          </button>
        </div>
        {error && <p className="text-xs text-rose-200 bg-rose-500/10 border border-rose-500/20 rounded-lg p-3">{error}</p>}
        <ul className="divide-y divide-white/5">
          {rows.map((r) => (
            <li key={r.name} className="py-3 flex items-start gap-3">
              {r.ok ? <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" /> : <XCircle className="w-5 h-5 text-rose-400 shrink-0" />}
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-sm text-white">{r.name}</span>
                  <span className={`text-[11px] px-2 py-0.5 rounded-full shrink-0 ${r.ok ? "bg-emerald-500/15 text-emerald-300" : "bg-rose-500/15 text-rose-300"}`}>{r.ok ? "Active" : "Not connected"}</span>
                </div>
                <p className="text-xs text-white/60">{r.what}</p>
                <p className="text-[11px] text-white/50 break-words">{r.detail}</p>
              </div>
            </li>
          ))}
        </ul>
      </GlassPanel>

      {data?.people && data.people.length > 0 && (
        <GlassPanel className="p-5 sm:p-6 space-y-3">
          <h3 className="text-lg font-serif text-white">The two of you</h3>
          {data.people.map((p) => (
            <div key={p.email} className="p-3 rounded-xl bg-white/5 border border-white/5">
              <div className="flex items-center gap-2 text-sm text-white"><User className="w-4 h-4 text-rose-300" /> {p.name}<span className="text-[11px] text-white/50 truncate">{p.email}</span></div>
              <div className="flex flex-wrap gap-1.5 mt-2 text-[11px]">
                {[["SaveState", p.savestateLinked], ["Phone notifications", p.pushOn], ["Email", p.emailOn]].map(([label, on]) => (
                  <span key={String(label)} className={`px-2 py-0.5 rounded-full ${on ? "bg-emerald-500/15 text-emerald-300" : "bg-white/10 text-white/60"}`}>{String(label)}: {on ? "on" : "off"}</span>
                ))}
              </div>
            </div>
          ))}
        </GlassPanel>
      )}
    </div>
  );
}
