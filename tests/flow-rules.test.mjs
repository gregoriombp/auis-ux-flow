import assert from "node:assert/strict"
import { execFileSync, spawnSync } from "node:child_process"
import { mkdtempSync, readFileSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { test } from "node:test"
import { fileURLToPath } from "node:url"
import vm from "node:vm"
import { checkFlow, isSafeHref } from "../skills/auis-ux-flow/scripts/flow-rules.mjs"

const root = fileURLToPath(new URL("..", import.meta.url))
const validator = join(root, "skills/auis-ux-flow/scripts/validate.mjs")

/** The example flow, loaded the way the viewer loads it. */
function example() {
  let flow
  const AuisUxFlow = { define: (f) => (flow = f) }
  vm.runInNewContext(readFileSync(join(root, "docs/workspace.flow.js"), "utf8"), { AuisUxFlow, window: { AuisUxFlow } })
  return structuredClone(flow)
}

const messages = (flow) => {
  const { errors, warnings } = checkFlow(flow)
  return { errors: errors.join("\n"), warnings: warnings.join("\n") }
}

test("the example flow is clean", () => {
  assert.deepEqual(checkFlow(example()), { errors: [], warnings: [] })
})

test("an edge to a missing card is an error", () => {
  const flow = example()
  flow.edges[0].to = "nowhere"
  assert.match(messages(flow).errors, /"nowhere", which is not a node/)
})

test("an unknown scenario on a card is an error", () => {
  const flow = example()
  flow.nodes[0].scenarios = ["create", "ghost"]
  assert.match(messages(flow).errors, /unknown scenario "ghost"/)
})

test("duplicate and non-kebab ids are errors", () => {
  const flow = example()
  flow.nodes[1].id = flow.nodes[0].id
  flow.nodes[2].id = "Workspace Editor"
  const { errors } = messages(flow)
  assert.match(errors, /duplicate node id/)
  assert.match(errors, /must be kebab-case/)
})

test("a shared card that forgets a scenario breaks that lens", () => {
  const flow = example()
  flow.nodes.find((n) => n.id === "workspace-editor").scenarios = ["create"]
  assert.match(messages(flow).warnings, /scenario "adjust": under its lens these cards are cut off/)
})

test("an edge no lens can light is reported", () => {
  const flow = example()
  flow.edges.push({ from: "template-gallery", to: "notify-members" })
  assert.match(messages(flow).warnings, /share no scenario/)
})

test("an edge can carry its own scenarios", () => {
  const flow = example()
  flow.edges.push({ from: "template-gallery", to: "notify-members", scenarios: ["adjust"] })
  assert.doesNotMatch(messages(flow).warnings, /share no scenario/)
})

test("overlapping cards and reserved colors are warnings", () => {
  const flow = example()
  flow.nodes[1].x = flow.nodes[0].x + 10
  flow.nodes[1].y = flow.nodes[0].y + 10
  flow.scenarios[0].color = "red"
  const { warnings } = messages(flow)
  assert.match(warnings, /overlap/)
  assert.match(warnings, /color "red" is reserved/)
})

test("a straight edge through a third card is reported", () => {
  const flow = example()
  const editor = flow.nodes.find((n) => n.id === "workspace-editor")
  flow.nodes.find((n) => n.id === "notify-members").x = editor.x - 320 // now sits between the gate and the editor's lane
  flow.nodes.find((n) => n.id === "notify-members").y = editor.y
  flow.edges.push({ id: "skip", from: "d-exists", to: "workspace-editor" })
  assert.match(messages(flow).warnings, /edge "skip" .*runs straight through card "notify-members"/)
})

test("a card dragged far from its lane makes the band cover other journeys", () => {
  const flow = example()
  const builder = flow.nodes.find((n) => n.id === "template-builder")
  builder.x = 1600
  builder.y = 900
  assert.match(messages(flow).warnings, /scenario "template": its band would cover \d+ cards of other scenarios/)
})

test("tall cards count as tall when checking overlap", () => {
  const flow = example()
  const a = flow.nodes.find((n) => n.id === "workspace-overview")
  a.route = "/workspaces/[id]"
  a.states = ["archived", "read only", "over quota", "pending transfer"]
  flow.nodes.push({ id: "below", x: a.x, y: a.y + 120, title: "Below", scenarios: ["adjust"] })
  flow.edges.push({ from: "workspace-overview", to: "below", fromSide: "bottom", toSide: "top" })
  assert.match(messages(flow).warnings, /nodes "workspace-overview" and "below" overlap/)
})

test("a decision needs two labelled branch exits", () => {
  const flow = example()
  flow.edges = flow.edges.filter((e) => e.id !== "exists-yes")
  const { warnings } = messages(flow)
  assert.match(warnings, /node "d-exists": a decision needs at least two outgoing edges/)
})

test("script and data URLs are never previewable", () => {
  assert.equal(isSafeHref("javascript:alert(1)"), false)
  assert.equal(isSafeHref("data:text/html,x"), false)
  assert.equal(isSafeHref("/checkout?state=empty"), true)
  assert.equal(isSafeHref("screens/app.html?screen=cart"), true)
  assert.equal(isSafeHref("https://example.com/a"), true)
  const flow = example()
  flow.nodes[0].href = "javascript:alert(1)"
  assert.match(messages(flow).errors, /must be an http\(s\) or relative URL/)
})

test("the CLI passes on the demo folder", () => {
  const out = execFileSync("node", [validator, join(root, "docs")], { encoding: "utf8" })
  assert.match(out, /1 flow, 0 errors, 0 warnings/)
})

test("the CLI fails, with exit code 1, on a broken folder", () => {
  const dir = mkdtempSync(join(tmpdir(), "ux-flows-"))
  writeFileSync(join(dir, "flows.js"), 'window.AUIS_UX_FLOWS = ["broken", "missing"]\n')
  writeFileSync(join(dir, "broken.flow.js"), 'AuisUxFlow.define({ slug: "other", title: "x", scenarios: [], nodes: [], edges: [] })\n')
  const run = spawnSync("node", [validator, dir], { encoding: "utf8" })
  assert.equal(run.status, 1)
  assert.match(run.stdout, /`slug` is "other" but the file name says "broken"/)
  assert.match(run.stdout, /listed in flows.js but the file is missing/)
})

test("the CLI rejects a flow file with top-level constants", () => {
  const dir = mkdtempSync(join(tmpdir(), "ux-flows-"))
  const source = readFileSync(join(root, "docs/workspace.flow.js"), "utf8")
  const unwrapped = source.slice(source.indexOf("{") + 1, source.lastIndexOf("}"))
  writeFileSync(join(dir, "flows.js"), 'window.AUIS_UX_FLOWS = ["workspace"]\n')
  writeFileSync(join(dir, "workspace.flow.js"), unwrapped)
  const run = spawnSync("node", [validator, dir], { encoding: "utf8" })
  assert.equal(run.status, 1)
  assert.match(run.stdout, /wrap the whole file in a block/)
})

test("the CLI exits 2 when there is no manifest", () => {
  const dir = mkdtempSync(join(tmpdir(), "ux-flows-"))
  assert.equal(spawnSync("node", [validator, dir], { encoding: "utf8" }).status, 2)
})
