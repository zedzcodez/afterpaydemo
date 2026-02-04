# Developer Panel Resize Fix - All Pages

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Fix the Developer Panel resize functionality so it works on ALL pages, not just the Admin Panel.

**Architecture:** Move `FlowLogsDevPanel` outside constrained `max-w-*` containers on checkout pages. The panel uses `position: fixed` but the parent container's max-width constraint interferes with mouse event capture and z-index stacking. The fix mirrors the Admin page structure where the panel is rendered outside the constrained content wrapper.

**Tech Stack:** Next.js, React, Tailwind CSS

---

## Root Cause

The `FlowLogsDevPanel` is rendered **inside** `max-w-3xl` containers on checkout pages, but **outside** on the Admin page. This causes the resize handle to not receive mouse events properly on checkout pages.

**Working (Admin):**
```jsx
<div className="min-h-screen pb-72">
  <div className="max-w-4xl mx-auto">
    {/* content */}
  </div>
  <FlowLogsDevPanel />  {/* Outside constrained container */}
</div>
```

**Broken (Checkout pages):**
```jsx
<div className="max-w-3xl mx-auto pb-72">
  {/* content */}
  <FlowLogsDevPanel />  {/* Inside constrained container */}
</div>
```

---

## Task 1: Fix Shipping Page

**Files:**
- Modify: `app/checkout/shipping/page.tsx`

**Step 1: Update the page structure**

Change the wrapper structure to render `FlowLogsDevPanel` outside the constrained container.

Find this structure (around line 349-526):
```jsx
<div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8 pb-72">
  {/* ... all content ... */}
  <FlowLogsDevPanel />
</div>
```

Replace with:
```jsx
<div className="min-h-screen pb-72">
  <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
    {/* ... all content (everything except FlowLogsDevPanel) ... */}
  </div>
  <FlowLogsDevPanel />
</div>
```

**Step 2: Verify the change**

Run: `npm run dev`
- Navigate to checkout with deferred shipping flow
- Verify the Developer Panel resize handle is draggable
- Verify the panel height changes when dragging
- Verify height persists after page refresh

**Step 3: Commit**

```bash
git add app/checkout/shipping/page.tsx
git commit -m "fix: move FlowLogsDevPanel outside constrained container on shipping page"
```

---

## Task 2: Fix Review Page

**Files:**
- Modify: `app/checkout/review/page.tsx`

**Step 1: Update the page structure**

Find this structure (around line 193-318):
```jsx
<div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8 pb-72">
  {/* ... all content ... */}
  <FlowLogsDevPanel />
</div>
```

Replace with:
```jsx
<div className="min-h-screen pb-72">
  <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
    {/* ... all content (everything except FlowLogsDevPanel) ... */}
  </div>
  <FlowLogsDevPanel />
</div>
```

**Step 2: Verify the change**

Run: `npm run dev`
- Navigate to checkout review page (standard redirect flow)
- Verify the Developer Panel resize handle is draggable
- Verify the panel height changes when dragging

**Step 3: Commit**

```bash
git add app/checkout/review/page.tsx
git commit -m "fix: move FlowLogsDevPanel outside constrained container on review page"
```

---

## Task 3: Verify All Pages

**Step 1: Test all pages with Developer Panel**

Test each page:
1. **Admin Panel** (`/admin`) - Should already work
2. **Shipping Page** (`/checkout/shipping?token=...&flow=deferred`) - Should now work
3. **Review Page** (`/checkout/review?token=...`) - Should now work

For each page:
- Hover over top edge of Developer Panel - cursor should change to `ns-resize`
- Drag up/down - panel height should change smoothly
- Release - height should stay at new size
- Refresh page - height should persist (localStorage)

**Step 2: Final commit**

```bash
git add -A
git commit -m "fix: Developer Panel resize now works on all pages

- Moved FlowLogsDevPanel outside max-w-* containers
- Consistent structure with Admin page
- Resize handle now receives mouse events on all pages"
```

---

## Verification Checklist

- [ ] Shipping page: resize handle is draggable
- [ ] Review page: resize handle is draggable
- [ ] Admin page: still works (regression check)
- [ ] Height persists to localStorage on all pages
- [ ] No visual layout regressions
