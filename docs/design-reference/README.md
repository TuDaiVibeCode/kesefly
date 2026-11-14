# Kesefly dashboard visual reference

Standalone HTML/CSS concept, 393 × 852 CSS pixels. No production React Native files or dependencies are changed.

Open `index.html` for light mode or `dark.html` for dark mode. Both are generated from identical dashboard markup and share CSS and interaction code. The app-bar theme button switches the same screen; preview controls below the viewport expose full, empty, loading, and error states. Other buttons disclose their intended native destination instead of pretending to save data or implement unrelated screens.

This request intentionally explores **teal and warm neutrals**. It does not replace the approved ocean-blue palette in the repository's `DESIGN.md`. Treat this as visual exploration only; native implementation still requires React Native Paper, Expo, TypeScript, and the approved design decisions.

## Sample data

All displayed values are fictional, explicitly labeled “Dữ liệu minh họa”. No personal records are loaded.

- Current sample: 1–14 November 2026, 8,450,000 VND.
- Comparison: 1–14 October 2026, 9,600,000 VND.
- Difference: 1,150,000 VND less, 11.98%, rounded to 12%.
- Categories: housing 4,200,000; food 2,150,000; bills 1,350,000; other 750,000. Total: 8,450,000 VND.
- Recent rows are a subset of the sample totals: groceries 185,000; electricity 420,000; lunch 55,000. They are not the complete ledger.

The status bar and gesture area are illustrative Android chrome, explicitly requested for this reference. No decorative phone bezel is used. Screenshots are browser-rendered design references, not evidence of a running Android implementation.

## Assets

Roboto font files come from Google Fonts (fonts.googleapis.com / fonts.gstatic.com), with the included Roboto license. Material Design Icons SVGs come from Templarian/MaterialDesign and retain their included license. No photographs, generated artwork, testimonials, or financial outcome claims are used.

## Native handoff

Map the app bar to Paper Appbar, the summary to Surface, the add action to FAB, transactions to accessible rows, and navigation to the shared Expo Router/Paper shell. The distribution strip has visible category names, amounts, and percentages; retain those text equivalents. Preserve Android insets, at least 48 dp touch targets, scalable Roboto text, TalkBack state labels, and reduced motion. Do not copy HTML, CSS, or browser scripts into `src/`.

## Verification

- Hallmark static/render sweep: 0 FAIL, 0 REFLEX, 0 WARN across both HTML states and shared stylesheets.
- Exported light/dark screenshots: 393 × 852 pixels, local Roboto loaded.
- Browser interactions checked: theme switch, full/empty/loading/error previews, retry, add-action disclosure, and Escape dismissal.
- No horizontal document overflow at 320 or 393 pixels; FAB sits outside the scrolling content region.
- Checked normal-text contrast pairs exceed 4.5:1 in both themes, including primary action text (light 6.33:1, dark 7.79:1).
- Repository lint and TypeScript checks pass. These checks do not establish native Android accessibility or runtime behavior.

No image slots need replacement. The most useful future material is an anonymized, owner-approved sample ledger for reviewing realistic category and transaction lengths; this reference uses no private records.

Final independent visual review: **ship**, no material visual findings in either 393 × 852 reference.
