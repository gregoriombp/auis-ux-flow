export type Side = "top" | "bottom" | "left" | "right"
export type EdgeKind = "base" | "branch" | "cross"

export type FlowScenario = {
  id: string
  label: string
  /** A palette name (blue, emerald, purple, teal, lime, slate, pink) or any CSS color. */
  color?: string
  summary?: string
}

export type FlowVariant = { label: string; href: string }

export type FlowNode = {
  id: string
  type?: "screen" | "decision"
  x: number
  y: number
  step?: string
  title: string
  note?: string
  question?: string
  href?: string
  variants?: FlowVariant[]
  route?: string
  states?: string[]
  scenarios: string[]
}

export type FlowEdge = {
  id?: string
  from: string
  to: string
  fromSide?: Side
  toSide?: Side
  kind?: EdgeKind
  label?: string
  offset?: number
  scenarios?: string[]
}

export type FlowDocItem = { title: string; body: string }
export type FlowUpdate = { date: string; summary: string; tags?: string[] }

export type Flow = {
  slug: string
  title: string
  intro?: string
  baseUrl?: string
  /** Which way the journeys run. Sets the default edge sides: down = bottom to top, right = right to left. */
  direction?: "down" | "right"
  scenarios: FlowScenario[]
  nodes: FlowNode[]
  edges: FlowEdge[]
  shared?: FlowDocItem[]
  gaps?: FlowDocItem[]
  updates?: FlowUpdate[]
}

export type Focus = string // a scenario id, or "all"

export type LoadedFlow = { flow: Flow; errors: string[]; warnings: string[] }

export type LoadResult =
  | { state: "no-manifest" }
  | { state: "ready"; flows: LoadedFlow[]; missing: string[] }

export type Note = { id: string; text: string; at: number }
export type Notes = Record<string, Note[]>
export type Positions = Record<string, { x: number; y: number }>

declare global {
  const __VIEWER_VERSION__: string
  interface Window {
    AUIS_UX_FLOWS?: unknown
    AuisUxFlow?: { define: (flow: unknown) => void }
  }
}
