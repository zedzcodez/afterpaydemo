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

## Key Takeaways

1. **Afterpay SDK config structure matters:** Use nested `cashAppPayOptions`, not flat options/events.
2. **DOM must exist before SDK init:** Use `useEffect` + `requestAnimationFrame` to ensure React has committed DOM changes.
3. **Keep SDK DOM targets always-mounted in SPAs:** Use CSS visibility instead of conditional rendering to prevent stale DOM references.
4. **After `restartCashAppPay()`, call `renderCashAppPayButton()` before `initializeForCashAppPay()`:** Restart removes all UI; the button must be explicitly re-rendered.
5. **The SDK's restart/re-init is a 3-step process:** restart → renderButton → initialize.
