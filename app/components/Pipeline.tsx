// CAPMOON_KANBAN_OVERHAUL — Pipeline.tsx full replacement
"use client";

/**
 * CapMoon — Pipeline Kanban Board (DealFlow via Pipedrive)
 * --------------------------------------------------------
 * Brand colors:
 *   - Columns 1/3/5: navy #0a1f44 (Proposed, Out to Market, Closing)
 *   - Columns 2/4: slate-500 #64748b (In Discussions, Term Sheet)
 *   - Cards on navy: light grey #e2e8f0
 *   - Cards on grey: navy #0a1f44
 *   - Gold accent: #c9a84c (deal#, $, advisor avatar ring)
 *
 * Card content:
 *   - Property photo (44×44, top-left) where available
 *   - Editable title (click to edit, save on blur/Enter)
 *   - Address subtitle
 *   - Advisor footer: photo + name + loan amount
 *
 * Access rules (unchanged from prior version):
 *   - Admin or canSeeAllDeals=true → see every deal
 *   - Otherwise → only deals owned by / shared with current user
 *
 * Pipedrive sync:
 *   - On stage change → POST /api/pipedrive { action: "update-stage", deal }
 *   - Only fires for admin/advisor with a pipedriveId
 *
 * Stage aging:
 *   - Yellow border at 7+ days · orange at 14+ · red at 30+
 *
 * Filter bar:
 *   - "All advisors" dropdown (Justin / Louis / Shuvo / Unassigned)
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
  { id: "pending",             label: "Proposed Deal",       pdStageId: 6,  variant: "navy" as const },
  { id: "assigned",            label: "In Discussions",      pdStageId: 7,  variant: "grey" as const },
  { id: "sent-to-lenders",     label: "Out to Market",       pdStageId: 8,  variant: "navy" as const },
  { id: "term-sheet-accepted", label: "Term Sheet",          pdStageId: 9,  variant: "grey" as const },
  { id: "closed",              label: "Closing",             pdStageId: 10, variant: "navy" as const },
] as const;

export type StageId = typeof PIPELINE_STAGES[number]["id"];

// Brand color palette (single source of truth)
const COLORS = {
  navy: "#0a1f44",
  grey: "#64748b",
  cardLight: "#e2e8f0",
  cardLightBorder: "#94a3b8",
  cardLightPhotoBg: "#cbd5e1",
  cardLightTextDark: "#0a1f44",
  cardLightTextSubtle: "#475569",
  cardLightAdvisorName: "#1e293b",
  cardDarkBorder: "rgba(201,168,76,0.3)",
  cardDarkPhotoBg: "#1e3a5f",
  gold: "#c9a84c",
  goldBright: "#fbbf24",
  agingYellow: "#f59e0b",
  agingOrange: "#f97316",
  agingRed: "#ef4444",
};

// =============================================================================
// Types
// =============================================================================

export interface PipelineDeal {
  id: string | number;
  dealNumber: string;
  isTemp?: boolean;
  // NEW: editable title (falls back to auto-generated default)
  dealTitle?: string;
  // Borrower / seeker name (renamed from borrowerName for clarity)
  borrowerName: string;
  loanAmount: number | null;
  assetType: string;
  city?: string;
  state?: string;
  street?: string;
  status: StageId;
  // NEW: property photo URL
  propertyPhoto?: string;
  // Advisor info
  assignedAdvisor?: string;
  assignedAdvisorAvatar?: string;
  assignedAdvisorId?: number | string | null;
  pipedriveId?: number | null;
  stageEnteredAt?: string;
  ownerEmail?: string;
  collaborators?: string[];
}

export interface PipelineProps {
  deals: PipelineDeal[];
  currentUserEmail: string;
  currentUserRole: "admin" | "advisor" | "staff" | "intern" | "lender" | "capital-seeker";
  canSeeAllDeals?: boolean;
  onDealStageChange: (dealId: string | number, newStage: StageId) => void;
  onOpenDeal: (dealId: string | number) => void;
  /** Optional: called for admin/advisor users to fire Pipedrive sync. */
  onPipedriveSync?: (dealId: string | number, pipedriveId: number, newStage: StageId) => Promise<void>;
  /** Optional: called when a card title is edited inline. */
  onTitleChange?: (dealId: string | number, newTitle: string) => void;
  /** Optional: list of advisors for the filter dropdown */
  availableAdvisors?: Array<{ id: number | string; name: string }>;
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
  // Interns and staff with canSeeAll, admin, or advisors with canSeeAll all see everything.
  // Otherwise, see only deals owned/shared.
  if (role === "admin" || canSeeAll) return deals;
  return deals.filter(
    (d) =>
      d.ownerEmail === email ||
      (d.collaborators && d.collaborators.includes(email)),
  );
}

function autoDefaultTitle(deal: PipelineDeal): string {
  // Per spec: "Deal# — City"
  const num = deal.dealNumber || `#${deal.id}`;
  if (deal.city) return `${num} — ${deal.city}`;
  if (deal.borrowerName && deal.borrowerName !== "Untitled") return `${num} — ${deal.borrowerName}`;
  return num;
}

function effectiveTitle(deal: PipelineDeal): string {
  return (deal.dealTitle && deal.dealTitle.trim()) || autoDefaultTitle(deal);
}

function advisorInitials(name: string | undefined): string {
  if (!name) return "—";
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "—";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

// =============================================================================
// Card (draggable) — supports two variants: "light" (on navy col) or "dark" (on grey col)
// =============================================================================

function DealCard({
  deal,
  variant,
  onOpen,
  onMoveTo,
  onTitleChange,
}: {
  deal: PipelineDeal;
  variant: "light" | "dark";
  onOpen: (id: string | number) => void;
  onMoveTo: (id: string | number, stage: StageId) => void;
  onTitleChange?: (id: string | number, newTitle: string) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: String(deal.id),
    data: { deal },
  });

  const [showMoveMenu, setShowMoveMenu] = useState(false);
  const [editingTitle, setEditingTitle] = useState(false);
  const [titleDraft, setTitleDraft] = useState(effectiveTitle(deal));

  const days = daysInStage(deal);
  const showDays = days !== null && days >= 7;

  // Aging border outline (applied as inset shadow so it works on both variants)
  let agingShadow = "";
  if (days !== null) {
    if (days >= 30) agingShadow = `0 0 0 1.5px ${COLORS.agingRed}`;
    else if (days >= 14) agingShadow = `0 0 0 1.5px ${COLORS.agingOrange}`;
    else if (days >= 7) agingShadow = `0 0 0 1.5px ${COLORS.agingYellow}`;
  }

  const isLight = variant === "light";
  const cardStyle: React.CSSProperties = {
    background: isLight ? COLORS.cardLight : COLORS.navy,
    border: `1px solid ${isLight ? COLORS.cardLightBorder : COLORS.cardDarkBorder}`,
    boxShadow: agingShadow || (isLight ? "0 1px 1px rgba(0,0,0,0.08)" : "0 1px 2px rgba(0,0,0,0.25)"),
    ...(transform ? { transform: `translate3d(${transform.x}px, ${transform.y}px, 0)` } : {}),
    opacity: isDragging ? 0.4 : 1,
  };

  const titleColor = isLight ? COLORS.cardLightTextDark : "#ffffff";
  const addrColor = isLight ? COLORS.cardLightTextSubtle : "rgba(255,255,255,0.65)";
  const numColor = isLight ? COLORS.cardLightTextDark : COLORS.gold;
  const photoBg = isLight ? COLORS.cardLightPhotoBg : COLORS.cardDarkPhotoBg;
  const photoFg = isLight ? "#94a3b8" : "rgba(255,255,255,0.3)";
  const advisorNameColor = isLight ? COLORS.cardLightAdvisorName : "rgba(255,255,255,0.85)";
  const loanAmtColor = isLight ? COLORS.cardLightTextDark : COLORS.gold;
  const footBorder = isLight ? "rgba(10,31,68,0.15)" : "rgba(255,255,255,0.12)";

  function commitTitle() {
    const trimmed = titleDraft.trim();
    const auto = autoDefaultTitle(deal);
    // If user cleared it or matches auto-default, save empty string (means "use default")
    const toSave = trimmed === "" || trimmed === auto ? "" : trimmed;
    if (toSave !== (deal.dealTitle ?? "") && onTitleChange) {
      onTitleChange(deal.id, toSave);
    }
    setEditingTitle(false);
  }

  return (
    <div
      ref={setNodeRef}
      style={{
        ...cardStyle,
        borderRadius: 7,
        padding: 8,
        marginBottom: 8,
        cursor: editingTitle ? "default" : "grab",
      }}
      {...(editingTitle ? {} : attributes)}
    >
      {/* Drag handle wraps everything except interactive controls */}
      <div {...(editingTitle ? {} : listeners)} className="select-none">
        {/* Top row: photo + meta */}
        <div style={{ display: "flex", gap: 8, alignItems: "flex-start", marginBottom: 6 }}>
          <div
            style={{
              width: 44,
              height: 44,
              borderRadius: 5,
              flexShrink: 0,
              background: photoBg,
              color: photoFg,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 14,
              overflow: "hidden",
              backgroundImage: deal.propertyPhoto ? `url(${deal.propertyPhoto})` : undefined,
              backgroundSize: "cover",
              backgroundPosition: "center",
            }}
          >
            {!deal.propertyPhoto && "📷"}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div>
              <span
                style={{
                  fontFamily: "'SF Mono', Monaco, monospace",
                  fontSize: 10,
                  letterSpacing: "0.04em",
                  color: numColor,
                  fontWeight: 700,
                }}
              >
                {deal.dealNumber}
              </span>
              {deal.isTemp && (
                <span
                  style={{
                    fontSize: 9,
                    marginLeft: 5,
                    padding: "1px 4px",
                    borderRadius: 3,
                    background: "rgba(245,158,11,0.2)",
                    color: COLORS.agingYellow,
                    fontWeight: 600,
                    textTransform: "uppercase",
                  }}
                >
                  TEMP
                </span>
              )}
              {showDays && (
                <span
                  style={{
                    fontSize: 9,
                    marginLeft: 5,
                    color: isLight ? "#b45309" : COLORS.goldBright,
                    textTransform: "uppercase",
                    letterSpacing: "0.06em",
                    fontWeight: 600,
                  }}
                >
                  {days}d
                </span>
              )}
            </div>

            {/* Editable title */}
            {editingTitle ? (
              <input
                autoFocus
                value={titleDraft}
                onChange={(e) => setTitleDraft(e.target.value)}
                onBlur={commitTitle}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    commitTitle();
                  } else if (e.key === "Escape") {
                    setTitleDraft(effectiveTitle(deal));
                    setEditingTitle(false);
                  }
                }}
                onPointerDown={(e) => e.stopPropagation()}
                onClick={(e) => e.stopPropagation()}
                style={{
                  width: "100%",
                  fontSize: 12,
                  fontWeight: 600,
                  color: titleColor,
                  background: isLight ? "rgba(255,255,255,0.6)" : "rgba(255,255,255,0.1)",
                  border: `1px solid ${COLORS.gold}`,
                  borderRadius: 3,
                  padding: "1px 4px",
                  marginTop: 1,
                  outline: "none",
                }}
              />
            ) : (
              // CAPMOON_TITLE_CLICK_FIX — capture-phase pointer events to beat dnd-kit
              <div
                role="button"
                tabIndex={0}
                onPointerDownCapture={(e) => {
                  // Capture phase fires before dnd-kit's pointer sensor —
                  // stops drag from initiating when user clicks the title.
                  e.stopPropagation();
                }}
                onMouseDownCapture={(e) => {
                  // Belt-and-suspenders for browsers/devices that emit mouse over pointer
                  e.stopPropagation();
                }}
                onClick={(e) => {
                  e.stopPropagation();
                  if (onTitleChange) {
                    setTitleDraft(effectiveTitle(deal));
                    setEditingTitle(true);
                  }
                }}
                onKeyDown={(e) => {
                  // Allow keyboard activation since role=button + tabindex=0
                  if ((e.key === "Enter" || e.key === " ") && onTitleChange) {
                    e.preventDefault();
                    setTitleDraft(effectiveTitle(deal));
                    setEditingTitle(true);
                  }
                }}
                title={onTitleChange ? "Click to edit title" : undefined}
                style={{
                  fontSize: 12,
                  fontWeight: 600,
                  color: titleColor,
                  marginTop: 1,
                  padding: "1px 4px",
                  marginLeft: -4,
                  borderRadius: 3,
                  cursor: onTitleChange ? "text" : "default",
                  lineHeight: 1.3,
                  wordBreak: "break-word",
                }}
                className="capmoon-card-title"
              >
                {effectiveTitle(deal)}
              </div>
            )}

            {/* Address */}
            {(deal.street || deal.city) && (
              <div style={{ fontSize: 10, marginTop: 1, lineHeight: 1.3, color: addrColor }}>
                {deal.street && <span>{deal.street}</span>}
                {deal.street && deal.city && <span>, </span>}
                {deal.city && (
                  <span>
                    {deal.city}
                    {deal.state ? `, ${deal.state}` : ""}
                  </span>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Footer: advisor + loan amount */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            paddingTop: 6,
            marginTop: 5,
            borderTop: `1px solid ${footBorder}`,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 5, minWidth: 0, flex: 1 }}>
            {deal.assignedAdvisorAvatar ? (
              <img
                src={deal.assignedAdvisorAvatar}
                alt={deal.assignedAdvisor ?? ""}
                style={{
                  width: 18,
                  height: 18,
                  borderRadius: "50%",
                  flexShrink: 0,
                  objectFit: "cover",
                  border: `1.5px solid ${COLORS.gold}`,
                }}
                title={deal.assignedAdvisor}
              />
            ) : (
              <span
                style={{
                  width: 18,
                  height: 18,
                  borderRadius: "50%",
                  background: `linear-gradient(135deg, ${COLORS.gold}, #8b6f1f)`,
                  color: COLORS.navy,
                  fontSize: 8,
                  fontWeight: 700,
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0,
                  border: `1.5px solid ${COLORS.gold}`,
                }}
                title={deal.assignedAdvisor}
              >
                {advisorInitials(deal.assignedAdvisor)}
              </span>
            )}
            <span
              style={{
                fontSize: 10,
                whiteSpace: "nowrap",
                overflow: "hidden",
                textOverflow: "ellipsis",
                color: advisorNameColor,
              }}
            >
              {deal.assignedAdvisor ?? "Unassigned"}
            </span>
          </div>
          <span
            style={{
              fontSize: 11,
              color: loanAmtColor,
              fontWeight: 700,
            }}
          >
            {fmtMoney(deal.loanAmount)}
          </span>
        </div>
      </div>

      {/* Action row: Open + Move to */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 4,
          marginTop: 6,
          paddingTop: 6,
          borderTop: `1px solid ${footBorder}`,
        }}
      >
        <button
          type="button"
          onPointerDown={(e) => e.stopPropagation()}
          onClick={() => onOpen(deal.id)}
          style={{
            flex: 1,
            fontSize: 10,
            textTransform: "uppercase",
            letterSpacing: "0.06em",
            color: isLight ? COLORS.cardLightTextSubtle : "rgba(255,255,255,0.7)",
            padding: "3px 0",
            borderRadius: 4,
            background: "transparent",
            border: "none",
            cursor: "pointer",
          }}
          className="capmoon-card-btn"
        >
          Open
        </button>
        <div style={{ position: "relative" }}>
          <button
            type="button"
            onPointerDown={(e) => e.stopPropagation()}
            onClick={() => setShowMoveMenu((v) => !v)}
            style={{
              fontSize: 10,
              textTransform: "uppercase",
              letterSpacing: "0.06em",
              color: isLight ? COLORS.cardLightTextSubtle : "rgba(255,255,255,0.6)",
              padding: "3px 8px",
              borderRadius: 4,
              background: "transparent",
              border: "none",
              cursor: "pointer",
            }}
            className="capmoon-card-btn"
          >
            Move ▾
          </button>
          {showMoveMenu && (
            <div
              style={{
                position: "absolute",
                right: 0,
                top: "100%",
                marginTop: 4,
                zIndex: 30,
                minWidth: 180,
                background: COLORS.navy,
                border: `1px solid ${COLORS.gold}`,
                borderRadius: 8,
                boxShadow: "0 10px 25px rgba(0,0,0,0.3)",
                padding: "4px 0",
              }}
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
                  style={{
                    width: "100%",
                    textAlign: "left",
                    padding: "6px 12px",
                    fontSize: 11,
                    color: "white",
                    background: "transparent",
                    border: "none",
                    cursor: "pointer",
                  }}
                  className="capmoon-move-opt"
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
  onTitleChange,
}: {
  stage: typeof PIPELINE_STAGES[number];
  deals: PipelineDeal[];
  onOpen: (id: string | number) => void;
  onMoveTo: (id: string | number, stage: StageId) => void;
  onTitleChange?: (id: string | number, newTitle: string) => void;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: stage.id });
  const totalValue = deals.reduce((sum, d) => sum + (d.loanAmount ?? 0), 0);

  const colBg = stage.variant === "navy" ? COLORS.navy : COLORS.grey;
  const cardVariant: "light" | "dark" = stage.variant === "navy" ? "light" : "dark";

  return (
    <div
      ref={setNodeRef}
      style={{
        display: "flex",
        flexDirection: "column",
        minWidth: 240,
        width: 260,
        flexShrink: 0,
        borderRadius: 10,
        background: colBg,
        border: isOver ? `2px solid ${COLORS.gold}` : "2px solid transparent",
        padding: 10,
        transition: "border 0.15s",
      }}
    >
      {/* Header */}
      <div
        style={{
          padding: "4px 8px 9px",
          marginBottom: 8,
          borderBottom: "1px solid rgba(255,255,255,0.18)",
        }}
      >
        <div
          style={{
            fontSize: 10,
            fontWeight: 700,
            letterSpacing: "0.12em",
            textTransform: "uppercase",
            color: "white",
            display: "block",
            marginBottom: 2,
          }}
        >
          {stage.label}
        </div>
        <div style={{ fontSize: 10, color: "rgba(255,255,255,0.75)" }}>
          {deals.length}
          {" · "}
          <b style={{ color: COLORS.gold, fontWeight: 600 }}>{fmtMoney(totalValue)}</b>
        </div>
      </div>

      {/* Cards */}
      <div
        style={{
          flex: 1,
          padding: 2,
          overflowY: "auto",
          minHeight: 200,
          maxHeight: "calc(100vh - 280px)",
        }}
      >
        {deals.length === 0 ? (
          <div
            style={{
              fontSize: 11,
              color: "rgba(255,255,255,0.4)",
              fontStyle: "italic",
              textAlign: "center",
              padding: "24px 0",
            }}
          >
            Drop here
          </div>
        ) : (
          deals.map((d) => (
            <DealCard
              key={d.id}
              deal={d}
              variant={cardVariant}
              onOpen={onOpen}
              onMoveTo={onMoveTo}
              onTitleChange={onTitleChange}
            />
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
  onTitleChange,
  availableAdvisors,
}: PipelineProps) {
  const [activeId, setActiveId] = useState<string | null>(null);
  const [syncStatus, setSyncStatus] = useState<"idle" | "syncing" | "synced" | "error">("idle");
  const [advisorFilter, setAdvisorFilter] = useState<string>("all");

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 6 },
    }),
  );

  // Step 1: visibility filter (role + ownership)
  const visibleByAccess = useMemo(
    () => filterByAccess(deals, currentUserEmail, currentUserRole, canSeeAllDeals),
    [deals, currentUserEmail, currentUserRole, canSeeAllDeals],
  );

  // Step 2: advisor filter (user-controlled)
  const visibleDeals = useMemo(() => {
    if (advisorFilter === "all") return visibleByAccess;
    if (advisorFilter === "unassigned") {
      return visibleByAccess.filter(
        (d) => !d.assignedAdvisorId && !d.assignedAdvisor,
      );
    }
    return visibleByAccess.filter(
      (d) => String(d.assignedAdvisorId) === advisorFilter || d.assignedAdvisor === advisorFilter,
    );
  }, [visibleByAccess, advisorFilter]);

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
      else map.pending.push(d);
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

    onDealStageChange(dealId, newStage);

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
      <div style={{ padding: 32, textAlign: "center", color: "#94a3b8" }}>
        Pipeline view is not available for your role.
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      {/* Header strip */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
        <div>
          <h2 style={{ fontSize: 18, fontWeight: 700, color: COLORS.navy, margin: 0 }}>DealFlow</h2>
          <p style={{ fontSize: 11, color: "#64748b", margin: "2px 0 0 0" }}>
            {visibleDeals.length} deal{visibleDeals.length === 1 ? "" : "s"}
            {advisorFilter !== "all" && (
              <span> · filtered</span>
            )}
            {(currentUserRole === "admin" || canSeeAllDeals) ? " · all" : " · yours"}
          </p>
        </div>

        {/* Filter bar */}
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <label style={{ fontSize: 11, color: "#374151", fontWeight: 600 }}>Advisor:</label>
          <select
            value={advisorFilter}
            onChange={(e) => setAdvisorFilter(e.target.value)}
            style={{
              fontSize: 11,
              padding: "4px 8px",
              border: "1px solid #d1d5db",
              borderRadius: 6,
              background: "white",
              color: "#111827",
              cursor: "pointer",
            }}
          >
            <option value="all">All advisors</option>
            {availableAdvisors?.map((a) => (
              <option key={a.id} value={String(a.id)}>
                {a.name}
              </option>
            ))}
            <option value="unassigned">— Unassigned</option>
          </select>

          {syncStatus !== "idle" && (
            <span
              style={{
                fontSize: 11,
                padding: "4px 12px",
                borderRadius: 999,
                border:
                  syncStatus === "syncing"
                    ? "1px solid rgba(245,158,11,0.4)"
                    : syncStatus === "synced"
                      ? "1px solid rgba(16,185,129,0.4)"
                      : "1px solid rgba(244,63,94,0.4)",
                background:
                  syncStatus === "syncing"
                    ? "rgba(245,158,11,0.1)"
                    : syncStatus === "synced"
                      ? "rgba(16,185,129,0.1)"
                      : "rgba(244,63,94,0.1)",
                color:
                  syncStatus === "syncing"
                    ? "#b45309"
                    : syncStatus === "synced"
                      ? "#047857"
                      : "#be123c",
              }}
            >
              {syncStatus === "syncing" && "Syncing to Pipedrive…"}
              {syncStatus === "synced" && "✓ Synced to Pipedrive"}
              {syncStatus === "error" && "⚠ Pipedrive sync failed"}
            </span>
          )}
        </div>
      </div>

      {/* Kanban */}
      <DndContext
        sensors={sensors}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(5, minmax(240px, 1fr))",
            gap: 10,
            overflowX: "auto",
            paddingBottom: 12,
          }}
        >
          {PIPELINE_STAGES.map((stage) => (
            <StageColumn
              key={stage.id}
              stage={stage}
              deals={byStage[stage.id] ?? []}
              onOpen={onOpenDeal}
              onMoveTo={handleStageChange}
              onTitleChange={onTitleChange}
            />
          ))}
        </div>

        <DragOverlay>
          {activeDeal && (
            <div
              style={{
                background: COLORS.navy,
                border: `2px solid ${COLORS.gold}`,
                borderRadius: 7,
                padding: 8,
                boxShadow: "0 20px 50px rgba(0,0,0,0.5)",
                transform: "rotate(1.5deg)",
                width: 240,
              }}
            >
              <div style={{ fontSize: 10, fontFamily: "'SF Mono', Monaco, monospace", color: COLORS.gold, fontWeight: 700, marginBottom: 2 }}>
                {activeDeal.dealNumber}
              </div>
              <div style={{ fontSize: 12, fontWeight: 600, color: "white", marginBottom: 4 }}>
                {effectiveTitle(activeDeal)}
              </div>
              <div style={{ fontSize: 11, color: COLORS.gold, fontWeight: 700 }}>
                {fmtMoney(activeDeal.loanAmount)}
              </div>
            </div>
          )}
        </DragOverlay>
      </DndContext>

      {/* Aging legend */}
      <div style={{ fontSize: 10, color: "#94a3b8", fontStyle: "italic", marginTop: 4 }}>
        Card border colors: yellow at 7d in stage · orange at 14d · red at 30d+
      </div>
    </div>
  );
}

