

## Plan: Move sync status below client name

The "Sincronizado" badge overlaps with the edit/delete buttons because both are positioned in the top-right area of the card.

### Change

**File: `src/pages/AdminDashboard.tsx` (lines 328-349)**

Restructure the card header: remove the sync status from the `flex justify-between` row and place it below the client name/email instead.

```
// Before:
<div className="flex items-start justify-between mb-4 pr-8">
  <div>
    <h3>...</h3>
    <p>email</p>
  </div>
  <div> ← sync badge here (overlaps with action buttons)
    Sincronizado / Não sincronizado
  </div>
</div>

// After:
<div className="mb-4 pr-16">
  <h3>...</h3>
  <p>email</p>
  <div className="flex items-center gap-1.5 mt-1.5">  ← sync badge below name
    Sincronizado / Não sincronizado
  </div>
</div>
```

Single file, ~10 lines changed.

