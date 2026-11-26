---
name: H One FoodBiz
description: Warm Material You admin for Indonesian warung and restaurant owners; tonal colour carries regions, saturated orange marks only what can be pressed.
colors:
  primary: "#c2410c"
  on-primary: "#ffffff"
  primary-container: "#ffdbcc"
  on-primary-container: "#3b0d00"
  secondary: "#7a5900"
  on-secondary: "#ffffff"
  secondary-container: "#ffdf9e"
  on-secondary-container: "#261a00"
  tertiary: "#2e6a3e"
  on-tertiary: "#ffffff"
  tertiary-container: "#b1f1bb"
  on-tertiary-container: "#00210b"
  error: "#ba1a1a"
  on-error: "#ffffff"
  error-container: "#ffdad6"
  on-error-container: "#410002"
  surface: "#fff8f4"
  surface-lowest: "#ffffff"
  surface-low: "#fdf1ea"
  surface-container: "#f8eae2"
  surface-high: "#f2e3db"
  on-surface: "#231a15"
  on-surface-variant: "#53443d"
  outline: "#85736b"
  outline-variant: "#dcc6bd"
typography:
  display:
    fontFamily: "Nunito, Nunito Sans, ui-sans-serif, sans-serif"
    fontSize: "3.75rem"
    fontWeight: 800
    lineHeight: 1.05
    letterSpacing: "-0.025em"
  headline:
    fontFamily: "Nunito, Nunito Sans, ui-sans-serif, sans-serif"
    fontSize: "2.25rem"
    fontWeight: 800
    lineHeight: 1.05
    letterSpacing: "-0.025em"
  title:
    fontFamily: "Nunito, Nunito Sans, ui-sans-serif, sans-serif"
    fontSize: "1.25rem"
    fontWeight: 700
    lineHeight: 1.4
  body:
    fontFamily: "Nunito Sans, ui-sans-serif, system-ui, sans-serif"
    fontSize: "1rem"
    fontWeight: 400
    lineHeight: 1.5
  label:
    fontFamily: "Nunito Sans, ui-sans-serif, system-ui, sans-serif"
    fontSize: "0.875rem"
    fontWeight: 700
    lineHeight: 1.43
  label-small:
    fontFamily: "Nunito Sans, ui-sans-serif, system-ui, sans-serif"
    fontSize: "0.75rem"
    fontWeight: 700
    lineHeight: 1.33
rounded:
  chip: "8px"
  filter-chip: "12px"
  field: "14px"
  tile: "16px"
  tile-lg: "20px"
  panel: "24px"
  card: "28px"
  full: "9999px"
spacing:
  xs: "4px"
  sm: "8px"
  md: "12px"
  lg: "16px"
  xl: "20px"
  2xl: "24px"
  3xl: "32px"
components:
  button-filled:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.on-primary}"
    typography: "{typography.label}"
    rounded: "{rounded.full}"
    padding: "0 24px"
    height: "48px"
  button-tonal:
    backgroundColor: "{colors.secondary-container}"
    textColor: "{colors.on-secondary-container}"
    rounded: "{rounded.full}"
    padding: "0 24px"
    height: "48px"
  button-outlined:
    backgroundColor: "transparent"
    textColor: "{colors.primary}"
    rounded: "{rounded.full}"
    padding: "0 24px"
    height: "48px"
  button-text:
    backgroundColor: "transparent"
    textColor: "{colors.primary}"
    rounded: "{rounded.full}"
    padding: "0 12px"
    height: "48px"
  button-danger:
    backgroundColor: "transparent"
    textColor: "{colors.error}"
    rounded: "{rounded.full}"
    padding: "0 24px"
    height: "48px"
  card-surface:
    backgroundColor: "{colors.surface-lowest}"
    textColor: "{colors.on-surface}"
    rounded: "{rounded.card}"
    padding: "24px"
  card-primary:
    backgroundColor: "{colors.primary-container}"
    textColor: "{colors.on-primary-container}"
    rounded: "{rounded.card}"
    padding: "24px"
  card-secondary:
    backgroundColor: "{colors.secondary-container}"
    textColor: "{colors.on-secondary-container}"
    rounded: "{rounded.card}"
    padding: "24px"
  card-tertiary:
    backgroundColor: "{colors.tertiary-container}"
    textColor: "{colors.on-tertiary-container}"
    rounded: "{rounded.card}"
    padding: "24px"
  input-field:
    backgroundColor: "{colors.surface-lowest}"
    textColor: "{colors.on-surface}"
    typography: "{typography.body}"
    rounded: "{rounded.field}"
    padding: "0 16px"
    height: "48px"
  icon-tile:
    backgroundColor: "{colors.primary-container}"
    textColor: "{colors.on-primary-container}"
    rounded: "{rounded.tile}"
    size: "44px"
  icon-tile-lg:
    rounded: "{rounded.tile-lg}"
    size: "56px"
  chip-status:
    backgroundColor: "{colors.tertiary-container}"
    textColor: "{colors.on-tertiary-container}"
    typography: "{typography.label-small}"
    rounded: "{rounded.chip}"
    padding: "0 10px"
    height: "28px"
  chip-filter:
    backgroundColor: "transparent"
    textColor: "{colors.on-surface}"
    typography: "{typography.label}"
    rounded: "{rounded.filter-chip}"
    padding: "0 16px"
    height: "40px"
  chip-filter-selected:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.on-primary}"
  nav-indicator-active:
    backgroundColor: "{colors.secondary-container}"
    textColor: "{colors.on-secondary-container}"
    rounded: "{rounded.full}"
    width: "56px"
    height: "32px"
  nav-add-button:
    backgroundColor: "{colors.primary-container}"
    textColor: "{colors.on-primary-container}"
    rounded: "{rounded.tile}"
    size: "56px"
  list-row:
    backgroundColor: "transparent"
    textColor: "{colors.on-surface}"
    rounded: "{rounded.tile}"
    padding: "10px 12px"
    height: "64px"
---

# Design System: H One FoodBiz

## Overview

**Creative North Star: "The Warung Kitchen in Tonal Colour"**

H One FoodBiz is a warm consumer app wearing Material You, not a grey SaaS admin. The ground is a peach-tinted paper (surface), cards sit on it as white sheets or as soft tonal containers (orange, turmeric, pandan green), and every pressable thing gives under the thumb and springs back. Colour is spread across regions through M3 container roles so the screens feel lively and owned; the most saturated orange is reserved for the things you can press.

Density is phone-first and generous: 48px minimum targets, 64px list rows, 28px card corners, short rounded humanist type. On wide screens the same cards rearrange into a two-column grid beside a navigation rail; on phones they stack above a bottom bar with a raised centre Kasir button. Light and dark schemes are both first-class, swapped wholesale through the same role names.

**Key Characteristics:**
- M3 tonal roles in three families: warung orange (primary), turmeric (secondary), pandan (tertiary), all on a warm peach neutral.
- Solid primary fill only on pressable elements; regions carry colour through containers.
- Large soft radii (28px cards, pill buttons); nothing interactive has a square corner.
- Nunito 800 headlines over Nunito Sans body, tight leading on big titles.
- Spring press (scale 0.96) on every button, card link, list row and chip.
- Outline icons inside rounded tonal tiles, never bare glyphs.

## Colors

A warm M3 tonal palette seeded from orange: three accent families each expressed as a strong role plus a soft container, over a peach-tinted neutral ramp.

### Primary
- **Warung Orange** (primary): filled buttons, selected filter chips, switch-on track, the phone add button, focus outline, caret, links. The one solid fill that means "press me".
- **Peach Container** (primary-container / on-primary-container): the setup checklist card, the auth hero panel, the landing page ground, the rail add button, first outlet card, text selection.

### Secondary
- **Turmeric** (secondary) is defined but rarely used as a fill. Its container is the workhorse: **Turmeric Cream** (secondary-container) fills tonal buttons, the active navigation indicator, empty-state tiles and the third outlet card.

### Tertiary
- **Pandan Green** (tertiary-container / on-tertiary-container): success notices, the "ready" state of the setup card, the avatar circle, positive status chips, the second outlet card, terminal quick-action tiles.

### Error
- **Sambal Red** (error, error-container): danger buttons (outlined), error notices with an alert icon. Never decorative.

### Neutral
- **Peach Paper** (surface): page background; also `theme-color` for the browser chrome.
- **White Sheet** (surface-lowest): default cards and inputs; at 70% opacity for code tiles and progress tracks set on tonal cards, so the tone bleeds through.
- **Warm Tray** (surface-low): navigation rail and bottom bar.
- **Warm Hover** (surface-container / surface-high): hover fill for list rows and quick actions; switch off-track.
- **Roasted Brown** (on-surface): body text. **Clay** (on-surface-variant): supporting text, inactive nav labels.
- **Outline** (outline): input and outlined-button strokes. **Soft Outline** (outline-variant): status-chip stroke, dashed empty-state border, bar top border, scrollbar thumb.

### Named Rules
**The Pressable Saturation Rule.** Solid primary orange fills only pressable things (filled button, phone add button, selected chip, switch-on) and the focus ring. Regions, cards and tiles get colour through `*-container` roles, never through the primary fill.

**The Pair Rule.** A container background always takes its own `on-*-container` text colour. Contrast is guaranteed by the pair; never mix families (no on-primary-container text on a tertiary container).

**The Three-Container Rotation.** Sibling items that need distinction (outlet cards, quick-action tiles, auth facts) rotate primary, tertiary and secondary containers instead of inventing new hues.

## Typography

**Display Font:** Nunito (700, 800), via next/font, falls back to Nunito Sans then system sans
**Body Font:** Nunito Sans (400, 600, 700), falls back to ui-sans-serif, system-ui
**Label/Mono Font:** body font for labels; the system monospace stack appears only on short machine codes (outlet code JKT, terminal code JKT-01)

**Character:** Rounded terminals and a heavy 800 weight make headlines friendly and edible-feeling; Nunito Sans keeps forms and lists plain and legible at small sizes.

### Hierarchy
- **Display** (800, 2.6rem phone → 3.75rem ≥640px, line-height 1.05, -0.025em): the dashboard greeting and the landing/auth hero line (3rem). One per screen.
- **Headline** (800, 1.9rem phone → 2.25rem ≥640px, 1.05, -0.025em): page titles on every other app screen; auth form title at 1.875rem.
- **Title** (700, 1.25rem): card titles and section headings ("Aksi cepat", "Outlet"); 1.125rem 800 for outlet names in cards; 1.875rem 800 (Nunito) for the next setup step.
- **Body** (400, 1rem, 1.5): paragraphs and inputs; descriptions capped at `max-w-prose` (65ch).
- **Label** (700, 0.875rem): field labels, nav and quick-action labels, list-row titles at 1rem 700; buttons at 0.95rem 700.
- **Label small** (700, 0.75rem): status chips, nav-bar labels, field hints (400).

### Named Rules
**The Two-Nunito Rule.** h1–h3 and the wordmark use Nunito 800/700; everything else is Nunito Sans. No third family except system mono for machine codes.

**The Tabular Money Rule.** Every number a user compares (rupiah amounts, counts, percentages, progress "3 dari 5") uses tabular figures (`.num`); the rupiah field shows a fixed "Rp" prefix inside the input.

**No Eyebrows.** Headings stand alone; no uppercase kicker or tracked label above a title.

## Layout

App shell: a 96px navigation rail (surface-low, sticky, full height) on ≥768px; below that a fixed bottom bar with safe-area padding and the content gets 128px bottom padding to clear it. Content column is centred, max 72rem (1152px), with 16px gutters on phones and 32px from 640px.

The dashboard is a two-column grid from 1024px (`1.35fr / 1fr`): setup card left, quick actions and outlet cards right; it stacks to one column below. Auth screens split 5fr/6fr from 1024px (tonal hero panel left, form right, form max 28rem); on phones the tonal panel collapses to a short header band above the form.

Spacing rhythm is a 4px base used in a few steps: 12–16px between items inside a card, 20px between cards, 24px below a page header, 20px card padding on phones and 24px from 640px. Touch targets are at least 48px (buttons, inputs, switches, checkbox rows, sign-out); list rows are 64px.

## Elevation & Depth

Hybrid: depth comes mostly from tonal layering (peach paper → white sheet → tonal container, with translucent white only for small tiles and tracks), with two warm, low shadows tinted from the on-surface brown (pure black in dark mode). Tonal cards are flat; only white surface cards and the filled button carry a resting shadow.

### Shadow Vocabulary
- **Card** (`box-shadow: 0 1px 2px rgb(35 26 21 / 0.06), 0 4px 14px -6px rgb(35 26 21 / 0.12)`): resting white cards, filled buttons, rail add button.
- **Raised** (`box-shadow: 0 2px 4px rgb(35 26 21 / 0.08), 0 10px 24px -8px rgb(35 26 21 / 0.22)`): hover state of filled buttons and the rail add button; resting state of the phone bar's centre Kasir button, which floats 28px above the bar (see The One Loud Centre Rule), and of the Kasir cart bar.

### Named Rules
**The Surface-Only Shadow Rule.** Shadows sit only on white surface cards and on primary actions. A tonal container never gets a shadow; its colour already separates it.

## Shapes

Soft and pebble-like. Cards 28px; empty states 24px; large icon tiles 20px; icon tiles, list rows, the add buttons and progress items 16px; inputs 14px; filter chips 12px; status chips 8px; buttons, the nav indicator, the switch and progress bars are full pills. Borders are rare: 1px outline on inputs and outlined buttons, a dashed outline-variant border on empty states, 2px circular rings for unfinished checklist steps.

**The Nothing-Square Rule.** No interactive or container element has a radius under 8px.

## Components

### Buttons
Pill-shaped, bold and springy.
- **Shape:** full pill, min height 48px, 24px horizontal padding (12px for text buttons), 8px gap for an icon.
- **Filled:** primary on on-primary with the card shadow, raised shadow on hover. One per view section; the main next step.
- **Tonal:** secondary-container, brightness 95% on hover. Secondary actions.
- **Outlined / Text:** primary text, outline stroke for outlined; hover fills primary at 8%.
- **Danger:** error stroke and text, error 8% on hover; always outlined, never filled.
- **Press / Focus / Disabled:** `.press` scale 0.96 in 90ms, spring back over 260ms; 3px primary focus outline offset 2px; disabled at 40% opacity. Submit buttons swap in a spinning loader and `aria-busy` while the server action runs.

### Chips
- **Status chip:** 28px tall, 8px radius, 0.75rem bold. Tone = container pair; the neutral variant is an outline-variant stroke with clay text.
- **Filter chip (checkbox):** 40px tall, 12px radius, stroke at 40% of current colour; selected becomes a solid primary fill with on-primary text.

### Cards / Containers
- **Corner Style:** 28px.
- **Background:** surface-lowest (default) or a container tone (primary, secondary, tertiary, error).
- **Shadow Strategy:** card shadow on surface cards only (see Elevation).
- **Internal Padding:** 20px phone, 24px from 640px; title row 16px above content, title 1.25rem bold with an optional trailing action.
- **Outlet card link:** a whole-card link in a rotating container tone, 16px padding, a 48px translucent white code tile, name, a tabular detail line and an arrow.

### Inputs / Fields
- **Style:** 48px min height, 14px radius, 1px outline stroke, white sheet fill, 16px horizontal padding, bold 0.875rem label above, 0.75rem hint below.
- **Hover / Focus:** stroke darkens to on-surface on hover; focus turns the stroke primary with a 2px primary/30 ring, transitioned over 150ms.
- **Rupiah field:** fixed bold "Rp" prefix inside the left edge, tabular figures.
- **Select:** same control with the native arrow hidden and a primary chevron at the right.
- **Switch:** M3 switch on a native checkbox: 52×32 pill track, thumb grows 1.5× and slides on the spring easing when checked.

### Navigation
- **Rail (≥768px):** 96px column on surface-low; 56px primary-container add button at the top, then destinations stacked as icon-in-indicator over a 0.75rem bold label.
- **Bar (<768px):** fixed bottom, surface-low with a soft outline-variant top border; two destinations, a 56px primary add button raised 28px, then the rest.
- **Active state:** a 56×32 secondary-container pill behind the icon, icon stroke 2.4 instead of 2, label in on-surface; inactive is clay. `aria-current="page"` on the active link.

**The One Loud Centre Rule.** Emphasis changes by breakpoint on purpose. On the rail, the top button is the M3 tonal FAB for adding a menu item (primary-container fill, card shadow at rest, raised on hover), and Kasir is an ordinary rail destination. The rail sits beside page content that has its own filled buttons, so nothing on it is solid primary. On the phone bar, the centre button opens Kasir, the most frequent job: solid primary 56px tile with a "Kasir" label, raised shadow at rest, lifted 28px above the bar. Adding a menu item on phones goes through Katalog. Keep these two treatments. Don't unify them, and don't give the bar's neighbouring destinations a fill.

**Kasir surface.** `/kasir` runs outside the admin shell: a slim top bar (back, outlet, terminal, cashier, shift, Tutup shift), the menu grid on the left and the cart panel (surface-low, 24rem) on the right from `lg`; below `lg` the cart becomes a sticky primary bar at the bottom that opens a bottom sheet. Option, cart and payment sheets are native `<dialog>` elements: centred cards on wide screens, bottom sheets on phones. Selected sizes and payment methods use secondary-container; selected add-ons use primary, because they are what the cashier is pressing.

### Icon Tile (signature)
Outline icons (lucide, 20px) centred in a rounded square of a container tone: 44px with 16px radius, or 56px with 20px radius for quick actions and empty states. This is how the product shows icons everywhere.

### Setup Checklist (signature)
One primary-container card with no inner panels, read top to bottom:
1. **Progress:** a 10px pill track of translucent white (70%) whose fill (current colour at 80%) grows from the left once on arrival (900ms expo-out, 150ms delay), followed by a tabular "n dari m" count.
2. **Next step:** placed directly on the container. A display-weight title (Nunito 800, 1.875rem), a supporting line at 85% opacity, then a filled primary button with a trailing arrow. 20px of space below it.
3. **Pending steps:** a hairline divider (1px on-primary-container at 15%), then 48px rows with an empty 24px ring (2px current-colour stroke), each a press link.
4. **Finished steps:** another hairline divider, then a collapsed "N langkah selesai" disclosure whose check badge sits on a 15% on-primary-container circle. It expands into a lighter indented list.

When everything is done the card switches to the tertiary container. Hairline dividers in the container's own ink are the only separators inside a tonal card.

### Notice
Inline status line, 16px radius, 14px vertical padding: error container with an alert icon (`role="alert"`) or tertiary container with a check icon (`role="status"`).

## Do's and Don'ts

### Do:
- **Do** put colour on regions through `*-container` roles and keep solid primary (#c2410c) for pressable elements and focus.
- **Do** pair every container with its own `on-*-container` text colour.
- **Do** give every button, card link, list row and chip the `.press` spring (scale 0.96, `cubic-bezier(0.34, 1.25, 0.64, 1)`), and let `prefers-reduced-motion` zero it.
- **Do** keep touch targets at 48px or more and list rows at 64px.
- **Do** use tabular figures and an "Rp" prefix for money; format rupiah without decimals.
- **Do** place icons inside tonal tiles (44px/16px or 56px/20px), outline style.
- **Do** define every colour through the role variables so the dark scheme swaps cleanly.
- **Do** separate groups inside a tonal card with hairline dividers in its own ink (on-*-container at 15%), not with nested panels.

### Don't:
- **Don't** build the grey sidebar-and-table SaaS admin; this is a warm consumer app.
- **Don't** fill cards, banners or tiles with solid primary orange.
- **Don't** put shadows on tonal containers.
- **Don't** add decorative progress rings or uppercase eyebrow labels above headings.
- **Don't** use emoji or glyph characters as icons.
- **Don't** introduce a hue outside the orange, turmeric, pandan, error and warm-neutral families.
- **Don't** use corners under 8px or square buttons.
- **Don't** nest a white inner panel inside a tonal card to hold its main action.
