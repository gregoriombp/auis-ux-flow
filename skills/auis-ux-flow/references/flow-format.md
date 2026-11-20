# Flow file format

A flow is one JavaScript file, `ux-flows/<slug>.flow.js`, that calls `AuisUxFlow.define({ … })` exactly once. It is a script, not JSON, so the viewer can load it from disk without a server; comments and small constants are welcome.

**Wrap the whole file in a block: `{` on the first line, `}` on the last.** The viewer loads every flow file into one shared scope, so a top-level `const COL` in two files is a redeclaration and the second flow never appears. Inside the braces, constants stay private to the file. The validator reports a file that forgets them.

## Contents

- [Complete example](#complete-example)
- [Top level](#top-level)
- [Scenarios](#scenarios)
- [Nodes (cards)](#nodes-cards)
- [Edges](#edges)
- [Docs: shared and gaps](#docs-shared-and-gaps)
- [Updates (changelog)](#updates-changelog)
- [The manifest](#the-manifest)

## Complete example

```js
{
  // Lanes and steps as constants keep positions readable.
  const COL = (n) => n * 320
  const GUEST_Y = 0
  const TRUNK_Y = 220
  const MEMBER_Y = 440

  AuisUxFlow.define({
    slug: "checkout",
    title: "Checkout — compiled view",
    intro: "Buying as a guest and buying as a member on one board. Both meet at payment.",
    baseUrl: "http://localhost:3000",
    direction: "right",

    scenarios: [
      { id: "guest", label: "Guest checkout", color: "blue", summary: "No account: the email is collected on the way." },
      { id: "member", label: "Member checkout", color: "emerald", summary: "Signed in: address and card are prefilled." },
    ],

    nodes: [
      { id: "cart", x: COL(0), y: TRUNK_Y, step: "entry", title: "Cart", href: "/cart",
        variants: [
          { label: "With items", href: "/cart" },
          { label: "Empty", href: "/cart?state=empty" },
        ],
        scenarios: ["guest", "member"] },
      { id: "d-signed-in", type: "decision", x: COL(1), y: TRUNK_Y, title: "Signed in?",
        question: "Members skip the contact step.", scenarios: ["guest", "member"] },
      { id: "guest-contact", x: COL(2), y: GUEST_Y, step: "guest · 01", title: "Contact details",
        note: "Email and shipping address", href: "/checkout/contact", scenarios: ["guest"] },
      { id: "saved-address", x: COL(2), y: MEMBER_Y, step: "member · 01", title: "Saved address",
        note: "Pick or add an address", href: "/checkout/address", scenarios: ["member"] },
      { id: "payment", x: COL(3), y: TRUNK_Y, step: "shared", title: "Payment", href: "/checkout/payment",
        states: ["card declined", "3-D Secure challenge"], scenarios: ["guest", "member"] },
      { id: "confirmation", x: COL(4), y: TRUNK_Y, step: "end", title: "Order confirmed",
        href: "/checkout/done", scenarios: ["guest", "member"] },
    ],

    edges: [
      { from: "cart", to: "d-signed-in" },
      { from: "d-signed-in", to: "guest-contact", fromSide: "top", kind: "branch", label: "No" },
      { from: "d-signed-in", to: "saved-address", fromSide: "bottom", kind: "branch", label: "Yes" },
      { from: "guest-contact", to: "payment", toSide: "top" },
      { from: "saved-address", to: "payment", toSide: "bottom" },
      { from: "payment", to: "confirmation" },
    ],

    shared: [
      { title: "Payment is the convergence", body: "Guests and members pay on the same screen; only how they got there differs." },
      { title: "One gate", body: "Signed in? decides whether contact details are asked or prefilled." },
    ],

    gaps: [
      { title: "No way back from a declined card", body: "The declined state has no link to change the payment method." },
    ],

    updates: [
      { date: "2026-01-15", summary: "Compiled view created: guest and member checkout merged, meeting at payment.", tags: ["created"] },
    ],
  })
}
```

## Top level

| Field | Required | Meaning |
|---|---|---|
| `slug` | yes | Kebab-case. Must equal the file name (`checkout` for `checkout.flow.js`) and the entry in `flows.js`. |
| `title` | yes | Page title. Convention: `<Region> — compiled view`. |
| `intro` | recommended | One or two sentences: which region of the product, which journeys. |
| `baseUrl` | when previews should open the running app | Where the app runs locally, e.g. `http://localhost:3000`. Relative `href`s resolve against it. Without it they resolve next to `index.html` (useful for static mocks). |
| `direction` | no | `"down"` (default) or `"right"`. Which way the journeys run; sets the default edge sides. |
| `scenarios` | yes | See below. |
| `nodes` | yes | See below. |
| `edges` | yes | See below. |
| `shared` | recommended | The dedup ledger. |
| `gaps` | no | Problems the map exposes. |
| `updates` | recommended | Changelog, any order (the viewer sorts newest first). |

## Scenarios

```js
{ id: "guest", label: "Guest checkout", color: "blue", summary: "One line: who, why, where it meets the others." }
```

| Field | Required | Meaning |
|---|---|---|
| `id` | yes | Kebab-case, unique. `all` is reserved. |
| `label` | yes | Shown on the lens chip and the band. Keep it short: verb + object. |
| `color` | no | A palette name: `blue`, `emerald`, `purple`, `lime`, `slate`, `cyan`, `pink` (use in this order; pink last, because cross edges are pink), or any CSS color. Omitted: assigned by position. Never amber, orange, yellow or red. |
| `summary` | recommended | One line, shown under "Compiled scenarios". |

The array order is the chip order and the tour order.

## Nodes (cards)

```js
{ id: "payment", x: 960, y: 220, step: "shared", title: "Payment", note: "Card or wallet",
  href: "/checkout/payment", scenarios: ["guest", "member"] }
```

| Field | Required | Meaning |
|---|---|---|
| `id` | yes | Kebab-case, semantic, **permanent**. `band` is reserved. |
| `type` | no | `"screen"` (default) or `"decision"`. |
| `x`, `y` | yes | Top-left corner in pixels. Cards are 216 wide; about 100 tall when plain, up to 180 with a note, a route and states. |
| `title` | yes | The screen's name, or the decision's question in short form. |
| `scenarios` | yes | Every scenario that passes through this card. Two or more = a shared card. |
| `step` | no | Small label above the title: `entry`, `guest · 01`, `shared`, `end`. |
| `note` | no (screens) | One line under the title. |
| `question` | recommended (decisions) | What the gate checks, in a sentence. |
| `href` | no | The screen's route. Opens in the side panel when the card is clicked. `#` or omitted: no preview. |
| `variants` | no | `[{ label, href }]`: several states of ONE screen, each with its own URL. The panel shows one tab per variant; the first is the default. The card shows the count ("3 states"). |
| `route` | no | A route or surface shown as text on the card, for screens that cannot be previewed: a dynamic route with no known id (`/orders/[id]`), a native app, another repo, a site that blocks embedding. |
| `states` | no | Names of states with no URL of their own, shown as text on the card. |

Clicking a `screen` opens its preview. A `decision` has no preview.

## Edges

```js
{ id: "pay", from: "saved-address", to: "payment", toSide: "bottom", kind: "base", label: "Continue", offset: 30 }
```

| Field | Required | Meaning |
|---|---|---|
| `from`, `to` | yes | Node ids. |
| `id` | no | Unique if present. |
| `fromSide`, `toSide` | no | `top`, `bottom`, `left` or `right`: the side the edge leaves and enters. Defaults follow `direction`: `down` leaves the bottom and enters the top; `right` leaves the right and enters the left. |
| `kind` | no | `base` (default, grey): ordinary step. `branch` (amber): leaves a decision. `cross` (pink, dashed): a jump into another scenario's territory, or a loop back. |
| `label` | no | Under 28 characters. Required in practice on edges leaving a decision. |
| `offset` | no | How far the line runs straight out of a card before it turns (default about 20). Raise it to separate two lines that would overlap. On an edge that leaves and enters through the same side (a U-turn), it is how far the loop sticks out: raise it until the loop clears the cards in between. |
| `scenarios` | no | Overrides which lenses light the edge. By default an edge is lit for the scenarios **both** of its cards list. Set it in two cases: the edge belongs to fewer scenarios than its cards share; or it is a `cross` edge into another scenario's territory, whose cards share none (list the journey that makes the jump). |

## Docs: shared and gaps

Both are lists of `{ title, body }`.

- `shared`: one item per shared card or convergence, saying **why it is one card** ("create and adjust use the same editor; adjust re-enters here directly"), plus one item naming the gates.
- `gaps`: what compiling the journeys exposed: a missing state, a dead end, two journeys that should share a screen and do not.

## Updates (changelog)

```js
{ date: "2026-01-15", summary: "Added the gift-card scenario; it joins at payment.", tags: ["new-scenario"] }
```

`date` is `YYYY-MM-DD`. `summary` is one sentence about the journey, not about the file. Keep the newest entry first: the viewer sorts by date and keeps the file's order within a day. Tags: `created`, `new-scenario`, `removed-scenario`, `new-screen`, `removed-screen`, `new-branch`, `rework`. Text, link and position changes get no entry.

## The manifest

`ux-flows/flows.js` lists the flows the viewer shows, in order:

```js
window.AUIS_UX_FLOWS = ["checkout", "onboarding"]
```

With one flow the viewer opens it directly; with several it shows an index. Links: `index.html#/checkout`, `index.html#/checkout?focus=guest`. Add `?tour=1` before the `#` to cycle the lenses automatically, and `&fullscreen=1` to start in fullscreen.
