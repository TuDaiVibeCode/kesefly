# Kesefly — Android Dashboard Design Brief

**Status:** Proposed screen brief for owner confirmation. Planning only; no implementation.

**Target:** `/` → `src/features/DashboardScreen.tsx`. **Mode:** Operate. **Authority:** `PRODUCT.md` defines product purpose; `DESIGN.md` defines all visual decisions. This brief inherits that specification without modifying it.

## Job and outcome

Help an everyday user understand this month's recorded spending, see how it compares with the previous period, find the largest expense categories, and record the next transaction. The screen should answer “Đã chi bao nhiêu?” before asking the user to interpret charts.

Success: the user can identify the selected period, total confirmed expenses, comparison dates, and the add action at a glance. Every amount remains traceable to recorded transactions. No fabricated savings advice, balances, or sample records appear in production.

## Composition and first viewport

Use a single vertical flow with 16 dp horizontal gutters. The focal point is the monthly expense amount, not a decorative brand panel. One neutral summary surface groups the related financial context; category and transaction sections are flat, separated by spacing rather than individual cards.

At a typical Android phone width and default text size, the first viewport should contain the app bar, period selector, complete spending summary, comparison, and the beginning of the category section. The persistent add action remains reachable. At large font sizes, allow scrolling rather than compressing amounts or hiding dates.

```text
Tổng quan                                  App bar

‹              Tháng 11, 2026             › Period selector

┌ Neutral summary surface ─────────────────┐
│ Đã chi trong tháng                       │
│ [Full expense amount in VND]             │
│ Từ [start date] đến [end date]            │
│                                          │
│ Thu nhập             Chênh lệch thu − chi │
│ [amount]             [amount]            │
│                                          │
│ So với cùng kỳ tháng trước               │
│ [Tăng/Giảm + difference + percentage]     │
│ [Both exact date ranges]                 │
└──────────────────────────────────────────┘

[Compact budget or pending-review context, if relevant]

Chi tiêu theo danh mục
[Category label]                 [VND / %]
[Proportional horizontal bar]
[Remaining category rows]

Giao dịch gần đây                  Xem tất cả
[Name and category/date]          [Chi/Thu, amount]
[Up to five confirmed entries]

                         [+ Thêm giao dịch]
[Existing application navigation]
```

This is a structural schematic, not a pixel-accurate mockup. Bracketed fields describe live data slots, not UI placeholder copy. No screenshots or native render validation are claimed.

## Financial hierarchy

1. **Context:** title “Tổng quan”; month/year selector with previous/next controls, minimum 48 dp targets. Default to the current month. Announce the selected month to TalkBack. Changing month updates every dashboard section together.
2. **Primary:** “Đã chi trong tháng”, using `headlineLarge` 32/40, regular Roboto and full VND formatting. Use `onSurface`/`expense`, not brand blue or error red. State the covered dates and that totals use confirmed records.
3. **Secondary:** income and “Chênh lệch thu − chi” in two aligned columns, stacking when labels or values no longer fit. Never call the latter “Số dư”. Labels use body-medium; values use title-large where space permits.
4. **Comparison:** place directly under the summary values, within the same grouping. Show “Tăng”, “Giảm”, or “Không đổi”, absolute VND difference, percentage when valid, and both date ranges. Neutral wording; a decrease does not prove savings.
5. **Detail:** category breakdown, then recent transactions. Section headings use title-medium. No equal-weight KPI tiles or donut chart competing with the amount.

Only confirmed, non-deleted entries contribute. Categories use expense entries only. Formatting follows `DESIGN.md`: `vi-VN`, VND, no fractional digits. Preserve all digits for large amounts; stack or reflow rather than use ellipses.

## Period comparison rules

- Completed months compare with the complete previous month, with both periods labeled.
- An ongoing month compares matching elapsed calendar days. If the previous month is shorter, use the common available day count for both comparison windows. Keep the main summary's selected-month total separate and label any shorter comparison window explicitly.
- Percent change is `(current − previous) / previous × 100`, rounded to one decimal at most using Vietnamese formatting. Show the exact absolute difference alongside it.
- A zero baseline is not an infinite change. Show “Kỳ trước ghi nhận 0 ₫” and the absolute difference, without a percentage, only when the baseline is known. With insufficient history, use “Chưa đủ dữ liệu để so sánh”.
- Records alone do not establish complete coverage. Use “Theo giao dịch đã ghi nhận”; do not assert that unrecorded days had no spending. Distinguishing known zero from missing history requires an explicit data-coverage contract.
- Future periods and unavailable comparison data show an explanatory state, not a trend. Late entries update the calculation; do not describe recorded-to-date totals as a verified complete financial history.

## Category spending breakdown

Use labeled horizontal bars, with absolute VND amounts and shares of the selected period's expenses. All bars start at zero and use the same denominator. Labels and amounts remain readable without interpreting color.

Show at most five rows: when aggregation is needed, show the four largest non-Other categories and one combined “Khác” row containing the existing Other category plus the remaining categories. Otherwise show each nonzero category. Never show two different “Khác” rows. Shares derive from unrounded values; disclose rounding if displayed shares do not sum exactly to 100%.

Use the approved chart series-1 role for this single-series chart: `#2563EB` in light and `#60A5FA` in dark. This chart override does not change the button color. Tracks use the approved neutral surface ladder. Do not assign a new color to every category or map rank to a moral judgment.

Category rows are informational in this first brief. Do not imply a tappable filter until the destination can accept category and period parameters. Screen-reader summaries expose category, amount, and share; decorative bars should not duplicate the announcement.

## Recent transactions and primary action

Show up to five confirmed, non-deleted transactions in the selected month, latest transaction date first, with stable ID ordering for ties. Use flat rows: merchant/title, category and date, then right-aligned amount with explicit “Chi” or “Thu”. Long names may wrap; monetary values must remain complete. Each row opens the existing `/transaction/[id]` route.

“Xem tất cả” opens `/transactions`. Until that screen supports month filtering, do not imply that the selected-month filter carries over. Returning to the dashboard preserves the selected month and scroll context.

Use one Paper extended FAB: MDI `plus`, label **Thêm giao dịch**, `primary` `#2563EB` fill and `onPrimary` `#FFFFFF` icon/text in both themes. Place it above existing bottom navigation and system insets, aligned trailing with a 16 dp margin. Reserve enough scroll-bottom space so the last transaction remains reachable. At large text sizes, allow an accessible compact FAB if the full label cannot fit; keep the Vietnamese accessibility label.

Open `/add`; do not implement the form in this task. Avoid a second filled add button competing with the FAB. Existing shell navigation is a dependency, not permission to redesign unrelated routes.

## Light and dark behavior

| Element | Light | Dark |
| --- | --- | --- |
| Screen | `background` / `#FFFFFF` | `background` / `#0B0F14` |
| Summary grouping | `surface1` / `#F8FAFC` | `surface1` / `#151C26` |
| Main text | `onSurface` / `#111827` | `onSurface` / `#E5E7EB` |
| Supporting text | `onSurfaceVariant` / `#475569` | `onSurfaceVariant` / `#C1CAD6` |
| Add FAB | `#2563EB` / white | `#2563EB` / white |
| Category series | Approved chart series 1 | Approved dark chart series 1 |

Use existing approved tokens, not literal colors in future screen code. Keep identical order, amounts, interactions, and selected month across themes. Apply the 16 dp summary radius, 4 dp spacing grid, Roboto roles, and one MDI icon family. No full blue summary panel, gradients, glass, or heavy shadows.

Use high-contrast paired container roles for selected controls. Check standalone blue text against its actual dark surface; if it fails, use an approved neutral text role or a paired tonal control rather than inventing a lighter brand primary. The fixed blue/white primary-action invariant remains unchanged.

## Supporting states and preservation

| State | Dashboard treatment |
| --- | --- |
| First use / no selected-month entries | “Chưa có giao dịch trong tháng này”; explain manual offline entry. Keep add FAB. No fabricated bars or comparison. |
| Income only | Loaded expense total is 0 ₫; explain there are no recorded expenses. Still show actual recent income entries. |
| Loading | Preserve section geometry; scoped loading indicator and “Đang tải tổng quan…”. Do not flash loaded-looking zeros. |
| Failure | Inline error with a retry only if supported. Preserve known data and identify stale/unavailable sections. |
| Offline | Local totals and add action remain usable. Do not invent network state if the provider cannot report it. |
| Pending review | Compact “Có [count] giao dịch cần duyệt” linking to `/transactions`; drafts remain outside totals. Keep queue counts separate. |
| Budget set | Compact textual current-period budget context with explicit amounts; no new KPI card. Existing budget is one reusable local limit, not historical monthly snapshots. |
| No budget | Quiet route link to `/budget`; never present an absent limit as zero. |
| Large data | Test 0, 1, and many entries; 1–7 categories; long Vietnamese names; very large supported amounts; zero and absent comparison baselines. |

Do not remove current review access, budget access, or privacy/consent information merely to simplify layout. Existing disclosures may collapse into a clearly labeled accessible explanation within the dashboard; their factual content and consent behavior remain intact.

## Scope, dependencies, and acceptance

This brief changes only dashboard planning. Do not edit `PRODUCT.md`, `DESIGN.md`, native modules, databases, AI parsing, auth/sync, `FinanceProvider.tsx`, or unrelated screens. Role 4 can later consume exposed data through existing interfaces; data-contract changes belong to their owners.

Current code has monthly totals, category bars, budget context, and review/queue access. Period comparison and recent-transaction presentation are proposed additions. Data coverage, retained selection across route changes, and filtered transaction navigation must be checked before implementation. No new service recommendations, advice engine, custom categories, or appearance-settings screen is authorized here.

For future native acceptance: inspect typical and narrow Android phones in both themes, 200% text scaling, TalkBack reading order, 48 dp targets, Back behavior, and FAB overlap. Verify comparisons against actual records and explicit date-window fixtures. Browser previews cannot prove native behavior.

**Confirmation requested:** spending-first summary → inline comparison → category bars → recent transactions, with one fixed blue/white add FAB. Shape stops at this brief; implementation requires the owner's next instruction.
