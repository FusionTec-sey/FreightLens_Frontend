import { Routes, Route, useLocation } from "react-router-dom";
import { useState, useEffect } from "react";
import Sidebar from './MenuPanel/Menu';
import ContainerEntry from './Pages/DataEntry/ConatinerEntry';
import CompleteContainer from './Pages/DataEntry/CompleteContainers.js'
import LoginPage from './Pages/Login/Login';
import PrivateRoute from './PrivateRoute';
import Dashboard from './Pages/Dashboard/dashboard';
import ContainerForReport from './Pages/Report/Report.js';
import ContainerForReport1 from "./Pages/Report/Report1.js";
import Unauthorized from "./Pages/Unauthorized/Unauthorized.js";
import Setting from "./Pages/Setting/Setting.js";
import BillOfLanding from "./Pages/BillOfLanding/BillOfLanding.js";
import BillOfLandingInfo from "./Pages/BillOfLanding/BillOfLandingInfo.js";
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
  return (
    <div className="flex min-h-screen bg-slate-100 relative">
      {/* Sidebar for desktop */}
      {!isLoginPage && (
        <aside className="hidden md:block fixed md:relative z-30 bg-slate-950 h-screen">
          <Sidebar />
        </aside>
      )}

      {/* Sidebar for mobile */}
      {sidebarVisible && (
        <div className="md:hidden fixed inset-0 z-50 flex">
          <div className="w-64 bg-slate-950 h-full">
            <Sidebar onLinkClick={() => setSidebarVisible(false)} />
          </div>
          <div
            className="flex-1 bg-black bg-opacity-50"
            onClick={() => setSidebarVisible(false)}
          />
        </div>
      )}

      {/* Main Content */}
      <main className={`flex-1 flex flex-col `} style={{ height: '100vh', overflow: 'hidden' }}>
        {/* Mobile Menu Button */}
        {!isLoginPage && (
          <div className="md:hidden sticky top-0 z-40">
            <div className={`flex items-center justify-between px-3 py-3 border-b ${theme.background} ${theme.border} backdrop-blur`}>
              <div className="text-sm font-semibold" />
              <button
                className="h-10 w-10 flex items-center justify-center rounded-md bg-slate-800 text-white shadow active:scale-95"
                onClick={() => setSidebarVisible(true)}
                aria-label="Open menu"
              >
                ☰
              </button>
            </div>
          </div>
        )}

        <div className={`flex-1 overflow-y-auto ${theme.background} ${theme.text} ${theme.scrollbar} ${isLoginPage ? '' : 'p-3 sm:p-4 md:p-6'}`}>
          <Routes>
            <Route path="/" element={<LoginPage />} />
            
            <Route path="/dashboard" element={<PrivateRoute><Dashboard /></PrivateRoute>} />
            <Route path="/Complete" element={<PrivateRoute requiredPermissions={["View_Container"]}><CompleteContainer /></PrivateRoute>} />
            <Route path="/viewContainer" element={<PrivateRoute requiredPermissions={["View_Container"]}><ContainerEntry /></PrivateRoute>} />
            <Route path="/report" element={<PrivateRoute requiredPermissions={["View_Report"]}><ContainerForReport1 /></PrivateRoute>} />
            <Route path="/unauthorized" element={<Unauthorized />} />
            <Route path="/settings" element={<PrivateRoute ><Setting currentUser={{ id: 99, name: 'Admin User', role: 'admin' }} /></PrivateRoute>} />
            <Route path="/BillOfLanding" element={<PrivateRoute ><BillOfLanding/></PrivateRoute>} />
            <Route path="/BillOfLanding/:Id" element={<PrivateRoute><BillOfLandingInfo /></PrivateRoute>} />
          </Routes>
        </div>
      </main>
    </div>
  );
}