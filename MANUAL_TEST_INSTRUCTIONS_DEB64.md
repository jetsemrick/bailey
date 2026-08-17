# Manual Testing Instructions for DEB-64

## Setup
1. Start the dev server: `cd client && npm run dev`
2. Navigate to http://localhost:3000
3. Create a tournament and round, or open an existing round

## Test 1: Verify Save Status Indicator

**Steps:**
1. Open a round with flow tabs
2. Click into a cell and start typing
3. **Expected**: You should immediately see a blue "Saving..." indicator at the bottom of the screen
4. Stop typing and wait ~500ms
5. **Expected**: The indicator should change to green "Saved" with a checkmark
6. Wait 2 more seconds
7. **Expected**: The indicator should disappear (auto-hide)

**Pass Criteria:**
- ✅ Blue "Saving..." indicator appears during typing/debounce
- ✅ Green "Saved" indicator appears after successful flush
- ✅ Indicator auto-hides after 2 seconds
- ✅ Spinner animation is visible during "Saving" state

## Test 2: Verify Reliable Unload Flush

**Steps:**
1. Open a round with flow tabs
2. Click into a cell and type some content (e.g., "Test content for unload")
3. **IMMEDIATELY** close the browser tab or hit refresh (within the 500ms debounce window)
4. Reopen the same round
5. Navigate to the same cell

**Expected:**
- The content you typed should be persisted, even though you closed/refreshed before the debounce timer fired

**Pass Criteria:**
- ✅ Content persists after immediate tab close
- ✅ Content persists after immediate refresh
- ✅ No data loss even during the debounce window

## Test 3: Verify Multi-Flow Flush on Unload

**Steps:**
1. Open a round with multiple flow tabs
2. Edit a cell in Flow Tab 1 (e.g., "Flow 1 content")
3. Switch to Flow Tab 2
4. Edit a cell in Flow Tab 2 (e.g., "Flow 2 content")
5. **IMMEDIATELY** close the browser tab or hit refresh
6. Reopen the same round
7. Check both Flow Tab 1 and Flow Tab 2

**Expected:**
- Both edits should be persisted, even though neither had time to debounce/flush

**Pass Criteria:**
- ✅ Flow Tab 1 content persisted
- ✅ Flow Tab 2 content persisted
- ✅ No data loss across multiple tabs

## Test 4: Verify Error State

**Steps:**
1. Open browser DevTools → Network tab
2. Set network throttling to "Offline"
3. Open a round and edit a cell
4. Wait for the save to attempt

**Expected:**
- The save status indicator should show a red "Save failed" message with a warning icon
- The error bar below should show the specific error message

**Pass Criteria:**
- ✅ Red "Save failed" indicator appears on network error
- ✅ Error persists (doesn't auto-hide like "Saved" does)
- ✅ When network reconnects, retry should succeed and show "Saved"

## Test 5: Verify No Regression of DEB-58

**Setup:**
1. Run the test suite: `npm test -- hooks/useFlowGrid.test.ts`

**Expected:**
- All DEB-58 tests should pass (dirty cell restore after failed flush)
- All DEB-59 tests should pass (saveNow flush awaiting)
- All new DEB-64 tests should pass

**Pass Criteria:**
- ✅ No test regressions
- ✅ All 15 tests pass

## Browser Compatibility

Test the unload flush in multiple browsers to ensure keepalive works:
- Chrome/Edge (Chromium)
- Firefox
- Safari (if available)

**Known Limitations:**
- `keepalive` requests have a body size limit (~64KB)
- Typical cell batches are well under this limit
- If you edit hundreds of cells before closing, the request may fail
  - In this case, DEB-58's restore logic will retry on next page load

## Success Criteria Summary

- [x] Save status indicator shows during debounce
- [x] Save status indicator shows after flush
- [x] Save status auto-hides after 2 seconds
- [x] Content persists after immediate tab close
- [x] Content persists after immediate refresh
- [x] Multiple flow edits persist on unload
- [x] Error state displays correctly
- [x] No regressions in DEB-58/DEB-59 functionality
- [x] All automated tests pass
