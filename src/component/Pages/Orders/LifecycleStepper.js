import React, { useState, useEffect } from "react";
import {
  CheckCircle2,
  Clock,
  ArrowRight,
  AlertTriangle,
  Lock,
  ChevronDown,
  ChevronUp,
  FileText,
  Check,
  Loader2,
  History
} from "lucide-react";
import axios from "axios";
import { useTheme } from "../../../context/ThemeContext";

const STAGES = [
  { code: "DRAFT", title: "Draft PO", step: 1, desc: "Initial authoring" },
  { code: "CONFIRMED", title: "Confirmed", step: 2, desc: "Internally locked" },
  { code: "RFQ_SENT", title: "RFQ Sent", step: 3, desc: "Vendor pricing" },
  { code: "QUOTE_RECEIVED", title: "Quote Received", step: 4, desc: "Responses captured" },
  { code: "QUOTE_APPROVED", title: "Quote Approved", step: 5, desc: "Terms signed off" },
  { code: "PO_ISSUED", title: "PO Generated", step: 6, desc: "Official binding PO" },
  { code: "PROFORMA", title: "Proforma", step: 7, desc: "Final billing audit" }
];

export default function LifecycleStepper({
  orderId,
  currentStage = "DRAFT",
  lifecycleVersion = 1,
  stageVersion = 1,
  lifecycleLocked = false,
  onTransitionSuccess,
  onOpenQuotes,
  onOpenVersionHistory,
  embedded = false
}) {
  const { isDark } = useTheme();
  const [lifecycleData, setLifecycleData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [transitioning, setTransitioning] = useState(false);
  const [showChecklist, setShowChecklist] = useState(false);
  const [showExpanded, setShowExpanded] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const fetchLifecycle = async () => {
    if (!orderId) return;
    setLoading(true);
    try {
      const res = await axios.get(`${process.env.REACT_APP_NETWORK}/orders/${orderId}/lifecycle`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
          skip_zrok_interstitial: "true"
        }
      });
      setLifecycleData(res.data);
    } catch (err) {
      console.error("Failed to load order lifecycle data:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLifecycle();
  }, [orderId, currentStage, lifecycleVersion]);

  const activeStageCode = (lifecycleData?.current_stage || currentStage || "DRAFT").toUpperCase();
  const activeStageIndex = STAGES.findIndex((s) => s.code === activeStageCode);
  const currentStep = activeStageIndex >= 0 ? activeStageIndex + 1 : 1;
  const nextStage = lifecycleData?.next_stage;
  const isReady = lifecycleData?.is_ready_to_advance;
  const warningLevel = lifecycleData?.warning_level || "NONE";
  const isLocked = lifecycleLocked || lifecycleData?.lifecycle_locked;

  const checks = lifecycleData?.checks || [];
  const passedChecksCount = checks.filter((c) => c.passed).length;
  const totalChecksCount = checks.length;

  const handleAdvance = async () => {
    if (!nextStage || !isReady || isLocked) return;
    setTransitioning(true);
    setErrorMsg("");
    try {
      await axios.post(
        `${process.env.REACT_APP_NETWORK}/orders/${orderId}/transition`,
        {
          target_stage: nextStage,
          expected_version: lifecycleData?.lifecycle_version || lifecycleVersion,
          comment: `Advanced from ${activeStageCode} to ${nextStage} via command stepper`
        },
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`,
            skip_zrok_interstitial: "true"
          }
        }
      );
      fetchLifecycle();
      if (onTransitionSuccess) onTransitionSuccess(nextStage);
    } catch (err) {
      console.error("Stage transition failed:", err);
      setErrorMsg(err.response?.data?.detail || "Failed to advance lifecycle stage.");
    } finally {
      setTransitioning(false);
    }
  };

  const stepperContent = (
    <>
      {/* ── ULTRA-SLIM COMPACT LIFECYCLE BAR ── */}
      <div className="w-full flex flex-col xl:flex-row items-start xl:items-center justify-between gap-2.5">
        {/* Left: Stage Title Badge & Compact Progression Segment */}
        <div className="flex items-center gap-2 flex-wrap min-w-0 flex-1">
          {/* Active Stage Pill */}
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800 font-mono font-bold text-xs flex-none shadow-2xs">
            <Clock size={12} className="text-blue-500" />
            <span>Stage {currentStep}/7:</span>
            <span className="uppercase tracking-wide">{STAGES[activeStageIndex]?.title || activeStageCode}</span>
            <button
              type="button"
              onClick={onOpenVersionHistory}
              title="Click to view full PO version history & lineage"
              className="text-[10px] px-1.5 py-0.5 rounded bg-blue-100 hover:bg-blue-200 dark:bg-blue-900/50 dark:hover:bg-blue-800 text-blue-700 dark:text-blue-300 font-mono ml-0.5 transition inline-flex items-center gap-1 cursor-pointer font-bold border border-blue-200 dark:border-blue-700"
            >
              <History size={10} />
              <span>v{lifecycleData?.stage_version || stageVersion || 1}</span>
            </button>
          </div>

          {isLocked && (
            <span className="flex items-center gap-1 px-2 py-0.5 rounded-lg text-[10px] font-bold bg-rose-500/15 text-rose-600 border border-rose-500/30 flex-none">
              <Lock size={11} />
              <span>LOCKED</span>
            </span>
          )}

          {warningLevel !== "NONE" && (
            <span
              className={`flex items-center gap-1 px-2 py-0.5 rounded-lg text-[10px] font-bold uppercase tracking-wider border flex-none ${
                warningLevel === "CRITICAL"
                  ? "bg-rose-500/10 text-rose-500 border-rose-500/20"
                  : warningLevel === "WARNING"
                  ? "bg-amber-500/10 text-amber-600 border-amber-500/20"
                  : "bg-yellow-500/10 text-yellow-600 border-yellow-500/20"
              }`}
              title="Item edit warning level at this lifecycle stage"
            >
              <AlertTriangle size={11} />
              <span>{warningLevel}</span>
            </span>
          )}

          {/* Compact Horizontal Step Track (Ultra-low profile single row) */}
          <div className="hidden md:flex items-center gap-1 overflow-x-auto no-scrollbar py-0.5 ml-1 flex-1 min-w-0">
            {STAGES.map((s, idx) => {
              const isCompleted = idx < activeStageIndex;
              const isCurrent = idx === activeStageIndex;
              return (
                <div
                  key={s.code}
                  title={`${s.step}. ${s.title} — ${s.desc}`}
                  className={`flex items-center gap-1 px-2 py-0.5 rounded-lg text-[11px] font-bold transition flex-none select-none ${
                    isCurrent
                      ? "bg-blue-600 text-white shadow-xs"
                      : isCompleted
                      ? isDark
                        ? "bg-blue-950/40 text-blue-400 border border-blue-900/50"
                        : "bg-blue-50 text-blue-700 border border-blue-200"
                      : isDark
                      ? "text-slate-500 hover:text-slate-400"
                      : "text-slate-400 hover:text-slate-600"
                  }`}
                >
                  {isCompleted ? (
                    <Check size={11} strokeWidth={3} className="text-emerald-500 dark:text-emerald-400 flex-none" />
                  ) : isCurrent ? (
                    <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse flex-none" />
                  ) : (
                    <span className="opacity-50 text-[10px]">{s.step}.</span>
                  )}
                  <span className="truncate">{s.title}</span>
                  {idx < STAGES.length - 1 && (
                    <span className="text-[9px] opacity-40 ml-0.5 flex-none">›</span>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Right: Actions & Controls */}
        <div className="flex items-center gap-1.5 self-end xl:self-auto flex-wrap">
          {/* Quotes Workspace Button */}
          {(activeStageCode === "RFQ_SENT" || activeStageCode === "QUOTE_RECEIVED" || activeStageCode === "QUOTE_APPROVED") && (
            <button
              type="button"
              onClick={onOpenQuotes}
              className="flex items-center gap-1 px-2.5 py-1 rounded-xl text-xs font-bold border border-blue-500/30 bg-blue-500/10 text-blue-600 dark:text-blue-400 hover:bg-blue-500/20 transition shadow-2xs"
            >
              <FileText size={12} />
              <span>Quotes</span>
            </button>
          )}

          {/* Gate Checklist Dropdown Toggle */}
          {totalChecksCount > 0 && (
            <button
              type="button"
              onClick={() => setShowChecklist(!showChecklist)}
              className={`flex items-center gap-1 px-2.5 py-1 rounded-xl text-xs font-bold border transition shadow-2xs ${
                showChecklist
                  ? "bg-slate-200 dark:bg-slate-800 text-slate-900 dark:text-white"
                  : passedChecksCount === totalChecksCount
                  ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                  : isDark
                  ? "border-slate-800 hover:bg-slate-800 text-slate-300"
                  : "border-slate-200 hover:bg-slate-100 text-slate-700"
              }`}
              title="View requirement checks to advance"
            >
              <span>Checklist ({passedChecksCount}/{totalChecksCount})</span>
              {showChecklist ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
            </button>
          )}

          {/* Advance Stage Button */}
          {nextStage && (
            <button
              type="button"
              onClick={handleAdvance}
              disabled={!isReady || isLocked || transitioning}
              className="flex items-center gap-1.5 px-3 py-1 bg-blue-600 hover:bg-blue-700 active:scale-95 text-white font-bold rounded-xl text-xs transition shadow-xs disabled:opacity-40 disabled:cursor-not-allowed"
              title={
                !isReady
                  ? "Requirements not met. View checklist."
                  : isLocked
                  ? "Locked due to price variance."
                  : `Advance to ${STAGES[activeStageIndex + 1]?.title}`
              }
            >
              {transitioning ? (
                <>
                  <Loader2 size={12} className="animate-spin" />
                  <span>Advancing...</span>
                </>
              ) : (
                <>
                  <span>Advance to {STAGES[activeStageIndex + 1]?.title}</span>
                  <ArrowRight size={12} />
                </>
              )}
            </button>
          )}

          {/* Expand / Collapse Full Diagram Toggle */}
          <button
            type="button"
            onClick={() => setShowExpanded(!showExpanded)}
            className={`p-1.5 rounded-xl border transition ${
              showExpanded
                ? "bg-slate-200 dark:bg-slate-800 text-slate-900 dark:text-white"
                : isDark
                ? "border-slate-800 hover:bg-slate-800 text-slate-400"
                : "border-slate-200 hover:bg-slate-100 text-slate-500"
            }`}
            title={showExpanded ? "Collapse lifecycle diagram" : "Expand full lifecycle diagram with subtitles"}
          >
            {showExpanded ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
          </button>
        </div>
      </div>

      {/* Error Banner */}
      {errorMsg && (
        <div className="p-2.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-500 text-xs flex items-center gap-2">
          <AlertTriangle size={13} className="flex-none" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Gate Checklist Dropdown Panel */}
      {showChecklist && (
        <div
          className={`p-3 rounded-xl border space-y-2 text-xs transition-all animate-in fade-in duration-150 ${
            isDark ? "bg-slate-950/80 border-slate-800" : "bg-slate-50 border-slate-200"
          }`}
        >
          <div className="font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider text-[10px]">
            Requirements to advance from {STAGES[activeStageIndex]?.title} → {STAGES[activeStageIndex + 1]?.title || "Completion"}:
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
            {checks.map((chk, i) => (
              <div key={i} className="flex items-center gap-2">
                {chk.passed ? (
                  <CheckCircle2 size={13} className="text-emerald-500 flex-none" />
                ) : (
                  <div className="w-3 h-3 rounded-full border-2 border-amber-500 flex-none" />
                )}
                <span className={`font-medium ${chk.passed ? "text-slate-700 dark:text-slate-300" : "text-amber-600 dark:text-amber-400 font-bold"}`}>
                  {chk.label}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── EXPANDED 7-STEP HORIZONTAL DIAGRAM (Only visible when user toggles showExpanded) ── */}
      {showExpanded && (
        <div className="relative pt-3 pb-2 border-t border-slate-200/60 dark:border-slate-800/80 overflow-x-auto no-scrollbar animate-in fade-in duration-150">
          <div className="min-w-[680px] flex items-center justify-between relative">
            {/* Connector Track */}
            <div className="absolute top-4 left-4 right-4 h-1 bg-slate-200 dark:bg-slate-800 -z-0" />

            {/* Active Colored Track */}
            <div
              className="absolute top-4 left-4 h-1 bg-blue-600 transition-all duration-300 -z-0"
              style={{
                width: `${(Math.max(0, activeStageIndex) / (STAGES.length - 1)) * 100}%`
              }}
            />

            {STAGES.map((s, idx) => {
              const isCompleted = idx < activeStageIndex;
              const isCurrent = idx === activeStageIndex;

              return (
                <div key={s.code} className="flex flex-col items-center relative z-10 group min-w-[80px]">
                  {/* Step Circle Indicator */}
                  <div
                    className={`w-7 h-7 rounded-full flex items-center justify-center font-mono text-xs font-black transition-all ${
                      isCompleted
                        ? "bg-blue-600 text-white shadow-xs"
                        : isCurrent
                        ? "bg-white dark:bg-slate-900 border-2 border-blue-600 text-blue-600 shadow-md ring-4 ring-blue-500/20"
                        : isDark
                        ? "bg-slate-800 text-slate-500 border border-slate-700"
                        : "bg-slate-100 text-slate-400 border border-slate-200"
                    }`}
                  >
                    {isCompleted ? <Check size={12} strokeWidth={3} /> : <span>{s.step}</span>}
                  </div>

                  {/* Step Title */}
                  <span
                    className={`mt-1.5 text-[11px] font-bold text-center tracking-tight ${
                      isCurrent
                        ? "text-blue-600 dark:text-blue-400 font-black"
                        : isCompleted
                        ? isDark
                          ? "text-slate-300"
                          : "text-slate-800"
                        : "text-slate-400"
                    }`}
                  >
                    {s.title}
                  </span>

                  {/* Step Subtitle / Note */}
                  <span className="text-[9px] text-slate-400 dark:text-slate-500 font-medium">
                    {s.desc}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </>
  );

  if (embedded) {
    return <div className="w-full space-y-2">{stepperContent}</div>;
  }

  return (
    <div
      className={`w-full rounded-2xl border p-2.5 sm:p-3 transition-all shadow-xs space-y-2 ${
        isDark ? "bg-slate-900/90 border-slate-800" : "bg-white border-slate-200"
      }`}
    >
      {stepperContent}
    </div>
  );
}
