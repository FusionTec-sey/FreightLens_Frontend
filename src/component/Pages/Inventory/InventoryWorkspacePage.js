import React, { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../../context/AuthContext";
import { inventoryLocationsApi } from "../../../services/inventoryLocationsApi";
import { INVENTORY_LOCATIONS_ROUTE } from "../../../utils/inventoryRoutes";
import CostPoolSetup from "./components/CostPoolSetup";
import ManagerCases from "./components/ManagerCases";

// Route adapters reuse the existing panels; no duplicate registers or APIs.
export default function InventoryWorkspacePage({ workspace }) {
  const { token, selectedOrgId, orgId, permissions = [], isSuperAdmin, user } = useAuth();
  const navigate = useNavigate();
  const activeOrg = selectedOrgId || orgId;
  const retirement = workspace === "barcode-reviews";
  const api = useMemo(() => {
    const base = inventoryLocationsApi(token, activeOrg);
    return retirement ? { ...base, managerCases: base.barcodeRetirementCases, reviewPolicyCase: base.reviewBarcodeRetirement } : base;
  }, [token, activeOrg, retirement]);
  if (!activeOrg) return <p role="alert">Select an organisation first.</p>;
  const onClose = () => navigate(INVENTORY_LOCATIONS_ROUTE);
  return workspace === "approvals" || retirement ? <ManagerCases standalone retirement={retirement} key={`${activeOrg}:${workspace}`} api={api} userId={user?.id}
    canActivate={isSuperAdmin || permissions.includes(retirement ? "Retire_InventoryBarcode" : "Activate_InventoryPolicy")} onClose={onClose} /> :
    <CostPoolSetup key={`${activeOrg}:${workspace}`} api={api} orgId={activeOrg} userId={user?.id}
      canViewValues={isSuperAdmin || permissions.includes("View_Financials")}
      canManageValues={isSuperAdmin || permissions.includes("Manage_Financials")}
      canManage={isSuperAdmin || permissions.includes("Manage_InventoryCostPool")} onClose={onClose} />;
}
