import { useEffect, useState, useSyncExternalStore } from "react"
import { FlowPage } from "./FlowPage"
import { Icon } from "./icons"
import { scenarioColor } from "./palette"
import { readTheme, writeTheme } from "./storage"
import type { LoadResult } from "./types"

const REPO = "https://github.com/gregoriombp/auis-ux-flow"
const AUIS = "https://github.com/gregoriombp/AuisDesign"

const subscribeHash = (cb: () => void) => {
  window.addEventListener("hashchange", cb)
  return () => window.removeEventListener("hashchange", cb)
}
/** `#/checkout?focus=guest` → "checkout". */
const currentSlug = () => window.location.hash.replace(/^#\/?/, "").split("?")[0]

export function App({ result }: { result: LoadResult }) {
  const slug = useSyncExternalStore(subscribeHash, currentSlug)
  const [theme, setTheme] = useState(readTheme)
  const flows = result.state === "ready" ? result.flows : []
  const active = flows.find((f) => f.flow.slug === slug) ?? (flows.length === 1 ? flows[0] : undefined)

  useEffect(() => {
    if (!active) document.title = "UX flows"
  }, [active])

  const toggleTheme = () => {
    const next = theme === "dark" ? "light" : "dark"
    writeTheme(next)
    setTheme(next)
  }

  return (
    <div className="page">
      <nav className="topbar">
        {active && flows.length > 1 ? (
          <a className="crumb" href="#/">
            <Icon name="back" size={14} />
            All flows
          </a>
        ) : (
          <span className="crumb crumb-static">UX flows</span>
        )}
        <button type="button" className="btn btn-icon btn-quiet" onClick={toggleTheme} aria-label={theme === "dark" ? "Switch to light theme" : "Switch to dark theme"}>
          <Icon name={theme === "dark" ? "sun" : "moon"} />
        </button>
      </nav>

      <main>
        {result.state === "no-manifest" ? (
          <Empty />
        ) : active ? (
          <FlowPage key={active.flow.slug} loaded={active} theme={theme} />
        ) : (
          <Index result={result} unknown={slug && !flows.some((f) => f.flow.slug === slug) ? slug : ""} />
        )}
      </main>

      <footer className="footer">
        <a href={REPO} target="_blank" rel="noreferrer">
          auis-ux-flow
        </a>
        <span>viewer {__VIEWER_VERSION__}</span>
        <a href={AUIS} target="_blank" rel="noreferrer">
          Part of Auis
        </a>
      </footer>
    </div>
  )
}

function Index({ result, unknown }: { result: Extract<LoadResult, { state: "ready" }>; unknown: string }) {
  return (
    <>
      <header className="hero">
        <div className="hero-row">
          <h1>UX flows</h1>
        </div>
        <p className="hero-intro">Compiled views of how this product works: several journeys on one board, shared screens drawn once, one lens per scenario.</p>
      </header>
      {unknown && <p className="notice">There is no flow called "{unknown}".</p>}
      {result.missing.length > 0 && (
        <p className="notice">
          flows.js lists {result.missing.map((m) => `"${m}"`).join(", ")}, but {result.missing.length === 1 ? "its file" : "their files"} did not load. Each slug needs a <code>&lt;slug&gt;.flow.js</code> next to this page, wrapped in <code>{"{ }"}</code> so its constants do not collide with another flow. Run the validator to see why.
        </p>
      )}
      {result.flows.length === 0 ? (
        <p className="notice">flows.js is empty. Ask your agent to map a set of journeys with the auis-ux-flow skill.</p>
      ) : (
        <ul className="flow-grid">
          {result.flows.map(({ flow, errors }) => (
            <li key={flow.slug}>
              <a href={`#/${flow.slug}`} className="flow-card">
                <span className="flow-card-dots">
                  {flow.scenarios?.map((s) => (
                    <span key={s.id} className="dot dot-lg" style={{ background: scenarioColor(flow, s.id) }} title={s.label} />
                  ))}
                </span>
                <strong>{flow.title}</strong>
                {flow.intro && <p>{flow.intro}</p>}
                <span className="muted">
                  {flow.scenarios?.length ?? 0} scenarios · {flow.nodes?.length ?? 0} cards
                  {errors.length ? ` · ${errors.length} error${errors.length === 1 ? "" : "s"}` : ""}
                </span>
              </a>
            </li>
          ))}
        </ul>
      )}
    </>
  )
}

function Empty() {
  return (
    <>
      <header className="hero">
        <div className="hero-row">
          <h1>No flows yet</h1>
        </div>
        <p className="hero-intro">
          This viewer shows the flows listed in <code>flows.js</code>, the file that sits next to it. It was not found, or it does not set <code>window.AUIS_UX_FLOWS</code>.
        </p>
      </header>
      <div className="docs">
        <section>
          <h2>Create the first one</h2>
          <p>
            Install the <a href={REPO}>auis-ux-flow</a> skill and ask your agent to map a few journeys of your product, for example: <em>map sign-up, invite and checkout as a UX flow</em>. It writes the flow file, lists it in <code>flows.js</code> and this page shows it.
          </p>
        </section>
      </div>
    </>
  )
}
