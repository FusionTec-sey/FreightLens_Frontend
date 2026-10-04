import React, { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "react-toastify";
import { useAuth } from "../../../context/AuthContext";
import { useTheme } from "../../../context/ThemeContext";
import PaginationToolbar from "../../UI/UXComponent/PaginationToolbar";
import { inventoryLocationsApi, locationError } from "../../../services/inventoryLocationsApi";
import CostPoolSetup from "./components/CostPoolSetup";
import LocationStock from "./components/LocationStock";
import BranchSettings from "./components/BranchSettings";
import BranchCounters from "./components/BranchCounters";
import StaffStoreAssignments from "./components/StaffStoreAssignments";
import ManagerCases from "./components/ManagerCases";

export default function InventoryLocationsPage() {
  const { token, selectedOrgId, orgId, permissions, isSuperAdmin, user } = useAuth();
  const activeOrg = selectedOrgId || orgId;
  if (!activeOrg) return <p role="alert" className="p-4">Select an organisation before managing locations.</p>;
  return <LocationWorkspace key={activeOrg} orgId={activeOrg} token={token}
    userId={user?.id} canReview={isSuperAdmin || permissions.includes("Review_InventoryPolicy")}
    canPropose={isSuperAdmin || permissions.includes("Request_InventoryReview")}
    canActivate={isSuperAdmin || permissions.includes("Activate_InventoryPolicy")}
    canManageSettings={isSuperAdmin || permissions.includes("Manage_BranchSettings")}
    canViewStaff={isSuperAdmin || permissions.includes("View_User")}
    canManageStaff={isSuperAdmin || (permissions.includes("View_User") && permissions.includes("Edit_User") && permissions.includes("Manage_BranchSettings"))}
    canManagePools={isSuperAdmin || permissions.includes("Manage_InventoryCostPool")}
    canManage={isSuperAdmin || permissions.includes("Manage_InventoryLocation")} />;
}

function LocationWorkspace({ orgId, token, canManage, canManagePools, canManageSettings, canViewStaff, canManageStaff, canReview, canActivate, canPropose, userId }) {
  const { isDark } = useTheme();
  const api = useMemo(() => inventoryLocationsApi(token, orgId), [token, orgId]);
  const [branch, setBranch] = useState(null);
  const [showPools, setShowPools] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showCounters, setShowCounters] = useState(false);
  const [showStaff, setShowStaff] = useState(false);
  const [showCases, setShowCases] = useState(false);
  const [stockLocation, setStockLocation] = useState(null);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(25);
  const [revision, setRevision] = useState(0);
  const [result, setResult] = useState({ items: [], total: 0, pages: 1 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [form, setForm] = useState(null);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState({ message: "", fields: {} });
  const posting = useRef(false);
  const lifecycle = useRef(null);
  const heading = useRef(null);
  const buttonClass = "px-3 py-2 border rounded-lg cursor-pointer hover:bg-indigo-500/20 focus-visible:outline focus-visible:outline-2 focus-visible:outline-indigo-500 disabled:opacity-40";
  const panel = isDark ? "bg-slate-900 text-slate-100 border-slate-700" : "bg-white text-slate-900 border-slate-200";
  const branchId = branch?.id;

  useEffect(() => {
    const controller = new AbortController();
    lifecycle.current = controller;
    return () => controller.abort();
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError("");
    api.list(branchId, page, limit, controller.signal).then(({ data }) => {
      if (!controller.signal.aborted) setResult(data);
    }).catch((err) => {
      if (!controller.signal.aborted) setError(locationError(err).message);
    }).finally(() => {
      if (!controller.signal.aborted) setLoading(false);
    });
    return () => controller.abort();
  }, [api, branchId, page, limit, revision]);

  const openForm = (kind, parent = null) => {
    setSaveError({ message: "", fields: {} });
    setForm({ code: "", name: "", kind, notes: "", parent });
  };
  const closeForm = () => {
    setForm(null);
    requestAnimationFrame(() => heading.current?.focus());
  };
  const save = async (event) => {
    event.preventDefault();
    if (posting.current || !canManage) return;
    const fields = {};
    const code = form.code.trim().toUpperCase();
    const name = form.name.trim();
    if (!/^[A-Z0-9][A-Z0-9_-]{0,31}$/.test(code)) fields.code = "Use 1–32 letters, numbers, underscores or hyphens; start with a letter or number.";
    if (!name) fields.name = "Enter a name.";
    if (Object.keys(fields).length) {
      setSaveError({ message: "Please check the highlighted fields.", fields });
      return;
    }
    posting.current = true;
    setSaving(true);
    setSaveError({ message: "", fields: {} });
    const controller = lifecycle.current;
    try {
      const payload = { code, name, kind: form.kind, ...(branch ? { parent_id: form.parent?.id || null } : { notes: form.notes.trim() || null }) };
      const { data } = await api.create(branchId, payload, controller.signal);
      if (controller.signal.aborted) return;
      toast.success(`${data.name} created.`);
      closeForm();
      if (!branch) { setBranch(data); setPage(1); }
      else setPage(Math.max(1, Math.ceil((result.total + 1) / limit)));
      setRevision((value) => value + 1);
    } catch (err) {
      if (!controller.signal.aborted) setSaveError(locationError(err));
    } finally {
      posting.current = false;
      if (!controller.signal.aborted) setSaving(false);
    }
  };
  const field = (key, label, maxLength) => (
    <div className="flex flex-col gap-1">
      <label htmlFor={`location-${key}`}>{label}</label>
      <input id={`location-${key}`} autoFocus={key === "code"} required maxLength={maxLength}
        value={form[key]} disabled={saving} aria-invalid={!!saveError.fields[key]}
        aria-describedby={saveError.fields[key] ? `location-${key}-error` : undefined}
        onChange={(e) => setForm({ ...form, [key]: e.target.value })}
        className={`border rounded-lg p-2 ${panel} ${saveError.fields[key] ? "border-red-500" : ""}`} />
      {saveError.fields[key] && <span id={`location-${key}-error`} className="text-red-500">{saveError.fields[key]}</span>}
    </div>
  );

  if (showCases) return <ManagerCases api={api} userId={userId} canActivate={canActivate} onClose={() => setShowCases(false)} />;

  if (showStaff && canViewStaff) return <StaffStoreAssignments key={`${orgId}:${token}:${branch.id}`} api={api} branch={branch} canManage={canManageStaff}
    onClose={() => { setShowStaff(false); requestAnimationFrame(() => heading.current?.focus()); }} />;
  if (showCounters) return <BranchCounters key={branch.id} api={api} branch={branch} canManage={canManageSettings}
    onClose={() => { setShowCounters(false); requestAnimationFrame(() => heading.current?.focus()); }} />;

  if (showSettings) return <BranchSettings key={branch.id} api={api} branch={branch} canManage={canManageSettings}
    onClose={() => { setShowSettings(false); requestAnimationFrame(() => heading.current?.focus()); }} />;

  if (stockLocation) return <LocationStock key={stockLocation.id} api={api} branch={branch} location={stockLocation} canPropose={canPropose} canReview={canReview} userId={userId}
    onClose={() => { setStockLocation(null); requestAnimationFrame(() => heading.current?.focus()); }} />;

  if (showPools) return <CostPoolSetup api={api} branch={branch} orgId={orgId} canManage={canManagePools}
    onClose={() => { setShowPools(false); requestAnimationFrame(() => heading.current?.focus()); }} />;

  return <section aria-label="Branch and location setup" className={`h-full min-h-0 flex flex-col gap-3 p-4 ${panel}`}>
    <header className="shrink-0 flex flex-wrap items-center justify-between gap-3">
      <div>
        <h1 ref={heading} tabIndex={-1} className="text-xl font-bold">{form ? `New ${branch ? form.kind.toLowerCase() : "branch"}` : branch ? `${branch.name} — locations` : "Branches & locations"}</h1>
        <p className="text-sm">Organisation #{orgId} · Setup only; stock and selling prices are unchanged.</p>
      </div>
      {!form && <div className="flex flex-wrap gap-2">
        {canReview && <button type="button" className={buttonClass} onClick={() => setShowCases(true)}>Manager cases</button>}
        {branch && <button type="button" className={buttonClass} onClick={() => setShowSettings(true)}>Trading settings</button>}
        {branch && <button type="button" className={buttonClass} onClick={() => setShowCounters(true)}>Counters</button>}
        {branch && canViewStaff && <button type="button" className={buttonClass} onClick={() => setShowStaff(true)}>Staff working stores</button>}
        <button type="button" className={buttonClass} onClick={() => setShowPools(true)}>{branch ? "Branch cost pool" : "Cost pools"}</button>
        {branch && <button type="button" className={buttonClass} onClick={() => { setBranch(null); setPage(1); }}>Back to branches</button>}
        <button type="button" className={buttonClass} onClick={() => setRevision((value) => value + 1)}>Refresh</button>
        {canManage && (!branch || branch.is_active) && <button type="button" className={`${buttonClass} bg-indigo-600 text-white`} onClick={() => openForm(branch ? "SITE" : "STORE")}>{branch ? "Add site" : "Add branch"}</button>}
      </div>}
    </header>
    {form ? <form onSubmit={save} className="flex-1 min-h-0 flex flex-col gap-3">
      <div className="flex-1 min-h-0 overflow-auto space-y-4">
        <p className="text-sm">{branch ? `Branch: ${branch.code}. ${form.parent ? `Parent: ${form.parent.code} — ${form.parent.name}.` : "A site is the top level of the physical location hierarchy."}` : "A branch is a store or warehouse. After creation, assign its cost pool separately; branches in the same company may share a pool. Bins do not create separate cost pools."}</p>
        {saveError.message && <p role="alert" className="text-red-500">{saveError.message}</p>}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-3xl">
          {field("code", "Code", 32)}{field("name", "Name", 120)}
          {!branch && <><label className="flex flex-col gap-1">Branch type<select value={form.kind} disabled={saving} onChange={(e) => setForm({ ...form, kind: e.target.value })} className={`p-2 border rounded-lg ${panel}`}><option value="STORE">Store</option><option value="WAREHOUSE">Warehouse</option></select></label>
            <label className="flex flex-col gap-1">Notes (optional)<textarea value={form.notes} maxLength={1000} disabled={saving} onChange={(e) => setForm({ ...form, notes: e.target.value })} className={`p-2 border rounded-lg ${panel}`} /></label></>}
        </div>
        <p className="text-sm">Codes are unique within {branch ? "this branch" : "this organisation"}. Editing and inactivation are not available yet; check the details before saving.</p>
      </div>
      <footer className="shrink-0 flex gap-2 border-t pt-3">
        <button type="submit" disabled={saving || !canManage} className={`${buttonClass} bg-indigo-600 text-white`}>{saving ? "Saving…" : "Save"}</button>
        <button type="button" disabled={saving} onClick={closeForm} className={buttonClass}>Cancel</button>
      </footer>
    </form> : <>
      <p className="text-sm shrink-0">{branch ? "Create sites, then add zones within sites and bins within zones. Parent IDs identify locations even when they are on another page." : "Open a branch to manage its physical sites, zones and bins."}</p>
      <div className={`flex-1 min-h-0 overflow-auto border rounded-xl ${panel}`} aria-busy={loading}>
        {loading ? <p role="status" className="p-4">Loading…</p> : error ? <div role="alert" className="p-4"><p>{error}</p><button type="button" className={buttonClass} onClick={() => setRevision((value) => value + 1)}>Retry</button></div> : !result.items.length ? <p className="p-4">No {branch ? "locations in this branch" : "branches in this organisation"} yet.</p> :
          <table className="w-full text-sm text-left">
            <thead className={`sticky top-0 ${panel}`}><tr>{["Code / ID", "Name", "Type", ...(branch ? ["Parent ID"] : []), "Status", "Actions"].map((title) => <th key={title} scope="col" className="p-3 whitespace-nowrap">{title}</th>)}</tr></thead>
            <tbody>{result.items.map((item) => <tr key={item.id} className="border-t">
              <td className="p-3 font-mono whitespace-nowrap">{item.code} / #{item.id}</td><td className="p-3 min-w-40">{item.name}</td><td className="p-3">{item.kind}</td>
              {branch && <td className="p-3">{item.parent_id ? `#${item.parent_id}` : "—"}</td>}
              <td className="p-3">{item.is_active ? "Active" : "Inactive"}</td>
              <td className="p-3"><div className="flex flex-wrap gap-2">{branch && <button type="button" className={buttonClass} onClick={() => setStockLocation(item)}>View stock<span className="sr-only"> at {item.name}</span></button>}{!branch ? <button type="button" className={buttonClass} onClick={() => { setBranch(item); setPage(1); }}>Open locations<span className="sr-only"> for {item.name}</span></button> : canManage && branch.is_active && item.is_active && item.kind !== "BIN" ? <button type="button" className={buttonClass} onClick={() => openForm(item.kind === "SITE" ? "ZONE" : "BIN", item)}>Add {item.kind === "SITE" ? "zone" : "bin"}<span className="sr-only"> to {item.name}</span></button> : null}</div></td>
            </tr>)}</tbody>
          </table>}
      </div>
      <div className="shrink-0"><PaginationToolbar page={page} pageSize={limit} totalPages={loading || error ? 1 : result.pages} totalCount={loading || error ? 0 : result.total} onPageChange={setPage} onPageSizeChange={(value) => { setLimit(value); setPage(1); }} isDark={isDark} /></div>
    </>}
  </section>;
}
