---
name: Kesefly — Material Design 3 System
description: Android-first personal finance app; ocean-blue primary actions, pure-white light surfaces, charcoal dark surfaces.
platform: android
status: design specification / not yet verified in implementation
---

# Kesefly — Design System

> **Design direction:** Calm clarity. Ocean-blue actions. White in light mode. Charcoal in dark mode.
>
> **Brand promise:** Understand your spending. Make more intentional decisions.

This document is the single source of truth for Kesefly's visual language and interaction conventions. Follow it for every new screen and reusable component. If an implementation conflicts with this document, do not silently invent a third style: update the design decision here first.

This is a design specification, not evidence that a component, screen, or theme has already been implemented or verified.

## 1. Product and platform context

Kesefly is an Android-first personal and household expense-management application. It helps people record expenses, understand where money goes, compare spending periods, manage budgets, and review evidence-based spending insights.

- **Primary platform:** Android phone.
- **Framework:** React Native + Expo + TypeScript.
- **Navigation:** Expo Router.
- **Component library:** React Native Paper using Material Design 3 (MD3).
- **Icon family:** Material Design Icons (MDI), using a React Native-compatible package/provider.
- **Language:** Vietnamese (`vi-VN`).
- **Currency:** Vietnamese đồng (VND), zero fractional digits in normal transaction UI.
- **Data context:** expense information is personal and should be treated as sensitive. Use realistic-looking but clearly labeled sample data in prototypes; never imply sample figures are actual user records.

Use **Material Design 3**, not the web-only Material UI (MUI) component library. React Native Paper is the native React Native component system. Expo Router owns route/navigation behavior; React Native Paper supplies themed UI components.

### Product UX priorities

1. Make recording an expense fast and predictable.
2. Make financial amounts, dates, categories, and comparison periods easy to scan.
3. Explain spending changes with the underlying period and data coverage visible.
4. Keep suggestions neutral, evidence-based, and optional.
5. Preserve user control, offline awareness, consent, and privacy.

The product is not a banking application, payment processor, investment product, or source of regulated financial advice. Never promise a savings amount or label a discretionary expense as wasteful by default.

## 2. Brand and visual language

### Brand identity

- **Name:** Kesefly. Preserve the lowercase wordmark `kesefly` where a wordmark is needed.
- **Mark:** a simple lowercase `k.` mark may be used as a compact brand signature; do not invent a complex mascot or financial-guru illustration.
- **Primary brand cue:** confident ocean/cobalt blue.
- **Supporting visual language:** neutral whites, cool gray surfaces, charcoal, and restrained blue-gray secondary tones.
- **Personality:** calm, clear, modern, reliable, practical, non-judgmental.

### Visual principles

- Let hierarchy, alignment, spacing, and legible numbers create polish; do not depend on gradients or decoration.
- Use blue to identify the main action, selected state, links, and a small number of important data highlights.
- Keep large page areas neutral: white in light mode and near-black charcoal in dark mode.
- Keep cards purposeful. A card must group a distinct summary, decision, or interaction; do not put every statistic inside a separate card.
- Prefer flat lists and clean section grouping for transaction history.
- Do not use a generic AI dashboard aesthetic.

### Avoid

- Teal or purple as the primary brand color.
- Blue-tinted page backgrounds or full-screen blue washes.
- Gradient-filled buttons, glowing borders, glassmorphism, and ornamental blur.
- Excessive nested cards, unrelated KPI tiles, or decorative charts.
- Emoji as substitutes for interface icons.
- Mixing unrelated icon families or arbitrary per-screen colors.
- Red for an ordinary expense amount or green for every positive-looking number.

## 3. Material Design 3 color system

### 3.1 Color authority and button rule

The primary brand/action color is **Ocean Blue `#2563EB`**.

**All primary filled actions use the same blue fill and white foreground in both light and dark themes:**

- Container: `#2563EB`
- Foreground / label / icon: `#FFFFFF`
- Disabled state: use the disabled semantic tokens, not a faded blue with white text if contrast becomes unreadable.

This is an intentional Kesefly brand override on top of the MD3 role system. MD3 roles remain the implementation contract: use `primary` with `onPrimary`, `primaryContainer` with `onPrimaryContainer`, and equivalent foreground/background pairs. Do not use `primary` with an unrelated text color.

The fixed blue action color is not a command to paint every selected surface blue. Use lighter/darker primary-container roles for selected chips, subtle emphasis, and supporting surfaces.

**Primary button contrast:** white on `#2563EB` is approximately **5.17:1**, exceeding the WCAG AA 4.5:1 criterion for normal text. Re-check contrast if the brand color, opacity, overlay, or label color changes.

### 3.2 Brand seeds

| Token                     | Value     | Purpose                                                             |
| ------------------------- | --------- | ------------------------------------------------------------------- |
| `brandBlue`               | `#2563EB` | Main action, primary selection, important links                     |
| `brandBluePressed`        | `#1D4ED8` | Pressed/stronger action state where an explicit color is needed     |
| `brandBlueContainerLight` | `#DBEAFE` | Light selected/tonal surface                                        |
| `brandBlueContainerDark`  | `#1E3A8A` | Dark selected/tonal surface                                         |
| `brandSlate`              | `#52647A` | Supporting neutral-blue accent                                      |
| `brandTeal`               | `#0F766E` | Restrained tertiary/data-series accent only; never primary branding |

### 3.3 MD3 semantic roles — Light theme

Light mode uses a **white page background**. Surface distinctions are subtle and mostly neutral.

| MD3 role               |                      Hex | Usage                                                      |
| ---------------------- | -----------------------: | ---------------------------------------------------------- |
| `primary`              |                `#2563EB` | Primary filled buttons and key actions                     |
| `onPrimary`            |                `#FFFFFF` | Text/icons on primary                                      |
| `primaryContainer`     |                `#DBEAFE` | Selected chips, soft emphasis, tonal containers            |
| `onPrimaryContainer`   |                `#1E3A8A` | Text/icons on primary container                            |
| `secondary`            |                `#52647A` | Secondary emphasis, less prominent controls                |
| `onSecondary`          |                `#FFFFFF` | Text/icons on secondary                                    |
| `secondaryContainer`   |                `#E3EAF4` | Secondary tonal surface                                    |
| `onSecondaryContainer` |                `#1D2939` | Text/icons on secondary container                          |
| `tertiary`             |                `#0F766E` | Restrained supporting accent or chart series               |
| `onTertiary`           |                `#FFFFFF` | Text/icons on tertiary                                     |
| `tertiaryContainer`    |                `#CCFBF1` | Tertiary tonal surface                                     |
| `onTertiaryContainer`  |                `#134E4A` | Text/icons on tertiary container                           |
| `error`                |                `#B42318` | Actual errors, destructive actions, invalid fields         |
| `onError`              |                `#FFFFFF` | Text/icons on error                                        |
| `errorContainer`       |                `#FEE4E2` | Error surface                                              |
| `onErrorContainer`     |                `#7A271A` | Text/icons on error container                              |
| `background`           |                `#FFFFFF` | Main screen background                                     |
| `onBackground`         |                `#111827` | Text/icons on background                                   |
| `surface`              |                `#FFFFFF` | Default component surface                                  |
| `onSurface`            |                `#111827` | Main text/icons on surface                                 |
| `surfaceVariant`       |                `#F3F6FA` | Inputs, grouped supporting areas, subtle alternate surface |
| `onSurfaceVariant`     |                `#475569` | Secondary text/icons on surface variant                    |
| `outline`              |                `#64748B` | Visible control boundaries and important outlines          |
| `outlineVariant`       |                `#D8E0EA` | Quiet dividers and low-emphasis borders                    |
| `inverseSurface`       |                `#1F2937` | Inverse surface, such as a dark transient surface          |
| `inverseOnSurface`     |                `#F8FAFC` | Content on inverse surface                                 |
| `inversePrimary`       |                `#93B4FF` | Primary accent on inverse surface                          |
| `shadow`               |                `#000000` | Elevation shadow source                                    |
| `scrim`                |                `#000000` | Modal scrim source                                         |
| `backdrop`             | `rgba(15, 23, 42, 0.32)` | Modal/backdrop overlay                                     |
| `surfaceDisabled`      | `rgba(17, 24, 39, 0.12)` | Disabled surface treatment                                 |
| `onSurfaceDisabled`    | `rgba(17, 24, 39, 0.38)` | Disabled foreground treatment                              |

### 3.4 MD3 semantic roles — Dark theme

Dark mode uses a **charcoal / near-black page background**, not a blue or purple tinted background. Surfaces rise through neutral charcoal shades.

The main filled action intentionally remains ocean blue with white text, matching light mode.

| MD3 role               |                         Hex | Usage                                                      |
| ---------------------- | --------------------------: | ---------------------------------------------------------- |
| `primary`              |                   `#2563EB` | Primary filled buttons and key actions; same as light mode |
| `onPrimary`            |                   `#FFFFFF` | Text/icons on primary                                      |
| `primaryContainer`     |                   `#1E3A8A` | Selected chips, soft emphasis, tonal containers            |
| `onPrimaryContainer`   |                   `#DBEAFE` | Text/icons on primary container                            |
| `secondary`            |                   `#BBC7D8` | Secondary emphasis, less prominent controls                |
| `onSecondary`          |                   `#17202B` | Text/icons on secondary                                    |
| `secondaryContainer`   |                   `#35445A` | Secondary tonal surface                                    |
| `onSecondaryContainer` |                   `#E4EBF5` | Text/icons on secondary container                          |
| `tertiary`             |                   `#5EEAD4` | Restrained supporting accent or chart series               |
| `onTertiary`           |                   `#042F2E` | Text/icons on tertiary                                     |
| `tertiaryContainer`    |                   `#134E4A` | Tertiary tonal surface                                     |
| `onTertiaryContainer`  |                   `#99F6E4` | Text/icons on tertiary container                           |
| `error`                |                   `#FFB4AB` | Actual errors, destructive actions, invalid fields         |
| `onError`              |                   `#690005` | Text/icons on error                                        |
| `errorContainer`       |                   `#93000A` | Error surface                                              |
| `onErrorContainer`     |                   `#FFDAD6` | Text/icons on error container                              |
| `background`           |                   `#0B0F14` | Main screen background                                     |
| `onBackground`         |                   `#E5E7EB` | Text/icons on background                                   |
| `surface`              |                   `#0F141B` | Default component surface                                  |
| `onSurface`            |                   `#E5E7EB` | Main text/icons on surface                                 |
| `surfaceVariant`       |                   `#273244` | Inputs, grouped supporting areas, alternate surface        |
| `onSurfaceVariant`     |                   `#C1CAD6` | Secondary text/icons on surface variant                    |
| `outline`              |                   `#8A98A8` | Visible control boundaries and important outlines          |
| `outlineVariant`       |                   `#3B4656` | Quiet dividers and low-emphasis borders                    |
| `inverseSurface`       |                   `#E5E7EB` | Inverse surface                                            |
| `inverseOnSurface`     |                   `#111827` | Content on inverse surface                                 |
| `inversePrimary`       |                   `#1D4ED8` | Primary accent on inverse surface                          |
| `shadow`               |                   `#000000` | Elevation shadow source                                    |
| `scrim`                |                   `#000000` | Modal scrim source                                         |
| `backdrop`             |       `rgba(0, 0, 0, 0.60)` | Modal/backdrop overlay                                     |
| `surfaceDisabled`      | `rgba(229, 231, 235, 0.12)` | Disabled surface treatment                                 |
| `onSurfaceDisabled`    | `rgba(229, 231, 235, 0.38)` | Disabled foreground treatment                              |

### 3.5 Neutral surface ladder

Keep large page areas neutral. Use these surface aliases to create subtle hierarchy without adding blue tint to the whole screen.

| App surface token |     Light |      Dark | Typical usage                    |
| ----------------- | --------: | --------: | -------------------------------- |
| `page`            | `#FFFFFF` | `#0B0F14` | Screen background                |
| `surface0`        | `#FFFFFF` | `#0F141B` | Main content surface             |
| `surface1`        | `#F8FAFC` | `#151C26` | Slightly raised/grouped surface  |
| `surface2`        | `#F1F5F9` | `#192230` | Input or subtle grouping surface |
| `surface3`        | `#EAF0F7` | `#1E2938` | More distinct raised surface     |
| `surface4`        | `#E5ECF4` | `#232F40` | High-emphasis neutral container  |
| `surface5`        | `#DFE7F0` | `#293649` | Highest neutral container        |
| `divider`         | `#D8E0EA` | `#3B4656` | Separators                       |
| `cardBorder`      | `#E5EAF1` | `#283445` | Optional card boundary           |

Use a white card on a white screen only when spacing, typography, or a restrained border already provides enough grouping. Do not add borders to every section. In dark mode, separate surfaces using a small neutral tonal step rather than large shadows.

These `surface0`–`surface5` aliases are application design tokens. Map them deliberately to supported React Native Paper elevation roles or local component styles; do not assume they are built-in Paper color keys.

### 3.6 Financial and status colors

Financial status colors are application-level semantic extensions, not replacements for MD3 `secondary`, `tertiary`, or `error`.

| App semantic token   |     Light |      Dark | Meaning                                          |
| -------------------- | --------: | --------: | ------------------------------------------------ |
| `income`             | `#15803D` | `#86EFAC` | Income text/icon accent, when explicitly labeled |
| `incomeContainer`    | `#DCFCE7` | `#14532D` | Optional income badge/surface                    |
| `onIncomeContainer`  | `#14532D` | `#DCFCE7` | Text/icons on income container                   |
| `expense`            | `#111827` | `#E5E7EB` | Ordinary expense amount; neutral by default      |
| `warning`            | `#A16207` | `#FBBF24` | Budget attention, missing/partial data text/icon |
| `warningContainer`   | `#FEF3C7` | `#713F12` | Warning background                               |
| `onWarningContainer` | `#713F12` | `#FDE68A` | Text/icons on warning container                  |
| `info`               | `#1D4ED8` | `#93B4FF` | Informational status text/icon                   |
| `infoContainer`      | `#DBEAFE` | `#1E3A8A` | Information background                           |
| `onInfoContainer`    | `#1E3A8A` | `#DBEAFE` | Text/icons on information container              |

Rules:

- Show explicit labels such as **Thu** and **Chi**. Do not depend on color alone.
- Ordinary spending amounts use the normal text color, not red.
- Green indicates income or a verified positive outcome; it does not mean every increase is good.
- A spending decrease is not automatically a saving or a positive outcome.
- Warning is for attention, not blame. Pair it with an explanation.
- Red is reserved for errors, destructive actions, and genuinely critical states.
- Comparison UI must state **Tăng** or **Giảm**, the VND difference, the percentage where meaningful, and the compared date ranges.

### 3.7 Chart palette

Use a restrained, ordered palette. Keep chart colors consistent across all analytics screens.

| Series      |     Light |      Dark | Intended use                          |
| ----------- | --------: | --------: | ------------------------------------- |
| 1 — Primary | `#2563EB` | `#60A5FA` | Main category / current period        |
| 2 — Slate   | `#52647A` | `#A8B8CC` | Comparison period                     |
| 3 — Teal    | `#0F766E` | `#5EEAD4` | Additional category                   |
| 4 — Amber   | `#A16207` | `#FBBF24` | Additional category / attention       |
| 5 — Violet  | `#6D5BD0` | `#B9AEFF` | Only when a fifth series is necessary |

Do not assign meaning such as “good” or “bad” to a chart color unless the metric actually has that meaning. Always show legends or direct labels, use patterns/markers where helpful, and provide an equivalent textual summary for screen readers. Avoid more than five simultaneously visible categories; group the remainder into **Khác**.

### 3.8 Color usage and contrast rules

- Always pair each container with its matching foreground role (`primary` / `onPrimary`, `primaryContainer` / `onPrimaryContainer`, etc.).
- Target WCAG 2.2 AA: at least 4.5:1 for normal text, 3:1 for large text, and 3:1 for meaningful UI boundaries/icons where applicable.
- Do not lower opacity on important financial text to create hierarchy; use the correct semantic text role instead.
- Do not place white text on a pale container.
- Do not use brand blue for large page backgrounds, long paragraphs, or every icon.
- Disabled elements must use explicit disabled roles and must remain distinguishable from active elements.
- Recheck contrast after adding transparency, gradients, image backgrounds, overlays, or dynamic colors.

## 4. Typography and numeric display

### Font family

Use **Roboto** as the primary typeface. Prefer the platform-native Roboto on Android. Verify font availability and Vietnamese glyph rendering on any additional target platform rather than assuming a web CSS font name loads in React Native.

Use Material 3 type roles. The values below are design targets in density-independent pixels (dp), not fixed-height text containers.

| Role            | Size / line height | Weight | Usage                                             |
| --------------- | -----------------: | -----: | ------------------------------------------------- |
| Display small   |            36 / 44 |    400 | Exceptional spending summary                      |
| Headline large  |            32 / 40 |    400 | Main financial amount when it is the screen focus |
| Headline medium |            28 / 36 |    400 | Secondary page-level emphasis                     |
| Headline small  |            24 / 32 |    400 | Screen title or major amount                      |
| Title large     |            22 / 28 |    400 | Prominent section/app-bar title                   |
| Title medium    |            16 / 24 |    500 | Section or transaction heading                    |
| Title small     |            14 / 20 |    500 | Compact item heading                              |
| Body large      |            16 / 24 |    400 | Main copy, transaction title, form content        |
| Body medium     |            14 / 20 |    400 | Supporting copy, dates, explanations              |
| Body small      |            12 / 16 |    400 | Low-priority metadata only                        |
| Label large     |            14 / 20 |    500 | Buttons and key controls                          |
| Label medium    |            12 / 16 |    500 | Compact chips and metadata                        |
| Label small     |            11 / 16 |    500 | Rare, non-critical annotations                    |

Rules:

- Prefer regular 400 and medium 500. Use bold sparingly.
- Use Vietnamese sentence case; avoid all-caps navigation and headings.
- Do not use tiny labels for currency or critical comparisons.
- Use tabular numerals for aligned monetary columns where supported.
- Let text wrap and containers grow. Do not shrink type to force a single line.
- Respect Android font scaling and test large text settings up to 200%.
- Avoid truncating primary totals. If a long amount cannot fit, adapt the layout or type scale while keeping the full value accessible.

### Currency, date, and number formatting

- Locale: `vi-VN`.
- Currency: VND.
- Normal money display: no decimal digits, e.g. `1.250.000 ₫`.
- Date display: `dd/MM/yyyy`, unless a relative date is more useful and unambiguous.
- Month display: Vietnamese month/year wording, e.g. `Tháng 11, 2026`.
- Percentages should include a sign where relevant and should not replace the absolute VND difference.
- Distinguish **0 ₫**, missing data, and a period with no records. They are not the same state.
- A balance must not be inferred from income minus expenses unless the product explicitly models an opening balance. Use **Chênh lệch thu − chi** for that calculation.
- Draft or unconfirmed AI-extracted transactions must never be included in totals.

## 5. Iconography

**Use one icon family: Material Design Icons (MDI).** Use the React Native-compatible icon package/provider configured for the app; do not use web icon fonts, raw HTML icon markup, or emoji as production icons.

Suggested icon names:

| Meaning                 | MDI name                 |
| ----------------------- | ------------------------ |
| Overview                | `view-dashboard-outline` |
| Transactions            | `receipt-text-outline`   |
| Budget                  | `wallet-outline`         |
| Settings                | `cog-outline`            |
| Add                     | `plus`                   |
| Category                | `shape-outline`          |
| Home                    | `home-outline`           |
| Utilities / electricity | `lightning-bolt-outline` |
| Water                   | `water-outline`          |
| Food                    | `food-outline`           |
| Transport               | `car-outline`            |
| Search                  | `magnify`                |
| Filter                  | `filter-variant`         |
| Calendar                | `calendar-month-outline` |
| Edit                    | `pencil-outline`         |
| Delete                  | `trash-can-outline`      |
| Insight                 | `lightbulb-outline`      |

Rules:

- Standard icon visual size: 24 dp unless a component spec requires otherwise.
- Keep icon stroke/weight and filled-vs-outline treatment consistent within a navigation group.
- Icons supplement text; they do not replace labels when meaning is not universally obvious.
- Icon-only controls require a Vietnamese accessibility label and a 48 × 48 dp minimum touch target.
- Use selected and unselected variants from the same MDI family.

## 6. Layout, spacing, and responsive behavior

### Spacing scale

Use a 4 dp base grid. Preferred tokens:

| Token      | Value |
| ---------- | ----: |
| `space-1`  |  4 dp |
| `space-2`  |  8 dp |
| `space-3`  | 12 dp |
| `space-4`  | 16 dp |
| `space-5`  | 20 dp |
| `space-6`  | 24 dp |
| `space-8`  | 32 dp |
| `space-12` | 48 dp |
| `space-16` | 64 dp |

Default phone layout:

- Horizontal screen gutter: 16 dp; increase to 20 dp only where the content needs it.
- Related controls: 8–12 dp apart.
- Related content groups: 16 dp apart.
- Major sections: 24–32 dp apart.
- Respect system status bar, navigation bar, keyboard, display cutout, and safe-area insets.
- Do not place primary controls beneath system bars or gesture regions.

### Content hierarchy

For the overview screen, prioritize:

1. Selected period and data coverage.
2. Total spending.
3. Income and budget context, if available.
4. Equivalent-period comparison.
5. A small number of evidence-based observations.
6. Category distribution and recent transactions.

Do not turn the overview into a grid of unrelated KPI tiles. A user should understand the main spending situation at a glance.

### Navigation

The approved primary destinations are:

1. **Tổng quan**
2. **Giao dịch**
3. **Ngân sách**
4. **Cài đặt**

A separate **Thêm giao dịch** floating action opens the add-transaction route on appropriate overview/list screens. Do not add **Phân tích** as a fifth top-level destination without an explicit product decision; analysis can initially live within Tổng quan or a dedicated section reached from it.

- Expo Router owns route definitions and navigation state.
- React Native Paper supplies navigation visuals/components where appropriate.
- Preserve Android Back behavior and deep-link behavior.
- Make the selected destination obvious through icon + label + tonal indicator, not color alone.

### Adaptive layouts

- Design phone screens first; optimize for common Android widths around 360–430 dp.
- Support smaller devices without horizontal scrolling for core flows.
- On wider phones/tablets, increase margins and use two-pane layouts only when they improve task efficiency.
- Do not stretch transaction rows to extreme widths.
- Keep primary actions reachable and respect one-handed use where possible.

## 7. Shapes, borders, and elevation

### Shape tokens

Follow MD3 component-appropriate shape roles rather than giving every component the same radius.

| Token        |        Radius | Usage                                           |
| ------------ | ------------: | ----------------------------------------------- |
| `none`       |          0 dp | Dividers and edge-to-edge surfaces              |
| `extraSmall` |          4 dp | Compact tags or tight elements                  |
| `small`      |          8 dp | Small grouped surfaces                          |
| `medium`     |         12 dp | Inputs and compact cards                        |
| `large`      |         16 dp | Summary cards and larger content surfaces       |
| `extraLarge` |         28 dp | Dialogs and prominent sheets where appropriate  |
| `full`       | Fully rounded | Buttons, chips, pill controls where appropriate |

Target examples:

- Primary/outlined buttons: fully rounded MD3-style shape; minimum 48 dp touch height.
- Chips: fully rounded.
- Text fields: recognizable outlined/fill Material form, 12 dp corners where component styling permits.
- Summary card: 16 dp corners.
- Dialog: 28 dp corners where Paper supports the component shape override.
- FAB: use the component-appropriate rounded shape; do not force it into a generic card shape.

### Borders and depth

- Prefer tonal surface separation over large shadows.
- Use `outlineVariant` for quiet separators; use `outline` for important visible control boundaries.
- A card does not need a border and a shadow simultaneously.
- Use elevation only for genuinely raised objects such as menus, dialogs, sheets, and FABs.
- Avoid neumorphism, heavy shadows, glow, and floating cards for every section.

### React Native Paper elevation targets

Map these neutral values to Paper's `colors.elevation` levels if using a custom theme. These are Kesefly's intentional neutral overrides; they are not a claim that the default Paper palette uses these exact colors.

| Paper role |         Light |          Dark |
| ---------- | ------------: | ------------: |
| `level0`   | `transparent` | `transparent` |
| `level1`   |     `#F8FAFC` |     `#151C26` |
| `level2`   |     `#F1F5F9` |     `#192230` |
| `level3`   |     `#EAF0F7` |     `#1E2938` |
| `level4`   |     `#E5ECF4` |     `#232F40` |
| `level5`   |     `#DFE7F0` |     `#293649` |

## 8. Component conventions

Build on React Native Paper components. Create thin, reusable Kesefly wrappers only when they encode a real shared product rule. Do not create a second component system that merely renames every Paper component.

| UI need                    | Preferred Paper component / pattern              | Kesefly convention                                                                                                          |
| -------------------------- | ------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------- |
| Main action                | `Button` with contained mode                     | `primary` + `onPrimary`; blue fill and white label in both themes                                                           |
| Secondary action           | Outlined or text `Button`                        | Blue label/border; avoid competing filled colors                                                                            |
| Tonal action               | Tonal button / `primaryContainer` pattern        | Light blue container in light mode, deep blue container in dark mode                                                        |
| Add transaction            | `FAB`                                            | Must be explicitly styled to the blue brand action with white icon if the default FAB primary variant uses container colors |
| Summary surface            | `Card` or `Surface`                              | 16 dp shape; neutral background; only for meaningful grouping                                                               |
| Form field                 | `TextInput`                                      | Clear label, helper/error text, amount formatting, accessible focus                                                         |
| Category selector          | `Chip` or custom accessible selection list       | Selected state uses primary container, not a full bright-blue page                                                          |
| Period selector            | `SegmentedButtons` or accessible tabs            | Selected state clearly visible in both themes                                                                               |
| Confirm destructive action | `Dialog`                                         | Explain impact; destructive action uses error role                                                                          |
| Temporary feedback         | `Snackbar`                                       | Concise Vietnamese copy and clear recovery action if possible                                                               |
| List row                   | `List.Item` or custom `Pressable` row            | Transaction title, category/date, amount, clear hit target                                                                  |
| Loading                    | `ActivityIndicator` / skeleton pattern           | Preserve layout; explain longer operations where appropriate                                                                |
| Progress                   | `ProgressBar`                                    | Include textual amount/limit; never rely on progress color alone                                                            |
| Empty state                | Text + restrained MDI icon + one relevant action | No decorative illustration required                                                                                         |

### Button rules

- Main CTA text uses a clear verb: **Thêm giao dịch**, **Lưu thay đổi**, **Tạo ngân sách**.
- Use sentence case, not all caps.
- Main filled button: `#2563EB` + `#FFFFFF` in both themes.
- Outlined/text buttons use blue with adequate contrast against the current surface.
- Do not show two equally prominent filled primary actions next to each other.
- Destructive actions use error styling and explicit confirmation when data loss is meaningful.
- Disabled buttons must communicate that they are unavailable and why, where helpful.

### React Native Paper FAB note

React Native Paper's MD3 FAB primary variant may use `primaryContainer` / `onPrimaryContainer`, which is intentionally tonal. If the Kesefly Add FAB must follow the main brand-action rule, explicitly style its container as `primary` and its icon/label as `onPrimary`, or create one shared `KeseflyFab` wrapper. Verify the actual rendered result on the installed Paper version rather than assuming the variant mapping.

## 9. Interaction states and feedback

Every interactive component must have intentional states:

- Default.
- Pressed.
- Focused (keyboard/accessibility focus).
- Selected.
- Disabled.
- Loading, where an operation is in progress.
- Error, where validation or an operation fails.

Use native Android ripple/state feedback. State layers should remain subtle and must not reduce text contrast. Do not use web hover behavior as the primary interaction model for Android.

### Forms

- Keep labels visible; do not rely on placeholder text as the only label.
- Show validation next to the field that needs correction.
- Preserve entered content after recoverable errors.
- Use numeric keyboard for amount fields.
- Format VND without disrupting cursor position while the user types.
- Distinguish an unsaved draft from a confirmed transaction.
- Avoid clearing a form silently.

### Data and network states

Provide designed states for:

- First-use / empty ledger.
- No transactions in the selected period.
- Partial or incomplete comparison period.
- Offline mode.
- Sync pending.
- Sync failed / conflict requiring resolution.
- Loading.
- Successful save.
- Failed save.
- Permission denied, where applicable.
- AI extraction draft awaiting user review.

Use plain Vietnamese messages that explain what happened and what the user can do next. Do not imply that cloud sync succeeded when data is only saved locally.

## 10. Data visualization and spending insights

### Charts

- Show the period, unit, and data coverage near the chart.
- Include labels or a readable legend; do not make users infer values from color alone.
- Show values in VND and percentages where useful.
- Keep chart gridlines subtle and neutral.
- Avoid 3D charts, decorative effects, unnecessary animation, and misleading truncated axes.
- Provide a textual equivalent of key chart findings.
- If there is insufficient data, show an explicit empty/insufficient-data state rather than a fabricated chart.

### Period comparisons

- Prefer equivalent time ranges (for example, 1–14 November against 1–14 October when the current month is incomplete).
- Display exact comparison dates or a clear period label.
- Show absolute VND difference alongside percentage change.
- If the baseline is zero or absent, do not display a misleading infinite percentage; explain that no comparable baseline exists.
- Label incomplete periods and late-entered transactions where relevant.

### Spending insights

Every insight should explain:

1. What changed or was observed.
2. Which categories/records support the observation.
3. Which periods were compared.
4. Whether the period is complete.
5. Why the observation may be relevant.
6. What action the user could optionally consider.

Use neutral language. Do not assert a recurring bill, necessary expense, wasteful payment, or achievable saving unless the available data supports that claim. The final decision always belongs to the user.

## 11. Motion and transitions

- Motion should confirm navigation, selection, expansion, and completion.
- Prefer short, restrained transitions; do not animate money amounts in a way that obscures the actual value.
- Do not use perpetual pulse, shimmer without a loading reason, or celebratory savings animations.
- Respect Android system animation preferences and reduced-motion behavior.
- Avoid delaying a simple expense-entry action with decorative transitions.

## 12. Accessibility and Android ergonomics

- Minimum interactive target: **48 × 48 dp**; keep adequate spacing between adjacent targets.
- Support TalkBack with meaningful labels, roles, state, and logical traversal order.
- Do not communicate meaning through color alone.
- Maintain WCAG AA text contrast targets and visible control boundaries.
- Respect system font scaling; verify large text and Vietnamese wrapping.
- Keep focus visible for keyboard and accessibility navigation.
- Ensure dialogs, menus, sheets, and bottom navigation are reachable and dismissible.
- Check keyboard overlap and Android Back behavior.
- Ensure charts and icon-only controls have text alternatives.
- Verify on a small Android phone and at least one larger screen/emulator before declaring a screen complete.

## 13. Theme behavior

Support three appearance modes:

1. **Theo hệ thống** — follow Android light/dark preference; default choice.
2. **Sáng** — force the light theme.
3. **Tối** — force the dark theme.

The theme must update consistently across:

- Screen backgrounds and app bars.
- Bottom navigation and selected indicators.
- Cards, lists, dialogs, menus, bottom sheets, and snackbars.
- Text fields, chips, segmented controls, buttons, FABs, and progress indicators.
- Charts, legends, empty states, and illustrations if any.
- Status/navigation bars where the native app configuration allows it.

Changing the theme must not clear user input, reset navigation, or modify transaction data. Persist the user's explicit appearance choice. If the user chooses **Theo hệ thống**, continue to follow the system setting.

## 14. Implementation contract for React Native Paper

Use React Native Paper's MD3 base themes and extend them; do not build a web MUI palette or pass CSS tokens to native components.

Expected implementation pattern:

- Import `MD3LightTheme` and `MD3DarkTheme` from `react-native-paper`.
- Create `keseflyLightTheme` by spreading `MD3LightTheme` and overriding its `colors` with the light table above.
- Create `keseflyDarkTheme` by spreading `MD3DarkTheme` and overriding its `colors` with the dark table above.
- Preserve the base theme's `fonts`, `animation`, and other required metadata unless there is an explicit design decision to change them.
- Provide both themes through one root `PaperProvider`.
- Select the theme from the system appearance plus the user's persisted override.
- Extend theme types for app-only tokens such as `income`, `warning`, `info`, and chart colors; do not pretend these are built-in MD3 roles.
- Define one typed `useAppTheme()` hook so screen components do not import literal palette values.
- Keep color values in one theme/token module. Do not hardcode hex values inside individual screens or components.
- Ensure React Navigation and React Native Paper use coordinated light/dark colors.
- Handle React Native `Modal`/portal contexts according to Paper's provider requirements.

The exact TypeScript shape must be checked against the installed React Native Paper version. Component APIs and token availability can differ by major version. Do not invent unsupported theme keys or assume a web-only MUI prop exists in Paper.

### Primary action implementation invariant

A shared `KeseflyPrimaryButton` (or equivalent shared component) must always render:

- Background: `theme.colors.primary` (`#2563EB` in both modes).
- Foreground: `theme.colors.onPrimary` (`#FFFFFF` in both modes).
- Disabled treatment: explicit disabled semantic colors.

A shared `KeseflyPrimaryFab` must render the same branded action combination if used for the primary Add action. This avoids component-default tonal mappings unexpectedly producing a pale button in dark mode.

### Suggested token organization

Keep the following as one source of truth. File names are suggestions, not a requirement to restructure an existing repository without inspection.

```text
src/
  theme/
    colors.ts          # Light/dark MD3 palettes and app semantic colors
    typography.ts      # Type scale and font mappings
    shapes.ts          # Shape and radius tokens
    spacing.ts         # 4 dp spacing scale
    themes.ts          # MD3LightTheme/MD3DarkTheme extensions
    useAppTheme.ts     # Typed theme hook
```

Do not duplicate token definitions in screens. If the repository already has a suitable theme structure, extend it rather than creating parallel systems.

## 15. Design QA checklist

A screen is not complete merely because it compiles. Check all applicable items:

### Visual consistency

- [ ] Uses the Kesefly blue primary action (`#2563EB`) with white text in both modes.
- [ ] Light mode page background is white; dark mode page background is charcoal.
- [ ] Surfaces use the neutral ladder; no accidental blue-tinted page background.
- [ ] Uses approved type roles, spacing, shapes, and MDI icons.
- [ ] Does not create excessive nested cards or decorative dashboard elements.
- [ ] All colors come from the centralized theme/tokens.

### Content and financial correctness

- [ ] Vietnamese copy is clear, neutral, and non-judgmental.
- [ ] Money uses VND grouping and no unnecessary decimal digits.
- [ ] Period labels and data coverage are explicit.
- [ ] Comparison displays amount and percentage when valid.
- [ ] Zero, missing data, and incomplete periods are distinct.
- [ ] Sample data is clearly identified; no fake savings claims.

### Interaction and accessibility

- [ ] Primary, secondary, selected, disabled, focused, loading, and error states are designed.
- [ ] Touch targets are at least 48 × 48 dp.
- [ ] TalkBack labels and reading order make sense.
- [ ] Text scales without clipping at large font sizes.
- [ ] Keyboard, safe area, Android Back, and modal behavior work.
- [ ] Light and dark modes have been checked on an Android emulator/device.
- [ ] Contrast is verified on actual rendered controls and charts.

### State coverage

- [ ] Loading.
- [ ] Empty / first use.
- [ ] Offline.
- [ ] Pending sync.
- [ ] Failed operation.
- [ ] Partial/incomplete period.
- [ ] Insufficient comparison data.
- [ ] Destructive confirmation where required.

## 16. Working with Impeccable and Hallmark

These tools must preserve the native implementation boundary.

### Impeccable

Use Impeccable to read product/design context, establish visual direction, critique actual screens, audit consistency/accessibility, polish, and document the implemented design system.

Suggested sequence for this repository:

1. Run `$impeccable init` after saving this file so the agent rereads the current product/design context.
2. Use `$impeccable shape` to plan one screen or one coherent flow at a time.
3. Implement with React Native + Expo + TypeScript + React Native Paper MD3.
4. Use `$impeccable critique` on the actual screen after it exists.
5. Use `$impeccable audit` to inspect hierarchy, contrast, component consistency, responsive behavior, and accessibility.
6. Use `$impeccable polish` to fix the highest-impact remaining issues.
7. After real screens and tokens exist, run `$impeccable document` to update this design record from the actual implementation. Do not replace this approved palette with an automatically inferred palette unless the owner approves the change.

Do not rerun `document --seed` after this file has been approved unless intentionally regenerating a seed. This file is already the curated design seed.

### Hallmark

Hallmark may be used for visual exploration or a separate reference artifact. Its HTML/CSS output is **not** production code for Kesefly.

When using Hallmark:

- Keep reference output outside production `src/`, for example `docs/design-reference/`.
- Request a mobile viewport and explicitly describe both light and dark variants.
- Use the blue/white/charcoal palette in this document.
- Tell the agent not to change production source files during visual exploration.
- Translate the approved visual decisions into native React Native Paper components manually or with a coding agent.
- Do not copy HTML, CSS, DOM components, Tailwind classes, browser-only APIs, or web MUI components into the React Native app.

### Recommended screen workflow

Work one screen at a time:

1. Read `PRODUCT.md` and this `DESIGN.md`.
2. Inspect existing routes, components, and implementation before editing.
3. Define the screen's job, primary action, data states, and navigation entry/exit.
4. Explore a reference only if it resolves a meaningful visual question.
5. Implement native React Native Paper components and reuse the shared theme.
6. Run the app on Android and inspect light/dark modes.
7. Critique, audit, and polish the rendered result.
8. Update documentation only when the actual implementation establishes a new verified convention.

## 17. Source-of-truth and change control

- `PRODUCT.md` defines what Kesefly is, for whom, and what product behavior is intended.
- `DESIGN.md` defines visual design, theme roles, typography, layouts, components, and interaction conventions.
- The source code defines what is actually implemented.
- Verification notes/tests define what has actually been tested.

Do not describe planned capabilities as shipped. Do not silently change the brand palette in a screen-specific prompt. If a new palette or component convention is needed, propose the change and update this file as a deliberate decision.

**Current status:** This is the approved design specification/seed. The theme, components, and screens remain unverified until implemented and tested in the Android app.
