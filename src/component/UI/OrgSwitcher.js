import React, { useState, useEffect } from "react";
import axios from "axios";
import { Building2, ChevronDown, Check } from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { useTheme } from "../../context/ThemeContext";

export default function OrgSwitcher() {
  const { isRoot, orgName, selectedOrgId, setSelectedOrgId } = useAuth();
  const { theme, isDark } = useTheme();
  const [isOpen, setIsOpen] = useState(false);
  const [organisations, setOrganisations] = useState([]);

  useEffect(() => {
    if (isRoot) {
      axios
        .get(`${process.env.REACT_APP_NETWORK}/organisations`, {
          headers: { skip_zrok_interstitial: "true" },
        })
        .then((res) => {
          setOrganisations(res.data || []);
        })
        .catch((err) => {
          console.error("Failed to fetch organisations for switcher:", err);
        });
    }
  }, [isRoot]);

  // Determine active company display label
  const activeCompany = selectedOrgId
    ? organisations.find((o) => o.id === selectedOrgId)?.display_name ||
      organisations.find((o) => o.id === selectedOrgId)?.name ||
      `Org #${selectedOrgId}`
    : "All Companies (Sahaj Group)";

  if (!isRoot && organisations.length <= 1) {
    return (
      <div className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border text-xs font-semibold ${isDark ? "bg-slate-800 border-slate-700 text-slate-200" : "bg-gray-100 border-gray-200 text-gray-800"}`}>
        <Building2 size={14} className="text-blue-500" />
        <span>{orgName}</span>
      </div>
    );
  }

  return (
    <div className="relative inline-block text-left z-50">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border text-xs font-medium transition-all ${theme.border} ${theme.hover} ${isDark ? "bg-slate-800 text-white" : "bg-gray-100 text-gray-800"} shadow-xs`}
      >
        <Building2 size={14} className="text-blue-500" />
        <span className="truncate max-w-[170px] font-semibold">{activeCompany}</span>
        <ChevronDown size={14} className="opacity-60" />
      </button>

      {isOpen && (
        <div
          className={`absolute right-0 mt-2 w-60 rounded-xl border shadow-xl py-2 z-50 ${isDark ? "border-slate-700 bg-slate-900 text-white" : "border-gray-200 bg-white text-gray-900"}`}
          onMouseLeave={() => setIsOpen(false)}
        >
          <div className={`px-3 py-1.5 border-b text-[10px] uppercase font-bold tracking-wider ${isDark ? "border-slate-800 text-slate-400" : "border-gray-100 text-gray-500"}`}>
            Select Active Company
          </div>

          <button
            type="button"
            onClick={() => {
              setSelectedOrgId(null);
              setIsOpen(false);
            }}
            className={`w-full text-left px-3 py-2 text-xs flex items-center justify-between transition ${isDark ? "hover:bg-slate-800 text-slate-200" : "hover:bg-gray-100 text-gray-800"}`}
          >
            <span className="font-semibold">All Companies (Combined)</span>
            {!selectedOrgId && <Check size={14} className="text-blue-500" />}
          </button>

          <div className={`my-1 border-t ${isDark ? "border-slate-800" : "border-gray-100"}`} />

          {organisations.map((org) => (
            <button
              key={org.id}
              type="button"
              onClick={() => {
                setSelectedOrgId(org.id);
                setIsOpen(false);
              }}
              className={`w-full text-left px-3 py-2 text-xs flex items-center justify-between transition ${isDark ? "hover:bg-slate-800 text-slate-300" : "hover:bg-gray-100 text-gray-700"}`}
            >
              <div className="flex items-center gap-2 truncate">
                <Building2 size={13} className={org.parent_org_id ? "opacity-60" : "text-blue-500"} />
                <span className="truncate">{org.display_name || org.name}</span>
              </div>
              {selectedOrgId === org.id && <Check size={14} className="text-blue-500" />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
