---
name: Split View Judge Mode
overview: Add a "Split" view mode to judge-mode rounds that renders the FlowGrid and RoundAnalytics (Reason for Decision) side by side in a horizontal flex layout.
todos:
  - id: extend-viewmode
    content: Extend viewMode state to include 'split' and add conditional third tab button in RoundPage.tsx
    status: pending
  - id: split-layout
    content: Add split layout branch in RoundPage.tsx that renders FlowGrid + RoundAnalytics side by side
    status: pending
  - id: compact-prop
    content: Add compact prop to RoundAnalytics that renders only Reason for Decision in a vertical stack
    status: pending
isProject: false
---

# Split View for Judge Mode

## Current Architecture

- [RoundPage.tsx](client/src/pages/RoundPage.tsx) manages a `viewMode` state (`'flow' | 'analytics'`) that toggles between `FlowGrid` and `FlowAnalytics`/`RoundAnalytics`.
- `RoundAnalytics` (the "Reason for Decision" + feedback textareas) currently only renders when `viewMode === 'analytics'` **and** there are zero flows. It needs to render alongside the flow grid in split mode.
- `FlowGrid` uses a `ResizeObserver` on its container to compute row counts, so it will adapt to narrower widths automatically.

## Changes

### 1. Extend `viewMode` state in `RoundPage.tsx`

- Change the type from `'flow' | 'analytics'` to `'flow' | 'analytics' | 'split'`.
- Add a third tab button labeled "Split" (only visible when `tournament_type === 'judge'`).

### 2. Render split layout in `RoundPage.tsx`

When `viewMode === 'split'`, render a horizontal flex container with two panes:

```tsx
{viewMode === 'split' && id && (
  <div className="flex flex-1 overflow-hidden min-h-0">
    <div className="flex flex-col flex-1 min-w-0 border-r border-card-04">
      <FlowGrid grid={grid} />
    </div>
    <div className="flex flex-col w-[380px] shrink-0 min-h-0">
      <RoundAnalytics roundId={id} isJudgeMode compact />
    </div>
  </div>
)}
```

- Flow grid takes `flex-1` (majority of space).
- Decision notes panel gets a fixed width (`w-[380px]`) on the right, enough for comfortable typing without stealing too much flow real estate.

### 3. Add `compact` prop to `RoundAnalytics`

In [RoundAnalytics.tsx](client/src/components/RoundAnalytics.tsx):

- Accept a new optional `compact?: boolean` prop.
- When `compact` is true, render only the "Reason for Decision" textarea in a single vertical column (omit Aff/Neg feedback to save space). The judge can switch to the full Notes tab for detailed per-team feedback.
- Use `flex-col` layout instead of the current side-by-side `flex gap-6` layout.

### 4. Keep FlowTabs visible in split mode

The `FlowTabs` bar at the bottom of the main content area should remain visible in split mode so the judge can switch between flow tabs while viewing their decision notes.

## Files to Change

- [client/src/pages/RoundPage.tsx](client/src/pages/RoundPage.tsx) -- viewMode type, toggle buttons, split layout
- [client/src/components/RoundAnalytics.tsx](client/src/components/RoundAnalytics.tsx) -- compact prop and condensed render
