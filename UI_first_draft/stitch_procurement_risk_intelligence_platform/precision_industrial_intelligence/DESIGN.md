---
name: Precision Industrial Intelligence
colors:
  surface: '#f8f9ff'
  surface-dim: '#cbdbf5'
  surface-bright: '#f8f9ff'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#eff4ff'
  surface-container: '#e5eeff'
  surface-container-high: '#dce9ff'
  surface-container-highest: '#d3e4fe'
  on-surface: '#0b1c30'
  on-surface-variant: '#3f484a'
  inverse-surface: '#213145'
  inverse-on-surface: '#eaf1ff'
  outline: '#6f797a'
  outline-variant: '#bec8ca'
  surface-tint: '#0c6872'
  primary: '#004a52'
  on-primary: '#ffffff'
  primary-container: '#00646e'
  on-primary-container: '#93dee9'
  inverse-primary: '#88d2dd'
  secondary: '#565e74'
  on-secondary: '#ffffff'
  secondary-container: '#dae2fd'
  on-secondary-container: '#5c647a'
  tertiary: '#004a53'
  on-tertiary: '#ffffff'
  tertiary-container: '#00646f'
  on-tertiary-container: '#81e0f0'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#a4effa'
  primary-fixed-dim: '#88d2dd'
  on-primary-fixed: '#001f23'
  on-primary-fixed-variant: '#004f57'
  secondary-fixed: '#dae2fd'
  secondary-fixed-dim: '#bec6e0'
  on-secondary-fixed: '#131b2e'
  on-secondary-fixed-variant: '#3f465c'
  tertiary-fixed: '#97f0ff'
  tertiary-fixed-dim: '#75d4e4'
  on-tertiary-fixed: '#001f24'
  on-tertiary-fixed-variant: '#004f58'
  background: '#f8f9ff'
  on-background: '#0b1c30'
  surface-variant: '#d3e4fe'
typography:
  display-lg:
    fontFamily: Inter
    fontSize: 36px
    fontWeight: '700'
    lineHeight: 44px
    letterSpacing: -0.025em
  headline-xl:
    fontFamily: Inter
    fontSize: 28px
    fontWeight: '600'
    lineHeight: 36px
    letterSpacing: -0.02em
  headline-lg:
    fontFamily: Inter
    fontSize: 22px
    fontWeight: '600'
    lineHeight: 28px
    letterSpacing: -0.015em
  headline-md:
    fontFamily: Inter
    fontSize: 18px
    fontWeight: '600'
    lineHeight: 24px
    letterSpacing: -0.01em
  body-lg:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 24px
    letterSpacing: '0'
  body-md:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '400'
    lineHeight: 20px
    letterSpacing: '0'
  body-sm:
    fontFamily: Inter
    fontSize: 12px
    fontWeight: '400'
    lineHeight: 16px
    letterSpacing: '0'
  label-md:
    fontFamily: JetBrains Mono
    fontSize: 13px
    fontWeight: '500'
    lineHeight: 18px
    letterSpacing: 0.01em
  label-sm:
    fontFamily: JetBrains Mono
    fontSize: 11px
    fontWeight: '500'
    lineHeight: 14px
    letterSpacing: 0.02em
  data-metric:
    fontFamily: JetBrains Mono
    fontSize: 24px
    fontWeight: '600'
    lineHeight: 28px
    letterSpacing: -0.02em
rounded:
  sm: 0.125rem
  DEFAULT: 0.25rem
  md: 0.375rem
  lg: 0.5rem
  xl: 0.75rem
  full: 9999px
spacing:
  gutter: 1rem
  gutter-desktop: 1.5rem
  margin: 1rem
  margin-desktop: 2rem
  space-xs: 0.25rem
  space-sm: 0.5rem
  space-md: 1rem
  space-lg: 1.5rem
  space-xl: 2.5rem
---

## Brand & Style

This design system embodies an enterprise industrial tech paradigm: authoritative, relentlessly precise, and operationally transparent. Built for global supply chain leaders, risk directors, and procurement officers, the system communicates uncompromising stability, technical rigor, and immediate analytical clarity. 

The aesthetic is Modern Corporate Industrial—merging the disciplined engineering heritage of European heavy enterprise with the frictionless data density of next-generation analytical platforms. Interfaces prioritize information hierarchy, rapid anomaly detection, and systematic auditability over decorative flair. 

Visual structures rely on structured geometric divisions, quiet architectural framing, and surgical color allocation. Every element on the canvas serves an operational purpose: parsing disruption vectors, tracking tier-N supplier exposures, and orchestrating predictive resilience workflows.

## Colors

The palette balances deep industrial authority with targeted optical urgency:

- **Primary (`#00646E` - Deep Petrol) & Tertiary (`#008290` - Bright Teal):** Serve as identity markers, primary interaction catalysts, active tab highlights, and structural emphasis in analytical workflows.
- **Secondary (`#0F172A` - Corporate Deep Slate) & Slate Fill (`#1E293B`):** Establish visual grounding. Employed across high-level navigational anchors, metric card counters, dense table headers, and structural chrome.
- **Neutrals (`#F8FAFC`, `#F1F5F9`, `#E2E8F0`, `#CBD5E1`, `#64748B`):** Form the canvas foundation. The primary viewport canvas sits on `#F8FAFC`, card surfaces on pure `#FFFFFF`, and structural container separations on `#E2E8F0`.
- **Semantic Risk Tiering:**
  - **Low Risk / Safe (`#059669` / `#10B981`):** Applied exclusively to confirmed compliance, stable nodes, and mitigated alerts.
  - **Medium / Elevated Risk (`#D97706` / `#F59E0B`):** Designates fluctuating exposure, geopolitical tension flags, and single-source bottlenecks.
  - **High / Critical Risk (`#DC2626` / `#EF4444`):** Reserved strictly for immediate disruptions, contract violations, solvency alerts, and active single-point failures.

Semantic risk pigments must never be used decoratively; their appearance immediately signals operational state across data displays, badges, and sparklines.

## Typography

The typographic hierarchy pairs `Inter` for structural composition and contextual reading with `JetBrains Mono` for quantitative telemetry, supplier codes, and numerical metrics.

- **Headlines & Interface UI (`Inter`):** Selected for its neutral neo-grotesque geometry, high x-height, and legibility at compact enterprise scales. Headings use medium to bold weights with subtle negative tracking to preserve structural tension.
- **Data & Telemetry (`JetBrains Mono`):** Applied across tabular data, supplier identifiers (e.g., DUNS, VAT numbers), percentage delta indicators, risk matrices, and currency values. Monospaced alignment guarantees zero optical shift during real-time data streaming and vertical comparison.
- **Responsive Scaffolding:** On sub-desktop viewports, `display-lg` steps down to 28px/34px line-height, and `headline-xl` settles to 22px/28px. Body text remains fixed at standard minimums (14px/12px) to safeguard regulatory read-outs and audit reports.

## Layout & Spacing

The layout is governed by an 8pt modular grid with a 4pt baseline subdivision, optimized for multi-screen command centers and desktop workstations.

- **Grid Architecture:** A 12-column responsive fluid grid anchored by a collapsible 260px administrative left rail. 
  - **Desktop (>= 1280px):** 12 columns, 24px gutters, 32px canvas margins.
  - **Tablet (768px – 1279px):** 8 columns, 16px gutters, 20px canvas margins.
  - **Mobile (< 768px):** 4 columns, 12px gutters, 16px canvas margins (visualizations drop into linear cards).
- **Density Rules:** The system operates in high density. Spacing between metrics within a card adheres to `space-xs` (4px) and `space-sm` (8px). Structural separation between decoupled analytical panels adheres to `space-lg` (24px) or `space-xl` (40px). Vertical flow prioritizes compact scannability to present maximum actionable risk telemetry above the fold.

## Elevation & Depth

Visual hierarchy uses crisp, low-contrast structural outlines combined with subtle ambient tonal elevation. This prevents visual fatigue during prolonged analytical sessions while keeping layered cards legible.

- **Level 0 (Base Canvas):** Background color `#F8FAFC`. Completely flat with no shadow.
- **Level 1 (Analytical Cards & Grid Panels):** Background `#FFFFFF`, perimeter stroke 1px solid `#E2E8F0`. Shadow: `0px 1px 3px rgba(15, 23, 42, 0.05)`.
- **Level 2 (Active Dropdowns, Filter Menus & Overlays):** Background `#FFFFFF`, border 1px solid `#CBD5E1`. Shadow: `0px 8px 16px -4px rgba(15, 23, 42, 0.08), 0px 2px 4px -1px rgba(15, 23, 42, 0.04)`.
- **Level 3 (Modal Dialogs & Deep Supplier Dossiers):** Background `#FFFFFF`, border 1px solid `#94A3B8`. Shadow: `0px 20px 24px -4px rgba(15, 23, 42, 0.12), 0px 8px 8px -4px rgba(15, 23, 42, 0.04)`. Backing scrim: `#0F172A` at 40% opacity with 2px backdrop blur.
- **Data Callouts:** Interactive points within risk radars and bubble graphs cast focused micro-shadows (`0px 2px 4px rgba(0, 100, 110, 0.2)`) when active, emphasizing coordinate precision.

## Shapes

The interface utilizes a disciplined, soft shape radius (Level 1):

- **Standard Elements (4px / 0.25rem):** Buttons, inputs, search fields, metric cards, table containers, alert banners, and chart modules. This low radius delivers an engineered, technical appearance suited to heavy industrial machinery and computational tools.
- **Micro Elements (2px):** Internal progress bar indicators, risk severity bars, and inline data-cell tags.
- **Full Radius / Pill (9999px):** Applied strictly to numeric risk badges, real-time status pills (e.g., "Active Disruptor"), and tier counters to provide unmistakable visual separation from functional buttons.

## Components

### Buttons
- **Primary:** Filled `#00646E` with text `#FFFFFF`. Hover: `#008290`. Active: `#004F57`. Focused: 2px offset ring in `#008290`. Border radius: 4px. Font: Inter 14px SemiBold.
- **Secondary / Slate Accent:** Filled `#0F172A` with text `#FFFFFF`. Hover: `#1E293B`. Active: `#020617`. Used for macro system actions (e.g., "Export Global Dossier", "Execute Mitigation").
- **Ghost / Tertiary:** Transparent background, 1px border `#CBD5E1`, text `#0F172A`. Hover: `#F1F5F9`.

### Chips & Semantic Risk Badges
- Displayed with a pill profile. Always feature a leading 6px circular status dot.
- **Critical Risk:** Fill `#FEF2F2`, border 1px solid `#FCA5A5`, text `#DC2626`, dot `#DC2626`.
- **Medium Risk:** Fill `#FFFBEB`, border 1px solid `#FCD34D`, text `#D97706`, dot `#D97706`.
- **Low Risk:** Fill `#ECFDF5`, border 1px solid `#A7F3D0`, text `#059669`, dot `#059669`.

### Input Fields & Controls
- **Text Inputs:** Height 36px, background `#FFFFFF`, border 1px solid `#CBD5E1`, 4px radius. Focus: border `#00646E`, ring 1px `#00646E`. Placeholder: `#94A3B8`.
- **Checkboxes & Radios:** 16px square/circle with 1.5px border `#94A3B8`. Selected state: fill `#00646E` with sharp white tick icon.

### Hierarchical Risk Tables
- **Header:** Background `#F8FAFC`, bottom border 2px solid `#E2E8F0`. Text: Inter 11px uppercase, bold, `#64748B`, tracking `0.05em`.
- **Data Rows:** Height 44px, alternating zebra background (White / `#FAFBFD`). Bottom border 1px solid `#F1F5F9`. Numeric values use `JetBrains Mono`. Hover: background `#F1F5F9`.
- **Expandable Tiers:** Indented tier indicators with a 1px solid `#CBD5E1` connecting tree line to trace Tier-1, Tier-2, and Tier-N dependencies.

### Metric Cards & Visual Indicators
- **Metric Cards:** White surface, 1px border `#E2E8F0`. Label: 12px Inter muted `#64748B`. Value: 24px JetBrains Mono `#0F172A`. Delta indicator: chip with directional arrow and risk-tinted color.
- **Bubble Graphs & Radars:** Polished vector plots. Radar grids drawn with 1px stroke `#E2E8F0` on white. Bubbles use 65% alpha fills (Petrol, Amber, Crimson) with crisp 1.5px outer boundaries, providing clarity even during high-density overlap.