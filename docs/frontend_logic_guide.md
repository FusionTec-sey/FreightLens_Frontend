# Frontend Logic Guide: BoL & Container Synchronization

This guide explains how to implement the frontend UI logic for managing **Bill of Lading (BoL)** settings vs. **Individual Container** overrides, including permissions and visual logic.

---

## 1. Core Logic: Inherited vs. Custom

A container's value is considered **Inherited** if it matches its parent BoL's value. It is **Custom** if it has been overridden.

### Detection Logic (Frontend)
When viewing a BoL with its containers:

```javascript
// Example check for a container
const isFreeDaysCustom = container.FreeDays !== container.bill_of_landing.FreeDays;
const isStatusCustom = container.status !== container.bill_of_landing.status_name;
```

---

## 2. Permissions & Field Access

All fields are controlled by a permission-based visibility and editability system.

| Field | Permission Key | Action |
|---|---|---|
| **Free Days (Container)** | `Demurrage` | Requires `View_Demurrage` and `Edit_Demurrage`. |
| **Status (Container)** | `Status` | Requires `View_Status` and `Edit_Status`. |
| **BoL Status** | `Status` | Requires `View_Status` and `Edit_Status`. |

---

## 3. Visual Alarms: Overdue Highlighting

Containers that exceed their **Free Days** (allotted time since arrival at port) should be visually highlighted.

### A. Demurrage Calculation
Use the shared `DemurrageUtil.js` to calculate the status string:
```javascript
import { calculateDemurrage } from '../../../utils/DemurrageUtil';

const statusStr = calculateDemurrage({
    ExcludeDayBitmask: bol.ExcludingDay, // From Parent BoL
    ArrivalDate: bol.ArrivalDate,       // From Parent BoL
    FreeDay: container.FreeDays ?? bol.FreeDays // Use Individual Override if present
});

// statusStr will be "Remaining time: X day(s)" or "Overdue by: Y day(s)"
```

### B. Row Coloring
If the calculated status includes "Overdue", the row should turn **Red**:
*   **CSS Class**: `bg-red-400 text-red-50 hover:bg-red-450`
*   **Trigger**: `row.demurrage.includes("Overdue")`

---

## 4. BoL Management UI

When editing a Bill of Lading, global `FreeDays` and `status` fields affect all children unless blocked by conflicts.

### A. Conflict Handling (`HTTP 409 Conflict`)
If you attempt to update BoL-level `FreeDays` or `status` while containers have unique overrides, the backend returns a `409` code.

**Frontend Action**:
1.  Show an alert: *"Conflict: Some containers have custom values. Update them individually first, or reset then to match the BoL."*
2.  Provide a clear indication of which containers are "Custom" in the list (e.g., a "Custom" badge).

---

## 5. Implementation Best Practices

### A. CORS & Authentication
*   **Auth Type**: JWT (Bearer token).
*   **CORS Configuration**: `withCredentials` MUST be `false`. Setting it to `true` will cause requests to fail behind proxies like zrok.

### B. Table Consistency
Ensure the `Demurrage` column and **Red Overdue highlighting** are applied to:
1.  **Dashboard**: Arrived containers list.
2.  **Container Entry**: Primary container management list.
3.  **BoL Info Detail**: Container list inside the Bill of Lading management page.

---

## Example Overdue Logic (React)

```javascript
// In your table's getRowClassName prop:
getRowClassName={(row) => {
    if (row.demurrage && row.demurrage.includes("Overdue")) {
        return 'bg-red-400 text-red-50 hover:bg-red-450';
    }
    // Standard status-based coloring
    switch (row.status) {
        case 'On port': return 'bg-blue-100 dark:bg-blue-900';
        case 'Gate Pass': return 'bg-green-100 dark:bg-green-900';
        default: return '';
    }
}}
```
