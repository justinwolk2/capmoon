"use client";

/**
 * CapMoon — Pipeline Kanban Board
 * --------------------------------
 * 5-column kanban matching Pipedrive stages. Drag-and-drop AND click-to-move.
 * Two-way Pipedrive sync for admin/advisor users.
 *
 * Access rules:
 *   - Admin or canSeeAllDeals=true → see every deal
 *   - Otherwise → see only deals assigned to the current user
 *
 * Pipedrive sync:
 *   - On stage change → POST /api/pipedrive { action: "update-stage", deal }
 *   - Only fires if currentUser.role is "admin" or "advisor"
 *   - Failures log to console but don't block the UI update
 *
 * Stage aging:
 *   - Cards turn yellow at 7 days in stage
 *   - Orange at 14 days
 *   - Red at 30+ days
 */

import { useState, useMemo } from "react";
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import {
  useDroppable,
  useDraggable,
} from "@dnd-kit/core";

// =============================================================================
// Stage definitions — match Pipedrive pipeline ID 2
// =============================================================================

export const PIPELINE_STAGES = [
  { id: "pending",             label: "Proposed Deal",                pdStageId: 6,  color: "#f59e0b", bg: "bg-amber-500/10",   text: "text-amber-300",   border: "border-amber-500/30" },
  { id: "assigned",            label: "In Discussions",               pdStageId: 7,  color: "#3b82f6", bg: "bg-blue-500/10",    text: "text-blue-300",    border: "border-blue-500/30" },
  { id: "sent-to-lenders",     label: "Out to Market",                pdStageId: 8,  color: "#8b5cf6", bg: "bg-violet-500/10",  text: "text-violet-300",  border: "border-violet-500/30" },
  { id: "term-sheet-accepted", label: "Term Sheet Accepted",          pdStageId: 9,  color: "#10b981", bg: "bg-emerald-500/10", text: "text-emerald-300", border: "border-emerald-500/30" },
  { id: "closed",              label: "Closing",                      pdStageId: 10, color: "#6366f1", bg: "bg-indigo-500/10",  text: "text-indigo-300",  border: "border-indigo-500/30" },
] as const;

export type StageId = typeof PIPELINE_STAGES[number]["id"];

// =============================================================================
// Types
// =============================================================================

export interface PipelineDeal {
  id: string | number;             // dealId in DB
  dealNumber: string;              // 991177 OR TEMP-001
  isTemp?: boolean;                // shows TEMP badge
  borrowerName: string;
  loanAmount: number | null;
  assetType: string;
  city?: string;
  state?: string;
  status: StageId;
  assignedAdvisor?: string;
  assignedAdvisorAvatar?: string;
  pipedriveId?: number | null;
  stageEnteredAt?: string;         // ISO timestamp — for aging visual cue
  ownerEmail?: string;             // for access filter
  collaborators?: string[];        // emails who have access
}

export interface PipelineProps {
  deals: PipelineDeal[];
  currentUserEmail: string;
  currentUserRole: "admin" | "advisor" | "staff" | "intern" | "lender" | "capital-seeker";
  canSeeAllDeals?: boolean;
  onDealStageChange: (dealId: string | number, newStage: StageId) => void;
  onOpenDeal: (dealId: string | number) => void;
  /** Optional: called for admin/advisor users to fire Pipedrive sync.
   *  If omitted, sync is skipped (e.g. for staff/interns). */
  onPipedriveSync?: (dealId: string | number, pipedriveId: number, newStage: StageId) => Promise<void>;
}

// =============================================================================
// Helpers
// =============================================================================

function daysInStage(deal: PipelineDeal): number | null {
  if (!deal.stageEnteredAt) return null;
  const entered = new Date(deal.stageEnteredAt).getTime();
  if (isNaN(entered)) return null;
  return Math.floor((Date.now() - entered) / (1000 * 60 * 60 * 24));
}

function ageColor(days: number | null): string {
  if (days === null) return "border-slate-700/40";
  if (days >= 30) return "border-rose-500/60 ring-1 ring-rose-500/30";
  if (days >= 14) return "border-orange-500/60 ring-1 ring-orange-500/20";
  if (days >= 7) return "border-amber-500/60 ring-1 ring-amber-500/20";
  return "border-slate-700/40";
}

function fmtMoney(n: number | null): string {
  if (n === null || n === 0) return "—";
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `$${(n / 1_000).toFixed(0)}K`;
  return `$${n}`;
}

function filterByAccess(
  deals: PipelineDeal[],
  email: string,
  role: PipelineProps["currentUserRole"],
  canSeeAll: boolean,
): PipelineDeal[] {
  if (role === "lender" || role === "capital-seeker") return [];
  if (role === "admin" || canSeeAll) return deals;
  return deals.filter(
    (d) =>
      d.ownerEmail === email ||
      (d.collaborators && d.collaborators.includes(email)),
  );
}

// =============================================================================
// Card (draggable)
// =============================================================================

function DealCard({
  deal,
  onOpen,
  onMoveTo,
}: {
  deal: PipelineDeal;
  onOpen: (id: string | number) => void;
  onMoveTo: (id: string | number, stage: StageId) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: String(deal.id),
    data: { deal },
  });

  const [showMoveMenu, setShowMoveMenu] = useState(false);
  const days = daysInStage(deal);
  const ageBorderClass = ageColor(days);

  const style = transform
    ? { transform: `translate3d(${transform.x}px, ${transform.y}px, 0)` }
    : undefined;

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`bg-slate-800/60 backdrop-blur-sm rounded-lg border-2 p-3 mb-2 cursor-grab active:cursor-grabbing transition-shadow ${ageBorderClass} ${isDragging ? "opacity-40 shadow-xl" : "hover:shadow-md"}`}
      {...attributes}
    >
      {/* Drag handle covers the whole card except interactive elements */}
      <div {...listeners} className="select-none">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2 min-w-0">
            <span
              className={`text-xs font-mono font-bold px-2 py-0.5 rounded ${
                deal.isTemp
                  ? "bg-amber-500/20 text-amber-300 border border-amber-500/40"
                  : "bg-slate-700/60 text-slate-200"
              }`}
            >
              {deal.dealNumber}
            </span>
            {days !== null && days >= 7 && (
              <span className="text-[10px] uppercase tracking-wider text-slate-400">
                {days}d
              </span>
            )}
          </div>
          {deal.assignedAdvisorAvatar ? (
            <img
              src={deal.assignedAdvisorAvatar}
              alt={deal.assignedAdvisor ?? ""}
              className="w-5 h-5 rounded-full"
              title={deal.assignedAdvisor}
            />
          ) : deal.assignedAdvisor ? (
            <span
              className="w-5 h-5 rounded-full bg-slate-600 text-[10px] flex items-center justify-center text-slate-200"
              title={deal.assignedAdvisor}
            >
              {deal.assignedAdvisor.charAt(0)}
            </span>
          ) : null}
        </div>
        <div className="text-sm font-semibold text-slate-100 truncate mb-1">
          {deal.borrowerName}
        </div>
        <div className="text-xs text-slate-400 mb-2 truncate">
          {deal.assetType}
          {deal.city && ` · ${deal.city}${deal.state ? `, ${deal.state}` : ""}`}
        </div>
        <div className="text-sm font-mono font-bold text-amber-300">
          {fmtMoney(deal.loanAmount)}
        </div>
      </div>

      {/* Action row: Open + Move to */}
      <div className="flex items-center gap-1 mt-3 pt-2 border-t border-slate-700/40">
        <button
          type="button"
          onPointerDown={(e) => e.stopPropagation()}
          onClick={() => onOpen(deal.id)}
          className="flex-1 text-[11px] uppercase tracking-wider text-slate-300 hover:text-white py-1 rounded hover:bg-slate-700/40"
        >
          Open
        </button>
        <div className="relative">
          <button
            type="button"
            onPointerDown={(e) => e.stopPropagation()}
            onClick={() => setShowMoveMenu((v) => !v)}
            className="text-[11px] uppercase tracking-wider text-slate-400 hover:text-white py-1 px-2 rounded hover:bg-slate-700/40"
          >
            Move ▾
          </button>
          {showMoveMenu && (
            <div
              className="absolute right-0 top-full mt-1 z-30 w-48 bg-slate-900 border border-slate-700 rounded-lg shadow-xl py-1"
              onPointerDown={(e) => e.stopPropagation()}
            >
              {PIPELINE_STAGES.filter((s) => s.id !== deal.status).map((s) => (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => {
                    setShowMoveMenu(false);
                    onMoveTo(deal.id, s.id);
                  }}
                  className="w-full text-left px-3 py-1.5 text-xs text-slate-200 hover:bg-slate-700/60"
                >
                  {s.label}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// =============================================================================
// Column (droppable)
// =============================================================================

function StageColumn({
  stage,
  deals,
  onOpen,
  onMoveTo,
}: {
  stage: typeof PIPELINE_STAGES[number];
  deals: PipelineDeal[];
  onOpen: (id: string | number) => void;
  onMoveTo: (id: string | number, stage: StageId) => void;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: stage.id });
  const totalValue = deals.reduce((sum, d) => sum + (d.loanAmount ?? 0), 0);

  return (
    <div
      ref={setNodeRef}
      className={`flex flex-col min-w-[260px] w-[280px] flex-shrink-0 rounded-xl border ${stage.border} ${stage.bg} ${isOver ? "ring-2 ring-amber-400/60" : ""} transition-all`}
    >
      <div className="px-3 py-2 border-b border-slate-700/40">
        <div className="flex items-center justify-between mb-1">
          <span className={`text-xs font-bold uppercase tracking-wider ${stage.text}`}>
            {stage.label}
          </span>
          <span className="text-[10px] text-slate-400 bg-slate-900/60 rounded-full px-2 py-0.5">
            {deals.length}
          </span>
        </div>
        <div className="text-[11px] text-slate-400 font-mono">
          {fmtMoney(totalValue)}
        </div>
      </div>
      <div className="flex-1 p-2 overflow-y-auto min-h-[200px] max-h-[calc(100vh-280px)]">
        {deals.length === 0 ? (
          <div className="text-xs text-slate-500 italic text-center py-6">
            No deals
          </div>
        ) : (
          deals.map((d) => (
            <DealCard key={d.id} deal={d} onOpen={onOpen} onMoveTo={onMoveTo} />
          ))
        )}
      </div>
    </div>
  );
}

// =============================================================================
// Main component
// =============================================================================

export default function Pipeline({
  deals,
  currentUserEmail,
  currentUserRole,
  canSeeAllDeals = false,
  onDealStageChange,
  onOpenDeal,
  onPipedriveSync,
}: PipelineProps) {
  const [activeId, setActiveId] = useState<string | null>(null);
  const [syncStatus, setSyncStatus] = useState<"idle" | "syncing" | "synced" | "error">("idle");

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 6 },
    }),
  );

  // Filter by access rules
  const visibleDeals = useMemo(
    () => filterByAccess(deals, currentUserEmail, currentUserRole, canSeeAllDeals),
    [deals, currentUserEmail, currentUserRole, canSeeAllDeals],
  );

  // Group by stage
  const byStage = useMemo(() => {
    const map: Record<StageId, PipelineDeal[]> = {
      pending: [],
      assigned: [],
      "sent-to-lenders": [],
      "term-sheet-accepted": [],
      closed: [],
    };
    for (const d of visibleDeals) {
      if (map[d.status]) map[d.status].push(d);
      else map.pending.push(d); // unknown → bucket into pending
    }
    return map;
  }, [visibleDeals]);

  const activeDeal = activeId
    ? visibleDeals.find((d) => String(d.id) === activeId) ?? null
    : null;

  function handleStageChange(dealId: string | number, newStage: StageId) {
    const deal = visibleDeals.find((d) => d.id === dealId);
    if (!deal) return;
    if (deal.status === newStage) return;

    // Optimistic UI update
    onDealStageChange(dealId, newStage);

    // Pipedrive sync — admin/advisor only
    const shouldSync =
      (currentUserRole === "admin" || currentUserRole === "advisor") &&
      onPipedriveSync &&
      typeof deal.pipedriveId === "number";

    if (shouldSync) {
      setSyncStatus("syncing");
      onPipedriveSync(dealId, deal.pipedriveId as number, newStage)
        .then(() => {
          setSyncStatus("synced");
          window.setTimeout(() => setSyncStatus("idle"), 2000);
        })
        .catch((err) => {
          console.error("Pipedrive sync failed:", err);
          setSyncStatus("error");
          window.setTimeout(() => setSyncStatus("idle"), 4000);
        });
    }
  }

  function handleDragStart(e: DragStartEvent) {
    setActiveId(String(e.active.id));
  }

  function handleDragEnd(e: DragEndEvent) {
    setActiveId(null);
    const { active, over } = e;
    if (!over) return;
    const overStage = String(over.id) as StageId;
    if (!PIPELINE_STAGES.some((s) => s.id === overStage)) return;
    handleStageChange(String(active.id), overStage);
  }

  // Empty / no-access state
  if (currentUserRole === "lender" || currentUserRole === "capital-seeker") {
    return (
      <div className="p-8 text-center text-slate-400">
        Pipeline view is not available for your role.
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      {/* Header strip */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-slate-100">Pipeline</h2>
          <p className="text-xs text-slate-400">
            {visibleDeals.length} deal{visibleDeals.length === 1 ? "" : "s"} ·{" "}
            {currentUserRole === "admin" || canSeeAllDeals
              ? "All deals"
              : "Your deals"}
          </p>
        </div>
        {syncStatus !== "idle" && (
          <span
            className={`text-xs px-3 py-1 rounded-full border ${
              syncStatus === "syncing"
                ? "bg-amber-500/10 text-amber-300 border-amber-500/40"
                : syncStatus === "synced"
                  ? "bg-emerald-500/10 text-emerald-300 border-emerald-500/40"
                  : "bg-rose-500/10 text-rose-300 border-rose-500/40"
            }`}
          >
            {syncStatus === "syncing" && "Syncing to Pipedrive…"}
            {syncStatus === "synced" && "✓ Synced to Pipedrive"}
            {syncStatus === "error" && "⚠ Pipedrive sync failed"}
          </span>
        )}
      </div>

      {/* Kanban */}
      <DndContext
        sensors={sensors}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        <div className="flex gap-3 overflow-x-auto pb-4">
          {PIPELINE_STAGES.map((stage) => (
            <StageColumn
              key={stage.id}
              stage={stage}
              deals={byStage[stage.id] ?? []}
              onOpen={onOpenDeal}
              onMoveTo={handleStageChange}
            />
          ))}
        </div>

        <DragOverlay>
          {activeDeal && (
            <div className="bg-slate-800 rounded-lg border-2 border-amber-400/60 p-3 shadow-2xl rotate-2 w-[260px]">
              <div className="text-xs font-mono font-bold text-amber-300 mb-1">
                {activeDeal.dealNumber}
              </div>
              <div className="text-sm font-semibold text-slate-100 truncate">
                {activeDeal.borrowerName}
              </div>
              <div className="text-sm font-mono font-bold text-amber-300 mt-1">
                {fmtMoney(activeDeal.loanAmount)}
              </div>
            </div>
          )}
        </DragOverlay>
      </DndContext>

      {/* Stage aging legend */}
      <div className="text-[10px] text-slate-500 mt-2 italic">
        Card border colors: yellow at 7d in stage · orange at 14d · red at 30d+
      </div>
    </div>
  );
}
