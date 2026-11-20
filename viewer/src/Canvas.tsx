import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react"
import {
  Background,
  Controls,
  Handle,
  MarkerType,
  Panel,
  Position,
  ReactFlow,
  type BuiltInEdge,
  type Node,
  type NodeChange,
  type NodeProps,
  type ReactFlowInstance,
} from "@xyflow/react"
import { CARD, cardHeight, edgeScenarios } from "../../skills/auis-ux-flow/scripts/flow-rules.mjs"
import { Icon } from "./icons"
import { scenarioColor, scenarioLabel } from "./palette"
import type { Flow, FlowNode, Focus, Notes, Positions, Side } from "./types"

/* ─── Node data ─────────────────────────────────────────────────────── */

type Dot = { id: string; label: string; color: string }
type CardData = { node: FlowNode; dots: Dot[]; notes: number }
type BandData = { title: string; color: string }
type Sizes = Record<string, { width: number; height: number }>

function NotePin({ n }: { n: number }) {
  return (
    <span className="note-pin" title={`${n} note${n === 1 ? "" : "s"}`}>
      <Icon name="note" size={11} />
      {n}
    </span>
  )
}

/** One dot per scenario that passes through the card. Two or more = a shared screen. */
function ScenarioDots({ dots }: { dots: Dot[] }) {
  return (
    <div className="dots">
      {dots.map((d) => (
        <span key={d.id} className="dot" style={{ background: d.color }} title={d.label} />
      ))}
    </div>
  )
}

/* Every card takes edges on all four sides, in and out, so streams can weave. */
const SIDES: { id: Side; pos: Position }[] = [
  { id: "top", pos: Position.Top },
  { id: "bottom", pos: Position.Bottom },
  { id: "left", pos: Position.Left },
  { id: "right", pos: Position.Right },
]
function CardHandles() {
  return (
    <>
      {SIDES.map((s) => (
        <Handle key={`${s.id}-in`} id={`${s.id}-in`} type="target" position={s.pos} className="card-handle" />
      ))}
      {SIDES.map((s) => (
        <Handle key={`${s.id}-out`} id={`${s.id}-out`} type="source" position={s.pos} className="card-handle" />
      ))}
    </>
  )
}

function ScreenCard({ data }: NodeProps<Node<CardData>>) {
  const { node, dots, notes } = data
  const variants = node.variants?.length ?? 0
  return (
    <div className="card card-screen">
      <CardHandles />
      <ScenarioDots dots={dots} />
      {notes ? <NotePin n={notes} /> : null}
      {node.step && <span className="eyebrow card-step">{node.step}</span>}
      <span className="card-title">{node.title}</span>
      {node.note && <span className="card-note">{node.note}</span>}
      {node.route && <code className="card-route">{node.route}</code>}
      {node.states?.length ? (
        <span className="card-meta">
          <Icon name="layers" size={12} />
          {node.states.join(" · ")}
        </span>
      ) : null}
      {variants > 1 && (
        <span className="card-meta">
          <Icon name="layers" size={12} />
          {variants} states
        </span>
      )}
    </div>
  )
}

function DecisionCard({ data }: NodeProps<Node<CardData>>) {
  const { node, dots, notes } = data
  return (
    <div className="card card-decision">
      <CardHandles />
      <ScenarioDots dots={dots} />
      {notes ? <NotePin n={notes} /> : null}
      <span className="eyebrow">decision</span>
      <span className="card-title">{node.title}</span>
      {node.question && <span className="card-question">{node.question}</span>}
    </div>
  )
}

/** The tinted box drawn behind the focused scenario's cards. */
function Band({ data }: NodeProps<Node<BandData>>) {
  return (
    <div className="band" style={{ "--tint": data.color } as React.CSSProperties}>
      <span className="eyebrow band-title">{data.title}</span>
    </div>
  )
}

const nodeTypes = { screen: ScreenCard, decision: DecisionCard, band: Band }

/* ─── Edges ─────────────────────────────────────────────────────────── */

const EDGE_LOOK = {
  base: { stroke: "var(--edge)", dash: undefined },
  branch: { stroke: "var(--decision-line)", dash: undefined },
  cross: { stroke: "var(--cross)", dash: "5 3" },
} as const

/* Leave room for the floating controls when framing the graph. */
const FIT = { padding: { top: "56px", right: "24px", bottom: "68px", left: "24px" } } as const

const BAND_PAD = 36
const BAND_PAD_TOP = 52

/* ─── Canvas ────────────────────────────────────────────────────────── */

export function Canvas({
  flow,
  focus,
  theme,
  chips,
  notes,
  positions,
  onPositionsChange,
  onOpenCard,
  onNoteCard,
  tray,
}: {
  flow: Flow
  focus: Focus
  theme: "light" | "dark"
  /** The lens chips; also shown inside the canvas while it is fullscreen. */
  chips: ReactNode
  notes: Notes
  positions: Positions
  onPositionsChange: (next: Positions) => void
  onOpenCard: (node: FlowNode) => void
  onNoteCard: (node: FlowNode) => void
  /** Notes tray (copy for agent, reset layout), shown top-right. */
  tray: ReactNode
}) {
  const [fullscreen, setFullscreen] = useState(() => new URLSearchParams(queryString()).get("fullscreen") === "1")
  const [noteMode, setNoteMode] = useState(false)
  const [sizes, setSizes] = useState<Sizes>({})
  const rf = useRef<ReactFlowInstance | null>(null)

  const nodeById = useMemo(() => new Map(flow.nodes.map((n) => [n.id, n])), [flow])

  const nodes = useMemo<Node[]>(() => {
    const place = (n: FlowNode) => positions[n.id] ?? { x: n.x, y: n.y }
    const cards: Node[] = flow.nodes.map((n) => ({
      id: n.id,
      type: n.type === "decision" ? "decision" : "screen",
      position: place(n),
      measured: sizes[n.id],
      zIndex: 10,
      className: focus !== "all" && !n.scenarios.includes(focus) ? "is-dim" : undefined,
      data: {
        node: n,
        notes: notes[n.id]?.length ?? 0,
        dots: flow.scenarios
          .filter((s) => n.scenarios.includes(s.id))
          .map((s) => ({ id: s.id, label: s.label, color: scenarioColor(flow, s.id) })),
      } satisfies CardData,
    }))
    if (focus === "all") return cards

    /* Band: bounding box of the focused scenario's cards, where they are now. */
    const members = flow.nodes.filter((n) => n.scenarios.includes(focus))
    if (members.length === 0) return cards
    const boxes = members.map((n) => ({ ...place(n), w: sizes[n.id]?.width ?? CARD.w, h: sizes[n.id]?.height ?? cardHeight(n) }))
    const minX = Math.min(...boxes.map((b) => b.x)) - BAND_PAD
    const minY = Math.min(...boxes.map((b) => b.y)) - BAND_PAD_TOP
    const width = Math.max(...boxes.map((b) => b.x + b.w)) + BAND_PAD - minX
    const height = Math.max(...boxes.map((b) => b.y + b.h)) + BAND_PAD - minY
    const band: Node = {
      id: "band",
      type: "band",
      position: { x: minX, y: minY },
      width,
      height,
      measured: { width, height },
      zIndex: 0,
      selectable: false,
      draggable: false,
      focusable: false,
      data: { title: scenarioLabel(flow, focus), color: scenarioColor(flow, focus) } satisfies BandData,
    }
    return [band, ...cards]
  }, [flow, focus, notes, positions, sizes])

  const edges = useMemo<BuiltInEdge[]>(() => {
    /* Edges leave and arrive along the direction the journeys run, unless they say otherwise. */
    const [out, into] = flow.direction === "right" ? ["right", "left"] : ["bottom", "top"]
    return flow.edges.map((e, i) => {
        const look = EDGE_LOOK[e.kind ?? "base"]
        const lit = focus === "all" || edgeScenarios(e, nodeById).includes(focus)
        return {
          id: e.id ?? `edge-${i}`,
          source: e.from,
          target: e.to,
          sourceHandle: `${e.fromSide ?? out}-out`,
          targetHandle: `${e.toSide ?? into}-in`,
          type: "smoothstep",
          label: lit ? e.label : undefined,
          pathOptions: e.offset != null ? { offset: e.offset } : undefined,
          markerEnd: { type: MarkerType.ArrowClosed, width: 15, height: 15, color: look.stroke },
          style: { stroke: look.stroke, strokeWidth: 1.4, strokeDasharray: look.dash, opacity: lit ? 1 : 0.1 },
        }
    })
  }, [flow, focus, nodeById])

  /* The graph is controlled: a drag only sticks if we store where the card
     landed, and React Flow only treats a card as ready once we hand back the
     size it measured. */
  const onNodesChange = useCallback(
    (changes: NodeChange[]) => {
      let moved = positions
      const measured: Sizes = {}
      for (const ch of changes) {
        if (ch.type !== "position" && ch.type !== "dimensions") continue
        if (ch.id === "band") continue
        const card = nodeById.get(ch.id)
        if (ch.type === "position" && ch.position && card) {
          moved = { ...moved, [ch.id]: { x: Math.round(ch.position.x), y: Math.round(ch.position.y), fx: card.x, fy: card.y } }
        }
        if (ch.type === "dimensions" && ch.dimensions) measured[ch.id] = ch.dimensions
      }
      if (moved !== positions) onPositionsChange(moved)
      if (Object.keys(measured).length) setSizes((prev) => ({ ...prev, ...measured }))
    },
    [positions, onPositionsChange, nodeById],
  )

  /* Fullscreen: re-fit on enter and exit, Escape to leave (unless a dialog owns Escape). */
  useEffect(() => {
    const t = setTimeout(() => rf.current?.fitView({ ...FIT, duration: 200 }), 60)
    return () => clearTimeout(t)
  }, [fullscreen])
  useEffect(() => {
    if (!fullscreen) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !document.querySelector("dialog[open]")) setFullscreen(false)
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [fullscreen])

  return (
    <div className={fullscreen ? "canvas is-fullscreen" : "canvas"}>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        nodeTypes={nodeTypes}
        colorMode={theme}
        fitView
        fitViewOptions={FIT}
        minZoom={0.15}
        maxZoom={1.75}
        nodesConnectable={false}
        nodesDraggable={!noteMode}
        onInit={(instance) => {
          rf.current = instance as unknown as ReactFlowInstance
        }}
        onNodeClick={(_, node) => {
          const card = nodeById.get(node.id)
          if (!card) return
          if (noteMode) onNoteCard(card)
          else if (card.type !== "decision") onOpenCard(card)
        }}
      >
        <Background color="var(--grid)" gap={24} size={1.5} />
        <Controls showInteractive={false} />

        {fullscreen && (
          <Panel position="top-left">
            <div className="floating">{chips}</div>
          </Panel>
        )}

        <Panel position="top-right">
          <div className="canvas-actions">
            {tray}
            <button type="button" className="btn" onClick={() => setFullscreen((v) => !v)} title={fullscreen ? "Exit fullscreen (Esc)" : "Fullscreen"}>
              <Icon name={fullscreen ? "collapse" : "expand"} size={14} />
              {fullscreen ? "Exit fullscreen" : "Fullscreen"}
            </button>
          </div>
        </Panel>

        <Panel position="bottom-center">
          <div className="mode-switch" role="group" aria-label="Canvas mode">
            <button type="button" className={noteMode ? "mode" : "mode is-on"} aria-pressed={!noteMode} onClick={() => setNoteMode(false)}>
              Move
            </button>
            <button type="button" className={noteMode ? "mode is-on is-note" : "mode"} aria-pressed={noteMode} onClick={() => setNoteMode(true)} title="Leave notes on cards, then copy them for your agent">
              Comment
            </button>
            {noteMode && <span className="mode-hint">click a card to leave a note</span>}
          </div>
        </Panel>
      </ReactFlow>
    </div>
  )
}

/** Query parameters from the URL and from the hash route (`#/slug?focus=x`). */
export function queryString(): string {
  const fromHash = window.location.hash.split("?")[1] ?? ""
  return [window.location.search.replace(/^\?/, ""), fromHash].filter(Boolean).join("&")
}
