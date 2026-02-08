# Cash App Pay - Fixes & Root Cause Analysis

This document tracks all significant bugs found and fixed during Cash App Pay integration, including root cause analysis, symptoms, and the final fix applied.

---

## Bug 1: `onCompleteCb is not a function`

**Commit:** `10b5232`
**Severity:** Critical (SDK fails to initialize)

### Symptoms
- Console error: `onCompleteCb is not a function`
- Cash App Pay button never renders
- Error thrown inside the Afterpay SDK during `initializeForCashAppPay()`

### Root Cause
The SDK config was using a **flat options structure** instead of the required **nested `cashAppPayOptions`** structure.

**Broken:**
```js
initializeForCashAppPay({
  countryCode: "US",
  token,
  options: { button, onComplete },  // WRONG: flat structure
  events: { ... },                   // WRONG: separate events
})
```

**Fixed:**
```js
initializeForCashAppPay({
  countryCode: "US",
  token,
  cashAppPayOptions: {              // CORRECT: nested under cashAppPayOptions
    button: { size, width, theme, shape },
    onComplete: (event) => {},
    eventListeners: { ... },
  },
})
```

### Fix
Restructured the config object to match the SDK's expected nested `cashAppPayOptions` format with `button`, `onComplete`, and `eventListeners` all inside `cashAppPayOptions`.

---

## Bug 2: `initializeCashAppPay ERROR {}` / `Cannot access 'n'`

**Commit:** `6942133`
**Severity:** Critical (SDK fails to initialize)

### Symptoms
- Console error: `initializeCashAppPay ERROR {}`
- Minified SDK error: `Cannot access 'n' before initialization`
- Cash App Pay button never renders
- Error occurs even with correct config structure (Bug 1 fix applied)

### Root Cause
**DOM timing issue.** The `#cash-app-pay` div was rendered conditionally (`{showPaymentButton && <div id="cash-app-pay" />}`), and `initializeForCashAppPay()` was called in the same React render cycle that set `showPaymentButton = true`. React hadn't committed the DOM update yet, so the SDK couldn't find its target element.

### Fix
Two-phase initialization pattern:
1. Set `showPaymentButton(true)` and `setPendingToken(token)` in the form handler
2. A `useEffect` watching `[pendingToken, showPaymentButton]` uses `requestAnimationFrame` to ensure the DOM is ready, then calls `initializeForCashAppPay()`

```js
// Phase 1: Form handler sets state
setShowPaymentButton(true);
setFormSubmitted(true);
setPendingToken(data.token);

// Phase 2: useEffect + rAF ensures DOM is ready
useEffect(() => {
  if (!pendingToken || !showPaymentButton) return;
  const frameId = requestAnimationFrame(() => {
    window.Afterpay.initializeForCashAppPay({ ... });
    setPendingToken(null);
  });
  return () => cancelAnimationFrame(frameId);
}, [pendingToken, showPaymentButton]);
```

---

## Bug 3: Cash App Pay button doesn't re-render after Edit -> Resubmit

**Commit:** _(pending)_
**Severity:** High (Edit flow broken)

### Symptoms
- First form submission: Cash App Pay button renders correctly
- Click "Edit" to return to form, then resubmit: button does NOT render
- The "Scan the QR code" text appears but no button below it
- No console errors on the second init
- SDK console warning: `pay.restart called while waiting for buyer authorization`
- `renderCashAppPayButton()` called manually only creates empty `<div></div>`

### Root Cause (Two-part)

**Part A: Stale DOM references.**
The `#cash-app-pay` div was conditionally rendered (`{showPaymentButton && ...}`). When the user clicked Edit, React unmounted the div. `restartCashAppPay()` couldn't clean up the SDK's elements because they were already removed from the DOM. On resubmit, a NEW div was created, but the SDK's internal state still referenced the old (removed) elements.

**Part B: Missing `renderCashAppPayButton()` call.**
Per the [SDK docs](https://developers.cash.app/cash-app-afterpay/guides/api-development/add-cash-app-pay-to-your-site/overview), after `restartCashAppPay()` removes all UI, the button must be explicitly re-created with `renderCashAppPayButton()` before calling `initializeForCashAppPay()` again. On first init, `initializeForCashAppPay()` handles both rendering and initialization. But after a restart, the button re-render is a separate step.

### Failed Fix Attempts
1. **Restart in click handlers (conditionally rendered div):** Called `restartCashAppPay()` in `handleEditClick()` — failed because React unmounted the div, making SDK DOM references stale.
2. **Restart before init in same rAF (conditionally rendered div):** Moved `restartCashAppPay()` into the useEffect right before `initializeForCashAppPay()` — failed because the SDK needs time between restart and init, and the div was still being recreated by React.
3. **Always-mounted div + restart in handlers (no renderCashAppPayButton):** Kept div in DOM via CSS visibility, called restart in Edit handler — restart properly cleaned the div, but `initializeForCashAppPay()` alone didn't re-render the button after restart.

### Fix (Two-part)

**Part A: Always-mounted `#cash-app-pay` div.**
Moved the `#cash-app-pay` div outside the conditional render block. It's always in the DOM but hidden with `display: none` when not active. This ensures the SDK's DOM target is stable across edit cycles and `restartCashAppPay()` can properly clean up.

```jsx
{/* Always mounted for SDK DOM stability */}
<div
  id="cash-app-pay"
  style={{ display: showPaymentButton && formSubmitted ? undefined : 'none' }}
/>
```

**Part B: `renderCashAppPayButton()` before re-init.**
Added `renderCashAppPayButton()` call in the SDK init `useEffect`, gated by `hasInitializedRef` so it only runs on re-init (not first init). This re-creates the button UI that `restartCashAppPay()` removed.

```js
// After restart cleared UI, re-render button before init
if (hasInitializedRef.current && window.Afterpay.renderCashAppPayButton) {
  window.Afterpay.renderCashAppPayButton({
    countryCode: "US",
    cashAppPayButtonOptions: {
      size: "medium", width: "full", theme: "dark", shape: "semiround",
    },
  });
}
window.Afterpay.initializeForCashAppPay({ ... });
hasInitializedRef.current = true;
```

### SDK Re-init Flow (Correct Pattern)
```
handleEditClick() → restartCashAppPay()  [clears auth + removes UI from always-mounted div]
                  → setShowPaymentButton(false)  [hides div via CSS]

handleContinueToPayment() → API call → setShowPaymentButton(true)  [shows div]
                          → setPendingToken(token)

useEffect[token] → rAF → renderCashAppPayButton()  [re-creates button UI]
                       → initializeForCashAppPay()  [initializes with new token]
```

---

## Bug 4: Tab switching destroys form state, breaks button re-render, shows wrong button style

**Commit:** `f45ec5f`
**Severity:** High (Tab switching breaks multiple flows)

### Symptoms (Three sub-bugs)

**Bug 4a — Form state lost on tab switch:**
- Fill in Cash App Pay form (email, name, address, shipping)
- Switch to Express Checkout tab, then switch back
- All form fields are empty — data is gone

**Bug 4b — Button doesn't render on second submit after tab switch:**
- Submit form → Cash App Pay button renders
- Switch to another tab, then switch back
- Form resets (Bug 4a), re-submit the form
- "Scan the QR code" text shows but no button appears

**Bug 4c — Wrong button style on re-render:**
- In certain re-render paths (edit → resubmit), the button renders as static-width instead of full-width dark theme

### Root Cause (Three-part)

**4a: Conditional rendering unmounts components.**
The checkout page (`app/checkout/page.tsx`) used a ternary to render only the active component:
```jsx
{method === "express" ? <CheckoutExpress/> : method === "standard" ? <CheckoutStandard/> : <CheckoutCashApp/>}
```
Switching tabs unmounts the inactive component, destroying ALL React `useState` values.

**4b: Per-instance `hasInitializedRef` vs global SDK singleton.**
`hasInitializedRef` was a `useRef(false)` that tracked whether `renderCashAppPayButton()` had been called. When the component unmounted (tab switch), the cleanup called `restartCashAppPay()` (which removes all UI). When remounted, the ref reset to `false`, but the guard `if (hasInitializedRef.current)` meant `renderCashAppPayButton()` was SKIPPED on first init of the new instance. However, the SDK had been restarted (by the previous unmount cleanup), so it needed the button to be explicitly rendered.

**4c: Inconsistent button options.**
Button style parameters (`size`, `width`, `theme`, `shape`) were duplicated as inline objects in multiple places — `renderCashAppPayButton()` and `initializeForCashAppPay()`. Different render paths could pass different values.

### Fix (Three-part)

**4a: Always-mounted components with CSS `display:none`.**
Replaced the ternary with always-mounted wrapper divs:
```jsx
<div style={{ display: method === "express" ? undefined : "none" }}>
  <CheckoutExpress isActive={method === "express"} />
</div>
<div style={{ display: method === "standard" ? undefined : "none" }}>
  <CheckoutStandard isActive={method === "standard"} />
</div>
<div style={{ display: method === "cashapp" ? undefined : "none" }}>
  <CheckoutCashApp isActive={method === "cashapp"} />
</div>
```
Components stay in the React tree, preserving all state.

**4b: Always call `renderCashAppPayButton()` before `initializeForCashAppPay()`.**
Removed the `hasInitializedRef.current` guard on `renderCashAppPayButton()`. Now it's always called before init — safe on both first init and re-init:
```js
// Always render button before init — SDK may have been restarted
if (window.Afterpay.renderCashAppPayButton) {
  window.Afterpay.renderCashAppPayButton({
    countryCode: "US",
    cashAppPayButtonOptions: CASH_APP_BUTTON_OPTIONS,
  });
}
window.Afterpay.initializeForCashAppPay({ ... });
```

Added `isActive` lifecycle effect: deactivation calls `restartCashAppPay()`, activation re-triggers SDK init with saved token via `savedTokenRef`.

**4c: Extracted `CASH_APP_BUTTON_OPTIONS` constant.**
```js
const CASH_APP_BUTTON_OPTIONS = {
  size: "medium" as const,
  width: "full" as const,
  theme: "dark" as const,
  shape: "semiround" as const,
};
```
Used in both `renderCashAppPayButton()` and `initializeForCashAppPay()` — guaranteed consistent.

### Additional Fixes in Same Commit

- **Express guard refs:** Added `hasInitializedPopupRef` and `lastShippingFlowRef` to prevent duplicate `initializeForPopup` calls on tab re-activation when config hasn't changed.
- **Shipping callback race:** Only pass `onShippingChange` to the active component to prevent hidden components from updating the sidebar.
- **Mobile/desktop messaging:** CSS responsive classes (`hidden md:inline` / `md:hidden`) instead of JS user-agent detection (avoids hydration mismatches).
- **Token reuse error handling:** If saved token fails on re-init (expired session), gracefully falls back to form with "session expired" message.

---

## Key Takeaways

1. **Afterpay SDK config structure matters:** Use nested `cashAppPayOptions`, not flat options/events.
2. **DOM must exist before SDK init:** Use `useEffect` + `requestAnimationFrame` to ensure React has committed DOM changes.
3. **Keep SDK DOM targets always-mounted in SPAs:** Use CSS visibility instead of conditional rendering to prevent stale DOM references.
4. **After `restartCashAppPay()`, call `renderCashAppPayButton()` before `initializeForCashAppPay()`:** Restart removes all UI; the button must be explicitly re-rendered.
5. **The SDK's restart/re-init is a 3-step process:** restart → renderButton → initialize.
6. **Use CSS `display:none` instead of conditional rendering for tab UIs with SDK state:** React conditional rendering destroys component state and disconnects the SDK from its DOM targets.
7. **Global SDK singletons need lifecycle management via props, not mount/unmount:** Use an `isActive` prop to control SDK state — restart on deactivation, re-init on activation.
8. **Extract SDK option constants:** Duplicated inline objects drift apart. A single constant ensures consistent button styles across all render/init paths.
9. **Use refs to read state in effects with minimal dependencies:** When an effect depends on `[isActive]` but needs current values of `formSubmitted`, `showPaymentButton`, etc., use refs to avoid stale closures without adding those values to the dependency array.
