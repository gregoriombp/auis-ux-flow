import { useEffect, useRef, useState, type ReactNode } from "react"
import { isSafeHref } from "../../skills/auis-ux-flow/scripts/flow-rules.mjs"
import { Icon } from "./icons"
import type { Flow, FlowNode, FlowVariant, Note } from "./types"

/* ─── Native <dialog> shell ─────────────────────────────────────────── */
/* showModal() gives focus trapping, Escape and the top layer for free, and
   the CSS transitions on [open] animate both the way in and the way out. */

function Dialog({
  open,
  onClose,
  className,
  label,
  children,
}: {
  open: boolean
  onClose: () => void
  className: string
  label: string
  children: ReactNode
}) {
  const ref = useRef<HTMLDialogElement>(null)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    if (open && !el.open) el.showModal()
    if (!open && el.open) el.close()
  }, [open])
  return (
    <dialog
      ref={ref}
      className={className}
      aria-label={label}
      onClose={onClose}
      onClick={(e) => {
        if (e.target === ref.current) onClose() // a click on the backdrop
      }}
    >
      <div className="dialog-body">{children}</div>
    </dialog>
  )
}

/* ─── Screen preview (side panel) ───────────────────────────────────── */

/** Variants a card can open: its own list, or its single `href`. */
export function cardVariants(node: FlowNode): FlowVariant[] {
  const list = node.variants?.length ? node.variants : node.href && node.href !== "#" ? [{ label: node.title, href: node.href }] : []
  return list.filter((v) => isSafeHref(v.href) && v.href !== "#")
}

/** Absolute URLs pass through; relative ones resolve against `baseUrl`, or next to the viewer. */
export function resolveHref(flow: Flow, href: string): string {
  if (/^https?:\/\//i.test(href)) return href
  try {
    if (flow.baseUrl) return new URL(href, flow.baseUrl.endsWith("/") ? flow.baseUrl : `${flow.baseUrl}/`).href
    return new URL(href, window.location.href.split("#")[0]).href
  } catch {
    return href
  }
}

export function ScreenPreview({
  flow,
  node,
  open,
  variant,
  onVariant,
  onClose,
}: {
  flow: Flow
  node: FlowNode | null
  open: boolean
  variant: number
  onVariant: (index: number) => void
  onClose: () => void
}) {
  const variants = node ? cardVariants(node) : []
  const active = variants[variant] ?? variants[0]
  const url = active ? resolveHref(flow, active.href) : null

  return (
    <Dialog open={open && node != null} onClose={onClose} className="sheet" label={node ? `Screen: ${node.title}` : "Screen"}>
      <header className="sheet-head">
        <div className="sheet-titles">
          <h2>{node?.title}</h2>
          <span className="sheet-meta">{url ?? node?.route ?? "No preview URL"}</span>
        </div>
        <button type="button" className="btn btn-icon" onClick={onClose} aria-label="Close">
          <Icon name="close" />
        </button>
      </header>

      {variants.length > 1 && (
        <div className="segmented" role="tablist" aria-label="Screen state">
          {variants.map((v, i) => (
            <button key={`${v.label}-${i}`} type="button" role="tab" aria-selected={i === variant} className={i === variant ? "seg is-on" : "seg"} onClick={() => onVariant(i)}>
              {v.label}
            </button>
          ))}
        </div>
      )}

      <div className="sheet-stage">
        {url ? (
          <iframe key={url} src={url} title={`${node?.title ?? "Screen"} · ${active?.label ?? ""}`} />
        ) : (
          <div className="sheet-empty">
            {node?.note && <p>{node.note}</p>}
            {node?.route && (
              <p>
                Route: <code>{node.route}</code>
              </p>
            )}
            {node?.states?.length ? (
              <ul>
                {node.states.map((s) => (
                  <li key={s}>{s}</li>
                ))}
              </ul>
            ) : null}
            <p className="muted">This card has no preview URL. Add an <code>href</code> to it in the flow file to open the real screen here.</p>
          </div>
        )}
      </div>

      {url && (
        <footer className="sheet-foot">
          <span className="muted">Blank? Check that the app is running, or that it allows embedding.</span>
          <a className="btn" href={url} target="_blank" rel="noreferrer">
            Open in a new tab
            <Icon name="external" size={14} />
          </a>
        </footer>
      )}
    </Dialog>
  )
}

/* ─── Note composer ─────────────────────────────────────────────────── */

const when = (at: number) => new Date(at).toLocaleDateString("en-GB", { day: "2-digit", month: "short" })

export function NoteComposer({
  open,
  node,
  notes,
  onSave,
  onDelete,
  onClose,
}: {
  open: boolean
  node: FlowNode | null
  notes: Note[]
  /** Returns false when the note could not be stored; the draft is kept. */
  onSave: (text: string) => boolean
  onDelete: (id: string) => void
  onClose: () => void
}) {
  const [draft, setDraft] = useState("")
  const [failed, setFailed] = useState(false)
  const field = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    if (!open) return
    setFailed(false)
    field.current?.focus() // start in the note, not on the close button
  }, [open, node?.id])

  const save = () => {
    const text = draft.trim()
    if (!text) return
    if (onSave(text)) {
      setDraft("")
      setFailed(false)
    } else {
      setFailed(true)
    }
  }

  return (
    <Dialog open={open && node != null} onClose={onClose} className="modal" label={node ? `Notes on ${node.title}` : "Notes"}>
      <header className="modal-head">
        <div>
          <span className="eyebrow">notes on</span>
          <h2>{node?.title}</h2>
        </div>
        <button type="button" className="btn btn-icon" onClick={onClose} aria-label="Close">
          <Icon name="close" />
        </button>
      </header>

      {notes.length > 0 && (
        <ul className="note-list">
          {notes.map((n) => (
            <li key={n.id}>
              <p>{n.text}</p>
              <span className="muted">{when(n.at)}</span>
              <button type="button" className="btn btn-icon btn-quiet" onClick={() => onDelete(n.id)} aria-label="Delete note">
                <Icon name="trash" size={14} />
              </button>
            </li>
          ))}
        </ul>
      )}

      <textarea
        ref={field}
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) save()
        }}
        rows={4}
        placeholder="What is missing or wrong here? e.g. the error state when saving fails is not mapped"
        aria-label="New note"
      />
      {failed && (
        <p className="form-error" role="alert">
          This browser would not store the note (private window or full storage). Your text is still above: copy it somewhere safe.
        </p>
      )}

      <footer className="modal-foot">
        <span className="muted">Notes stay in this browser until you copy them for your agent.</span>
        <button type="button" className="btn btn-primary" onClick={save} disabled={!draft.trim()}>
          Save note
        </button>
      </footer>
    </Dialog>
  )
}

/* ─── Notes export ──────────────────────────────────────────────────── */

export function NotesExport({ open, text, onClear, onClose }: { open: boolean; text: string; onClear: () => void; onClose: () => void }) {
  const [copied, setCopied] = useState(false)
  const [armed, setArmed] = useState(false)
  const area = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    if (open) {
      setCopied(false)
      setArmed(false)
    }
  }, [open])

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(text)
      setCopied(true)
    } catch {
      /* No clipboard permission (some file:// setups): select the text so Cmd/Ctrl+C works. */
      area.current?.focus()
      area.current?.select()
      setCopied(document.execCommand?.("copy") ?? false)
    }
  }

  return (
    <Dialog open={open} onClose={onClose} className="modal modal-wide" label="Notes for your agent">
      <header className="modal-head">
        <div>
          <span className="eyebrow">hand-off</span>
          <h2>Notes for your agent</h2>
        </div>
        <button type="button" className="btn btn-icon" onClick={onClose} aria-label="Close">
          <Icon name="close" />
        </button>
      </header>
      <p className="muted">Paste this into Claude Code, Codex or Cursor. The agent updates the flow file and its changelog.</p>
      <textarea ref={area} readOnly value={text} rows={12} className="export-text" aria-label="Notes block" />
      <footer className="modal-foot">
        <button type="button" className="btn btn-quiet" onClick={() => (armed ? onClear() : setArmed(true))}>
          <Icon name="trash" size={14} />
          {armed ? "Click again to clear" : "Clear notes and layout"}
        </button>
        <button type="button" className="btn btn-primary" onClick={copy}>
          <Icon name={copied ? "check" : "copy"} size={14} />
          {copied ? "Copied" : "Copy"}
        </button>
      </footer>
    </Dialog>
  )
}
