import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react"
import {
  Background,
  BackgroundVariant,
  BaseEdge,
  Controls,
  EdgeLabelRenderer,
  Handle,
  MarkerType,
  Panel,
  Position,
  ReactFlow,
  getSmoothStepPath,
  type Edge,
  type EdgeProps,
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
type BandData = { title: string; color: string; cards: number; shared: number }
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
        <span key={d.id} className="dot" style={{ background: d.color, color: d.color }} title={d.label} />
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

/** The measured frame drawn around the focused scenario's cards. */
function Band({ data }: NodeProps<Node<BandData>>) {
  return (
    <div className="band" style={{ "--tint": data.color } as React.CSSProperties}>
      <span className="band-measure" aria-hidden="true">
        <span>
          {data.cards} cards · {data.shared} shared
        </span>
      </span>
      <span className="eyebrow band-title">{data.title}</span>
      <i className="band-corner is-tl" />
      <i className="band-corner is-tr" />
      <i className="band-corner is-bl" />
      <i className="band-corner is-br" />
    </div>
  )
}

const nodeTypes = { screen: ScreenCard, decision: DecisionCard, band: Band }

/* ─── Edges ─────────────────────────────────────────────────────────── */

const EDGE_LOOK = {
  base: { stroke: "var(--edge)", dash: undefined },
  branch: { stroke: "var(--decision-line)", dash: undefined },
  cross: { stroke: "var(--cross)", dash: "4 4" },
} as const

type FlowEdgeData = {
  kind: keyof typeof EDGE_LOOK
  lit: boolean
  /** The focused scenario's colour when a lens is on and this edge belongs to it. */
  lens?: string
  offset?: number
  text?: string
}

/** A hairline step path, a port at the start, an arrow at the end, and moving light under a lens. */
function FlowEdge({ id, sourceX, sourceY, targetX, targetY, sourcePosition, targetPosition, data, markerEnd }: EdgeProps<Edge<FlowEdgeData>>) {
  const look = EDGE_LOOK[data?.kind ?? "base"]
  const lit = data?.lit ?? true
  const lens = data?.lens
  const [path, labelX, labelY] = getSmoothStepPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
    borderRadius: 14,
    offset: data?.offset,
  })
  const stroke = lens && data?.kind === "base" ? "var(--edge-lit)" : look.stroke
  return (
    <>
      <g className={lit ? "edge" : "edge is-dim"}>
        <BaseEdge id={id} path={path} className="edge-line" markerEnd={markerEnd} style={{ stroke, strokeDasharray: look.dash }} />
        {lens && <path d={path} className="edge-flow" stroke={lens} />}
        <circle cx={sourceX} cy={sourceY} r={2.4} className="edge-port" stroke={stroke} />
      </g>
      {data?.text && (
        <EdgeLabelRenderer>
          <span
            className={`edge-label${data.kind === "branch" ? " is-branch" : data.kind === "cross" ? " is-cross" : ""}`}
            style={{ transform: `translate(-50%, -50%) translate(${labelX}px, ${labelY}px)`, opacity: lit ? 1 : 0 }}
          >
            {data.text}
          </span>
        </EdgeLabelRenderer>
      )}
    </>
  )
}

const edgeTypes = { flow: FlowEdge }

/* Leave room for the floating controls, and for the lens frame and its dimension line, when framing the graph. */
const FIT = { padding: { top: "80px", right: "56px", bottom: "84px", left: "56px" } } as const

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
      className: focus === "all" ? undefined : n.scenarios.includes(focus) ? "is-lit" : "is-dim",
      style: focus === "all" ? undefined : ({ "--lens": scenarioColor(flow, focus) } as React.CSSProperties),
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
      data: {
        title: scenarioLabel(flow, focus),
        color: scenarioColor(flow, focus),
        cards: members.length,
        shared: members.filter((n) => n.scenarios.length > 1).length,
      } satisfies BandData,
    }
    return [band, ...cards]
  }, [flow, focus, notes, positions, sizes])

  const edges = useMemo<Edge<FlowEdgeData>[]>(() => {
    /* Edges leave and arrive along the direction the journeys run, unless they say otherwise. */
    const [out, into] = flow.direction === "right" ? ["right", "left"] : ["bottom", "top"]
    const lens = focus === "all" ? undefined : scenarioColor(flow, focus)
    return flow.edges.map((e, i) => {
      const lit = focus === "all" || edgeScenarios(e, nodeById).includes(focus)
      return {
        id: e.id ?? `edge-${i}`,
        source: e.from,
        target: e.to,
        sourceHandle: `${e.fromSide ?? out}-out`,
        targetHandle: `${e.toSide ?? into}-in`,
        type: "flow",
        zIndex: lit && lens ? 2 : 1,
        /* A small open chevron: direction stays readable on loops and in the light theme. */
        markerEnd: {
          type: MarkerType.Arrow,
          width: 11,
          height: 11,
          strokeWidth: 1.4,
          color: lens && lit && (e.kind ?? "base") === "base" ? "var(--edge-lit)" : EDGE_LOOK[e.kind ?? "base"].stroke,
        },
        data: { kind: e.kind ?? "base", lit, lens: lit ? lens : undefined, offset: e.offset, text: e.label },
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
        edgeTypes={edgeTypes}
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
        <Background id="lines" variant={BackgroundVariant.Lines} color="var(--grid-line)" gap={240} lineWidth={1} />
        <Background id="dots" variant={BackgroundVariant.Dots} color="var(--grid)" gap={24} size={1.2} />
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
