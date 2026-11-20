// Rules a flow file must satisfy. Zero dependencies: the validator CLI
// (validate.mjs) and the viewer both import this module, so a flow that
// passes here renders the same way in the browser.

export const SIDES = ["top", "bottom", "left", "right"]
export const EDGE_KINDS = ["base", "branch", "cross"]
export const NODE_TYPES = ["screen", "decision"]
export const DIRECTIONS = ["down", "right"]
export const UPDATE_TAGS = [
  "created",
  "new-scenario",
  "removed-scenario",
  "new-screen",
  "removed-screen",
  "new-branch",
  "rework",
]

/** Named scenario colors, in the order to hand them out. */
export const PALETTE = ["blue", "emerald", "purple", "lime", "slate", "cyan", "pink"]
/** Reserved: amber is the decision language, red reads as an error. */
export const RESERVED_COLORS = ["amber", "yellow", "orange", "red"]

/** Card width, and the height of a plain card (px). */
export const CARD = { w: 216, h: 104 }

const wrapped = (text, perLine) => Math.max(1, Math.ceil(String(text ?? "").length / perLine))

/** Roughly how tall a card renders, from what it carries. Cards with a route and states run to 180px. */
export function cardHeight(node) {
  let h = 24 + wrapped(node.title, 26) * 18
  if (node.type === "decision") return h + 18 + (isText(node.question) ? wrapped(node.question, 36) * 16 : 0)
  if (isText(node.step)) h += 16
  if (isText(node.note)) h += wrapped(node.note, 36) * 16
  if (isText(node.route)) h += 20
  if (isList(node.states) && node.states.length) h += wrapped(node.states.join(" · "), 34) * 15
  if (isList(node.variants) && node.variants.length > 1) h += 17
  return h
}

const KEBAB = /^[a-z0-9]+(?:-[a-z0-9]+)*$/
const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/
const SAFE_HREF = /^(?:https?:\/\/|\/|\.{1,2}\/|#|[\w.-]+(?:[/?#]|$))/i

const isText = (v) => typeof v === "string" && v.trim().length > 0
const isList = (v) => Array.isArray(v)

/** True when `href` is a plain http(s) or relative URL (never javascript:, data:…). */
export function isSafeHref(href) {
  if (typeof href !== "string") return false
  const value = href.trim()
  if (!value) return false
  if (/^[a-z][a-z0-9+.-]*:/i.test(value)) return /^https?:\/\//i.test(value)
  return SAFE_HREF.test(value)
}

/** Scenarios that light an edge up: its own list, or the ones both endpoints share. */
export function edgeScenarios(edge, nodeById) {
  if (isList(edge.scenarios) && edge.scenarios.length) return edge.scenarios
  const a = nodeById.get(edge.from)?.scenarios ?? []
  const b = nodeById.get(edge.to)?.scenarios ?? []
  return a.filter((s) => b.includes(s))
}

/**
 * Checks one flow object. Returns `{ errors, warnings }`, each a list of
 * human-readable strings. Errors mean the flow is wrong or will not render;
 * warnings mean it renders but probably misleads the reader.
 */
export function checkFlow(flow) {
  const errors = []
  const warnings = []
  const err = (m) => errors.push(m)
  const warn = (m) => warnings.push(m)

  if (!flow || typeof flow !== "object") return { errors: ["The flow is not an object."], warnings }

  if (!isText(flow.slug)) err("`slug` is missing.")
  else if (!KEBAB.test(flow.slug)) err(`\`slug\` "${flow.slug}" must be kebab-case (a-z, 0-9, hyphens).`)
  if (!isText(flow.title)) err("`title` is missing.")
  if (flow.baseUrl != null && !/^https?:\/\//i.test(String(flow.baseUrl))) {
    err(`\`baseUrl\` "${flow.baseUrl}" must start with http:// or https://.`)
  }

  if (flow.direction != null && !DIRECTIONS.includes(flow.direction)) {
    err(`\`direction\` "${flow.direction}" is not one of ${DIRECTIONS.join(", ")}.`)
  }

  /* ── Scenarios ── */
  const scenarioIds = new Set()
  if (!isList(flow.scenarios) || flow.scenarios.length === 0) {
    err("`scenarios` must list at least one scenario.")
  } else {
    for (const [i, s] of flow.scenarios.entries()) {
      const at = `scenarios[${i}]`
      if (!s || !isText(s.id)) {
        err(`${at}: \`id\` is missing.`)
        continue
      }
      if (!KEBAB.test(s.id)) err(`${at}: id "${s.id}" must be kebab-case.`)
      if (s.id === "all") err(`${at}: "all" is reserved for the lens that shows everything.`)
      if (scenarioIds.has(s.id)) err(`${at}: duplicate scenario id "${s.id}".`)
      scenarioIds.add(s.id)
      if (!isText(s.label)) err(`${at} ("${s.id}"): \`label\` is missing.`)
      if (isText(s.color) && RESERVED_COLORS.includes(s.color.toLowerCase())) {
        warn(`${at} ("${s.id}"): color "${s.color}" is reserved (amber marks decisions, red reads as an error). Use one of: ${PALETTE.join(", ")}.`)
      }
      if (!isText(s.summary)) warn(`${at} ("${s.id}"): add a one-line \`summary\` (shown under "Compiled scenarios").`)
    }
    if (flow.scenarios.length === 1) warn("Only one scenario: a compiled view earns its place by overlaying two or more journeys.")
    if (flow.scenarios.length > 6) warn(`${flow.scenarios.length} scenarios: beyond 6 the dots and lenses stop being legible. Split into two flows.`)
  }

  /* ── Nodes ── */
  const nodeById = new Map()
  if (!isList(flow.nodes) || flow.nodes.length === 0) {
    err("`nodes` must list at least one card.")
  } else {
    for (const [i, n] of flow.nodes.entries()) {
      const at = n && isText(n.id) ? `node "${n.id}"` : `nodes[${i}]`
      if (!n || !isText(n.id)) {
        err(`${at}: \`id\` is missing.`)
        continue
      }
      if (!KEBAB.test(n.id)) err(`${at}: id must be kebab-case and semantic (e.g. "workspace-editor").`)
      if (n.id === "band") err(`${at}: "band" is reserved for the focus band.`)
      if (nodeById.has(n.id)) err(`${at}: duplicate node id.`)
      nodeById.set(n.id, n)
      if (n.type != null && !NODE_TYPES.includes(n.type)) err(`${at}: type "${n.type}" is not one of ${NODE_TYPES.join(", ")}.`)
      if (!Number.isFinite(n.x) || !Number.isFinite(n.y)) err(`${at}: \`x\` and \`y\` must be numbers.`)
      if (!isText(n.title)) err(`${at}: \`title\` is missing.`)
      if (!isList(n.scenarios) || n.scenarios.length === 0) {
        err(`${at}: \`scenarios\` must list every scenario that passes through this card.`)
      } else {
        for (const s of n.scenarios) if (!scenarioIds.has(s)) err(`${at}: unknown scenario "${s}".`)
        if (new Set(n.scenarios).size !== n.scenarios.length) err(`${at}: \`scenarios\` repeats an id.`)
      }
      if (n.href != null && n.href !== "#" && !isSafeHref(n.href)) err(`${at}: href "${n.href}" must be an http(s) or relative URL.`)
      if (n.variants != null) {
        if (!isList(n.variants)) err(`${at}: \`variants\` must be a list of { label, href }.`)
        else {
          for (const [j, v] of n.variants.entries()) {
            if (!v || !isText(v.label)) err(`${at}: variants[${j}] has no \`label\`.`)
            if (!v || !isSafeHref(v.href)) err(`${at}: variants[${j}] needs an http(s) or relative \`href\`.`)
          }
        }
      }
      if (n.states != null && (!isList(n.states) || n.states.some((s) => !isText(s)))) err(`${at}: \`states\` must be a list of strings.`)
      if (n.type === "decision" && !isText(n.question)) warn(`${at}: a decision should carry the \`question\` it asks.`)
    }
  }

  /* ── Edges ── */
  const outgoing = new Map()
  const touched = new Set()
  const edgeIds = new Set()
  if (!isList(flow.edges)) {
    err("`edges` must be a list.")
  } else {
    for (const [i, e] of flow.edges.entries()) {
      const at = e && isText(e.id) ? `edge "${e.id}"` : `edges[${i}]`
      if (!e || typeof e !== "object") {
        err(`${at}: not an object.`)
        continue
      }
      if (isText(e.id)) {
        if (edgeIds.has(e.id)) err(`${at}: duplicate edge id.`)
        edgeIds.add(e.id)
      }
      const from = nodeById.get(e.from)
      const to = nodeById.get(e.to)
      if (!from) err(`${at}: \`from\` points to "${e.from}", which is not a node.`)
      if (!to) err(`${at}: \`to\` points to "${e.to}", which is not a node.`)
      if (e.fromSide != null && !SIDES.includes(e.fromSide)) err(`${at}: fromSide "${e.fromSide}" is not one of ${SIDES.join(", ")}.`)
      if (e.toSide != null && !SIDES.includes(e.toSide)) err(`${at}: toSide "${e.toSide}" is not one of ${SIDES.join(", ")}.`)
      if (e.kind != null && !EDGE_KINDS.includes(e.kind)) err(`${at}: kind "${e.kind}" is not one of ${EDGE_KINDS.join(", ")}.`)
      if (e.offset != null && !Number.isFinite(e.offset)) err(`${at}: \`offset\` must be a number.`)
      if (e.scenarios != null) {
        if (!isList(e.scenarios)) err(`${at}: \`scenarios\` must be a list.`)
        else for (const s of e.scenarios) if (!scenarioIds.has(s)) err(`${at}: unknown scenario "${s}".`)
      }
      if (!from || !to) continue
      if (e.from === e.to) warn(`${at}: connects "${e.from}" to itself.`)
      touched.add(e.from)
      touched.add(e.to)
      outgoing.set(e.from, [...(outgoing.get(e.from) ?? []), e])
      if (edgeScenarios(e, nodeById).length === 0) {
        warn(`${at} (${e.from} → ${e.to}): its two cards share no scenario, so it stays dim under every lens. If both cards are on the same journey, fix their \`scenarios\`. If the edge is a jump into another journey's territory, give the edge its own \`scenarios\` (the journey that makes the jump).`)
      }
      if (isText(e.label) && e.label.length > 28) warn(`${at}: label "${e.label}" is long (${e.label.length} characters) and will run over the cards. Keep edge labels under 28 characters.`)
      if (from.type === "decision") {
        if ((e.kind ?? "base") === "base") warn(`${at}: leaves decision "${e.from}", so use kind "branch" (or "cross").`)
        if (!isText(e.label)) warn(`${at}: leaves decision "${e.from}", so label it with the choice (e.g. "Yes", "No").`)
      }
    }
  }

  /* ── Whole-graph checks (only on a structurally sound flow) ── */
  if (errors.length === 0) {
    for (const n of flow.nodes) {
      if (!touched.has(n.id) && flow.nodes.length > 1) warn(`node "${n.id}": no edge reaches or leaves it.`)
      if (n.type === "decision" && (outgoing.get(n.id)?.length ?? 0) < 2) warn(`node "${n.id}": a decision needs at least two outgoing edges.`)
    }

    if (flow.scenarios.length > 1 && !flow.nodes.some((n) => n.scenarios.length > 1)) {
      warn("No card belongs to more than one scenario: nothing was deduplicated. Merge the screens the journeys share into single cards.")
    }

    /* Each lens must show one connected path, not islands. */
    for (const s of flow.scenarios) {
      const members = flow.nodes.filter((n) => n.scenarios.includes(s.id))
      if (members.length === 0) {
        err(`scenario "${s.id}": no card lists it.`)
        continue
      }
      const links = new Map(members.map((n) => [n.id, []]))
      for (const e of flow.edges) {
        if (!links.has(e.from) || !links.has(e.to)) continue
        if (!edgeScenarios(e, nodeById).includes(s.id)) continue
        links.get(e.from).push(e.to)
        links.get(e.to).push(e.from)
      }
      const seen = new Set([members[0].id])
      const queue = [members[0].id]
      while (queue.length) for (const next of links.get(queue.pop())) if (!seen.has(next)) (seen.add(next), queue.push(next))
      const islands = members.filter((n) => !seen.has(n.id)).map((n) => n.id)
      if (islands.length) {
        warn(`scenario "${s.id}": under its lens these cards are cut off from the rest of the path: ${islands.join(", ")}. Check which cards list "${s.id}" and which edges light up for it.`)
      }
    }

    /* Overlapping cards. */
    const box = (n) => ({ id: n.id, x: n.x, y: n.y, r: n.x + CARD.w, b: n.y + cardHeight(n) })
    const boxes = flow.nodes.map(box)
    for (let i = 0; i < boxes.length; i++) {
      for (let j = i + 1; j < boxes.length; j++) {
        const a = boxes[i]
        const b = boxes[j]
        if (a.x < b.r + 8 && b.x < a.r + 8 && a.y < b.b + 8 && b.y < a.b + 8) {
          warn(`nodes "${a.id}" and "${b.id}" overlap (cards are ${CARD.w}px wide; these two are about ${a.b - a.y}px and ${b.b - b.y}px tall). Move one of them.`)
        }
      }
    }

    /* A straight edge between two aligned cards must not run through a third. */
    const [out, into] = flow.direction === "right" ? ["right", "left"] : ["bottom", "top"]
    for (const [i, e] of flow.edges.entries()) {
      const a = boxes.find((n) => n.id === e.from)
      const b = boxes.find((n) => n.id === e.to)
      const sides = `${e.fromSide ?? out}>${e.toSide ?? into}`
      const name = isText(e.id) ? `edge "${e.id}"` : `edges[${i}]`
      const horizontal = (sides === "right>left" || sides === "left>right") && Math.abs(a.y - b.y) < 30
      const vertical = (sides === "bottom>top" || sides === "top>bottom") && Math.abs(a.x - b.x) < 30
      if (!horizontal && !vertical) continue
      for (const n of boxes) {
        if (n.id === a.id || n.id === b.id) continue
        const lineY = a.y + 34
        const lineX = a.x + CARD.w / 2
        const hit = horizontal
          ? n.y <= lineY && lineY <= n.b && n.x < Math.max(a.x, b.x) && n.r > Math.min(a.r, b.r)
          : n.x <= lineX && lineX <= n.r && n.y < Math.max(a.y, b.y) && n.b > Math.min(a.b, b.b)
        if (hit) warn(`${name} (${e.from} → ${e.to}): runs straight through card "${n.id}". Move the card out of the way, or route the edge through other sides.`)
      }
    }

    /* A lens draws a band around its cards: scattered cards make the band cover other journeys. */
    for (const s of flow.scenarios) {
      const mine = boxes.filter((n) => nodeById.get(n.id).scenarios.includes(s.id))
      if (mine.length < 2) continue
      const x0 = Math.min(...mine.map((n) => n.x))
      const y0 = Math.min(...mine.map((n) => n.y))
      const x1 = Math.max(...mine.map((n) => n.r))
      const y1 = Math.max(...mine.map((n) => n.b))
      const inside = boxes.filter((n) => !mine.includes(n) && (n.x + n.r) / 2 > x0 && (n.x + n.r) / 2 < x1 && (n.y + n.b) / 2 > y0 && (n.y + n.b) / 2 < y1)
      if (inside.length >= Math.max(2, Math.ceil(mine.length * 0.3))) {
        warn(`scenario "${s.id}": its band would cover ${inside.length} cards of other scenarios (${inside.map((n) => n.id).join(", ")}). Keep a scenario's cards together: its own lane plus the trunk.`)
      }
    }
  }

  /* ── Docs and changelog ── */
  for (const key of ["shared", "gaps"]) {
    if (flow[key] == null) continue
    if (!isList(flow[key])) err(`\`${key}\` must be a list of { title, body }.`)
    else for (const [i, d] of flow[key].entries()) if (!d || !isText(d.title) || !isText(d.body)) err(`${key}[${i}] needs a \`title\` and a \`body\`.`)
  }
  if (errors.length === 0 && flow.scenarios.length > 1 && !(flow.shared?.length > 0)) {
    warn("`shared` is empty: list each shared card and why it is one card (the dedup ledger).")
  }
  if (flow.updates == null || (isList(flow.updates) && flow.updates.length === 0)) {
    warn("`updates` is empty: seed the changelog with a \"created\" entry dated today.")
  } else if (!isList(flow.updates)) {
    err("`updates` must be a list.")
  } else {
    for (const [i, u] of flow.updates.entries()) {
      if (!u || !ISO_DATE.test(String(u.date))) err(`updates[${i}]: \`date\` must be YYYY-MM-DD.`)
      if (!u || !isText(u.summary)) err(`updates[${i}]: \`summary\` is missing.`)
      if (u?.tags != null) {
        if (!isList(u.tags)) err(`updates[${i}]: \`tags\` must be a list.`)
        else for (const t of u.tags) if (!UPDATE_TAGS.includes(t)) warn(`updates[${i}]: unknown tag "${t}". Known tags: ${UPDATE_TAGS.join(", ")}.`)
      }
    }
  }

  return { errors, warnings }
}
