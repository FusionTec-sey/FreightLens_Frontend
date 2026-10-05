import { Routes, Route, useLocation } from "react-router-dom";
import { useState, useEffect } from "react";
import Sidebar from './MenuPanel/Menu';
import OrgSwitcher from './UI/OrgSwitcher';
import ContainerEntry from './Pages/DataEntry/ConatinerEntry';
import CompleteContainer from './Pages/DataEntry/CompleteContainers.js';
import LoginPage from './Pages/Login/Login';
import PrivateRoute from './PrivateRoute';
import Dashboard from './Pages/Dashboard/dashboard';
import DashboardTemplateManager from './Pages/Dashboard/DashboardTemplateManager';
import ContainerForReport from './Pages/Report/Report.js';
import ContainerForReport1 from "./Pages/Report/Report1.js";
import Unauthorized from "./Pages/Unauthorized/Unauthorized.js";
import Setting from "./Pages/Setting/Setting.js";
import SettingsOverview from "./Pages/Setting/SettingsOverview.js";
import OrganizationSettings from "./Pages/Setting/OrganizationSettings.js";
import OrderSettings from "./Pages/Setting/OrderSettings.js";
import BillOfLanding from "./Pages/BillOfLanding/BillOfLanding.js";
import BillOfLandingInfo from "./Pages/BillOfLanding/BillOfLandingInfo.js";
import Logistics from './Pages/Setting/Logistics';
import ReferenceData from './Pages/Setting/ReferenceData';
import AdminOverview from "./Pages/Admin/AdminOverview.js";

// Orders and Procurement Modules
import OrdersPage from "./Pages/Orders/OrdersPage.js";
import SourcingPage from "./Pages/Orders/SourcingPage.js";
import VendorQuotesPage from "./Pages/Orders/VendorQuotesPage.js";
import OrderTemplatesPage from "./Pages/Orders/OrderTemplatesPage.js";
import OrderEntryPage from "./Pages/Orders/OrderEntryPage.js";
import QuoteComparisonPage from "./Pages/Orders/QuoteComparisonPage.js";
import StoreRequestsPage from "./Pages/Orders/StoreRequestsPage.js";
import PackingListsPage from "./Pages/Orders/PackingListsPage.js";
import GoodsReceivingPage from "./Pages/Orders/GoodsReceivingPage.js";
import DamageDefectsPage from "./Pages/Orders/DamageDefectsPage.js";
import DailyOperationsPage from "./Pages/Orders/DailyOperationsPage.js";
import ProductMasterPage from "./Pages/Inventory/ProductMasterPage.js";
import InventoryLocationsPage from "./Pages/Inventory/InventoryLocationsPage.js";
import { INVENTORY_LOCATIONS_ROUTE, INVENTORY_POOLS_ROUTE, INVENTORY_APPROVALS_ROUTE, INVENTORY_BARCODE_REVIEWS_ROUTE, INVENTORY_RETURN_CONDITION_REVIEWS_ROUTE } from "../utils/inventoryRoutes";
import InventoryWorkspacePage from "./Pages/Inventory/InventoryWorkspacePage";
import CurrenciesPage from "./Pages/MasterData/CurrenciesPage.js";
import PaymentTermsPage from "./Pages/MasterData/PaymentTermsPage.js";
import SuppliersMasterPage from "./Pages/MasterData/SuppliersMasterPage.js";
import CustomersPage from "./Pages/MasterData/CustomersPage";
import SalesDraftsPage from "./Pages/Sales/SalesDraftsPage";
import SalesPricingPage from "./Pages/Sales/SalesPricingPage";
import PaymentConfigurationPage from "./Pages/Setting/PaymentConfigurationPage";
import { COUNT_PLANS_ROUTE, COUNT_SESSIONS_ROUTE, COUNT_MY_ROUNDS_ROUTE, COUNT_DISCREPANCIES_ROUTE } from "../utils/countRoutes";
import CountPlansPage from "./Pages/Counts/CountPlansPage";
import CountSessionsPage from "./Pages/Counts/CountSessionsPage";
import CountDiscrepanciesPage from "./Pages/Counts/CountDiscrepanciesPage";
import { SALES_PAYMENT_CONFIGURATION_ROUTE, SALES_PRICING_ROUTE, SALES_VIEWS } from "../utils/salesRoutes";
import { CUSTOMERS_ROUTE } from "../utils/customerRoutes";
import DocumentTypesMasterPage from "./Pages/MasterData/DocumentTypesMasterPage.js";
import ReportTemplatesPage from "./Pages/ReportTemplates/ReportTemplatesPage.js";
import ReportTemplateEditorPage from "./Pages/ReportTemplates/ReportTemplateEditorPage.js";

import { useTheme } from "../context/ThemeContext.js";

export default function MainPage() {
  const location = useLocation();
  const isLoginPage = location.pathname === "/";
  const [sidebarVisible, setSidebarVisible] = useState(false);

  // Prevent body scroll when mobile menu is open
  useEffect(() => {
    document.body.classList.toggle("overflow-hidden", sidebarVisible);
  }, [sidebarVisible]);
  const { theme } = useTheme();
  const isFullBleedPage =
    isLoginPage ||
    location.pathname.startsWith("/reports") ||
    location.pathname === "/orders" ||
    location.pathname === "/orders/new" ||
    location.pathname.startsWith("/inventory") ||
    location.pathname === "/sourcing" ||
    location.pathname === "/sourcing/new" ||
    location.pathname === "/viewContainer" ||
    location.pathname === "/ConatinerEntry" ||
    location.pathname === "/BillOfLanding" ||
    location.pathname === "/billOfLanding" ||
    location.pathname === "/Complete" ||
    (location.pathname.startsWith("/orders/") &&
      !location.pathname.includes("/quotes") &&
      !location.pathname.includes("/issues") &&
      !location.pathname.includes("/daily-operations") &&
      !location.pathname.includes("/store-requests") &&
      !location.pathname.includes("/packing-lists") &&
      !location.pathname.includes("/goods-receiving")) ||
    (location.pathname.startsWith("/sourcing/") &&
      !location.pathname.includes("/quotes"));

  return (
    <div className={`flex min-h-screen relative ${theme.background}`}>
      {/* Sidebar for desktop */}
      {!isLoginPage && (
        <aside className="hidden md:block fixed md:relative z-30 h-screen">
          <Sidebar />
        </aside>
      )}

      {/* Sidebar for mobile */}
      {sidebarVisible && (
        <div className="md:hidden fixed inset-0 z-50 flex">
          <div className="w-64 h-full">
            <Sidebar onLinkClick={() => setSidebarVisible(false)} />
          </div>
          <div
            className="flex-1 bg-black bg-opacity-50"
            onClick={() => setSidebarVisible(false)}
          />
        </div>
      )}

      {/* Main Content */}
      <main className={`flex-1 flex flex-col`} style={{ height: '100vh', overflow: 'hidden' }}>
        {/* Explicit company context on every operational screen. */}
        {!isLoginPage && (
          <header className={`shrink-0 px-4 py-2.5 border-b flex items-center justify-between gap-3 z-40 ${theme.background} ${theme.border}`}>
            <button
              type="button" className={`md:hidden h-8 w-8 flex items-center justify-center rounded-md border ${theme.border} ${theme.text}`}
              onClick={() => setSidebarVisible(true)}
              aria-label="Open menu"
            >
              ☰
            </button>
            <div className="ml-auto"><OrgSwitcher /></div>
          </header>
        )}

        <div className={`flex-1 ${isFullBleedPage ? 'overflow-y-auto md:overflow-hidden' : 'overflow-y-auto'} min-h-0 flex flex-col ${theme.background} ${theme.text} ${theme.scrollbar} ${isFullBleedPage ? '' : 'p-3 sm:p-4 md:p-6'}`}>
          <Routes>
            <Route path="/" element={<LoginPage />} />
            
            <Route path="/dashboard" element={<PrivateRoute><Dashboard /></PrivateRoute>} />
            <Route path="/dashboard/templates" element={<PrivateRoute requiredPermissions={["Manage_DashboardTemplate", "Administrator"]}><DashboardTemplateManager /></PrivateRoute>} />
            <Route path="/dashboard-templates" element={<PrivateRoute requiredPermissions={["Manage_DashboardTemplate", "Administrator"]}><DashboardTemplateManager /></PrivateRoute>} />
            <Route path="/viewContainer" element={<PrivateRoute requiredModules={["LOGISTICS"]} requiredPermissions={["View_Container", "Container"]}><ContainerEntry /></PrivateRoute>} />
            <Route path="/ConatinerEntry" element={<PrivateRoute requiredModules={["LOGISTICS"]} requiredPermissions={["View_Container", "Container"]}><ContainerEntry /></PrivateRoute>} />
            <Route path="/Complete" element={<PrivateRoute requiredModules={["LOGISTICS"]} requiredPermissions={["View_Container", "Container"]}><CompleteContainer /></PrivateRoute>} />
            
            <Route path="/report" element={<PrivateRoute requiredModules={["LOGISTICS", "ORDERS"]} requiredPermissions={["View_Report", "Report", "View_Defect", "View_Order"]}><DamageDefectsPage /></PrivateRoute>} />
            <Route path="/Report" element={<PrivateRoute requiredModules={["LOGISTICS", "ORDERS"]} requiredPermissions={["View_Report", "Report", "View_Defect", "View_Order"]}><DamageDefectsPage /></PrivateRoute>} />
            <Route path="/Report1" element={<PrivateRoute requiredModules={["LOGISTICS", "ORDERS"]} requiredPermissions={["View_Report", "Report", "View_Defect", "View_Order"]}><DamageDefectsPage /></PrivateRoute>} />
            <Route path="/orders/issues" element={<PrivateRoute requiredModules={["LOGISTICS", "ORDERS"]} requiredPermissions={["View_Report", "Report", "View_Defect", "View_Order"]}><DamageDefectsPage /></PrivateRoute>} />
            
            {/* Setting routes */}
            <Route path="/settings-overview" element={<PrivateRoute requiredPermissions={["View_Setting", "Setting", "Edit_Setting"]}><SettingsOverview /></PrivateRoute>} />
            <Route path="/organization-settings" element={<PrivateRoute requiredPermissions={["View_TenantConsole", "Manage_TenantConsole", "Administrator"]}><OrganizationSettings /></PrivateRoute>} />
            <Route path="/order-settings" element={<PrivateRoute requiredModules={["ORDERS"]} requiredPermissions={["View_Setting", "Setting", "Edit_Setting"]}><OrderSettings /></PrivateRoute>} />
            <Route path="/settings" element={<PrivateRoute requiredPermissions={["View_Setting", "Setting", "Edit_Setting"]}><Setting /></PrivateRoute>} />
            <Route path="/setting" element={<PrivateRoute requiredPermissions={["View_Setting", "Setting", "Edit_Setting"]}><Setting /></PrivateRoute>} />
            <Route path="/logistics" element={<PrivateRoute requiredModules={["LOGISTICS"]} requiredPermissions={["View_Setting", "Setting", "Edit_Setting"]}><Logistics /></PrivateRoute>} />
            <Route path="/reference-data" element={<PrivateRoute requiredPermissions={["View_Setting", "Setting", "Edit_Setting"]}><ReferenceData /></PrivateRoute>} />
            <Route path="/reference" element={<PrivateRoute requiredPermissions={["View_Setting", "Setting", "Edit_Setting"]}><ReferenceData /></PrivateRoute>} />

            <Route path="/BillOfLanding" element={<PrivateRoute requiredModules={["LOGISTICS"]} requiredPermissions={["View_BL", "BillOfLanding"]}><BillOfLanding /></PrivateRoute>} />
            <Route path="/billOfLanding" element={<PrivateRoute requiredModules={["LOGISTICS"]} requiredPermissions={["View_BL", "BillOfLanding"]}><BillOfLanding /></PrivateRoute>} />
            <Route path="/bill-of-landing-info" element={<PrivateRoute requiredModules={["LOGISTICS"]} requiredPermissions={["View_BL", "BillOfLanding"]}><BillOfLandingInfo /></PrivateRoute>} />

            {/* Tenant Admin & Sourcing & Purchase Orders Routes */}
            <Route path="/admin" element={<PrivateRoute requiredPermissions={["View_TenantConsole", "Manage_TenantConsole", "Administrator"]}><AdminOverview /></PrivateRoute>} />
            
            {/* Dedicated Sourcing Requisitions Module */}
            <Route path="/sourcing" element={<PrivateRoute requiredModules={["ORDERS"]} requiredPermissions={["View_RFQ", "View_Order", "Order"]}><SourcingPage /></PrivateRoute>} />
            <Route path="/sourcing/new" element={<PrivateRoute requiredModules={["ORDERS"]} requiredPermissions={["Add_RFQ", "Add_Order", "Order"]}><OrderEntryPage /></PrivateRoute>} />
            <Route path="/sourcing/:id" element={<PrivateRoute requiredModules={["ORDERS"]} requiredPermissions={["View_RFQ", "View_Order", "Order"]}><OrderEntryPage /></PrivateRoute>} />
            <Route path="/sourcing/:id/edit" element={<PrivateRoute requiredModules={["ORDERS"]} requiredPermissions={["Edit_RFQ", "View_RFQ", "Edit_Order", "View_Order", "Order"]}><OrderEntryPage /></PrivateRoute>} />

            {/* Dedicated Purchase Orders Module */}
            <Route path="/orders" element={<PrivateRoute requiredModules={["ORDERS"]} requiredPermissions={["View_Order", "Order"]}><OrdersPage /></PrivateRoute>} />
            <Route path="/orders/quotes" element={<PrivateRoute requiredModules={["ORDERS"]} requiredPermissions={["Compare_Quote", "View_VendorQuote", "Send_RFQ", "View_Order", "Order"]}><VendorQuotesPage /></PrivateRoute>} />
            <Route path="/quotes" element={<PrivateRoute requiredModules={["ORDERS"]} requiredPermissions={["Compare_Quote", "View_VendorQuote", "Send_RFQ", "View_Order", "Order"]}><VendorQuotesPage /></PrivateRoute>} />
            <Route path="/templates" element={<PrivateRoute requiredModules={["ORDERS"]} requiredPermissions={["View_OrderTemplate", "Edit_OrderTemplate", "Add_OrderTemplate", "Delete_OrderTemplate", "View_Order", "Order", "Add_RFQ", "View_RFQ"]}><OrderTemplatesPage /></PrivateRoute>} />
            <Route path="/orders/templates" element={<PrivateRoute requiredModules={["ORDERS"]} requiredPermissions={["View_OrderTemplate", "Edit_OrderTemplate", "Add_OrderTemplate", "Delete_OrderTemplate", "View_Order", "Order", "Add_RFQ", "View_RFQ"]}><OrderTemplatesPage /></PrivateRoute>} />
            <Route path="/orders/new" element={<PrivateRoute requiredModules={["ORDERS"]} requiredPermissions={["Add_Order", "View_Order", "Order"]}><OrderEntryPage /></PrivateRoute>} />
            <Route path="/orders/:id" element={<PrivateRoute requiredModules={["ORDERS"]} requiredPermissions={["View_Order", "Order"]}><OrderEntryPage /></PrivateRoute>} />
            <Route path="/orders/:id/edit" element={<PrivateRoute requiredModules={["ORDERS"]} requiredPermissions={["Edit_Order", "View_Order", "Order"]}><OrderEntryPage /></PrivateRoute>} />
            <Route path="/orders/:id/quotes" element={<PrivateRoute requiredModules={["ORDERS"]} requiredPermissions={["Compare_Quote", "View_VendorQuote", "Administrator"]}><QuoteComparisonPage /></PrivateRoute>} />
            <Route path="/store-requests" element={<PrivateRoute requiredModules={["ORDERS"]} requiredPermissions={["View_StoreRequest", "View_Order", "Order"]}><StoreRequestsPage /></PrivateRoute>} />
            <Route path="/packing-lists" element={<PrivateRoute requiredModules={["ORDERS"]} requiredPermissions={["View_PackingList", "View_Order", "Order"]}><PackingListsPage /></PrivateRoute>} />
            <Route path="/goods-receiving" element={<PrivateRoute requiredModules={["ORDERS"]} requiredPermissions={["View_GoodsReceipt", "View_Order", "Order", "Verify_Receipt"]}><GoodsReceivingPage /></PrivateRoute>} />
            <Route path="/damage-defects" element={<PrivateRoute requiredModules={["LOGISTICS", "ORDERS"]} requiredPermissions={["View_Defect", "View_Report", "Report", "View_Order"]}><DamageDefectsPage /></PrivateRoute>} />
            <Route path="/daily-operations" element={<PrivateRoute requiredModules={["ORDERS"]} requiredPermissions={["View_DailyWork", "View_Order", "Order", "Administrator"]}><DailyOperationsPage /></PrivateRoute>} />

            {/* Independent Inventory Module */}
            <Route path="/inventory" element={<PrivateRoute requiredModules={["INVENTORY"]}><ProductMasterPage /></PrivateRoute>} />
            <Route path="/inventory/products" element={<PrivateRoute requiredModules={["INVENTORY"]}><ProductMasterPage /></PrivateRoute>} />
            <Route path={INVENTORY_LOCATIONS_ROUTE} element={<PrivateRoute requiredModules={["INVENTORY"]} requiredPermissions={["View_Product"]}><InventoryLocationsPage /></PrivateRoute>} />
            <Route path={INVENTORY_POOLS_ROUTE} element={<PrivateRoute requiredModules={["INVENTORY"]} requiredPermissions={["View_Product"]}><InventoryWorkspacePage workspace="pools" /></PrivateRoute>} />
            <Route path={INVENTORY_APPROVALS_ROUTE} element={<PrivateRoute requiredModules={["INVENTORY"]} requiredPermissions={["Review_InventoryPolicy"]}><InventoryWorkspacePage workspace="approvals" /></PrivateRoute>} />
            <Route path={INVENTORY_BARCODE_REVIEWS_ROUTE} element={<PrivateRoute requiredModules={["INVENTORY"]} requiredPermissions={["Review_BarcodeRetirement"]}><InventoryWorkspacePage workspace="barcode-reviews" /></PrivateRoute>} />
            <Route path={INVENTORY_RETURN_CONDITION_REVIEWS_ROUTE} element={<PrivateRoute requiredModules={["INVENTORY"]} requiredPermissions={["Request_StockCondition", "Review_StockCondition", "Execute_StockCondition"]}><InventoryWorkspacePage workspace="return-conditions" /></PrivateRoute>} />

            {/* Master Data & Multi-Currency Admin Routes */}
            <Route path="/master-data/currencies" element={<PrivateRoute><CurrenciesPage /></PrivateRoute>} />
            <Route path="/master-data/payment-terms" element={<PrivateRoute><PaymentTermsPage /></PrivateRoute>} />
            <Route path="/master-data/suppliers" element={<PrivateRoute><SuppliersMasterPage /></PrivateRoute>} />
            <Route path={CUSTOMERS_ROUTE} element={<PrivateRoute><CustomersPage /></PrivateRoute>} />
            {Object.entries(SALES_VIEWS).map(([path, view]) => <Route key={path} path={path} element={<PrivateRoute><SalesDraftsPage key={view} view={view} /></PrivateRoute>} />)}
            <Route path={SALES_PRICING_ROUTE} element={<PrivateRoute requiredModules={["SALES"]} requiredPermissions={["View_Product", "View_Financials"]}><SalesPricingPage /></PrivateRoute>} />
            <Route path={SALES_PAYMENT_CONFIGURATION_ROUTE} element={<PrivateRoute requiredModules={["SALES"]} requiredPermissions={["View_Financials"]}><PaymentConfigurationPage /></PrivateRoute>} />
            <Route path={COUNT_PLANS_ROUTE} element={<PrivateRoute><CountPlansPage /></PrivateRoute>} />
            <Route path={COUNT_SESSIONS_ROUTE} element={<PrivateRoute><CountSessionsPage /></PrivateRoute>} />
            <Route path={COUNT_MY_ROUNDS_ROUTE} element={<PrivateRoute><CountSessionsPage mine /></PrivateRoute>} />
            <Route path={COUNT_DISCREPANCIES_ROUTE} element={<PrivateRoute><CountDiscrepanciesPage /></PrivateRoute>} />
            <Route path="/master-data/document-types" element={<PrivateRoute><DocumentTypesMasterPage /></PrivateRoute>} />

            {/* Customer-Configurable Report & Print Templates */}
            <Route path="/reports" element={<PrivateRoute requiredPermissions={["View_Report", "Report", "View_Order", "View_Container"]}><ReportTemplatesPage /></PrivateRoute>} />
            <Route path="/reports/templates" element={<PrivateRoute requiredPermissions={["View_Report", "Report", "View_Order", "View_Container"]}><ReportTemplatesPage /></PrivateRoute>} />
            <Route path="/reports/editor/:id" element={<PrivateRoute requiredPermissions={["Manage_Report_Template", "Administrator", "admin", "View_Report", "Report"]}><ReportTemplateEditorPage /></PrivateRoute>} />
            <Route path="/reports/editor/new" element={<PrivateRoute requiredPermissions={["Manage_Report_Template", "Administrator", "admin", "View_Report", "Report"]}><ReportTemplateEditorPage /></PrivateRoute>} />

            <Route path="/unauthorized" element={<Unauthorized />} />
          </Routes>
        </div>
      </main>
    </div>
  );
}
