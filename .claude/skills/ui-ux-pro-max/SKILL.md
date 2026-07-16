---
name: ui-ux-pro-max
description: High-bar UI/UX craft rules — hierarchy, all interaction states, accessibility, and mobile behavior for every screen. Use when building or reviewing any user-facing surface.
---

# UI/UX Pro Max

## Purpose
Every screen ships with complete states and real accessibility — not just
the happy path on a wide desktop viewport.

## When to use
Any change that renders UI: pages, components, dialogs, forms, empty
states, error messages.

## Workflow
1. List the states before coding: loading, empty, error, success, partial data (e.g. legacy rows with null columns), and quota/permission-denied where relevant.
2. Establish hierarchy: one primary action per view; secondary actions get `variant="secondary"` or links. Headings are real `h1`–`h3` elements in order.
3. Design mobile-first: `flex-wrap`, `min-w-0` + `truncate` on user text, `overflow-x-auto` on wide content, stack with `sm:` breakpoints.
4. Wire accessibility as you build: native elements first (`<dialog>`, `<button>`, `<a>`, `<label>`), `role="alert"` for errors, `role="status"` for async success, `aria-labelledby` for dialogs, visible focus, Escape-to-close.
5. Write copy for humans: plain language, no developer terms in user-facing errors, say what happened and what to do next.
6. Handle async buttons: disabled while pending, spinner + progress label, error shown inline near the trigger.

## Constraints
- No `dangerouslySetInnerHTML` — user/AI content renders as escaped React children.
- Never remove keyboard access to save visual space.
- Don't promise outcomes the product can't guarantee (see copy rules in `applypilot-ui-ux`).

## Verification
- Walk each listed state and confirm it renders intentionally.
- Keyboard-only pass: Tab order, Enter/Space activation, Escape on dialogs.
- Narrow-viewport pass (~360px): nothing overflows the page horizontally.
- Component tests assert semantics (headings, roles, labels), not just text.
