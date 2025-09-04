import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { LayoutDashboard, FileText, Container, ChevronDown, LogOut, SettingsIcon } from 'lucide-react';
import { useNavigate } from "react-router-dom";
import { useAuth } from '../../context/AuthContext';


function Sidebar({ onLinkClick }) {
  const [isDashboardOpen, setIsDashboardOpen] = useState(false);
  const [isContainerOpen, setIsContainerOpen] = useState(false);
  const { permissions, user, logout } = useAuth();
  const hasPermission = (field) => permissions.includes(`${field}`);
  
  var initial = "U"; // Default initial value
  if (user) {
    initial = user.charAt(0).toUpperCase(); // Default to "U" if empty
  }
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    setTimeout(() => navigate("/"), 0);
  };

  return (
    <div className="flex flex-col justify-between h-full bg-slate-950 text-white group md:w-16 md:hover:w-64 w-64 transition-all duration-300 overflow-hidden"
     onMouseLeave={() => {setIsDashboardOpen(false);
      setIsContainerOpen(false);
     }}
      >
      
      {/* Navigation */}
      <div className="p-4 space-y-2">
        <nav className="flex flex-col gap-2">
          
          {/* Dashboard Section */}
          <div className="relative">
            <Link
              to="/dashboard"
              // onClick={() => setIsDashboardOpen(!isDashboardOpen)}
              className="flex items-center w-full gap-3 px-3 py-2 rounded hover:bg-slate-800 transition"
            >
              <div className="w-6 min-w-[1.5rem] flex justify-center items-center">
                <LayoutDashboard size={18} />
              </div>
              <span className="text-sm inline md:hidden">Dashboard</span>
              <span className="text-sm hidden md:group-hover:inline">Dashboard</span>
              
              {/* <ChevronDown
                size={16}
                className={`ml-auto transition-transform ${isDashboardOpen ? 'rotate-180' : ''} hidden md:group-hover:inline`}
              /> */}
            </Link>
            {/* {isDashboardOpen && (
              <div className="ml-6 mt-1 space-y-1">
                <Link to="/dashboard" className="block text-sm hover:text-blue-400" onClick={onLinkClick}>Overview</Link>
                <Link to="/dashboard/analytics" className="block text-sm hover:text-blue-400" onClick={onLinkClick}>Analytics</Link>
                <Link to="/dashboard/saas" className="block text-sm hover:text-blue-400" onClick={onLinkClick}>SaaS</Link>
              </div>
            )} */}
          </div>

          {/* View Container */}
          {hasPermission("View_Container") &&
          <div className="relative">
            <Link
              to="/viewContainer"
              onClick={() =>{setIsContainerOpen(!isContainerOpen);}}
              className="flex items-center gap-3 px-3 py-2 rounded hover:bg-slate-800 transition"
              >
                <div className="w-6 min-w-[1.5rem] flex justify-center items-center">
                  <Container size={18} />
                </div>
              <span className="text-sm inline md:hidden">View Container</span>
              <span className="text-sm hidden md:group-hover:inline">View Container</span>
              
              {hasPermission("View_BL") && <ChevronDown
                size={16}
                className={`ml-auto transition-transform ${isContainerOpen ? 'rotate-180' : ''} hidden md:group-hover:inline`}
              />}
              
            </Link>
            {isContainerOpen && hasPermission("View_BL") &&
              <div className="ml-6 mt-1 space-y-1">
                <Link to="/BillOfLanding" className="block text-sm hover:text-blue-400" onClick={onLinkClick}>Bill Of Landing</Link>
                {/* <Link to="/dashboard/analytics" className="block text-sm hover:text-blue-400" onClick={onLinkClick}>Analytics</Link> */}
                {/* <Link to="/dashboard/saas" className="block text-sm hover:text-blue-400" onClick={onLinkClick}>SaaS</Link> */}
              </div>
            }
            {isContainerOpen && hasPermission("View_Container") &&
              <div className="ml-6 mt-1 space-y-1">
                <Link to="/Complete" className="block text-sm hover:text-blue-400" onClick={onLinkClick}>Complete</Link>
                {/* <Link to="/dashboard/analytics" className="block text-sm hover:text-blue-400" onClick={onLinkClick}>Analytics</Link> */}
                {/* <Link to="/dashboard/saas" className="block text-sm hover:text-blue-400" onClick={onLinkClick}>SaaS</Link> */}
              </div>
            }
          </div>
          }

          {/* Report */}
          {hasPermission("View_Report") &&
            <Link
              to="/report"
              onClick={onLinkClick}
              className="flex items-center gap-3 px-3 py-2 rounded hover:bg-slate-800 transition"
              >
                <div className="w-6 min-w-[1.5rem] flex justify-center items-center">
                  <FileText size={18} />
                </div>
              <span className="text-sm inline md:hidden">Report</span>

              <span className="text-sm hidden md:group-hover:inline">Report</span>
            </Link>
          }

          {/* Settings */}
          {hasPermission("View_Setting") &&
            <Link
              to="/settings"
              onClick={onLinkClick}
              className="flex items-center gap-3 px-3 py-2 rounded hover:bg-slate-800 transition"
              >
              <div className="w-6 min-w-[1.5rem] flex justify-center items-center">
                <SettingsIcon size={18} />
              </div>
              <span className="text-sm inline md:hidden">Settings</span>
              <span className="text-sm hidden md:group-hover:inline">Settings</span>
            </Link>}
        </nav>
      </div>

      {/* User Section */}
      <div>
        <div className="px-4 py-3 border-t border-slate-800 flex items-center gap-3">
          {/* <img src="/user.jpg" alt="User" className="w-10 h-10 rounded-full object-cover" /> */}
          <div className="w-10 h-10 rounded-full bg-blue-600 text-white flex items-center justify-center text-lg font-bold">
            {initial}
          </div>
            <div className="text-sm inline md:hidden">
              <p className="text-sm font-medium">{user || "User"}</p>
              <p className="text-xs text-slate-400">Logged in</p>
            </div>
        
          <div className="hidden md:group-hover:block">
            <p className="text-sm font-medium">{user || "User"}</p>
            <p className="text-xs text-slate-400">Logged in</p>
          </div>
        </div>

        <button
          onClick={handleLogout}
          className="flex items-center gap-2 text-sm px-4 py-2 text-red-400 hover:text-red-500 transition"
          >

          <LogOut size={18} />
          <span className="hidden md:group-hover:inline">Logout</span>
        </button>
      </div>
    </div>
  );
}

export default Sidebar;
