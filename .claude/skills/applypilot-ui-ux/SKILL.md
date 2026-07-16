---
name: applypilot-ui-ux
description: ApplyPilot's concrete visual system — palette, primitives, copy voice, and state patterns. Use with ui-ux-pro-max whenever building UI in this repo.
---

# ApplyPilot UI/UX

## Purpose
New UI should look like it was always here: same palette, same primitives,
same voice.

## When to use
Any change under `src/app/**/page.tsx`, `src/app/page.tsx` (landing), or
`src/components/`.

## Workflow
1. **Palette:** slate for surfaces/text, indigo-600 for primary actions and accents, green/amber/red only as status tones. Every color pairs with a `dark:` variant — dark mode is class-based Tailwind, both themes always styled.
2. **Primitives first:** `Button` (primary/secondary), `Card`/`CardTitle`, `Badge` (tone prop), `Input`/`Textarea`, `Spinner`, `EmptyState`. Compose these before writing bespoke markup; extend a primitive rather than fork its styles.
3. **Established patterns to reuse:**
   - Empty state → `EmptyState` with title, one-sentence explanation, CTA link.
   - Quota hit → `UpgradeCard` (respects `billingAvailable`).
   - Async action → button disabled + `Spinner` + present-progressive label ("Re-scoring…").
   - Success/status → `role="status"` green panel; errors → `role="alert"` red text near the trigger.
   - Score tones → `scoreTone()` mapping (<50 red, <75 amber, else green).
4. **Copy voice:** direct, honest, second person. Explain the benefit ("so you can watch your fit improve"). Never imply a score guarantees interviews or offers; never expose config/internal terms (see `caveman`).
5. **Layout:** pages are server components; `max-w-*` containers, `space-y-6` rhythm, `flex-wrap` header rows with actions on the right.

## Constraints
- Don't redesign existing screens while adding features — match what's there.
- No new UI dependencies (component libraries, icon packs) without approval; primitives are hand-rolled Tailwind.
- Landing page (`/`) must stay fully static — no per-request work.

## Verification
- New UI is visually indistinguishable in style from adjacent existing UI.
- Both themes checked (no unstyled dark-mode surface).
- All states rendered intentionally per `ui-ux-pro-max`'s checklist.
- `npm run build` still marks `/` as static (`○`).
