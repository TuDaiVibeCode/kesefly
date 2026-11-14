# Kesefly — Product Context

## Product Overview

**Product Name:** Kesefly  
**Product Category:** Personal Expense Management  
**Primary Platform:** Android  
**Interface Language:** Vietnamese (vi-VN)  
**Default Currency:** Vietnamese Dong (VND)  
**Product Type:** Personal finance and household expense tracking application

## Product Purpose

Kesefly helps individuals understand, track, and manage their everyday spending.

The application enables users to record household expenses, monitor spending patterns, compare expenses across periods, and identify practical opportunities to save money.

Its primary value is not simply recording transactions, but helping users understand where their money goes, why their spending changes, and which expenses they may want to reconsider.

Kesefly provides clear, evidence-based observations and actionable suggestions while leaving all financial decisions to the user.

**Core promise: Understand your spending. Make more intentional decisions.**

Kesefly does not guarantee financial savings or provide regulated financial advice.

## Target Users

Kesefly serves everyday individuals and households who want better visibility into their personal and household expenses.

Typical expenses include:

- Housing, rent, and maintenance.
- Electricity, water, internet, and other utilities.
- Groceries, food, and daily necessities.
- Transportation and commuting.
- Shopping, entertainment, and other discretionary purchases.
- Recurring household services and subscriptions.

### User Characteristics

- May have limited financial management experience.
- Prefer quick and straightforward expense recording.
- Want to understand spending without analyzing spreadsheets.
- May have inconsistent or limited internet connectivity.
- Prefer clear explanations rather than unexplained financial recommendations.
- Want control over their financial data and privacy.

## Core User Jobs

1. Record everyday expenses quickly and accurately.
2. Understand total spending within a selected period.
3. Identify which categories consume the most money.
4. Compare spending with previous periods.
5. Recognize recurring expenses and unusual changes.
6. Discover practical ways to reduce unnecessary spending.
7. Maintain financial awareness without feeling judged or pressured.

## Product Value

Kesefly turns transaction records into understandable financial information.

The application should help users answer five questions:

- How much have I spent?
- Where did my money go?
- What changed compared with the previous period?
- Which changes are worth paying attention to?
- What practical action could I take?

## Product Scope

### MVP — Core Capabilities

The following capabilities define the intended first product release. They are target requirements, not claims that implementation is already complete.

**1. Expense Management**

- Create, view, edit, and delete expense transactions.
- Record amount, date, category, and optional description.
- Support Vietnamese date and currency formatting.
- Organize transactions by date and category.
- Provide clear confirmation for destructive actions.

**2. Expense Categories**

- Provide common household and personal expense categories.
- Allow users to organize and customize categories.
- Support category-level spending summaries.
- Preserve user-defined category assignments.

**3. Spending Overview**

- Display total spending for the selected period.
- Present category-level spending distribution.
- Show recent transactions.
- Provide a clear monthly spending overview.
- Distinguish recorded data from estimates or incomplete information.

**4. Period Comparison**

- Compare spending across different periods.
- Initially prioritize month-over-month comparisons.
- Compare equivalent time ranges whenever periods are incomplete.
- Display both absolute changes and percentage changes.
- Identify categories with significant spending changes.
- Clearly indicate the dates and data coverage used in each comparison.

**5. Budget Management**

- Allow users to define monthly spending budgets.
- Display actual spending against the configured budget.
- Identify approaching or exceeded budgets.
- Avoid treating every budget overrun as evidence of irresponsible spending.

**6. Spending Insights and Saving Suggestions**

Provide understandable observations and practical suggestions based on recorded expenses.

Examples of possible insight types:

- A category has increased compared with an equivalent previous period.
- A recurring payment may deserve review.
- A particular category accounts for a significant proportion of expenses.
- Spending is approaching a user-defined budget.
- A spending pattern has changed noticeably.

Every insight must explain:

- What was observed.
- Which records or categories support the observation.
- Which comparison period was used.
- Why the observation may matter.
- What practical action the user could consider.

Suggestions must remain optional and non-judgmental.

### Future Capabilities

These features are potential extensions and must not be treated as committed MVP requirements:

- AI-assisted transaction extraction from selected text or receipt images.
- Recurring payment detection and management.
- Personalized saving recommendations.
- Optional notifications and payment reminders.
- More sophisticated spending pattern analysis.
- Cheaper service comparisons.
- Expanded currency and language support.
- iOS and web platform support.

## Product Intelligence and AI Boundaries

AI-assisted transaction extraction and financial insights are separate capabilities.

**Transaction Extraction**

- AI may extract transaction information from explicitly selected text or images.
- Extracted results must remain drafts until reviewed and confirmed by the user.
- Unconfirmed drafts must never affect spending totals.
- AI processing requires explicit consent when data is transmitted to cloud services.

**Spending Insights**

- The first iteration should prioritize explainable calculations and deterministic rules.
- AI may later help summarize observations or formulate suggestions.
- AI must not be treated as the source of truth for financial calculations.
- AI must not independently classify every discretionary expense as unnecessary.
- Users must be able to correct incorrect classifications or judgments.
- Recommendations must not invent transactions, prices, savings, or financial outcomes.

## Platform and Technical Direction

### Frontend

- React Native with TypeScript.
- Expo as the development platform.
- Expo Router for navigation, assuming the existing scaffold uses Expo.
- React Native Paper as the primary UI component library.
- Material Design 3 as the application-wide design system.
- Android is the primary implementation and testing target.
- iOS and web compatibility should not compromise Android priorities.

### Local Data

- Expo SQLite provides local transaction storage.
- Core expense recording and viewing must work offline.
- Local data remains available without requiring account registration.
- Data operations must be separated from UI components through repository and service layers.

### Backend

Firebase is the primary cloud backend.

Planned services:

- Firebase Authentication for optional user accounts.
- Cloud Firestore for synchronized user data.
- Firebase Cloud Functions for trusted backend operations.
- Firebase Storage only when user-approved file uploads are required.
- Firebase Security Rules for user-level data access restrictions.

Cloud synchronization requires explicit user consent.

Local changes should be queued and synchronized safely when connectivity is available.

Firebase credentials and third-party API secrets must never be embedded as private secrets in the mobile application.

### Proposed Data Ownership

Each user's cloud records must be isolated by authenticated user identity.

A signed-out user must retain access to their local-only experience.

Account registration and synchronization are cloud capabilities, not prerequisites for basic expense tracking.

The synchronization conflict policy, backup behavior, and account deletion flow remain technical decisions to finalize before release.

## Product Principles

**1. Clarity over Complexity**

Financial information should be understandable without requiring specialist knowledge.

**2. Evidence over Assumptions**

All spending observations must be derived from actual recorded data.

**3. Actionability over Information Overload**

Prioritize a small number of useful observations instead of overwhelming users with statistics.

**4. Personal Priorities over Generic Financial Rules**

What is necessary or optional depends on the user's circumstances and preferences.

**5. User Control and Consent**

Users control their entries, categories, data sharing, and synchronization preferences.

**6. Privacy by Design**

Keep everyday expense operations local whenever possible. Clearly explain what is transmitted to cloud services and why.

**7. Honest Financial Communication**

Distinguish recorded spending, calculated comparisons, suggested actions, and demonstrated savings.

## UX and Communication Principles

- Use friendly, clear, and reassuring Vietnamese.
- Avoid judgmental language such as irresponsible, wasteful, or bad spending.
- Prioritize important financial information through visual hierarchy.
- Explain percentages alongside absolute VND amounts.
- Never rely exclusively on color to convey financial meaning.
- Label incomplete periods and insufficient data explicitly.
- Provide understandable empty, loading, error, and offline states.
- Keep transaction entry fast and predictable.

## Non-Goals

The initial product is not intended to:

- Process payments or transfer money.
- Replace banking applications.
- Provide investment, lending, or regulated financial advice.
- Automatically cancel subscriptions or household services.
- Guarantee savings or financial returns.
- Require users to connect bank accounts.
- Automatically upload notification content or personal financial records without consent.
- Become a comprehensive accounting or business finance platform.

## Current Repository Status

The current project is at an early initialization stage.

The repository contains an initial React Native scaffold and project documentation. A complete application interface, Firebase integration, local database implementation, and financial insight engine are not yet verified as implemented.

All product capabilities listed above should therefore be considered planned requirements until their implementation and verification are documented.

No user research, validated customer interviews, or measured savings outcomes have been supplied.

Future documentation must distinguish:

- Planned functionality.
- Implemented functionality.
- Tested functionality.
- Released functionality.
- Measured user outcomes.

## Success Indicators

Product success should be evaluated through measurable user behavior and feedback.

Potential indicators include:

- Users successfully recording their expenses.
- Users returning to review their spending.
- Users using period comparison features.
- Users understanding the explanations behind spending insights.
- Users finding recommendations relevant and actionable.
- Users correcting or dismissing inaccurate suggestions.
- Users maintaining control over their data and privacy.

Actual savings should only be reported when supported by verified user outcomes. No savings target or guaranteed percentage should be advertised without evidence.

## Open Product Decisions

- Whether comparisons should support weekly, monthly, quarterly, and custom periods.
- How incomplete periods and missing records should be handled.
- How recurring household payments should be detected and corrected.
- Which criteria qualify as a meaningful spending change.
- How users define necessary and discretionary expenses.
- Whether recommendations should be deterministic, AI-assisted, or hybrid.
- Whether cheaper-service comparisons belong in the product.
- Whether payment reminders should be included.
- Whether account registration is necessary for all cloud capabilities.
- How synchronization conflicts, backups, exports, and account deletion should work.
- Whether Android bank-notification capture will be supported in a later release.
