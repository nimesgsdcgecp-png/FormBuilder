# Testing Guide: Frontend Validation & View Gaps Implementation

This guide covers manual testing for all 6 features implemented in this session.

---

## Prerequisites

1. **Start the backend server:**
   ```bash
   cd formbuilder-backend1
   mvn spring-boot:run
   ```

2. **Start the frontend dev server:**
   ```bash
   cd formbuilder-frontend1
   npm run dev
   ```

3. **Access the application:** http://localhost:3000

4. **Login credentials:** Use your admin account (e.g., `admin` / `password123`)

---

## Test 1: CSV Formula Injection Protection

### Objective
Verify that exported data sanitizes formula indicators (`=`, `+`, `-`, `@`, `#`, `!`) to prevent spreadsheet formula injection attacks.

### Steps

1. **Create a form with test data:**
   - Go to `/builder`
   - Create a new form with a TEXT field
   - Publish the form

2. **Submit test responses with formula indicators:**
   - Open the public form link (`/f/{token}`)
   - Submit responses containing:
     - `=1+1`
     - `+cmd|'/c calc'!A0`
     - `-2+3`
     - `@SUM(1+1)`
     - `#NAME?`
     - `!ERROR`

3. **Export and verify:**
   - Go to the responses page (`/forms/{id}/responses`)
   - Click **Export → CSV**
   - Open the CSV in a text editor (NOT Excel yet)
   - **Expected:** Values should be prefixed with `'` like `'=1+1`

4. **Verify in Excel:**
   - Open the CSV in Excel
   - **Expected:** Values display as text, NOT as formulas

5. **Repeat for XLSX and PDF exports:**
   - Export as XLSX → Open in Excel → Should show text, not formulas
   - Export as PDF → Open → Should show escaped values

### Pass Criteria
- [ ] CSV export prefixes formula indicators with `'`
- [ ] XLSX export shows text, not executed formulas
- [ ] PDF export shows escaped values
- [ ] No formula execution in any export format

---

## Test 2: Form Code Immutability UI Enforcement

### Objective
Verify that form codes cannot be changed after saving, and validation prevents invalid codes.

### Steps

1. **Test code format validation:**
   - Go to `/builder` (new form)
   - Look for the "Form Code identifier" field in the header
   - Try entering:
     - `MyForm` → Should auto-convert to `myform`
     - `test form` → Should auto-convert to `test_form`
     - `123test` → Should show error (must start with letter)
     - `select` → Should show error (reserved SQL keyword)
     - Valid: `my_form_2024` → Should show green checkmark

2. **Test code immutability after save:**
   - Enter a valid code like `test_form_code`
   - Add a field and save the form as DRAFT
   - **Expected:** Code field should still be editable (not published yet)
   - Publish the form
   - **Expected:** 
     - Code field becomes disabled (grayed out)
     - Lock icon appears next to the code
     - Helper text: "Code is locked after publishing"

3. **Test editing existing published form:**
   - Go to Dashboard → Click on a published form
   - **Expected:** Code field is locked and cannot be edited

### Pass Criteria
- [ ] Code auto-converts to lowercase with underscores
- [ ] Invalid codes show error messages
- [ ] Reserved keywords (SELECT, INSERT, etc.) are blocked
- [ ] Code is editable before publish
- [ ] Code is locked after publish with lock icon
- [ ] Helper text explains immutability

---

## Test 3: Field Type Immutability UI Enforcement

### Objective
Verify that field types display as locked for persisted fields.

### Steps

1. **Create a new form with fields:**
   - Go to `/builder`
   - Add a TEXT field
   - Add a NUMERIC field
   - Add a DROPDOWN field
   - **Notice:** No lock icons yet (fields are new, not saved)

2. **Save the form:**
   - Save as DRAFT
   - Select any field

3. **Verify lock indicators:**
   - **Expected in Properties Panel:**
     - "Type Locked" badge appears next to field type
     - Text: "Field type cannot be changed after saving"
     - Column name is displayed (e.g., `Column: first_name`)

4. **Add a new field after save:**
   - Drag a new RATING field to canvas
   - Select it
   - **Expected:** No lock icon (field is new, not yet persisted)

5. **Save again and verify:**
   - Save the form
   - Select the RATING field
   - **Expected:** Lock icon now appears

### Pass Criteria
- [ ] New (unsaved) fields show no lock
- [ ] Saved fields show "Type Locked" badge
- [ ] Column name is displayed in Properties Panel
- [ ] Lock icon appears for all persisted fields

---

## Test 4: Expression Validation & Error Display

### Objective
Verify that custom validation expressions are validated in real-time with field reference checking.

### Steps

1. **Create a form with fields:**
   - Create a form with:
     - NUMERIC field: "Age" (column: `age`)
     - NUMERIC field: "Salary" (column: `salary`)
     - TEXT field: "Name" (column: `name`)

2. **Go to Validations tab:**
   - Click the "Custom Validations" tab in builder

3. **Add a valid expression:**
   - Click "Add Rule"
   - Enter expression: `age >= 18`
   - **Expected:**
     - Green border on input
     - Green checkmark icon
     - Green badge showing `age` as referenced field

4. **Test invalid field reference:**
   - Change expression to: `age >= 18 && invalid_field > 0`
   - **Expected:**
     - Amber/yellow border
     - Warning: `Unknown field: "invalid_field"`
     - `age` shown in green badge, `invalid_field` in red badge

5. **Test syntax errors:**
   - Enter: `age >= `
   - **Expected:**
     - Red border
     - Error: "Expression cannot end with an operator"

6. **Test complex valid expression:**
   - Enter: `salary > 50000 && age < 65`
   - **Expected:**
     - Green border
     - Both `salary` and `age` shown as valid references

7. **Test parentheses:**
   - Enter: `(age >= 18 && age <= 65`
   - **Expected:** Error about unmatched parentheses

### Pass Criteria
- [ ] Valid expressions show green border + checkmark
- [ ] Unknown fields show amber warning with field name
- [ ] Syntax errors show red border + error message
- [ ] Referenced fields displayed as colored badges
- [ ] Complex expressions validate correctly

---

## Test 5: File Upload Client-Side Validation

### Objective
Verify that file uploads validate size (5MB) and type before uploading.

### Steps

1. **Create a form with FILE field:**
   - Add a FILE field to a form
   - Publish and open the public form

2. **Test file size limit:**
   - Try uploading a file > 5MB
   - **Expected:**
     - Error toast: "File size exceeds 5MB limit (X.XXmb)"
     - File is NOT uploaded
     - Input is cleared

3. **Test allowed file types:**
   - Upload a `.pdf` file → Should succeed
   - Upload a `.jpg` image → Should succeed
   - Upload a `.docx` file → Should succeed
   - Upload a `.xlsx` file → Should succeed

4. **Test disallowed file types:**
   - Try uploading a `.exe` file
   - **Expected:** Error toast about file type not allowed
   - Try uploading a `.php` file
   - **Expected:** Error toast about file type not allowed

5. **Verify help text:**
   - Look at file upload area
   - **Expected:** Text says "PDF, Images, Word, Excel up to 5MB"

### Pass Criteria
- [ ] Files > 5MB are rejected with size in error message
- [ ] PDF, JPG, PNG, GIF, DOC, DOCX, XLS, XLSX, TXT, CSV allowed
- [ ] EXE, PHP, and other dangerous types rejected
- [ ] Error shown BEFORE upload attempt (client-side)
- [ ] Help text shows correct limits

---

## Test 6: Runtime Form Version Mismatch Detection

### Objective
Verify that users are warned when the form version changes while they're filling it out.

### Steps

1. **Setup:**
   - Create and publish a form (Version 1)
   - Open the public form in Browser Tab A

2. **Make a version change:**
   - In Browser Tab B, go to the builder
   - Make a change (add a field)
   - Save and publish (creates Version 2)
   - Activate Version 2

3. **Wait and observe Tab A:**
   - Wait 30-60 seconds (initial check after 30s)
   - **Expected:**
     - Yellow warning banner appears at top
     - Toast notification: "This form has been updated..."
     - Banner text explains submission will use older version
     - "Reload" button available

4. **Test Reload button:**
   - Click "Reload"
   - **Expected:** Page reloads with new version

5. **Test submission with old version:**
   - Instead of reloading, fill out the form
   - Submit
   - **Expected:** Submission succeeds (uses original version)

6. **Verify backend version mismatch handling:**
   - If you manually change `formVersionId` in payload:
   - **Expected:** Backend returns `VERSION_MISMATCH` error

### Pass Criteria
- [ ] Warning banner appears within 60 seconds of version change
- [ ] Toast notification shown on first detection
- [ ] Banner explains the situation clearly
- [ ] Reload button works
- [ ] Submission with old version succeeds
- [ ] No spam (warning shown only once)

---

## Quick Smoke Test Checklist

Run through these quickly to verify basic functionality:

| # | Test | Pass |
|---|------|------|
| 1 | Export CSV → formulas escaped | ☐ |
| 2 | New form → code auto-formats | ☐ |
| 3 | Published form → code is locked | ☐ |
| 4 | Saved field → shows "Type Locked" | ☐ |
| 5 | Invalid expression → shows error | ☐ |
| 6 | Unknown field in expression → shows warning | ☐ |
| 7 | Upload 6MB file → rejected | ☐ |
| 8 | Upload .exe file → rejected | ☐ |
| 9 | Version change → warning banner (wait 60s) | ☐ |

---

## Troubleshooting

### Frontend not loading?
```bash
cd formbuilder-frontend1
npm install
npm run dev
```

### Backend errors?
Check logs in terminal where `mvn spring-boot:run` is running.

### Version mismatch not detecting?
- Ensure you waited at least 30 seconds
- Check browser console for any errors
- Verify the new version is actually activated (not just saved)

### Export not working?
- Check browser console for errors
- Ensure you have responses to export
- Try a different browser

---

## Files Changed Reference

For debugging, here are the files modified:

| Feature | Files |
|---------|-------|
| CSV Injection | `src/utils/sanitization.ts`, `src/app/forms/[id]/responses/page.tsx` |
| Code Immutability | `src/utils/codeValidation.ts`, `src/app/builder/page.tsx` |
| Type Immutability | `src/components/builder/PropertiesPanel.tsx` |
| Expression Validation | `src/utils/expressionValidator.ts`, `src/components/builder/CustomValidationsPanel.tsx` |
| File Upload | `src/components/FormRenderer.tsx` |
| Version Mismatch | `src/app/f/[token]/page.tsx` |
