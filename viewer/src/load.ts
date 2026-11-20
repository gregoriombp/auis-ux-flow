import { checkFlow } from "../../skills/auis-ux-flow/scripts/flow-rules.mjs"
import type { Flow, LoadResult, LoadedFlow } from "./types"

const SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/

function inject(src: string): Promise<boolean> {
  return new Promise((resolve) => {
    const el = document.createElement("script")
    el.src = src
    el.onload = () => resolve(true)
    el.onerror = () => resolve(false)
    document.head.appendChild(el)
  })
}

/**
 * Reads the manifest (`flows.js`, already run by a plain <script> tag) and
 * loads each `<slug>.flow.js` through a script tag too. Script tags, not
 * fetch: the viewer has to work when opened straight from disk (file://).
 */
export async function loadFlows(): Promise<LoadResult> {
  const manifest = window.AUIS_UX_FLOWS
  if (!Array.isArray(manifest)) return { state: "no-manifest" }

  const bySlug = new Map<string, unknown[]>()
  let current = ""
  window.AuisUxFlow = {
    define(flow) {
      bySlug.set(current, [...(bySlug.get(current) ?? []), flow])
    },
  }

  const flows: LoadedFlow[] = []
  const missing: string[] = []
  for (const slug of manifest) {
    if (typeof slug !== "string" || !SLUG.test(slug)) {
      missing.push(String(slug))
      continue
    }
    current = slug
    const ok = await inject(`${slug}.flow.js`)
    const defined = bySlug.get(slug) ?? []
    if (!ok || defined.length === 0) {
      missing.push(slug)
      continue
    }
    const raw = defined[defined.length - 1]
    const { errors, warnings } = checkFlow(raw)
    const flow = raw as Flow
    if (flow && typeof flow === "object" && flow.slug !== slug) errors.unshift(`\`slug\` is "${flow.slug}" but flows.js lists it as "${slug}".`)
    flows.push({ flow: { ...flow, slug }, errors, warnings })
  }
  return { state: "ready", flows, missing }
}
