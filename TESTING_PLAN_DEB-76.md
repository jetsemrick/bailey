# Manual Testing Plan for DEB-76: Flow Tab Templates

## Prerequisites

1. Run the migration in Supabase SQL Editor:
   ```bash
   # Execute client/src/db/migrations/020_create_flow_tab_templates_table.sql
   ```

2. Ensure Supabase environment variables are set:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`

3. Start the dev server:
   ```bash
   cd client && npm run dev
   ```

## Test Scenarios

### 1. Built-in Templates

**Steps:**
1. Navigate to a round page
2. Click "Add Flow Tabs" button
3. Switch to "Templates" tab
4. Verify 4 built-in templates appear:
   - Standard NEG (T/DA/CP/K/Case)
   - Standard AFF (Case)
   - Full Round (CX + Case)
   - Multiple DAs
5. Select "Standard NEG (T/DA/CP/K/Case)"
6. Click "Apply Template"

**Expected:**
- 5 new tabs should be created: T, DA, CP, K, Case
- T, DA, CP, K should be initiated by NEG
- Case should be initiated by AFF
- All tabs should appear in the correct order

### 2. Custom Template - Save

**Steps:**
1. Click "Add Flow Tabs" button
2. Stay on "Manual" tab
3. Set "Number of Tabs" to 3
4. Select "Negative" as "Initiated By"
5. Click "Save as Template"
6. Enter name "My 3 NEG Args"
7. Click "Save"

**Expected:**
- Template should be saved
- Dialog should switch to "Templates" tab
- New template "My 3 NEG Args" should appear in the list
- Template should show "NEG 1, NEG 2, NEG 3" in preview

### 3. Custom Template - Apply

**Steps:**
1. Click "Add Flow Tabs" button
2. Switch to "Templates" tab
3. Select the custom template "My 3 NEG Args"
4. Click "Apply Template"

**Expected:**
- 3 new tabs should be created: NEG 1, NEG 2, NEG 3
- All should be initiated by NEG
- All should appear in the flow tabs list

### 4. Custom Template - Delete

**Steps:**
1. Click "Add Flow Tabs" button
2. Switch to "Templates" tab
3. Find the custom template "My 3 NEG Args"
4. Click the "✕" button on the template
5. Confirm deletion

**Expected:**
- Template should be removed from the list
- Built-in templates should remain

### 5. CX Uniqueness with Templates

**Steps:**
1. Create a round with no tabs
2. Click "Add Flow Tabs"
3. Apply "Full Round (CX + Case)" template

**Expected:**
- 2 tabs created: CX and Case
- CX tab should be marked as tab_kind: 'cx'

**Then:**
4. Click "Add Flow Tabs" again
5. Try to apply "Full Round (CX + Case)" template again

**Expected:**
- Alert should appear: "This template includes a CX tab, but this round already has one. Only one CX tab is allowed per round."
- No tabs should be created

### 6. Templates Across Tournaments

**Steps:**
1. In Tournament A, create a custom template "Tournament Setup"
2. Navigate to Tournament B (different tournament)
3. Click "Add Flow Tabs" > "Templates"

**Expected:**
- Custom template "Tournament Setup" should be available
- Templates are user-scoped, not tournament-scoped

### 7. Manual Mode Still Works

**Steps:**
1. Click "Add Flow Tabs"
2. Stay on "Manual" tab
3. Select "Standard" sheet type
4. Set "Number of Tabs" to 2
5. Select "Affirmative"
6. Click "Create 2 Tabs"

**Expected:**
- 2 tabs created: AFF 1, AFF 2
- Both initiated by AFF
- Original functionality unchanged

### 8. CX Manual Mode Still Works

**Steps:**
1. Click "Add Flow Tabs"
2. Select "CX" sheet type
3. Click "Create CX tab"

**Expected:**
- 1 CX tab created
- Position name: "CX"
- Initiated by: AFF
- Tab kind: 'cx'

## Edge Cases

### Empty Templates
- Cannot save a template with no tabs (manual mode requires at least 1 tab)

### Duplicate Names
- Constraint: `UNIQUE (user_id, name)`
- Attempting to save a template with an existing name should show database error

### Template with Mixed Sides
- Templates can contain a mix of AFF and NEG tabs
- Each tab remembers its own initiated_by side

## Automated Test Coverage

The following aspects are covered by automated tests:
- ✅ listFlowTabTemplates() returns templates for current user
- ✅ createFlowTabTemplate() creates with correct user_id
- ✅ updateFlowTabTemplate() updates name and tabs
- ✅ deleteFlowTabTemplate() removes template
- ✅ All 161 existing tests still pass
