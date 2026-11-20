import type { Flow, Notes, Positions } from "./types"

const key = (kind: string, slug: string) => `auis-ux-flow:${kind}:${slug}`

function read<T>(k: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(k)
    return raw ? (JSON.parse(raw) as T) : fallback
  } catch {
    return fallback
  }
}

/** Writes and reports whether it stuck (private windows and full quotas throw). */
function write(k: string, value: unknown): boolean {
  try {
    localStorage.setItem(k, JSON.stringify(value))
    return true
  } catch {
    return false
  }
}

export const readNotes = (slug: string) => read<Notes>(key("notes", slug), {})
export const writeNotes = (slug: string, notes: Notes) => write(key("notes", slug), notes)
/**
 * Dragged positions, minus the stale ones: when the flow file has since moved
 * a card (the agent applied the layout, or re-laid the board), the file wins.
 */
export function readPositions(flow: Flow): Positions {
  const stored = read<Positions>(key("layout", flow.slug), {})
  const fresh: Positions = {}
  for (const n of flow.nodes) {
    const p = stored[n.id]
    if (p && p.fx === n.x && p.fy === n.y) fresh[n.id] = p
  }
  return fresh
}
export const writePositions = (slug: string, positions: Positions) => write(key("layout", slug), positions)

export function readTheme(): "light" | "dark" {
  return document.documentElement.dataset.theme === "dark" ? "dark" : "light"
}
export function writeTheme(theme: "light" | "dark") {
  document.documentElement.dataset.theme = theme
  try {
    localStorage.setItem("auis-ux-flow:theme", theme)
  } catch {
    /* the choice just will not survive a reload */
  }
}

export function countNotes(notes: Notes): number {
  return Object.values(notes).reduce((n, list) => n + list.length, 0)
}

/** The block a person pastes into their agent: notes by card, plus cards they moved. */
export function notesForAgent(flow: Flow, notes: Notes, positions: Positions): string {
  const lines: string[] = [
    `UX flow notes for "${flow.title}" (ux-flows/${flow.slug}.flow.js)`,
    "",
    "Apply these with the auis-ux-flow skill: update the flow file, add a changelog entry if the journey changed, run the validator.",
  ]
  const noted = flow.nodes.filter((n) => notes[n.id]?.length)
  if (noted.length) {
    lines.push("", "## Notes")
    for (const n of noted) for (const note of notes[n.id]) lines.push(`- [${n.id}] ${n.title}: ${note.text.replace(/\s+/g, " ").trim()}`)
  }
  const moved = flow.nodes.filter((n) => {
    const p = positions[n.id]
    return p && (Math.round(p.x) !== n.x || Math.round(p.y) !== n.y)
  })
  if (moved.length) {
    lines.push("", "## Moved cards (new positions)")
    for (const n of moved) lines.push(`- ${n.id}: x ${Math.round(positions[n.id].x)}, y ${Math.round(positions[n.id].y)}`)
  }
  return lines.join("\n")
}
