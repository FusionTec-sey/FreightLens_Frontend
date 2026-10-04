import React, { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../../context/AuthContext";
import { inventoryLocationsApi } from "../../../services/inventoryLocationsApi";
import { INVENTORY_LOCATIONS_ROUTE } from "../../../utils/inventoryRoutes";
import CostPoolSetup from "./components/CostPoolSetup";
import ManagerCases from "./components/ManagerCases";

// Route adapters reuse the existing panels; no duplicate registers or APIs.
export default function InventoryWorkspacePage({ workspace }) {
  const { token, selectedOrgId, orgId, permissions = [], modules = [], isSuperAdmin, userId } = useAuth();
  const navigate = useNavigate();
  const activeOrg = selectedOrgId || orgId;
  const retirement = workspace === "barcode-reviews";
  const api = useMemo(() => {
    const base = inventoryLocationsApi(token, activeOrg);
    return retirement ? { ...base, managerCases: base.barcodeRetirementCases, reviewPolicyCase: base.reviewBarcodeRetirement } : base;
  }, [token, activeOrg, retirement]);
  if (!activeOrg) return <p role="alert">Select an organisation first.</p>;
  const onClose = () => navigate(INVENTORY_LOCATIONS_ROUTE);
  return workspace === "approvals" || retirement ? <ManagerCases standalone retirement={retirement} key={`${activeOrg}:${workspace}`} api={api} userId={userId}
    canActivate={isSuperAdmin || permissions.includes(retirement ? "Retire_InventoryBarcode" : "Activate_InventoryPolicy")} onClose={onClose} /> :
    <CostPoolSetup key={`${activeOrg}:${workspace}`} api={api} orgId={activeOrg} userId={userId}
      canViewValues={isSuperAdmin || permissions.includes("View_Financials")}
      canManageValues={isSuperAdmin || permissions.includes("Manage_Financials")}
      canViewEvidence={isSuperAdmin || (modules.includes('ORDERS') && ['View_Financials', 'View_Supplier', 'View_OrderDocument'].every(name => permissions.includes(name)))}
      canManage={isSuperAdmin || permissions.includes("Manage_InventoryCostPool")} onClose={onClose} />;
}
