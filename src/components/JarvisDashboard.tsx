import React, { useState, useEffect } from "react";
import GlassPanel from "./GlassPanel";
import {
  JARVIS_CUPID_TOOLS,
  DEFAULT_JARVIS_CONFIG,
  JarvisPermissionConfig,
  JarvisAuditLog,
  getJarvisAuditLogs,
  executeJarvisTool,
  JarvisToolDefinition
} from "../lib/jarvisIntegration";
import {
  Bot,
  Shield,
  Key,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Lock,
  Copy,
  RefreshCw,
  Play,
  Terminal,
  Activity,
  Sparkles,
  Info
} from "lucide-react";

export const JarvisDashboard: React.FC = () => {
  const [config, setConfig] = useState<JarvisPermissionConfig>(() => {
    const saved = localStorage.getItem("cupid_jarvis_config");
    return saved ? JSON.parse(saved) : DEFAULT_JARVIS_CONFIG;
  });

  const [auditLogs, setAuditLogs] = useState<JarvisAuditLog[]>([]);
  const [copiedKey, setCopiedKey] = useState(false);
  const [copiedConfig, setCopiedConfig] = useState(false);
  const [selectedTool, setSelectedTool] = useState<JarvisToolDefinition>(JARVIS_CUPID_TOOLS[0]);
  const [testToolParams, setTestToolParams] = useState<string>("{}");
  const [testResult, setTestResult] = useState<any>(null);
  const [isExecutingTest, setIsExecutingTest] = useState(false);
  const [isLoadingLogs, setIsLoadingLogs] = useState(false);

  useEffect(() => {
    localStorage.setItem("cupid_jarvis_config", JSON.stringify(config));
  }, [config]);

  const loadLogs = async () => {
    setIsLoadingLogs(true);
    try {
      const logs = await getJarvisAuditLogs(15);
      setAuditLogs(logs);
    } finally {
      setIsLoadingLogs(false);
    }
  };

  useEffect(() => {
    loadLogs();
  }, []);

  const handleCopyKey = () => {
    navigator.clipboard.writeText(config.apiKey);
    setCopiedKey(true);
    setTimeout(() => setCopiedKey(false), 2000);
  };

  const handleCopyFullConfig = () => {
    const bridgeExport = {
      app: "Project Cupid",
      version: "3.0.0",
      ecosystem: "Jarvis v2.5",
      bridgeEndpoint: `${window.location.origin}/api/jarvis/execute`,
      toolsEndpoint: `${window.location.origin}/api/jarvis/tools`,
      healthEndpoint: `${window.location.origin}/api/jarvis/health`,
      apiKey: config.apiKey,
      strictPrivacy: {
        healthAccess: false,
        privateJournalsAccess: false,
        note: "Enforced at API gateway"
      }
    };
    navigator.clipboard.writeText(JSON.stringify(bridgeExport, null, 2));
    setCopiedConfig(true);
    setTimeout(() => setCopiedConfig(false), 2000);
  };

  const handleExecuteTest = async () => {
    setIsExecutingTest(true);
    setTestResult(null);
    try {
      let parsedParams = {};
      try {
        parsedParams = JSON.parse(testToolParams);
      } catch (e) {
        setTestResult({ success: false, error: "Invalid JSON in parameters field" });
        setIsExecutingTest(false);
        return;
      }

      const res = await executeJarvisTool(selectedTool.name, parsedParams, config.apiKey, config);
      setTestResult(res);
      await loadLogs();
    } catch (e: any) {
      setTestResult({ success: false, error: e.message || "Execution failed" });
    } finally {
      setIsExecutingTest(false);
    }
  };

  return (
    <div className="space-y-8 animate-fadeIn">
      {/* Header Banner */}
      <GlassPanel className="p-6 relative overflow-hidden border-rose-300/30">
        <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-bl from-rose-200/20 to-transparent pointer-events-none rounded-bl-full" />
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-start gap-4">
            <div className="p-3 bg-stone-900 text-rose-300 rounded-2xl shadow-lg border border-rose-400/30">
              <Bot className="w-8 h-8" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="font-serif text-2xl text-stone-900 tracking-wide">Jarvis Ecosystem Integration</h2>
                <span className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-100 text-emerald-800 border border-emerald-300">
                  v2.5 Ready
                </span>
              </div>
              <p className="text-sm text-stone-600 mt-1">
                Bi-directional bridge connecting Mohammed's personal AI assistant to Project Cupid.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleCopyFullConfig}
              className="px-3.5 py-2 text-xs font-medium rounded-xl border border-stone-300 bg-white/70 hover:bg-white text-stone-700 shadow-sm transition flex items-center gap-1.5"
            >
              <Copy className="w-3.5 h-3.5" />
              {copiedConfig ? "Config Copied!" : "Export Bridge Config"}
            </button>
            <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold ${
              config.enabled ? "bg-emerald-50 text-emerald-700 border border-emerald-200" : "bg-stone-100 text-stone-600"
            }`}>
              <div className={`w-2 h-2 rounded-full ${config.enabled ? "bg-emerald-500 animate-pulse" : "bg-stone-400"}`} />
              {config.enabled ? "Bridge Active" : "Disabled"}
            </div>
          </div>
        </div>
      </GlassPanel>

      {/* Strict Privacy Shield Banner */}
      <div className="p-4 rounded-2xl bg-amber-50/80 border border-amber-200 text-amber-900 text-sm flex items-start gap-3 shadow-sm">
        <Shield className="w-5 h-5 text-amber-700 mt-0.5 flex-shrink-0" />
        <div className="space-y-1">
          <div className="font-semibold text-amber-950 flex items-center gap-2">
            <span>Strict Privacy Barrier Guaranteed</span>
            <Lock className="w-3.5 h-3.5 text-amber-700" />
          </div>
          <p className="text-xs text-amber-800 leading-relaxed">
            Her menstrual cycle, symptoms, moods, medications, doctor appointments, and private personal journals are
            <strong> strictly walled off</strong>. Jarvis and external APIs cannot query or modify private wellbeing data under any circumstance.
            Only shared relationship memories, draft letters, and appreciation items are permitted.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Permissions & Configuration */}
        <div className="space-y-6 lg:col-span-1">
          <GlassPanel className="p-5 space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-stone-200">
              <h3 className="font-serif text-lg text-stone-900 flex items-center gap-2">
                <Key className="w-4 h-4 text-rose-500" />
                Integration Key
              </h3>
              <button
                onClick={() => setConfig(prev => ({ ...prev, enabled: !prev.enabled }))}
                className={`relative inline-flex h-5 w-10 items-center rounded-full transition-colors ${
                  config.enabled ? "bg-rose-500" : "bg-stone-300"
                }`}
              >
                <span
                  className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform ${
                    config.enabled ? "translate-x-5" : "translate-x-1"
                  }`}
                />
              </button>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-semibold text-stone-700 uppercase tracking-wider">Bridge Secret Token</label>
              <div className="flex items-center gap-2">
                <input
                  type="password"
                  value={config.apiKey}
                  onChange={e => setConfig(prev => ({ ...prev, apiKey: e.target.value }))}
                  className="w-full px-3 py-2 text-xs font-mono bg-white/80 border border-stone-200 rounded-xl focus:ring-2 focus:ring-rose-400 focus:outline-none"
                />
                <button
                  onClick={handleCopyKey}
                  className="p-2 border border-stone-200 rounded-xl bg-white hover:bg-stone-50 text-stone-600 transition"
                  title="Copy Key"
                >
                  <Copy className="w-4 h-4" />
                </button>
              </div>
              {copiedKey && <p className="text-[11px] text-emerald-600 font-medium">Key copied to clipboard!</p>}
            </div>

            {/* Permissions Checkboxes */}
            <div className="space-y-3 pt-2">
              <h4 className="text-xs font-semibold text-stone-700 uppercase tracking-wider">Permitted Capabilities</h4>
              
              <label className="flex items-center justify-between p-2 rounded-xl bg-white/60 border border-stone-100 hover:bg-white text-xs cursor-pointer transition">
                <span className="text-stone-800">Draft Love Letters</span>
                <input
                  type="checkbox"
                  checked={config.allowDraftLetters}
                  onChange={e => setConfig(c => ({ ...c, allowDraftLetters: e.target.checked }))}
                  className="rounded text-rose-600 focus:ring-rose-500"
                />
              </label>

              <label className="flex items-center justify-between p-2 rounded-xl bg-white/60 border border-stone-100 hover:bg-white text-xs cursor-pointer transition">
                <span className="text-stone-800">Add Relationship Milestones</span>
                <input
                  type="checkbox"
                  checked={config.allowAddMemories}
                  onChange={e => setConfig(c => ({ ...c, allowAddMemories: e.target.checked }))}
                  className="rounded text-rose-600 focus:ring-rose-500"
                />
              </label>

              <label className="flex items-center justify-between p-2 rounded-xl bg-white/60 border border-stone-100 hover:bg-white text-xs cursor-pointer transition">
                <span className="text-stone-800">Add 365 Reasons (Vault)</span>
                <input
                  type="checkbox"
                  checked={config.allowAddAppreciation}
                  onChange={e => setConfig(c => ({ ...c, allowAddAppreciation: e.target.checked }))}
                  className="rounded text-rose-600 focus:ring-rose-500"
                />
              </label>

              <label className="flex items-center justify-between p-2 rounded-xl bg-white/60 border border-stone-100 hover:bg-white text-xs cursor-pointer transition">
                <span className="text-stone-800">Contribute Message Boxes</span>
                <input
                  type="checkbox"
                  checked={config.allowAddMessageBoxes}
                  onChange={e => setConfig(c => ({ ...c, allowAddMessageBoxes: e.target.checked }))}
                  className="rounded text-rose-600 focus:ring-rose-500"
                />
              </label>

              <label className="flex items-center justify-between p-2 rounded-xl bg-white/60 border border-stone-100 hover:bg-white text-xs cursor-pointer transition">
                <span className="text-stone-800">Add Shared Dreams</span>
                <input
                  type="checkbox"
                  checked={config.allowAddDreams}
                  onChange={e => setConfig(c => ({ ...c, allowAddDreams: e.target.checked }))}
                  className="rounded text-rose-600 focus:ring-rose-500"
                />
              </label>

              <label className="flex items-center justify-between p-2 rounded-xl bg-white/60 border border-stone-100 hover:bg-white text-xs cursor-pointer transition">
                <span className="text-stone-800">Add Date Ideas</span>
                <input
                  type="checkbox"
                  checked={config.allowAddDateIdeas}
                  onChange={e => setConfig(c => ({ ...c, allowAddDateIdeas: e.target.checked }))}
                  className="rounded text-rose-600 focus:ring-rose-500"
                />
              </label>

              <label className="flex items-center justify-between p-2 rounded-xl bg-white/60 border border-stone-100 hover:bg-white text-xs cursor-pointer transition">
                <span className="text-stone-800">Query Shared Memories</span>
                <input
                  type="checkbox"
                  checked={config.allowReadSharedMemories}
                  onChange={e => setConfig(c => ({ ...c, allowReadSharedMemories: e.target.checked }))}
                  className="rounded text-rose-600 focus:ring-rose-500"
                />
              </label>

              {/* Locked Off Items */}
              <div className="pt-2 border-t border-stone-200 space-y-2">
                <div className="flex items-center justify-between p-2 rounded-xl bg-stone-100 border border-stone-200 text-xs opacity-75">
                  <span className="flex items-center gap-1.5 text-stone-500 font-medium">
                    <Lock className="w-3 h-3 text-amber-600" />
                    Wife's Health & Cycle Data
                  </span>
                  <span className="text-[10px] uppercase font-bold text-rose-700 bg-rose-50 px-2 py-0.5 rounded border border-rose-200">
                    Denied
                  </span>
                </div>

                <div className="flex items-center justify-between p-2 rounded-xl bg-stone-100 border border-stone-200 text-xs opacity-75">
                  <span className="flex items-center gap-1.5 text-stone-500 font-medium">
                    <Lock className="w-3 h-3 text-amber-600" />
                    Private Reflection Journals
                  </span>
                  <span className="text-[10px] uppercase font-bold text-rose-700 bg-rose-50 px-2 py-0.5 rounded border border-rose-200">
                    Denied
                  </span>
                </div>
              </div>
            </div>
          </GlassPanel>
        </div>

        {/* Right Column: Tools Explorer & Interactive Sandbox */}
        <div className="space-y-6 lg:col-span-2">
          {/* Tools Explorer */}
          <GlassPanel className="p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-serif text-lg text-stone-900 flex items-center gap-2">
                <Terminal className="w-4 h-4 text-stone-700" />
                Jarvis Tool Schemas ({JARVIS_CUPID_TOOLS.length})
              </h3>
              <span className="text-xs text-stone-500 font-mono">/api/jarvis/tools</span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {JARVIS_CUPID_TOOLS.map(t => (
                <button
                  key={t.name}
                  onClick={() => {
                    setSelectedTool(t);
                    setTestResult(null);
                    // generate sample params
                    const sample: any = {};
                    Object.keys(t.parameters.properties).forEach(k => {
                      if (k === "title") sample[k] = "Our Special Evening";
                      else if (k === "description") sample[k] = "A warm shared dinner and reflection on our journey.";
                      else if (k === "content") sample[k] = "A little reminder that you are my favorite person in the world.";
                      else if (k === "text") sample[k] = "Because you always know how to make me smile.";
                      else if (k === "date") sample[k] = "November 2026";
                      else if (k === "category") sample[k] = "Compliments";
                      else if (k === "isCostNothing") sample[k] = true;
                      else if (k === "limit") sample[k] = 5;
                    });
                    setTestToolParams(JSON.stringify(sample, null, 2));
                  }}
                  className={`p-2.5 rounded-xl text-left border text-xs transition ${
                    selectedTool.name === t.name
                      ? "border-rose-400 bg-rose-50/70 text-rose-900 font-medium shadow-sm"
                      : "border-stone-200 bg-white/60 hover:bg-white text-stone-700"
                  }`}
                >
                  <div className="font-mono text-[11px] font-semibold truncate">{t.name}</div>
                  <div className="text-[10px] text-stone-500 capitalize">{t.category}</div>
                </button>
              ))}
            </div>

            {/* Selected Tool Details & Interactive Test */}
            <div className="p-4 bg-stone-900 text-stone-100 rounded-2xl space-y-3 font-mono text-xs">
              <div className="flex items-center justify-between text-stone-400 pb-2 border-b border-stone-800">
                <span className="text-rose-300 font-bold">{selectedTool.name}</span>
                <span className="text-[10px] px-2 py-0.5 rounded bg-stone-800 text-stone-300">{selectedTool.category}</span>
              </div>
              <p className="text-stone-300 font-sans text-xs">{selectedTool.description}</p>

              <div>
                <label className="text-[10px] text-stone-400 uppercase tracking-wider block mb-1">
                  Test Execution Payload (JSON)
                </label>
                <textarea
                  rows={4}
                  value={testToolParams}
                  onChange={e => setTestToolParams(e.target.value)}
                  className="w-full bg-stone-950 border border-stone-800 rounded-xl p-2.5 text-xs text-rose-200 focus:outline-none focus:border-rose-500 font-mono"
                />
              </div>

              <div className="flex items-center justify-between pt-1">
                <button
                  disabled={isExecutingTest}
                  onClick={handleExecuteTest}
                  className="px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white rounded-xl text-xs font-semibold font-sans flex items-center gap-1.5 transition disabled:opacity-50"
                >
                  <Play className="w-3.5 h-3.5" />
                  {isExecutingTest ? "Executing..." : "Simulate Jarvis Execution"}
                </button>
                <span className="text-[10px] text-stone-500">Live API Test</span>
              </div>

              {testResult && (
                <div className={`p-3 rounded-xl border mt-2 ${
                  testResult.success
                    ? "bg-emerald-950/60 border-emerald-800/80 text-emerald-200"
                    : "bg-rose-950/60 border-rose-800/80 text-rose-200"
                }`}>
                  <div className="font-bold text-[11px] mb-1">
                    {testResult.success ? "✓ Execution Success" : "✗ Execution Failed"}
                  </div>
                  <pre className="text-[10px] whitespace-pre-wrap overflow-x-auto">
                    {JSON.stringify(testResult, null, 2)}
                  </pre>
                </div>
              )}
            </div>
          </GlassPanel>

          {/* Audit Log Table */}
          <GlassPanel className="p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-serif text-lg text-stone-900 flex items-center gap-2">
                <Activity className="w-4 h-4 text-stone-600" />
                Jarvis Interaction Audit Log
              </h3>
              <button
                onClick={loadLogs}
                disabled={isLoadingLogs}
                className="p-1.5 rounded-lg border border-stone-200 hover:bg-stone-100 text-stone-600 transition"
                title="Refresh audit log"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isLoadingLogs ? "animate-spin" : ""}`} />
              </button>
            </div>

            {auditLogs.length === 0 ? (
              <div className="p-6 text-center text-stone-500 text-xs bg-white/40 rounded-xl border border-stone-100">
                No external Jarvis calls recorded yet. Use the simulator above or configure Jarvis to make its first call.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-stone-200 text-stone-500 font-medium">
                      <th className="pb-2">Time</th>
                      <th className="pb-2">Action / Tool</th>
                      <th className="pb-2">Status</th>
                      <th className="pb-2">Summary</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-stone-100">
                    {auditLogs.map((log, idx) => (
                      <tr key={log.id || idx} className="hover:bg-white/40">
                        <td className="py-2.5 text-stone-500 font-mono text-[11px] whitespace-nowrap">
                          {log.timestamp?.toDate
                            ? log.timestamp.toDate().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                            : "Just now"}
                        </td>
                        <td className="py-2.5 font-mono text-stone-800 text-[11px]">{log.action}</td>
                        <td className="py-2.5">
                          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold ${
                            log.status === "success"
                              ? "bg-emerald-100 text-emerald-800"
                              : log.status === "rejected"
                              ? "bg-amber-100 text-amber-800"
                              : "bg-rose-100 text-rose-800"
                          }`}>
                            {log.status === "success" && <CheckCircle className="w-2.5 h-2.5" />}
                            {log.status === "rejected" && <AlertTriangle className="w-2.5 h-2.5" />}
                            {log.status === "unauthorized" && <XCircle className="w-2.5 h-2.5" />}
                            {log.status}
                          </span>
                        </td>
                        <td className="py-2.5 text-stone-600 truncate max-w-[200px]" title={log.resultSummary}>
                          {log.resultSummary || "Completed"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </GlassPanel>
        </div>
      </div>
    </div>
  );
};
