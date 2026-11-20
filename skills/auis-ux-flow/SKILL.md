---
name: auis-ux-flow
description: Use when the user asks to map, chart or document how several user journeys of a product fit together — a UX flow, user flow, journey map, "golden eye", compiled view or bird's-eye view, screens shared across scenarios — or to update a flow in ux-flows/, or to apply notes copied from the flow viewer ("UX flow notes for …").
---

# Auis UX Flow

Map **several journeys of a product on one board**. Screens the journeys share are drawn **once**, with one dot per journey; a **lens** per journey dims everything else. The result shows what no single linear flow can: where journeys meet, where they split, and which screens carry more than one of them.

Works in any repository and any stack. Nothing is installed: you write data files, and a ready-made viewer (one HTML file) renders them.

```
ux-flows/
  index.html        the viewer — a copy of this skill's assets/viewer.html
  flows.js          the manifest: which flows to show
  <slug>.flow.js    one flow: scenarios, cards, edges, changelog
```

The person opens `ux-flows/index.html` in a browser (double-click works). Paths in this document that start with `assets/`, `references/` or `scripts/` are relative to this skill's own directory.

**Before writing a flow file, read [references/flow-format.md](references/flow-format.md)** (every field, with a complete example) **and [references/layout.md](references/layout.md)** (where cards go).

## Is this the right tool?

Use it when the value is in **seeing two or more journeys at once**: "create a workspace" next to "adjust an existing one"; a gate (`Has a template?`) that sends some people on a detour that rejoins the main path. For a single linear journey a plain list of steps is enough: say so, and offer to add a second scenario worth comparing.

## The model

| Term | Meaning |
|---|---|
| **Scenario** | One journey: a label, a color, the cards it passes through. 2 to 6 per flow. |
| **Card** | One screen (`screen`) or one question that splits the path (`decision`). |
| **Dedup** | A screen used by several scenarios is ONE card listing all of them. Same screen means same route or component, not same label. |
| **Lens** | Focusing a scenario dims every card and edge outside it and draws a band around its cards. |
| **Convergence** | Where scenarios rejoin a shared path. The most valuable cards on the map. |
| **Gate** | A decision whose answer depends on state (`Signed in?`, `Has a template?`). Gates are why scenarios branch. |

## Create a flow

### 1. Settle the scope

You need: which journeys (2 to 6), and for which region of the product. Take them from the request; infer the rest from the code. Ask only if the journeys themselves are unclear.

### 2. Read the product before drawing it

Find the real screens. Do not invent any.

- Routes: the router or the routing folder (`app/` or `pages/` in Next.js, `src/routes/` in SvelteKit or Remix, `router.*` or `routes.*` in React Router and Vue Router, `urls.py` in Django, `routes.rb` in Rails, navigation stacks in mobile apps).
- Entry points: navigation components, menus, redirects, auth guards, middleware.
- Branch conditions: the code that decides where a person goes next (guards, `if (!user.x) redirect(...)`, feature flags, empty states that link elsewhere). Each one is a candidate **gate**.
- States of one screen: empty, loading, error, modal open. Note which have their own URL.

If a journey needs a screen that does not exist yet, keep the card and say so in its `note` ("not built yet"), and list it under `gaps`.

### 3. Do the merge analysis

This is the whole job. Before writing any file, show the person a merge table:

```
Card                 | create | adjust | template | shared?
---------------------|--------|--------|----------|--------
Workspaces (list)    | entry  | entry  |          | 2 dots
Decision: exists?    | → no   | → yes  |          | 2 dots
New workspace form   | yes    |        | yes      | 2 dots
Workspace editor     | yes    | yes    |          | 2 dots  ← convergence
Template builder     |        |        | yes      | 1 dot
```

For each scenario write its path end to end, then: mark the screens more than one scenario touches (these become single cards), list the gates, the convergences, and any place where one scenario continues into another's territory. A flow with no shared card is not a compiled view: recheck the dedup.

### 4. Lay it out

Pick `direction` (`"right"` suits most products and wide screens), give each scenario-specific stretch its own lane, and put shared cards on a trunk between the lanes. Numbers and patterns are in [references/layout.md](references/layout.md).

### 5. Write `ux-flows/<slug>.flow.js`

Follow [references/flow-format.md](references/flow-format.md). The parts that are easy to get wrong:

- **Wrap the file in a block** (`{` first line, `}` last). All flow files load into one shared scope; without the braces, constants in two files collide and one flow never appears.
- **`scenarios` on every card is the contract.** List every scenario that passes through the card. An edge lights up under a lens only when both of its cards list that scenario, so one missing id makes the path look broken.
- **Ids are permanent.** Kebab-case, semantic (`workspace-editor`, never `n3`). The viewer keys notes and dragged positions to them; renaming an id orphans both.
- **`href` is a real route.** Relative to `baseUrl` (the address the app runs at locally, e.g. `http://localhost:3000`). Find the port in the dev script or the framework default; ask if you cannot tell. For a dynamic route use an id that exists in seed or demo data. No secrets or tokens in URLs: this file is committed.
- **States:** if a state has its own URL (`?state=empty`, `/checkout/error`), add it under `variants` so the card opens it. If it does not, name it under `states` (text only).
- **Edges leaving a decision** are `kind: "branch"` and labelled with the answer. A jump into another scenario's territory, or a loop back, is `kind: "cross"`.
- **Docs are part of the deliverable:** a one-line `summary` per scenario, the `shared` ledger (each shared card and why it is one card), and `updates` seeded with a `"created"` entry dated today.

### 6. Put the viewer and the manifest in place

- If `ux-flows/index.html` is missing, copy `assets/viewer.html` to it. If it exists, compare the version comment on line 2 of each file and replace it only when the skill's copy is newer.
- Add the slug to `ux-flows/flows.js` (create the file if needed):

```js
// Flows shown by index.html, in this order. One slug per <slug>.flow.js file.
window.AUIS_UX_FLOWS = ["checkout"]
```

Never edit `index.html` by hand: it is a build artifact.

### 7. Validate — required

```bash
node scripts/validate.mjs path/to/ux-flows
```

(`scripts/validate.mjs` is in this skill's directory; pass the project's `ux-flows` folder.) Fix every **error**. Fix every **warning** too, or tell the person which one you are leaving and why: warnings are the cases where the flow renders but misleads (a card cut off from its lens, an edge that never lights up, overlapping cards, a decision with one exit).

If you can open a browser, open `ux-flows/index.html`, switch each lens, and check that every lens shows one connected path with a compact band.

### 8. Hand over

Tell the person: the file to open (`ux-flows/index.html`), that card previews need their app running at `baseUrl`, and that they can leave notes on cards in **Comment** mode and paste them back to you with **Copy for agent**.

## Update a flow

Read the flow file first. Then classify the change:

| Change | Changelog tag |
|---|---|
| A scenario added | `new-scenario` |
| A scenario removed | `removed-scenario` |
| A screen card added | `new-screen` |
| A screen card removed | `removed-screen` |
| A decision or a branch added | `new-branch` |
| Shared card split or merged, convergence moved, edges rewired | `rework` |
| Only labels, notes, hrefs, variants or positions changed | no entry |

Apply it, keeping ids stable; when a card is removed, remove its edges and check that each scenario that used it is still connected. Prepend an entry to `updates` (today's date, one sentence saying what changed in the journey, the tags above). Update `summary`, `shared` and `gaps` if the change touched them. Run the validator.

### Notes pasted from the viewer

A block that starts with `UX flow notes for "…"` comes from **Copy for agent**:

```
## Notes
- [workspace-editor] Workspace editor: the save-failed state has no way back
## Moved cards (new positions)
- template-builder: x 568, y -28
```

- Each note is anchored to a card id. Decide what it asks for: a missing state (a variant or a new card), a wrong edge, a missing gate, a question for the person. Apply what is clear; ask about what is not. Do not turn a note into a card just because it exists.
- Moved cards: write the new `x` and `y` into the flow file. That is a position change: no changelog entry.
- When done, tell the person which notes you applied and that they can clear them in the viewer (**Copy for agent → Clear notes and layout**).

## Rules that keep the map honest

- One screen, one card. Two scenarios on the same screen means one card listing both, never two cards.
- A scenario's cards stay together: its own lane plus the trunk. Scattered members make the band swallow other lanes.
- Colors: use the palette order (`blue`, `emerald`, `purple`, `teal`, `lime`, `slate`, `pink`). Never amber, orange or red: amber is the decision language, red reads as an error.
- More than 6 scenarios: split into two flows.
- Edge labels under 28 characters; leave ordinary step-to-step edges unlabelled.
- English, sentence case, no emoji, unless the product's own language is another: then write the flow in that language.

## Common mistakes

| Mistake | Fix |
|---|---|
| A shared card lists only one scenario, so the other lens shows a broken path | List every scenario on the card; rerun the validator |
| Duplicating a screen once per scenario | Merge into one card |
| Inventing screens or routes | Read the router; mark unbuilt screens in `note` and `gaps` |
| Writing the flow before the merge table | Do the table first and show it |
| Renaming ids while "cleaning up" | Ids are permanent; change `title` instead |
| Leaving validator warnings unexplained | Fix them or name the ones you keep |
| Editing `index.html` | Replace it from `assets/viewer.html` instead |
| Top-level constants in a flow file | Wrap the whole file in `{ … }` |

## Report

```md
UX flow: <title>
Open: ux-flows/index.html#/<slug>

- <N> scenarios: <labels>
- <N> cards (<N> shared), <N> decisions
- Convergences: <cards>
- Gaps found: <list or "none">

Files: ux-flows/<slug>.flow.js (created | updated), ux-flows/flows.js, ux-flows/index.html (copied | unchanged)
Validator: <N> errors, <N> warnings <which were left, and why>
Previews: need the app running at <baseUrl>
```
