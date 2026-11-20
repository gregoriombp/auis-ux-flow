// Example flow: three journeys through a workspace product, compiled into one map.
// The screens are static mocks (screens/app.html) so every card opens something.
// The braces keep this file's constants private: every flow file loads into one shared scope.
{
  // The journeys run left to right. One x per step, one y per lane:
  // scenario-specific screens get their own lane, shared screens sit on the trunk.
  const COL = (n) => n * 320
  const TEMPLATE_Y = 0
  const CREATE_Y = 200
  const TRUNK_Y = 420
  const ADJUST_Y = 640

  const screen = (name, state) => `screens/app.html?screen=${name}${state ? `&state=${state}` : ""}`

  AuisUxFlow.define({
    slug: "workspace",
    title: "Workspace — compiled view",
    intro:
      "Creating a workspace, adjusting one that already exists, and building the template a new workspace needs: three journeys on one board. Switch the lens to follow one of them; click a card to open the screen.",

    direction: "right",

    scenarios: [
      {
        id: "create",
        label: "Create a workspace",
        color: "blue",
        summary: "From the list to a live workspace. Needs a template to start from; meets the adjust journey in the editor.",
      },
      {
        id: "adjust",
        label: "Adjust a workspace",
        color: "emerald",
        summary: "Changing a workspace people already use. Goes through the overview and the breaking-change gate, then re-enters the editor.",
      },
      {
        id: "template",
        label: "Build a template",
        color: "purple",
        summary: "The detour a first-time creator takes: no template yet, so they build one and come back to the form.",
      },
    ],

    nodes: [
      /* Trunk: shared by create and adjust */
      {
        id: "workspaces",
        x: COL(0),
        y: TRUNK_Y,
        step: "entry",
        title: "Workspaces",
        note: "Every journey starts from the list",
        href: screen("workspaces"),
        variants: [
          { label: "Default", href: screen("workspaces") },
          { label: "Empty", href: screen("workspaces", "empty") },
          { label: "Loading", href: screen("workspaces", "loading") },
        ],
        scenarios: ["create", "adjust"],
      },
      {
        id: "d-exists",
        type: "decision",
        x: COL(1),
        y: TRUNK_Y,
        title: "Does the workspace exist?",
        question: "New work and changes to live work take different roads.",
        scenarios: ["create", "adjust"],
      },
      {
        id: "workspace-editor",
        x: COL(4),
        y: TRUNK_Y,
        step: "shared · editor",
        title: "Workspace editor",
        note: "Create lands here once; adjust re-enters here every time",
        href: screen("editor"),
        variants: [
          { label: "Default", href: screen("editor") },
          { label: "Unsaved changes", href: screen("editor", "unsaved") },
          { label: "Save failed", href: screen("editor", "error") },
        ],
        scenarios: ["create", "adjust"],
      },
      {
        id: "publish",
        x: COL(5),
        y: TRUNK_Y,
        step: "shared · end",
        title: "Review and publish",
        note: "The same review for a first version and for a change",
        href: screen("publish"),
        variants: [
          { label: "Review", href: screen("publish") },
          { label: "Published", href: screen("live") },
        ],
        scenarios: ["create", "adjust"],
      },

      /* Lane: create */
      {
        id: "new-workspace",
        x: COL(2),
        y: CREATE_Y,
        step: "create · 01",
        title: "New workspace",
        note: "Name, region and the template to start from",
        href: screen("new-workspace"),
        scenarios: ["create", "template"],
      },
      {
        id: "d-template",
        type: "decision",
        x: COL(3),
        y: CREATE_Y,
        title: "Has a template?",
        question: "A workspace always starts from one. Without it, the creator builds it first.",
        scenarios: ["create", "template"],
      },

      /* Lane: build a template (the detour, right to left, back to the form) */
      {
        id: "template-gallery",
        x: COL(3),
        y: TEMPLATE_Y,
        step: "template · 01",
        title: "Template gallery",
        note: "Starting points, or a blank template",
        href: screen("templates"),
        scenarios: ["template"],
      },
      {
        id: "template-builder",
        x: COL(2),
        y: TEMPLATE_Y,
        step: "template · 02",
        title: "Template builder",
        note: "Sections, fields and defaults",
        href: screen("template-builder"),
        scenarios: ["template"],
      },

      /* Lane: adjust */
      {
        id: "workspace-overview",
        x: COL(2),
        y: ADJUST_Y,
        step: "adjust · 01",
        title: "Workspace overview",
        note: "Members, usage and the published version",
        href: screen("overview"),
        scenarios: ["adjust"],
      },
      {
        id: "d-breaking",
        type: "decision",
        x: COL(3),
        y: ADJUST_Y,
        title: "Is it a breaking change?",
        question: "Renaming or removing a section breaks the links members saved.",
        scenarios: ["adjust"],
      },
      {
        id: "notify-members",
        x: COL(4),
        y: ADJUST_Y,
        step: "adjust · 02",
        title: "Notify members",
        note: "Schedule the announcement before editing",
        href: screen("notify"),
        scenarios: ["adjust"],
      },
    ],

    // Default sides follow `direction: "right"`: out of the right side, into the left.
    edges: [
      { id: "start", from: "workspaces", to: "d-exists" },
      { id: "exists-no", from: "d-exists", to: "new-workspace", fromSide: "top", kind: "branch", label: "No · create it" },
      { id: "exists-yes", from: "d-exists", to: "workspace-overview", fromSide: "bottom", kind: "branch", label: "Yes · adjust it" },

      { id: "form-gate", from: "new-workspace", to: "d-template" },
      { id: "template-yes", from: "d-template", to: "workspace-editor", toSide: "top", kind: "branch", label: "Yes" },
      { id: "template-no", from: "d-template", to: "template-gallery", fromSide: "top", toSide: "bottom", kind: "branch", label: "No · build one" },
      { id: "gallery-builder", from: "template-gallery", to: "template-builder", fromSide: "left", toSide: "right" },
      { id: "template-saved", from: "template-builder", to: "new-workspace", fromSide: "bottom", toSide: "top", kind: "cross", label: "Saved · back to the form" },

      { id: "overview-gate", from: "workspace-overview", to: "d-breaking" },
      { id: "breaking-no", from: "d-breaking", to: "workspace-editor", fromSide: "top", kind: "branch", label: "No · edit freely" },
      { id: "breaking-yes", from: "d-breaking", to: "notify-members", kind: "branch", label: "Yes" },
      { id: "notified", from: "notify-members", to: "workspace-editor", fromSide: "top", toSide: "bottom", label: "Announcement scheduled" },

      { id: "to-publish", from: "workspace-editor", to: "publish" },
    ],

    shared: [
      {
        title: "The editor is the convergence",
        body: "Create and adjust use the same editor. Create reaches it once, through the template gate; adjust re-enters it directly, with or without an announcement.",
      },
      {
        title: "One publish step for both",
        body: "A first version and a change go through the same review, so nothing ships without it.",
      },
      {
        title: "The form belongs to two journeys",
        body: "New workspace is where the template detour starts and where it comes back: one card with two dots, not two forms.",
      },
      {
        title: "Three gates",
        body: "Does the workspace exist? splits new work from changes. Has a template? opens the detour. Is it a breaking change? decides whether members hear about it first.",
      },
    ],

    updates: [
      {
        date: "2026-11-19",
        summary: "Compiled view created: three scenarios (create, adjust, build a template) merged into one graph with a shared editor and publish step.",
        tags: ["created"],
      },
    ],
  })
}
