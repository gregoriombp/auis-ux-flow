// Example flow: changing plan and recovering a failed payment, compiled into one map.
// It runs top to bottom, to show the other direction a flow can take.
// The braces keep this file's constants private: every flow file loads into one shared scope.
{
  // Top to bottom. One column per lane, one row per step.
  const ROW = (n) => n * 200
  const FAILED_X = 0
  const UP_X = 440
  const TRUNK_X = 880
  const DOWN_X = 1320

  const screen = (name, state) => `screens/app.html?screen=${name}${state ? `&state=${state}` : ""}`

  AuisUxFlow.define({
    slug: "billing",
    title: "Plans and billing — compiled view",
    intro:
      "Moving up a plan, moving down one, and getting a workspace out of hold after a renewal fails. The upgrade and the recovery share the payment form; all three end on the same confirmation.",

    direction: "down",

    scenarios: [
      {
        id: "upgrade",
        label: "Upgrade the plan",
        color: "blue",
        summary: "From billing to a bigger plan: a proration preview, then payment.",
      },
      {
        id: "downgrade",
        label: "Downgrade the plan",
        color: "emerald",
        summary: "Shows what the smaller plan removes, and lets them change their mind.",
      },
      {
        id: "recover",
        label: "Recover a failed payment",
        color: "purple",
        summary: "A renewal is declined, the workspace goes read-only, and a new card puts it back.",
      },
    ],

    nodes: [
      /* Trunk */
      {
        id: "billing",
        x: TRUNK_X,
        y: ROW(0),
        step: "entry",
        title: "Billing",
        note: "Current plan, seats and invoices",
        href: screen("billing"),
        scenarios: ["upgrade", "downgrade"],
      },
      {
        id: "plans",
        x: TRUNK_X,
        y: ROW(1),
        step: "shared · 01",
        title: "Compare plans",
        note: "Free, Team and Business, side by side",
        href: screen("plans"),
        scenarios: ["upgrade", "downgrade"],
      },
      {
        id: "d-direction",
        type: "decision",
        x: TRUNK_X,
        y: ROW(2),
        title: "Up or down a plan?",
        question: "Paying more needs a payment; paying less needs a warning.",
        scenarios: ["upgrade", "downgrade"],
      },
      {
        id: "plan-updated",
        x: TRUNK_X,
        y: ROW(6),
        step: "shared · end",
        title: "Plan updated",
        note: "Confirmation and the next invoice date",
        href: screen("plan-updated"),
        variants: [
          { label: "Upgraded", href: screen("plan-updated") },
          { label: "Downgraded", href: screen("plan-updated", "down") },
          { label: "Restored", href: screen("plan-updated", "restored") },
        ],
        scenarios: ["upgrade", "downgrade", "recover"],
      },

      /* Lane: upgrade, and the payment it shares with the recovery */
      {
        id: "proration",
        x: UP_X,
        y: ROW(3),
        step: "upgrade · 01",
        title: "Proration preview",
        note: "What they pay today for the rest of the month",
        href: screen("proration"),
        scenarios: ["upgrade"],
      },
      {
        id: "payment",
        x: UP_X,
        y: ROW(4),
        step: "shared · payment",
        title: "Payment details",
        note: "Card on file, or a new one",
        href: screen("payment"),
        variants: [
          { label: "Card on file", href: screen("payment") },
          { label: "New card", href: screen("payment", "new") },
          { label: "Declined", href: screen("payment", "declined") },
        ],
        scenarios: ["upgrade", "recover"],
      },
      {
        id: "d-charge",
        type: "decision",
        x: UP_X,
        y: ROW(5),
        title: "Does the charge go through?",
        question: "The bank can decline it, or ask for a 3-D Secure check.",
        scenarios: ["upgrade", "recover"],
      },

      /* Lane: recovery */
      {
        id: "failed-email",
        x: FAILED_X,
        y: ROW(4),
        step: "recover · 01",
        title: "Payment failed email",
        note: "Sent to the billing owner on the renewal day",
        href: screen("failed-email"),
        scenarios: ["recover"],
      },
      {
        id: "on-hold",
        x: FAILED_X,
        y: ROW(5),
        step: "recover · 02",
        title: "Workspace on hold",
        note: "Read-only, with a banner for every member",
        href: screen("home", "hold"),
        scenarios: ["recover"],
      },

      /* Lane: downgrade */
      {
        id: "what-you-lose",
        x: DOWN_X,
        y: ROW(3),
        step: "downgrade · 01",
        title: "What you lose",
        note: "Features, seats and history over the limit",
        href: screen("downgrade"),
        scenarios: ["downgrade"],
      },
      {
        id: "d-confirm",
        type: "decision",
        x: DOWN_X,
        y: ROW(4),
        title: "Still moving down?",
        question: "The last chance to keep what they would lose.",
        scenarios: ["downgrade"],
      },
    ],

    // Default sides follow `direction: "down"`: out of the bottom, into the top.
    edges: [
      { id: "open-plans", from: "billing", to: "plans" },
      { id: "pick-plan", from: "plans", to: "d-direction" },
      { id: "go-up", from: "d-direction", to: "proration", fromSide: "left", kind: "branch", label: "Up" },
      { id: "go-down", from: "d-direction", to: "what-you-lose", fromSide: "right", kind: "branch", label: "Down" },

      { id: "to-payment", from: "proration", to: "payment" },
      { id: "charge", from: "payment", to: "d-charge" },
      { id: "charge-yes", from: "d-charge", to: "plan-updated", toSide: "left", kind: "branch", label: "Yes" },
      { id: "charge-no", from: "d-charge", to: "payment", fromSide: "right", toSide: "right", offset: 40, kind: "cross", label: "Declined · try another card" },

      { id: "hold", from: "failed-email", to: "on-hold" },
      { id: "update-card", from: "on-hold", to: "payment", fromSide: "right", toSide: "left", label: "Update card" },

      { id: "confirm-down", from: "what-you-lose", to: "d-confirm" },
      { id: "confirm-yes", from: "d-confirm", to: "plan-updated", toSide: "right", kind: "branch", label: "Yes" },
      { id: "confirm-no", from: "d-confirm", to: "plans", fromSide: "right", toSide: "right", offset: 40, kind: "cross", label: "No · keep the plan" },
    ],

    shared: [
      {
        title: "One payment form, two reasons to be there",
        body: "An upgrade and a recovery both end up asking for a card. They share the form and the decline loop instead of keeping two.",
      },
      {
        title: "Plan updated closes every journey",
        body: "Upgraded, downgraded and restored are three states of one confirmation, entered from the left, the top and the right.",
      },
      {
        title: "The direction gate",
        body: "Up or down a plan? is the only place the plan journeys split: paying more needs a payment, paying less needs a warning.",
      },
    ],

    gaps: [
      {
        title: "Recovery skips billing",
        body: "The failed-payment email goes straight to the form. Someone who wants to read the invoice first has no way back to Billing from the hold banner.",
      },
    ],

    updates: [
      {
        date: "2026-11-19",
        summary: "Compiled view created: upgrade, downgrade and payment recovery merged into one graph, sharing the payment form and the confirmation.",
        tags: ["created"],
      },
    ],
  })
}
