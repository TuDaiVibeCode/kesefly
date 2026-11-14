# Kesefly — Product-wide Design Brief

**Status:** Approved by the product owner on 2026-11-14. Approval covers the design direction, not application implementation. Seed creation is deferred until explicitly requested.

**Scope:** Reusable UX/UI guidance for every Kesefly screen. Android first; React Native, Expo, TypeScript, Expo Router, and React Native Paper with Material Design 3. Vietnamese interface; VND currency. Role 4 owns this work.

## 1. Audience, purpose, and success

Design for everyday people recording food purchases, rent, utilities, and other household expenses. A person opening Kesefly should quickly understand spending, find a transaction, or record a payment without financial expertise.

The main experience is an operational tool: task completion, legibility, and predictable Android behavior take priority over decoration. Help users answer: “Tôi đã chi bao nhiêu?”, “Khoản nào thay đổi?”, and “Tôi có thể điều chỉnh gì?”.

Success means users can record an expense, explain a comparison, and understand the evidence behind a suggestion. Do not equate using the app with proven savings.

## 2. Brand and visual direction

**Direction: calm clarity for everyday household spending.** Preserve the existing blue identity, lowercase `kesefly` wordmark, and simple `k.` mark. Extend this identity into a coherent Material 3 system rather than introducing a new logo or visual metaphor.

- Use quiet blue-tinted neutral surfaces, dark ink text, and restrained blue actions. Reserve expressive color for meaning and selection.
- Give money, dates, and household category names more prominence than branding. A brand mark belongs at entry points; it need not repeat above every task.
- Build character through precise alignment, readable amounts, generous section spacing, and helpful Vietnamese copy.
- Prefer flat lists and grouped sections. Use a card when a summary, recommendation, or decision benefits from a clear boundary; avoid nested cards.
- Exclude decorative gradients, glass effects, floating metric tiles, AI sparkle motifs, stock finance illustrations, celebratory savings claims, and marketing slogans above routine forms.

The existing code is evidence for color identity, not proof that current layouts or controls meet this brief. This document describes proposed behavior, not a rendered or accessibility-verified system.

## 3. Navigation architecture

Use one route state owned by Expo Router. Paper supplies navigation presentation; do not introduce a second navigation state machine.

| Primary destination | Purpose | Route |
| --- | --- | --- |
| Tổng quan | Current-period spending, budget context, and concise observations | `/` |
| Giao dịch | Confirmed entries, filters, and access to pending review | `/transactions` |
| Ngân sách | Set and review the available monthly budget | `/budget` |
| Cài đặt | Account, permissions, consent, sync, and appearance | `/settings` |

On compact phones, use four labeled bottom-navigation destinations with Material icons and an unmistakable selected state. Replace the existing “Thêm mới” destination with one extended FAB, “Thêm giao dịch”, leading to the existing `/add` route. Show it on overview and transaction-list screens; hide it during editing, dialogs, and keyboard entry.

Transaction details remain `/transaction/[id]`. Review is a labeled area within Giao dịch, with a count such as “Cần duyệt · 3”; it is not another primary destination. Saving advice initially belongs in Tổng quan, with an evidence detail view only when supported.

Keep existing deep links valid. Preserve period/filter context when returning from a detail view. Android Back dismisses transient UI first, then returns through the route stack. Warn before losing an edited draft; never trap Back.

At expanded widths, use a Material navigation rail and an optional list/detail layout. Width, not device name, determines adaptation. Keep phone forms single-column and respect keyboard and system-bar insets.

## 4. Financial information hierarchy

Overview order:

1. **Period and coverage:** “Tháng 11, 2026” with a clear period selector; distinguish a full month from “Từ 01/11 đến 14/11”.
2. **Primary amount:** “Đã chi trong tháng”, followed by the full VND amount. Never label income minus expenses as an account balance.
3. **Context:** income, “Chênh lệch thu − chi”, and budget remaining or exceeded. Keep these secondary to spending.
4. **Comparison:** absolute change, percentage when valid, and exact reference dates. Compare equivalent elapsed ranges for an incomplete month.
5. **One to three useful observations:** strongest evidence first; link to supporting transactions.
6. **Category breakdown and recent entries:** support investigation without overwhelming the first viewport.

Only confirmed, non-deleted transactions affect totals. Drafts and queued inputs show their status separately. Distinguish an actual zero from missing history; use “Chưa đủ dữ liệu để so sánh” when appropriate. Never show an infinite percentage when the previous value is zero.

Format amounts with Vietnamese grouping, such as **1.250.000 ₫**, without decimal digits. Display the full amount in details and editing; do not abbreviate primary financial values. Align comparable numbers consistently and use tabular figures where supported. Very large values must wrap or change layout rather than disappear behind ellipses.

An expense is not an error. Use neutral text with explicit “Chi”/“Thu” labels; reserve error red for invalid input and destructive actions. For changes, state “Tăng” or “Giảm” alongside the amount: increasing income and increasing spending have different meanings.

## 5. Light and dark themes

Follow the Android system appearance by default. A future appearance setting may offer “Theo hệ thống”, “Sáng”, and “Tối”; do not imply it already exists.

Use complete Paper MD3 light/dark themes with semantic roles. These existing colors are starting anchors, not a complete or contrast-certified token set:

| Role / intent | Light anchor | Dark anchor |
| --- | --- | --- |
| Primary action | `#205BCC` | `#8CB5FF` |
| On primary | `#FFFFFF` | `#10284D` |
| Background | `#F3F6FA` | `#0B1626` |
| Surface | `#FFFFFF` | `#14253B` |
| On surface | `#142742` | `#EFF5FD` |
| Secondary text | `#51637B` | `#ADC0D8` |
| Error | `#B4313E` | `#FF9BA8` |

Resolve primary/container/on-container, secondary, tertiary, outline, surface elevation, disabled, and inverse roles together before implementation. Add separate semantic success and caution roles; do not misuse Material `secondary` as “income”. Validate actual foreground/background pairs in both themes.

Dark mode uses tonal surfaces, not a blanket color inversion. Keep charts, dialogs, keyboard-facing forms, and status/navigation bars coherent. Retain the same information hierarchy in both themes. Use a stable branded palette initially; wallpaper-derived Dynamic Color is a separate product decision.

## 6. Typography, spacing, and shape

Use Android system typography through Paper's MD3 type roles, with complete Vietnamese diacritic support. No custom font dependency is needed for this direction.

| Content | Starting MD3 role |
| --- | --- |
| Primary money amount | Headline large, 32/40 |
| Screen title | Headline small, 24/32 |
| Section title | Title medium, 16/24 |
| Transaction title and body | Body large, 16/24 |
| Supporting date/context | Body medium, 14/20 |
| Buttons and controls | Label large, 14/20 |

Sizes are scalable type values, not fixed-height boxes. Use stronger weight selectively; avoid all-caps Vietnamese headings, tight tracking, or tiny monetary labels. Let enlarged text increase control and row height.

Use a 4 dp spacing foundation: 8 for related elements, 12 for list internals, 16 for phone gutters and grouped content, 24 for sections, and 32 for major separation. Dense content still requires 48 × 48 dp touch targets. Use Material component-specific shapes rather than one universal corner radius; moderate rounding for summaries, standard Material shapes for buttons, dialogs, and sheets.

## 7. Component conventions

| Pattern | Convention |
| --- | --- |
| App bar | Paper Appbar with screen title; contextual Back and at most a few relevant actions |
| Buttons | One primary filled action per task; tonal/outlined secondary actions; text actions for low emphasis |
| Entry form | Outlined Paper TextInput with persistent label, inline HelperText, and explicit VND unit; numeric keyboard is an aid, not validation |
| Transaction rows | Merchant/purpose first, category/date second, amount aligned consistently; status in words; entire row opens details |
| Filters | Chips for removable filters; segmented controls for short mutually exclusive choices |
| Budget | Labeled progress and exact amounts; state excess in text and preserve the true value even if the visual bar is capped |
| Advice | Observation → evidence and dates → optional action such as “Xem giao dịch”; no unexplained AI score |
| Dialogs | Reserved for consequential decisions; concrete labels such as “Xóa giao dịch” and “Hủy” |
| Feedback | Snackbar for transient success; persistent inline feedback for blocking errors; never announce a failed save as success |
| Charts | Simple labeled horizontal bars or period comparisons; accessible text summary; no 3D, decorative gauges, or color-only legends |

Use Paper icons consistently from one compatible Material icon family. Icons supplement Vietnamese labels. Wrap reusable conventions in `src/shared/`; screens consume the shared system rather than duplicating values.

## 8. States and trustworthy copy

- **First use:** “Chưa có giao dịch” with “Thêm giao dịch”. Do not seed fabricated expenses or require login for local entry.
- **Loading:** show scoped progress; never flash zero as if it were a loaded balance. Avoid blocking unrelated local tasks.
- **Offline:** “Bạn vẫn có thể ghi giao dịch trên thiết bị.” Explain cloud limitations next to affected actions.
- **Validation:** identify the field and remedy, for example “Nhập số tiền lớn hơn 0”. Preserve entered values after failure.
- **Review:** “Cần bạn kiểm tra” and “Xác nhận giao dịch”; unconfirmed results never look like completed ledger entries.
- **Consent:** keep notification capture, cloud AI submission, and ledger sync distinct. Clearly explain what is sent and when. Do not imply all financial data always stays on-device.
- **Advice:** prefer “Chi ăn uống tăng so với cùng kỳ. Xem các khoản thay đổi.” Avoid “Bạn tiêu hoang” or “Chắc chắn tiết kiệm 20%”.
- **Unavailable capability:** omit an unsupported action or explain why it is unavailable; never ship a tappable promise with no result.

Examples in this brief illustrate copy, not real user records or measured outcomes.

## 9. Accessibility and Android acceptance criteria

- Target WCAG 2.2 AA where applicable: at least 4.5:1 for normal text, 3:1 for large text, and 3:1 for meaningful control boundaries and graphics.
- Provide at least 48 × 48 dp interactive targets, with spacing that prevents accidental adjacent taps.
- Support TalkBack labels, roles, selection/expanded states, logical reading order, and error announcements. Read amounts as Vietnamese currency; exclude decorative icons from the accessibility tree.
- At up to 200% text scaling, preserve amounts, action labels, and form errors without clipping. Reflow rather than suppress font scaling.
- Support keyboard/Switch Access focus and visible focus states where applicable. Restore focus after modal dismissal.
- Respect Remove animations and reduced-motion preferences. Motion explains state changes; totals do not count up theatrically and surfaces do not animate perpetually.
- Test narrow and typical Android phones, light/dark themes, system Back, keyboard visibility, screen insets, large numbers, long Vietnamese merchant names, empty lists, and long transaction histories.
- Use Android device/emulator evidence for native acceptance. Browser screenshots do not establish Android usability or accessibility compliance.

## 10. Delivery boundaries and open decisions

This brief records the approved target direction, not a record of a completed design system. Preserve existing workflows when future implementation is requested. `../DESIGN.md` documents the current code baseline; where it differs, this brief governs the intended destination without implying that migration has happened.

Role 4 may work on route wrappers, screens excluding `FinanceProvider.tsx`, shared presentation components, and its documented integration scope. Do not change database models, AI parsing, auth/sync behavior, native capture, or other owners' contracts to make a design appear functional. Request required capabilities from the owning role.

Paper is installed but not yet integrated into the shared UI. Period comparisons, explainable advice, custom categories, dismissal persistence, and new appearance controls require capability checks before being promised as shipped behavior. Keep current category identifiers and budget semantics until their owners provide supported changes.

Approval covers the inherited blue identity, the four-destination navigation with a separate add action, and the financial hierarchy. Final role tokens, icons, and per-screen layouts should be resolved during implementation; advice rules and data contracts remain separate product/engineering decisions. Do not create a seed or begin implementation until the product owner requests it.
