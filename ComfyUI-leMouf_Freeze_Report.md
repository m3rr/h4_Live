# 🐛 Bug Report: ComfyUI-leMouf Browser Freeze

**Severity**: Critical (Bricks Frontend)
**Component**: `web/lemouf_loop.js`
**Impact**: Causes immediate and total browser tab freeze upon loading ComfyUI.

## 🚨 Root Cause Analysis

The extension causes a **synchronous infinite loop** on the main thread due to a `MutationObserver` self-triggering via `textContent` modification.

### The Mechanism of Failure

1.  **Global Observer**: At line 1642, the extension registers a `MutationObserver` on `document.body` with `subtree: true` and `childList: true`. This means **ANY** node addition or removal anywhere in the ComfyUI interface triggers the callback.

    ```javascript
    // web/lemouf_loop.js:1642
    const toggleObserver = new MutationObserver(() => setupToggleControls());
    toggleObserver.observe(document.body, { childList: true, subtree: true });
    ```

2.  **The Trigger**: The callback `setupToggleControls` invokes `updateToggleUI`.

    ```javascript
    // web/lemouf_loop.js:1263
    const setupToggleControls = () => {
      if (!menuToggleItem) {
        // ... (creation logic) ...
      }
      updateToggleUI(); // <--- Always called on every mutation
    };
    ```

3.  **The Infinite Loop**: `updateToggleUI` modifies `menuToggleItem.textContent`.

    ```javascript
    // web/lemouf_loop.js:765
    const updateToggleUI = () => {
      // SETTING .textContent TRIGGERS 'childList' MUTATION!
      if (menuToggleItem) menuToggleItem.textContent = panelVisible ? "Hide leMouf Loop panel" : "Show leMouf Loop panel";
    };
    ```

### Why it Loops
Technically, setting `.textContent` removes all existing child nodes of an element and replaces them with a single new Text node. In the eyes of a `MutationObserver` watching `childList`, **this is a structural change** (Node Removal + Node Addition).

Since the observer is watching `document.body` with `subtree: true`, and the button is inside `document.body`, the observer fires again immediately. This creates a synchronous cycle:
`Mutation` → `Observer Callback` → `updateToggleUI` → `textContent Set` → `Mutation` → `...`

This consumes 100% CPU on the main thread, freezing the UI/Browser Tab instantly.

---

## 🛠️ Suggested Fixes

### Option 1: Disconnect During Update (Safest)
Stop observing momentarily while making changes.

```javascript
const updateToggleUI = () => {
    if (!menuToggleItem) return;
    // Disconnect to avoid self-trigger
    toggleObserver.disconnect();
    menuToggleItem.textContent = panelVisible ? "Hide leMouf Loop panel" : "Show leMouf Loop panel";
    // Reconnect immediately
    toggleObserver.observe(document.body, { childList: true, subtree: true });
};
```

### Option 2: Check Input Before Write (Efficient)
Only write to the DOM if the text actually changed.

```javascript
const updateToggleUI = () => {
    if (!menuToggleItem) return;
    const newText = panelVisible ? "Hide leMouf Loop panel" : "Show leMouf Loop panel";
    // Only write if different, prevents the loop from continuing indefinitely
    if (menuToggleItem.textContent !== newText) {
        menuToggleItem.textContent = newText;
    }
};
```

### Option 3: Target Specific Container (Architectural)
Instead of observing the entire `document.body`, observe only the ComfyUI menu container where the button lives. This reduces overhead significantly and prevents unrelated app changes (like progress bars) from triggering your UI logic.

```javascript
const menu = findMenuContainer();
if (menu) {
    toggleObserver.observe(menu, { childList: true }); // Observe only the menu
}
```

## 📋 Steps to Reproduce
1.  Install `ComfyUI-leMouf`.
2.  Refresh ComfyUI.
3.  Observe the browser tab becomes unresponsive immediately as the UI loads.
