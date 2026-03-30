"use client";

import { useState } from "react";
import {
  LayoutDashboard,
  ChevronDown,
  CheckCircle2,
  Circle,
  Loader2,
  AlertTriangle,
  FlaskConical,
  Ban,
  Wrench,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  phases,
  testScenarios,
  blockers,
  getPhaseProgress,
  getOverallProgress,
  getTestSummary,
} from "@/lib/debug/tracker-data";
import type { FeatureStatus, TestStatus } from "@/lib/debug/tracker-data";

const IS_DEV = process.env.NODE_ENV === "development";

export function ProjectTracker() {
  const [open, setOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<"roadmap" | "tests" | "blockers">("roadmap");

  if (!IS_DEV) return null;

  const overall = getOverallProgress();
  const testSummary = getTestSummary();

  return (
    <>
      {/* Floating trigger */}
      <button
        onClick={() => setOpen(true)}
        className="fixed bottom-24 right-14 z-50 flex h-8 items-center gap-1.5 rounded-full bg-indigo-600 px-3 text-white shadow-lg transition-opacity hover:opacity-90 md:bottom-4"
        title="Project Tracker"
      >
        <LayoutDashboard className="h-3.5 w-3.5" />
        <span className="text-[11px] font-medium">{overall}%</span>
      </button>

      {/* Panel overlay */}
      {open && (
        <div className="fixed inset-0 z-[100] flex items-end justify-center md:items-center">
          <div className="absolute inset-0 bg-black/20 backdrop-blur-sm" onClick={() => setOpen(false)} />
          <div className="relative mx-auto w-full max-w-lg rounded-t-3xl bg-white shadow-2xl md:max-h-[80vh] md:rounded-2xl max-h-[90vh] flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between border-b px-4 py-3">
              <div>
                <h2 className="text-sm font-semibold">CookGenie Project Tracker</h2>
                <p className="text-[11px] text-gray-500">
                  {overall}% complete · {testSummary.passing}/{testSummary.total} tests passing
                </p>
              </div>
              <button onClick={() => setOpen(false)} className="rounded-full p-1.5 hover:bg-gray-100">
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Overall progress bar */}
            <div className="px-4 pt-3">
              <div className="h-2 w-full rounded-full bg-gray-100">
                <div
                  className="h-2 rounded-full bg-indigo-500 transition-all"
                  style={{ width: `${overall}%` }}
                />
              </div>
            </div>

            {/* Tabs */}
            <div className="flex gap-1 px-4 pt-3">
              {(["roadmap", "tests", "blockers"] as const).map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={cn(
                    "rounded-full px-3 py-1.5 text-[11px] font-medium transition-colors",
                    activeTab === tab
                      ? "bg-indigo-100 text-indigo-700"
                      : "text-gray-500 hover:bg-gray-100"
                  )}
                >
                  {tab === "roadmap" && "Roadmap"}
                  {tab === "tests" && `Tests (${testSummary.passing}/${testSummary.total})`}
                  {tab === "blockers" && `Blockers (${blockers.length})`}
                </button>
              ))}
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto px-4 py-3 space-y-2">
              {activeTab === "roadmap" && <RoadmapTab />}
              {activeTab === "tests" && <TestsTab />}
              {activeTab === "blockers" && <BlockersTab />}
            </div>
          </div>
        </div>
      )}
    </>
  );
}

// ─── Roadmap Tab ────────────────────────────────────

function RoadmapTab() {
  return (
    <div className="space-y-2">
      {phases.map((phase) => (
        <PhaseCard key={phase.id} phase={phase} />
      ))}
    </div>
  );
}

function PhaseCard({ phase }: { phase: typeof phases[0] }) {
  const [expanded, setExpanded] = useState(phase.status === "in_progress");
  const progress = getPhaseProgress(phase);

  return (
    <div className="rounded-xl border border-gray-200 bg-white">
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex w-full items-center gap-2.5 px-3 py-2.5"
      >
        <StatusIcon status={phase.status} size="md" />
        <div className="flex-1 text-left">
          <span className="text-xs font-semibold text-gray-900">{phase.name}</span>
          <div className="mt-1 flex items-center gap-2">
            <div className="h-1 flex-1 rounded-full bg-gray-100">
              <div
                className={cn(
                  "h-1 rounded-full transition-all",
                  progress === 100 ? "bg-green-500" : "bg-indigo-500"
                )}
                style={{ width: `${progress}%` }}
              />
            </div>
            <span className="text-[10px] tabular-nums text-gray-400">{progress}%</span>
          </div>
        </div>
        <ChevronDown className={cn("h-3.5 w-3.5 text-gray-400 transition-transform", expanded && "rotate-180")} />
      </button>

      {expanded && (
        <div className="border-t border-gray-100 px-3 py-2 space-y-1">
          {phase.features.map((f) => (
            <div key={f.name} className="flex items-center gap-2 py-0.5">
              <StatusIcon status={f.status} size="sm" />
              <span className="flex-1 text-[11px] text-gray-700">{f.name}</span>
              <StatusLabel status={f.status} />
              {f.notes && (
                <span className="max-w-24 truncate text-[9px] text-gray-400" title={f.notes}>
                  {f.notes}
                </span>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Tests Tab ──────────────────────────────────────

function TestsTab() {
  const categories = ["rescue", "substitution", "transformation", "integration"] as const;

  return (
    <div className="space-y-3">
      {categories.map((cat) => {
        const scenarios = testScenarios.filter((t) => t.category === cat);
        const passing = scenarios.filter((t) => t.status === "passing").length;
        return (
          <div key={cat}>
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[11px] font-semibold text-gray-600 capitalize">{cat}</span>
              <span className="text-[10px] text-gray-400">{passing}/{scenarios.length} passing</span>
            </div>
            <div className="space-y-1">
              {scenarios.map((scenario) => (
                <div key={scenario.id} className="flex items-center gap-2 rounded-lg bg-gray-50 px-2.5 py-1.5">
                  <TestStatusIcon status={scenario.status} />
                  <span className="flex-1 text-[11px] text-gray-700">{scenario.name}</span>
                  <TestStatusLabel status={scenario.status} />
                  {scenario.notes && (
                    <span className="max-w-28 truncate text-[9px] text-gray-400" title={scenario.notes}>
                      {scenario.notes}
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ─── Blockers Tab ───────────────────────────────────

function BlockersTab() {
  if (blockers.length === 0) {
    return <p className="py-8 text-center text-xs text-gray-400">No active blockers</p>;
  }

  return (
    <div className="space-y-2">
      {blockers.map((b) => (
        <div
          key={b.id}
          className={cn(
            "rounded-xl border p-3",
            b.severity === "high" ? "border-red-200 bg-red-50" : b.severity === "medium" ? "border-amber-200 bg-amber-50" : "border-gray-200 bg-gray-50"
          )}
        >
          <div className="flex items-start gap-2">
            <AlertTriangle className={cn(
              "mt-0.5 h-3.5 w-3.5 shrink-0",
              b.severity === "high" ? "text-red-500" : b.severity === "medium" ? "text-amber-500" : "text-gray-400"
            )} />
            <div>
              <p className="text-[11px] text-gray-800">{b.description}</p>
              {b.relatedFeature && (
                <p className="mt-0.5 text-[10px] text-gray-500">Related: {b.relatedFeature}</p>
              )}
            </div>
            <span className={cn(
              "ml-auto shrink-0 rounded-full px-1.5 py-0.5 text-[9px] font-bold uppercase",
              b.severity === "high" ? "bg-red-100 text-red-700" : b.severity === "medium" ? "bg-amber-100 text-amber-700" : "bg-gray-100 text-gray-600"
            )}>
              {b.severity}
            </span>
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── Status Icons & Labels ──────────────────────────

const featureStatusConfig: Record<FeatureStatus, { icon: typeof CheckCircle2; color: string; label: string }> = {
  complete: { icon: CheckCircle2, color: "text-green-500", label: "Done" },
  in_progress: { icon: Loader2, color: "text-indigo-500", label: "WIP" },
  needs_testing: { icon: FlaskConical, color: "text-amber-500", label: "Test" },
  needs_refinement: { icon: Wrench, color: "text-orange-500", label: "Refine" },
  blocked: { icon: Ban, color: "text-red-500", label: "Blocked" },
  not_started: { icon: Circle, color: "text-gray-300", label: "Todo" },
};

function StatusIcon({ status, size }: { status: FeatureStatus; size: "sm" | "md" }) {
  const config = featureStatusConfig[status];
  const Icon = config.icon;
  const cls = size === "md" ? "h-4 w-4" : "h-3 w-3";
  return <Icon className={cn(cls, config.color, status === "in_progress" && "animate-spin")} />;
}

function StatusLabel({ status }: { status: FeatureStatus }) {
  const config = featureStatusConfig[status];
  return (
    <span className={cn("rounded-full px-1.5 py-0.5 text-[9px] font-bold", {
      "bg-green-100 text-green-700": status === "complete",
      "bg-indigo-100 text-indigo-700": status === "in_progress",
      "bg-amber-100 text-amber-700": status === "needs_testing",
      "bg-orange-100 text-orange-700": status === "needs_refinement",
      "bg-red-100 text-red-700": status === "blocked",
      "bg-gray-100 text-gray-500": status === "not_started",
    })}>
      {config.label}
    </span>
  );
}

const testStatusConfig: Record<TestStatus, { color: string; bg: string; label: string }> = {
  passing: { color: "bg-green-500", bg: "bg-green-100 text-green-700", label: "Pass" },
  failing: { color: "bg-red-500", bg: "bg-red-100 text-red-700", label: "Fail" },
  not_tested: { color: "bg-gray-300", bg: "bg-gray-100 text-gray-500", label: "Untested" },
  skipped: { color: "bg-gray-300", bg: "bg-gray-100 text-gray-400", label: "Skip" },
};

function TestStatusIcon({ status }: { status: TestStatus }) {
  return <span className={cn("h-2 w-2 shrink-0 rounded-full", testStatusConfig[status].color)} />;
}

function TestStatusLabel({ status }: { status: TestStatus }) {
  const config = testStatusConfig[status];
  return <span className={cn("rounded-full px-1.5 py-0.5 text-[9px] font-bold", config.bg)}>{config.label}</span>;
}
