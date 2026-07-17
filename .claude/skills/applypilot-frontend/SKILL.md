---
name: applypilot-frontend
description: Frontend engineering rules for ApplyPilot — Next.js App Router, server/client component boundaries, TypeScript, Tailwind, reusable components, responsive + accessible bilingual UI. Use when building or changing any page or component (dashboard, analysis result, resumes, billing, landing, auth).
---

# ApplyPilot Frontend

## Purpose
Ship frontend changes that fit the existing App Router architecture,
stay accessible and responsive in both English and Turkish, and never
break working product behavior.

## When to use
Any change under `src/app/**/page.tsx`, `src/app/**/layout.tsx`, or
`src/components/` — new screens, redesigns, or component work.

## Workflow
1. **Component boundaries:** pages and layouts are server components — they `await createClient()` (Supabase, RLS-scoped), `await getLocale()`, and `await` `params`/`searchParams` (they are Promises in this Next.js). Add `"use client"` only for interactivity (state, handlers, `useRouter`); keep client components leaf-level and pass data down as props.
2. **TypeScript stays strict:** no `any`, no `as` escape hatches; props typed inline; catalog access typed via `Messages` from `src/lib/i18n/en.ts`.
3. **Reuse primitives first:** `Button`, `Card`/`CardTitle`, `Badge`, `Input`/`Textarea`, `Spinner`, `Skeleton`, `EmptyState` in `src/components/ui/`. Extend a primitive rather than fork its Tailwind classes; two call sites justify a new shared component, one does not.
4. **Responsive layouts:** mobile-first Tailwind — `flex-wrap`, `min-w-0` + `truncate` on user-provided text, `overflow-x-auto` around wide content, stack with `sm:`/`lg:` breakpoints. No fixed pixel widths on text containers.
5. **Bilingual by construction:** all copy comes from the message catalog (`getMessages(locale)`); client components take `locale?: Locale = "en"`. Design for Turkish expansion (~30% longer): buttons, badges, nav items, and dialog titles must wrap or grow, never clip. Never translate user facts — CV text, job titles, company names, technologies, dates. Dates go through `formatDate(iso, locale)`.
6. **Accessibility:** real heading order (`h1`–`h3`), native elements (`<button>`, `<a>`, `<dialog>`, `<label>`), `role="alert"` for errors, `role="status"` for async success, visible focus, Escape closes dialogs, touch targets ≥ 40px. Never communicate status by color alone; respect `prefers-reduced-motion` for any animation.
7. **Preserve behavior:** routes, redirects, auth flows, RLS-scoped queries, API request/response contracts, form field names, and quota/billing logic are load-bearing — a visual change must not alter them. If markup a test asserts on changes intentionally, update the test deliberately (see `applypilot-testing`).
8. **Verify visually:** render every state (loading, empty, error, populated, quota-full, coming-soon) and check ~375px, 768px, and 1280px+ widths in both locales — long Turkish strings included.

## Constraints
- No new UI dependencies (component libraries, icon packs, animation libs) without explicit approval.
- No `dangerouslySetInnerHTML`; user/AI content renders as escaped React children.
- Server-only modules (`@/lib/supabase/server`, `next/headers`) never import into client components.
- Don't add fake data to authenticated pages; sample content lives only in marketing components.

## Verification
- `npm run lint`, `npm run typecheck`, `npm test`, `npm run build` — all green, zero suppressions added.
- Both themes styled (every surface pairs light + `dark:`), both locales render without clipping.
- Component tests assert semantics (headings, roles, `aria-*`, `href`), not just visible text.
