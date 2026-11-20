import { createReadStream, existsSync, readFileSync, statSync } from "node:fs"
import { extname, join, normalize } from "node:path"
import { fileURLToPath } from "node:url"
import react from "@vitejs/plugin-react"
import { defineConfig, type Plugin } from "vite"
import { viteSingleFile } from "vite-plugin-singlefile"

const here = fileURLToPath(new URL(".", import.meta.url))
const demo = join(here, "..", "docs")
const version = JSON.parse(readFileSync(join(here, "package.json"), "utf8")).version as string

const TYPES: Record<string, string> = {
  ".js": "text/javascript",
  ".html": "text/html",
  ".css": "text/css",
  ".svg": "image/svg+xml",
}

/** In dev, serve the demo's data files (flows.js, *.flow.js, screens/) next to the viewer. */
function demoData(): Plugin {
  return {
    name: "auis-ux-flow:demo-data",
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        const path = normalize(decodeURIComponent((req.url ?? "/").split("?")[0]))
        if (path === "/" || path === "/index.html" || path.includes("..")) return next()
        const file = join(demo, path)
        if (!existsSync(file) || !statSync(file).isFile()) return next()
        res.setHeader("Content-Type", TYPES[extname(file)] ?? "application/octet-stream")
        createReadStream(file).pipe(res)
      })
    },
  }
}

/** Stamp the viewer version into the HTML so a copied index.html can be told apart from a newer one. */
function stampVersion(): Plugin {
  return {
    name: "auis-ux-flow:version",
    transformIndexHtml: (html) => html.replaceAll("__VIEWER_VERSION__", version),
  }
}

export default defineConfig({
  base: "./",
  define: { __VIEWER_VERSION__: JSON.stringify(version) },
  plugins: [react(), demoData(), stampVersion(), viteSingleFile()],
  server: { fs: { allow: [join(here, "..")] } },
  build: { target: "es2022", outDir: "dist", emptyOutDir: true },
})
