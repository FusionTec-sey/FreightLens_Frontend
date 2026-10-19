import React, { useEffect, useMemo, useState } from 'react';
import {
    Plus,
    Pencil,
    Trash2,
    Shield,
    Users as UserIcon,
    Building2,
    X,
    Eye,
    EyeOff,
    ShoppingBag,
    ShoppingCart,
    Package,
    CheckSquare,
    AlertTriangle,
    Truck,
    Layers,
    FolderArchive,
    BarChart3,
    Settings as SettingsIcon,
    Search,
    CheckCircle2,
    ChevronDown,
    ChevronRight,
    Lock,
    Sliders,
    Award,
    AlertCircle,
    RotateCcw,
} from 'lucide-react';
import axios from 'axios';
import { toast } from 'react-toastify';
import { useAuth } from '../../../context/AuthContext';

// Column-visibility permissions left over from an older scheme that nothing
// enforces. Hiding them keeps the role screen honest: a checkbox that changes
// nothing is worse than no checkbox.
//
// Anything listed here is also stripped when a role is opened for editing, so a
// name must only appear here while it is genuinely inert. View_ContainerNo,
// View_Status and View_Material were removed from this list when they became
// the view half of a container field class -- leaving them would have made
// read-only access unreachable, and would have silently dropped the grant the
// next time anyone edited the role.
const REDUNDANT_VIEW_PERMISSIONS = new Set([
    'View_container_no',
    'View_ContainerId',
    'View_ReportId',
    'View_status',
    'View_ContainerType',
    'View_weight',
    'View_location',
    'View_EmptyAt',
    'View_EmptyDate',
    'View_arrivalDate',
    'View_ArrivalDate',
    'View_UnloadedAtDock',
    'View_InBound',
    'View_OutBound'
]);

const PERMISSION_SECTIONS = [
    {
        id: 'commercial_privacy',
        title: 'Commercial Privacy & Confidentiality',
        description: 'Protect vendor identities, importing legal entities, confidential internal notes, pricing, and demurrage penalties from floor staff',
        icon: Lock,
        badgeColor: 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/60 dark:text-rose-300 dark:border-rose-800',
        match: (n) => /^(View_Supplier|View_Consignee|View_consignee_name|View_PersonalNote|View_Demurrage|View_Tax|Manage_Financials)$/i.test(n)
    },
    {
        id: 'screen_clutter',
        title: 'Screen Clutter & Reference Columns',
        description: 'Control optional reference columns (PO number matching, vessel name, shipping line) to keep warehouse and mobile screens clean',
        icon: Sliders,
        badgeColor: 'bg-sky-50 text-sky-700 border-sky-200 dark:bg-sky-950/60 dark:text-sky-300 dark:border-sky-800',
        match: (n) => /^(View_PoNo|View_Vessal|View_vessel_name|View_Shipping)$/i.test(n)
    },
    {
        id: 'container_edits',
        title: 'Container Field-Level Access',
        description: 'Who may see and who may change each group of container fields. Granting View alone shows the field locked; granting Edit allows changing it; granting neither hides it entirely',
        icon: Layers,
        badgeColor: 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-800',
        match: (n) =>
            /^Edit_(ContainerNo|Status|ArrivalDate|EmptyDate|InBound|OutBound|UnloadedAtDock|EmptyAt|Supplier|Consignee|Tax|PersonalNote|FreeDays|Demurrage|Material|ContainerType|PoNo|Vessal|Shipping|Submit)$/i.test(n)
            // Field classes on the container detail screen, both halves.
            || /^(View|Edit)_(ContainerTax|ContainerMilestone|ContainerNote)$/i.test(n)
            || /^View_(ContainerNo|Status|Material)$/i.test(n)
    },
    {
        id: 'container_actions',
        title: 'Container & B/L Operations',
        description: 'Container creation, editing, deletion, mail dispatch, and Bills of Lading management',
        icon: Truck,
        badgeColor: 'bg-cyan-50 text-cyan-700 border-cyan-200 dark:bg-cyan-950/60 dark:text-cyan-300 dark:border-cyan-800',
        match: (n) => /^(Add|Edit|Delete|View|Mail)_Container$/i.test(n) || /^(Add|Edit|Delete|View)_BillOfLanding$/i.test(n) || /^(View|Edit)_BL$/i.test(n)
    },
    {
        id: 'store_requests',
        title: 'Store Requests',
        description: 'Requisition drafting, sourcing submission, and store withdrawal',
        icon: ShoppingBag,
        badgeColor: 'bg-indigo-50 text-indigo-700 border-indigo-200 dark:bg-indigo-950/60 dark:text-indigo-300 dark:border-indigo-800',
        match: (n) => /StoreRequest/i.test(n)
    },
    {
        id: 'sourcing_quotes',
        title: 'Sourcing, RFQs & Vendor Quotations',
        description: 'Control vendor RFQ dispatch, price bidding, quotation recording, quote comparisons, and purchase order awards to maintain confidentiality from requestors',
        icon: Award,
        badgeColor: 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-800',
        match: (n) => /^(Send_RFQ|View_VendorQuote|Add_VendorQuote|Compare_Quote|Approve_Quote|Issue_PO)$/i.test(n) || /_RFQ$/i.test(n)
    },
    {
        id: 'order_templates',
        title: 'Order & Sourcing Templates',
        description: 'Create, modify, and utilize reusable order blueprints and product line templates across Sourcing and Purchase Orders',
        icon: Layers,
        badgeColor: 'bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950/60 dark:text-purple-300 dark:border-purple-800',
        match: (n) => /OrderTemplate/i.test(n)
    },
    {
        id: 'orders_procurement',
        title: 'Purchase Orders & Payments',
        description: 'Purchase orders generation, approval, line items, and milestone payments',
        icon: ShoppingCart,
        badgeColor: 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/60 dark:text-blue-300 dark:border-blue-800',
        match: (n) => /^(Add|Edit|Delete|View)_Order$/i.test(n) || /Payment/i.test(n)
    },
    {
        id: 'packing_lists',
        title: 'Packing Lists',
        description: 'Supplier packing lists, cargo manifests, and line-item imports',
        icon: Package,
        badgeColor: 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-800',
        match: (n) => /PackingList/i.test(n)
    },
    {
        id: 'goods_receiving',
        title: 'Goods Receiving & Inspection',
        description: 'Warehouse cargo arrival verification, physical tally, and receiving submission',
        icon: CheckSquare,
        badgeColor: 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-800',
        match: (n) => /Receipt/i.test(n)
    },
    {
        id: 'damage_defects',
        title: 'Damage & Defects',
        description: 'Container / cargo damage reporting, evidence photos, and resolution closure',
        icon: AlertTriangle,
        badgeColor: 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/60 dark:text-rose-300 dark:border-rose-800',
        match: (n) => /Defect/i.test(n)
    },
    {
        id: 'documents',
        title: 'Documents & File Attachments',
        description: 'RustFS blob storage: access, upload, and remove supporting documents, invoices, and evidence',
        icon: FolderArchive,
        badgeColor: 'bg-teal-50 text-teal-700 border-teal-200 dark:bg-teal-950/60 dark:text-teal-300 dark:border-teal-800',
        match: (n) => /OrderDocument|Upload_Document|Delete_Document|View_Document|Edit_Document/i.test(n)
    },
    {
        id: 'inventory',
        title: 'Inventory & Product Master',
        description: 'Product catalog, category hierarchy, stock adjustments, and inventory analytics',
        icon: Package,
        badgeColor: 'bg-green-50 text-green-700 border-green-200 dark:bg-green-950/60 dark:text-green-300 dark:border-green-800',
        match: (n) => /Product|ProductCategory|Adjust_Stock|Export_Inventory|InventoryReport/i.test(n)
    },
    {
        id: 'reports_analytics',
        title: 'Reporting, Document Templates & Operational Registers',
        description: 'Configure access to print layouts, HTML/CSS templates, parametric operational registers, and transactional screen printing',
        icon: BarChart3,
        badgeColor: 'bg-orange-50 text-orange-700 border-orange-200 dark:bg-orange-950/60 dark:text-orange-300 dark:border-orange-800',
        match: (n) => /Dashboard|Report|DailyWork|Operational|Print_/i.test(n)
    },
    {
        id: 'tenant_console',
        title: 'Tenant & Multi-Organization Console',
        description: 'Multi-tenant administration: configure subsidiary tenants, company legal entities, prefixes, modules, and cross-company tenant isolation',
        icon: Building2,
        badgeColor: 'bg-violet-50 text-violet-700 border-violet-200 dark:bg-violet-950/60 dark:text-violet-300 dark:border-violet-800',
        match: (n) => /Tenant|Organisation|Organization/i.test(n)
    },
    {
        id: 'administration',
        title: 'System Administration & Security',
        description: 'User access accounts, role security configuration, navigation menu design, reference data, and settings',
        icon: SettingsIcon,
        badgeColor: 'bg-slate-100 text-slate-800 border-slate-300 dark:bg-slate-800 dark:text-slate-200 dark:border-slate-700',
        match: (n) => /User|Role|Setting|RefData|Menu/i.test(n)
    },
];

function formatPermName(name) {
    if (!name) return '';
    if (name === 'View_TenantConsole') return 'View Tenant Console (Company & Org Administration)';
    if (name === 'Manage_TenantConsole') return 'Manage Tenant Console (Entities, Prefixes & Modules)';
    if (name === 'View_Supplier') return 'View Supplier (Vendor Confidentiality)';
    if (name === 'View_Consignee') return 'View Consignee (Importing Entity)';
    if (name === 'View_consignee_name') return 'View Consignee Name in B/L';
    if (name === 'View_PersonalNote') return 'View Internal / Confidential Notes';
    if (name === 'Edit_PersonalNote') return 'Edit Internal / Confidential Notes';
    if (name === 'Manage_Financials') return 'Manage Financials (Confidential Pricing & Cost)';
    if (name === 'View_Demurrage') return 'View Demurrage Penalties & Free Days';
    if (name === 'Edit_Demurrage') return 'Edit Demurrage / Free Days Override';
    if (name === 'View_Tax') return 'View Tax / Customs Exemption Status';
    if (name === 'Edit_Tax') return 'Edit Tax / Customs Exemption Status';
    if (name === 'View_PoNo') return 'View PO Number Column';
    if (name === 'Edit_PoNo') return 'Edit PO Number';
    if (name === 'View_Vessal') return 'View Vessel Column';
    if (name === 'View_vessel_name') return 'View Vessel Name in B/L';
    if (name === 'View_Shipping') return 'View Shipping Mode / Line Column';
    if (name === 'Edit_ContainerNo') return 'Edit Container Number';
    if (name === 'Edit_Status') return 'Edit Container Status';
    if (name === 'Edit_ArrivalDate') return 'Edit Arrival Date (Demurrage Clock)';
    if (name === 'Edit_EmptyDate') return 'Edit Empty Date (Demurrage Clock)';
    if (name === 'Edit_InBound') return 'Edit Inbound Gate Date';
    if (name === 'Edit_OutBound') return 'Edit Outbound Gate Date';
    if (name === 'Edit_UnloadedAtDock') return 'Edit Unloaded at Port Date';
    if (name === 'Edit_EmptyAt') return 'Edit Empty Location';
    if (name === 'Edit_Supplier') return 'Edit Assigned Supplier';
    if (name === 'Edit_Consignee') return 'Edit Assigned Consignee';
    if (name === 'Edit_ContainerType') return 'Edit Container Type';
    if (name === 'Edit_Material') return 'Edit Materials / Cargo Tags';
    if (name === 'Upload_Document') return 'Upload Document (Add)';
    if (name === 'Delete_Document') return 'Delete Document (Remove)';
    if (name === 'View_OrderDocument') return 'View Central Documents (Access)';
    if (name === 'View_Document') return 'View Container Documents (Access)';
    if (name === 'Edit_Document') return 'Edit Container Documents (Add/Update)';
    if (name === 'View_Product') return 'View Product Catalog';
    if (name === 'Add_Product') return 'Add New Product';
    if (name === 'Edit_Product') return 'Edit Product Details';
    if (name === 'Delete_Product') return 'Delete Product';
    if (name === 'Adjust_Stock') return 'Adjust Stock Level';
    if (name === 'View_ProductCategory') return 'View Product Categories';
    if (name === 'Manage_ProductCategory') return 'Manage Categories';
    if (name === 'View_InventoryReport') return 'View Inventory Reports';
    if (name === 'Export_Inventory') return 'Export Inventory Data';
    return name
        .replace(/_/g, ' ')
        .replace(/([a-z])([A-Z])/g, '$1 $2')
        .replace(/\bBL\b/g, 'B/L')
        .replace(/\bPo No\b/i, 'PO Number')
        .replace(/\bContainer No\b/i, 'Container Number')
        .replace(/\bVessal\b/i, 'Vessel')
        .replace(/\bBill Of Landing\b/i, 'Bill of Lading');
}

function getActionBadge(name) {
    if (/^View/i.test(name)) {
        return { label: 'VIEW', bg: 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-800' };
    }
    if (/^Add/i.test(name)) {
        return { label: 'CREATE', bg: 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800' };
    }
    if (/^Edit/i.test(name)) {
        return { label: 'EDIT', bg: 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800' };
    }
    if (/^Delete|Withdraw/i.test(name)) {
        return { label: 'DELETE', bg: 'bg-red-50 text-red-700 border-red-200 dark:bg-red-950/40 dark:text-red-300 dark:border-red-800' };
    }
    if (/^Submit|Verify|Resolve/i.test(name)) {
        return { label: 'ACTION', bg: 'bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950/40 dark:text-purple-300 dark:border-purple-800' };
    }
    return { label: 'ACCESS', bg: 'bg-gray-100 text-gray-700 border-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:border-gray-700' };
}

// Highlight matched search query text
function highlightMatch(text, query) {
    if (!text) return '';
    if (!query || !query.trim()) return text;
    const q = query.trim();
    const regex = new RegExp(`(${q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
    const parts = String(text).split(regex);
    return parts.map((part, i) =>
        regex.test(part) ? (
            <mark key={i} className="bg-amber-200 dark:bg-amber-800/80 text-gray-900 dark:text-white px-0.5 rounded-xs font-semibold">
                {part}
            </mark>
        ) : (
            part
        )
    );
}

// Color-coded role privilege badges for users table
function getRoleBadgeStyle(roleName) {
    const lower = String(roleName).toLowerCase();
    if (lower.includes('admin') || lower.includes('root') || lower.includes('director')) {
        return 'bg-red-50 text-red-700 border-red-200 dark:bg-red-950/50 dark:text-red-300 dark:border-red-800';
    }
    if (lower.includes('finance') || lower.includes('audit') || lower.includes('account')) {
        return 'bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950/50 dark:text-purple-300 dark:border-purple-800';
    }
    if (lower.includes('coordinator') || lower.includes('manager') || lower.includes('lead') || lower.includes('specialist')) {
        return 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/50 dark:text-blue-300 dark:border-blue-800';
    }
    if (lower.includes('view') || lower.includes('read') || lower.includes('guest')) {
        return 'bg-gray-100 text-gray-700 border-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:border-gray-700';
    }
    return 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/50 dark:text-emerald-300 dark:border-emerald-800';
}

// Compute cascaded implied permissions based on action hierarchy
function getCascadedPermissions(permName, allPermissions) {
    if (!permName) return [];
    const implied = [];
    const findByName = (targetName) => allPermissions.find(p => p.name.toLowerCase() === targetName.toLowerCase());

    // 1. Delete_* implies Edit_* and View_* of the same resource
    if (/^Delete_/i.test(permName)) {
        const resource = permName.slice(7);
        const editTarget = findByName(`Edit_${resource}`);
        if (editTarget) implied.push({ id: editTarget.id, reason: `Required by ${permName}` });
        const viewTarget = findByName(`View_${resource}`);
        if (viewTarget) implied.push({ id: viewTarget.id, reason: `Required by ${permName}` });
    }

    // 2. Edit_* implies View_* of the same resource
    if (/^Edit_/i.test(permName)) {
        const resource = permName.slice(5);
        const viewTarget = findByName(`View_${resource}`);
        if (viewTarget) implied.push({ id: viewTarget.id, reason: `Required by ${permName}` });
    }

    // 3. Add_* implies View_* of the same resource
    if (/^Add_/i.test(permName)) {
        const resource = permName.slice(4);
        const viewTarget = findByName(`View_${resource}`);
        if (viewTarget) implied.push({ id: viewTarget.id, reason: `Required by ${permName}` });
    }

    // 4. Submit_*, Verify_*, Resolve_* implies View_*
    if (/^(Submit|Verify|Resolve)_/i.test(permName)) {
        const match = permName.match(/^(Submit|Verify|Resolve)_(.+)$/i);
        if (match) {
            const resource = match[2];
            const viewTarget = findByName(`View_${resource}`);
            if (viewTarget) implied.push({ id: viewTarget.id, reason: `Required by ${permName}` });
        }
    }

    // 5. Manage_* implies View_*
    if (/^Manage_/i.test(permName)) {
        const resource = permName.slice(7);
        const viewTarget = findByName(`View_${resource}`);
        if (viewTarget) implied.push({ id: viewTarget.id, reason: `Required by ${permName}` });
    }

    // 6. Cross-module cascades
    if (permName === 'Generate_Report') {
        const vt = findByName('View_Report');
        if (vt) implied.push({ id: vt.id, reason: 'Required by Generate_Report' });
    }
    if (permName === 'Export_Inventory' || permName === 'Adjust_Stock') {
        const vt = findByName('View_Product');
        if (vt) implied.push({ id: vt.id, reason: `Required by ${permName}` });
    }
    if (permName === 'Issue_PO') {
        const vt = findByName('View_Order');
        if (vt) implied.push({ id: vt.id, reason: 'Required by Issue_PO' });
    }
    if (permName === 'Approve_Quote' || permName === 'Compare_Quote') {
        const vt = findByName('View_VendorQuote');
        if (vt) implied.push({ id: vt.id, reason: `Required by ${permName}` });
    }
    if (permName === 'Upload_Document' || permName === 'Delete_Document') {
        const vt = findByName('View_OrderDocument') || findByName('View_Document');
        if (vt) implied.push({ id: vt.id, reason: `Required by ${permName}` });
    }

    return implied;
}

function Setting({ currentUser }) {
    const { isSuperAdmin } = useAuth();

    const [organisations, setOrganisations] = useState([]);
    const [roles, setRoles] = useState([]);
    const [users, setUsers] = useState([]);
    const [activeAccessTab, setActiveAccessTab] = useState('users');
    const [rolePermissions, setRolePermissions] = useState([]);

    // Delete confirmation state (inline row-level, replaces window.confirm)
    const [confirmDeleteUserId, setConfirmDeleteUserId] = useState(null);
    const [confirmDeleteRoleId, setConfirmDeleteRoleId] = useState(null);

    // Modal states
    const [showAddUserModal, setShowAddUserModal] = useState(false);
    const [editingUserId, setEditingUserId] = useState(null);
    const [showUserPassword, setShowUserPassword] = useState(false);
    const [userRoleSearch, setUserRoleSearch] = useState('');
    const [newUser, setNewUser] = useState({
        name: '',
        password: '',
        org_ids: [],
        org_roles: {}
    });

    const [showRoleModal, setShowRoleModal] = useState(false);
    const [editingRoleId, setEditingRoleId] = useState(null);
    const [newRoleName, setNewRoleName] = useState('');
    const [originalRoleName, setOriginalRoleName] = useState('');
    const [newRolePermissions, setNewRolePermissions] = useState([]);
    const [originalRolePermissions, setOriginalRolePermissions] = useState([]);
    const [showUnsavedWarning, setShowUnsavedWarning] = useState(false);
    const [permSearch, setPermSearch] = useState('');
    const [collapsedSections, setCollapsedSections] = useState({});

    const toggleSectionCollapse = (secId) => {
        setCollapsedSections(prev => ({
            ...prev,
            [secId]: !prev[secId]
        }));
    };

    const selectAllInSection = (permIds) => {
        setNewRolePermissions(prev => Array.from(new Set([...prev, ...permIds])));
    };

    const clearSection = (permIds) => {
        setNewRolePermissions(prev => prev.filter(id => !permIds.includes(id)));
    };

    const visibleRolePermissions = useMemo(() => {
        return rolePermissions.filter(p => !REDUNDANT_VIEW_PERMISSIONS.has(p.name));
    }, [rolePermissions]);

    // Map of impliedPermId -> Set of reason strings
    const impliedPermissionsMap = useMemo(() => {
        const map = new Map();
        newRolePermissions.forEach(permId => {
            const perm = rolePermissions.find(p => p.id === permId);
            if (!perm) return;
            const cascades = getCascadedPermissions(perm.name, rolePermissions);
            cascades.forEach(({ id, reason }) => {
                if (!map.has(id)) {
                    map.set(id, new Set());
                }
                map.get(id).add(reason);
            });
        });
        return map;
    }, [newRolePermissions, rolePermissions]);

    // Set of all active visible permissions (explicitly selected + auto-implied)
    const effectiveGrantedPermIds = useMemo(() => {
        const set = new Set(newRolePermissions);
        impliedPermissionsMap.forEach((_, id) => set.add(id));
        return set;
    }, [newRolePermissions, impliedPermissionsMap]);

    const isRoleDirty = useMemo(() => {
        if (newRoleName.trim() !== originalRoleName.trim()) return true;
        if (newRolePermissions.length !== originalRolePermissions.length) return true;
        const origSet = new Set(originalRolePermissions);
        return newRolePermissions.some(id => !origSet.has(id));
    }, [newRoleName, originalRoleName, newRolePermissions, originalRolePermissions]);

    const selectAllAll = () => {
        setNewRolePermissions(visibleRolePermissions.map(p => p.id));
    };

    const clearAllAll = () => {
        setNewRolePermissions([]);
    };

    const setAllSectionsCollapsed = (collapsed) => {
        const next = {};
        PERMISSION_SECTIONS.forEach(s => { next[s.id] = collapsed; });
        next['other'] = collapsed;
        setCollapsedSections(next);
    };

    const categorizedPermissions = useMemo(() => {
        const query = permSearch.trim().toLowerCase();
        const result = [];
        const assignedIds = new Set();

        PERMISSION_SECTIONS.forEach(sec => {
            const matched = visibleRolePermissions.filter(p => {
                if (assignedIds.has(p.id)) return false;
                const matches = sec.match(p.name);
                if (matches) assignedIds.add(p.id);
                return matches;
            });

            const filtered = query
                ? matched.filter(p =>
                    p.name.toLowerCase().includes(query) ||
                    (p.descriptionp || p.description || '').toLowerCase().includes(query) ||
                    formatPermName(p.name).toLowerCase().includes(query)
                )
                : matched;

            if (filtered.length > 0 || !query) {
                result.push({
                    ...sec,
                    permissions: filtered,
                    totalCount: matched.length
                });
            }
        });

        const unassigned = visibleRolePermissions.filter(p => !assignedIds.has(p.id));
        if (unassigned.length > 0) {
            const filtered = query
                ? unassigned.filter(p =>
                    p.name.toLowerCase().includes(query) ||
                    (p.descriptionp || p.description || '').toLowerCase().includes(query) ||
                    formatPermName(p.name).toLowerCase().includes(query)
                )
                : unassigned;

            if (filtered.length > 0 || !query) {
                result.push({
                    id: 'other',
                    title: 'Other & Miscellaneous Permissions',
                    description: 'Additional system and custom resource permissions',
                    icon: Shield,
                    badgeColor: 'bg-gray-100 text-gray-800 border-gray-300 dark:bg-gray-800 dark:text-gray-200',
                    permissions: filtered,
                    totalCount: unassigned.length
                });
            }
        }

        return result;
    }, [visibleRolePermissions, permSearch]);

    const canEdit = useMemo(() => {
        if (!currentUser) return true;
        if (currentUser.is_superuser || currentUser.isRoot) return true;
        const userRoles = (currentUser.roles || []).map(r => String(r).toLowerCase());
        const userPerms = currentUser.permissions || [];
        if (userRoles.length === 0 && userPerms.length === 0) return true;
        const isAdmin = userRoles.some(r => ['super_admin', 'administrator', 'admin', 'system_admin'].includes(r));
        const hasEditPerm = userPerms.some(p => ['Edit_User', 'Edit_Role', 'Manage_TenantConsole', 'Manage_Roles'].includes(p));
        return isAdmin || hasEditPerm;
    }, [currentUser]);

    async function getOrganisations() {
        try {
            const res = await axios.get(`${process.env.REACT_APP_NETWORK}/getOrganisations`, {
                headers: { Authorization: `Bearer ${localStorage.getItem('token')}`, "skip_zrok_interstitial": "true" }
            });
            setOrganisations(res.data || []);
        } catch (e) {
            console.error("Failed to fetch organisations:", e);
            // Swallowing this left the screen showing stale data with no sign
            // anything had failed -- a role created but never listed, until the
            // next sign-in happened to reload it.
            toast.error(e.response?.data?.detail || "Could not refresh the list of companies.");
            throw e;
        }
    }

    async function getRoles() {
        try {
            const res = await axios.get(`${process.env.REACT_APP_NETWORK}/getRoles`, {
                headers: { Authorization: `Bearer ${localStorage.getItem('token')}`, "skip_zrok_interstitial": "true" }
            });
            setRoles(res.data || []);
        } catch (e) {
            console.error("Failed to fetch roles:", e);
            // Swallowing this left the screen showing stale data with no sign
            // anything had failed -- a role created but never listed, until the
            // next sign-in happened to reload it.
            toast.error(e.response?.data?.detail || "Could not refresh the list of roles.");
            throw e;
        }
    }

    async function getUsers() {
        try {
            const res = await axios.get(`${process.env.REACT_APP_NETWORK}/getUsers`, {
                headers: { Authorization: `Bearer ${localStorage.getItem('token')}`, "skip_zrok_interstitial": "true" }
            });
            setUsers(res.data || []);
        } catch (e) {
            console.error("Failed to fetch users:", e);
            // Swallowing this left the screen showing stale data with no sign
            // anything had failed -- a role created but never listed, until the
            // next sign-in happened to reload it.
            toast.error(e.response?.data?.detail || "Could not refresh the list of users.");
            throw e;
        }
    }

    async function getRolePermissions() {
        try {
            const res = await axios.get(`${process.env.REACT_APP_NETWORK}/getRolePermissions`, {
                headers: { Authorization: `Bearer ${localStorage.getItem('token')}`, "skip_zrok_interstitial": "true" }
            });
            setRolePermissions(res.data || []);
        } catch (e) {
            console.error("Failed to fetch permissions:", e);
            // Swallowing this left the screen showing stale data with no sign
            // anything had failed -- a role created but never listed, until the
            // next sign-in happened to reload it.
            toast.error(e.response?.data?.detail || "Could not refresh the list of permissions.");
            throw e;
        }
    }

    useEffect(() => {
        // Each is independent: one failing should not leave the others unloaded.
        getOrganisations().catch(() => {});
        getRoles().catch(() => {});
        getUsers().catch(() => {});
        getRolePermissions().catch(() => {});
    }, []);

    // USER ACTIONS
    async function handleAddUser(e) {
        if (e) e.preventDefault();
        const usernameVal = newUser.name ? newUser.name.trim() : '';
        if (!usernameVal) {
            toast.error("Please enter username");
            return;
        }
        if (!editingUserId && (!newUser.password || !newUser.password.trim())) {
            toast.error("Please enter password");
            return;
        }

        try {
            const orgIdsToSend = newUser.org_ids || [];
            if (orgIdsToSend.length === 0) {
                toast.error("Select at least one organization");
                return;
            }
            const payload = {
                username: usernameVal,
                name: usernameVal,
                password: newUser.password ? newUser.password.trim() : undefined
            };

            let userId = editingUserId;
            if (editingUserId) {
                await axios.put(`${process.env.REACT_APP_NETWORK}/updateUser/${editingUserId}`, payload, {
                    headers: { Authorization: `Bearer ${localStorage.getItem('token')}`, "skip_zrok_interstitial": "true" }
                });
            } else {
                const created = await axios.post(`${process.env.REACT_APP_NETWORK}/addUser`, {
                    ...payload,
                    org_ids: orgIdsToSend,
                    org_roles: orgIdsToSend.map(orgId => ({
                        org_id: orgId,
                        role_ids: newUser.org_roles[orgId] || []
                    }))
                }, {
                    headers: { Authorization: `Bearer ${localStorage.getItem('token')}`, "skip_zrok_interstitial": "true" }
                });
                userId = created.data.id;
            }

            if (editingUserId) {
                await axios.put(`${process.env.REACT_APP_NETWORK}/users/${userId}/org-roles`, {
                    assignments: orgIdsToSend.map(orgId => ({
                        org_id: orgId,
                        role_ids: newUser.org_roles[orgId] || []
                    }))
                }, {
                    headers: { Authorization: `Bearer ${localStorage.getItem('token')}`, "skip_zrok_interstitial": "true" }
                });
            }
            toast.success(editingUserId ? "User updated successfully!" : "User added successfully!");

            setShowAddUserModal(false);
            setEditingUserId(null);
            setUserRoleSearch('');
            setNewUser({ name: '', password: '', org_ids: [], org_roles: {} });
            await getUsers().catch(() => {});
        } catch (err) {
            console.error("Failed to save user:", err);
            let detail = err.response?.data?.detail;
            if (Array.isArray(detail)) {
                detail = detail.map(d => d.msg || JSON.stringify(d)).join(", ");
            } else if (typeof detail === 'object' && detail !== null) {
                detail = JSON.stringify(detail);
            }
            toast.error(detail || "Failed to save user.");
        }
    }

    function startEditUser(user) {
        let initialOrgIds = [];
        if (Array.isArray(user.org_ids) && user.org_ids.length > 0) {
            initialOrgIds = [...user.org_ids];
        } else if (user.org_id) {
            initialOrgIds = [user.org_id];
        } else {
            initialOrgIds = [1];
        }

        const orgRoles = Object.fromEntries(
            (user.org_roles || []).map(assignment => [assignment.org_id, assignment.role_ids || []])
        );

        setEditingUserId(user.id);
        setUserRoleSearch('');
        setNewUser({
            name: user.username || user.name || '',
            password: '',
            org_ids: initialOrgIds,
            org_roles: orgRoles
        });
        setShowAddUserModal(true);
    }

    async function executeDeleteUser(userId) {
        try {
            await axios.delete(`${process.env.REACT_APP_NETWORK}/deleteUser/${userId}`, {
                headers: { Authorization: `Bearer ${localStorage.getItem('token')}`, "skip_zrok_interstitial": "true" }
            });
            toast.success("User deleted successfully!");
            setConfirmDeleteUserId(null);
            await getUsers().catch(() => {});
        } catch (err) {
            console.error("Failed to delete user:", err);
            toast.error("Failed to delete user.");
        }
    }

    function toggleOrgSelection(orgId) {
        setNewUser(prev => {
            const currentList = Array.isArray(prev.org_ids) ? [...prev.org_ids] : [];
            const exists = currentList.includes(orgId);
            if (exists && currentList.length === 1) {
                return prev;
            }
            let next;
            if (exists) {
                next = currentList.filter(id => id !== orgId);
            } else {
                next = [...currentList, orgId];
            }
            if (next.length === 0) {
                next = [orgId];
            }
            return {
                ...prev,
                org_ids: next,
                org_roles: exists
                    ? Object.fromEntries(Object.entries(prev.org_roles).filter(([id]) => Number(id) !== orgId))
                    : { ...prev.org_roles, [orgId]: [] }
            };
        });
    }

    function toggleOrgRole(orgId, roleId) {
        setNewUser(prev => {
            const selected = prev.org_roles[orgId] || [];
            const roleIds = selected.includes(roleId)
                ? selected.filter(id => id !== roleId)
                : [...selected, roleId];
            return { ...prev, org_roles: { ...prev.org_roles, [orgId]: roleIds } };
        });
    }

    // ROLE ACTIONS
    const openAddRoleModal = () => {
        setEditingRoleId(null);
        setNewRoleName('');
        setOriginalRoleName('');
        setNewRolePermissions([]);
        setOriginalRolePermissions([]);
        setPermSearch('');
        setShowUnsavedWarning(false);
        // Default all sections collapsed for clean initial view
        const collapsed = {};
        PERMISSION_SECTIONS.forEach(s => { collapsed[s.id] = true; });
        collapsed['other'] = true;
        setCollapsedSections(collapsed);
        setShowRoleModal(true);
    };

    function startEditRole(role) {
        setEditingRoleId(role.id);
        setNewRoleName(role.name || '');
        setOriginalRoleName(role.name || '');
        // Filter out redundant basic view permissions from selection list so UI stays clean
        const visibleIds = (role.permissions || []).filter(id => {
            const p = rolePermissions.find(rp => rp.id === id);
            return !p || !REDUNDANT_VIEW_PERMISSIONS.has(p.name);
        });
        setNewRolePermissions(visibleIds);
        setOriginalRolePermissions(visibleIds);
        setPermSearch('');
        setShowUnsavedWarning(false);

        // Auto-expand sections that have at least one active permission, collapse others
        const rolePermSet = new Set(visibleIds);
        const collapsed = {};
        const assignedIds = new Set();
        PERMISSION_SECTIONS.forEach(sec => {
            const secPerms = visibleRolePermissions.filter(p => {
                if (assignedIds.has(p.id)) return false;
                const m = sec.match(p.name);
                if (m) assignedIds.add(p.id);
                return m;
            });
            const hasActive = secPerms.some(p => rolePermSet.has(p.id));
            collapsed[sec.id] = !hasActive;
        });
        const otherPerms = visibleRolePermissions.filter(p => !assignedIds.has(p.id));
        collapsed['other'] = !otherPerms.some(p => rolePermSet.has(p.id));
        setCollapsedSections(collapsed);
        setShowRoleModal(true);
    }

    async function executeDeleteRole(roleId) {
        try {
            await axios.delete(`${process.env.REACT_APP_NETWORK}/deleteRole/${roleId}`, {
                headers: { Authorization: `Bearer ${localStorage.getItem('token')}`, "skip_zrok_interstitial": "true" }
            });
            toast.success("Role deleted successfully!");
            setConfirmDeleteRoleId(null);
            await getRoles().catch(() => {});
        } catch (err) {
            console.error("Failed to delete role:", err);
            toast.error("Failed to delete role.");
        }
    }

    async function handleAddRole(e) {
        if (e) e.preventDefault();
        if (!newRoleName.trim()) {
            toast.error("Please enter role name");
            return;
        }

        try {
            // Combine explicitly selected permissions + implied cascade permissions
            const allActivePermIds = Array.from(new Set([
                ...newRolePermissions,
                ...Array.from(impliedPermissionsMap.keys())
            ]));

            // Auto-grant basic operational view permissions behind the scenes if container or BL access is granted
            const hasContainerAccess = allActivePermIds.some(id => {
                const p = rolePermissions.find(rp => rp.id === id);
                return p && /Container|BL|BillOfLanding/i.test(p.name);
            });

            let finalPermissions = [...allActivePermIds];
            if (hasContainerAccess) {
                const autoPermIds = rolePermissions
                    .filter(p => REDUNDANT_VIEW_PERMISSIONS.has(p.name))
                    .map(p => p.id);
                finalPermissions = Array.from(new Set([...finalPermissions, ...autoPermIds]));
            }

            const payload = {
                name: newRoleName.trim(),
                permissions: finalPermissions,
                ...(isSuperAdmin ? { org_id: null } : {})
            };

            if (editingRoleId) {
                await axios.put(`${process.env.REACT_APP_NETWORK}/updateRole/${editingRoleId}`, payload, {
                    headers: { Authorization: `Bearer ${localStorage.getItem('token')}`, "skip_zrok_interstitial": "true" }
                });
                toast.success("Role updated successfully!");
            } else {
                await axios.post(`${process.env.REACT_APP_NETWORK}/addRole`, payload, {
                    headers: { Authorization: `Bearer ${localStorage.getItem('token')}`, "skip_zrok_interstitial": "true" }
                });
                toast.success("Role added successfully!");
            }

            setShowRoleModal(false);
            setShowUnsavedWarning(false);
            setEditingRoleId(null);
            setNewRoleName('');
            setOriginalRoleName('');
            setNewRolePermissions([]);
            setOriginalRolePermissions([]);
            // Awaited, so the role is in the list the moment the form closes and
            // is there to tick when assigning a user.
            await getRoles().catch(() => {});
        } catch (err) {
            console.error("Failed to save role:", err);
            toast.error(err.response?.data?.detail || "Failed to save role.");
        }
    }

    function togglePermission(permId) {
        const perm = rolePermissions.find(p => p.id === permId);
        if (!perm) return;

        // If currently implied by another permission and NOT directly selected, inform the user
        if (impliedPermissionsMap.has(permId) && !newRolePermissions.includes(permId)) {
            const reasons = Array.from(impliedPermissionsMap.get(permId)).join(", ");
            toast.info(`"${formatPermName(perm.name)}" is auto-granted (${reasons}). Turn off the parent permission to remove it.`);
            return;
        }

        if (newRolePermissions.includes(permId)) {
            // Turning OFF an explicit permission
            let next = newRolePermissions.filter(id => id !== permId);

            // If a View_* permission is turned off, also turn off all dependent actions for that resource
            if (/^View_/i.test(perm.name)) {
                const resource = perm.name.slice(5);
                const dependentIds = rolePermissions
                    .filter(p => new RegExp(`^(Add|Edit|Delete|Submit|Verify|Resolve)_${resource}$`, 'i').test(p.name))
                    .map(p => p.id);
                const willRemove = dependentIds.filter(id => next.includes(id));
                if (willRemove.length > 0) {
                    next = next.filter(id => !dependentIds.includes(id));
                    toast.info(`Removed ${formatPermName(perm.name)} and dependent actions for ${resource}.`);
                }
            }
            setNewRolePermissions(next);
        } else {
            // Turning ON an explicit permission
            setNewRolePermissions(prev => [...prev, permId]);
        }
    }

    const handleCloseRoleModal = () => {
        if (isRoleDirty) {
            setShowUnsavedWarning(true);
        } else {
            setShowRoleModal(false);
            setShowUnsavedWarning(false);
        }
    };

    return (
        <div className="flex h-full min-h-0 min-w-0 w-full flex-col gap-3 overflow-hidden bg-gray-50 p-3 text-gray-900 dark:bg-gray-950 dark:text-gray-100 sm:p-4">
            {/* PAGE HEADER */}
            <div className="shrink-0">
                <h1 className="text-xl font-semibold tracking-tight text-gray-900 dark:text-white sm:text-2xl">User Access & Role Permissions</h1>
                <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">Manage accounts, organization access, and role permissions.</p>
            </div>

            <div className="flex shrink-0 gap-1 rounded-lg border border-gray-200 bg-white p-1 dark:border-gray-800 dark:bg-gray-900 2xl:hidden" aria-label="Access settings">
                <button type="button" aria-pressed={activeAccessTab === 'users'} onClick={() => setActiveAccessTab('users')} className={`flex-1 rounded-md px-3 py-2 text-sm font-medium ${activeAccessTab === 'users' ? 'bg-blue-600 text-white' : 'text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800'}`}>
                    Users ({users.length})
                </button>
                <button type="button" aria-pressed={activeAccessTab === 'roles'} onClick={() => setActiveAccessTab('roles')} className={`flex-1 rounded-md px-3 py-2 text-sm font-medium ${activeAccessTab === 'roles' ? 'bg-blue-600 text-white' : 'text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800'}`}>
                    Roles ({roles.length})
                </button>
            </div>

            {/* Both tables fit on wide screens; smaller viewports show one full-width table. */}
            <div className="grid min-h-0 min-w-0 flex-1 grid-cols-1 gap-3 2xl:grid-cols-2">
                
                {/* USERS TABLE */}
                <section className={`${activeAccessTab === 'users' ? 'flex' : 'hidden'} min-h-0 min-w-0 flex-col overflow-hidden rounded-xl border border-gray-200 bg-white p-3 text-gray-900 dark:border-gray-800 dark:bg-gray-900 dark:text-gray-100 sm:p-4 2xl:flex`}>
                    <div className="flex shrink-0 flex-wrap items-center justify-between gap-2 pb-3">
                        <div className="flex items-center space-x-2.5">
                            <div className="p-2 rounded-lg bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-800">
                                <UserIcon size={18} />
                            </div>
                            <div>
                                <h2 className="text-base font-semibold text-gray-900 dark:text-white">User Accounts</h2>
                                <p className="text-xs text-gray-500 dark:text-gray-400">{users.length} account{users.length === 1 ? '' : 's'} · organization and role access</p>
                            </div>
                        </div>
                        {canEdit && (
                            <button
                                onClick={() => {
                                    setEditingUserId(null);
                                    setUserRoleSearch('');
                                    const firstOrgId = organisations[0]?.id;
                                    setNewUser({
                                        name: '',
                                        password: '',
                                        org_ids: firstOrgId ? [firstOrgId] : [],
                                        org_roles: firstOrgId ? { [firstOrgId]: [] } : {}
                                    });
                                    setShowAddUserModal(true);
                                }}
                                className="inline-flex min-h-9 items-center gap-1.5 rounded-lg bg-blue-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-blue-700"
                            >
                                <Plus size={15} /> Add User
                            </button>
                        )}
                    </div>

                    <div className="min-h-0 min-w-0 flex-1 overflow-auto rounded-lg border border-gray-200 dark:border-gray-800">
                        <table className="w-full min-w-[600px] border-collapse bg-white text-left text-sm text-gray-900 dark:bg-gray-900 dark:text-gray-100">
                            <thead className="sticky top-0 z-10 border-b border-gray-200 bg-gray-100 text-xs text-gray-700 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300">
                                <tr>
                                    <th className="p-2.5 font-semibold w-10 text-center text-gray-700 dark:text-gray-300">ID</th>
                                    <th className="p-2.5 font-semibold w-32 text-gray-900 dark:text-white">Username</th>
                                    <th className="p-2.5 font-semibold text-gray-700 dark:text-gray-300">Organization Binding</th>
                                    <th className="p-2.5 font-semibold text-gray-700 dark:text-gray-300">Roles</th>
                                    {canEdit && <th className="min-w-[112px] p-2.5 text-center font-semibold text-gray-700 dark:text-gray-300">Actions</th>}
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-200 dark:divide-gray-800 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100">
                                {users.length === 0 ? (
                                    <tr><td colSpan={canEdit ? 5 : 4} className="py-8 text-center text-sm text-gray-500 dark:text-gray-400">No users configured</td></tr>
                                ) : users.map(user => {
                                    return (
                                        <tr key={user.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition">
                                            <td className="p-2.5 text-center font-mono font-medium text-gray-500 dark:text-gray-400">{user.id}</td>
                                            <td className="p-2.5 font-semibold text-gray-900 dark:text-white">
                                                {user.username || user.name || `User #${user.id}`}
                                            </td>
                                            <td className="p-2.5 text-gray-600 dark:text-gray-300">
                                                {(user.org_names || [user.org_name]).filter(Boolean).join(", ") || "—"}
                                            </td>
                                            <td className="p-2.5 text-gray-600 dark:text-gray-300">
                                                <div className="flex flex-wrap gap-1">
                                                    {(!user.org_roles || user.org_roles.length === 0) ? (
                                                        <span className="text-gray-400 italic">No roles</span>
                                                    ) : (
                                                        user.org_roles.flatMap(assignment =>
                                                            (assignment.role_ids || []).map(roleId => ({
                                                                key: `${assignment.org_id}-${roleId}`,
                                                                name: roles.find(role => role.id === roleId)?.name || `Role #${roleId}`
                                                            }))
                                                        ).map(role => (
                                                            <span
                                                                key={role.key}
                                                                className={`inline-flex items-center rounded border px-1.5 py-0.5 text-xs font-medium ${getRoleBadgeStyle(role.name)}`}
                                                            >
                                                                {role.name}
                                                            </span>
                                                        ))
                                                    )}
                                                </div>
                                            </td>
                                            {canEdit && (
                                                <td className="p-2.5 text-center">
                                                    {confirmDeleteUserId === user.id ? (
                                                        <div className="flex items-center gap-1.5 justify-center animate-in fade-in duration-100">
                                                            <span className="text-xs font-medium text-red-600 dark:text-red-400">Delete?</span>
                                                            <button
                                                                onClick={() => executeDeleteUser(user.id)}
                                                                className="rounded bg-red-600 px-2 py-1 text-xs font-semibold text-white hover:bg-red-700"
                                                            >
                                                                Yes
                                                            </button>
                                                            <button
                                                                onClick={() => setConfirmDeleteUserId(null)}
                                                                className="rounded bg-gray-200 px-2 py-1 text-xs font-medium text-gray-700 hover:bg-gray-300 dark:bg-gray-700 dark:text-gray-200 dark:hover:bg-gray-600"
                                                            >
                                                                No
                                                            </button>
                                                        </div>
                                                    ) : (
                                                        <div className="flex justify-center gap-1.5">
                                                            <button onClick={() => startEditUser(user)} className="inline-flex h-8 w-8 items-center justify-center rounded-md text-blue-600 hover:bg-blue-50 dark:text-blue-400 dark:hover:bg-blue-950" title="Edit User" aria-label={`Edit ${user.username || user.name || `user ${user.id}`}`}>
                                                                <Pencil size={16} />
                                                            </button>
                                                            <button onClick={() => setConfirmDeleteUserId(user.id)} className="inline-flex h-8 w-8 items-center justify-center rounded-md text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950" title="Delete User" aria-label={`Delete ${user.username || user.name || `user ${user.id}`}`}>
                                                                <Trash2 size={16} />
                                                            </button>
                                                        </div>
                                                    )}
                                                </td>
                                            )}
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </section>

                {/* SECURITY ROLES TABLE */}
                <section className={`${activeAccessTab === 'roles' ? 'flex' : 'hidden'} min-h-0 min-w-0 flex-col overflow-hidden rounded-xl border border-gray-200 bg-white p-3 text-gray-900 dark:border-gray-800 dark:bg-gray-900 dark:text-gray-100 sm:p-4 2xl:flex`}>
                    <div className="flex shrink-0 flex-wrap items-center justify-between gap-2 pb-3">
                        <div className="flex items-center space-x-2.5">
                            <div className="p-2 rounded-lg bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800">
                                <Shield size={18} />
                            </div>
                            <div>
                                <h2 className="text-base font-semibold text-gray-900 dark:text-white">Security Roles</h2>
                                <p className="text-xs text-gray-500 dark:text-gray-400">{roles.length} role{roles.length === 1 ? '' : 's'} · edit to manage permissions</p>
                            </div>
                        </div>
                        {canEdit && (
                            <button
                                onClick={openAddRoleModal}
                                className="inline-flex min-h-9 items-center gap-1.5 rounded-lg bg-blue-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-blue-700"
                            >
                                <Plus size={15} /> Add Role
                            </button>
                        )}
                    </div>

                    <div className="min-h-0 min-w-0 flex-1 overflow-auto rounded-lg border border-gray-200 dark:border-gray-800">
                        <table className="w-full min-w-[560px] border-collapse bg-white text-left text-sm text-gray-900 dark:bg-gray-900 dark:text-gray-100">
                            <thead className="sticky top-0 z-10 border-b border-gray-200 bg-gray-100 text-xs text-gray-700 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300">
                                <tr>
                                    <th className="p-2.5 font-semibold w-10 text-center text-gray-700 dark:text-gray-300">ID</th>
                                    <th className="p-2.5 font-semibold w-36 text-gray-900 dark:text-white">Role Name</th>
                                    <th className="p-2.5 font-semibold text-gray-700 dark:text-gray-300">Permissions Summary</th>
                                    {canEdit && <th className="min-w-[112px] p-2.5 text-center font-semibold text-gray-700 dark:text-gray-300">Actions</th>}
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-200 dark:divide-gray-800 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100">
                                {roles.length === 0 ? (
                                    <tr><td colSpan={canEdit ? 4 : 3} className="py-8 text-center text-sm text-gray-500 dark:text-gray-400">No roles configured</td></tr>
                                ) : roles.map(role => {
                                    const permIds = role.permissions || [];
                                    const visibleCount = permIds.filter(id => {
                                        const p = rolePermissions.find(rp => rp.id === id);
                                        return p && !REDUNDANT_VIEW_PERMISSIONS.has(p.name);
                                    }).length;

                                    const permNames = permIds.map(id => {
                                        const p = rolePermissions.find(rp => rp.id === id);
                                        return p ? p.name : '';
                                    });
                                    const hasAdmin = permNames.some(n => /User|Role|Tenant|Organisation/i.test(n));
                                    const hasFinancial = permNames.some(n => /Financial|Tax|Demurrage|Supplier/i.test(n));
                                    const hasDelete = permNames.some(n => /^Delete_/i.test(n));
                                    const hasWrite = permNames.some(n => /^(Add|Edit)_/i.test(n));
                                    const isReadOnly = permNames.length > 0 && !hasWrite && !hasDelete && !hasAdmin;

                                    return (
                                        <tr key={role.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition">
                                            <td className="p-2.5 text-center font-mono font-medium text-gray-500 dark:text-gray-400">{role.id}</td>
                                            <td className="p-2.5 font-semibold capitalize text-gray-900 dark:text-white">
                                                {role.name || `Role #${role.id}`}
                                            </td>
                                            <td className="p-2.5">
                                                <div className="flex items-center gap-1.5 flex-wrap">
                                                    <span className="font-medium text-gray-700 dark:text-gray-300">
                                                        {visibleCount} permission{visibleCount === 1 ? '' : 's'}
                                                    </span>
                                                    {hasAdmin && (
                                                        <span className="rounded border border-purple-200 bg-purple-50 px-1.5 py-0.5 text-[10px] font-semibold text-purple-700 dark:border-purple-800 dark:bg-purple-950/50 dark:text-purple-300">
                                                            ADMIN
                                                        </span>
                                                    )}
                                                    {hasFinancial && (
                                                        <span className="rounded border border-rose-200 bg-rose-50 px-1.5 py-0.5 text-[10px] font-semibold text-rose-700 dark:border-rose-800 dark:bg-rose-950/50 dark:text-rose-300">
                                                            FINANCIAL
                                                        </span>
                                                    )}
                                                    {hasDelete && (
                                                        <span className="rounded border border-red-200 bg-red-50 px-1.5 py-0.5 text-[10px] font-semibold text-red-700 dark:border-red-800 dark:bg-red-950/50 dark:text-red-300">
                                                            DELETE
                                                        </span>
                                                    )}
                                                    {isReadOnly && (
                                                        <span className="rounded border border-blue-200 bg-blue-50 px-1.5 py-0.5 text-[10px] font-semibold text-blue-700 dark:border-blue-800 dark:bg-blue-950/50 dark:text-blue-300">
                                                            VIEW ONLY
                                                        </span>
                                                    )}
                                                </div>
                                            </td>
                                            {canEdit && (
                                                <td className="p-2.5 text-center">
                                                    {confirmDeleteRoleId === role.id ? (
                                                        <div className="flex items-center gap-1.5 justify-center animate-in fade-in duration-100">
                                                            <span className="text-xs font-medium text-red-600 dark:text-red-400">Delete?</span>
                                                            <button
                                                                onClick={() => executeDeleteRole(role.id)}
                                                                className="rounded bg-red-600 px-2 py-1 text-xs font-semibold text-white hover:bg-red-700"
                                                            >
                                                                Yes
                                                            </button>
                                                            <button
                                                                onClick={() => setConfirmDeleteRoleId(null)}
                                                                className="rounded bg-gray-200 px-2 py-1 text-xs font-medium text-gray-700 hover:bg-gray-300 dark:bg-gray-700 dark:text-gray-200 dark:hover:bg-gray-600"
                                                            >
                                                                No
                                                            </button>
                                                        </div>
                                                    ) : (
                                                        <div className="flex justify-center gap-1.5">
                                                            <button onClick={() => startEditRole(role)} className="inline-flex h-8 w-8 items-center justify-center rounded-md text-blue-600 hover:bg-blue-50 dark:text-blue-400 dark:hover:bg-blue-950" title="Edit Role & Permissions" aria-label={`Edit ${role.name || `role ${role.id}`}`}>
                                                                <Pencil size={16} />
                                                            </button>
                                                            <button onClick={() => setConfirmDeleteRoleId(role.id)} className="inline-flex h-8 w-8 items-center justify-center rounded-md text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950" title="Delete Role" aria-label={`Delete ${role.name || `role ${role.id}`}`}>
                                                                <Trash2 size={16} />
                                                            </button>
                                                        </div>
                                                    )}
                                                </td>
                                            )}
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </section>
            </div>

            {/* ADD / EDIT USER MODAL */}
            {showAddUserModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-2 sm:p-4">
                    <div className="flex h-[calc(100dvh-1rem)] w-full max-w-4xl flex-col overflow-hidden rounded-xl border border-gray-200 bg-white text-gray-900 shadow-xl dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100 sm:h-[calc(100dvh-2rem)] sm:max-h-[760px]">
                        <div className="flex shrink-0 items-center justify-between gap-3 border-b border-gray-200 px-4 py-3 dark:border-gray-800 sm:px-5">
                            <div className="flex items-center space-x-2">
                                <UserIcon size={18} className="text-blue-600 dark:text-blue-400" />
                                <div>
                                    <h3 className="text-base font-semibold text-gray-900 dark:text-white">{editingUserId ? "Edit User" : "Add User"}</h3>
                                    <p className="text-xs text-gray-500 dark:text-gray-400">Account details and organization access</p>
                                </div>
                            </div>
                            <button
                                type="button"
                                onClick={() => setShowAddUserModal(false)}
                                aria-label="Close user form"
                                className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white transition cursor-pointer"
                            >
                                <X size={18} />
                            </button>
                        </div>
                        
                        <form onSubmit={handleAddUser} className="flex min-h-0 flex-1 flex-col">
                          <div className="grid min-h-0 flex-1 grid-cols-1 gap-5 overflow-y-auto p-4 sm:p-5 md:grid-cols-2 md:gap-6 md:overflow-hidden">
                            <div className="space-y-4 md:flex md:min-h-0 md:flex-col md:space-y-0 md:gap-4">
                            <div>
                                <label className="mb-1.5 block text-sm font-medium text-gray-800 dark:text-gray-200">Username *</label>
                                <input
                                    type="text"
                                    required
                                    value={newUser.name}
                                    onChange={(e) => setNewUser(prev => ({ ...prev, name: e.target.value }))}
                                    className="w-full rounded-lg border border-gray-300 bg-white px-3.5 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-800 dark:text-white"
                                    placeholder="e.g. parth"
                                />
                            </div>

                            <div>
                                <label className="mb-1.5 block text-sm font-medium text-gray-800 dark:text-gray-200">
                                    Password {!editingUserId && "*"}
                                </label>
                                {editingUserId && <p className="mb-1.5 text-xs text-gray-500 dark:text-gray-400">Leave blank to keep the current password.</p>}
                                <div className="relative flex items-center">
                                    <input
                                        type={showUserPassword ? "text" : "password"}
                                        required={!editingUserId}
                                        value={newUser.password}
                                        onChange={(e) => setNewUser(prev => ({ ...prev, password: e.target.value }))}
                                        className="w-full rounded-lg border border-gray-300 bg-white py-2 pl-3.5 pr-10 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-800 dark:text-white"
                                        placeholder="Enter password"
                                    />
                                    <button
                                        type="button"
                                        aria-label={showUserPassword ? "Hide password" : "Show password"}
                                        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 focus:outline-none p-1 rounded transition cursor-pointer"
                                        onClick={(e) => {
                                            e.preventDefault();
                                            e.stopPropagation();
                                            setShowUserPassword(prev => !prev);
                                        }}
                                    >
                                        {showUserPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                                    </button>
                                </div>
                            </div>

                            {/* MULTI-ORGANIZATION / TENANT SELECTION */}
                            <div className="md:flex md:min-h-0 md:flex-1 md:flex-col">
                                <label className="mb-1 block text-sm font-medium text-gray-800 dark:text-gray-200">
                                    Organization / Tenant Access *
                                </label>
                                <p className="mb-2 text-xs text-gray-500 dark:text-gray-400">Only organizations you can manage appear here.</p>
                                
                                <div className="space-y-2.5 rounded-lg border border-gray-200 bg-gray-50 p-3 dark:border-gray-700 dark:bg-gray-800/40 md:min-h-0 md:flex-1 md:overflow-y-auto">
                                    {organisations.map(org => {
                                        const isSelected = newUser.org_ids.includes(org.id);
                                        return (
                                            <label key={org.id} className={`flex items-center space-x-2.5 rounded-lg p-2 text-sm cursor-pointer transition ${isSelected ? 'bg-blue-50 dark:bg-blue-950/60 text-blue-900 dark:text-blue-200 border border-blue-200 dark:border-blue-800' : 'hover:bg-white dark:hover:bg-gray-700/50 text-gray-700 dark:text-gray-300'}`}>
                                                <input
                                                    type="checkbox"
                                                    checked={isSelected}
                                                    onChange={() => toggleOrgSelection(org.id)}
                                                    className="w-4 h-4 rounded border-gray-300 dark:border-gray-600 text-blue-600 focus:ring-blue-500"
                                                />
                                                <span className="font-medium text-gray-800 dark:text-gray-200">{org.display_name || org.name}</span>
                                            </label>
                                        );
                                    })}
                                </div>
                            </div>
                            </div>

                            {/* ROLE SELECTION PER ORGANIZATION */}
                            <div className="min-w-0 md:flex md:min-h-0 md:flex-col">
                                <div className="flex justify-between items-center mb-1.5">
                                    <label className="block text-sm font-medium text-gray-800 dark:text-gray-200">
                                        Assign Roles by Organization
                                    </label>
                                    <span className="text-xs text-gray-500 dark:text-gray-400">
                                        {Object.values(newUser.org_roles).reduce((total, ids) => total + ids.length, 0)} selected
                                    </span>
                                </div>

                                <div className="relative mb-2">
                                    <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
                                    <input
                                        type="text"
                                        value={userRoleSearch}
                                        onChange={(e) => setUserRoleSearch(e.target.value)}
                                        placeholder="Search roles..."
                                        className="w-full rounded-lg border border-gray-300 bg-gray-50 py-2 pl-8 pr-7 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-800 dark:text-white"
                                    />
                                    {userRoleSearch && (
                                        <button
                                            type="button"
                                            onClick={() => setUserRoleSearch('')}
                                            className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 cursor-pointer"
                                        >
                                            <X size={12} />
                                        </button>
                                    )}
                                </div>

                                <div className="space-y-3 rounded-lg border border-gray-200 bg-gray-50 p-2.5 dark:border-gray-700 dark:bg-gray-800/40 md:min-h-0 md:flex-1 md:overflow-y-auto">
                                    {newUser.org_ids.map(orgId => {
                                        const org = organisations.find(item => item.id === orgId);
                                        const availableRoles = roles.filter(role =>
                                            (role.org_id == null || role.org_id === orgId) &&
                                            (!userRoleSearch.trim() || role.name.toLowerCase().includes(userRoleSearch.toLowerCase()))
                                        );
                                        return (
                                            <div key={orgId} className="space-y-1.5">
                                                <p className="text-sm font-semibold text-gray-700 dark:text-gray-200">
                                                    {org?.display_name || org?.name || `Organization #${orgId}`}
                                                </p>
                                                {availableRoles.map(role => {
                                                    const isChecked = (newUser.org_roles[orgId] || []).includes(role.id);
                                                    return (
                                                        <label key={`${orgId}-${role.id}`} className={`flex items-center space-x-2.5 rounded-lg p-2 text-sm cursor-pointer transition ${isChecked ? 'bg-blue-50 dark:bg-blue-950/60 text-blue-900 dark:text-blue-200 border border-blue-200 dark:border-blue-800' : 'hover:bg-white dark:hover:bg-gray-700/50 text-gray-700 dark:text-gray-300'}`}>
                                                            <input
                                                                type="checkbox"
                                                                checked={isChecked}
                                                                onChange={() => toggleOrgRole(orgId, role.id)}
                                                                className="w-4 h-4 rounded border-gray-300 dark:border-gray-600 text-blue-600 focus:ring-blue-500"
                                                            />
                                                            <span className="font-medium capitalize text-gray-800 dark:text-gray-200">{role.name}</span>
                                                        </label>
                                                    );
                                                })}
                                                {availableRoles.length === 0 && <p className="py-2 text-xs text-gray-400">No matching roles</p>}
                                            </div>
                                        );
                                    })}
                                    {newUser.org_ids.length === 0 && <p className="text-center py-4 text-xs text-gray-400">Select an organization first</p>}
                                </div>
                            </div>

                          </div>
                            <div className="flex shrink-0 justify-end gap-2 border-t border-gray-200 bg-white px-4 py-3 dark:border-gray-800 dark:bg-gray-900 sm:px-5">
                                <button
                                    type="button"
                                    onClick={() => setShowAddUserModal(false)}
                                    className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
                                >
                                    {editingUserId ? "Update User" : "Add User"}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* ADD / EDIT ROLE MODAL */}
            {showRoleModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-2 sm:p-4">
                    <div className="flex max-h-[calc(100dvh-1rem)] w-full max-w-5xl flex-col overflow-hidden rounded-xl border border-gray-200 bg-white text-gray-900 shadow-xl dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100 sm:max-h-[calc(100dvh-2rem)]">
                        {/* Header */}
                        <div className="flex shrink-0 items-center justify-between gap-3 border-b border-gray-200 px-4 py-3 dark:border-gray-800 sm:px-5">
                            <div className="flex items-center space-x-2.5">
                                <div className="hidden rounded-lg bg-emerald-100 p-2 text-emerald-600 dark:bg-emerald-950/60 dark:text-emerald-400 sm:block">
                                    <Shield size={20} />
                                </div>
                                <div>
                                    <h3 className="text-base font-semibold text-gray-900 dark:text-white">
                                        {editingRoleId ? "Edit Role" : "Add Role"}
                                    </h3>
                                    <p className="text-xs text-gray-500 dark:text-gray-400">
                                        Name the role and choose its permissions.
                                    </p>
                                </div>
                            </div>
                            <div className="flex items-center gap-3">
                                <span className="hidden items-center rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 sm:inline-flex">
                                    {effectiveGrantedPermIds.size} / {visibleRolePermissions.length} active
                                </span>
                                <button
                                    type="button"
                                    onClick={handleCloseRoleModal}
                                    aria-label="Close role form"
                                    className="p-1.5 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-800 text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white transition cursor-pointer"
                                >
                                    <X size={18} />
                                </button>
                            </div>
                        </div>

                        {/* Unsaved Changes Warning Banner */}
                        {showUnsavedWarning && (
                            <div className="flex shrink-0 flex-wrap items-center justify-between gap-3 border-b border-amber-200 bg-amber-50 px-4 py-3 text-xs text-amber-900 dark:border-amber-800 dark:bg-amber-950/60 dark:text-amber-200 sm:px-5">
                                <div className="flex items-center gap-2">
                                    <AlertCircle size={16} className="text-amber-600 dark:text-amber-400 shrink-0" />
                                    <span>You have unsaved changes to this role. Are you sure you want to discard them?</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setShowUnsavedWarning(false);
                                            setShowRoleModal(false);
                                        }}
                                        className="px-2.5 py-1 bg-amber-600 text-white rounded-lg font-semibold hover:bg-amber-700 transition cursor-pointer"
                                    >
                                        Discard & Close
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setShowUnsavedWarning(false)}
                                        className="px-2.5 py-1 border border-amber-300 dark:border-amber-700 rounded-lg hover:bg-amber-100 dark:hover:bg-amber-900 transition cursor-pointer"
                                    >
                                        Keep Editing
                                    </button>
                                </div>
                            </div>
                        )}

                        {/* Scrollable Form Body */}
                        <form onSubmit={handleAddRole} className="flex min-h-0 flex-1 flex-col">
                          <div className="min-h-0 flex-1 space-y-5 overflow-y-auto p-4 sm:p-5">
                            {/* Role Name */}
                            <div>
                                <label className="mb-1.5 block text-sm font-medium text-gray-800 dark:text-gray-200">
                                    Role Name *
                                </label>
                                <input
                                    type="text"
                                    required
                                    value={newRoleName}
                                    onChange={(e) => setNewRoleName(e.target.value)}
                                    className="w-full rounded-xl border border-gray-300 bg-white px-3.5 py-2.5 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 dark:border-gray-600 dark:bg-gray-800 dark:text-white"
                                    placeholder="e.g. Sourcing Specialist, Warehouse Officer, Auditor"
                                />
                                {isSuperAdmin && (
                                    <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                                        Roles are shared across organisations. Choose organisation access when assigning the role to a user.
                                    </p>
                                )}
                            </div>


                            {/* Permissions Categorized Container */}
                            <div className="space-y-3">
                                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-gray-200 dark:border-gray-700 pb-3">
                                    <div>
                                        <h4 className="text-sm font-bold text-gray-900 dark:text-white">
                                            Permissions
                                        </h4>
                                        <p className="text-xs text-gray-500 dark:text-gray-400">
                                            Edit, Delete, and Manage can automatically grant View access.
                                        </p>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <button
                                            type="button"
                                            onClick={selectAllAll}
                                            className="text-xs font-semibold px-2.5 py-1 rounded-lg border border-emerald-300 dark:border-emerald-700 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 transition cursor-pointer"
                                        >
                                            Select All
                                        </button>
                                        <button
                                            type="button"
                                            onClick={clearAllAll}
                                            className="text-xs font-semibold px-2.5 py-1 rounded-lg border border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition cursor-pointer"
                                        >
                                            Clear All
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => setAllSectionsCollapsed(false)}
                                            className="text-xs font-medium text-blue-600 dark:text-blue-400 hover:underline px-1 cursor-pointer"
                                        >
                                            Expand All
                                        </button>
                                        <span className="text-gray-300 dark:text-gray-700">|</span>
                                        <button
                                            type="button"
                                            onClick={() => setAllSectionsCollapsed(true)}
                                            className="text-xs font-medium text-blue-600 dark:text-blue-400 hover:underline px-1 cursor-pointer"
                                        >
                                            Collapse All
                                        </button>
                                    </div>
                                </div>

                                {/* Search permissions with clear button */}
                                <div className="relative">
                                    <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
                                    <input
                                        type="text"
                                        value={permSearch}
                                        onChange={(e) => setPermSearch(e.target.value)}
                                        placeholder="Search permissions"
                                        className="w-full rounded-xl border border-gray-300 bg-gray-50 py-2 pl-9 pr-8 text-sm text-gray-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500 dark:border-gray-600 dark:bg-gray-800/80 dark:text-white dark:focus:bg-gray-800"
                                    />
                                    {permSearch && (
                                        <button
                                            type="button"
                                            onClick={() => setPermSearch('')}
                                            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 cursor-pointer"
                                        >
                                            <X size={14} />
                                        </button>
                                    )}
                                </div>

                                {/* Categorized Sections List */}
                                <div className="space-y-4 pt-2">
                                    {categorizedPermissions.map(sec => {
                                        const SecIcon = sec.icon || Shield;
                                        const secPermIds = sec.permissions.map(p => p.id);
                                        const activeCount = secPermIds.filter(id => effectiveGrantedPermIds.has(id)).length;
                                        const isAllSelected = secPermIds.length > 0 && activeCount === secPermIds.length;
                                        const isNoneSelected = activeCount === 0;
                                        const isCollapsed = Boolean(collapsedSections[sec.id]);

                                        return (
                                            <div
                                                key={sec.id}
                                                className={`rounded-xl border transition-all ${
                                                    isAllSelected
                                                        ? 'border-emerald-300 dark:border-emerald-800/80 bg-emerald-50/20 dark:bg-emerald-950/10'
                                                        : activeCount > 0
                                                        ? 'border-blue-200 dark:border-blue-900/60 bg-blue-50/10 dark:bg-blue-950/10'
                                                        : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900'
                                                }`}
                                            >
                                                {/* Section Header */}
                                                <div className="flex flex-wrap items-center justify-between gap-2 p-3 sm:px-4 bg-gray-50/60 dark:bg-gray-800/40 border-b border-gray-100 dark:border-gray-800 rounded-t-xl">
                                                    <button
                                                        type="button"
                                                        className="flex min-w-0 flex-1 items-center gap-2.5 text-left"
                                                        onClick={() => toggleSectionCollapse(sec.id)}
                                                        aria-expanded={!isCollapsed}
                                                    >
                                                        <span className={`rounded-lg border p-1.5 ${sec.badgeColor}`}>
                                                            <SecIcon size={16} />
                                                        </span>
                                                        <span>
                                                            <span className="flex items-center gap-2">
                                                                <span className="text-sm font-semibold text-gray-900 dark:text-white">
                                                                    {sec.title}
                                                                </span>
                                                                <span
                                                                    className={`px-2 py-0.5 rounded-full text-[10px] font-semibold border ${
                                                                        isAllSelected
                                                                            ? 'bg-emerald-100 dark:bg-emerald-900/60 text-emerald-800 dark:text-emerald-200 border-emerald-300 dark:border-emerald-700'
                                                                            : activeCount > 0
                                                                            ? 'bg-blue-100 dark:bg-blue-900/60 text-blue-800 dark:text-blue-200 border-blue-200 dark:border-blue-700'
                                                                            : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 border-gray-200 dark:border-gray-700'
                                                                    }`}
                                                                >
                                                                    {activeCount} / {sec.totalCount} active
                                                                </span>
                                                            </span>
                                                            {sec.description && (
                                                                <span className="block text-xs text-gray-500 dark:text-gray-400">
                                                                    {sec.description}
                                                                </span>
                                                            )}
                                                        </span>
                                                    </button>

                                                    {/* Section Actions */}
                                                    <div className="flex items-center gap-2">
                                                        <button
                                                            type="button"
                                                            onClick={() => selectAllInSection(secPermIds)}
                                                            className="rounded border border-emerald-300 px-2 py-1 text-xs font-semibold text-emerald-700 hover:bg-emerald-50 dark:border-emerald-700 dark:text-emerald-300 dark:hover:bg-emerald-950/60"
                                                        >
                                                            Select Section
                                                        </button>
                                                        <button
                                                            type="button"
                                                            onClick={() => clearSection(secPermIds)}
                                                            disabled={isNoneSelected}
                                                            className="rounded border border-gray-200 px-2 py-1 text-xs font-semibold text-gray-600 hover:bg-gray-100 disabled:opacity-40 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800"
                                                        >
                                                            Clear
                                                        </button>
                                                        <button
                                                            type="button"
                                                            onClick={() => toggleSectionCollapse(sec.id)}
                                                            className="p-1 rounded text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 cursor-pointer"
                                                            aria-label={isCollapsed ? "Expand section" : "Collapse section"}
                                                        >
                                                            {isCollapsed ? <ChevronRight size={16} /> : <ChevronDown size={16} />}
                                                        </button>
                                                    </div>
                                                </div>

                                                {/* Section Body (Grid of Permissions with Lock Indicators & Search Highlighting) */}
                                                {!isCollapsed && (
                                                    <div className="grid grid-cols-1 gap-2 p-3 sm:grid-cols-2 sm:p-4">
                                                        {sec.permissions.map(p => {
                                                            const isExplicit = newRolePermissions.includes(p.id);
                                                            const impliedReasons = impliedPermissionsMap.get(p.id);
                                                            const isImplied = !isExplicit && Boolean(impliedReasons && impliedReasons.size > 0);
                                                            const badge = getActionBadge(p.name);
                                                            const readableName = formatPermName(p.name);
                                                            const desc = p.descriptionp || p.description;

                                                            return (
                                                                <label
                                                                    key={p.id}
                                                                    onClick={(e) => {
                                                                        if (isImplied) {
                                                                            e.preventDefault();
                                                                            const reasons = Array.from(impliedReasons).join(", ");
                                                                            toast.info(`"${readableName}" is auto-granted (${reasons}). Disable the parent permission to remove.`);
                                                                        }
                                                                    }}
                                                                    className={`flex cursor-pointer select-none items-start gap-2.5 rounded-xl border p-2.5 text-sm transition ${
                                                                        isImplied
                                                                            ? 'bg-blue-50/70 text-blue-900 border-blue-300 dark:bg-blue-950/30 dark:text-blue-200 dark:border-blue-700 shadow-2xs'
                                                                            : isExplicit
                                                                            ? 'bg-emerald-50/70 text-emerald-900 border-emerald-300 dark:bg-emerald-950/30 dark:text-emerald-200 dark:border-emerald-700 shadow-2xs'
                                                                            : 'hover:bg-gray-50 text-gray-700 border-gray-200 dark:border-gray-800 dark:text-gray-300 dark:hover:bg-gray-800/50'
                                                                    }`}
                                                                >
                                                                    <div className="mt-0.5 shrink-0">
                                                                        {isImplied ? (
                                                                            <div
                                                                                className="w-4 h-4 rounded bg-blue-600 text-white flex items-center justify-center shadow-xs"
                                                                                title={`Auto-granted by: ${Array.from(impliedReasons).join(', ')}`}
                                                                            >
                                                                                <Lock size={10} />
                                                                            </div>
                                                                        ) : (
                                                                            <input
                                                                                type="checkbox"
                                                                                checked={isExplicit}
                                                                                onChange={() => togglePermission(p.id)}
                                                                                className="w-4 h-4 rounded border-gray-300 dark:border-gray-600 text-emerald-600 focus:ring-emerald-500 cursor-pointer"
                                                                            />
                                                                        )}
                                                                    </div>
                                                                    <div className="flex-1 min-w-0">
                                                                        <div className="flex items-center gap-1.5 flex-wrap">
                                                                            <span className="font-semibold text-gray-900 dark:text-white truncate">
                                                                                {highlightMatch(readableName, permSearch)}
                                                                            </span>
                                                                            <span className={`text-[9px] px-1.5 py-0.2 rounded border font-mono font-bold ${badge.bg}`}>
                                                                                {badge.label}
                                                                            </span>
                                                                            {isImplied && (
                                                                                <span className="text-[9px] px-1.5 py-0.2 rounded border font-mono font-bold bg-blue-100 dark:bg-blue-900/60 text-blue-700 dark:text-blue-300 border-blue-300 dark:border-blue-700 flex items-center gap-0.5">
                                                                                    <Lock size={8} /> AUTO
                                                                                </span>
                                                                            )}
                                                                        </div>
                                                                        <div className="mt-0.5 truncate font-mono text-xs text-gray-500 dark:text-gray-400">
                                                                            {highlightMatch(p.name, permSearch)}
                                                                        </div>
                                                                        {isImplied && (
                                                                            <p className="mt-0.5 flex items-center gap-1 text-xs font-medium text-blue-600 dark:text-blue-400">
                                                                                <Lock size={10} className="shrink-0" /> Auto-granted: {Array.from(impliedReasons).join(", ")}
                                                                            </p>
                                                                        )}
                                                                        {desc && (
                                                                            <p className="mt-0.5 line-clamp-2 text-xs text-gray-500 dark:text-gray-400">
                                                                                {highlightMatch(desc, permSearch)}
                                                                            </p>
                                                                        )}
                                                                    </div>
                                                                </label>
                                                            );
                                                        })}
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>

                          </div>
                            <div className="flex shrink-0 flex-wrap items-center justify-between gap-2 border-t border-gray-200 bg-white px-4 py-3 dark:border-gray-800 dark:bg-gray-900 sm:px-5">
                                <span className="text-xs font-medium text-gray-600 dark:text-gray-400">
                                    <strong className="text-emerald-600 dark:text-emerald-400 font-bold">{effectiveGrantedPermIds.size}</strong> of {visibleRolePermissions.length} active permissions
                                </span>
                                <div className="flex flex-wrap items-center justify-end gap-2">
                                    {editingRoleId && isRoleDirty && (
                                        <button
                                            type="button"
                                            onClick={() => {
                                                setNewRolePermissions([...originalRolePermissions]);
                                                setNewRoleName(originalRoleName);
                                                toast.info("Reset to saved permissions.");
                                            }}
                                            className="inline-flex items-center gap-1.5 rounded-lg border border-gray-300 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800"
                                            title="Revert to last saved permissions"
                                        >
                                            <RotateCcw size={13} />
                                            Reset to Saved
                                        </button>
                                    )}
                                    <button
                                        type="button"
                                        onClick={handleCloseRoleModal}
                                        className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="submit"
                                        className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700"
                                    >
                                        <CheckCircle2 size={15} />
                                        {editingRoleId ? "Update Role" : "Add Role"}
                                    </button>
                                </div>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}

export default Setting;
