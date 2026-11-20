import { CARD, cardHeight } from "../../skills/auis-ux-flow/scripts/flow-rules.mjs"
import type { Flow, FlowNode, Side } from "./types"

type Box = { x: number; y: number; w: number; h: number }

const box = (n: FlowNode): Box => ({ x: n.x, y: n.y, w: CARD.w, h: cardHeight(n) })

/** Where an edge leaves or enters a card, matching the viewer's handles (side handles sit 34px down). */
function anchor(b: Box, side: Side): [number, number] {
  if (side === "left") return [b.x, b.y + 34]
  if (side === "right") return [b.x + b.w, b.y + 34]
  if (side === "top") return [b.x + b.w / 2, b.y]
  return [b.x + b.w / 2, b.y + b.h]
}

const across = (side: Side) => side === "left" || side === "right"

/** An elbow path between two anchors: close enough to the board's step edges at thumbnail size. */
function elbow(from: [number, number], fromSide: Side, to: [number, number], toSide: Side): string {
  const [sx, sy] = from
  const [tx, ty] = to
  if (across(fromSide) && across(toSide)) {
    const mx = (sx + tx) / 2
    return `M${sx} ${sy}H${mx}V${ty}H${tx}`
  }
  if (!across(fromSide) && !across(toSide)) {
    const my = (sy + ty) / 2
    return `M${sx} ${sy}V${my}H${tx}V${ty}`
  }
  return across(fromSide) ? `M${sx} ${sy}H${tx}V${ty}` : `M${sx} ${sy}V${ty}H${tx}`
}

/** The flow's own cards and edges, drawn small: what the board looks like before you open it. */
export function Thumb({ flow }: { flow: Flow }) {
  const nodes = Array.isArray(flow.nodes) ? flow.nodes.filter((n) => Number.isFinite(n.x) && Number.isFinite(n.y)) : []
  if (nodes.length === 0) return <span className="thumb" aria-hidden="true" />
  const boxes = new Map(nodes.map((n) => [n.id, box(n)]))
  const all = [...boxes.values()]
  const minX = Math.min(...all.map((b) => b.x))
  const minY = Math.min(...all.map((b) => b.y))
  const maxX = Math.max(...all.map((b) => b.x + b.w))
  const maxY = Math.max(...all.map((b) => b.y + b.h))
  const [out, into]: Side[] = flow.direction === "right" ? ["right", "left"] : ["bottom", "top"]

  return (
    <span className="thumb" aria-hidden="true">
      <span className="thumb-dir">{flow.direction === "right" ? "→ left to right" : "↓ top to bottom"}</span>
      <svg viewBox={`${minX - 20} ${minY - 20} ${maxX - minX + 40} ${maxY - minY + 40}`} preserveAspectRatio="xMidYMid meet">
        {(flow.edges ?? []).map((e, i) => {
          const a = boxes.get(e.from)
          const b = boxes.get(e.to)
          if (!a || !b) return null
          const fs = e.fromSide ?? out
          const ts = e.toSide ?? into
          return <path key={e.id ?? i} className="thumb-edge" d={elbow(anchor(a, fs), fs, anchor(b, ts), ts)} />
        })}
        {nodes.map((n) => {
          const b = boxes.get(n.id)!
          const cls = n.type === "decision" ? "thumb-card is-decision" : n.scenarios?.length > 1 ? "thumb-card is-shared" : "thumb-card"
          return <rect key={n.id} className={cls} x={b.x} y={b.y} width={b.w} height={b.h} rx={12} />
        })}
      </svg>
    </span>
  )
}
