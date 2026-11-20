import type { Flow } from "./types"

/** Named scenario colors. The values live in styles.css so they follow the theme. */
const NAMED = new Set(["blue", "emerald", "purple", "teal", "lime", "slate", "pink"])
const ORDER = ["blue", "emerald", "purple", "teal", "lime", "slate", "pink"]

export function scenarioColor(flow: Flow, id: string): string {
  const index = flow.scenarios.findIndex((s) => s.id === id)
  const chosen = flow.scenarios[index]?.color?.trim()
  if (chosen && NAMED.has(chosen.toLowerCase())) return `var(--sc-${chosen.toLowerCase()})`
  if (chosen) return chosen
  return `var(--sc-${ORDER[Math.max(index, 0) % ORDER.length]})`
}

export function scenarioLabel(flow: Flow, id: string): string {
  return flow.scenarios.find((s) => s.id === id)?.label ?? id
}
