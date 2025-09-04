import { Routes, Route, useLocation } from "react-router-dom";
import { useState, useEffect } from "react";
import Sidebar from './MenuPanel/Menu';
import ContainerEntry from './Pages/DataEntry/ConatinerEntry';
import CompleteContainer from './Pages/DataEntry/CompleteContainers.js'
import LoginPage from './Pages/Login/Login';
import PrivateRoute from './PrivateRoute';
import Dashboard from './Pages/Dashboard/dashboard';
import ContainerForReport from './Pages/Report/Report.js';
import Unauthorized from "./Pages/Unauthorized/Unauthorized.js";
import Setting from "./Pages/Setting/Setting.js";
import BillOfLanding from "./Pages/BillOfLanding/BillOfLanding.js";
import BillOfLandingInfo from "./Pages/BillOfLanding/BillOfLandingInfo.js";

export default function MainPage() {
  const location = useLocation();
  const isLoginPage = location.pathname === "/";
  const [sidebarVisible, setSidebarVisible] = useState(false);

  // Prevent body scroll when mobile menu is open
  useEffect(() => {
    document.body.classList.toggle("overflow-hidden", sidebarVisible);
  }, [sidebarVisible]);

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
          <div className="md:hidden px-4 pt-4">
            <button
              className="bg-slate-800 text-white p-2 rounded shadow"
              onClick={() => setSidebarVisible(true)}
              aria-label="Toggle Sidebar"
            >
              ☰
            </button>
          </div>
        )}

        <div className="flex-1 overflow-y-auto px-4 pb-4">
          <Routes>
            <Route path="/" element={<LoginPage />} />
            <Route path="/dashboard" element={<PrivateRoute><Dashboard /></PrivateRoute>} />
            <Route path="/Complete" element={<PrivateRoute requiredPermissions={["View_Container"]}><CompleteContainer /></PrivateRoute>} />
            <Route path="/viewContainer" element={<PrivateRoute requiredPermissions={["View_Container"]}><ContainerEntry /></PrivateRoute>} />
            <Route path="/report" element={<PrivateRoute requiredPermissions={["View_Report"]}><ContainerForReport /></PrivateRoute>} />
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