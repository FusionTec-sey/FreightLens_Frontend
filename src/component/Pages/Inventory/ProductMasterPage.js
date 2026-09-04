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
} from "lucide-react";
import { useTheme } from "../../../context/ThemeContext";
import { useAuth } from "../../../context/AuthContext";
import { toast } from "react-toastify";

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

const getAuthHeaders = () => {
  const token = localStorage.getItem("token") || sessionStorage.getItem("token");
  return {
    skip_zrok_interstitial: "true",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
};

export default function ProductMasterPage() {
  const { isDark } = useTheme();
  const { user, isRoot } = useAuth();

  // ── Screen Navigation Mode: "products" | "categories" | "product_detail" ─────
  const [currentView, setCurrentView] = useState("products");
  const [returnToView, setReturnToView] = useState("products");
  const [activeProductTab, setActiveProductTab] = useState("overview");

  // ── Data State ─────────────────────────────────────────────────────────────
  const [products, setProducts] = useState([]);
  const [categoriesFlat, setCategoriesFlat] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
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
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);

  // Category-Screen Product List state (right panel on Category Screen)
  const [categoryProducts, setCategoryProducts] = useState([]);
  const [categoryProductsLoading, setCategoryProductsLoading] = useState(false);
  const [categoryProductsTotal, setCategoryProductsTotal] = useState(0);

  // Product Active Editing / Viewing State (for Dedicated Screen)
  const [activeProduct, setActiveProduct] = useState(null);
  const [formData, setFormData] = useState(null);
  const [productLoading, setProductLoading] = useState(false);

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
      const res = await axios.get(`${process.env.REACT_APP_NETWORK}/getSuppliers`, {
        headers: getAuthHeaders(),
      });
      setSuppliers(res.data || []);
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
        limit: 25,
      };
      if (search.trim()) params.search = search.trim();
      if (selectedCategoryFilter) params.category_id = selectedCategoryFilter;
      if (selectedSupplier) params.supplier_id = selectedSupplier;
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
  }, [page, search, selectedCategoryFilter, selectedSupplier, statusFilter, lowStockOnly]);

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
    setActiveProductTab("overview");
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
        is_consumable: Boolean(p.is_consumable),
        is_hazardous: Boolean(p.is_hazardous),
        is_perishable: Boolean(p.is_perishable),
        expiry_days: p.expiry_days !== null && p.expiry_days !== undefined ? p.expiry_days : "",
        is_returnable: p.is_returnable !== undefined ? Boolean(p.is_returnable) : true,
        warranty_days: p.warranty_days !== null && p.warranty_days !== undefined ? p.warranty_days : "",
      });
    } catch (err) {
      console.error("Failed to load product:", err);
      toast.error("Failed to load full product specifications");
      setActiveProduct(prod);
    } finally {
      setProductLoading(false);
    }
  };

  const handleOpenCreateProduct = (fromScreen = "products") => {
    setReturnToView(fromScreen);
    setActiveProduct(null);
    setFormData({
      ...initialFormData,
      category_id: (fromScreen === "categories" && categoryScreenSelectedId) || (flattenedCategories[0]?.id || ""),
    });
    setActiveProductTab("basic");
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

  // ── Save Product Action ────────────────────────────────────────────────────
  const handleSaveProduct = async (e) => {
    if (e) e.preventDefault();
    if (!formData.name.trim()) {
      toast.error("Product name is required");
      return;
    }
    if (!activeProduct && !formData.sku.trim()) {
      toast.error("Trading SKU is required");
      return;
    }

    try {
      const payload = {
        code: formData.code.trim() ? formData.code.trim().toUpperCase() : null,
        name: formData.name.trim(),
        description: formData.description.trim() || null,
        description_quick: formData.description_quick.trim() || null,
        status: formData.status || "active",
        category_id: formData.category_id ? parseInt(formData.category_id, 10) : null,
        brand: formData.brand.trim() || null,
        model_number: formData.model_number.trim() || null,
        series: formData.series.trim() || null,
        country_of_origin: formData.country_of_origin.trim() ? formData.country_of_origin.trim().toUpperCase() : null,
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
      <div className="space-y-6 max-w-7xl mx-auto pb-16">
        {/* Top Header */}
        <div
          className={`p-5 rounded-2xl border shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition ${
            isDark ? "bg-slate-900 border-slate-800 text-white" : "bg-white border-slate-200 text-slate-900"
          }`}
        >
          <div className="flex items-center gap-3.5">
            <button
              type="button"
              onClick={handleBack}
              className={`p-2.5 rounded-xl border transition flex items-center gap-1.5 text-xs font-bold ${
                isDark
                  ? "bg-slate-800 border-slate-700 text-slate-200 hover:bg-slate-700"
                  : "bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100"
              }`}
            >
              <ArrowLeft size={16} />
              <span>Back to {returnToView === "categories" ? "Categories" : "Products"}</span>
            </button>

            <div>
              <div className="flex items-center gap-2">
                <span className="font-mono text-sm font-extrabold text-indigo-600 dark:text-indigo-400">
                  {formData?.sku || "NEW PRODUCT"}
                </span>
                {formData?.code && (
                  <span className="font-mono text-[11px] px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-500">
                    Internal: {formData.code}
                  </span>
                )}
                <span
                  className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase border ${
                    formData?.status === "active"
                      ? "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border-emerald-300"
                      : "bg-slate-100 dark:bg-slate-800 text-slate-500 border-slate-300"
                  }`}
                >
                  {formData?.status || "ACTIVE"}
                </span>
              </div>
              <h2 className="text-xl font-extrabold tracking-tight mt-0.5">
                {formData?.name || "Register Product Master Item"}
              </h2>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            {activeProduct && (
              <button
                type="button"
                onClick={handleDeleteActiveProduct}
                className="px-3.5 py-2 rounded-xl text-xs font-bold text-red-600 border border-red-200 dark:border-red-900/50 hover:bg-red-50 dark:hover:bg-red-950/30 transition flex items-center gap-1.5"
              >
                <Trash2 size={14} />
                <span>Delete</span>
              </button>
            )}

            <button
              type="button"
              onClick={handleSaveProduct}
              className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition shadow-md shadow-indigo-600/20 active:scale-95 flex items-center gap-1.5"
            >
              <Check size={16} />
              <span>{activeProduct ? "Save Specifications" : "Register Product"}</span>
            </button>
          </div>
        </div>

        {/* Tab Navigation */}
        <div
          className={`p-2 rounded-2xl border shadow-xs flex items-center gap-1.5 overflow-x-auto text-xs font-bold ${
            isDark ? "bg-slate-900 border-slate-800" : "bg-white border-slate-200"
          }`}
        >
          {[
            { id: "overview", label: "Overview & Orders Pipeline", icon: TrendingUp },
            { id: "basic", label: "Identity & Classification", icon: Boxes },
            { id: "trade", label: "Customs & HS Code", icon: Truck },
            { id: "dimensions", label: "Dimensions & Packaging", icon: Ruler },
            { id: "inventory", label: "Inventory & Stock Rules", icon: Layers },
            {
              id: "links",
              label: `Linked Items (${
                (activeProduct?.links?.variants?.length || 0) +
                (activeProduct?.links?.related?.length || 0) +
                (activeProduct?.links?.parts?.length || 0)
              })`,
              icon: Link2,
            },
            { id: "flags", label: "Compliance & Handling", icon: ShieldCheck },
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeProductTab === tab.id;
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

        {/* Tab Content Panels */}
        <div
          className={`p-6 rounded-2xl border shadow-xs ${
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
              {/* TAB 1: OVERVIEW & PIPELINE */}
              {activeProductTab === "overview" && (
                <div className="space-y-6">
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

              {/* TAB 2: IDENTITY & CLASSIFICATION */}
              {activeProductTab === "basic" && (
                <div className="space-y-5">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                    <div>
                      <label className="block text-xs font-bold mb-1">Trading SKU (External) *</label>
                      <input
                        type="text"
                        required
                        disabled={Boolean(activeProduct)}
                        value={formData?.sku || ""}
                        onChange={(e) => setFormData({ ...formData, sku: e.target.value.toUpperCase() })}
                        placeholder="e.g. TL-PORC-60X60-IVORY"
                        className={`w-full px-3.5 py-2.5 border rounded-xl text-xs font-mono font-bold uppercase focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
                          isDark
                            ? "bg-slate-800 border-slate-700 text-white placeholder-slate-500"
                            : "bg-slate-50 border-slate-200 text-slate-900"
                        } ${activeProduct ? "opacity-60 cursor-not-allowed" : ""}`}
                      />
                      <p className="text-[10px] text-slate-400 mt-1">Trading code for suppliers & market orders</p>
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

              {/* TAB 3: CUSTOMS & HS CODE */}
              {activeProductTab === "trade" && (
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
                    <label className="block text-xs font-bold mb-1">Country of Origin (ISO-2)</label>
                    <input
                      type="text"
                      maxLength={2}
                      value={formData?.country_of_origin || ""}
                      onChange={(e) => setFormData({ ...formData, country_of_origin: e.target.value.toUpperCase() })}
                      placeholder="e.g. CN, IN, IT, ES"
                      className={`w-full px-3.5 py-2.5 border rounded-xl text-xs font-mono uppercase focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
                        isDark ? "bg-slate-800 border-slate-700 text-white" : "bg-slate-50 border-slate-200 text-slate-900"
                      }`}
                    />
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
              )}

              {/* TAB 4: DIMENSIONS & PACKAGING */}
              {activeProductTab === "dimensions" && (
                <div className="space-y-5">
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                    <div>
                      <label className="block text-xs font-bold mb-1">Length</label>
                      <input
                        type="number"
                        step="any"
                        value={formData?.length !== null ? formData.length : ""}
                        onChange={(e) => setFormData({ ...formData, length: e.target.value })}
                        placeholder="0.0"
                        className={`w-full px-3 py-2.5 border rounded-xl text-xs font-mono focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
                          isDark ? "bg-slate-800 border-slate-700 text-white" : "bg-slate-50 border-slate-200"
                        }`}
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold mb-1">Width</label>
                      <input
                        type="number"
                        step="any"
                        value={formData?.width !== null ? formData.width : ""}
                        onChange={(e) => setFormData({ ...formData, width: e.target.value })}
                        placeholder="0.0"
                        className={`w-full px-3 py-2.5 border rounded-xl text-xs font-mono focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
                          isDark ? "bg-slate-800 border-slate-700 text-white" : "bg-slate-50 border-slate-200"
                        }`}
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold mb-1">Height</label>
                      <input
                        type="number"
                        step="any"
                        value={formData?.height !== null ? formData.height : ""}
                        onChange={(e) => setFormData({ ...formData, height: e.target.value })}
                        placeholder="0.0"
                        className={`w-full px-3 py-2.5 border rounded-xl text-xs font-mono focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
                          isDark ? "bg-slate-800 border-slate-700 text-white" : "bg-slate-50 border-slate-200"
                        }`}
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold mb-1">Dimension Unit</label>
                      <select
                        value={formData?.dimension_unit || "mm"}
                        onChange={(e) => setFormData({ ...formData, dimension_unit: e.target.value })}
                        className={`w-full px-3 py-2.5 border rounded-xl text-xs font-mono focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
                          isDark ? "bg-slate-800 border-slate-700 text-white" : "bg-slate-50 border-slate-200"
                        }`}
                      >
                        {DIMENSION_UNITS.map((u) => (
                          <option key={u} value={u}>
                            {u}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 pt-2">
                    <div>
                      <label className="block text-xs font-bold mb-1">Unit Weight</label>
                      <div className="flex gap-2">
                        <input
                          type="number"
                          step="any"
                          value={formData?.weight_per_unit !== null ? formData.weight_per_unit : ""}
                          onChange={(e) => setFormData({ ...formData, weight_per_unit: e.target.value })}
                          placeholder="0.00"
                          className={`flex-1 px-3.5 py-2.5 border rounded-xl text-xs font-mono focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
                            isDark ? "bg-slate-800 border-slate-700 text-white" : "bg-slate-50 border-slate-200"
                          }`}
                        />
                        <select
                          value={formData?.weight_unit || "kg"}
                          onChange={(e) => setFormData({ ...formData, weight_unit: e.target.value })}
                          className={`w-28 px-3 py-2.5 border rounded-xl text-xs font-mono focus:outline-none ${
                            isDark ? "bg-slate-800 border-slate-700 text-white" : "bg-slate-50 border-slate-200"
                          }`}
                        >
                          {WEIGHT_UNITS.map((w) => (
                            <option key={w} value={w}>
                              {w}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-bold mb-1">Units per Box / Carton</label>
                      <input
                        type="number"
                        step="any"
                        value={formData?.units_per_box !== null ? formData.units_per_box : ""}
                        onChange={(e) => setFormData({ ...formData, units_per_box: e.target.value })}
                        placeholder="e.g. 4"
                        className={`w-full px-3.5 py-2.5 border rounded-xl text-xs font-mono focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
                          isDark ? "bg-slate-800 border-slate-700 text-white" : "bg-slate-50 border-slate-200"
                        }`}
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold mb-1">Total Box Gross Weight ({formData?.weight_unit || "kg"})</label>
                      <input
                        type="number"
                        step="any"
                        value={formData?.box_weight !== null ? formData.box_weight : ""}
                        onChange={(e) => setFormData({ ...formData, box_weight: e.target.value })}
                        placeholder="e.g. 28.5"
                        className={`w-full px-3.5 py-2.5 border rounded-xl text-xs font-mono focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
                          isDark ? "bg-slate-800 border-slate-700 text-white" : "bg-slate-50 border-slate-200"
                        }`}
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 5: INVENTORY & STOCK RULES */}
              {activeProductTab === "inventory" && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                  <div>
                    <label className="block text-xs font-bold mb-1">Baseline On-Hand Stock</label>
                    <input
                      type="number"
                      step="any"
                      value={formData?.current_stock}
                      onChange={(e) => setFormData({ ...formData, current_stock: e.target.value })}
                      className={`w-full px-3.5 py-2.5 border rounded-xl text-xs font-mono font-bold focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
                        isDark ? "bg-slate-800 border-slate-700 text-white" : "bg-slate-50 border-slate-200"
                      }`}
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold mb-1">Min Stock Alert Threshold</label>
                    <input
                      type="number"
                      step="any"
                      value={formData?.min_stock_quantity}
                      onChange={(e) => setFormData({ ...formData, min_stock_quantity: e.target.value })}
                      className={`w-full px-3.5 py-2.5 border rounded-xl text-xs font-mono font-bold focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
                        isDark ? "bg-slate-800 border-slate-700 text-white" : "bg-slate-50 border-slate-200"
                      }`}
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold mb-1">Reorder Point (Trigger Qty)</label>
                    <input
                      type="number"
                      step="any"
                      value={formData?.order_threshold_qty !== null ? formData.order_threshold_qty : ""}
                      onChange={(e) => setFormData({ ...formData, order_threshold_qty: e.target.value })}
                      placeholder="Trigger quantity for auto PO alert"
                      className={`w-full px-3.5 py-2.5 border rounded-xl text-xs font-mono focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
                        isDark ? "bg-slate-800 border-slate-700 text-white" : "bg-slate-50 border-slate-200"
                      }`}
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold mb-1">Safety Stock Cushion</label>
                    <input
                      type="number"
                      step="any"
                      value={formData?.threshold_qty !== null ? formData.threshold_qty : ""}
                      onChange={(e) => setFormData({ ...formData, threshold_qty: e.target.value })}
                      placeholder="Emergency reserve"
                      className={`w-full px-3.5 py-2.5 border rounded-xl text-xs font-mono focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
                        isDark ? "bg-slate-800 border-slate-700 text-white" : "bg-slate-50 border-slate-200"
                      }`}
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold mb-1">Minimum Order Qty (MOQ)</label>
                    <input
                      type="number"
                      step="any"
                      value={formData?.min_quantity_order !== null ? formData.min_quantity_order : ""}
                      onChange={(e) => setFormData({ ...formData, min_quantity_order: e.target.value })}
                      placeholder="Supplier MOQ"
                      className={`w-full px-3.5 py-2.5 border rounded-xl text-xs font-mono focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
                        isDark ? "bg-slate-800 border-slate-700 text-white" : "bg-slate-50 border-slate-200"
                      }`}
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold mb-1">Procurement Lead Time (Days)</label>
                    <input
                      type="number"
                      value={formData?.lead_time_days !== null ? formData.lead_time_days : ""}
                      onChange={(e) => setFormData({ ...formData, lead_time_days: e.target.value })}
                      placeholder="e.g. 45"
                      className={`w-full px-3.5 py-2.5 border rounded-xl text-xs font-mono focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
                        isDark ? "bg-slate-800 border-slate-700 text-white" : "bg-slate-50 border-slate-200"
                      }`}
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold mb-1">Default Preferred Supplier</label>
                    <select
                      value={formData?.default_supplier_id || ""}
                      onChange={(e) => setFormData({ ...formData, default_supplier_id: e.target.value })}
                      className={`w-full px-3.5 py-2.5 border rounded-xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
                        isDark ? "bg-slate-800 border-slate-700 text-white" : "bg-slate-50 border-slate-200 text-slate-900"
                      }`}
                    >
                      <option value="">No Default Supplier</option>
                      {suppliers.map((s) => (
                        <option key={s.supplier_id || s.id} value={s.supplier_id || s.id}>
                          {s.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  {isAccountsUser && (
                    <div>
                      <label className="block text-xs font-bold mb-1">Standard Unit Cost (Confidential)</label>
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

              {/* TAB 6: LINKED ITEMS */}
              {activeProductTab === "links" && (
                <div className="space-y-6">
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

              {/* TAB 7: COMPLIANCE & HANDLING */}
              {activeProductTab === "flags" && (
                <div className="space-y-5">
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
      <div className="space-y-6 max-w-7xl mx-auto pb-16">
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
            {/* Products Table for this category */}
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
                      <th className="py-3 px-4">Code / SKU</th>
                      <th className="py-3 px-4">Product Details</th>
                      <th className="py-3 px-4">Category Path</th>
                      <th className="py-3 px-4">UoM</th>
                      <th className="py-3 px-4">On-Hand</th>
                      <th className="py-3 px-4">On-Order</th>
                      <th className="py-3 px-4 text-center">Status</th>
                      <th className="py-3 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                    {categoryProductsLoading ? (
                      <tr>
                        <td colSpan={8} className="py-12 text-center text-slate-400">
                          Loading products in this category branch...
                        </td>
                      </tr>
                    ) : categoryProducts.length === 0 ? (
                      <tr>
                        <td colSpan={8} className="py-12 text-center text-slate-400">
                          <Package className="mx-auto text-slate-300 dark:text-slate-600 mb-2" size={32} />
                          No products found in this category branch.
                        </td>
                      </tr>
                    ) : (
                      categoryProducts.map((p) => (
                        <tr
                          key={p.id}
                          className={`transition cursor-pointer ${
                            isDark ? "hover:bg-slate-800/50" : "hover:bg-indigo-50/40"
                          }`}
                        >
                          <td className="py-3.5 px-4 font-mono font-bold text-indigo-600 dark:text-indigo-400 whitespace-nowrap">
                            {p.sku}
                          </td>
                          <td className="py-3.5 px-4">
                            <div className="font-semibold">{p.name}</div>
                            {p.brand && <span className="text-[10px] text-slate-400">{p.brand}</span>}
                          </td>
                          <td className="py-3.5 px-4 text-purple-600 dark:text-purple-400 font-medium">
                            {p.category_path || p.category_name || "—"}
                          </td>
                          <td className="py-3.5 px-4 font-mono">{p.unit || "PCS"}</td>
                          <td className="py-3.5 px-4 whitespace-nowrap">
                            <span className="font-bold">{p.qty_on_hand ?? 0}</span> {p.unit || "PCS"}
                          </td>
                          <td className="py-3.5 px-4 whitespace-nowrap">
                            {p.qty_on_order > 0 ? (
                              <span className="inline-flex items-center gap-1 text-xs font-bold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/50 px-2 py-0.5 rounded-lg border border-blue-200 dark:border-blue-800">
                                <Package size={12} />
                                {p.qty_on_order?.toLocaleString()}
                              </span>
                            ) : (
                              <span className="text-slate-400 font-mono text-[11px]">0</span>
                            )}
                          </td>
                          <td className="py-3.5 px-4 text-center whitespace-nowrap">
                            <span
                              className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                                p.status === "active"
                                    ? "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300"
                                    : "bg-slate-100 dark:bg-slate-800 text-slate-500"
                              }`}
                            >
                              {p.status || "ACTIVE"}
                            </span>
                          </td>
                          <td className="py-3.5 px-4 text-right whitespace-nowrap">
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleOpenProductDetail(p, "categories");
                              }}
                              className="px-3 py-1 bg-indigo-50 dark:bg-indigo-950/50 hover:bg-indigo-100 text-indigo-600 dark:text-indigo-400 rounded-lg text-xs font-bold transition flex items-center gap-1 ml-auto"
                            >
                              <span>Open</span>
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
    <div className="space-y-5 max-w-7xl mx-auto pb-16">
      {/* ── Clean Top Header (No KPIs) ──────────────────────────────────────── */}
      <div
        className={`p-5 rounded-2xl border shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition ${
          isDark ? "bg-slate-900 border-slate-800 text-white" : "bg-white border-slate-200 text-slate-900"
        }`}
      >
        <div className="flex items-center gap-3.5">
          <div
            className={`p-3 rounded-2xl ${
              isDark
                ? "bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 shadow-inner"
                : "bg-indigo-600 text-white shadow-md shadow-indigo-500/20"
            }`}
          >
            <Boxes size={24} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold tracking-tight">Product Master & Inventory</h1>
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
              Standard master catalog for purchase orders, trade customs, and procurement follow-up.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
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

          <button
            type="button"
            onClick={() => handleOpenCreateProduct("products")}
            className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-md shadow-indigo-600/20 active:scale-95 cursor-pointer"
          >
            <Plus size={16} />
            <span>Register Product</span>
          </button>
        </div>
      </div>

      {/* ── Filter Bar ────────────────────────────────────────────────────────── */}
      <div
        className={`p-4 rounded-2xl border shadow-xs space-y-3 ${
          isDark ? "bg-slate-900 border-slate-800" : "bg-white border-slate-200"
        }`}
      >
        <div className="flex flex-col md:flex-row items-center gap-3">
          {/* Search */}
          <div className="relative flex-1 w-full">
            <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              placeholder="Search by SKU, Internal Code, Name, Brand, Barcode, or HS Code..."
              className={`w-full pl-10 pr-4 py-2.5 rounded-xl text-xs font-medium border transition focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
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

          {/* Category Dropdown (Indented hierarchy, no base suffixes) */}
          <div className="w-full md:w-56">
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
          <div className="w-full md:w-52">
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

          {/* Status Filter */}
          <div className="w-full md:w-36">
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

          {/* Low Stock Toggle */}
          <button
            type="button"
            onClick={() => {
              setLowStockOnly((prev) => !prev);
              setPage(1);
            }}
            className={`px-3.5 py-2.5 rounded-xl text-xs font-bold border transition flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
              lowStockOnly
                ? "bg-amber-500/10 border-amber-500/30 text-amber-600 dark:text-amber-400"
                : isDark
                ? "bg-slate-800 border-slate-700 text-slate-400 hover:text-slate-200"
                : "bg-slate-50 border-slate-200 text-slate-600 hover:text-slate-900"
            }`}
          >
            <AlertTriangle size={14} />
            <span>Low Stock</span>
          </button>
        </div>
      </div>

      {/* ── Main Full-Width Product Data Table ──────────────────────────────── */}
      <div
        className={`rounded-2xl border shadow-xs overflow-hidden ${
          isDark ? "bg-slate-900 border-slate-800" : "bg-white border-slate-200"
        }`}
      >
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead
              className={`text-[11px] font-bold uppercase tracking-wider border-b ${
                isDark
                  ? "bg-slate-800/60 border-slate-800 text-slate-400"
                  : "bg-slate-50 border-slate-200 text-slate-500"
              }`}
            >
              <tr>
                <th className="py-3.5 px-4">Code / SKU</th>
                <th className="py-3.5 px-4">Product Details</th>
                <th className="py-3.5 px-4">Category</th>
                <th className="py-3.5 px-4">UoM</th>
                <th className="py-3.5 px-4">On-Hand</th>
                <th className="py-3.5 px-4">On-Order Pipeline</th>
                {isAccountsUser && <th className="py-3.5 px-4">Unit Cost</th>}
                <th className="py-3.5 px-4">Preferred Supplier</th>
                <th className="py-3.5 px-4 text-center">Status</th>
                <th className="py-3.5 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-medium">
              {loading ? (
                <tr>
                  <td colSpan={10} className="py-14 text-center text-slate-400">
                    <div className="inline-block animate-spin rounded-full h-7 w-7 border-b-2 border-indigo-600 mb-2.5" />
                    <div>Loading Product Master catalog...</div>
                  </td>
                </tr>
              ) : products.length === 0 ? (
                <tr>
                  <td colSpan={10} className="py-14 text-center text-slate-400">
                    <Boxes size={34} className="mx-auto mb-2 opacity-30 text-indigo-500" />
                    <p className="font-semibold text-sm">No products found matching criteria</p>
                    <p className="text-xs mt-0.5">
                      Register your first product to enable PO autocompletion and order tracking.
                    </p>
                  </td>
                </tr>
              ) : (
                products.map((p) => (
                  <tr
                    key={p.id}
                    onClick={() => handleOpenProductDetail(p, "products")}
                    className={`transition cursor-pointer ${
                      isDark ? "hover:bg-slate-800/40" : "hover:bg-slate-50/70"
                    }`}
                  >
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <div className="font-mono font-bold text-indigo-600 dark:text-indigo-400">{p.sku}</div>
                      {p.code && <div className="text-[10px] font-mono text-slate-400">Int: {p.code}</div>}
                    </td>

                    <td className="py-3.5 px-4">
                      <div className="font-bold text-slate-900 dark:text-white">{p.name}</div>
                      <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                        {p.brand && (
                          <span className="text-[10px] font-semibold px-1.5 py-0.2 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
                            {p.brand}
                          </span>
                        )}
                        {p.model_number && (
                          <span className="text-[10px] font-mono text-slate-400">Mod: {p.model_number}</span>
                        )}
                        {p.hs_code && (
                          <span className="text-[10px] font-mono text-slate-400">HS: {p.hs_code}</span>
                        )}
                      </div>
                      {p.description_quick && (
                        <div className="text-[11px] text-slate-400 truncate max-w-xs mt-0.5">
                          {p.description_quick}
                        </div>
                      )}
                    </td>

                    {/* Clean Category Column */}
                    <td className="py-3.5 px-4">
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-purple-50 dark:bg-purple-950/40 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800 whitespace-nowrap">
                        {p.category_name || "Uncategorized"}
                      </span>
                      {p.category_path && (
                        <div className="text-[10px] text-slate-400 truncate max-w-xs mt-0.5" title={p.category_path}>
                          {p.category_path}
                        </div>
                      )}
                    </td>

                    <td className="py-3.5 px-4 font-mono font-semibold text-slate-500 whitespace-nowrap">
                      {p.unit}
                    </td>

                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <div className="font-mono font-bold">
                        {p.current_stock?.toLocaleString()} {p.unit}
                      </div>
                      {p.is_low_stock && (
                        <span className="inline-flex items-center gap-1 text-[9px] font-bold text-amber-600 bg-amber-50 dark:bg-amber-950/40 px-1 rounded border border-amber-200 dark:border-amber-800 mt-0.5">
                          <AlertTriangle size={9} />
                          Low Stock
                        </span>
                      )}
                    </td>

                    <td className="py-3.5 px-4 whitespace-nowrap">
                      {p.qty_on_order > 0 ? (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold bg-blue-50 dark:bg-blue-950/50 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
                          <Package size={13} className="text-blue-500" />
                          <span>
                            {p.qty_on_order?.toLocaleString()} {p.unit}
                          </span>
                        </span>
                      ) : (
                        <span className="text-slate-400 text-[11px] font-mono">0 on order</span>
                      )}
                    </td>

                    {isAccountsUser && (
                      <td className="py-3.5 px-4 font-mono font-medium whitespace-nowrap">
                        {p.unit_cost !== null && p.unit_cost !== undefined ? (
                          <span className="text-slate-700 dark:text-slate-300">
                            {p.currency} {parseFloat(p.unit_cost).toFixed(2)}
                          </span>
                        ) : (
                          <span className="text-slate-400">—</span>
                        )}
                      </td>
                    )}

                    <td className="py-3.5 px-4 whitespace-nowrap text-slate-600 dark:text-slate-300">
                      {p.supplier_name ? (
                        <div className="flex items-center gap-1">
                          <Building size={12} className="text-slate-400" />
                          <span>{p.supplier_name}</span>
                        </div>
                      ) : (
                        <span className="text-slate-400">—</span>
                      )}
                    </td>

                    <td className="py-3.5 px-4 text-center whitespace-nowrap">
                      {p.status === "active" ? (
                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                          ACTIVE
                        </span>
                      ) : (
                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-500 border border-slate-200 dark:border-slate-700">
                          INACTIVE
                        </span>
                      )}
                    </td>

                    <td
                      className="py-3.5 px-4 text-right whitespace-nowrap"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <button
                        type="button"
                        onClick={() => handleOpenProductDetail(p, "products")}
                        className="px-3 py-1.5 bg-indigo-50 dark:bg-indigo-950/50 hover:bg-indigo-100 text-indigo-600 dark:text-indigo-400 rounded-lg text-xs font-bold transition flex items-center gap-1 ml-auto"
                      >
                        <span>Open Screen</span>
                        <ChevronRight size={14} />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Footer */}
        {totalPages > 1 && (
          <div
            className={`p-3.5 border-t flex items-center justify-between text-xs ${
              isDark ? "bg-slate-800/40 border-slate-800 text-slate-400" : "bg-slate-50 border-slate-200 text-slate-600"
            }`}
          >
            <div>
              Showing {products.length} of {totalCount} products
            </div>
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                disabled={page <= 1}
                onClick={() => setPage((prev) => Math.max(1, prev - 1))}
                className="px-2.5 py-1 rounded border text-xs font-semibold disabled:opacity-40"
              >
                Previous
              </button>
              <span className="px-2 font-mono font-bold">
                {page} / {totalPages}
              </span>
              <button
                type="button"
                disabled={page >= totalPages}
                onClick={() => setPage((prev) => Math.min(totalPages, prev + 1))}
                className="px-2.5 py-1 rounded border text-xs font-semibold disabled:opacity-40"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
