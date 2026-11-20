#!/usr/bin/env node
// Validates a ux-flows folder: the manifest (flows.js), every <slug>.flow.js
// it lists, and that the viewer (index.html) is there. Zero dependencies.
//
//   node validate.mjs [dir]        dir defaults to ./ux-flows
//
// Exit code: 0 clean or warnings only, 1 errors, 2 the folder cannot be read.

import { existsSync, readFileSync, readdirSync } from "node:fs"
import { join, resolve } from "node:path"
import vm from "node:vm"
import { checkFlow } from "./flow-rules.mjs"

const dir = resolve(process.argv[2] ?? "ux-flows")
const SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/

function fail(message) {
  console.error(`validate: ${message}`)
  process.exit(2)
}

/**
 * Runs a data file in an empty sandbox and returns what it handed over.
 *
 * The browser loads every flow file as a plain script into ONE shared scope,
 * so a top-level `const` in two files is a redeclaration and the second file
 * never runs. Running the file twice in the same context reproduces that:
 * `leaks` is true when the file declares something outside a block.
 */
function run(file) {
  const defined = []
  const AuisUxFlow = { define: (flow) => void defined.push(flow) }
  const window = { AuisUxFlow }
  const context = vm.createContext({ window, AuisUxFlow, globalThis: window })
  const code = readFileSync(file, "utf8")
  vm.runInContext(code, context, { filename: file, timeout: 2000 })
  const first = defined.splice(0)
  let leaks = false
  try {
    vm.runInContext(code, context, { filename: file, timeout: 2000 })
  } catch (error) {
    leaks = /already been declared/.test(String(error?.message))
  }
  return { window, defined: first, leaks }
}

if (!existsSync(dir)) fail(`${dir} does not exist.`)
const manifestFile = join(dir, "flows.js")
if (!existsSync(manifestFile)) fail(`${manifestFile} is missing. It must set window.AUIS_UX_FLOWS = ["<slug>", …].`)

let slugs
try {
  slugs = run(manifestFile).window.AUIS_UX_FLOWS
} catch (error) {
  fail(`flows.js does not run: ${error.message}`)
}
if (!Array.isArray(slugs)) fail('flows.js must set window.AUIS_UX_FLOWS to a list of slugs, e.g. ["checkout"].')

let errorCount = 0
let warningCount = 0
const report = (title, errors, warnings) => {
  errorCount += errors.length
  warningCount += warnings.length
  const mark = errors.length ? "FAIL" : warnings.length ? "WARN" : "OK  "
  console.log(`${mark}  ${title}`)
  for (const e of errors) console.log(`      error    ${e}`)
  for (const w of warnings) console.log(`      warning  ${w}`)
}

/* Folder-level checks. */
{
  const errors = []
  const warnings = []
  if (!existsSync(join(dir, "index.html"))) warnings.push("index.html is missing: copy the skill's assets/viewer.html to it.")
  for (const s of slugs) if (typeof s !== "string" || !SLUG.test(s)) errors.push(`flows.js lists ${JSON.stringify(s)}, which is not a kebab-case slug.`)
  if (new Set(slugs).size !== slugs.length) errors.push("flows.js lists the same slug twice.")
  const onDisk = readdirSync(dir).filter((f) => f.endsWith(".flow.js")).map((f) => f.slice(0, -".flow.js".length))
  for (const s of onDisk) if (!slugs.includes(s)) warnings.push(`${s}.flow.js exists but flows.js does not list "${s}", so the viewer will not show it.`)
  report("flows.js", errors, warnings)
}

/* One report per flow. */
for (const slug of slugs) {
  if (typeof slug !== "string" || !SLUG.test(slug)) continue
  const file = join(dir, `${slug}.flow.js`)
  if (!existsSync(file)) {
    report(`${slug}.flow.js`, [`listed in flows.js but the file is missing.`], [])
    continue
  }
  let defined
  let leaks
  try {
    ;({ defined, leaks } = run(file))
  } catch (error) {
    report(`${slug}.flow.js`, [`does not run: ${error.message}`], [])
    continue
  }
  if (defined.length !== 1) {
    report(`${slug}.flow.js`, [`must call AuisUxFlow.define({ … }) exactly once (found ${defined.length}).`], [])
    continue
  }
  const { errors, warnings } = checkFlow(defined[0])
  if (leaks) errors.unshift("declares constants at the top level. The viewer loads every flow file into one shared scope, so they collide with other flow files: wrap the whole file in a block, `{` on the first line and `}` on the last.")
  if (defined[0]?.slug !== slug) errors.unshift(`\`slug\` is "${defined[0]?.slug}" but the file name says "${slug}".`)
  report(`${slug}.flow.js`, errors, warnings)
}

console.log(`\n${slugs.length} flow${slugs.length === 1 ? "" : "s"}, ${errorCount} error${errorCount === 1 ? "" : "s"}, ${warningCount} warning${warningCount === 1 ? "" : "s"}.`)
process.exit(errorCount ? 1 : 0)
