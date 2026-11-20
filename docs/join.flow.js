// Example flow: three ways into a workspace, compiled into one map.
// The screens are static mocks (screens/app.html) so every card opens something.
// The braces keep this file's constants private: every flow file loads into one shared scope.
{
  // Left to right. One lane per way in; the trunk holds what they share.
  const COL = (n) => n * 320
  const SSO_Y = 0
  const INVITE_Y = 220
  const TRUNK_Y = 440
  const REQUEST_Y = 660

  const screen = (name, state) => `screens/app.html?screen=${name}${state ? `&state=${state}` : ""}`

  AuisUxFlow.define({
    slug: "join",
    title: "Joining a workspace — compiled view",
    intro:
      "An email invite, a shared link from someone who is already in, and company single sign-on: three ways into the same workspace. They meet at sign-in, at the profile step and at the workspace home.",

    direction: "right",

    scenarios: [
      {
        id: "invite",
        label: "Accept an invite",
        color: "blue",
        summary: "Invited by email. With an account they sign in; without one they create it and set up a profile.",
      },
      {
        id: "request",
        label: "Request access",
        color: "emerald",
        summary: "Arrives through a shared link, signs in, and waits for an admin to approve.",
      },
      {
        id: "sso",
        label: "Join with SSO",
        color: "purple",
        summary: "Signs in with the company identity provider. A verified domain joins them straight away.",
      },
    ],

    nodes: [
      /* Lane: single sign-on */
      {
        id: "sso-sign-in",
        x: COL(4),
        y: SSO_Y,
        step: "sso · 01",
        title: "Sign in with SSO",
        note: "Company email, then the identity provider",
        href: screen("sso"),
        scenarios: ["sso"],
      },
      {
        id: "d-domain",
        type: "decision",
        x: COL(5),
        y: SSO_Y,
        title: "Is the domain verified?",
        question: "Only a verified company domain may join people without an invite.",
        scenarios: ["sso"],
      },
      {
        id: "domain-unverified",
        x: COL(6),
        y: SSO_Y,
        step: "sso · end",
        title: "Domain not verified",
        note: "Asks them to contact an admin, and stops",
        href: screen("sso", "unverified"),
        scenarios: ["sso"],
      },

      /* Lane: invite */
      {
        id: "invite-email",
        x: COL(0),
        y: INVITE_Y,
        step: "invite · 01",
        title: "Invite email",
        note: "Who invited them, and to which workspace",
        href: screen("invite-email"),
        scenarios: ["invite"],
      },
      {
        id: "accept-invite",
        x: COL(1),
        y: INVITE_Y,
        step: "invite · 02",
        title: "Accept invite",
        note: "The invite page, valid for 7 days",
        href: screen("accept-invite"),
        variants: [
          { label: "Valid", href: screen("accept-invite") },
          { label: "Expired", href: screen("accept-invite", "expired") },
        ],
        scenarios: ["invite"],
      },
      {
        id: "d-account",
        type: "decision",
        x: COL(2),
        y: INVITE_Y,
        title: "Has a Fieldbook account?",
        question: "Matched on the invited email address.",
        scenarios: ["invite"],
      },
      {
        id: "create-account",
        x: COL(3),
        y: INVITE_Y,
        step: "invite · 03",
        title: "Create account",
        note: "Email prefilled from the invite",
        href: screen("create-account"),
        scenarios: ["invite"],
      },
      {
        id: "profile",
        x: COL(5),
        y: INVITE_Y,
        step: "shared · profile",
        title: "Set up profile",
        note: "Name, photo and role, once per person",
        href: screen("profile"),
        scenarios: ["invite", "sso"],
      },

      /* Trunk */
      {
        id: "sign-in",
        x: COL(2),
        y: TRUNK_Y,
        step: "shared · sign-in",
        title: "Sign in",
        note: "Email and password, or a magic link",
        href: screen("sign-in"),
        variants: [
          { label: "Default", href: screen("sign-in") },
          { label: "Wrong password", href: screen("sign-in", "error") },
        ],
        scenarios: ["invite", "request"],
      },
      {
        id: "d-member",
        type: "decision",
        x: COL(3),
        y: TRUNK_Y,
        title: "Already a member?",
        question: "An accepted invite makes them one. A shared link does not.",
        scenarios: ["invite", "request"],
      },
      {
        id: "home",
        x: COL(6),
        y: TRUNK_Y,
        step: "shared · end",
        title: "Workspace home",
        note: "Every way in ends here",
        href: screen("home"),
        variants: [
          { label: "First visit", href: screen("home", "first") },
          { label: "Returning", href: screen("home") },
        ],
        scenarios: ["invite", "request", "sso"],
      },

      /* Lane: request access */
      {
        id: "shared-link",
        x: COL(0),
        y: REQUEST_Y,
        step: "request · 01",
        title: "Shared link",
        note: "A colleague pasted a link to a page",
        href: screen("shared-link"),
        scenarios: ["request"],
      },
      {
        id: "access-wall",
        x: COL(1),
        y: REQUEST_Y,
        step: "request · 02",
        title: "You need access",
        note: "The page is private: sign in first",
        href: screen("access-wall"),
        scenarios: ["request"],
      },
      {
        id: "request-access",
        x: COL(4),
        y: REQUEST_Y,
        step: "request · 03",
        title: "Request access",
        note: "A short message to the workspace admins",
        href: screen("request-access"),
        variants: [
          { label: "Form", href: screen("request-access") },
          { label: "Sent", href: screen("request-access", "sent") },
        ],
        scenarios: ["request"],
      },
      {
        id: "d-approve",
        type: "decision",
        x: COL(5),
        y: REQUEST_Y,
        title: "Does an admin approve?",
        question: "Admins see the request in Members and get an email.",
        scenarios: ["request"],
      },
      {
        id: "request-declined",
        x: COL(6),
        y: REQUEST_Y,
        step: "request · end",
        title: "Request declined",
        note: "They can ask again in 30 days",
        href: screen("request-access", "declined"),
        scenarios: ["request"],
      },
    ],

    // Default sides follow `direction: "right"`: out of the right side, into the left.
    edges: [
      { id: "sso-check", from: "sso-sign-in", to: "d-domain" },
      { id: "domain-no", from: "d-domain", to: "domain-unverified", kind: "branch", label: "No" },
      { id: "domain-yes", from: "d-domain", to: "profile", fromSide: "bottom", toSide: "top", kind: "branch", label: "Yes · join" },

      { id: "open-invite", from: "invite-email", to: "accept-invite" },
      { id: "invite-check", from: "accept-invite", to: "d-account" },
      { id: "account-no", from: "d-account", to: "create-account", kind: "branch", label: "No" },
      { id: "account-yes", from: "d-account", to: "sign-in", fromSide: "bottom", toSide: "top", kind: "branch", label: "Yes" },
      { id: "account-made", from: "create-account", to: "profile" },
      { id: "profile-done", from: "profile", to: "home", toSide: "top" },

      { id: "open-link", from: "shared-link", to: "access-wall" },
      { id: "wall-sign-in", from: "access-wall", to: "sign-in", toSide: "bottom", label: "Sign in" },
      { id: "member-check", from: "sign-in", to: "d-member" },
      { id: "member-yes", from: "d-member", to: "home", kind: "branch", label: "Yes", scenarios: ["invite"] },
      { id: "member-no", from: "d-member", to: "request-access", fromSide: "bottom", kind: "branch", label: "No", scenarios: ["request"] },
      { id: "request-sent", from: "request-access", to: "d-approve" },
      { id: "approve-yes", from: "d-approve", to: "home", fromSide: "top", toSide: "bottom", kind: "branch", label: "Yes" },
      { id: "approve-no", from: "d-approve", to: "request-declined", kind: "branch", label: "No" },
    ],

    shared: [
      {
        title: "Workspace home is the one ending",
        body: "Every way in lands on the same home: from the left after a member check, from above after the profile, from below after an approval.",
      },
      {
        title: "Sign-in serves two journeys",
        body: "Invited people with an account and people who arrived by a shared link use the same sign-in; the member check right after it is what sends them apart.",
      },
      {
        title: "The profile step is shared with SSO",
        body: "A new account and a first single sign-on both need a name and a role, so they meet at one profile screen instead of two.",
      },
    ],

    gaps: [
      {
        title: "An unverified domain is a dead end",
        body: "Single sign-on from an unverified domain stops at a message. It could hand the person to Request access, which already exists.",
      },
      {
        title: "Expired invites have no next step",
        body: "The expired state of Accept invite tells people the link is old but offers neither a new invite nor a request.",
      },
    ],

    updates: [
      {
        date: "2026-11-19",
        summary: "Compiled view created: invite, request access and single sign-on merged into one graph, meeting at sign-in, profile and the workspace home.",
        tags: ["created"],
      },
    ],
  })
}
