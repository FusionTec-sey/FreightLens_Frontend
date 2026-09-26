import React, { useState, useEffect, useMemo, useCallback } from "react";
import axios from "axios";
import {
  Boxes,
  Package,
  Plus,
  Search,
  AlertTriangle,
  Layers,
  Building,
  Star,
  Eye,
  Pencil,
  Trash2,
  X,
  Check,
  ArrowLeft,
  Calendar,
  Tag,
  Link2,
  GitFork,
  ChevronRight,
  ChevronDown,
  Folder,
  FolderOpen,
  Ruler,
  ShieldCheck,
  Truck,
  Network,
  FolderPlus,
  TrendingUp,
  ShoppingCart,
  Film,
  Video,
  Play,
  Upload,
  Image as ImageIcon,
  Maximize2,
  RefreshCw,
  SlidersHorizontal,
  Copy,
  Calculator,
  Download,
  MoreVertical,
  Warehouse,
  Hash,
} from "lucide-react";
import StockGaugeBar from "./components/StockGaugeBar";
import StockAdjustModal from "./components/StockAdjustModal";
import ProductQuickView from "./components/ProductQuickView";
import BulkActionToolbar from "./components/BulkActionToolbar";
import { useTheme } from "../../../context/ThemeContext";
import { useAuth } from "../../../context/AuthContext";
import { toast } from "react-toastify";
import { useOptions } from "../../../hooks/useOptions";
import { COUNTRIES, getCountryFlag, formatCountryDisplay } from "../../../utils/countries";

const UOM_OPTIONS = [
  "PCS",
  "BOX",
  "SQM",
  "KG",
  "TON",
  "MTR",
  "SET",
  "ROLL",
  "BUNDLE",
  "DRUM",
  "PACK",
];

const DIMENSION_UNITS = ["mm", "cm", "m", "in", "ft"];
const WEIGHT_UNITS = ["kg", "g", "lbs", "ton"];

const RETAIL_PACKAGING_TYPES = [
  "Retail Color Box",
  "Polybag / Pouch",
  "Blister Pack / Card",
  "Clamshell",
  "Hang Tag Pack",
  "Shrink Wrapped",
  "Bare / Unpackaged",
];

const WHOLESALE_PACKAGING_TYPES = [
  "Inner Carton",
  "Shrink Wrapped Bundle",
  "Corrugated Protective Sleeve",
  "Poly Wrapped Pack",
  "Direct to Master (No Inner)",
];

const IMPORT_PACKAGING_TYPES = [
  "Master Carton (Corrugated Box)",
  "Tiles SQM Box (Square Meter Crated)",
  "Sanitary Ware Wooden Crate",
  "Steel Rebar / Rod Bundle",
  "Timber / Lumber Pack",
  "Drum / Barrel (200L / 55 Gallon)",
  "Bulk Bag / FIBC Jumbo Sack",
  "Roll / Spool / Reel (Cables & Fabrics)",
  "Glass A-Frame Crate",
  "Heavy Machinery Wooden Skid",
  "Plywood / Panel Pallet Pack",
  "Loose / Bulk Stuffed",
];

const PALLET_TYPES = [
  "Euro Pallet (1200 × 800 mm)",
  "Standard ISO Industrial (1200 × 1000 mm)",
  "Half Pallet (800 × 600 mm)",
  "Heavy-Duty Wooden Skid (Custom)",
  "Plastic Export Pallet",
  "Floor Loaded / No Pallet",
];

const SUGGESTED_TAGS = [
  "Premium",
  "Commercial",
  "Residential",
  "Ceramics",
  "Floor",
  "Wall",
  "Heavy Duty",
  "Polished",
  "Matt",
  "Non-Slip",
  "Waterproof",
  "Indoor",
  "Outdoor",
  "Fast Moving",
];

const getAuthHeaders = () => {
  const token = localStorage.getItem("token") || sessionStorage.getItem("token");
  return {
    skip_zrok_interstitial: "true",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
};

export default function ProductMasterPage() {
  const { isDark } = useTheme();
  const { user, isRoot, permissions = [] } = useAuth();

  const canViewVendor = useMemo(() => {
    if (isRoot) return true;
    const perms = Array.isArray(permissions) ? permissions : [];
    return (
      perms.includes("Administrator") ||
      perms.includes("View_Supplier") ||
      perms.includes("Supplier") ||
      perms.includes("Edit_Supplier") ||
      perms.includes("Add_Supplier")
    );
  }, [isRoot, permissions]);

  const canViewFinancials = useMemo(() => {
    if (isRoot) return true;
    const perms = Array.isArray(permissions) ? permissions : [];
    return (
      perms.includes("Administrator") ||
      perms.includes("View_Financials") ||
      perms.includes("Manage_Financials")
    );
  }, [isRoot, permissions]);

  const canAddProduct = useMemo(() => {
    if (isRoot) return true;
    const perms = Array.isArray(permissions) ? permissions : [];
    return perms.includes("Administrator") || perms.includes("Add_Product");
  }, [isRoot, permissions]);

  const canEditProduct = useMemo(() => {
    if (isRoot) return true;
    const perms = Array.isArray(permissions) ? permissions : [];
    return perms.includes("Administrator") || perms.includes("Edit_Product");
  }, [isRoot, permissions]);

  const canDeleteProduct = useMemo(() => {
    if (isRoot) return true;
    const perms = Array.isArray(permissions) ? permissions : [];
    return perms.includes("Administrator") || perms.includes("Delete_Product");
  }, [isRoot, permissions]);

  const canAdjustStock = useMemo(() => {
    if (isRoot) return true;
    const perms = Array.isArray(permissions) ? permissions : [];
    return perms.includes("Administrator") || perms.includes("Adjust_Stock");
  }, [isRoot, permissions]);

  const canExport = useMemo(() => {
    if (isRoot) return true;
    const perms = Array.isArray(permissions) ? permissions : [];
    return perms.includes("Administrator") || perms.includes("Export_Inventory");
  }, [isRoot, permissions]);

  const canViewCategories = useMemo(() => {
    if (isRoot) return true;
    const perms = Array.isArray(permissions) ? permissions : [];
    return perms.includes("Administrator") || perms.includes("View_ProductCategory");
  }, [isRoot, permissions]);

  const canManageCategories = useMemo(() => {
    if (isRoot) return true;
    const perms = Array.isArray(permissions) ? permissions : [];
    return perms.includes("Administrator") || perms.includes("Manage_ProductCategory");
  }, [isRoot, permissions]);

  // ── Multi-Select & Quick Action UI State ─────────────────────────────────────
  const [selectedProductIds, setSelectedProductIds] = useState([]);
  const [quickViewProduct, setQuickViewProduct] = useState(null);
  const [stockAdjustProduct, setStockAdjustProduct] = useState(null);
  const [openRowMenuId, setOpenRowMenuId] = useState(null);

  // ── Screen Navigation Mode: "products" | "categories" | "product_detail" ─────
  const [currentView, setCurrentView] = useState("products");
  const [returnToView, setReturnToView] = useState("products");
  const [activeProductTab, setActiveProductTab] = useState("specs");
  const [copiedSku, setCopiedSku] = useState(false);

  // Product Active Editing / Viewing State (for Dedicated Screen)
  const [activeProduct, setActiveProduct] = useState(null);
  const [formData, setFormData] = useState(null);
  const [productLoading, setProductLoading] = useState(false);

  const handleCopySku = () => {
    if (formData?.sku) {
      navigator.clipboard.writeText(formData.sku);
      setCopiedSku(true);
      setTimeout(() => setCopiedSku(false), 2000);
      toast.info(`Copied SKU: ${formData.sku}`);
    }
  };

  const primaryImageSrc = useMemo(() => {
    if (!formData?.images || formData.images.length === 0) return null;
    const prim = formData.images.find((im) => im.is_primary) || formData.images[0];
    return prim?.file_url || null;
  }, [formData?.images]);

  const calculatedCBM = useMemo(() => {
    const l = parseFloat(formData?.length) || 0;
    const w = parseFloat(formData?.width) || 0;
    const h = parseFloat(formData?.height) || 0;
    if (l <= 0 || w <= 0 || h <= 0) return null;
    const unit = formData?.dimension_unit || "mm";
    let factor = 0.001; // default mm to m
    if (unit === "cm") factor = 0.01;
    else if (unit === "m") factor = 1.0;
    else if (unit === "in") factor = 0.0254;
    else if (unit === "ft") factor = 0.3048;
    const cbm = (l * factor) * (w * factor) * (h * factor);
    return cbm > 0 ? cbm.toFixed(4) : null;
  }, [formData?.length, formData?.width, formData?.height, formData?.dimension_unit]);

  const calculatedBoxCBM = useMemo(() => {
    // 1. If explicit master dimensions are set, use them
    const ml = parseFloat(formData?.master_length) || 0;
    const mw = parseFloat(formData?.master_width) || 0;
    const mh = parseFloat(formData?.master_height) || 0;
    const unit = formData?.dimension_unit || "mm";
    let factor = 0.001;
    if (unit === "cm") factor = 0.01;
    else if (unit === "m") factor = 1.0;
    else if (unit === "in") factor = 0.0254;
    else if (unit === "ft") factor = 0.3048;

    if (ml > 0 && mw > 0 && mh > 0) {
      const cbm = (ml * factor) * (mw * factor) * (mh * factor);
      return cbm > 0 ? cbm.toFixed(4) : null;
    }

    // 2. Otherwise calculate units_per_box * unit CBM
    const unitsPerBox = parseFloat(formData?.units_per_box) || 0;
    const unitCbm = parseFloat(calculatedCBM) || 0;
    if (unitsPerBox > 0 && unitCbm > 0) {
      return (unitsPerBox * unitCbm).toFixed(4);
    }
    return null;
  }, [formData?.master_length, formData?.master_width, formData?.master_height, formData?.dimension_unit, formData?.units_per_box, calculatedCBM]);

  const handleEstimateContainerCapacity = useCallback(() => {
    const boxCbm = parseFloat(calculatedBoxCBM) || parseFloat(calculatedCBM) || 0;
    const unitsPerBox = parseFloat(formData?.units_per_box) || 1;
    if (boxCbm <= 0) {
      toast.warn("Please enter packaging dimensions (Length, Width, Height) to calculate volume first.");
      return;
    }
    // Practical usable volumes (20ft practical usable ~28 CBM; 40ft HC practical usable ~68 CBM)
    const estBoxes20 = Math.floor(28.0 / boxCbm);
    const estUnits20 = Math.floor(estBoxes20 * unitsPerBox);
    const estBoxes40hc = Math.floor(68.0 / boxCbm);
    const estUnits40hc = Math.floor(estBoxes40hc * unitsPerBox);

    setFormData((prev) => ({
      ...prev,
      est_qty_20ft: estUnits20 > 0 ? estUnits20 : "",
      est_qty_40hc: estUnits40hc > 0 ? estUnits40hc : "",
    }));
    toast.success(
      `Estimated: ~${estUnits20.toLocaleString()} units (20ft) / ~${estUnits40hc.toLocaleString()} units (40ft HC). Both values remain editable.`
    );
  }, [calculatedBoxCBM, calculatedCBM, formData?.units_per_box]);

  // Product Tagging System State
  const [tagInput, setTagInput] = useState("");

  const handleAddTag = useCallback((tagText) => {
    const clean = (tagText || tagInput || "").trim().replace(/^#/, "");
    if (!clean) return;
    const currentTags = Array.isArray(formData?.tags) ? formData.tags : [];
    if (!currentTags.includes(clean)) {
      setFormData((prev) => ({
        ...prev,
        tags: [...currentTags, clean],
      }));
    }
    setTagInput("");
  }, [tagInput, formData?.tags]);

  const handleRemoveTag = useCallback((tagToRemove) => {
    setFormData((prev) => ({
      ...prev,
      tags: (Array.isArray(prev?.tags) ? prev.tags : []).filter((t) => t !== tagToRemove),
    }));
  }, []);

  // ── Data State ─────────────────────────────────────────────────────────────
  const [products, setProducts] = useState([]);
  const [categoriesFlat, setCategoriesFlat] = useState([]);
  const { suppliers: contextSuppliers = [] } = useOptions();
  const [fetchedSuppliers, setFetchedSuppliers] = useState([]);

  useEffect(() => {
    if (contextSuppliers && contextSuppliers.length > 0) return;
    axios
      .get(`${process.env.REACT_APP_NETWORK}/suppliers`, { headers: getAuthHeaders() })
      .then((res) => {
        let data = res.data;
        if (typeof data === "string") data = JSON.parse(data);
        const rows = data?.data || [];
        const mapped = rows.map((r) => ({ id: r[0], name: r[1] }));
        setFetchedSuppliers(mapped);
      })
      .catch((err) => console.error("Failed to fetch fallback suppliers:", err));
  }, [contextSuppliers]);

  const suppliers = useMemo(() => {
    if (contextSuppliers && contextSuppliers.length > 0) return contextSuppliers;
    return fetchedSuppliers;
  }, [contextSuppliers, fetchedSuppliers]);

  const [loading, setLoading] = useState(true);

  // Category Screen State (Tree selection & expand/collapse)
  const [categoryScreenSelectedId, setCategoryScreenSelectedId] = useState(null);
  const [expandedCatIds, setExpandedCatIds] = useState(new Set([1, 2]));

  // Category Modal Popup State (Create & Edit)
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [editingCategory, setEditingCategory] = useState(null);
  const [newCatName, setNewCatName] = useState("");
  const [newCatDesc, setNewCatDesc] = useState("");
  const [newCatParentId, setNewCatParentId] = useState("");
  const [isCreatingCategory, setIsCreatingCategory] = useState(false);

  // Delete Category Warning Modal State
  const [categoryToDelete, setCategoryToDelete] = useState(null);
  const [isDeletingCategory, setIsDeletingCategory] = useState(false);

  // Main Products Screen Filters & Pagination
  const [search, setSearch] = useState("");
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState("");
  const [selectedSupplier, setSelectedSupplier] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [lowStockOnly, setLowStockOnly] = useState(false);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [jumpPageInput, setJumpPageInput] = useState("");

  // Media Lightbox Modal State
  const [previewMediaModal, setPreviewMediaModal] = useState(null);
  const [activeMediaIdx, setActiveMediaIdx] = useState(0);

  // Helper to format dimensions (Length x Width x Height)
  const formatDimensions = useCallback((p) => {
    if (!p) return null;
    const u = p.dimension_unit || "mm";
    const w = p.width;
    const h = p.height;
    const l = p.length;
    if (l && w && h) return `${l} × ${w} × ${h} ${u}`;
    if (w && h) return `${w}W × ${h}H ${u}`;
    if (l && w) return `${l}L × ${w}W ${u}`;
    if (w) return `${w}W ${u}`;
    if (h) return `${h}H ${u}`;
    if (l) return `${l}L ${u}`;
    return null;
  }, []);


  // Category-Screen Product List state (right panel on Category Screen)
  const [categoryProducts, setCategoryProducts] = useState([]);
  const [categoryProductsLoading, setCategoryProductsLoading] = useState(false);
  const [categoryProductsTotal, setCategoryProductsTotal] = useState(0);

  // Linking state on dedicated product screen
  const [linkSearch, setLinkSearch] = useState("");
  const [linkSearchResults, setLinkSearchResults] = useState([]);
  const [selectedLinkChild, setSelectedLinkChild] = useState(null);
  const [linkFlags, setLinkFlags] = useState({
    is_variant: true,
    is_related: false,
    is_part: false,
    qty: "",
    notes: "",
  });
  const [isLinking, setIsLinking] = useState(false);

  // Product Media (Images & Videos) State
  const [newImageUrl, setNewImageUrl] = useState("");
  const [newVideoUrl, setNewVideoUrl] = useState("");
  const [newVideoTitle, setNewVideoTitle] = useState("");
  const [uploadingMedia, setUploadingMedia] = useState(false);
  const [activeVideoPlaying, setActiveVideoPlaying] = useState(null);

  const initialFormData = {
    code: "",
    sku: "",
    name: "",
    description: "",
    description_quick: "",
    status: "active",
    category_id: "",
    brand: "",
    model_number: "",
    series: "",
    country_of_origin: "",
    images: [],
    videos: [],
    attachment: [],
    barcode: "",
    hs_code: "",
    duty_rate: "",
    unit: "PCS",
    length: "",
    width: "",
    height: "",
    dimension_unit: "mm",
    weight_per_unit: "",
    weight_unit: "kg",
    units_per_box: "",
    box_weight: "",
    tags: [],
    // Retail Packaging
    retail_packaging_type: "Retail Color Box",
    gross_weight_per_unit: "",
    // Wholesale Packaging
    wholesale_packaging_type: "Inner Carton",
    units_per_inner: "",
    inner_length: "",
    inner_width: "",
    inner_height: "",
    inner_weight: "",
    // Import / Master Packaging
    import_packaging_type: "Master Carton (Corrugated Box)",
    master_length: "",
    master_width: "",
    master_height: "",
    master_tare_weight: "",
    // Palletization & Container Loading
    pallet_type: "Euro Pallet (1200 × 800 mm)",
    cartons_per_layer: "",
    layers_per_pallet: "",
    total_cartons_per_pallet: "",
    max_stacking_layers: "",
    est_qty_20ft: "",
    est_qty_40hc: "",
    // Warehouse Coordinates
    warehouse_location: "",
    default_bin: "",
    packaging_specs: {},
    unit_cost: "",
    currency: "USD",
    current_stock: 0,
    min_stock_quantity: 0,
    max_stock_quantity: "",
    order_threshold_qty: "",
    threshold_qty: "",
    min_quantity_order: "",
    lead_time_days: "",
    default_supplier_id: "",
    factory_code: "",
    suppliers: [],
    is_consumable: false,
    is_hazardous: false,
    is_perishable: false,
    expiry_days: "",
    is_returnable: true,
    warranty_days: "",
  };

  const isAccountsUser = useMemo(() => {
    if (isRoot) return true;
    const roles = user?.roles || [];
    return roles.some((r) =>
      ["Administrator", "Admin", "Account", "Accounts", "Accounts_Finance", "Finance"].includes(
        typeof r === "string" ? r : r?.name
      )
    );
  }, [user, isRoot]);

  // ── Hierarchical Category Tree (BASE -> Parent -> Child, sorted A-Z) ──────
  const categoriesTree = useMemo(() => {
    if (!categoriesFlat || categoriesFlat.length === 0) return [];

    const buildTree = (parentId) => {
      return categoriesFlat
        .filter((c) => {
          if (parentId === null) {
            // Root level: only the base category Products
            return !c.parent_id || c.name === "Products";
          }
          // Child level: parent_id equals parentId, excluding root
          return c.parent_id === parentId && c.name !== "Products";
        })
        .sort((a, b) => a.name.localeCompare(b.name))
        .map((item) => ({
          ...item,
          children: buildTree(item.id),
        }));
    };

    let tree = buildTree(null);

    // Guarantee that Products is at root level if parent_ids weren't assigned
    if (tree.length === 0 && categoriesFlat.length > 0) {
      const rootCat = categoriesFlat.find((c) => c.name === "Products") || categoriesFlat[0];
      tree = [
        {
          ...rootCat,
          children: categoriesFlat
            .filter((c) => c.id !== rootCat.id && (!c.parent_id || c.parent_id === rootCat.id))
            .sort((a, b) => a.name.localeCompare(b.name))
            .map((child) => ({
              ...child,
              children: categoriesFlat
                .filter((gc) => gc.parent_id === child.id)
                .sort((a, b) => a.name.localeCompare(b.name)),
            })),
        },
      ];
    }

    return tree;
  }, [categoriesFlat]);

  // Clean flattened categories with visual indentation for dropdowns (No "(Base Category)" text)
  const flattenedCategories = useMemo(() => {
    const list = [];
    const traverse = (nodes, depth = 0) => {
      nodes.forEach((node) => {
        list.push({
          id: node.id,
          name: node.name,
          parent_id: node.parent_id,
          depth,
          displayName: depth === 0 ? node.name : `${"— ".repeat(depth)}${node.name}`,
          products_count: node.products_count || 0,
        });
        if (node.children && node.children.length > 0) {
          traverse(node.children, depth + 1);
        }
      });
    };
    traverse(categoriesTree);
    return list;
  }, [categoriesTree]);

  // Category Screen Breadcrumbs
  const categoryScreenBreadcrumbs = useMemo(() => {
    if (!categoryScreenSelectedId) return [];
    const path = [];
    let curr = categoriesFlat.find((c) => c.id === categoryScreenSelectedId);
    while (curr) {
      path.unshift(curr);
      if (!curr.parent_id) break;
      curr = categoriesFlat.find((c) => c.id === curr.parent_id);
    }
    return path;
  }, [categoryScreenSelectedId, categoriesFlat]);

  const selectedCategoryNode = useMemo(() => {
    return categoriesFlat.find((c) => c.id === categoryScreenSelectedId) || null;
  }, [categoryScreenSelectedId, categoriesFlat]);

  // ── Fetch Operations ───────────────────────────────────────────────────────

  const fetchCategories = useCallback(async () => {
    try {
      const res = await axios.get(`${process.env.REACT_APP_NETWORK}/inventory/categories?flat=true`, {
        headers: getAuthHeaders(),
      });
      const flat = res.data || [];
      setCategoriesFlat(flat);
      if (flat.length > 0) {
        const root = flat.find((c) => c.name === "Products") || flat[0];
        // Expand root and level-1 children by default so user sees clean hierarchy
        setExpandedCatIds(new Set(flat.map((c) => c.id)));
        if (!categoryScreenSelectedId) {
          setCategoryScreenSelectedId(root.id);
        }
      }
    } catch (err) {
      console.error("Failed to load categories:", err);
    }
  }, [categoryScreenSelectedId]);

  const fetchSuppliers = useCallback(async () => {
    try {
      const res = await axios.get(`${process.env.REACT_APP_NETWORK}/suppliers`, {
        headers: getAuthHeaders(),
      });
      let data = res.data;
      if (typeof data === "string") data = JSON.parse(data);
      const rows = data?.data || [];
      const mapped = rows.map((r) => ({
        id: r[0],
        supplier_id: r[0],
        name: r[1],
      }));
      setFetchedSuppliers(mapped);
    } catch (err) {
      console.error("Failed to load suppliers:", err);
    }
  }, []);

  // Fetch Main Products Screen (full catalog)
  const fetchProducts = useCallback(async () => {
    setLoading(true);
    try {
      const params = {
        page,
        limit: pageSize,
      };
      if (search.trim()) params.search = search.trim();
      if (selectedCategoryFilter) params.category_id = selectedCategoryFilter;
      if (canViewVendor && selectedSupplier) params.supplier_id = selectedSupplier;
      if (statusFilter) params.status = statusFilter;
      if (lowStockOnly) params.low_stock_only = true;

      const res = await axios.get(`${process.env.REACT_APP_NETWORK}/inventory/products`, {
        params,
        headers: getAuthHeaders(),
      });

      setProducts(res.data.items || []);
      setTotalPages(res.data.pages || 1);
      setTotalCount(res.data.total || 0);
    } catch (err) {
      console.error("Failed to load products:", err);
      toast.error(err.response?.data?.detail || "Failed to load products");
    } finally {
      setLoading(false);
    }
  }, [page, pageSize, search, selectedCategoryFilter, selectedSupplier, statusFilter, lowStockOnly, canViewVendor]);

  // Fetch Products for Category Screen
  const fetchCategoryScreenProducts = useCallback(async (catId) => {
    setCategoryProductsLoading(true);
    try {
      const params = { limit: 100 };
      if (catId) params.category_id = catId;
      const res = await axios.get(`${process.env.REACT_APP_NETWORK}/inventory/products`, {
        params,
        headers: getAuthHeaders(),
      });
      setCategoryProducts(res.data.items || []);
      setCategoryProductsTotal(res.data.total || 0);
    } catch (err) {
      console.error("Failed to load category products:", err);
    } finally {
      setCategoryProductsLoading(false);
    }
  }, []);

  // ── Multi-select Handlers ───────────────────────────────────────────────────
  const handleToggleSelectAll = () => {
    if (selectedProductIds.length === products.length && products.length > 0) {
      setSelectedProductIds([]);
    } else {
      setSelectedProductIds(products.map((p) => p.id));
    }
  };

  const handleToggleSelectProduct = (productId) => {
    setSelectedProductIds((prev) =>
      prev.includes(productId) ? prev.filter((id) => id !== productId) : [...prev, productId]
    );
  };

  // ── Quick & Bulk Product Operations ─────────────────────────────────────────
  const handleDuplicateProduct = async (prod) => {
    if (!canAddProduct) return;
    try {
      toast.info(`Cloning ${prod.sku}...`);
      const res = await axios.post(
        `${process.env.REACT_APP_NETWORK}/inventory/products/${prod.id}/duplicate`,
        {},
        { headers: getAuthHeaders() }
      );
      toast.success(`Created duplicate product: ${res.data?.sku}`);
      fetchProducts();
    } catch (err) {
      console.error("Failed to duplicate product:", err);
      toast.error(err.response?.data?.detail || "Failed to duplicate product");
    }
  };

  const handleToggleProductStatus = async (prod) => {
    if (!canEditProduct) return;
    const newStatus = prod.status === "active" ? "inactive" : "active";
    try {
      await axios.put(
        `${process.env.REACT_APP_NETWORK}/inventory/products/${prod.id}`,
        { status: newStatus },
        { headers: getAuthHeaders() }
      );
      toast.success(`Product marked as ${newStatus}`);
      fetchProducts();
    } catch (err) {
      console.error("Failed to update status:", err);
      toast.error(err.response?.data?.detail || "Failed to update product status");
    }
  };

  const handleBulkCategoryMove = async (categoryId) => {
    if (!canEditProduct || selectedProductIds.length === 0) return;
    try {
      const res = await axios.post(
        `${process.env.REACT_APP_NETWORK}/inventory/products/bulk-category`,
        {
          product_ids: selectedProductIds,
          category_id: categoryId,
        },
        { headers: getAuthHeaders() }
      );
      toast.success(res.data?.message || "Categories updated successfully");
      setSelectedProductIds([]);
      fetchProducts();
    } catch (err) {
      console.error("Failed bulk category move:", err);
      toast.error(err.response?.data?.detail || "Failed to update categories");
    }
  };

  const handleBulkDelete = async () => {
    if (!canDeleteProduct || selectedProductIds.length === 0) return;
    if (
      !window.confirm(
        `Are you sure you want to deactivate/delete ${selectedProductIds.length} selected product(s)?`
      )
    ) {
      return;
    }
    try {
      const res = await axios.post(
        `${process.env.REACT_APP_NETWORK}/inventory/products/bulk-delete`,
        { product_ids: selectedProductIds },
        { headers: getAuthHeaders() }
      );
      toast.success(res.data?.message || "Products deleted successfully");
      setSelectedProductIds([]);
      fetchProducts();
    } catch (err) {
      console.error("Failed bulk delete:", err);
      toast.error(err.response?.data?.detail || "Failed to delete products");
    }
  };

  const handleDeleteProduct = async (productId, sku) => {
    if (!canDeleteProduct) return;
    if (
      !window.confirm(
        `Are you sure you want to delete ${sku ? `product "${sku}"` : "this product"}?`
      )
    ) {
      return;
    }
    try {
      await axios.delete(`${process.env.REACT_APP_NETWORK}/inventory/products/${productId}`, {
        headers: getAuthHeaders(),
      });
      toast.success("Product deleted successfully");
      fetchProducts();
    } catch (err) {
      console.error("Failed to delete product:", err);
      toast.error(err.response?.data?.detail || "Failed to delete product");
    }
  };

  const handleExportCatalog = async () => {
    if (!canExport) return;
    try {
      toast.info("Generating CSV export...");
      const params = {};
      if (search.trim()) params.search = search.trim();
      if (selectedCategoryFilter) params.category_id = selectedCategoryFilter;
      if (canViewVendor && selectedSupplier) params.supplier_id = selectedSupplier;
      if (statusFilter) params.status = statusFilter;

      const res = await axios.get(`${process.env.REACT_APP_NETWORK}/inventory/products/export`, {
        params,
        headers: getAuthHeaders(),
        responseType: "blob",
      });

      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", `inventory_catalog_${new Date().toISOString().slice(0, 10)}.csv`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      toast.success("CSV export downloaded");
    } catch (err) {
      console.error("Failed to export catalog:", err);
      toast.error("Failed to export catalog CSV");
    }
  };

  const handleBulkExportSelected = () => {
    if (selectedProductIds.length === 0) return;
    const selectedProds = products.filter((p) => selectedProductIds.includes(p.id));
    if (selectedProds.length === 0) return;

    let csvContent = "SKU,Code,Name,Category,Unit,Current Stock,Min Stock,Status\n";
    selectedProds.forEach((p) => {
      csvContent += `"${p.sku || ""}","${p.code || ""}","${(p.name || "").replace(/"/g, '""')}","${
        p.category_name || ""
      }","${p.unit || "PCS"}",${p.current_stock || 0},${p.min_stock_quantity || 0},"${p.status || "active"}"\n`;
    });

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", `selected_products_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    link.remove();
  };

  useEffect(() => {
    fetchCategories();
    fetchSuppliers();
  }, [fetchCategories, fetchSuppliers]);

  useEffect(() => {
    if (currentView === "products") {
      fetchProducts();
    }
  }, [fetchProducts, currentView]);

  useEffect(() => {
    if (currentView === "categories") {
      fetchCategoryScreenProducts(categoryScreenSelectedId);
    }
  }, [fetchCategoryScreenProducts, categoryScreenSelectedId, currentView]);

  const handleSelectCategoryNode = (catId) => {
    setCategoryScreenSelectedId(catId);
  };

  // ── Tree Expand/Collapse ───────────────────────────────────────────────────
  const toggleExpand = (catId, e) => {
    e.stopPropagation();
    setExpandedCatIds((prev) => {
      const next = new Set(prev);
      if (next.has(catId)) {
        next.delete(catId);
      } else {
        next.add(catId);
      }
      return next;
    });
  };

  // ── Open Add / Edit / Delete Category Modal Handlers ──────────────────────
  const handleOpenAddCategoryModal = (preferredParentId = null) => {
    setEditingCategory(null);
    setNewCatName("");
    setNewCatDesc("");
    const parentId =
      preferredParentId !== null
        ? preferredParentId
        : categoryScreenSelectedId || (flattenedCategories[0]?.id || "");
    setNewCatParentId(parentId);
    setShowCategoryModal(true);
  };

  const handleOpenEditCategoryModal = (cat, e) => {
    if (e) e.stopPropagation();
    setEditingCategory(cat);
    setNewCatName(cat.name);
    setNewCatDesc(cat.description || "");
    setNewCatParentId(cat.parent_id ? String(cat.parent_id) : "");
    setShowCategoryModal(true);
  };

  const handleOpenDeleteCategoryModal = (cat, e) => {
    if (e) e.stopPropagation();
    if (!cat.parent_id || cat.name === "Products") {
      toast.error("Cannot delete the root 'Products' category");
      return;
    }
    setCategoryToDelete(cat);
  };

  const handleConfirmDeleteCategory = async () => {
    if (!categoryToDelete) return;
    try {
      setIsDeletingCategory(true);
      const res = await axios.delete(
        `${process.env.REACT_APP_NETWORK}/inventory/categories/${categoryToDelete.id}`,
        { headers: getAuthHeaders() }
      );
      toast.success(res.data?.message || `Category "${categoryToDelete.name}" deleted`);
      setCategoryToDelete(null);
      if (categoryScreenSelectedId === categoryToDelete.id) {
        setCategoryScreenSelectedId(2); // fallback to default Products
      }
      fetchCategories();
      fetchCategoryScreenProducts(2);
    } catch (err) {
      console.error("Failed to delete category:", err);
      toast.error(err.response?.data?.detail || "Failed to delete category");
    } finally {
      setIsDeletingCategory(false);
    }
  };

  const handleSaveCategory = async (e) => {
    e.preventDefault();
    if (!newCatName.trim()) {
      toast.error("Category title is required");
      return;
    }
    try {
      setIsCreatingCategory(true);
      const payload = {
        name: newCatName.trim(),
        description: newCatDesc.trim() || null,
        parent_id: newCatParentId ? parseInt(newCatParentId, 10) : null,
      };

      if (editingCategory) {
        await axios.put(
          `${process.env.REACT_APP_NETWORK}/inventory/categories/${editingCategory.id}`,
          payload,
          { headers: getAuthHeaders() }
        );
        toast.success(`Category "${newCatName}" updated successfully!`);
      } else {
        await axios.post(
          `${process.env.REACT_APP_NETWORK}/inventory/categories`,
          payload,
          { headers: getAuthHeaders() }
        );
        toast.success(`Category "${newCatName}" created successfully!`);
      }

      setShowCategoryModal(false);
      setEditingCategory(null);
      setNewCatName("");
      setNewCatDesc("");
      fetchCategories();
    } catch (err) {
      console.error("Failed to save category:", err);
      toast.error(err.response?.data?.detail || "Failed to save category");
    } finally {
      setIsCreatingCategory(false);
    }
  };

  // ── Screen Navigation Handlers ─────────────────────────────────────────────

  const handleOpenProductDetail = async (prod, fromScreen = "products") => {
    setReturnToView(fromScreen);
    setProductLoading(true);
    setCurrentView("product_detail");
    setActiveProductTab("specs");
    try {
      const res = await axios.get(`${process.env.REACT_APP_NETWORK}/inventory/products/${prod.id}`, {
        headers: getAuthHeaders(),
      });
      const p = res.data;
      setActiveProduct(p);
      setFormData({
        code: p.code || "",
        sku: p.sku || "",
        name: p.name || "",
        description: p.description || "",
        description_quick: p.description_quick || "",
        status: p.status || "active",
        category_id: p.category_id || "",
        brand: p.brand || "",
        model_number: p.model_number || "",
        series: p.series || "",
        country_of_origin: p.country_of_origin || "",
        barcode: p.barcode || "",
        hs_code: p.hs_code || "",
        duty_rate: p.duty_rate !== null && p.duty_rate !== undefined ? p.duty_rate : "",
        unit: p.unit || "PCS",
        length: p.length !== null && p.length !== undefined ? p.length : "",
        width: p.width !== null && p.width !== undefined ? p.width : "",
        height: p.height !== null && p.height !== undefined ? p.height : "",
        dimension_unit: p.dimension_unit || "mm",
        weight_per_unit: p.weight_per_unit !== null && p.weight_per_unit !== undefined ? p.weight_per_unit : "",
        weight_unit: p.weight_unit || "kg",
        units_per_box: p.units_per_box !== null && p.units_per_box !== undefined ? p.units_per_box : "",
        box_weight: p.box_weight !== null && p.box_weight !== undefined ? p.box_weight : "",
        tags: Array.isArray(p.tags) ? p.tags : [],
        // Retail Packaging
        retail_packaging_type: p.retail_packaging_type || "Retail Color Box",
        gross_weight_per_unit: p.gross_weight_per_unit !== null && p.gross_weight_per_unit !== undefined ? p.gross_weight_per_unit : "",
        // Wholesale Packaging
        wholesale_packaging_type: p.wholesale_packaging_type || "Inner Carton",
        units_per_inner: p.units_per_inner !== null && p.units_per_inner !== undefined ? p.units_per_inner : "",
        inner_length: p.inner_length !== null && p.inner_length !== undefined ? p.inner_length : "",
        inner_width: p.inner_width !== null && p.inner_width !== undefined ? p.inner_width : "",
        inner_height: p.inner_height !== null && p.inner_height !== undefined ? p.inner_height : "",
        inner_weight: p.inner_weight !== null && p.inner_weight !== undefined ? p.inner_weight : "",
        // Import / Master Packaging
        import_packaging_type: p.import_packaging_type || "Master Carton (Corrugated Box)",
        master_length: p.master_length !== null && p.master_length !== undefined ? p.master_length : "",
        master_width: p.master_width !== null && p.master_width !== undefined ? p.master_width : "",
        master_height: p.master_height !== null && p.master_height !== undefined ? p.master_height : "",
        master_tare_weight: p.master_tare_weight !== null && p.master_tare_weight !== undefined ? p.master_tare_weight : "",
        // Palletization & Container Loading
        pallet_type: p.pallet_type || "Euro Pallet (1200 × 800 mm)",
        cartons_per_layer: p.cartons_per_layer !== null && p.cartons_per_layer !== undefined ? p.cartons_per_layer : "",
        layers_per_pallet: p.layers_per_pallet !== null && p.layers_per_pallet !== undefined ? p.layers_per_pallet : "",
        total_cartons_per_pallet: p.total_cartons_per_pallet !== null && p.total_cartons_per_pallet !== undefined ? p.total_cartons_per_pallet : "",
        max_stacking_layers: p.max_stacking_layers !== null && p.max_stacking_layers !== undefined ? p.max_stacking_layers : "",
        est_qty_20ft: p.est_qty_20ft !== null && p.est_qty_20ft !== undefined ? p.est_qty_20ft : "",
        est_qty_40hc: p.est_qty_40hc !== null && p.est_qty_40hc !== undefined ? p.est_qty_40hc : "",
        // Warehouse Coordinates
        warehouse_location: p.warehouse_location || "",
        default_bin: p.default_bin || "",
        packaging_specs: p.packaging_specs || {},
        unit_cost: p.unit_cost !== null && p.unit_cost !== undefined ? p.unit_cost : "",
        currency: p.currency || "USD",
        current_stock: p.current_stock || 0,
        min_stock_quantity: p.min_stock_quantity || 0,
        max_stock_quantity: p.max_stock_quantity !== null && p.max_stock_quantity !== undefined ? p.max_stock_quantity : "",
        order_threshold_qty: p.order_threshold_qty !== null && p.order_threshold_qty !== undefined ? p.order_threshold_qty : "",
        threshold_qty: p.threshold_qty !== null && p.threshold_qty !== undefined ? p.threshold_qty : "",
        min_quantity_order: p.min_quantity_order !== null && p.min_quantity_order !== undefined ? p.min_quantity_order : "",
        lead_time_days: p.lead_time_days !== null && p.lead_time_days !== undefined ? p.lead_time_days : "",
        default_supplier_id: p.default_supplier_id || "",
        factory_code: p.default_factory_code || p.factory_code || "",
        suppliers: Array.isArray(p.suppliers) ? p.suppliers : [],
        is_consumable: Boolean(p.is_consumable),
        is_hazardous: Boolean(p.is_hazardous),
        is_perishable: Boolean(p.is_perishable),
        expiry_days: p.expiry_days !== null && p.expiry_days !== undefined ? p.expiry_days : "",
        is_returnable: p.is_returnable !== undefined ? Boolean(p.is_returnable) : true,
        warranty_days: p.warranty_days !== null && p.warranty_days !== undefined ? p.warranty_days : "",
        images: p.images || [],
        videos: p.videos || [],
        attachment: p.attachment || [],
      });
    } catch (err) {
      console.error("Failed to load product:", err);
      toast.error("Failed to load full product specifications");
      setActiveProduct(prod);
    } finally {
      setProductLoading(false);
    }
  };

  const handleAddSupplierRow = () => {
    const existingIds = (formData?.suppliers || []).map((s) => Number(s.supplier_id));
    const available = suppliers.find((s) => !existingIds.includes(Number(s.supplier_id || s.id))) || suppliers[0];
    if (!available) {
      toast.info("Please create suppliers in Master Data first.");
      return;
    }
    const suppId = Number(available.supplier_id || available.id);
    const newRow = {
      supplier_id: suppId,
      supplier_name: available.name || "",
      factory_code: "",
      vendor_product_name: "",
      unit_cost: formData?.unit_cost || "",
      currency: formData?.currency || "USD",
      min_order_qty: formData?.min_quantity_order || "",
      lead_time_days: formData?.lead_time_days || "",
      is_default: (formData?.suppliers || []).length === 0,
      notes: ""
    };
    const nextSuppliers = [...(formData?.suppliers || []), newRow];
    setFormData({
      ...formData,
      suppliers: nextSuppliers,
      default_supplier_id: newRow.is_default ? newRow.supplier_id : formData?.default_supplier_id
    });
  };

  const handleUpdateSupplierRow = (index, field, value) => {
    const next = [...(formData?.suppliers || [])];
    if (field === "supplier_id") {
      const suppObj = suppliers.find((s) => Number(s.supplier_id || s.id) === Number(value));
      next[index] = {
        ...next[index],
        supplier_id: Number(value),
        supplier_name: suppObj?.name || next[index].supplier_name || ""
      };
    } else {
      next[index] = { ...next[index], [field]: value };
    }
    if (field === "is_default" && value === true) {
      next.forEach((row, i) => {
        if (i !== index) row.is_default = false;
      });
      setFormData({
        ...formData,
        suppliers: next,
        default_supplier_id: next[index].supplier_id,
        factory_code: next[index].factory_code || formData?.factory_code
      });
      return;
    }
    setFormData({ ...formData, suppliers: next });
  };

  const handleRemoveSupplierRow = (index) => {
    const next = (formData?.suppliers || []).filter((_, i) => i !== index);
    if (next.length > 0 && !next.some((s) => s.is_default)) {
      next[0].is_default = true;
    }
    const defaultRow = next.find((s) => s.is_default);
    setFormData({
      ...formData,
      suppliers: next,
      default_supplier_id: defaultRow ? defaultRow.supplier_id : ""
    });
  };

  const handleOpenCreateProduct = (fromScreen = "products") => {
    setReturnToView(fromScreen);
    setActiveProduct(null);
    setFormData({
      ...initialFormData,
      category_id: (fromScreen === "categories" && categoryScreenSelectedId) || (flattenedCategories[0]?.id || ""),
    });
    setActiveProductTab("specs");
    setCurrentView("product_detail");
  };

  const handleBack = () => {
    setCurrentView(returnToView);
    setActiveProduct(null);
    setFormData(null);
    if (returnToView === "products") {
      fetchProducts();
    } else if (returnToView === "categories") {
      fetchCategories();
      fetchCategoryScreenProducts(categoryScreenSelectedId);
    }
  };

  // ── Media Action Handlers (Images & Videos) ──────────────────────────────
  const handleAddImageUrl = () => {
    if (!newImageUrl.trim()) return;
    const imgObj = {
      id: `img-${Date.now()}`,
      file_name: newImageUrl.split("/").pop() || "product_image.jpg",
      file_url: newImageUrl.trim(),
      media_type: "image",
      title: "Product Image",
      uploaded_at: new Date().toISOString()
    };
    setFormData((prev) => ({
      ...prev,
      images: [...(prev?.images || []), imgObj]
    }));
    setNewImageUrl("");
    toast.success("Image URL added to product.");
  };

  const handleUploadMediaFile = async (e, mediaType = "image") => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (activeProduct?.id) {
      setUploadingMedia(true);
      try {
        const form = new FormData();
        form.append("file", file);
        const res = await axios.post(
          `${process.env.REACT_APP_NETWORK}/inventory/products/${activeProduct.id}/media?media_type=${mediaType}`,
          form,
          { headers: { ...getAuthHeaders(), "Content-Type": "multipart/form-data" } }
        );
        const savedMedia = res.data.media;
        if (mediaType === "video") {
          setFormData((prev) => ({
            ...prev,
            videos: [...(prev?.videos || []), savedMedia]
          }));
        } else {
          setFormData((prev) => ({
            ...prev,
            images: [...(prev?.images || []), savedMedia]
          }));
        }
        toast.success(`${mediaType.toUpperCase()} uploaded successfully!`);
      } catch (err) {
        console.error("Media upload failed:", err);
        toast.error("Failed to upload media file.");
      } finally {
        setUploadingMedia(false);
      }
    } else {
      setUploadingMedia(true);
      try {
        const form = new FormData();
        form.append("file", file);
        const folder = mediaType === "video" ? "products/videos" : "products/images";
        const res = await axios.post(
          `${process.env.REACT_APP_NETWORK}/blobs/upload?folder=${folder}`,
          form,
          { headers: { ...getAuthHeaders(), "Content-Type": "multipart/form-data" } }
        );
        const mediaObj = {
          id: `media-${Date.now()}`,
          file_name: file.name,
          file_url: res.data.object_key,
          media_type: mediaType,
          title: file.name,
          file_size: file.size,
          uploaded_at: new Date().toISOString()
        };
        if (mediaType === "video") {
          setFormData((prev) => ({
            ...prev,
            videos: [...(prev?.videos || []), mediaObj]
          }));
        } else {
          setFormData((prev) => ({
            ...prev,
            images: [...(prev?.images || []), mediaObj]
          }));
        }
        toast.success(`${mediaType.toUpperCase()} stored in RustFS!`);
      } catch (err) {
        console.error("Media upload to RustFS failed:", err);
        toast.error("Failed to upload media to RustFS.");
      } finally {
        setUploadingMedia(false);
      }
    }
  };

  const handleAddVideoUrl = () => {
    if (!newVideoUrl.trim()) return;
    const vidObj = {
      id: `vid-${Date.now()}`,
      file_name: newVideoTitle.trim() || newVideoUrl.split("/").pop() || "product_video.mp4",
      file_url: newVideoUrl.trim(),
      media_type: "video",
      title: newVideoTitle.trim() || "Product Demonstration Video",
      uploaded_at: new Date().toISOString()
    };
    setFormData((prev) => ({
      ...prev,
      videos: [...(prev?.videos || []), vidObj]
    }));
    setNewVideoUrl("");
    setNewVideoTitle("");
    toast.success("Video URL attached to product.");
  };

  const handleRemoveMedia = (mediaId, mediaType = "image") => {
    if (mediaType === "video") {
      setFormData((prev) => ({
        ...prev,
        videos: (prev?.videos || []).filter((v) => v.id !== mediaId)
      }));
    } else {
      setFormData((prev) => ({
        ...prev,
        images: (prev?.images || []).filter((img) => img.id !== mediaId)
      }));
    }
  };

  // ── Save Product Action ────────────────────────────────────────────────────
  const handleSaveProduct = async (e) => {
    if (e) e.preventDefault();
    if (!formData.name?.trim()) {
      toast.error("Product name is required");
      return;
    }
    if (!formData.sku?.trim()) {
      toast.error("Trading SKU is required");
      return;
    }

    try {
      const payload = {
        sku: formData.sku.trim().toUpperCase(),
        code: formData.code?.trim() ? formData.code.trim().toUpperCase() : null,
        name: formData.name.trim(),
        description: formData.description.trim() || null,
        description_quick: formData.description_quick.trim() || null,
        status: formData.status || "active",
        category_id: formData.category_id ? parseInt(formData.category_id, 10) : null,
        brand: formData.brand.trim() || null,
        model_number: formData.model_number.trim() || null,
        series: formData.series.trim() || null,
        country_of_origin: formData.country_of_origin ? formData.country_of_origin.trim() : null,
        barcode: formData.barcode.trim() || null,
        hs_code: formData.hs_code.trim() || null,
        duty_rate: formData.duty_rate !== "" ? parseFloat(formData.duty_rate) : null,
        unit: formData.unit || "PCS",
        length: formData.length !== "" ? parseFloat(formData.length) : null,
        width: formData.width !== "" ? parseFloat(formData.width) : null,
        height: formData.height !== "" ? parseFloat(formData.height) : null,
        dimension_unit: formData.dimension_unit || "mm",
        weight_per_unit: formData.weight_per_unit !== "" ? parseFloat(formData.weight_per_unit) : null,
        weight_unit: formData.weight_unit || "kg",
        units_per_box: formData.units_per_box !== "" ? parseFloat(formData.units_per_box) : null,
        box_weight: formData.box_weight !== "" ? parseFloat(formData.box_weight) : null,
        tags: Array.isArray(formData.tags) ? formData.tags : [],
        // Retail Packaging
        retail_packaging_type: formData.retail_packaging_type || null,
        gross_weight_per_unit: formData.gross_weight_per_unit !== "" ? parseFloat(formData.gross_weight_per_unit) : null,
        // Wholesale Packaging
        wholesale_packaging_type: formData.wholesale_packaging_type || null,
        units_per_inner: formData.units_per_inner !== "" ? parseFloat(formData.units_per_inner) : null,
        inner_length: formData.inner_length !== "" ? parseFloat(formData.inner_length) : null,
        inner_width: formData.inner_width !== "" ? parseFloat(formData.inner_width) : null,
        inner_height: formData.inner_height !== "" ? parseFloat(formData.inner_height) : null,
        inner_weight: formData.inner_weight !== "" ? parseFloat(formData.inner_weight) : null,
        // Import / Master Packaging
        import_packaging_type: formData.import_packaging_type || null,
        master_length: formData.master_length !== "" ? parseFloat(formData.master_length) : null,
        master_width: formData.master_width !== "" ? parseFloat(formData.master_width) : null,
        master_height: formData.master_height !== "" ? parseFloat(formData.master_height) : null,
        master_tare_weight: formData.master_tare_weight !== "" ? parseFloat(formData.master_tare_weight) : null,
        // Palletization & Container Loading
        pallet_type: formData.pallet_type || null,
        cartons_per_layer: formData.cartons_per_layer !== "" ? parseInt(formData.cartons_per_layer, 10) : null,
        layers_per_pallet: formData.layers_per_pallet !== "" ? parseInt(formData.layers_per_pallet, 10) : null,
        total_cartons_per_pallet: formData.total_cartons_per_pallet !== "" ? parseInt(formData.total_cartons_per_pallet, 10) : null,
        max_stacking_layers: formData.max_stacking_layers !== "" ? parseInt(formData.max_stacking_layers, 10) : null,
        est_qty_20ft: formData.est_qty_20ft !== "" ? parseFloat(formData.est_qty_20ft) : null,
        est_qty_40hc: formData.est_qty_40hc !== "" ? parseFloat(formData.est_qty_40hc) : null,
        // Warehouse Coordinates
        warehouse_location: formData.warehouse_location?.trim() || null,
        default_bin: formData.default_bin?.trim() || null,
        packaging_specs: formData.packaging_specs || {},
        unit_cost: formData.unit_cost !== "" ? parseFloat(formData.unit_cost) : null,
        currency: formData.currency || "USD",
        current_stock: parseFloat(formData.current_stock) || 0.0,
        min_stock_quantity: parseFloat(formData.min_stock_quantity) || 0.0,
        max_stock_quantity: formData.max_stock_quantity !== "" ? parseFloat(formData.max_stock_quantity) : null,
        order_threshold_qty: formData.order_threshold_qty !== "" ? parseFloat(formData.order_threshold_qty) : null,
        threshold_qty: formData.threshold_qty !== "" ? parseFloat(formData.threshold_qty) : null,
        min_quantity_order: formData.min_quantity_order !== "" ? parseFloat(formData.min_quantity_order) : null,
        lead_time_days: formData.lead_time_days !== "" ? parseInt(formData.lead_time_days, 10) : null,
        default_supplier_id: formData.default_supplier_id ? parseInt(formData.default_supplier_id, 10) : null,
        factory_code: formData.factory_code || null,
        suppliers: (formData.suppliers || []).map((s) => ({
          supplier_id: parseInt(s.supplier_id, 10),
          factory_code: s.factory_code || null,
          vendor_product_name: s.vendor_product_name || null,
          unit_cost: s.unit_cost !== "" && s.unit_cost !== null && s.unit_cost !== undefined ? parseFloat(s.unit_cost) : null,
          currency: s.currency || "USD",
          min_order_qty: s.min_order_qty !== "" && s.min_order_qty !== null && s.min_order_qty !== undefined ? parseFloat(s.min_order_qty) : null,
          lead_time_days: s.lead_time_days !== "" && s.lead_time_days !== null && s.lead_time_days !== undefined ? parseInt(s.lead_time_days, 10) : null,
          is_default: Boolean(s.is_default),
          notes: s.notes || null,
        })),
        images: formData.images || [],
        videos: formData.videos || [],
        attachment: formData.attachment || [],
        is_consumable: Boolean(formData.is_consumable),
        is_hazardous: Boolean(formData.is_hazardous),
        is_perishable: Boolean(formData.is_perishable),
        expiry_days: formData.expiry_days !== "" ? parseInt(formData.expiry_days, 10) : null,
        is_returnable: Boolean(formData.is_returnable),
        warranty_days: formData.warranty_days !== "" ? parseInt(formData.warranty_days, 10) : null,
      };

      if (activeProduct) {
        const res = await axios.put(
          `${process.env.REACT_APP_NETWORK}/inventory/products/${activeProduct.id}`,
          payload,
          { headers: getAuthHeaders() }
        );
        setActiveProduct(res.data);
        toast.success("Product updated successfully!");
      } else {
        payload.sku = formData.sku.trim().toUpperCase();
        const res = await axios.post(`${process.env.REACT_APP_NETWORK}/inventory/products`, payload, {
          headers: getAuthHeaders(),
        });
        setActiveProduct(res.data);
        toast.success("Product registered in catalog!");
      }
    } catch (err) {
      console.error("Failed to save product:", err);
      toast.error(err.response?.data?.detail || "Failed to save product");
    }
  };

  const handleDeleteActiveProduct = async () => {
    if (!activeProduct) return;
    if (!window.confirm(`Delete product ${activeProduct.sku}?`)) return;
    try {
      await axios.delete(`${process.env.REACT_APP_NETWORK}/inventory/products/${activeProduct.id}`, {
        headers: getAuthHeaders(),
      });
      toast.success("Product deleted");
      handleBack();
    } catch (err) {
      console.error("Failed to delete product:", err);
      toast.error(err.response?.data?.detail || "Failed to delete product");
    }
  };

  // ── Linking Items ──────────────────────────────────────────────────────────
  const handleSearchLinkItems = async (val) => {
    setLinkSearch(val);
    if (!val || val.trim().length < 1) {
      setLinkSearchResults([]);
      return;
    }
    try {
      const res = await axios.get(`${process.env.REACT_APP_NETWORK}/inventory/lookup?q=${encodeURIComponent(val)}`, {
        headers: getAuthHeaders(),
      });
      const filtered = (res.data || []).filter((item) => item.id !== activeProduct?.id);
      setLinkSearchResults(filtered);
    } catch (err) {
      console.error("Lookup error:", err);
    }
  };

  const handleCreateLink = async (e) => {
    e.preventDefault();
    if (!activeProduct || !selectedLinkChild) {
      toast.error("Please select a product to link");
      return;
    }
    if (!linkFlags.is_variant && !linkFlags.is_related && !linkFlags.is_part) {
      toast.error("Select at least one relationship flag");
      return;
    }

    try {
      setIsLinking(true);
      const payload = {
        child_product_id: selectedLinkChild.id,
        is_variant: linkFlags.is_variant,
        is_related: linkFlags.is_related,
        is_part: linkFlags.is_part,
        qty: linkFlags.qty !== "" ? parseFloat(linkFlags.qty) : null,
        notes: linkFlags.notes.trim() || null,
      };

      await axios.post(
        `${process.env.REACT_APP_NETWORK}/inventory/products/${activeProduct.id}/links`,
        payload,
        { headers: getAuthHeaders() }
      );

      toast.success("Relationship link created!");
      setSelectedLinkChild(null);
      setLinkSearch("");
      setLinkSearchResults([]);
      setLinkFlags({ is_variant: true, is_related: false, is_part: false, qty: "", notes: "" });

      const res = await axios.get(`${process.env.REACT_APP_NETWORK}/inventory/products/${activeProduct.id}`, {
        headers: getAuthHeaders(),
      });
      setActiveProduct(res.data);
    } catch (err) {
      console.error("Failed to link product:", err);
      toast.error(err.response?.data?.detail || "Failed to link product");
    } finally {
      setIsLinking(false);
    }
  };

  const handleRemoveLink = async (linkId) => {
    if (!window.confirm("Remove this relationship link?")) return;
    try {
      await axios.delete(
        `${process.env.REACT_APP_NETWORK}/inventory/products/${activeProduct.id}/links/${linkId}`,
        { headers: getAuthHeaders() }
      );
      toast.success("Link removed");
      const res = await axios.get(`${process.env.REACT_APP_NETWORK}/inventory/products/${activeProduct.id}`, {
        headers: getAuthHeaders(),
      });
      setActiveProduct(res.data);
    } catch (err) {
      console.error("Failed to remove link:", err);
      toast.error("Failed to remove link");
    }
  };

  // ── Clean Recursive Taxonomy Hierarchy Renderer (BASE -> Parent -> Child) ──
  const renderCategoryTreeNode = (node, depth = 0) => {
    const hasChildren = node.children && node.children.length > 0;
    const isExpanded = expandedCatIds.has(node.id);
    const isSelected = categoryScreenSelectedId === node.id;
    const isRootNode = !node.parent_id || node.name === "Products";

    return (
      <div key={node.id} className="select-none">
        <div
          onClick={() => handleSelectCategoryNode(node.id)}
          className={`group flex items-center justify-between px-3 py-2 rounded-xl text-xs font-medium transition cursor-pointer ${
            isSelected
              ? "bg-indigo-600 text-white shadow-xs"
              : isDark
              ? "text-slate-300 hover:bg-slate-800/80 hover:text-white"
              : "text-slate-700 hover:bg-indigo-50/70 hover:text-indigo-900"
          }`}
          style={{ paddingLeft: `${Math.max(12, depth * 16 + 12)}px` }}
        >
          <div className="flex items-center gap-2 min-w-0">
            {hasChildren ? (
              <button
                type="button"
                onClick={(e) => toggleExpand(node.id, e)}
                className={`p-0.5 rounded transition ${
                  isSelected ? "text-white hover:bg-indigo-700" : "text-slate-400 hover:text-slate-600"
                }`}
              >
                {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
              </button>
            ) : (
              <span className="w-3.5" />
            )}

            {isRootNode ? (
              <Boxes size={16} className={isSelected ? "text-white" : "text-amber-500"} />
            ) : hasChildren ? (
              isExpanded ? (
                <FolderOpen size={15} className={isSelected ? "text-white" : "text-indigo-500"} />
              ) : (
                <Folder size={15} className={isSelected ? "text-white" : "text-indigo-500"} />
              )
            ) : (
              <Tag size={13} className={isSelected ? "text-white" : "text-purple-400"} />
            )}

            <span className={`truncate ${isRootNode ? "font-bold text-sm tracking-tight" : ""}`}>
              {node.name}
            </span>
          </div>

          <div className="flex items-center gap-1.5 ml-2">
            <span
              className={`text-[11px] font-mono px-2 py-0.5 rounded-full ${
                isSelected
                  ? "bg-indigo-700 text-white font-bold"
                  : isDark
                  ? "bg-slate-800 text-slate-400"
                  : "bg-slate-100 text-slate-500"
              }`}
            >
              {node.products_count}
            </span>

            {/* Action Buttons: Edit & Delete (Hover) */}
            <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
              <button
                type="button"
                title="Edit Category"
                onClick={(e) => handleOpenEditCategoryModal(node, e)}
                className={`p-1 rounded hover:bg-black/10 dark:hover:bg-white/10 ${
                  isSelected ? "text-white" : "text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400"
                }`}
              >
                <Pencil size={12} />
              </button>
              {!isRootNode && (
                <button
                  type="button"
                  title="Delete Category"
                  onClick={(e) => handleOpenDeleteCategoryModal(node, e)}
                  className={`p-1 rounded hover:bg-rose-500/20 ${
                    isSelected ? "text-rose-200 hover:text-white" : "text-slate-400 hover:text-rose-600"
                  }`}
                >
                  <Trash2 size={12} />
                </button>
              )}
            </div>
          </div>
        </div>

        {hasChildren && isExpanded && (
          <div className="relative">
            <div
              className="absolute left-0 top-0 bottom-0 border-l border-slate-200 dark:border-slate-800"
              style={{ left: `${depth * 16 + 18}px` }}
            />
            {node.children.map((child) => renderCategoryTreeNode(child, depth + 1))}
          </div>
        )}
      </div>
    );
  };

  // ══════════════════════════════════════════════════════════════════════════
  // SCREEN 3: DEDICATED PRODUCT SCREEN WITH TABS
  // ══════════════════════════════════════════════════════════════════════════
  if (currentView === "product_detail") {
    return (
      <div className="h-[calc(100vh-1.5rem)] flex flex-col min-h-0 w-full max-w-[1720px] mx-auto px-3 sm:px-6 lg:px-8 py-2.5 space-y-3 overflow-hidden">
        {/* Compact Action & Title Bar - FIXED PINNED */}
        <div
          className={`flex-none p-3.5 rounded-2xl border shadow-xs transition flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
            isDark ? "bg-slate-900 border-slate-800 text-white" : "bg-white border-slate-200 text-slate-900"
          }`}
        >
          <div className="flex items-center gap-3 min-w-0 flex-wrap">
            <button
              type="button"
              onClick={handleBack}
              className={`px-3 py-2 rounded-xl border transition flex items-center gap-1.5 text-xs font-bold shrink-0 cursor-pointer ${
                isDark
                  ? "bg-slate-800/80 border-slate-700 text-slate-200 hover:bg-slate-700"
                  : "bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100"
              }`}
            >
              <ArrowLeft size={15} />
              <span>Back to {returnToView === "categories" ? "Categories" : "Products"}</span>
            </button>

            <span className="text-slate-300 dark:text-slate-700 hidden sm:inline">|</span>

            <div className="flex items-center gap-2 text-xs min-w-0">
              <span className="text-slate-400 hidden md:inline">Inventory Master</span>
              <ChevronRight size={13} className="text-slate-400 hidden md:inline" />
              <h2 className="font-extrabold text-slate-900 dark:text-white truncate max-w-xs sm:max-w-md">
                {formData?.name || (activeProduct ? "Edit Product" : "Register Product")}
              </h2>
              {formData?.sku && (
                <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200 dark:border-indigo-800 text-indigo-700 dark:text-indigo-300 font-mono text-[11px] font-extrabold shrink-0">
                  <span>{formData.sku}</span>
                  <button
                    type="button"
                    onClick={handleCopySku}
                    className="hover:text-indigo-900 dark:hover:text-white transition p-0.5 cursor-pointer"
                    title="Copy Trading SKU"
                  >
                    <Copy size={11} />
                  </button>
                </div>
              )}
              {formData?.status && (
                <span
                  className={`hidden sm:inline-flex px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase border items-center gap-1 shrink-0 ${
                    formData.status === "active"
                      ? "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border-emerald-300 dark:border-emerald-800"
                      : "bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border-amber-300 dark:border-amber-800"
                  }`}
                >
                  <span
                    className={`w-1.5 h-1.5 rounded-full ${
                      formData.status === "active" ? "bg-emerald-500" : "bg-amber-500"
                    }`}
                  />
                  <span>{formData.status}</span>
                </span>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2.5 shrink-0 self-end sm:self-center">
            {activeProduct && (
              <button
                type="button"
                onClick={handleDeleteActiveProduct}
                className="px-3.5 py-2 rounded-xl text-xs font-bold text-red-600 border border-red-200 dark:border-red-900/50 hover:bg-red-50 dark:hover:bg-red-950/30 transition flex items-center gap-1.5 cursor-pointer"
              >
                <Trash2 size={14} />
                <span>Delete</span>
              </button>
            )}

            <button
              type="button"
              onClick={handleSaveProduct}
              className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition shadow-md shadow-indigo-600/25 active:scale-95 flex items-center gap-2 cursor-pointer"
            >
              <Check size={16} />
              <span>{activeProduct ? "Save Specifications" : "Register Product"}</span>
            </button>
          </div>
        </div>

        {/* Tab Navigation - FIXED PINNED */}
        <div
          className={`flex-none p-1.5 rounded-2xl border shadow-xs flex items-center gap-1.5 overflow-x-auto text-xs font-bold scrollbar-thin ${
            isDark ? "bg-slate-900 border-slate-800" : "bg-white border-slate-200"
          }`}
        >
          {[
            {
              id: "specs",
              label: "Specifications & Identity",
              icon: Boxes,
              match: ["specs", "basic"],
            },
            {
              id: "dimensions",
              label: "Dimensions & Packaging",
              icon: Ruler,
              match: ["dimensions", "packaging"],
            },
            {
              id: "stock",
              label: "Warehouse & Stock Controls",
              icon: Warehouse,
              match: ["stock", "warehouse"],
            },
            {
              id: "sourcing",
              label: `Sourcing & Suppliers (${formData?.suppliers?.length || 0})`,
              icon: Building,
              match: ["sourcing", "vendors"],
            },
            {
              id: "trade",
              label: "Customs & Compliance",
              icon: ShieldCheck,
              match: ["trade", "flags"],
            },
            {
              id: "media",
              label: `Media & Gallery (${(formData?.images?.length || 0) + (formData?.videos?.length || 0)})`,
              icon: Film,
              match: ["media"],
            },
            ...(activeProduct
              ? [
                  {
                    id: "pipeline",
                    label: "Orders Pipeline & Links",
                    icon: TrendingUp,
                    match: ["pipeline", "overview", "links"],
                  },
                ]
              : []),
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = tab.match.includes(activeProductTab);
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveProductTab(tab.id)}
                className={`px-4 py-2.5 rounded-xl transition flex items-center gap-2 whitespace-nowrap cursor-pointer ${
                  isActive
                    ? "bg-indigo-600 text-white shadow-xs"
                    : isDark
                    ? "text-slate-400 hover:bg-slate-800 hover:text-slate-200"
                    : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                }`}
              >
                <Icon size={15} />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Tab Content Panels - CONTAINED SCROLLING UNDER TABS */}
        <div
          className={`flex-1 min-h-0 overflow-y-auto scrollbar-thin p-6 rounded-2xl border shadow-xs ${
            isDark ? "bg-slate-900 border-slate-800 text-white" : "bg-white border-slate-200 text-slate-900"
          }`}
        >
          {productLoading ? (
            <div className="py-16 text-center text-slate-400">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mb-3" />
              <p className="font-semibold">Loading product specifications...</p>
            </div>
          ) : (
            <>
              {/* TAB 5: OVERVIEW & PIPELINE */}
              {(activeProductTab === "pipeline" || activeProductTab === "overview") && (
                <div className="space-y-6">
                  <div className="flex items-center gap-2 pb-2 border-b border-slate-200 dark:border-slate-800 text-sm font-bold text-slate-900 dark:text-white">
                    <TrendingUp size={16} className="text-indigo-500" />
                    <span>Procurement Order Delivery Pipeline</span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div
                      className={`p-4 rounded-xl border text-center ${
                        isDark ? "bg-slate-800/60 border-slate-700" : "bg-slate-50 border-slate-200"
                      }`}
                    >
                      <div className="text-xs uppercase font-bold text-slate-400">On-Hand Stock</div>
                      <div className="text-2xl font-extrabold font-mono mt-1">
                        {formData?.current_stock?.toLocaleString()} {formData?.unit}
                      </div>
                      <div className="text-[11px] text-slate-400 mt-0.5">Physical baseline inventory</div>
                    </div>

                    <div
                      className={`p-4 rounded-xl border text-center ${
                        isDark ? "bg-blue-950/20 border-blue-900/60" : "bg-blue-50 border-blue-200"
                      }`}
                    >
                      <div className="text-xs uppercase font-bold text-blue-600 dark:text-blue-400">
                        Incoming On-Order
                      </div>
                      <div className="text-2xl font-extrabold font-mono text-blue-600 dark:text-blue-400 mt-1">
                        {activeProduct?.qty_on_order?.toLocaleString() || 0} {formData?.unit}
                      </div>
                      <div className="text-[11px] text-blue-500 mt-0.5">Units in active purchase orders</div>
                    </div>

                    <div
                      className={`p-4 rounded-xl border text-center ${
                        isDark ? "bg-emerald-950/20 border-emerald-900/60" : "bg-emerald-50 border-emerald-200"
                      }`}
                    >
                      <div className="text-xs uppercase font-bold text-emerald-600 dark:text-emerald-400">
                        Total Received Qty
                      </div>
                      <div className="text-2xl font-extrabold font-mono text-emerald-600 dark:text-emerald-400 mt-1">
                        {activeProduct?.qty_received?.toLocaleString() || 0} {formData?.unit}
                      </div>
                      <div className="text-[11px] text-emerald-500 mt-0.5">Fulfilled across completed orders</div>
                    </div>
                  </div>

                  <div className="space-y-3 pt-2">
                    <div className="flex items-center justify-between">
                      <h4 className="text-sm font-bold flex items-center gap-2">
                        <ShoppingCart size={16} className="text-indigo-500" />
                        <span>Procurement Order Delivery Pipeline ({activeProduct?.recent_pos?.length || 0})</span>
                      </h4>
                      <span className="text-xs text-slate-400">
                        Real-time tracking of purchase orders containing this item
                      </span>
                    </div>

                    {!activeProduct?.recent_pos?.length ? (
                      <div
                        className={`p-8 text-center rounded-xl border text-xs text-slate-400 ${
                          isDark ? "border-slate-800 bg-slate-800/20" : "border-slate-200 bg-slate-50"
                        }`}
                      >
                        <ShoppingCart size={28} className="mx-auto mb-2 opacity-30 text-indigo-500" />
                        <p className="font-semibold">No active purchase orders contain this item</p>
                        <p className="text-[11px] mt-0.5">
                          When you add this product to an incoming purchase order, live delivery statuses and container ETAs appear here.
                        </p>
                      </div>
                    ) : (
                      <div className="space-y-2.5">
                        {activeProduct.recent_pos.map((po) => {
                          const diff = Math.max(0, po.quantity_ordered - po.quantity_received);
                          return (
                            <div
                              key={po.po_id}
                              className={`p-4 rounded-xl border flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                                isDark ? "bg-slate-800/60 border-slate-700" : "bg-white border-slate-200 shadow-xs"
                              }`}
                            >
                              <div className="space-y-1">
                                <div className="flex items-center gap-2">
                                  <span className="font-mono font-bold text-sm text-blue-600 dark:text-blue-400">
                                    {po.po_number}
                                  </span>
                                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 dark:bg-blue-950/60 text-blue-800 dark:text-blue-300">
                                    {po.status}
                                  </span>
                                </div>
                                {po.eta_date && (
                                  <div className="text-xs text-slate-400 flex items-center gap-1.5">
                                    <Calendar size={13} />
                                    <span>Estimated Delivery ETA: {po.eta_date}</span>
                                  </div>
                                )}
                              </div>

                              <div className="text-right">
                                <div className="font-mono font-bold text-sm">
                                  Ordered: {po.quantity_ordered} {formData?.unit}
                                </div>
                                <div className="text-xs text-slate-500">
                                  Received: {po.quantity_received} |{" "}
                                  <span className="font-bold text-amber-600">Pending: {diff}</span>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* TAB 1: SPECIFICATIONS & IDENTITY */}
              {(activeProductTab === "specs" || activeProductTab === "basic") && (
                <div className="space-y-5">
                  <div className="flex items-center gap-2 pb-2 border-b border-slate-200 dark:border-slate-800 text-sm font-bold text-slate-900 dark:text-white">
                    <Boxes size={16} className="text-indigo-500" />
                    <span>Product Master Identity & Classification</span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                    <div>
                      <label className="block text-xs font-bold mb-1">Trading SKU (External) *</label>
                      <input
                        type="text"
                        required
                        value={formData?.sku || ""}
                        onChange={(e) => setFormData({ ...formData, sku: e.target.value.toUpperCase() })}
                        placeholder="e.g. TL-PORC-60X60-IVORY"
                        className={`w-full px-3.5 py-2.5 border rounded-xl text-xs font-mono font-bold uppercase focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
                          isDark
                            ? "bg-slate-800 border-slate-700 text-white placeholder-slate-500"
                            : "bg-slate-50 border-slate-200 text-slate-900"
                        }`}
                      />
                      <p className="text-[10px] text-slate-400 mt-1">Trading code for suppliers & market orders (must be unique)</p>
                    </div>

                    <div>
                      <label className="block text-xs font-bold mb-1">Internal Product Code</label>
                      <input
                        type="text"
                        value={formData?.code || ""}
                        onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                        placeholder="e.g. ITEM-CT-001"
                        className={`w-full px-3.5 py-2.5 border rounded-xl text-xs font-mono font-bold uppercase focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
                          isDark ? "bg-slate-800 border-slate-700 text-white" : "bg-slate-50 border-slate-200 text-slate-900"
                        }`}
                      />
                      <p className="text-[10px] text-slate-400 mt-1">Organization's internal catalog index</p>
                    </div>

                    <div className="sm:col-span-2">
                      <label className="block text-xs font-bold mb-1">Product Title / Name *</label>
                      <input
                        type="text"
                        required
                        value={formData?.name || ""}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        placeholder="e.g. Porcelain Floor Tile 60x60 Ivory Glazed"
                        className={`w-full px-3.5 py-2.5 border rounded-xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
                          isDark ? "bg-slate-800 border-slate-700 text-white" : "bg-slate-50 border-slate-200 text-slate-900"
                        }`}
                      />
                    </div>

                    <div className="sm:col-span-2">
                      <label className="block text-xs font-bold mb-1">Quick Description (One-liner)</label>
                      <input
                        type="text"
                        value={formData?.description_quick || ""}
                        onChange={(e) => setFormData({ ...formData, description_quick: e.target.value })}
                        placeholder="e.g. Premium porcelain floor tile with R10 slip rating for commercial zones"
                        className={`w-full px-3.5 py-2.5 border rounded-xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
                          isDark ? "bg-slate-800 border-slate-700 text-white" : "bg-slate-50 border-slate-200 text-slate-900"
                        }`}
                      />
                    </div>

                    {/* Sourcing & Factory Code Quick Overview */}
                    <div className="sm:col-span-2 p-3 rounded-xl border border-indigo-100 dark:border-indigo-900/40 bg-indigo-50/40 dark:bg-indigo-950/20 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                      <div className="flex items-center gap-2.5 flex-wrap">
                        <Building size={16} className="text-indigo-600 dark:text-indigo-400 flex-none" />
                        <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                          Primary Vendor:{" "}
                          <span className="text-indigo-600 dark:text-indigo-400 font-extrabold">
                            {suppliers.find((s) => Number(s.supplier_id || s.id) === Number(formData?.default_supplier_id))?.name ||
                              (formData?.suppliers && formData.suppliers.find((s) => s.is_default)?.supplier_name) ||
                              "Not Assigned"}
                          </span>
                        </span>
                        {(() => {
                          const defSupp = formData?.suppliers?.find((s) => s.is_default) || formData?.suppliers?.[0];
                          const fc = defSupp?.factory_code || formData?.factory_code;
                          return fc ? (
                            <span
                              title="Vendor's factory / catalog article code"
                              className="px-2 py-0.5 rounded text-[11px] font-mono font-bold bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-500/30 flex items-center gap-1"
                            >
                              <span>🏭 Factory Code: {fc}</span>
                            </span>
                          ) : null;
                        })()}
                        {formData?.suppliers && formData.suppliers.length > 1 && (
                          <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 font-semibold">
                            +{formData.suppliers.length - 1} other vendors
                          </span>
                        )}
                      </div>
                      <button
                        type="button"
                        onClick={() => setActiveProductTab("inventory")}
                        className="text-xs font-bold text-indigo-600 hover:text-indigo-700 dark:text-indigo-400 hover:underline flex items-center gap-1 self-start sm:self-auto"
                      >
                        <span>Manage Vendors & Factory Codes</span>
                        <ChevronRight size={13} />
                      </button>
                    </div>

                    <div>
                      <label className="block text-xs font-bold mb-1">Category</label>
                      <select
                        value={formData?.category_id || ""}
                        onChange={(e) => setFormData({ ...formData, category_id: e.target.value })}
                        className={`w-full px-3.5 py-2.5 border rounded-xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
                          isDark ? "bg-slate-800 border-slate-700 text-white" : "bg-slate-50 border-slate-200 text-slate-900"
                        }`}
                      >
                        <option value="">Select Category</option>
                        {flattenedCategories.map((c) => (
                          <option key={c.id} value={c.id}>
                            {c.displayName}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-bold mb-1">Unit of Measure (UoM) *</label>
                      <select
                        value={formData?.unit || "PCS"}
                        onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
                        className={`w-full px-3.5 py-2.5 border rounded-xl text-xs font-mono font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
                          isDark ? "bg-slate-800 border-slate-700 text-white" : "bg-slate-50 border-slate-200 text-slate-900"
                        }`}
                      >
                        {UOM_OPTIONS.map((u) => (
                          <option key={u} value={u}>
                            {u}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-bold mb-1">Brand / Manufacturer</label>
                      <input
                        type="text"
                        value={formData?.brand || ""}
                        onChange={(e) => setFormData({ ...formData, brand: e.target.value })}
                        placeholder="e.g. Kajaria, Schneider"
                        className={`w-full px-3.5 py-2.5 border rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
                          isDark ? "bg-slate-800 border-slate-700 text-white" : "bg-slate-50 border-slate-200 text-slate-900"
                        }`}
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold mb-1">Product Status</label>
                      <select
                        value={formData?.status || "active"}
                        onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                        className={`w-full px-3.5 py-2.5 border rounded-xl text-xs font-bold focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
                          formData?.status === "active"
                            ? "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border-emerald-300"
                            : "bg-slate-100 dark:bg-slate-800 text-slate-600 border-slate-300"
                        }`}
                      >
                        <option value="active">Active (Available for Orders)</option>
                        <option value="inactive">Inactive (Hidden from Order Selection)</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-bold mb-1">Model Number</label>
                      <input
                        type="text"
                        value={formData?.model_number || ""}
                        onChange={(e) => setFormData({ ...formData, model_number: e.target.value })}
                        placeholder="e.g. MD-60-IV"
                        className={`w-full px-3.5 py-2.5 border rounded-xl text-xs font-mono focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
                          isDark ? "bg-slate-800 border-slate-700 text-white" : "bg-slate-50 border-slate-200 text-slate-900"
                        }`}
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold mb-1">Series / Line</label>
                      <input
                        type="text"
                        value={formData?.series || ""}
                        onChange={(e) => setFormData({ ...formData, series: e.target.value })}
                        placeholder="e.g. Graniti Luxe Series"
                        className={`w-full px-3.5 py-2.5 border rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
                          isDark ? "bg-slate-800 border-slate-700 text-white" : "bg-slate-50 border-slate-200 text-slate-900"
                        }`}
                      />
                    </div>

                    {/* Dynamic Tagging System */}
                    <div className="sm:col-span-2 p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40 space-y-3">
                      <div className="flex items-center justify-between">
                        <label className="text-xs font-bold flex items-center gap-1.5 text-slate-800 dark:text-slate-200">
                          <Tag size={14} className="text-indigo-500" />
                          <span>Product Classification Tags</span>
                          <span className="text-[10px] text-slate-400 font-normal hidden sm:inline">(Used for catalog discovery, warehouse routing & search)</span>
                        </label>
                        <span className="text-[11px] font-mono text-slate-400">
                          {Array.isArray(formData?.tags) ? formData.tags.length : 0} tags
                        </span>
                      </div>

                      {/* Tag Chips */}
                      <div className="flex flex-wrap items-center gap-1.5 min-h-[32px]">
                        {Array.isArray(formData?.tags) && formData.tags.length > 0 ? (
                          formData.tags.map((t) => (
                            <span
                              key={t}
                              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800"
                            >
                              <span>#{t}</span>
                              <button
                                type="button"
                                onClick={() => handleRemoveTag(t)}
                                className="text-indigo-400 hover:text-rose-500 transition p-0.5 cursor-pointer"
                                title={`Remove tag ${t}`}
                              >
                                <X size={12} />
                              </button>
                            </span>
                          ))
                        ) : (
                          <span className="text-xs text-slate-400 italic">No tags assigned yet. Type a tag below or select suggestions.</span>
                        )}
                      </div>

                      {/* Add Tag Input */}
                      <div className="flex gap-2 pt-1">
                        <div className="relative flex-1">
                          <Hash size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                          <input
                            type="text"
                            value={tagInput}
                            onChange={(e) => setTagInput(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === "Enter" || e.key === ",") {
                                e.preventDefault();
                                handleAddTag();
                              }
                            }}
                            placeholder="Add tag (press Enter or comma)..."
                            className={`w-full pl-8 pr-20 py-2 border rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
                              isDark ? "bg-slate-800 border-slate-700 text-white" : "bg-white border-slate-200 text-slate-900"
                            }`}
                          />
                          <button
                            type="button"
                            onClick={() => handleAddTag()}
                            disabled={!tagInput.trim()}
                            className="absolute right-1.5 top-1/2 -translate-y-1/2 px-2.5 py-1 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 text-white rounded-lg text-[11px] font-bold cursor-pointer"
                          >
                            Add
                          </button>
                        </div>
                      </div>

                      {/* Suggested Quick Tags */}
                      <div className="flex items-center gap-1.5 flex-wrap pt-1">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Suggestions:</span>
                        {SUGGESTED_TAGS.filter((st) => !((formData?.tags || []).includes(st))).slice(0, 8).map((st) => (
                          <button
                            key={st}
                            type="button"
                            onClick={() => handleAddTag(st)}
                            className={`px-2 py-0.5 rounded-md text-[10px] font-medium border transition cursor-pointer ${
                              isDark
                                ? "bg-slate-800/80 border-slate-700 text-slate-300 hover:bg-indigo-950/60 hover:border-indigo-800 hover:text-indigo-300"
                                : "bg-white border-slate-200 text-slate-600 hover:bg-indigo-50 hover:border-indigo-200 hover:text-indigo-700"
                            }`}
                          >
                            +{st}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold mb-1">Full Technical Specifications</label>
                    <textarea
                      rows={4}
                      value={formData?.description || ""}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      placeholder="Detailed physical, chemical, and finish specifications..."
                      className={`w-full px-3.5 py-2.5 border rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
                        isDark ? "bg-slate-800 border-slate-700 text-white" : "bg-slate-50 border-slate-200 text-slate-900"
                      }`}
                    />
                  </div>
                </div>
              )}

              {/* TRADE & CUSTOMS */}
              {(activeProductTab === "trade" || activeProductTab === "flags") && (
                <div className="space-y-4">
                  <div className="flex items-center gap-2 pb-2 border-b border-slate-200 dark:border-slate-800 text-sm font-bold text-slate-900 dark:text-white">
                    <Truck size={16} className="text-indigo-500" />
                    <span>Customs Tariff, HS Code & Origin</span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                    <div>
                      <label className="block text-xs font-bold mb-1">Harmonized Tariff (HS Code)</label>
                      <input
                        type="text"
                        value={formData?.hs_code || ""}
                        onChange={(e) => setFormData({ ...formData, hs_code: e.target.value })}
                        placeholder="e.g. 6907.21"
                        className={`w-full px-3.5 py-2.5 border rounded-xl text-xs font-mono font-bold focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
                          isDark ? "bg-slate-800 border-slate-700 text-white" : "bg-slate-50 border-slate-200 text-slate-900"
                        }`}
                      />
                      <p className="text-[10px] text-slate-400 mt-1">International HS tariff classification for customs</p>
                    </div>

                    <div>
                      <label className="block text-xs font-bold mb-1">Customs Duty Rate (%)</label>
                      <input
                        type="number"
                        step="0.01"
                        value={formData?.duty_rate !== null ? formData.duty_rate : ""}
                        onChange={(e) => setFormData({ ...formData, duty_rate: e.target.value })}
                        placeholder="e.g. 5.00"
                        className={`w-full px-3.5 py-2.5 border rounded-xl text-xs font-mono focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
                          isDark ? "bg-slate-800 border-slate-700 text-white" : "bg-slate-50 border-slate-200 text-slate-900"
                        }`}
                      />
                      <p className="text-[10px] text-slate-400 mt-1">Import duty percentage applied on landed value</p>
                    </div>

                    <div>
                      <label className="block text-xs font-bold mb-1">Country of Origin</label>
                      <select
                        value={formData?.country_of_origin || ""}
                        onChange={(e) => setFormData({ ...formData, country_of_origin: e.target.value })}
                        className={`w-full px-3.5 py-2.5 border rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
                          isDark ? "bg-slate-800 border-slate-700 text-white" : "bg-slate-50 border-slate-200 text-slate-900"
                        }`}
                      >
                        <option value="">— Select Manufacturing Country of Origin —</option>
                        {COUNTRIES.map((c) => (
                          <option key={c.code} value={c.name}>
                            {c.flag} {c.name} ({c.code})
                          </option>
                        ))}
                      </select>
                      <p className="text-[10px] text-slate-400 mt-1">Country of origin used for customs clearing and landed valuation</p>
                    </div>

                    <div>
                      <label className="block text-xs font-bold mb-1">Barcode (EAN / UPC / GTIN)</label>
                      <input
                        type="text"
                        value={formData?.barcode || ""}
                        onChange={(e) => setFormData({ ...formData, barcode: e.target.value })}
                        placeholder="e.g. 8901234567890"
                        className={`w-full px-3.5 py-2.5 border rounded-xl text-xs font-mono focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
                          isDark ? "bg-slate-800 border-slate-700 text-white" : "bg-slate-50 border-slate-200 text-slate-900"
                        }`}
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 2: DIMENSIONS & MULTI-TIER PACKAGING */}
              {(activeProductTab === "dimensions" || activeProductTab === "packaging") && (
                <div className="space-y-6">
                  {/* Top Summary Banner */}
                  <div className={`p-4 rounded-xl border flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                    isDark ? "bg-slate-800/40 border-slate-700/80" : "bg-gradient-to-r from-indigo-50/60 to-purple-50/40 border-indigo-100"
                  }`}>
                    <div className="flex items-center gap-3">
                      <div className="p-2.5 rounded-xl bg-indigo-600 text-white shadow-xs">
                        <Ruler size={18} />
                      </div>
                      <div>
                        <h4 className="text-xs font-bold text-slate-900 dark:text-white">Multi-Tier Packaging & Container Load Plan</h4>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400">
                          Configure primary retail unit, wholesale inner pack, master shipping container, and container stuffing capacity.
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={handleEstimateContainerCapacity}
                        className="px-3 py-1.5 rounded-lg text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white transition flex items-center gap-1.5 shadow-xs cursor-pointer"
                        title="Auto-calculate 20ft and 40ft HC capacity based on current packaging CBM"
                      >
                        <Calculator size={13} />
                        <span>Estimate Container Load</span>
                      </button>
                    </div>
                  </div>

                  {/* ── TIER 1: RETAIL (PRIMARY) PACKAGING ─────────────────────── */}
                  <div className={`p-5 rounded-2xl border space-y-4 ${
                    isDark ? "bg-slate-900/60 border-slate-800" : "bg-white border-slate-200 shadow-xs"
                  }`}>
                    <div className="flex items-center justify-between pb-2 border-b border-slate-200 dark:border-slate-800">
                      <div className="flex items-center gap-2">
                        <span className="w-6 h-6 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 text-xs font-extrabold flex items-center justify-center">1</span>
                        <h4 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">Retail Packaging (Individual Consumer Unit)</h4>
                      </div>
                      {calculatedCBM && (
                        <span className="px-2.5 py-0.5 rounded-full text-[11px] font-mono font-bold bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                          Unit Volume: {calculatedCBM} CBM
                        </span>
                      )}
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                      <div className="sm:col-span-2">
                        <label className="block text-xs font-bold mb-1">Retail Packaging Type</label>
                        <div className="flex gap-2">
                          <select
                            value={RETAIL_PACKAGING_TYPES.includes(formData?.retail_packaging_type) ? formData.retail_packaging_type : "Custom"}
                            onChange={(e) => {
                              if (e.target.value !== "Custom") {
                                setFormData({ ...formData, retail_packaging_type: e.target.value });
                              }
                            }}
                            className={`w-1/2 px-3 py-2 border rounded-xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
                              isDark ? "bg-slate-800 border-slate-700 text-white" : "bg-slate-50 border-slate-200 text-slate-900"
                            }`}
                          >
                            {RETAIL_PACKAGING_TYPES.map((t) => (
                              <option key={t} value={t}>{t}</option>
                            ))}
                            <option value="Custom">Custom Write-in...</option>
                          </select>
                          <input
                            type="text"
                            value={formData?.retail_packaging_type || ""}
                            onChange={(e) => setFormData({ ...formData, retail_packaging_type: e.target.value })}
                            placeholder="Type retail packaging type..."
                            className={`flex-1 px-3 py-2 border rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
                              isDark ? "bg-slate-800 border-slate-700 text-white" : "bg-slate-50 border-slate-200 text-slate-900"
                            }`}
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-xs font-bold mb-1">Unit Net Weight</label>
                        <div className="flex gap-1.5">
                          <input
                            type="number"
                            step="any"
                            value={formData?.weight_per_unit !== null ? formData.weight_per_unit : ""}
                            onChange={(e) => setFormData({ ...formData, weight_per_unit: e.target.value })}
                            placeholder="0.00"
                            className={`flex-1 px-3 py-2 border rounded-xl text-xs font-mono focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
                              isDark ? "bg-slate-800 border-slate-700 text-white" : "bg-slate-50 border-slate-200"
                            }`}
                          />
                          <select
                            value={formData?.weight_unit || "kg"}
                            onChange={(e) => setFormData({ ...formData, weight_unit: e.target.value })}
                            className={`w-20 px-2 py-2 border rounded-xl text-xs font-mono focus:outline-none ${
                              isDark ? "bg-slate-800 border-slate-700 text-white" : "bg-slate-50 border-slate-200"
                            }`}
                          >
                            {WEIGHT_UNITS.map((w) => (<option key={w} value={w}>{w}</option>))}
                          </select>
                        </div>
                      </div>

                      <div>
                        <label className="block text-xs font-bold mb-1">Unit Gross Weight (w/ pack)</label>
                        <input
                          type="number"
                          step="any"
                          value={formData?.gross_weight_per_unit !== null ? formData.gross_weight_per_unit : ""}
                          onChange={(e) => setFormData({ ...formData, gross_weight_per_unit: e.target.value })}
                          placeholder="0.00"
                          className={`w-full px-3 py-2 border rounded-xl text-xs font-mono focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
                            isDark ? "bg-slate-800 border-slate-700 text-white" : "bg-slate-50 border-slate-200"
                          }`}
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-1">
                      <div>
                        <label className="block text-xs font-bold mb-1">Unit Length</label>
                        <input
                          type="number"
                          step="any"
                          value={formData?.length !== null ? formData.length : ""}
                          onChange={(e) => setFormData({ ...formData, length: e.target.value })}
                          placeholder="0.0"
                          className={`w-full px-3 py-2 border rounded-xl text-xs font-mono focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
                            isDark ? "bg-slate-800 border-slate-700 text-white" : "bg-slate-50 border-slate-200"
                          }`}
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-bold mb-1">Unit Width</label>
                        <input
                          type="number"
                          step="any"
                          value={formData?.width !== null ? formData.width : ""}
                          onChange={(e) => setFormData({ ...formData, width: e.target.value })}
                          placeholder="0.0"
                          className={`w-full px-3 py-2 border rounded-xl text-xs font-mono focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
                            isDark ? "bg-slate-800 border-slate-700 text-white" : "bg-slate-50 border-slate-200"
                          }`}
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-bold mb-1">Unit Height</label>
                        <input
                          type="number"
                          step="any"
                          value={formData?.height !== null ? formData.height : ""}
                          onChange={(e) => setFormData({ ...formData, height: e.target.value })}
                          placeholder="0.0"
                          className={`w-full px-3 py-2 border rounded-xl text-xs font-mono focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
                            isDark ? "bg-slate-800 border-slate-700 text-white" : "bg-slate-50 border-slate-200"
                          }`}
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-bold mb-1">Dimension Unit</label>
                        <select
                          value={formData?.dimension_unit || "mm"}
                          onChange={(e) => setFormData({ ...formData, dimension_unit: e.target.value })}
                          className={`w-full px-3 py-2 border rounded-xl text-xs font-mono focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
                            isDark ? "bg-slate-800 border-slate-700 text-white" : "bg-slate-50 border-slate-200"
                          }`}
                        >
                          {DIMENSION_UNITS.map((u) => (<option key={u} value={u}>{u}</option>))}
                        </select>
                      </div>
                    </div>
                  </div>

                  {/* ── TIER 2: WHOLESALE (INNER PACK) PACKAGING ────────────────── */}
                  <div className={`p-5 rounded-2xl border space-y-4 ${
                    isDark ? "bg-slate-900/60 border-slate-800" : "bg-white border-slate-200 shadow-xs"
                  }`}>
                    <div className="flex items-center justify-between pb-2 border-b border-slate-200 dark:border-slate-800">
                      <div className="flex items-center gap-2">
                        <span className="w-6 h-6 rounded-full bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300 text-xs font-extrabold flex items-center justify-center">2</span>
                        <h4 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">Wholesale Packaging (Inner Pack / Bundle / Sub-Box)</h4>
                      </div>
                      <span className="text-[11px] text-slate-400">Optional tier for bundled wholesale distribution</span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                      <div className="sm:col-span-2">
                        <label className="block text-xs font-bold mb-1">Wholesale Packaging Type</label>
                        <div className="flex gap-2">
                          <select
                            value={WHOLESALE_PACKAGING_TYPES.includes(formData?.wholesale_packaging_type) ? formData.wholesale_packaging_type : "Custom"}
                            onChange={(e) => {
                              if (e.target.value !== "Custom") {
                                setFormData({ ...formData, wholesale_packaging_type: e.target.value });
                              }
                            }}
                            className={`w-1/2 px-3 py-2 border rounded-xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
                              isDark ? "bg-slate-800 border-slate-700 text-white" : "bg-slate-50 border-slate-200 text-slate-900"
                            }`}
                          >
                            {WHOLESALE_PACKAGING_TYPES.map((t) => (
                              <option key={t} value={t}>{t}</option>
                            ))}
                            <option value="Custom">Custom Write-in...</option>
                          </select>
                          <input
                            type="text"
                            value={formData?.wholesale_packaging_type || ""}
                            onChange={(e) => setFormData({ ...formData, wholesale_packaging_type: e.target.value })}
                            placeholder="Type wholesale packaging type..."
                            className={`flex-1 px-3 py-2 border rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
                              isDark ? "bg-slate-800 border-slate-700 text-white" : "bg-slate-50 border-slate-200 text-slate-900"
                            }`}
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-xs font-bold mb-1">Units per Inner Pack</label>
                        <input
                          type="number"
                          step="any"
                          value={formData?.units_per_inner !== null ? formData.units_per_inner : ""}
                          onChange={(e) => setFormData({ ...formData, units_per_inner: e.target.value })}
                          placeholder="e.g. 6 or 12"
                          className={`w-full px-3 py-2 border rounded-xl text-xs font-mono focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
                            isDark ? "bg-slate-800 border-slate-700 text-white" : "bg-slate-50 border-slate-200"
                          }`}
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-bold mb-1">Inner Pack Weight ({formData?.weight_unit || "kg"})</label>
                        <input
                          type="number"
                          step="any"
                          value={formData?.inner_weight !== null ? formData.inner_weight : ""}
                          onChange={(e) => setFormData({ ...formData, inner_weight: e.target.value })}
                          placeholder="0.00"
                          className={`w-full px-3 py-2 border rounded-xl text-xs font-mono focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
                            isDark ? "bg-slate-800 border-slate-700 text-white" : "bg-slate-50 border-slate-200"
                          }`}
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-3 gap-4 pt-1">
                      <div>
                        <label className="block text-xs font-bold mb-1">Inner Length ({formData?.dimension_unit || "mm"})</label>
                        <input
                          type="number"
                          step="any"
                          value={formData?.inner_length !== null ? formData.inner_length : ""}
                          onChange={(e) => setFormData({ ...formData, inner_length: e.target.value })}
                          placeholder="0.0"
                          className={`w-full px-3 py-2 border rounded-xl text-xs font-mono focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
                            isDark ? "bg-slate-800 border-slate-700 text-white" : "bg-slate-50 border-slate-200"
                          }`}
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-bold mb-1">Inner Width ({formData?.dimension_unit || "mm"})</label>
                        <input
                          type="number"
                          step="any"
                          value={formData?.inner_width !== null ? formData.inner_width : ""}
                          onChange={(e) => setFormData({ ...formData, inner_width: e.target.value })}
                          placeholder="0.0"
                          className={`w-full px-3 py-2 border rounded-xl text-xs font-mono focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
                            isDark ? "bg-slate-800 border-slate-700 text-white" : "bg-slate-50 border-slate-200"
                          }`}
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-bold mb-1">Inner Height ({formData?.dimension_unit || "mm"})</label>
                        <input
                          type="number"
                          step="any"
                          value={formData?.inner_height !== null ? formData.inner_height : ""}
                          onChange={(e) => setFormData({ ...formData, inner_height: e.target.value })}
                          placeholder="0.0"
                          className={`w-full px-3 py-2 border rounded-xl text-xs font-mono focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
                            isDark ? "bg-slate-800 border-slate-700 text-white" : "bg-slate-50 border-slate-200"
                          }`}
                        />
                      </div>
                    </div>
                  </div>

                  {/* ── TIER 3: IMPORT / MASTER SHIPPING PACKAGING ──────────────── */}
                  <div className={`p-5 rounded-2xl border space-y-4 ${
                    isDark ? "bg-slate-900/60 border-slate-800" : "bg-white border-slate-200 shadow-xs"
                  }`}>
                    <div className="flex items-center justify-between pb-2 border-b border-slate-200 dark:border-slate-800">
                      <div className="flex items-center gap-2">
                        <span className="w-6 h-6 rounded-full bg-purple-100 dark:bg-purple-950 text-purple-700 dark:text-purple-300 text-xs font-extrabold flex items-center justify-center">3</span>
                        <h4 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">Import & Master Shipping Packaging (Freight Unit)</h4>
                      </div>
                      {calculatedBoxCBM && (
                        <span className="px-2.5 py-0.5 rounded-full text-[11px] font-mono font-bold bg-purple-50 dark:bg-purple-950/40 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800">
                          Master CBM: {calculatedBoxCBM} CBM
                        </span>
                      )}
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                      <div className="sm:col-span-2">
                        <label className="block text-xs font-bold mb-1">Master Packaging Type (Industry Format)</label>
                        <div className="flex gap-2">
                          <select
                            value={IMPORT_PACKAGING_TYPES.includes(formData?.import_packaging_type) ? formData.import_packaging_type : "Custom"}
                            onChange={(e) => {
                              if (e.target.value !== "Custom") {
                                setFormData({ ...formData, import_packaging_type: e.target.value });
                              }
                            }}
                            className={`w-1/2 px-3 py-2 border rounded-xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
                              isDark ? "bg-slate-800 border-slate-700 text-white" : "bg-slate-50 border-slate-200 text-slate-900"
                            }`}
                          >
                            {IMPORT_PACKAGING_TYPES.map((t) => (
                              <option key={t} value={t}>{t}</option>
                            ))}
                            <option value="Custom">Custom Write-in...</option>
                          </select>
                          <input
                            type="text"
                            value={formData?.import_packaging_type || ""}
                            onChange={(e) => setFormData({ ...formData, import_packaging_type: e.target.value })}
                            placeholder="e.g. Tiles SQM Box, Rebar Bundle, Timber Pack..."
                            className={`flex-1 px-3 py-2 border rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
                              isDark ? "bg-slate-800 border-slate-700 text-white" : "bg-slate-50 border-slate-200 text-slate-900"
                            }`}
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-xs font-bold mb-1">Units per Master Box / Crate / Pack *</label>
                        <input
                          type="number"
                          step="any"
                          value={formData?.units_per_box !== null ? formData.units_per_box : ""}
                          onChange={(e) => setFormData({ ...formData, units_per_box: e.target.value })}
                          placeholder="e.g. 24 or 100"
                          className={`w-full px-3 py-2 border rounded-xl text-xs font-mono font-bold focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
                            isDark ? "bg-slate-800 border-slate-700 text-white" : "bg-slate-50 border-slate-200 text-slate-900"
                          }`}
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-bold mb-1">Total Master Gross Weight ({formData?.weight_unit || "kg"})</label>
                        <input
                          type="number"
                          step="any"
                          value={formData?.box_weight !== null ? formData.box_weight : ""}
                          onChange={(e) => setFormData({ ...formData, box_weight: e.target.value })}
                          placeholder="e.g. 28.5"
                          className={`w-full px-3 py-2 border rounded-xl text-xs font-mono focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
                            isDark ? "bg-slate-800 border-slate-700 text-white" : "bg-slate-50 border-slate-200"
                          }`}
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-1">
                      <div>
                        <label className="block text-xs font-bold mb-1">Master Length ({formData?.dimension_unit || "mm"})</label>
                        <input
                          type="number"
                          step="any"
                          value={formData?.master_length !== null ? formData.master_length : ""}
                          onChange={(e) => setFormData({ ...formData, master_length: e.target.value })}
                          placeholder="Outer length"
                          className={`w-full px-3 py-2 border rounded-xl text-xs font-mono focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
                            isDark ? "bg-slate-800 border-slate-700 text-white" : "bg-slate-50 border-slate-200"
                          }`}
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-bold mb-1">Master Width ({formData?.dimension_unit || "mm"})</label>
                        <input
                          type="number"
                          step="any"
                          value={formData?.master_width !== null ? formData.master_width : ""}
                          onChange={(e) => setFormData({ ...formData, master_width: e.target.value })}
                          placeholder="Outer width"
                          className={`w-full px-3 py-2 border rounded-xl text-xs font-mono focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
                            isDark ? "bg-slate-800 border-slate-700 text-white" : "bg-slate-50 border-slate-200"
                          }`}
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-bold mb-1">Master Height ({formData?.dimension_unit || "mm"})</label>
                        <input
                          type="number"
                          step="any"
                          value={formData?.master_height !== null ? formData.master_height : ""}
                          onChange={(e) => setFormData({ ...formData, master_height: e.target.value })}
                          placeholder="Outer height"
                          className={`w-full px-3 py-2 border rounded-xl text-xs font-mono focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
                            isDark ? "bg-slate-800 border-slate-700 text-white" : "bg-slate-50 border-slate-200"
                          }`}
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-bold mb-1">Carton Tare Weight ({formData?.weight_unit || "kg"})</label>
                        <input
                          type="number"
                          step="any"
                          value={formData?.master_tare_weight !== null ? formData.master_tare_weight : ""}
                          onChange={(e) => setFormData({ ...formData, master_tare_weight: e.target.value })}
                          placeholder="Empty box weight"
                          className={`w-full px-3 py-2 border rounded-xl text-xs font-mono focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
                            isDark ? "bg-slate-800 border-slate-700 text-white" : "bg-slate-50 border-slate-200"
                          }`}
                        />
                      </div>
                    </div>
                  </div>

                  {/* ── TIER 4: PALLETIZATION & CONTAINER LOADING CAPACITY ────── */}
                  <div className={`p-5 rounded-2xl border space-y-4 ${
                    isDark ? "bg-slate-900/60 border-slate-800" : "bg-white border-slate-200 shadow-xs"
                  }`}>
                    <div className="flex items-center justify-between pb-2 border-b border-slate-200 dark:border-slate-800 flex-wrap gap-2">
                      <div className="flex items-center gap-2">
                        <span className="w-6 h-6 rounded-full bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-300 text-xs font-extrabold flex items-center justify-center">4</span>
                        <h4 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">Palletization & Container Loading Capacity</h4>
                      </div>
                      <span className="text-[11px] font-medium text-slate-500">
                        Usable Standard Volume: <strong className="text-indigo-600 dark:text-indigo-400">20ft (~28–33 CBM)</strong> | <strong className="text-purple-600 dark:text-purple-400">40ft HC (~68–76 CBM)</strong>
                      </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                      <div>
                        <label className="block text-xs font-bold mb-1">Pallet Spec / Type</label>
                        <select
                          value={formData?.pallet_type || "Euro Pallet (1200 × 800 mm)"}
                          onChange={(e) => setFormData({ ...formData, pallet_type: e.target.value })}
                          className={`w-full px-3 py-2 border rounded-xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
                            isDark ? "bg-slate-800 border-slate-700 text-white" : "bg-slate-50 border-slate-200 text-slate-900"
                          }`}
                        >
                          {PALLET_TYPES.map((pt) => (<option key={pt} value={pt}>{pt}</option>))}
                        </select>
                      </div>

                      <div>
                        <label className="block text-xs font-bold mb-1">Cartons per Layer (TI)</label>
                        <input
                          type="number"
                          value={formData?.cartons_per_layer !== null ? formData.cartons_per_layer : ""}
                          onChange={(e) => {
                            const ti = parseInt(e.target.value, 10) || 0;
                            const hi = parseInt(formData?.layers_per_pallet, 10) || 0;
                            setFormData({
                              ...formData,
                              cartons_per_layer: e.target.value,
                              total_cartons_per_pallet: ti > 0 && hi > 0 ? ti * hi : formData?.total_cartons_per_pallet
                            });
                          }}
                          placeholder="e.g. 8"
                          className={`w-full px-3 py-2 border rounded-xl text-xs font-mono focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
                            isDark ? "bg-slate-800 border-slate-700 text-white" : "bg-slate-50 border-slate-200"
                          }`}
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-bold mb-1">Layers per Pallet (HI)</label>
                        <input
                          type="number"
                          value={formData?.layers_per_pallet !== null ? formData.layers_per_pallet : ""}
                          onChange={(e) => {
                            const hi = parseInt(e.target.value, 10) || 0;
                            const ti = parseInt(formData?.cartons_per_layer, 10) || 0;
                            setFormData({
                              ...formData,
                              layers_per_pallet: e.target.value,
                              total_cartons_per_pallet: ti > 0 && hi > 0 ? ti * hi : formData?.total_cartons_per_pallet
                            });
                          }}
                          placeholder="e.g. 5"
                          className={`w-full px-3 py-2 border rounded-xl text-xs font-mono focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
                            isDark ? "bg-slate-800 border-slate-700 text-white" : "bg-slate-50 border-slate-200"
                          }`}
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-bold mb-1">Total Cartons per Pallet</label>
                        <input
                          type="number"
                          value={formData?.total_cartons_per_pallet !== null ? formData.total_cartons_per_pallet : ""}
                          onChange={(e) => setFormData({ ...formData, total_cartons_per_pallet: e.target.value })}
                          placeholder="TI × HI auto"
                          className={`w-full px-3 py-2 border rounded-xl text-xs font-mono font-bold focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
                            isDark ? "bg-slate-800 border-slate-700 text-white" : "bg-slate-50 border-slate-200"
                          }`}
                        />
                      </div>
                    </div>

                    {/* Auto-Estimated & User-Editable Container Capacity Inputs */}
                    <div className="pt-2 border-t border-slate-200 dark:border-slate-800">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className={`p-4 rounded-xl border ${
                          isDark ? "bg-slate-800/40 border-slate-700" : "bg-indigo-50/40 border-indigo-100"
                        }`}>
                          <div className="flex items-center justify-between mb-1.5">
                            <label className="text-xs font-bold text-indigo-700 dark:text-indigo-300 flex items-center gap-1.5">
                              <Truck size={14} />
                              <span>20ft Container Units (Usable ~28–33 CBM)</span>
                            </label>
                            <span className="text-[10px] text-slate-400 font-mono">Editable</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <input
                              type="number"
                              step="any"
                              value={formData?.est_qty_20ft !== null ? formData.est_qty_20ft : ""}
                              onChange={(e) => setFormData({ ...formData, est_qty_20ft: e.target.value })}
                              placeholder="e.g. 5200"
                              className={`flex-1 px-3 py-2 border rounded-xl text-sm font-mono font-bold focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
                                isDark ? "bg-slate-800 border-slate-700 text-white" : "bg-white border-slate-200 text-slate-900"
                              }`}
                            />
                            <span className="text-xs font-mono font-semibold text-slate-500">{formData?.unit || "PCS"}</span>
                          </div>
                          <div className="flex items-center justify-between text-[11px] text-slate-400 mt-1.5">
                            <span>
                              {formData?.est_qty_20ft && formData?.units_per_box
                                ? `≈ ${Math.floor(formData.est_qty_20ft / formData.units_per_box)} master cartons`
                                : "Auto-calculated from box CBM or enter manual value"}
                            </span>
                          </div>
                        </div>

                        <div className={`p-4 rounded-xl border ${
                          isDark ? "bg-slate-800/40 border-slate-700" : "bg-purple-50/40 border-purple-100"
                        }`}>
                          <div className="flex items-center justify-between mb-1.5">
                            <label className="text-xs font-bold text-purple-700 dark:text-purple-300 flex items-center gap-1.5">
                              <Truck size={14} />
                              <span>40ft High Cube Units (Usable ~68–76 CBM)</span>
                            </label>
                            <span className="text-[10px] text-slate-400 font-mono">Editable</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <input
                              type="number"
                              step="any"
                              value={formData?.est_qty_40hc !== null ? formData.est_qty_40hc : ""}
                              onChange={(e) => setFormData({ ...formData, est_qty_40hc: e.target.value })}
                              placeholder="e.g. 12800"
                              className={`flex-1 px-3 py-2 border rounded-xl text-sm font-mono font-bold focus:outline-none focus:ring-2 focus:ring-purple-500 ${
                                isDark ? "bg-slate-800 border-slate-700 text-white" : "bg-white border-slate-200 text-slate-900"
                              }`}
                            />
                            <span className="text-xs font-mono font-semibold text-slate-500">{formData?.unit || "PCS"}</span>
                          </div>
                          <div className="flex items-center justify-between text-[11px] text-slate-400 mt-1.5">
                            <span>
                              {formData?.est_qty_40hc && formData?.units_per_box
                                ? `≈ ${Math.floor(formData.est_qty_40hc / formData.units_per_box)} master cartons`
                                : "Auto-calculated from box CBM or enter manual value"}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 3: WAREHOUSE & STOCK CONTROLS (WMS PREPARATION) */}
              {(activeProductTab === "stock" || activeProductTab === "warehouse") && (
                <div className="space-y-6">
                  <div className="flex items-center gap-2 pb-2 border-b border-slate-200 dark:border-slate-800 text-sm font-bold text-slate-900 dark:text-white">
                    <Warehouse size={16} className="text-indigo-500" />
                    <span>Warehouse Inventory Controls & Storage Coordinates</span>
                  </div>

                  {/* Stock Metrics Card */}
                  <div className={`p-5 rounded-2xl border space-y-4 ${
                    isDark ? "bg-slate-900/60 border-slate-800" : "bg-white border-slate-200 shadow-xs"
                  }`}>
                    <h4 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                      Stock Thresholds & Reorder Rules
                    </h4>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
                      <div>
                        <label className="block text-xs font-bold mb-1">Baseline On-Hand Stock</label>
                        <input
                          type="number"
                          step="any"
                          value={formData?.current_stock}
                          onChange={(e) => setFormData({ ...formData, current_stock: e.target.value })}
                          className={`w-full px-3.5 py-2.5 border rounded-xl text-xs font-mono font-bold focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
                            isDark ? "bg-slate-800 border-slate-700 text-white" : "bg-slate-50 border-slate-200 text-slate-900"
                          }`}
                        />
                        <p className="text-[10px] text-slate-400 mt-1">Physical stock currently on warehouse shelves</p>
                      </div>

                      <div>
                        <label className="block text-xs font-bold mb-1">Min Stock Alert Threshold</label>
                        <input
                          type="number"
                          step="any"
                          value={formData?.min_stock_quantity}
                          onChange={(e) => setFormData({ ...formData, min_stock_quantity: e.target.value })}
                          className={`w-full px-3.5 py-2.5 border rounded-xl text-xs font-mono font-bold focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
                            isDark ? "bg-slate-800 border-slate-700 text-white" : "bg-slate-50 border-slate-200 text-slate-900"
                          }`}
                        />
                        <p className="text-[10px] text-slate-400 mt-1">Trigger low stock amber/red alert</p>
                      </div>

                      <div>
                        <label className="block text-xs font-bold mb-1">Reorder Point (Trigger Qty)</label>
                        <input
                          type="number"
                          step="any"
                          value={formData?.order_threshold_qty !== null ? formData.order_threshold_qty : ""}
                          onChange={(e) => setFormData({ ...formData, order_threshold_qty: e.target.value })}
                          placeholder="e.g. 150"
                          className={`w-full px-3.5 py-2.5 border rounded-xl text-xs font-mono focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
                            isDark ? "bg-slate-800 border-slate-700 text-white" : "bg-slate-50 border-slate-200"
                          }`}
                        />
                        <p className="text-[10px] text-slate-400 mt-1">Automated PO reorder notification</p>
                      </div>

                      <div>
                        <label className="block text-xs font-bold mb-1">Safety Stock Cushion</label>
                        <input
                          type="number"
                          step="any"
                          value={formData?.threshold_qty !== null ? formData.threshold_qty : ""}
                          onChange={(e) => setFormData({ ...formData, threshold_qty: e.target.value })}
                          placeholder="e.g. 50"
                          className={`w-full px-3.5 py-2.5 border rounded-xl text-xs font-mono focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
                            isDark ? "bg-slate-800 border-slate-700 text-white" : "bg-slate-50 border-slate-200"
                          }`}
                        />
                        <p className="text-[10px] text-slate-400 mt-1">Buffer stock for supply spikes</p>
                      </div>

                      <div>
                        <label className="block text-xs font-bold mb-1">Maximum Stock Capacity</label>
                        <input
                          type="number"
                          step="any"
                          value={formData?.max_stock_quantity !== null ? formData.max_stock_quantity : ""}
                          onChange={(e) => setFormData({ ...formData, max_stock_quantity: e.target.value })}
                          placeholder="e.g. 2000"
                          className={`w-full px-3.5 py-2.5 border rounded-xl text-xs font-mono focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
                            isDark ? "bg-slate-800 border-slate-700 text-white" : "bg-slate-50 border-slate-200"
                          }`}
                        />
                        <p className="text-[10px] text-slate-400 mt-1">Overstock prevention limit</p>
                      </div>

                      <div>
                        <label className="block text-xs font-bold mb-1">Internal Handling Lead Time (Days)</label>
                        <input
                          type="number"
                          value={formData?.lead_time_days !== null ? formData.lead_time_days : ""}
                          onChange={(e) => setFormData({ ...formData, lead_time_days: e.target.value })}
                          placeholder="e.g. 5"
                          className={`w-full px-3.5 py-2.5 border rounded-xl text-xs font-mono focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
                            isDark ? "bg-slate-800 border-slate-700 text-white" : "bg-slate-50 border-slate-200"
                          }`}
                        />
                        <p className="text-[10px] text-slate-400 mt-1">Pick, pack & staging turnaround</p>
                      </div>
                    </div>
                  </div>

                  {/* WMS Coordinates & Storage Facility */}
                  <div className={`p-5 rounded-2xl border space-y-4 ${
                    isDark ? "bg-slate-900/60 border-slate-800" : "bg-white border-slate-200 shadow-xs"
                  }`}>
                    <div className="flex items-center justify-between pb-2 border-b border-slate-200 dark:border-slate-800">
                      <h4 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                        Warehouse Facility & Bin Location (WMS Coordinates)
                      </h4>
                      <span className="text-[11px] font-medium text-indigo-500">Preparing for Multi-Warehouse WMS</span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                      <div>
                        <label className="block text-xs font-bold mb-1">Primary Warehouse Facility</label>
                        <input
                          type="text"
                          value={formData?.warehouse_location || ""}
                          onChange={(e) => setFormData({ ...formData, warehouse_location: e.target.value })}
                          placeholder="e.g. Main Distribution Center — Mahé"
                          className={`w-full px-3.5 py-2.5 border rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
                            isDark ? "bg-slate-800 border-slate-700 text-white" : "bg-slate-50 border-slate-200 text-slate-900"
                          }`}
                        />
                        <p className="text-[10px] text-slate-400 mt-1">Primary holding site or depot</p>
                      </div>

                      <div>
                        <label className="block text-xs font-bold mb-1">Default Bay / Rack / Bin Coordinate</label>
                        <input
                          type="text"
                          value={formData?.default_bin || ""}
                          onChange={(e) => setFormData({ ...formData, default_bin: e.target.value })}
                          placeholder="e.g. Aisle 04 — Rack B — Bin 12"
                          className={`w-full px-3.5 py-2.5 border rounded-xl text-xs font-mono font-bold focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
                            isDark ? "bg-slate-800 border-slate-700 text-amber-300" : "bg-slate-50 border-slate-200 text-amber-700"
                          }`}
                        />
                        <p className="text-[10px] text-slate-400 mt-1">Default pick bin coordinate for warehouse staff</p>
                      </div>
                    </div>
                  </div>

                  {/* Material Handling & Storage Conditions */}
                  <div className={`p-5 rounded-2xl border space-y-4 ${
                    isDark ? "bg-slate-900/60 border-slate-800" : "bg-white border-slate-200 shadow-xs"
                  }`}>
                    <h4 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                      Material Handling, Safety & Storage Flags
                    </h4>

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                      <label className="flex items-center gap-2 p-3 rounded-xl border cursor-pointer transition hover:bg-slate-50 dark:hover:bg-slate-800/60">
                        <input
                          type="checkbox"
                          checked={Boolean(formData?.is_hazardous)}
                          onChange={(e) => setFormData({ ...formData, is_hazardous: e.target.checked })}
                          className="w-4 h-4 text-red-600 rounded"
                        />
                        <span className="text-xs font-bold text-red-600 dark:text-red-400">Hazardous (HAZMAT)</span>
                      </label>

                      <label className="flex items-center gap-2 p-3 rounded-xl border cursor-pointer transition hover:bg-slate-50 dark:hover:bg-slate-800/60">
                        <input
                          type="checkbox"
                          checked={Boolean(formData?.is_perishable)}
                          onChange={(e) => setFormData({ ...formData, is_perishable: e.target.checked })}
                          className="w-4 h-4 text-amber-600 rounded"
                        />
                        <span className="text-xs font-bold text-amber-600 dark:text-amber-400">Perishable Goods</span>
                      </label>

                      <label className="flex items-center gap-2 p-3 rounded-xl border cursor-pointer transition hover:bg-slate-50 dark:hover:bg-slate-800/60">
                        <input
                          type="checkbox"
                          checked={Boolean(formData?.is_consumable)}
                          onChange={(e) => setFormData({ ...formData, is_consumable: e.target.checked })}
                          className="w-4 h-4 text-indigo-600 rounded"
                        />
                        <span className="text-xs font-bold">Consumable Material</span>
                      </label>

                      <label className="flex items-center gap-2 p-3 rounded-xl border cursor-pointer transition hover:bg-slate-50 dark:hover:bg-slate-800/60">
                        <input
                          type="checkbox"
                          checked={Boolean(formData?.is_returnable)}
                          onChange={(e) => setFormData({ ...formData, is_returnable: e.target.checked })}
                          className="w-4 h-4 text-emerald-600 rounded"
                        />
                        <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400">Returnable</span>
                      </label>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 pt-2">
                      <div>
                        <label className="block text-xs font-bold mb-1">Shelf Life / Expiry Days (if perishable)</label>
                        <input
                          type="number"
                          value={formData?.expiry_days !== null ? formData.expiry_days : ""}
                          onChange={(e) => setFormData({ ...formData, expiry_days: e.target.value })}
                          placeholder="e.g. 180"
                          className={`w-full px-3.5 py-2.5 border rounded-xl text-xs font-mono focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
                            isDark ? "bg-slate-800 border-slate-700 text-white" : "bg-slate-50 border-slate-200"
                          }`}
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-bold mb-1">Warranty Period (Days)</label>
                        <input
                          type="number"
                          value={formData?.warranty_days !== null ? formData.warranty_days : ""}
                          onChange={(e) => setFormData({ ...formData, warranty_days: e.target.value })}
                          placeholder="e.g. 365"
                          className={`w-full px-3.5 py-2.5 border rounded-xl text-xs font-mono focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
                            isDark ? "bg-slate-800 border-slate-700 text-white" : "bg-slate-50 border-slate-200"
                          }`}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 4: SOURCING & SUPPLIER LINKAGES */}
              {(activeProductTab === "sourcing" || activeProductTab === "vendors") && canViewVendor && (
                <div className="space-y-6">
                  <div className="flex items-center gap-2 pb-2 border-b border-slate-200 dark:border-slate-800 text-sm font-bold text-slate-900 dark:text-white">
                    <Building size={16} className="text-indigo-500" />
                    <span>Commercial Sourcing & Authorized Vendors</span>
                  </div>

                  {/* Sourcing Summary Cards */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div className={`p-4 rounded-xl border ${isDark ? "bg-slate-800/40 border-slate-700" : "bg-indigo-50/40 border-indigo-100"}`}>
                      <div className="text-[11px] font-bold uppercase text-slate-400">Default Supplier</div>
                      <div className="text-sm font-extrabold text-indigo-600 dark:text-indigo-400 mt-1 truncate">
                        {suppliers.find((s) => Number(s.supplier_id || s.id) === Number(formData?.default_supplier_id))?.name ||
                          (formData?.suppliers && formData.suppliers.find((s) => s.is_default)?.supplier_name) ||
                          "None Selected"}
                      </div>
                    </div>

                    <div className={`p-4 rounded-xl border ${isDark ? "bg-slate-800/40 border-slate-700" : "bg-purple-50/40 border-purple-100"}`}>
                      <div className="text-[11px] font-bold uppercase text-slate-400">Active Vendor Linkages</div>
                      <div className="text-sm font-extrabold text-purple-600 dark:text-purple-400 mt-1">
                        {formData?.suppliers?.length || 0} Authorized Suppliers
                      </div>
                    </div>

                    <div className={`p-4 rounded-xl border ${isDark ? "bg-slate-800/40 border-slate-700" : "bg-emerald-50/40 border-emerald-100"}`}>
                      <div className="text-[11px] font-bold uppercase text-slate-400">Factory Article Code</div>
                      <div className="text-sm font-extrabold font-mono text-emerald-600 dark:text-emerald-400 mt-1">
                        {(() => {
                          const def = formData?.suppliers?.find((s) => s.is_default) || formData?.suppliers?.[0];
                          return def?.factory_code || formData?.factory_code || "—";
                        })()}
                      </div>
                    </div>
                  </div>

                  {/* MULTI-VENDOR / FACTORY CODES MANAGEMENT TABLE */}
                  <div className="space-y-3">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div>
                        <h4 className="text-sm font-bold flex items-center gap-2">
                          <Building size={16} className="text-indigo-500" />
                          <span>Suppliers, Factories & Vendor Codes</span>
                        </h4>
                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                          Link authorized manufacturers or factories to this product. Enter factory codes (vendor SKUs) and click the star ⭐ to designate the default preferred supplier.
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={handleAddSupplierRow}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white shadow-xs transition self-start sm:self-auto cursor-pointer"
                      >
                        <Plus size={13} />
                        <span>Add Supplier</span>
                      </button>
                    </div>

                    {(!formData?.suppliers || formData.suppliers.length === 0) ? (
                      <div className="p-8 rounded-xl border border-dashed text-center text-xs text-slate-400 dark:border-slate-800">
                        No suppliers or factories linked yet. Click "Add Supplier" above to attach authorized vendors and factory codes.
                      </div>
                    ) : (
                      <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800">
                        <table className="w-full text-left text-xs border-collapse">
                          <thead>
                            <tr className={`border-b text-[11px] font-bold uppercase tracking-wider ${
                              isDark ? "bg-slate-800/60 border-slate-800 text-slate-400" : "bg-slate-50 border-slate-200 text-slate-500"
                            }`}>
                              <th className="py-2.5 px-3 w-12 text-center" title="Default Preferred Supplier">Default</th>
                              <th className="py-2.5 px-3">Supplier / Factory</th>
                              <th className="py-2.5 px-3">Factory Code (Vendor SKU)</th>
                              <th className="py-2.5 px-3">Vendor Product Name</th>
                              {isAccountsUser && <th className="py-2.5 px-3 w-28">Quoted Cost</th>}
                              <th className="py-2.5 px-3 w-24">Lead Time</th>
                              <th className="py-2.5 px-3 w-12 text-center">Remove</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-200 dark:divide-slate-800 font-medium">
                            {formData.suppliers.map((suppRow, idx) => (
                              <tr key={idx} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40 transition">
                                <td className="py-2 px-3 text-center">
                                  <button
                                    type="button"
                                    onClick={() => handleUpdateSupplierRow(idx, "is_default", true)}
                                    title={suppRow.is_default ? "Default Supplier" : "Set as Default Supplier"}
                                    className={`p-1.5 rounded-lg transition cursor-pointer ${
                                      suppRow.is_default
                                        ? "text-amber-500 bg-amber-50 dark:bg-amber-950/40"
                                        : "text-slate-300 dark:text-slate-600 hover:text-amber-500"
                                    }`}
                                  >
                                    <Star size={15} className={suppRow.is_default ? "fill-amber-400" : ""} />
                                  </button>
                                </td>
                                <td className="py-2 px-3">
                                  <select
                                    value={suppRow.supplier_id || ""}
                                    onChange={(e) => handleUpdateSupplierRow(idx, "supplier_id", parseInt(e.target.value, 10))}
                                    className={`w-full px-2.5 py-1.5 border rounded-lg text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-indigo-500 ${
                                      isDark ? "bg-slate-800 border-slate-700 text-white" : "bg-white border-slate-200 text-slate-900"
                                    }`}
                                  >
                                    {suppliers.map((s) => (
                                      <option key={s.supplier_id || s.id} value={s.supplier_id || s.id}>
                                        {s.name}
                                      </option>
                                    ))}
                                  </select>
                                </td>
                                <td className="py-2 px-3">
                                  <input
                                    type="text"
                                    value={suppRow.factory_code || ""}
                                    onChange={(e) => handleUpdateSupplierRow(idx, "factory_code", e.target.value)}
                                    placeholder="e.g. FC-W60-01"
                                    className={`w-full px-2.5 py-1.5 border rounded-lg text-xs font-mono font-bold focus:outline-none focus:ring-1 focus:ring-indigo-500 ${
                                      isDark ? "bg-slate-800 border-slate-700 text-amber-300" : "bg-white border-slate-200 text-amber-700"
                                    }`}
                                  />
                                </td>
                                <td className="py-2 px-3">
                                  <input
                                    type="text"
                                    value={suppRow.vendor_product_name || ""}
                                    onChange={(e) => handleUpdateSupplierRow(idx, "vendor_product_name", e.target.value)}
                                    placeholder="Vendor catalog name..."
                                    className={`w-full px-2.5 py-1.5 border rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500 ${
                                      isDark ? "bg-slate-800 border-slate-700 text-white" : "bg-white border-slate-200 text-slate-900"
                                    }`}
                                  />
                                </td>
                                {isAccountsUser && (
                                  <td className="py-2 px-3">
                                    <div className="flex items-center gap-1">
                                      <input
                                        type="number"
                                        step="0.01"
                                        value={suppRow.unit_cost !== null && suppRow.unit_cost !== undefined ? suppRow.unit_cost : ""}
                                        onChange={(e) => handleUpdateSupplierRow(idx, "unit_cost", e.target.value)}
                                        placeholder="0.00"
                                        className={`w-20 px-2 py-1.5 border rounded-lg text-xs font-mono font-bold focus:outline-none focus:ring-1 focus:ring-indigo-500 ${
                                          isDark ? "bg-slate-800 border-slate-700 text-white" : "bg-white border-slate-200 text-slate-900"
                                        }`}
                                      />
                                      <span className="text-[10px] font-mono text-slate-400">{suppRow.currency || "USD"}</span>
                                    </div>
                                  </td>
                                )}
                                <td className="py-2 px-3">
                                  <input
                                    type="number"
                                    value={suppRow.lead_time_days !== null && suppRow.lead_time_days !== undefined ? suppRow.lead_time_days : ""}
                                    onChange={(e) => handleUpdateSupplierRow(idx, "lead_time_days", e.target.value)}
                                    placeholder="Days"
                                    className={`w-16 px-2 py-1.5 border rounded-lg text-xs font-mono focus:outline-none focus:ring-1 focus:ring-indigo-500 ${
                                      isDark ? "bg-slate-800 border-slate-700 text-white" : "bg-white border-slate-200 text-slate-900"
                                    }`}
                                  />
                                </td>
                                <td className="py-2 px-3 text-center">
                                  <button
                                    type="button"
                                    onClick={() => handleRemoveSupplierRow(idx)}
                                    title="Remove supplier from product"
                                    className="p-1 rounded-md text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition cursor-pointer"
                                  >
                                    <Trash2 size={14} />
                                  </button>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>

                  {isAccountsUser && (
                    <div className="pt-2">
                      <label className="block text-xs font-bold mb-1">Standard Default Unit Cost (Confidential)</label>
                      <div className="flex gap-2">
                        <select
                          value={formData?.currency || "USD"}
                          onChange={(e) => setFormData({ ...formData, currency: e.target.value })}
                          className={`w-28 px-3 py-2.5 border rounded-xl text-xs font-mono font-bold focus:outline-none ${
                            isDark ? "bg-slate-800 border-slate-700 text-white" : "bg-slate-50 border-slate-200"
                          }`}
                        >
                          <option value="USD">USD</option>
                          <option value="SCR">SCR</option>
                          <option value="EUR">EUR</option>
                          <option value="INR">INR</option>
                          <option value="GBP">GBP</option>
                        </select>
                        <input
                          type="number"
                          step="0.01"
                          value={formData?.unit_cost !== null ? formData.unit_cost : ""}
                          onChange={(e) => setFormData({ ...formData, unit_cost: e.target.value })}
                          placeholder="0.00"
                          className={`flex-1 px-3.5 py-2.5 border rounded-xl text-xs font-mono font-bold focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
                            isDark ? "bg-slate-800 border-slate-700 text-white" : "bg-slate-50 border-slate-200"
                          }`}
                        />
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* PIPELINE / LINKED ITEMS */}
              {(activeProductTab === "pipeline" || activeProductTab === "links") && (
                <div className="space-y-6">
                  <div className="flex items-center gap-2 pb-2 border-b border-slate-200 dark:border-slate-800 text-sm font-bold text-slate-900 dark:text-white">
                    <Link2 size={16} className="text-indigo-500" />
                    <span>Linked Catalog Items, Variants & Bill of Materials (BOM)</span>
                  </div>
                  {!activeProduct ? (
                    <div className="p-8 text-center text-slate-400 text-xs border rounded-xl border-dashed">
                      Please register this product first before linking variants, related accessories, or assembly components.
                    </div>
                  ) : (
                    <>
                      <div
                        className={`p-4 rounded-xl border space-y-3 ${
                          isDark ? "bg-slate-800/50 border-slate-700" : "bg-indigo-50/40 border-indigo-100"
                        }`}
                      >
                        <h4 className="text-xs font-bold flex items-center gap-2 text-indigo-600 dark:text-indigo-400">
                          <Plus size={15} />
                          <span>Link Another Catalog Product to this Item</span>
                        </h4>

                        <form onSubmit={handleCreateLink} className="space-y-3">
                          <div className="relative">
                            <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                            <input
                              type="text"
                              value={linkSearch}
                              onChange={(e) => handleSearchLinkItems(e.target.value)}
                              placeholder="Search product to link by SKU, internal code, or name..."
                              className={`w-full pl-9 pr-4 py-2.5 rounded-xl border text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
                                isDark ? "bg-slate-800 border-slate-700 text-white" : "bg-white border-slate-200"
                              }`}
                            />
                            {linkSearchResults.length > 0 && !selectedLinkChild && (
                              <div
                                className={`absolute z-30 left-0 right-0 mt-1 max-h-48 overflow-y-auto rounded-xl border shadow-xl ${
                                  isDark ? "bg-slate-800 border-slate-700 text-white" : "bg-white border-slate-200"
                                }`}
                              >
                                {linkSearchResults.map((res) => (
                                  <div
                                    key={res.id}
                                    onClick={() => {
                                      setSelectedLinkChild(res);
                                      setLinkSearch(`${res.sku} - ${res.name}`);
                                      setLinkSearchResults([]);
                                    }}
                                    className={`p-3 cursor-pointer flex items-center justify-between text-xs transition ${
                                      isDark ? "hover:bg-slate-700" : "hover:bg-indigo-50"
                                    }`}
                                  >
                                    <div>
                                      <span className="font-mono font-bold text-indigo-500">{res.sku}</span>
                                      <span className="ml-2 font-medium">{res.name}</span>
                                    </div>
                                    <span className="text-[10px] text-slate-400 font-mono">{res.unit}</span>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>

                          {selectedLinkChild && (
                            <div className="p-3 rounded-xl bg-indigo-100/60 dark:bg-indigo-950/60 flex items-center justify-between text-xs">
                              <div>
                                <span className="font-bold">Target Linked Item:</span> {selectedLinkChild.sku} — {selectedLinkChild.name}
                              </div>
                              <button
                                type="button"
                                onClick={() => {
                                  setSelectedLinkChild(null);
                                  setLinkSearch("");
                                }}
                                className="text-xs text-red-500 font-bold hover:underline"
                              >
                                Clear Selection
                              </button>
                            </div>
                          )}

                          <div className="flex flex-wrap items-center gap-5 pt-1 text-xs">
                            <span className="font-bold text-slate-500">Relationship:</span>
                            <label className="flex items-center gap-1.5 cursor-pointer font-medium">
                              <input
                                type="checkbox"
                                checked={linkFlags.is_variant}
                                onChange={(e) => setLinkFlags({ ...linkFlags, is_variant: e.target.checked })}
                                className="w-4 h-4 text-indigo-600 rounded"
                              />
                              <span>Product Variant</span>
                            </label>
                            <label className="flex items-center gap-1.5 cursor-pointer font-medium">
                              <input
                                type="checkbox"
                                checked={linkFlags.is_related}
                                onChange={(e) => setLinkFlags({ ...linkFlags, is_related: e.target.checked })}
                                className="w-4 h-4 text-indigo-600 rounded"
                              />
                              <span>Related / Accessory</span>
                            </label>
                            <label className="flex items-center gap-1.5 cursor-pointer font-medium">
                              <input
                                type="checkbox"
                                checked={linkFlags.is_part}
                                onChange={(e) => setLinkFlags({ ...linkFlags, is_part: e.target.checked })}
                                className="w-4 h-4 text-indigo-600 rounded"
                              />
                              <span>Part / BOM Component</span>
                            </label>

                            {linkFlags.is_part && (
                              <div className="flex items-center gap-1.5">
                                <span className="text-[11px] text-slate-400">Qty per master:</span>
                                <input
                                  type="number"
                                  step="any"
                                  value={linkFlags.qty}
                                  onChange={(e) => setLinkFlags({ ...linkFlags, qty: e.target.value })}
                                  placeholder="e.g. 2"
                                  className={`w-20 px-2.5 py-1.5 rounded-lg border text-xs font-mono ${
                                    isDark ? "bg-slate-800 border-slate-700" : "bg-white border-slate-200"
                                  }`}
                                />
                              </div>
                            )}

                            <button
                              type="submit"
                              disabled={isLinking || !selectedLinkChild}
                              className="ml-auto px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold disabled:opacity-40 transition"
                            >
                              {isLinking ? "Linking..." : "Establish Link"}
                            </button>
                          </div>
                        </form>
                      </div>

                      <div className="space-y-6 pt-2">
                        <div className="space-y-3">
                          <div className="flex items-center justify-between">
                            <h5 className="text-xs font-bold flex items-center gap-2 text-indigo-600 dark:text-indigo-400">
                              <GitFork size={15} />
                              <span>Product Variants ({activeProduct?.links?.variants?.length || 0})</span>
                            </h5>
                            <span className="text-[11px] text-slate-400">
                              Color, size, or material variations of this product
                            </span>
                          </div>

                          {!activeProduct?.links?.variants?.length ? (
                            <p className="text-slate-400 italic text-xs">No variants linked yet.</p>
                          ) : (
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                              {activeProduct.links.variants.map((v) => (
                                <div
                                  key={v.link_id}
                                  className={`p-3.5 rounded-xl border flex items-center justify-between ${
                                    isDark ? "bg-slate-800/40 border-slate-700" : "bg-slate-50 border-slate-200"
                                  }`}
                                >
                                  <div>
                                    <div className="font-mono font-bold text-indigo-500 text-xs">{v.sku}</div>
                                    <div className="font-medium text-xs mt-0.5">{v.name}</div>
                                    {v.code && <div className="text-[10px] text-slate-400 font-mono">Code: {v.code}</div>}
                                  </div>
                                  <button
                                    type="button"
                                    onClick={() => handleRemoveLink(v.link_id)}
                                    className="p-1.5 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/40 transition"
                                    title="Unlink variant"
                                  >
                                    <Trash2 size={14} />
                                  </button>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>

                        <div className="space-y-3 pt-3 border-t border-slate-200 dark:border-slate-800">
                          <div className="flex items-center justify-between">
                            <h5 className="text-xs font-bold flex items-center gap-2 text-purple-600 dark:text-purple-400">
                              <Link2 size={15} />
                              <span>Related Products & Accessories ({activeProduct?.links?.related?.length || 0})</span>
                            </h5>
                            <span className="text-[11px] text-slate-400">
                              Complementary items and alternative procurement options
                            </span>
                          </div>

                          {!activeProduct?.links?.related?.length ? (
                            <p className="text-slate-400 italic text-xs">No related items linked.</p>
                          ) : (
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                              {activeProduct.links.related.map((r) => (
                                <div
                                  key={r.link_id}
                                  className={`p-3.5 rounded-xl border flex items-center justify-between ${
                                    isDark ? "bg-slate-800/40 border-slate-700" : "bg-slate-50 border-slate-200"
                                  }`}
                                >
                                  <div>
                                    <div className="font-mono font-bold text-purple-500 text-xs">{r.sku}</div>
                                    <div className="font-medium text-xs mt-0.5">{r.name}</div>
                                  </div>
                                  <button
                                    type="button"
                                    onClick={() => handleRemoveLink(r.link_id)}
                                    className="p-1.5 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/40 transition"
                                    title="Unlink related product"
                                  >
                                    <Trash2 size={14} />
                                  </button>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>

                        <div className="space-y-3 pt-3 border-t border-slate-200 dark:border-slate-800">
                          <div className="flex items-center justify-between">
                            <h5 className="text-xs font-bold flex items-center gap-2 text-amber-600 dark:text-amber-400">
                              <Layers size={15} />
                              <span>Bill of Materials (BOM) / Components ({activeProduct?.links?.parts?.length || 0})</span>
                            </h5>
                            <span className="text-[11px] text-slate-400">
                              Assembly parts and components needed per unit of this parent product
                            </span>
                          </div>

                          {!activeProduct?.links?.parts?.length ? (
                            <p className="text-slate-400 italic text-xs">No BOM components linked.</p>
                          ) : (
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                              {activeProduct.links.parts.map((p) => (
                                <div
                                  key={p.link_id}
                                  className={`p-3.5 rounded-xl border flex items-center justify-between ${
                                    isDark ? "bg-slate-800/40 border-slate-700" : "bg-slate-50 border-slate-200"
                                  }`}
                                >
                                  <div>
                                    <div className="font-mono font-bold text-amber-500 text-xs">{p.sku}</div>
                                    <div className="font-medium text-xs mt-0.5">{p.name}</div>
                                    <div className="text-[11px] font-bold text-slate-400 mt-1">
                                      Required: {p.qty || 1} {p.unit} per master unit
                                    </div>
                                  </div>
                                  <button
                                    type="button"
                                    onClick={() => handleRemoveLink(p.link_id)}
                                    className="p-1.5 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/40 transition"
                                    title="Unlink component"
                                  >
                                    <Trash2 size={14} />
                                  </button>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    </>
                  )}
                </div>
              )}

              {/* COMPLIANCE & SPECIAL HANDLING */}
              {(activeProductTab === "trade" || activeProductTab === "flags") && (
                <div className="space-y-5 pt-6 border-t border-slate-200 dark:border-slate-800">
                  <div className="flex items-center gap-2 pb-2 border-b border-slate-200 dark:border-slate-800 text-sm font-bold text-slate-900 dark:text-white">
                    <ShieldCheck size={16} className="text-indigo-500" />
                    <span>Compliance, Special Handling & Hazardous Material Attributes</span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <label className="flex items-center gap-3.5 p-4 rounded-xl border border-slate-200 dark:border-slate-800 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={formData?.is_hazardous || false}
                        onChange={(e) => setFormData({ ...formData, is_hazardous: e.target.checked })}
                        className="w-4 h-4 text-indigo-600 rounded"
                      />
                      <div>
                        <div className="text-xs font-bold">Hazardous Goods (HAZMAT)</div>
                        <div className="text-[11px] text-slate-400">Requires dangerous goods shipping documentation</div>
                      </div>
                    </label>

                    <label className="flex items-center gap-3.5 p-4 rounded-xl border border-slate-200 dark:border-slate-800 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={formData?.is_perishable || false}
                        onChange={(e) => setFormData({ ...formData, is_perishable: e.target.checked })}
                        className="w-4 h-4 text-indigo-600 rounded"
                      />
                      <div>
                        <div className="text-xs font-bold">Perishable Product</div>
                        <div className="text-[11px] text-slate-400">Subject to expiry dates and climate controls</div>
                      </div>
                    </label>

                    <label className="flex items-center gap-3.5 p-4 rounded-xl border border-slate-200 dark:border-slate-800 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={formData?.is_consumable || false}
                        onChange={(e) => setFormData({ ...formData, is_consumable: e.target.checked })}
                        className="w-4 h-4 text-indigo-600 rounded"
                      />
                      <div>
                        <div className="text-xs font-bold">Consumable Good</div>
                        <div className="text-[11px] text-slate-400">Depleted upon usage or assembly</div>
                      </div>
                    </label>

                    <label className="flex items-center gap-3.5 p-4 rounded-xl border border-slate-200 dark:border-slate-800 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={formData?.is_returnable || false}
                        onChange={(e) => setFormData({ ...formData, is_returnable: e.target.checked })}
                        className="w-4 h-4 text-indigo-600 rounded"
                      />
                      <div>
                        <div className="text-xs font-bold">Returnable to Supplier</div>
                        <div className="text-[11px] text-slate-400">Eligible for RMA or defect return claims</div>
                      </div>
                    </label>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 pt-2">
                    <div>
                      <label className="block text-xs font-bold mb-1">Expiry Shelf Life (Days)</label>
                      <input
                        type="number"
                        value={formData?.expiry_days !== null ? formData.expiry_days : ""}
                        onChange={(e) => setFormData({ ...formData, expiry_days: e.target.value })}
                        placeholder="e.g. 365"
                        className={`w-full px-3.5 py-2.5 border rounded-xl text-xs font-mono focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
                          isDark ? "bg-slate-800 border-slate-700 text-white" : "bg-slate-50 border-slate-200"
                        }`}
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold mb-1">Warranty Coverage Period (Days)</label>
                      <input
                        type="number"
                        value={formData?.warranty_days !== null ? formData.warranty_days : ""}
                        onChange={(e) => setFormData({ ...formData, warranty_days: e.target.value })}
                        placeholder="e.g. 730"
                        className={`w-full px-3.5 py-2.5 border rounded-xl text-xs font-mono focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
                          isDark ? "bg-slate-800 border-slate-700 text-white" : "bg-slate-50 border-slate-200"
                        }`}
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 8: MEDIA & VIDEOS */}
              {activeProductTab === "media" && (
                <div className="space-y-8">
                  {/* Active Video Player Section */}
                  {activeVideoPlaying && (
                    <div className="p-4 rounded-2xl border border-indigo-500/30 bg-slate-950 text-white shadow-xl space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Play size={16} className="text-rose-500 fill-rose-500" />
                          <h4 className="text-sm font-bold truncate">{activeVideoPlaying.title || activeVideoPlaying.file_name}</h4>
                        </div>
                        <button
                          type="button"
                          onClick={() => setActiveVideoPlaying(null)}
                          className="p-1 text-slate-400 hover:text-white transition cursor-pointer"
                        >
                          <X size={16} />
                        </button>
                      </div>
                      <div className="relative rounded-xl overflow-hidden bg-black flex items-center justify-center">
                        {activeVideoPlaying.file_url.includes("youtube.com") || activeVideoPlaying.file_url.includes("youtu.be") ? (
                          <iframe
                            src={
                              activeVideoPlaying.file_url.includes("youtu.be/")
                                ? `https://www.youtube.com/embed/${activeVideoPlaying.file_url.split("youtu.be/")[1].split("?")[0]}`
                                : `https://www.youtube.com/embed/${new URLSearchParams(activeVideoPlaying.file_url.split("?")[1] || "").get("v")}`
                            }
                            title="Product Video"
                            className="w-full h-80 border-0"
                            allowFullScreen
                          />
                        ) : activeVideoPlaying.file_url.includes("vimeo.com") ? (
                          <iframe
                            src={`https://player.vimeo.com/video/${activeVideoPlaying.file_url.split("/").pop()}`}
                            title="Product Video"
                            className="w-full h-80 border-0"
                            allowFullScreen
                          />
                        ) : (
                          <video
                            controls
                            autoPlay
                            src={
                              activeVideoPlaying.file_url.startsWith("http") || activeVideoPlaying.file_url.startsWith("blob:")
                                ? activeVideoPlaying.file_url
                                : `${process.env.REACT_APP_NETWORK}/blobs/${activeVideoPlaying.file_url}`
                            }
                            className="w-full max-h-96 rounded-xl"
                          >
                            Your browser does not support HTML5 video playback.
                          </video>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Section 1: Product Images Gallery */}
                  <div className="space-y-4">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 dark:border-slate-800 pb-3">
                      <div>
                        <h4 className="text-sm font-bold flex items-center gap-2">
                          <ImageIcon size={16} className="text-indigo-500" />
                          <span>Product Images Gallery ({formData?.images?.length || 0})</span>
                        </h4>
                        <p className="text-[11px] text-slate-400 mt-0.5">
                          High-resolution visual assets for catalog, packing lists, and verification
                        </p>
                      </div>

                      {/* Image Upload & Link Controls */}
                      <div className="flex items-center gap-2 flex-wrap">
                        <label className="cursor-pointer px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold transition flex items-center gap-1.5 shadow-xs">
                          <Upload size={13} />
                          <span>Upload Image</span>
                          <input
                            type="file"
                            accept="image/*"
                            className="hidden"
                            onChange={(e) => handleUploadMediaFile(e, "image")}
                          />
                        </label>
                      </div>
                    </div>

                    {/* Quick Add Image by URL */}
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        placeholder="Or paste external Image URL (https://...)"
                        value={newImageUrl}
                        onChange={(e) => setNewImageUrl(e.target.value)}
                        className={`flex-1 px-3.5 py-2 border rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
                          isDark ? "bg-slate-800 border-slate-700 text-white" : "bg-slate-50 border-slate-200 text-slate-900"
                        }`}
                      />
                      <button
                        type="button"
                        onClick={handleAddImageUrl}
                        className="px-3.5 py-2 rounded-xl bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-xs font-bold transition cursor-pointer"
                      >
                        Add URL
                      </button>
                    </div>

                    {/* Image Cards Grid */}
                    {(!formData?.images || formData.images.length === 0) ? (
                      <div
                        className={`p-8 text-center rounded-xl border border-dashed text-xs text-slate-400 ${
                          isDark ? "border-slate-800 bg-slate-800/20" : "border-slate-300 bg-slate-50"
                        }`}
                      >
                        <ImageIcon size={32} className="mx-auto mb-2 opacity-30 text-indigo-500" />
                        <p className="font-semibold">No product images attached</p>
                        <p className="text-[11px] mt-0.5">Upload product photos or paste image URLs to populate the gallery.</p>
                      </div>
                    ) : (
                      <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-5 gap-4">
                        {formData.images.map((img, idx) => (
                          <div
                            key={img.id || idx}
                            className={`group relative rounded-xl border overflow-hidden p-2 flex flex-col justify-between ${
                              isDark ? "bg-slate-800/60 border-slate-700" : "bg-white border-slate-200 shadow-xs"
                            }`}
                          >
                            <div className="relative w-full h-32 rounded-lg overflow-hidden bg-slate-100 dark:bg-slate-900 flex items-center justify-center">
                              <img
                                src={
                                  img.file_url.startsWith("http") || img.file_url.startsWith("blob:")
                                    ? img.file_url
                                    : `${process.env.REACT_APP_NETWORK}/blobs/${img.file_url}`
                                }
                                alt={img.title || "Product"}
                                className="w-full h-full object-contain"
                                onError={(e) => { e.target.src = "https://via.placeholder.com/150?text=Image"; }}
                              />
                              {idx === 0 && (
                                <span className="absolute top-1.5 left-1.5 px-1.5 py-0.5 rounded text-[9px] font-extrabold bg-indigo-600 text-white shadow-xs">
                                  PRIMARY
                                </span>
                              )}
                              <button
                                type="button"
                                onClick={() => handleRemoveMedia(img.id, "image")}
                                className="absolute top-1.5 right-1.5 p-1 rounded-full bg-rose-600 text-white opacity-0 group-hover:opacity-100 transition shadow-md cursor-pointer"
                                title="Remove Image"
                              >
                                <X size={12} />
                              </button>
                            </div>
                            <div className="mt-2">
                              <div className="text-[11px] font-semibold truncate text-slate-800 dark:text-slate-200">
                                {img.title || img.file_name || `Image #${idx + 1}`}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Section 2: Product Demonstration Videos */}
                  <div className="space-y-4 pt-4 border-t border-slate-200 dark:border-slate-800">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2">
                      <div>
                        <h4 className="text-sm font-bold flex items-center gap-2 text-rose-600 dark:text-rose-400">
                          <Video size={16} />
                          <span>Demonstration & Product Videos ({formData?.videos?.length || 0})</span>
                        </h4>
                        <p className="text-[11px] text-slate-400 mt-0.5">
                          Attach product videos, operational guides, or factory unboxing clips (MP4, WebM, YouTube, Vimeo)
                        </p>
                      </div>

                      {/* Video Upload Button */}
                      <label className="cursor-pointer px-3.5 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold transition flex items-center gap-1.5 shadow-xs">
                        <Upload size={13} />
                        <span>Upload Video (MP4/WebM)</span>
                        <input
                          type="file"
                          accept="video/mp4,video/webm,video/*"
                          className="hidden"
                          onChange={(e) => handleUploadMediaFile(e, "video")}
                        />
                      </label>
                    </div>

                    {/* Attach Video by URL */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                      <input
                        type="text"
                        placeholder="Video Title (e.g. Factory Inspection Clip)"
                        value={newVideoTitle}
                        onChange={(e) => setNewVideoTitle(e.target.value)}
                        className={`px-3.5 py-2 border rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-rose-500 ${
                          isDark ? "bg-slate-800 border-slate-700 text-white" : "bg-slate-50 border-slate-200 text-slate-900"
                        }`}
                      />
                      <input
                        type="text"
                        placeholder="Video URL (e.g. https://... or YouTube link)"
                        value={newVideoUrl}
                        onChange={(e) => setNewVideoUrl(e.target.value)}
                        className={`px-3.5 py-2 border rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-rose-500 ${
                          isDark ? "bg-slate-800 border-slate-700 text-white" : "bg-slate-50 border-slate-200 text-slate-900"
                        }`}
                      />
                      <button
                        type="button"
                        onClick={handleAddVideoUrl}
                        className="px-4 py-2 rounded-xl bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-300 hover:bg-rose-100 border border-rose-200 dark:border-rose-900 text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer"
                      >
                        <Plus size={14} />
                        <span>Attach Video URL</span>
                      </button>
                    </div>

                    {/* Video Cards Grid */}
                    {(!formData?.videos || formData.videos.length === 0) ? (
                      <div
                        className={`p-8 text-center rounded-xl border border-dashed text-xs text-slate-400 ${
                          isDark ? "border-slate-800 bg-slate-800/20" : "border-slate-300 bg-slate-50"
                        }`}
                      >
                        <Film size={32} className="mx-auto mb-2 opacity-30 text-rose-500" />
                        <p className="font-semibold">No product videos attached</p>
                        <p className="text-[11px] mt-0.5">Upload a video clip or attach a video link to preview product mechanics and demos.</p>
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                        {formData.videos.map((vid, vIdx) => (
                          <div
                            key={vid.id || vIdx}
                            className={`p-3.5 rounded-xl border flex flex-col justify-between space-y-3 ${
                              isDark ? "bg-slate-800/60 border-slate-700" : "bg-white border-slate-200 shadow-xs"
                            }`}
                          >
                            <div className="flex items-start justify-between gap-2">
                              <div className="flex items-center gap-2">
                                <div className="p-2 rounded-lg bg-rose-500/10 text-rose-500">
                                  <Video size={16} />
                                </div>
                                <div>
                                  <h5 className="text-xs font-bold text-slate-900 dark:text-white truncate max-w-[180px]">
                                    {vid.title || vid.file_name || `Video #${vIdx + 1}`}
                                  </h5>
                                  <span className="text-[10px] text-slate-400 font-mono block truncate max-w-[180px]">
                                    {vid.file_name}
                                  </span>
                                </div>
                              </div>
                              <button
                                type="button"
                                onClick={() => handleRemoveMedia(vid.id, "video")}
                                className="p-1 text-slate-400 hover:text-rose-500 transition cursor-pointer"
                                title="Delete Video"
                              >
                                <Trash2 size={13} />
                              </button>
                            </div>

                            <button
                              type="button"
                              onClick={() => setActiveVideoPlaying(vid)}
                              className="w-full py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 shadow-xs cursor-pointer"
                            >
                              <Play size={13} fill="currentColor" />
                              <span>Play Video</span>
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    );
  }

  // ══════════════════════════════════════════════════════════════════════════
  // SCREEN 2: DEDICATED CATEGORY SCREEN (HIERARCHY TREE + CATEGORY PRODUCTS)
  // WITH "+ ADD CATEGORY" BUTTON OPENING CLEAN MODAL POPUP
  // ══════════════════════════════════════════════════════════════════════════
  if (currentView === "categories") {
    return (
      <div className="space-y-6 w-full max-w-[1720px] mx-auto px-4 sm:px-6 lg:px-8 pb-16">
        {/* Top Header */}
        <div
          className={`p-5 rounded-2xl border shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition ${
            isDark ? "bg-slate-900 border-slate-800 text-white" : "bg-white border-slate-200 text-slate-900"
          }`}
        >
          <div className="flex items-center gap-3.5">
            <button
              type="button"
              onClick={() => setCurrentView("products")}
              className={`p-2.5 rounded-xl border transition flex items-center gap-1.5 text-xs font-bold ${
                isDark
                  ? "bg-slate-800 border-slate-700 text-slate-200 hover:bg-slate-700"
                  : "bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100"
              }`}
            >
              <ArrowLeft size={16} />
              <span>Back to Products</span>
            </button>

            <div>
              <div className="flex items-center gap-2">
                <Tag size={18} className="text-purple-500" />
                <h1 className="text-xl font-bold tracking-tight">Category Taxonomy</h1>
              </div>
              <p className={`text-xs mt-0.5 ${isDark ? "text-slate-400" : "text-slate-500"}`}>
                Browse multi-level hierarchy on the left. Click any node to filter products in that category and all its children.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={() => handleOpenAddCategoryModal()}
              className="px-4 py-2.5 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-md shadow-purple-600/20 active:scale-95 cursor-pointer"
            >
              <FolderPlus size={16} />
              <span>Add Category</span>
            </button>

            <button
              type="button"
              onClick={() => handleOpenCreateProduct("categories")}
              className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-md shadow-indigo-600/20 active:scale-95 cursor-pointer"
            >
              <Plus size={16} />
              <span>Register Product</span>
            </button>
          </div>
        </div>

        {/* Two-Panel Split Layout: Left Tree (4 Cols) | Right Category Products (8 Cols) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Left Category Tree (4 Cols) - Sticky & Height Constrained */}
          <div
            className={`lg:col-span-4 p-5 rounded-2xl border shadow-xs space-y-4 sticky top-6 max-h-[calc(100vh-160px)] flex flex-col ${
              isDark ? "bg-slate-900 border-slate-800 text-white" : "bg-white border-slate-200 text-slate-900"
            }`}
          >
            <div className="flex items-center justify-between border-b pb-3 border-slate-100 dark:border-slate-800 shrink-0">
              <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Taxonomy Hierarchy
              </h3>
              <span className="text-[11px] text-slate-400">{categoriesFlat.length} Categories</span>
            </div>

            {/* Tree Nodes (Clean: BASE -> Parent -> Child) */}
            <div className="space-y-1 overflow-y-auto flex-1 pr-1">
              {categoriesTree.map((rootNode) => renderCategoryTreeNode(rootNode, 0))}
            </div>

            <div className="pt-3 border-t border-slate-100 dark:border-slate-800 text-[11px] text-slate-400 leading-relaxed shrink-0">
              Hover category to <span className="font-semibold text-indigo-500">Edit</span> or <span className="font-semibold text-rose-500">Delete</span>.
            </div>
          </div>

          {/* Right Panel: Products List in Selected Category Branch (8 Cols) - Height Constrained */}
          <div className="lg:col-span-8">
            <div
              className={`rounded-2xl border shadow-xs overflow-hidden flex flex-col max-h-[calc(100vh-160px)] ${
                isDark ? "bg-slate-900 border-slate-800" : "bg-white border-slate-200"
              }`}
            >
              <div className="p-3.5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs shrink-0">
                <div className="flex items-center gap-2">
                  <span className="font-extrabold text-indigo-600 dark:text-indigo-400 text-sm">
                    {selectedCategoryNode?.name || "Products"}
                  </span>
                  <span className="text-[11px] text-slate-400">
                    ({categoryProductsTotal} {categoryProductsTotal === 1 ? "product" : "products"})
                  </span>
                </div>
              </div>

              <div className="overflow-x-auto overflow-y-auto flex-1">
                <table className="w-full text-left text-xs">
                  <thead
                    className={`sticky top-0 z-10 text-[11px] font-bold uppercase tracking-wider border-b ${
                      isDark
                        ? "bg-slate-800 border-slate-800 text-slate-400"
                        : "bg-slate-50 border-slate-200 text-slate-500"
                    }`}
                  >
                    <tr>
                      <th className="py-3 px-4 w-72">Product Specifications</th>
                      <th className="py-3 px-4 w-40">SKU & Factory Code</th>
                      <th className="py-3 px-4 w-44">Category Path</th>
                      <th className="py-3 px-4 w-40">Stock & Pipeline</th>
                      <th className="py-3 px-4 w-24 text-center">Status</th>
                      <th className="py-3 px-4 w-28 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 font-medium">
                    {categoryProductsLoading ? (
                      <tr>
                        <td colSpan={6} className="py-12 text-center text-slate-400">
                          Loading products in this category branch...
                        </td>
                      </tr>
                    ) : categoryProducts.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="py-12 text-center text-slate-400">
                          <Package className="mx-auto text-slate-300 dark:text-slate-600 mb-2" size={32} />
                          No products found in this category branch.
                        </td>
                      </tr>
                    ) : (
                      categoryProducts.map((p) => (
                        <tr
                          key={p.id}
                          onClick={() => handleOpenProductDetail(p, "categories")}
                          className={`transition cursor-pointer ${
                            isDark ? "hover:bg-slate-800/50" : "hover:bg-indigo-50/40"
                          }`}
                        >
                          <td className="py-3 px-4">
                            <div className="flex items-start gap-3">
                              <div
                                onClick={(e) => {
                                  if (p.images && p.images.length > 0) {
                                    e.stopPropagation();
                                    setPreviewMediaModal({
                                      name: p.name,
                                      images: p.images || [],
                                      videos: p.videos || []
                                    });
                                  }
                                }}
                                className="relative w-12 h-12 rounded-xl overflow-hidden shrink-0 border border-slate-200 dark:border-slate-700/80 bg-slate-100 dark:bg-slate-800 flex items-center justify-center group"
                              >
                                {p.images && p.images.length > 0 ? (
                                  <img
                                    src={
                                      p.images[0].file_url?.startsWith("http") || p.images[0].file_url?.startsWith("blob:")
                                        ? p.images[0].file_url
                                        : `${process.env.REACT_APP_NETWORK}/blobs/${p.images[0].file_url}`
                                    }
                                    alt={p.name}
                                    className="w-full h-full object-cover transition-transform group-hover:scale-110"
                                    onError={(e) => {
                                      e.target.style.display = "none";
                                    }}
                                  />
                                ) : (
                                  <Boxes size={18} className="text-slate-400 opacity-60" />
                                )}
                              </div>
                              <div className="min-w-0 flex-1">
                                <div className="font-bold text-xs text-slate-900 dark:text-white leading-snug">
                                  {p.name}
                                </div>
                                {(p.description_quick || p.description) && (
                                  <p className="text-[11px] text-slate-500 dark:text-slate-400 line-clamp-1 mt-0.5">
                                    {p.description_quick || p.description}
                                  </p>
                                )}
                                {formatDimensions(p) && (
                                  <div className="mt-1">
                                    <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-mono font-bold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                                      <Ruler size={10} className="text-indigo-500" />
                                      <span>{formatDimensions(p)}</span>
                                    </span>
                                  </div>
                                )}
                              </div>
                            </div>
                          </td>
                          <td className="py-3 px-4 whitespace-nowrap">
                            <div className="font-mono font-bold text-xs text-indigo-600 dark:text-indigo-400">
                              {p.sku}
                            </div>
                            {p.factory_code && (
                              <div className="text-[10px] font-mono text-amber-600 dark:text-amber-400 mt-0.5">
                                🏭 {p.factory_code}
                              </div>
                            )}
                          </td>
                          <td className="py-3 px-4 text-purple-600 dark:text-purple-400 text-xs font-medium">
                            <span className="truncate block max-w-xs" title={p.category_path || p.category_name}>
                              {p.category_path || p.category_name || "—"}
                            </span>
                          </td>
                          <td className="py-3 px-4 whitespace-nowrap">
                            <div className="flex items-baseline gap-1 text-xs font-bold font-mono">
                              <span>{p.qty_on_hand ?? p.current_stock ?? 0}</span>
                              <span className="text-[10px] font-semibold text-slate-400 font-sans">{p.unit || "PCS"}</span>
                            </div>
                            {p.qty_on_order > 0 && (
                              <div className="mt-1">
                                <span className="inline-flex items-center gap-1 text-[10px] font-bold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/50 px-1.5 py-0.5 rounded border border-blue-200 dark:border-blue-800">
                                  <Package size={10} />
                                  +{p.qty_on_order?.toLocaleString()}
                                </span>
                              </div>
                            )}
                          </td>
                          <td className="py-3 px-4 text-center whitespace-nowrap">
                            <span
                              className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                                p.status === "active"
                                  ? "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800"
                                  : "bg-slate-100 dark:bg-slate-800 text-slate-500 border border-slate-200 dark:border-slate-700"
                              }`}
                            >
                              {p.status || "ACTIVE"}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-right whitespace-nowrap">
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleOpenProductDetail(p, "categories");
                              }}
                              className="px-2.5 py-1 bg-indigo-50 dark:bg-indigo-950/50 hover:bg-indigo-600 hover:text-white text-indigo-600 dark:text-indigo-400 rounded-lg text-xs font-bold transition flex items-center gap-1 ml-auto border border-indigo-100 dark:border-indigo-900"
                            >
                              <span>Edit</span>
                              <ChevronRight size={13} />
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>

        {/* ── ADD / EDIT CATEGORY MODAL POPUP ──────────────────────────────────── */}
        {showCategoryModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in">
            <div
              className={`w-full max-w-lg border rounded-2xl p-6 shadow-2xl space-y-4 ${
                isDark ? "bg-slate-900 border-slate-700 text-white" : "bg-white border-slate-200 text-slate-900"
              }`}
            >
              <div className="flex items-center justify-between border-b pb-3 border-slate-100 dark:border-slate-800">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 rounded-xl bg-purple-500/10 text-purple-600 dark:text-purple-400">
                    <FolderPlus size={20} />
                  </div>
                  <div>
                    <h3 className="text-base font-bold">
                      {editingCategory ? `Edit Category: ${editingCategory.name}` : "Add Category or Subcategory"}
                    </h3>
                    <p className="text-xs text-slate-400">
                      Nests under:{" "}
                      <span className="font-bold text-indigo-500">
                        {categoriesFlat.find((c) => c.id === parseInt(newCatParentId, 10))?.name || "Products"}
                      </span>
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setShowCategoryModal(false);
                    setEditingCategory(null);
                  }}
                  className="p-1 rounded-lg text-slate-400 hover:text-slate-600 transition"
                >
                  <X size={18} />
                </button>
              </div>

              <form onSubmit={handleSaveCategory} className="space-y-4 text-xs">
                <div>
                  <label className="block font-bold mb-1">Parent Category</label>
                  <select
                    value={newCatParentId}
                    disabled={editingCategory && (!editingCategory.parent_id || editingCategory.name === "Products")}
                    onChange={(e) => setNewCatParentId(e.target.value)}
                    className={`w-full px-3.5 py-2.5 border rounded-xl font-medium focus:outline-none focus:ring-2 focus:ring-purple-500 disabled:opacity-50 ${
                      isDark ? "bg-slate-800 border-slate-700 text-white" : "bg-slate-50 border-slate-200 text-slate-900"
                    }`}
                  >
                    {flattenedCategories
                      .filter((c) => !editingCategory || c.id !== editingCategory.id)
                      .map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.displayName}
                        </option>
                      ))}
                  </select>
                </div>

                <div>
                  <label className="block font-bold mb-1">Category Title *</label>
                  <input
                    type="text"
                    required
                    disabled={editingCategory && (!editingCategory.parent_id || editingCategory.name === "Products")}
                    value={newCatName}
                    onChange={(e) => setNewCatName(e.target.value)}
                    placeholder="e.g. Vitrified Tiles, Wall Tiles, Sinks..."
                    className={`w-full px-3.5 py-2.5 border rounded-xl font-medium focus:outline-none focus:ring-2 focus:ring-purple-500 disabled:opacity-50 ${
                      isDark ? "bg-slate-800 border-slate-700 text-white" : "bg-slate-50 border-slate-200 text-slate-900"
                    }`}
                  />
                </div>

                <div>
                  <label className="block font-bold mb-1">Description (Optional)</label>
                  <input
                    type="text"
                    value={newCatDesc}
                    onChange={(e) => setNewCatDesc(e.target.value)}
                    placeholder="Brief description of items in this classification"
                    className={`w-full px-3.5 py-2.5 border rounded-xl font-medium focus:outline-none focus:ring-2 focus:ring-purple-500 ${
                      isDark ? "bg-slate-800 border-slate-700 text-white" : "bg-slate-50 border-slate-200 text-slate-900"
                    }`}
                  />
                </div>

                <div className="flex justify-end gap-2.5 pt-3 border-t border-slate-100 dark:border-slate-800">
                  <button
                    type="button"
                    onClick={() => {
                      setShowCategoryModal(false);
                      setEditingCategory(null);
                    }}
                    className="px-4 py-2 rounded-xl border font-semibold hover:bg-slate-100 dark:hover:bg-slate-800 transition"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isCreatingCategory || !newCatName.trim()}
                    className="px-5 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-xl font-bold transition shadow-md shadow-purple-600/20 active:scale-95 disabled:opacity-40"
                  >
                    {isCreatingCategory ? "Creating..." : "Create Category"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* ── DELETE CATEGORY WARNING MODAL POPUP ─────────────────────────────── */}
        {categoryToDelete && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in">
            <div
              className={`w-full max-w-md border rounded-2xl p-6 shadow-2xl space-y-4 ${
                isDark ? "bg-slate-900 border-slate-700 text-white" : "bg-white border-slate-200 text-slate-900"
              }`}
            >
              <div className="flex items-center gap-3 text-rose-600">
                <div className="p-3 bg-rose-100 dark:bg-rose-950/50 rounded-2xl">
                  <AlertTriangle size={24} />
                </div>
                <div>
                  <h3 className="text-base font-bold">Delete Category?</h3>
                  <p className="text-xs text-slate-400">This action cannot be undone</p>
                </div>
              </div>

              <div className="p-3.5 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900 rounded-xl text-xs text-amber-800 dark:text-amber-300 leading-relaxed space-y-1.5">
                <div>
                  Are you sure you want to delete category{" "}
                  <strong className="text-rose-600 dark:text-rose-400 font-mono">"{categoryToDelete.name}"</strong>?
                </div>
                <div className="font-semibold text-amber-900 dark:text-amber-200">
                  ⚠️ Warning: All products in this category will automatically be moved to the default <strong>Products</strong> category.
                </div>
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-2">
                <button
                  type="button"
                  disabled={isDeletingCategory}
                  onClick={() => setCategoryToDelete(null)}
                  className="px-4 py-2 border rounded-xl text-xs font-semibold hover:bg-slate-100 dark:hover:bg-slate-800 transition"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={isDeletingCategory}
                  onClick={handleConfirmDeleteCategory}
                  className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-md shadow-rose-600/20 active:scale-95 disabled:opacity-40 cursor-pointer"
                >
                  <Trash2 size={13} />
                  <span>{isDeletingCategory ? "Deleting & Moving..." : "Delete & Move Products"}</span>
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  // ══════════════════════════════════════════════════════════════════════════
  // SCREEN 1: MAIN PRODUCTS SCREEN (CLEAN, NO KPIS, FULL-WIDTH LIST)
  // ══════════════════════════════════════════════════════════════════════════
  return (
    <div className="space-y-6 w-full max-w-[1720px] mx-auto px-4 sm:px-6 lg:px-8 pb-16">
      {/* ── Executive Top Header ────────────────────────────────────────────── */}
      <div
        className={`p-5 rounded-2xl border shadow-xs flex flex-col lg:flex-row lg:items-center justify-between gap-4 transition ${
          isDark ? "bg-slate-900 border-slate-800 text-white" : "bg-white border-slate-200 text-slate-900"
        }`}
      >
        <div className="flex items-center gap-3.5">
          <div
            className={`p-3.5 rounded-2xl ${
              isDark
                ? "bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 shadow-inner"
                : "bg-indigo-600 text-white shadow-md shadow-indigo-500/20"
            }`}
          >
            <Boxes size={26} />
          </div>
          <div>
            <div className="flex items-center gap-2.5 flex-wrap">
              <h1 className="text-xl font-extrabold tracking-tight">Product Master & Inventory</h1>
              <span
                className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${
                  isDark
                    ? "bg-indigo-500/10 text-indigo-300 border-indigo-500/20"
                    : "bg-indigo-100 text-indigo-800 border-indigo-200"
                }`}
              >
                Catalog ({totalCount})
              </span>
            </div>
            <p className={`text-xs mt-0.5 ${isDark ? "text-slate-400" : "text-slate-500"}`}>
              Central master catalog for specifications, dimensions, purchase orders, and stock clearance.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          {canViewCategories && (
            <button
              type="button"
              onClick={() => setCurrentView("categories")}
              className={`px-3.5 py-2.5 rounded-xl text-xs font-bold border transition flex items-center gap-2 cursor-pointer ${
                isDark
                  ? "bg-slate-800 border-slate-700 text-purple-300 hover:bg-slate-700"
                  : "bg-purple-50 border-purple-200 text-purple-700 hover:bg-purple-100"
              }`}
            >
              <Network size={15} />
              <span>Category Taxonomy</span>
            </button>
          )}

          {canExport && (
            <button
              type="button"
              onClick={handleExportCatalog}
              title="Export filtered catalog to CSV"
              className={`px-3.5 py-2.5 rounded-xl text-xs font-bold border transition flex items-center gap-1.5 cursor-pointer ${
                isDark
                  ? "bg-slate-800 border-slate-700 text-emerald-400 hover:bg-slate-700"
                  : "bg-emerald-50 border-emerald-200 text-emerald-700 hover:bg-emerald-100"
              }`}
            >
              <Download size={15} />
              <span>Export CSV</span>
            </button>
          )}

          <button
            type="button"
            onClick={() => fetchProducts()}
            title="Refresh product list"
            className={`p-2.5 rounded-xl text-xs font-bold border transition flex items-center justify-center cursor-pointer ${
              isDark
                ? "bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700"
                : "bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100"
            }`}
          >
            <RefreshCw size={15} className={loading ? "animate-spin text-indigo-600" : ""} />
          </button>

          {canAddProduct && (
            <button
              type="button"
              onClick={() => handleOpenCreateProduct("products")}
              className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-md shadow-indigo-600/20 active:scale-95 cursor-pointer"
            >
              <Plus size={16} />
              <span>Register Product</span>
            </button>
          )}
        </div>
      </div>

      {/* ── Sleek Filter & Search Bar ────────────────────────────────────────── */}
      <div
        className={`p-4 rounded-2xl border shadow-xs space-y-3 ${
          isDark ? "bg-slate-900 border-slate-800" : "bg-white border-slate-200"
        }`}
      >
        <div className="flex flex-col lg:flex-row items-stretch lg:items-center gap-3">
          {/* Search Input */}
          <div className="relative flex-1">
            <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              placeholder="Search products by SKU, name, code, or factory code..."
              className={`w-full pl-10 pr-9 py-2.5 rounded-xl text-xs font-medium border transition focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
                isDark
                  ? "bg-slate-800/80 border-slate-700 text-white placeholder-slate-400"
                  : "bg-slate-50 border-slate-200 text-slate-900 placeholder-slate-400"
              }`}
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                <X size={14} />
              </button>
            )}
          </div>

          {/* Category Dropdown */}
          <div className="w-full lg:w-56">
            <select
              value={selectedCategoryFilter}
              onChange={(e) => {
                setSelectedCategoryFilter(e.target.value);
                setPage(1);
              }}
              className={`w-full px-3 py-2.5 rounded-xl text-xs font-medium border transition focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
                isDark ? "bg-slate-800 border-slate-700 text-white" : "bg-slate-50 border-slate-200 text-slate-900"
              }`}
            >
              <option value="">All Categories</option>
              {flattenedCategories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.displayName}
                </option>
              ))}
            </select>
          </div>

          {/* Supplier Dropdown */}
          <div className="w-full lg:w-48">
            <select
              value={selectedSupplier}
              onChange={(e) => {
                setSelectedSupplier(e.target.value);
                setPage(1);
              }}
              className={`w-full px-3 py-2.5 rounded-xl text-xs font-medium border transition focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
                isDark ? "bg-slate-800 border-slate-700 text-white" : "bg-slate-50 border-slate-200 text-slate-900"
              }`}
            >
              <option value="">All Suppliers</option>
              {suppliers.map((s) => (
                <option key={s.supplier_id || s.id} value={s.supplier_id || s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </div>

          {/* Status Dropdown */}
          <div className="w-full lg:w-36">
            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setPage(1);
              }}
              className={`w-full px-3 py-2.5 rounded-xl text-xs font-medium border transition focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
                isDark ? "bg-slate-800 border-slate-700 text-white" : "bg-slate-50 border-slate-200 text-slate-900"
              }`}
            >
              <option value="">All Statuses</option>
              <option value="active">Active Only</option>
              <option value="inactive">Inactive Only</option>
            </select>
          </div>

          {/* Low Stock Toggle Button */}
          <button
            type="button"
            onClick={() => {
              setLowStockOnly((prev) => !prev);
              setPage(1);
            }}
            className={`px-3.5 py-2.5 rounded-xl text-xs font-bold border transition flex items-center justify-center gap-1.5 whitespace-nowrap cursor-pointer ${
              lowStockOnly
                ? "bg-amber-500/10 border-amber-500/40 text-amber-600 dark:text-amber-400"
                : isDark
                ? "bg-slate-800 border-slate-700 text-slate-400 hover:text-slate-200"
                : "bg-slate-50 border-slate-200 text-slate-600 hover:text-slate-900"
            }`}
          >
            <AlertTriangle size={14} />
            <span>Low Stock</span>
          </button>

          {/* Clear Filters Button if any filter is active */}
          {(search || selectedCategoryFilter || selectedSupplier || statusFilter || lowStockOnly) && (
            <button
              type="button"
              onClick={() => {
                setSearch("");
                setSelectedCategoryFilter("");
                setSelectedSupplier("");
                setStatusFilter("");
                setLowStockOnly(false);
                setPage(1);
              }}
              className="px-3 py-2.5 rounded-xl text-xs font-bold text-slate-400 hover:text-rose-500 transition flex items-center justify-center gap-1"
            >
              <X size={14} />
              <span>Reset</span>
            </button>
          )}
        </div>
      </div>

      {/* ── Main Full-Width Product Data Table ──────────────────────────────── */}
      <div
        className={`rounded-2xl border shadow-xs overflow-hidden ${
          isDark ? "bg-slate-900 border-slate-800" : "bg-white border-slate-200"
        }`}
      >
        <div className="overflow-x-auto min-h-[420px]">
          <table className="w-full text-left text-xs">
            <thead
              className={`sticky top-0 z-10 text-[11px] font-bold uppercase tracking-wider border-b ${
                isDark
                  ? "bg-slate-800/95 border-slate-800 text-slate-400 backdrop-blur-md"
                  : "bg-slate-50/95 border-slate-200 text-slate-500 backdrop-blur-md"
              }`}
            >
              <tr>
                <th className="py-3.5 px-3 w-10 text-center">
                  <input
                    type="checkbox"
                    checked={selectedProductIds.length === products.length && products.length > 0}
                    onChange={handleToggleSelectAll}
                    className="rounded text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                  />
                </th>
                <th className="py-3.5 px-4 w-80 lg:w-96">Product Specifications</th>
                <th className="py-3.5 px-4 w-44">SKU & Factory Code</th>
                <th className="py-3.5 px-4 w-40">Category</th>
                <th className="py-3.5 px-4 w-52">Stock Health & Pipeline</th>
                {isAccountsUser && <th className="py-3.5 px-4 w-36">Quoted Price</th>}
                <th className="py-3.5 px-4 w-28 text-center">Status</th>
                <th className="py-3.5 px-4 w-36 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/70 font-medium">
              {loading ? (
                <tr>
                  <td colSpan={isAccountsUser ? 8 : 7} className="py-16 text-center text-slate-400">
                    <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mb-2.5" />
                    <div className="font-semibold text-xs">Loading Product Master catalog...</div>
                  </td>
                </tr>
              ) : products.length === 0 ? (
                <tr>
                  <td colSpan={isAccountsUser ? 8 : 7} className="py-16 text-center text-slate-400">
                    <Boxes size={36} className="mx-auto mb-2 opacity-30 text-indigo-500" />
                    <p className="font-bold text-sm text-slate-700 dark:text-slate-300">No products match criteria</p>
                    <p className="text-xs mt-0.5 text-slate-400">
                      Try adjusting filters or register a new product to start tracking.
                    </p>
                  </td>
                </tr>
              ) : (
                products.map((p) => (
                  <tr
                    key={p.id}
                    onClick={() => handleOpenProductDetail(p, "products")}
                    className={`transition cursor-pointer ${
                      selectedProductIds.includes(p.id)
                        ? isDark
                          ? "bg-indigo-950/30 hover:bg-indigo-950/50"
                          : "bg-indigo-50/70 hover:bg-indigo-50"
                        : isDark
                        ? "hover:bg-slate-800/50"
                        : "hover:bg-indigo-50/30"
                    }`}
                  >
                    {/* Checkbox Column */}
                    <td className="py-3.5 px-3 text-center" onClick={(e) => e.stopPropagation()}>
                      <input
                        type="checkbox"
                        checked={selectedProductIds.includes(p.id)}
                        onChange={() => handleToggleSelectProduct(p.id)}
                        className="rounded text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                      />
                    </td>

                    {/* Column 1: Image, Name, Description & Dimensions (No Origin, No Manufacturer) */}
                    <td className="py-3.5 px-4">
                      <div className="flex items-start gap-3.5">
                        {/* 56x56 High-Quality Image Thumbnail with Lightbox trigger */}
                        <div
                          onClick={(e) => {
                            if (p.images && p.images.length > 0) {
                              e.stopPropagation();
                              setActiveMediaIdx(0);
                              setPreviewMediaModal({
                                name: p.name,
                                images: p.images || [],
                                videos: p.videos || []
                              });
                            }
                          }}
                          className="relative w-14 h-14 rounded-xl overflow-hidden shrink-0 border border-slate-200 dark:border-slate-700/80 bg-slate-100 dark:bg-slate-800 flex items-center justify-center group shadow-2xs"
                          title="Click to preview full-size images"
                        >
                          {p.images && p.images.length > 0 ? (
                            <>
                              <img
                                src={
                                  p.images[0].file_url?.startsWith("http") || p.images[0].file_url?.startsWith("blob:")
                                    ? p.images[0].file_url
                                    : `${process.env.REACT_APP_NETWORK}/blobs/${p.images[0].file_url}`
                                }
                                alt={p.name}
                                className="w-full h-full object-cover transition-transform duration-200 group-hover:scale-110"
                                onError={(e) => {
                                  e.target.style.display = "none";
                                }}
                              />
                              <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white">
                                <Maximize2 size={13} />
                              </div>
                            </>
                          ) : (
                            <Boxes size={22} className="text-slate-400 opacity-50" />
                          )}
                          {p.images && p.images.length > 1 && (
                            <span className="absolute top-1 left-1 px-1 py-0.2 rounded text-[9px] font-bold bg-black/60 text-white backdrop-blur-xs">
                              +{p.images.length - 1}
                            </span>
                          )}
                          {p.videos && p.videos.length > 0 && (
                            <span
                              className="absolute bottom-1 right-1 p-0.5 rounded-full bg-rose-600 text-white shadow-xs"
                              title={`${p.videos.length} video(s)`}
                            >
                              <Play size={8} className="fill-white" />
                            </span>
                          )}
                        </div>

                        {/* Title, Clean Description & Dimensions Badge */}
                        <div className="min-w-0 flex-1">
                          <div className="font-bold text-sm text-slate-900 dark:text-white leading-snug hover:text-indigo-600 dark:hover:text-indigo-400 transition">
                            {p.name}
                          </div>

                          {(p.description_quick || p.description) && (
                            <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-1 mt-0.5 leading-relaxed">
                              {p.description_quick || p.description}
                            </p>
                          )}

                          {formatDimensions(p) && (
                            <div className="flex items-center gap-1.5 mt-1.5">
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-mono font-bold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700/80">
                                <Ruler size={11} className="text-indigo-500" />
                                <span>{formatDimensions(p)}</span>
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                    </td>

                    {/* Column 2: SKU & Factory Code */}
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <div className="font-mono font-extrabold text-xs text-indigo-600 dark:text-indigo-400">
                        {p.sku}
                      </div>
                      {p.code && (
                        <div className="text-[10px] font-mono text-slate-400 mt-0.5">
                          Ref: {p.code}
                        </div>
                      )}
                      {p.factory_code && canViewVendor && (
                        <div className="mt-1">
                          <span
                            title={`Vendor Factory Code: ${p.factory_code}`}
                            className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-mono font-bold bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-500/25"
                          >
                            <span>🏭 {p.factory_code}</span>
                          </span>
                        </div>
                      )}
                    </td>

                    {/* Column 3: Category */}
                    <td className="py-3.5 px-4">
                      <span
                        className="inline-block px-2.5 py-1 rounded-lg text-[11px] font-bold bg-purple-50 dark:bg-purple-950/40 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800/60 max-w-[170px] truncate"
                        title={p.category_path || p.category_name}
                      >
                        {p.category_name || "Uncategorized"}
                      </span>
                    </td>

                    {/* Column 4: Stock Health & Pipeline */}
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <StockGaugeBar
                        currentStock={p.current_stock}
                        minStock={p.min_stock_quantity}
                        maxStock={p.max_stock_quantity}
                        unit={p.unit || "PCS"}
                        isDark={isDark}
                        onClick={(e) => {
                          if (canAdjustStock) {
                            e.stopPropagation();
                            setStockAdjustProduct(p);
                          }
                        }}
                      />
                      {p.qty_on_order > 0 && (
                        <div className="mt-1">
                          <span
                            className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold bg-blue-50 dark:bg-blue-950/50 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800"
                            title="Units currently in active purchase orders"
                          >
                            <Package size={10} />
                            <span>+{p.qty_on_order?.toLocaleString()} on order</span>
                          </span>
                        </div>
                      )}
                    </td>

                    {/* Column 5: Unit Cost (Accounts Only) */}
                    {isAccountsUser && (
                      <td className="py-3.5 px-4 whitespace-nowrap font-mono">
                        {p.unit_cost !== null && p.unit_cost !== undefined ? (
                          <div>
                            <span className="font-bold text-xs text-slate-800 dark:text-slate-200">
                              {p.currency} {parseFloat(p.unit_cost).toFixed(2)}
                            </span>
                            <span className="text-[10px] text-slate-400 ml-1">/{p.unit}</span>
                          </div>
                        ) : (
                          <span className="text-slate-400 text-xs">—</span>
                        )}
                      </td>
                    )}

                    {/* Column 6: Status */}
                    <td className="py-3.5 px-4 text-center whitespace-nowrap">
                      {p.status === "active" ? (
                        <span className="inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                          ACTIVE
                        </span>
                      ) : (
                        <span className="inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-500 border border-slate-200 dark:border-slate-700">
                          INACTIVE
                        </span>
                      )}
                    </td>

                    {/* Column 7: Actions */}
                    <td
                      className="py-3.5 px-4 text-right whitespace-nowrap"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <div className="flex items-center justify-end gap-1 relative">
                        {/* Quick View Button */}
                        <button
                          type="button"
                          onClick={() => setQuickViewProduct(p)}
                          title="Quick View specifications"
                          className="p-1.5 rounded-lg text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                        >
                          <Eye size={15} />
                        </button>

                        {/* Quick Stock Adjust Button */}
                        {canAdjustStock && (
                          <button
                            type="button"
                            onClick={() => setStockAdjustProduct(p)}
                            title="Quick Adjust Stock"
                            className="p-1.5 rounded-lg text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                          >
                            <SlidersHorizontal size={15} />
                          </button>
                        )}

                        {/* Edit Specs Direct Link */}
                        <button
                          type="button"
                          onClick={() => handleOpenProductDetail(p, "products")}
                          className="px-2.5 py-1 bg-indigo-50 dark:bg-indigo-950/50 hover:bg-indigo-600 hover:text-white dark:hover:bg-indigo-600 text-indigo-600 dark:text-indigo-400 rounded-lg text-[11px] font-bold transition flex items-center gap-1 border border-indigo-100 dark:border-indigo-900/60 shadow-2xs cursor-pointer group"
                        >
                          <span>Edit</span>
                          <ChevronRight size={12} className="transition-transform group-hover:translate-x-0.5" />
                        </button>

                        {/* Row More Actions Dropdown */}
                        <div className="relative">
                          <button
                            type="button"
                            onClick={() => setOpenRowMenuId(openRowMenuId === p.id ? null : p.id)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                          >
                            <MoreVertical size={15} />
                          </button>

                          {openRowMenuId === p.id && (
                            <div
                              className={`absolute right-0 top-8 z-30 w-44 rounded-xl shadow-xl border py-1 animate-in fade-in zoom-in-95 duration-150 ${
                                isDark
                                  ? "bg-slate-800 border-slate-700 text-slate-200"
                                  : "bg-white border-slate-200 text-slate-700"
                              }`}
                            >
                              <button
                                type="button"
                                onClick={() => {
                                  setOpenRowMenuId(null);
                                  setQuickViewProduct(p);
                                }}
                                className="w-full text-left px-3 py-1.5 text-xs hover:bg-slate-100 dark:hover:bg-slate-700 flex items-center gap-2 cursor-pointer"
                              >
                                <Eye size={13} />
                                <span>Quick View</span>
                              </button>

                              <button
                                type="button"
                                onClick={() => {
                                  setOpenRowMenuId(null);
                                  handleOpenProductDetail(p, "products");
                                }}
                                className="w-full text-left px-3 py-1.5 text-xs hover:bg-slate-100 dark:hover:bg-slate-700 flex items-center gap-2 cursor-pointer"
                              >
                                <Pencil size={13} />
                                <span>Edit Specs</span>
                              </button>

                              {canAddProduct && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    setOpenRowMenuId(null);
                                    handleDuplicateProduct(p);
                                  }}
                                  className="w-full text-left px-3 py-1.5 text-xs hover:bg-slate-100 dark:hover:bg-slate-700 flex items-center gap-2 cursor-pointer"
                                >
                                  <Copy size={13} />
                                  <span>Duplicate</span>
                                </button>
                              )}

                              {canAdjustStock && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    setOpenRowMenuId(null);
                                    setStockAdjustProduct(p);
                                  }}
                                  className="w-full text-left px-3 py-1.5 text-xs hover:bg-slate-100 dark:hover:bg-slate-700 flex items-center gap-2 cursor-pointer"
                                >
                                  <SlidersHorizontal size={13} />
                                  <span>Adjust Stock</span>
                                </button>
                              )}

                              {canEditProduct && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    setOpenRowMenuId(null);
                                    handleToggleProductStatus(p);
                                  }}
                                  className="w-full text-left px-3 py-1.5 text-xs hover:bg-slate-100 dark:hover:bg-slate-700 flex items-center gap-2 cursor-pointer"
                                >
                                  <RefreshCw size={13} />
                                  <span>Mark {p.status === "active" ? "Inactive" : "Active"}</span>
                                </button>
                              )}

                              {canDeleteProduct && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    setOpenRowMenuId(null);
                                    handleDeleteProduct(p.id, p.sku);
                                  }}
                                  className="w-full text-left px-3 py-1.5 text-xs text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 flex items-center gap-2 cursor-pointer"
                                >
                                  <Trash2 size={13} />
                                  <span>Delete</span>
                                </button>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Footer */}
        <div
          className={`p-3.5 border-t flex flex-col sm:flex-row items-center justify-between gap-3 text-xs ${
            isDark ? "bg-slate-800/40 border-slate-800 text-slate-400" : "bg-slate-50 border-slate-200 text-slate-600"
          }`}
        >
          <div className="flex items-center gap-3">
            <span>
              Showing <span className="font-bold text-slate-900 dark:text-white">{totalCount > 0 ? (page - 1) * pageSize + 1 : 0}</span> to{" "}
              <span className="font-bold text-slate-900 dark:text-white">{Math.min(page * pageSize, totalCount)}</span> of{" "}
              <span className="font-bold text-slate-900 dark:text-white">{totalCount}</span> products
            </span>
            <div className="flex items-center gap-1.5 ml-2">
              <span className="text-[11px] text-slate-400">Rows:</span>
              <select
                value={pageSize}
                onChange={(e) => {
                  setPageSize(Number(e.target.value));
                  setPage(1);
                }}
                className={`px-2 py-1 rounded-lg border text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-indigo-500 cursor-pointer ${
                  isDark ? "bg-slate-800 border-slate-700 text-white" : "bg-white border-slate-200 text-slate-900"
                }`}
              >
                <option value={10}>10</option>
                <option value={25}>25</option>
                <option value={50}>50</option>
                <option value={100}>100</option>
              </select>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1">
              <button
                type="button"
                disabled={page <= 1}
                onClick={() => setPage(1)}
                title="First Page"
                className="px-2 py-1 rounded-lg border text-xs font-semibold disabled:opacity-30 hover:bg-white dark:hover:bg-slate-700 transition cursor-pointer"
              >
                « First
              </button>
              <button
                type="button"
                disabled={page <= 1}
                onClick={() => setPage((prev) => Math.max(1, prev - 1))}
                className="px-2.5 py-1 rounded-lg border text-xs font-semibold disabled:opacity-30 hover:bg-white dark:hover:bg-slate-700 transition cursor-pointer"
              >
                ‹ Prev
              </button>
              <span className="px-2 font-mono font-bold text-slate-900 dark:text-white">
                {page} / {totalPages || 1}
              </span>
              <button
                type="button"
                disabled={page >= totalPages}
                onClick={() => setPage((prev) => Math.min(totalPages, prev + 1))}
                className="px-2.5 py-1 rounded-lg border text-xs font-semibold disabled:opacity-30 hover:bg-white dark:hover:bg-slate-700 transition cursor-pointer"
              >
                Next ›
              </button>
              <button
                type="button"
                disabled={page >= totalPages}
                onClick={() => setPage(totalPages)}
                title="Last Page"
                className="px-2 py-1 rounded-lg border text-xs font-semibold disabled:opacity-30 hover:bg-white dark:hover:bg-slate-700 transition cursor-pointer"
              >
                Last »
              </button>
            </div>

            {totalPages > 2 && (
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  const target = parseInt(jumpPageInput, 10);
                  if (!isNaN(target) && target >= 1 && target <= totalPages) {
                    setPage(target);
                    setJumpPageInput("");
                  }
                }}
                className="flex items-center gap-1 pl-2 border-l border-slate-200 dark:border-slate-700"
              >
                <span className="text-[11px] text-slate-400">Go:</span>
                <input
                  type="number"
                  min="1"
                  max={totalPages}
                  value={jumpPageInput}
                  onChange={(e) => setJumpPageInput(e.target.value)}
                  placeholder="#"
                  className={`w-12 px-1.5 py-1 border rounded-lg text-xs font-mono text-center focus:outline-none focus:ring-1 focus:ring-indigo-500 ${
                    isDark ? "bg-slate-800 border-slate-700 text-white" : "bg-white border-slate-200 text-slate-900"
                  }`}
                />
              </form>
            )}
          </div>
        </div>
      </div>

      {/* ── HIGH-RESOLUTION MEDIA LIGHTBOX MODAL ────────────────────────────── */}
      {previewMediaModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-in fade-in"
          onClick={() => setPreviewMediaModal(null)}
        >
          <div
            className="relative max-w-4xl w-full bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden shadow-2xl p-6 space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div>
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <ImageIcon size={18} className="text-indigo-400" />
                  <span>{previewMediaModal.name}</span>
                </h3>
                <p className="text-xs text-slate-400">High-Resolution Visual Media Gallery</p>
              </div>
              <button
                type="button"
                onClick={() => setPreviewMediaModal(null)}
                className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition"
              >
                <X size={20} />
              </button>
            </div>

            {/* Main Stage Display */}
            <div className="w-full h-96 rounded-2xl bg-black flex items-center justify-center overflow-hidden border border-slate-800 relative">
              {previewMediaModal.images && previewMediaModal.images.length > 0 ? (
                <img
                  src={
                    previewMediaModal.images[activeMediaIdx]?.file_url?.startsWith("http") ||
                    previewMediaModal.images[activeMediaIdx]?.file_url?.startsWith("blob:")
                      ? previewMediaModal.images[activeMediaIdx].file_url
                      : `${process.env.REACT_APP_NETWORK}/blobs/${previewMediaModal.images[activeMediaIdx]?.file_url}`
                  }
                  alt={previewMediaModal.name}
                  className="max-h-full max-w-full object-contain"
                />
              ) : (
                <div className="text-slate-500 text-xs">No media preview available</div>
              )}
            </div>

            {/* Thumbnail Navigation Carousel if Multiple Images */}
            {previewMediaModal.images && previewMediaModal.images.length > 1 && (
              <div className="flex items-center gap-2 overflow-x-auto py-2">
                {previewMediaModal.images.map((img, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => setActiveMediaIdx(idx)}
                    className={`w-16 h-16 rounded-xl overflow-hidden border-2 transition shrink-0 ${
                      activeMediaIdx === idx ? "border-indigo-500 scale-105" : "border-slate-800 opacity-60 hover:opacity-100"
                    }`}
                  >
                    <img
                      src={
                        img.file_url?.startsWith("http") || img.file_url?.startsWith("blob:")
                          ? img.file_url
                          : `${process.env.REACT_APP_NETWORK}/blobs/${img.file_url}`
                      }
                      alt={`Thumb ${idx}`}
                      className="w-full h-full object-cover"
                    />
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Floating Bulk Action Toolbar */}
      <BulkActionToolbar
        selectedCount={selectedProductIds.length}
        categories={categoriesFlat}
        isDark={isDark}
        canEdit={canEditProduct}
        canDelete={canDeleteProduct}
        canExport={canExport}
        onClearSelection={() => setSelectedProductIds([])}
        onBulkCategoryMove={handleBulkCategoryMove}
        onBulkExport={handleBulkExportSelected}
        onBulkDelete={handleBulkDelete}
      />

      {/* Stock Adjust Modal */}
      {stockAdjustProduct && (
        <StockAdjustModal
          product={stockAdjustProduct}
          isDark={isDark}
          onClose={() => setStockAdjustProduct(null)}
          onSuccess={() => fetchProducts()}
        />
      )}

      {/* Product Quick View Slide-over Drawer */}
      {quickViewProduct && (
        <ProductQuickView
          product={quickViewProduct}
          isDark={isDark}
          canViewVendor={canViewVendor}
          canViewFinancials={canViewFinancials}
          canEdit={canEditProduct}
          canAdjustStock={canAdjustStock}
          onClose={() => setQuickViewProduct(null)}
          onOpenDetail={(prod) => {
            setQuickViewProduct(null);
            handleOpenProductDetail(prod, "products");
          }}
          onAdjustStock={(prod) => {
            setQuickViewProduct(null);
            setStockAdjustProduct(prod);
          }}
          onDuplicate={(prod) => {
            setQuickViewProduct(null);
            handleDuplicateProduct(prod);
          }}
        />
      )}
    </div>
  );
}
