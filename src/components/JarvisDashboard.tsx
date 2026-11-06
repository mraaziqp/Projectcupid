import React, { useCallback, useEffect, useState } from "react";
import { collection, getDocs, limit, orderBy, query, where } from "firebase/firestore";
import { Bot, RefreshCw, Activity, Shield, Sparkles, Link2, Check, X } from "lucide-react";
import GlassPanel from "./GlassPanel";
import { db, auth } from "../lib/firebase";
import { apiFetch } from "../lib/api";

interface EcoStatus {
  jarvis: {
    url: string; keyConfigured: boolean; inboundKeyConfigured: boolean;
    lastPing: { at: number; ok: boolean; detail: string } | null;
    lastFlush: { at: number; ok: boolean; detail: string; events?: number } | null;
    lastCron: { at: number; ok: boolean; detail: string } | null;
  };
  savestate: { url: string; reachable: boolean; detail: string; linked: boolean };
  today: { day: string; events: number; byKind: Record<string, number> };
  tools: Array<{ name: string; description: string; category: string; needsApproval: boolean }>;
}

const when = (t?: number) => (t ? new Date(t).toLocaleString() : "never");

const Dot = ({ ok }: { ok: boolean | null }) => (
  <span className={`inline-block w-2 h-2 rounded-full ${ok === null ? "bg-stone-400" : ok ? "bg-emerald-400" : "bg-rose-400"}`} />
);

export const JarvisDashboard: React.FC<{ isAdmin?: boolean }> = ({ isAdmin = false }) => {
  const [status, setStatus] = useState<EcoStatus | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [logs, setLogs] = useState<any[]>([]);
  const [proposals, setProposals] = useState<any[]>([]);
  const [note, setNote] = useState("");

  const load = useCallback(async () => {
    setError("");
    try {
      setStatus(await apiFetch<EcoStatus>("ecosystem/status"));
    } catch (e: any) {
      setError(e?.message ?? "Could not load the ecosystem status.");
    }
    const uid = auth.currentUser?.uid;
    if (uid) {
      const p = await getDocs(query(collection(db, "jarvis_proposals"), where("memoryOwnerId", "==", uid), where("status", "==", "pending"), limit(20))).catch(() => null);
      setProposals(p ? p.docs.map((d) => ({ id: d.id, ...d.data() })) : []);
    }
    if (isAdmin) {
      const l = await getDocs(query(collection(db, "jarvis_audit_logs"), orderBy("timestamp", "desc"), limit(15))).catch(() => null);
      setLogs(l ? l.docs.map((d) => ({ id: d.id, ...d.data() })) : []);
    }
  }, [isAdmin]);

  useEffect(() => { load(); }, [load]);

  const syncNow = async () => {
    setBusy(true); setNote("");
    try {
      const r = await apiFetch<any>("ecosystem/sync", { body: {} });
      setNote(r?.heartbeat?.ok ? "Jarvis has today's activity and a fresh heartbeat." : `Jarvis didn't take it: ${r?.heartbeat?.detail ?? "no answer"}`);
      await load();
    } catch (e: any) { setNote(e?.message ?? "Sync failed."); }
    finally { setBusy(false); }
  };

  const decide = async (id: string, approve: boolean) => {
    try {
      await apiFetch("jarvis/proposals/decide", { body: { id, approve } });
      setProposals((p) => p.filter((x) => x.id !== id));
    } catch (e: any) { setNote(e?.message ?? "Could not record that."); }
  };

  return (
    <div className="space-y-6">
      <GlassPanel className="p-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-start gap-4">
            <div className="p-3 bg-stone-900 text-rose-300 rounded-2xl border border-rose-400/30"><Bot className="w-7 h-7" /></div>
            <div>
              <h3 className="text-xl font-serif text-white">Jarvis</h3>
              <p className="text-sm text-white/60 max-w-xl">How Project Cupid talks to Jarvis. Jarvis sees only shared memories and activity counts — never letters' text, private memories or wellbeing data.</p>
            </div>
          </div>
          <div className="flex gap-2">
            <button onClick={load} className="px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-xs text-white/80 hover:bg-white/10 flex items-center gap-1.5"><RefreshCw className="w-3.5 h-3.5" /> Refresh</button>
            {isAdmin && <button onClick={syncNow} disabled={busy} className="px-3 py-2 rounded-xl bg-rose-500/80 text-xs text-white hover:bg-rose-500 disabled:opacity-50 flex items-center gap-1.5"><Activity className="w-3.5 h-3.5" /> {busy ? "Syncing…" : "Sync with Jarvis now"}</button>}
          </div>
        </div>
        {note && <p className="mt-4 text-xs text-amber-200 bg-amber-500/10 border border-amber-500/20 rounded-lg p-2.5">{note}</p>}
        {error && <p className="mt-4 text-xs text-rose-300 bg-rose-500/10 border border-rose-500/20 rounded-lg p-2.5">{error}</p>}
      </GlassPanel>

      {status && (
        <div className="grid md:grid-cols-2 gap-4">
          <GlassPanel className="p-5 space-y-3">
            <div className="flex items-center gap-2 text-white"><Sparkles className="w-4 h-4 text-rose-300" /><span className="font-medium">Jarvis</span><span className="text-[11px] text-white/40 font-mono">{status.jarvis.url.replace(/^https?:\/\//, "")}</span></div>
            <ul className="text-xs text-white/70 space-y-1.5">
              <li className="flex items-center gap-2"><Dot ok={status.jarvis.keyConfigured} /> Cupid → Jarvis key {status.jarvis.keyConfigured ? "configured" : "missing"}</li>
              <li className="flex items-center gap-2"><Dot ok={status.jarvis.inboundKeyConfigured} /> Jarvis → Cupid tool key {status.jarvis.inboundKeyConfigured ? "configured" : "missing"}</li>
              <li className="flex items-center gap-2"><Dot ok={status.jarvis.lastPing ? status.jarvis.lastPing.ok : null} /> Last heartbeat: {when(status.jarvis.lastPing?.at)} {status.jarvis.lastPing && !status.jarvis.lastPing.ok ? `(${status.jarvis.lastPing.detail})` : ""}</li>
              <li className="flex items-center gap-2"><Dot ok={status.jarvis.lastFlush ? status.jarvis.lastFlush.ok : null} /> Last activity log sent: {when(status.jarvis.lastFlush?.at)} {status.jarvis.lastFlush ? `(${status.jarvis.lastFlush.detail})` : ""}</li>
            </ul>
          </GlassPanel>
          <GlassPanel className="p-5 space-y-3">
            <div className="flex items-center gap-2 text-white"><Link2 className="w-4 h-4 text-amber-300" /><span className="font-medium">SaveState</span><span className="text-[11px] text-white/40 font-mono">{status.savestate.url.replace(/^https?:\/\//, "")}</span></div>
            <ul className="text-xs text-white/70 space-y-1.5">
              <li className="flex items-center gap-2"><Dot ok={status.savestate.reachable} /> {status.savestate.reachable ? "Reachable" : "Not reachable"} — {status.savestate.detail}</li>
              <li className="flex items-center gap-2"><Dot ok={status.savestate.linked} /> Your SaveState account is {status.savestate.linked ? "linked (photos and mail work)" : "not linked — link it under the SaveState tab"}</li>
            </ul>
            <p className="text-xs text-white/50">Today: {status.today.events} events logged {Object.keys(status.today.byKind).length ? `(${Object.entries(status.today.byKind).map(([k, v]) => `${k} ${v}`).join(", ")})` : ""}</p>
          </GlassPanel>
        </div>
      )}

      {proposals.length > 0 && (
        <GlassPanel className="p-5 space-y-3">
          <h4 className="text-white font-medium">Jarvis suggestions waiting for you</h4>
          {proposals.map((p) => (
            <div key={p.id} className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-3 rounded-xl bg-white/5 border border-white/10 text-xs text-white/80">
              <div>
                {p.change?.caption && <div>Caption: “{p.change.caption}”</div>}
                {p.change?.addTags?.length > 0 && <div>Add tags: {p.change.addTags.join(", ")}</div>}
                {p.change?.collectionId && <div>Add to a collection</div>}
                {p.reason && <div className="text-white/50">Why: {p.reason}</div>}
              </div>
              <div className="flex gap-2">
                <button onClick={() => decide(p.id, true)} className="px-3 py-1.5 rounded-lg bg-emerald-500/80 text-white flex items-center gap-1"><Check className="w-3 h-3" /> Approve</button>
                <button onClick={() => decide(p.id, false)} className="px-3 py-1.5 rounded-lg bg-white/10 text-white flex items-center gap-1"><X className="w-3 h-3" /> Decline</button>
              </div>
            </div>
          ))}
        </GlassPanel>
      )}

      {status && (
        <GlassPanel className="p-5">
          <h4 className="text-white font-medium mb-3 flex items-center gap-2"><Shield className="w-4 h-4 text-emerald-300" /> What Jarvis is allowed to do ({status.tools.length} tools)</h4>
          <div className="grid sm:grid-cols-2 gap-2">
            {status.tools.map((t) => (
              <div key={t.name} className="p-2.5 rounded-lg bg-white/5 border border-white/5">
                <div className="font-mono text-[11px] text-rose-200">{t.name}{t.needsApproval ? " · needs your approval" : ""}</div>
                <div className="text-[11px] text-white/60">{t.description}</div>
              </div>
            ))}
          </div>
        </GlassPanel>
      )}

      {isAdmin && logs.length > 0 && (
        <GlassPanel className="p-5">
          <h4 className="text-white font-medium mb-3">Recent Jarvis calls</h4>
          <ul className="space-y-1 text-[11px] font-mono text-white/70">
            {logs.map((l) => (
              <li key={l.id}>{l.timestamp?.toDate?.()?.toLocaleString?.() ?? ""} · {l.action} · <span className={l.status === "success" ? "text-emerald-300" : "text-rose-300"}>{l.status}</span> · {l.resultSummary}</li>
            ))}
          </ul>
        </GlassPanel>
      )}
    </div>
  );
};

export default JarvisDashboard;
