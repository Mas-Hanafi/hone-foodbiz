---
version: 1
slug: "src-app-app-layout-tsx"
primary_target: "src/app/app/layout.tsx"
related_targets: ["src/app/login/page.tsx","src/app/signup/page.tsx","src/app/onboarding/page.tsx"]
---

Scope: signed-in admin app (/app: beranda, outlet, staf, katalog) plus auth screens (/login, /signup, /onboarding). Mode: Operate.
Audience: owner/manager of an Indonesian warung or rumah makan, phone and laptop equally. Task: set up outlets, terminals, staff, menu.
Constraints: Material You pinned by the user; colorful, not basic. Server actions, no client JS for forms. Indonesian UI.

## Direction contract

THESIS: A warm consumer app in Material You tonal colour; refuses the grey SaaS sidebar-and-table admin.
OWN-WORLD: warm tinted ground, white and tonal-container cards with 24-28px radii, seed orange as primary reserved for actions, secondary turmeric and tertiary pandan-green containers carrying stat and icon tiles, rounded humanist sans, outline icons inside tonal circles. Translation: the source's single action colour becomes M3 tonal roles so regions carry colour; the most saturated tone still only marks what can be pressed.
STORY: owner sees what is set up and what is missing, then adds the next thing in one tap.
FIRST VIEWPORT: phone: greeting, setup progress card, quick-action tiles, outlet cards, bottom navigation bar with centre add button. Desktop: navigation rail left, content in a two-column card grid.
FORM: challenger digital-design-canon-warm-consumer-app-surface, seed:5a8f3706f21cb0c2. Signature move: soft spring press on every card and button, and the setup checklist with its progress bar (ring dropped: craft floor refuses decorative rings).
FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance
