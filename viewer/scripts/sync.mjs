// Copies the built single-file viewer to the two places that ship it:
// the skill's asset (what gets copied into a user's repo) and the demo.
import { copyFileSync, statSync } from "node:fs"
import { fileURLToPath } from "node:url"

const built = fileURLToPath(new URL("../dist/index.html", import.meta.url))
const targets = ["../../skills/auis-ux-flow/assets/viewer.html", "../../docs/index.html"]

for (const target of targets) {
  const to = fileURLToPath(new URL(target, import.meta.url))
  copyFileSync(built, to)
  console.log(`synced ${target.replace("../../", "")} (${Math.round(statSync(to).size / 1024)} KB)`)
}
