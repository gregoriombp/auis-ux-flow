import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { Canvas, queryString } from "./Canvas"
import { Icon } from "./icons"
import { NoteComposer, NotesExport, ScreenPreview } from "./overlays"
import { scenarioColor } from "./palette"
import { countNotes, notesForAgent, readNotes, readPositions, writeNotes, writePositions } from "./storage"
import type { Flow, FlowNode, FlowUpdate, Focus, LoadedFlow, Notes, Positions } from "./types"

const TOUR_STEP_MS = 2600

const TAG_LABEL: Record<string, string> = {
  created: "created",
  "new-scenario": "new scenario",
  "removed-scenario": "scenario removed",
  "new-screen": "new screen",
  "removed-screen": "screen removed",
  "new-branch": "new branch",
  rework: "rework",
}

/* Dates are plain local days: never parse `YYYY-MM-DD` as UTC. */
function localDate(iso: string): Date {
  const [y, m, d] = iso.split("-").map(Number)
  return new Date(y, (m ?? 1) - 1, d ?? 1)
}
const shortDate = (iso: string) => localDate(iso).toLocaleDateString("en-GB", { day: "2-digit", month: "short" })
const longDate = (iso: string) => localDate(iso).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })
const newestFirst = (updates: FlowUpdate[]) => [...updates].sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0))

function initialFocus(flow: Flow): Focus {
  const wanted = new URLSearchParams(queryString()).get("focus")
  return wanted && flow.scenarios.some((s) => s.id === wanted) ? wanted : "all"
}

export function FlowPage({ loaded, theme }: { loaded: LoadedFlow; theme: "light" | "dark" }) {
  const { flow, errors, warnings } = loaded
  const [focus, setFocus] = useState<Focus>(() => initialFocus(flow))
  const [notes, setNotes] = useState<Notes>(() => readNotes(flow.slug))
  const [positions, setPositions] = useState<Positions>(() => readPositions(flow))
  const [preview, setPreview] = useState<{ node: FlowNode; variant: number } | null>(null)
  const [previewOpen, setPreviewOpen] = useState(false)
  const [noting, setNoting] = useState<FlowNode | null>(null)
  const [notingOpen, setNotingOpen] = useState(false)
  const [exportOpen, setExportOpen] = useState(false)
  const [layoutKey, setLayoutKey] = useState(0)
  const touring = useRef(new URLSearchParams(queryString()).get("tour") === "1")

  useEffect(() => {
    document.title = `${flow.title} · UX flows`
  }, [flow.title])

  /* Tour: walk the lenses on a loop until the reader picks one. */
  useEffect(() => {
    if (!touring.current) return
    const stops: Focus[] = ["all", ...flow.scenarios.map((s) => s.id)]
    const timer = setInterval(() => {
      if (!touring.current) return clearInterval(timer)
      setFocus((current) => stops[(stops.indexOf(current) + 1) % stops.length])
    }, TOUR_STEP_MS)
    return () => clearInterval(timer)
  }, [flow])

  const pickFocus = useCallback(
    (next: Focus) => {
      touring.current = false
      setFocus(next)
      const query = next === "all" ? "" : `?focus=${next}`
      history.replaceState(null, "", `#/${flow.slug}${query}`)
    },
    [flow.slug],
  )

  /* Dragged cards persist per browser; a failed write only costs the reload. */
  const movePositions = useCallback(
    (next: Positions) => {
      setPositions(next)
      writePositions(flow.slug, next)
    },
    [flow.slug],
  )

  const saveNote = useCallback(
    (text: string) => {
      if (!noting) return false
      const next = { ...notes, [noting.id]: [...(notes[noting.id] ?? []), { id: `${Date.now()}`, text, at: Date.now() }] }
      if (!writeNotes(flow.slug, next)) return false
      setNotes(next)
      return true
    },
    [flow.slug, notes, noting],
  )
  const deleteNote = useCallback(
    (id: string) => {
      if (!noting) return
      const rest = (notes[noting.id] ?? []).filter((n) => n.id !== id)
      const next = { ...notes }
      if (rest.length) next[noting.id] = rest
      else delete next[noting.id]
      setNotes(next)
      writeNotes(flow.slug, next)
    },
    [flow.slug, notes, noting],
  )
  const clearAll = useCallback(() => {
    setNotes({})
    setPositions({})
    writeNotes(flow.slug, {})
    writePositions(flow.slug, {})
    setLayoutKey((k) => k + 1)
    setExportOpen(false)
  }, [flow.slug])

  const noteCount = countNotes(notes)
  const moved = useMemo(
    () => flow.nodes.filter((n) => positions[n.id] && (Math.round(positions[n.id].x) !== n.x || Math.round(positions[n.id].y) !== n.y)).length,
    [flow, positions],
  )
  const updates = useMemo(() => newestFirst(flow.updates ?? []), [flow])
  const sharedCount = flow.nodes.filter((n) => n.scenarios.length > 1).length

  const chips = (
    <div className="chips" role="group" aria-label="Focus">
      <span className="chips-label">Focus</span>
      <button type="button" className={focus === "all" ? "chip is-on" : "chip"} aria-pressed={focus === "all"} onClick={() => pickFocus("all")}>
        All
      </button>
      {flow.scenarios.map((s) => (
        <button key={s.id} type="button" className={focus === s.id ? "chip is-on" : "chip"} aria-pressed={focus === s.id} onClick={() => pickFocus(s.id)}>
          <span className="dot" style={{ background: scenarioColor(flow, s.id) }} />
          {s.label}
        </button>
      ))}
    </div>
  )

  const tray =
    noteCount > 0 || moved > 0 ? (
      <button type="button" className="btn btn-note" onClick={() => setExportOpen(true)} title="Copy notes and moved cards for your agent">
        <Icon name="copy" size={14} />
        {[noteCount ? `${noteCount} note${noteCount === 1 ? "" : "s"}` : "", moved ? `${moved} moved` : ""].filter(Boolean).join(" · ")}
        <span className="btn-sep">Copy for agent</span>
      </button>
    ) : null

  return (
    <>
      <header className="hero">
        <div className="hero-row">
          <h1>{flow.title}</h1>
          <span className="badge badge-amber">compiled view</span>
          {updates[0] && (
            <a className="badge badge-amber" href="#updates" title={updates[0].summary} onClick={(e) => (e.preventDefault(), document.getElementById("updates")?.scrollIntoView({ behavior: "smooth" }))}>
              <span className="pulse" aria-hidden="true" />
              Updated on {shortDate(updates[0].date)}
            </a>
          )}
        </div>
        {flow.intro && <p className="hero-intro">{flow.intro}</p>}
      </header>

      {(errors.length > 0 || warnings.length > 0) && (
        <details className="problems" open={errors.length > 0}>
          <summary>
            <Icon name="warning" size={14} />
            {errors.length ? `${errors.length} error${errors.length === 1 ? "" : "s"}` : ""}
            {errors.length && warnings.length ? " and " : ""}
            {warnings.length ? `${warnings.length} warning${warnings.length === 1 ? "" : "s"}` : ""} in {flow.slug}.flow.js
          </summary>
          <ul>
            {errors.map((e) => (
              <li key={e} className="is-error">{e}</li>
            ))}
            {warnings.map((w) => (
              <li key={w}>{w}</li>
            ))}
          </ul>
        </details>
      )}

      <section className="board" aria-label="Compiled flowchart">
        <div className="board-bar">
          {chips}
          <p className="legend">
            <span>{flow.nodes.length} cards</span>
            <span>{sharedCount} shared</span>
            <span>2+ dots = one screen used by several scenarios</span>
          </p>
        </div>
        <Canvas
          key={layoutKey}
          flow={flow}
          focus={focus}
          theme={theme}
          chips={chips}
          notes={notes}
          positions={positions}
          onPositionsChange={movePositions}
          onOpenCard={(node) => {
            setPreview({ node, variant: 0 })
            setPreviewOpen(true)
          }}
          onNoteCard={(node) => {
            setNoting(node)
            setNotingOpen(true)
          }}
          tray={tray}
        />
      </section>

      <div className="docs">
        <section id="scenarios">
          <h2>Compiled scenarios</h2>
          <ul className="scenario-list">
            {flow.scenarios.map((s) => {
              const cards = flow.nodes.filter((n) => n.scenarios.includes(s.id))
              const shared = cards.filter((n) => n.scenarios.length > 1).length
              return (
                <li key={s.id}>
                  <button type="button" className="scenario-pick" onClick={() => (pickFocus(s.id), window.scrollTo({ top: 0, behavior: "smooth" }))} title="Focus this scenario">
                    <span className="dot dot-lg" style={{ background: scenarioColor(flow, s.id) }} />
                    <strong>{s.label}</strong>
                  </button>
                  {s.summary && <p>{s.summary}</p>}
                  <span className="muted">
                    {cards.length} cards · {shared} shared
                  </span>
                </li>
              )
            })}
          </ul>
        </section>

        {flow.shared?.length ? (
          <section id="shared">
            <h2>Shared screens and convergence</h2>
            <ol className="ledger">
              {flow.shared.map((d) => (
                <li key={d.title}>
                  <strong>{d.title}</strong>
                  <p>{d.body}</p>
                </li>
              ))}
            </ol>
          </section>
        ) : null}

        {flow.gaps?.length ? (
          <section id="gaps">
            <h2>Gaps the map exposes</h2>
            <ol className="ledger">
              {flow.gaps.map((d) => (
                <li key={d.title}>
                  <strong>{d.title}</strong>
                  <p>{d.body}</p>
                </li>
              ))}
            </ol>
          </section>
        ) : null}

        {updates.length > 0 && (
          <section id="updates">
            <h2>Update history</h2>
            <ol className="updates">
              {updates.map((u, i) => (
                <li key={`${u.date}-${i}`}>
                  <div className="update-head">
                    <span className="eyebrow">{longDate(u.date)}</span>
                    {(u.tags ?? []).map((t) => (
                      <span key={t} className={`tag tag-${t}`}>
                        {TAG_LABEL[t] ?? t}
                      </span>
                    ))}
                  </div>
                  <p>{u.summary}</p>
                </li>
              ))}
            </ol>
          </section>
        )}
      </div>

      <ScreenPreview
        flow={flow}
        node={preview?.node ?? null}
        open={previewOpen}
        variant={preview?.variant ?? 0}
        onVariant={(variant) => setPreview((p) => (p ? { ...p, variant } : p))}
        onClose={() => setPreviewOpen(false)}
      />
      <NoteComposer open={notingOpen} node={noting} notes={noting ? notes[noting.id] ?? [] : []} onSave={saveNote} onDelete={deleteNote} onClose={() => setNotingOpen(false)} />
      <NotesExport open={exportOpen} text={notesForAgent(flow, notes, positions)} onClear={clearAll} onClose={() => setExportOpen(false)} />
    </>
  )
}
