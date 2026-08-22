---
name: ui-ux-craft
description: Use whenever building or modifying UI for the AI Standup project — pages, dashboard, forms. Governs avoiding generic "AI slop" design, adapted for a real-time SaaS dashboard product. Apply proactively before writing JSX/CSS.
---

# UI/UX Craft — AI Standup

Same anti-slop philosophy as the MK Printing skill: don't ship framework defaults because no one deliberately chose otherwise. This version is adapted for a real-time dashboard SaaS product specifically.

## Before Writing Any UI Code

1. Who's looking at this screen and why, right now? A Member checking if they've submitted today has a different need than an Owner scanning for blockers across the whole team.
2. What updates in real time on this screen, and how should that change feel? A presence status flipping from "not yet" to "submitted" should feel immediate and calm, not jarring.
3. Does the established color/type/spacing system from earlier screens apply here — reuse it.

## Concrete Rules

**Real-time state transitions**
- When `presence_update` arrives via WebSocket, animate the status change (subtle, 150-200ms) rather than an abrupt re-render — this is what makes "real-time" feel real-time rather than "the page happened to refresh"
- Never let a WebSocket reconnect cause a visible flicker/flash of empty state — show a small "reconnecting..." indicator instead of blanking the dashboard

**Status colors** (must be identical across Dashboard, History, and email notifications)
- Submitted: green
- Late: amber
- Missed: red
- Not Yet (window still open): neutral gray
- Blocker severity: Low = gray/blue, Medium = amber, High = red — visually distinct from the submission-status colors above so they're never confused at a glance

**Dashboard layout priority**
- The "who has/hasn't submitted" presence list is the single most important element — it should be the first thing visible, not competing equally with secondary widgets (settings shortcuts, member count, etc.)
- Active High-severity blockers get a persistent, hard-to-miss placement (not buried in a tab) — this is the whole point of Requirement 9

**Landing page**
- Don't default to "hero + 3 feature cards + testimonial carousel." This product's value is best shown, not described — lead with an actual (or realistic mock) screenshot/short clip of the live dashboard updating in real time. If a visitor can see the presence list flip from gray to green, that communicates the product faster than any headline copy.

**Empty states**
- "No submissions yet today" (early in the window) should read differently from "day ended, 3 people missed" (after window close) — same empty-ish state, different tone/urgency, don't reuse one generic empty-state component for both.

**AI-generated content presentation**
- Visually distinguish AI-generated text (the daily summary, blocker reasons) from human-authored text (the raw standup entries) — a small label or subtle styling difference, so users always know which text a person wrote versus which text the AI produced. Don't let AI output masquerade as if a human wrote it.

## Self-Review Before Committing UI

- [ ] Real-time transitions are animated, not abrupt
- [ ] Status colors are consistent with the established palette across every surface (dashboard/history/email)
- [ ] AI-generated content is visually distinguished from user-authored content
- [ ] The presence list dominates the dashboard's visual hierarchy, not competing equally with secondary widgets
