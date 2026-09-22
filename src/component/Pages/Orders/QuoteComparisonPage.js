import React, { useState, useEffect, useMemo } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  ArrowLeft,
  Plus,
  TrendingDown,
  TrendingUp,
  Minus,
  CheckCircle2,
  Truck,
  Sparkles,
  AlertTriangle,
  Award,
  Layers,
  FileText,
  Star,
  Check,
  RefreshCw,
  Loader2,
  ExternalLink,
  Building2,
  Split,
  X,
  ArrowRight,
  Edit3,
  Trash2,
  RotateCcw,
  ShieldAlert,
  Send
} from "lucide-react";
import axios from "axios";
import { toast } from "react-toastify";
import { useTheme } from "../../../context/ThemeContext";
import { useAuth } from "../../../context/AuthContext";
import { useOptions } from "../../../hooks/useOptions";
import VendorQuoteEntryModal from "./VendorQuoteEntryModal";

export default function QuoteComparisonPage() {
  const navigate = useNavigate();
  const { id: orderId } = useParams();
  const { isDark } = useTheme();
  const { isRoot, permissions = [] } = useAuth();
  const { suppliers = [] } = useOptions();

  let userInfo = null;
  try {
    const token = localStorage.getItem("token");
    if (token) {
      const base64Url = token.split(".")[1];
      const base64 = base64Url.replace(/-/g, "+").replace(/_/g, "/");
      userInfo = JSON.parse(decodeURIComponent(atob(base64).split("").map((c) => "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2)).join("")));
    }
  } catch (e) {}

  const canCompareQuotes = Boolean(
    isRoot ||
    permissions.includes("Compare_Quote") ||
    permissions.includes("View_VendorQuote") ||
    userInfo?.roles?.some((r) => {
      const lower = (r || "").toLowerCase();
      return lower.includes("admin") || lower.includes("procurement") || lower.includes("buyer") || lower.includes("finance") || lower.includes("account");
    })
  );

  const canRecordQuote = Boolean(
    isRoot ||
    permissions.includes("Add_VendorQuote") ||
    userInfo?.roles?.some((r) => {
      const lower = (r || "").toLowerCase();
      return lower.includes("admin") || lower.includes("procurement") || lower.includes("buyer");
    })
  );

  const canApproveQuote = Boolean(
    isRoot ||
    permissions.includes("Approve_Quote") ||
    userInfo?.roles?.some((r) => {
      const lower = (r || "").toLowerCase();
      return lower.includes("admin") || lower.includes("procurement") || lower.includes("buyer");
    })
  );

  const canSendRFQ = Boolean(
    isRoot ||
    permissions.includes("Send_RFQ") ||
    permissions.includes("Create_PO") ||
    userInfo?.roles?.some((r) => {
      const lower = (r || "").toLowerCase();
      return lower.includes("admin") || lower.includes("procurement") || lower.includes("buyer");
    })
  );

  const [comparisonData, setComparisonData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [sendingRfq, setSendingRfq] = useState(false);
  const [showAddQuoteModal, setShowAddQuoteModal] = useState(false);
  const [editingQuote, setEditingQuote] = useState(null);
  const [deletingQuote, setDeletingQuote] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showSplitConfirmModal, setShowSplitConfirmModal] = useState(false);
  const [splitResultData, setSplitResultData] = useState(null);
  const [awarding, setAwarding] = useState(false);
  const [selectedQuoteId, setSelectedQuoteId] = useState(null);
  const [lineAwards, setLineAwards] = useState({}); // { po_item_id: { quote_id, unit_price } }
  const [successMsg, setSuccessMsg] = useState("");
  const [errorMsg, setErrorMsg] = useState("");
  const [showRevokeConfirmModal, setShowRevokeConfirmModal] = useState(false);
  const [revoking, setRevoking] = useState(false);

  const handleDeleteQuote = async (quote) => {
    if (!quote) return;
    const quoteId = quote.quote_id || quote.id;
    setIsDeleting(true);
    try {
      await axios.delete(
        `${process.env.REACT_APP_NETWORK}/orders/${orderId}/quotes/${quoteId}`,
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`,
            skip_zrok_interstitial: "true",
          },
        }
      );
      toast.success(`Quote from ${quote.supplier_name} deleted successfully`);
      setDeletingQuote(null);
      fetchComparison();
    } catch (err) {
      console.error("Failed to delete vendor quote:", err);
      toast.error(err.response?.data?.detail || "Failed to delete vendor quote.");
    } finally {
      setIsDeleting(false);
    }
  };

  const fetchComparison = async () => {
    if (!orderId) return;
    setLoading(true);
    try {
      const res = await axios.get(
        `${process.env.REACT_APP_NETWORK}/orders/${orderId}/quotes/comparison`,
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`,
            skip_zrok_interstitial: "true"
          }
        }
      );
      setComparisonData(res.data);
      if (res.data?.po?.selected_quote_id) {
        setSelectedQuoteId(res.data.po.selected_quote_id);
      }
    } catch (err) {
      console.error("Failed to load quote comparison:", err);
      setErrorMsg("Failed to load quote comparison matrix.");
    } finally {
      setLoading(false);
    }
  };

  const handleSendRFQDirect = async () => {
    setSendingRfq(true);
    try {
      let success = false;
      try {
        await axios.post(
          `${process.env.REACT_APP_NETWORK}/orders/${orderId}/transition`,
          {
            target_stage: "RFQ_SENT",
            expected_version: poInfo?.lifecycle_version || 1,
            comment: "Dispatched RFQ to vendors for quotation bidding.",
          },
          {
            headers: {
              Authorization: `Bearer ${localStorage.getItem("token")}`,
              skip_zrok_interstitial: "true",
            },
          }
        );
        success = true;
      } catch (transErr) {
        console.warn("Transition endpoint fallback:", transErr);
      }

      if (!success) {
        await axios.patch(
          `${process.env.REACT_APP_NETWORK}/orders/${orderId}/status`,
          { status: "RFQ_SENT", lifecycle_stage: "RFQ_SENT" },
          {
            headers: {
              Authorization: `Bearer ${localStorage.getItem("token")}`,
              skip_zrok_interstitial: "true",
            },
          }
        );
      }

      toast.success("RFQ successfully dispatched to vendors!");
      await fetchComparison();
    } catch (err) {
      console.error("Failed to dispatch RFQ:", err);
      toast.error(err.response?.data?.detail || "Failed to dispatch RFQ to suppliers.");
    } finally {
      setSendingRfq(false);
    }
  };

  useEffect(() => {
    fetchComparison();
  }, [orderId]);

  const vendors = comparisonData?.vendors || [];
  const lineItems = comparisonData?.line_items || [];
  const poInfo = comparisonData?.po || {};

  // Find strictly fastest vendor lead time (only if at least 2 quotes exist with valid lead time, and the lowest lead time is strictly less than all others)
  const fastestVendorQuote = useMemo(() => {
    const withLead = vendors.filter((v) => v.delivery_lead_time_days && v.delivery_lead_time_days > 0);
    if (withLead.length < 2) return null;
    const sorted = [...withLead].sort((a, b) => a.delivery_lead_time_days - b.delivery_lead_time_days);
    if (sorted[0].delivery_lead_time_days < sorted[1].delivery_lead_time_days) {
      return sorted[0];
    }
    return null; // Tie or same lead time
  }, [vendors]);

  // Handle select entire vendor
  const handleSelectEntireVendor = (quoteId) => {
    setSelectedQuoteId(quoteId);
    // Auto-fill line awards with this vendor's items
    const newAwards = {};
    lineItems.forEach((row) => {
      const qData = row.vendor_quotes[quoteId];
      if (qData) {
        newAwards[row.po_item_id] = {
          quote_id: quoteId,
          unit_price: qData.unit_price,
          availability: qData.availability
        };
      }
    });
    setLineAwards(newAwards);
  };

  // Handle selecting a specific line item from a vendor
  const handleSelectLineAward = (poItemId, quoteId, unitPrice, availability) => {
    setLineAwards((prev) => ({
      ...prev,
      [poItemId]: {
        quote_id: quoteId,
        unit_price: unitPrice,
        availability: availability
      }
    }));
  };

  // Auto-pick lowest unit price for every line item across all vendor quotes
  const handleAutoPickLowest = () => {
    const newAwards = {};
    lineItems.forEach((row) => {
      let lowestPrice = Infinity;
      let bestQuoteId = null;
      let bestAvail = "AVAILABLE";

      vendors.forEach((v) => {
        const qData = row.vendor_quotes[v.quote_id];
        if (qData && qData.unit_price > 0 && qData.unit_price < lowestPrice) {
          lowestPrice = qData.unit_price;
          bestQuoteId = v.quote_id;
          bestAvail = qData.availability;
        }
      });

      if (bestQuoteId) {
        newAwards[row.po_item_id] = {
          quote_id: bestQuoteId,
          unit_price: lowestPrice,
          availability: bestAvail
        };
      }
    });
    setLineAwards(newAwards);
    setSelectedQuoteId(null);
  };

  // Group awarded items by winning supplier/quote
  const awardedVendorsSummary = useMemo(() => {
    if (!lineItems.length || !vendors.length) return [];
    const vMap = {};
    vendors.forEach((v) => {
      vMap[v.quote_id] = v;
    });

    const groups = {};
    lineItems.forEach((row) => {
      const awarded = lineAwards[row.po_item_id];
      const targetQuoteId = awarded?.quote_id || selectedQuoteId;
      if (!targetQuoteId) return;

      const vInfo = vMap[targetQuoteId];
      if (!vInfo) return;

      if (!groups[targetQuoteId]) {
        groups[targetQuoteId] = {
          quote_id: targetQuoteId,
          supplier_id: vInfo.supplier_id,
          supplier_name: vInfo.supplier_name,
          quote_reference: vInfo.quote_reference,
          currency: vInfo.currency || "USD",
          items: [],
          total: 0
        };
      }

      const unitPrice = awarded ? awarded.unit_price : (row.vendor_quotes[targetQuoteId]?.unit_price || 0);
      const qty = row.quantity_ordered || 0;
      const lineTotal = unitPrice * qty;

      groups[targetQuoteId].items.push({
        po_item_id: row.po_item_id,
        item_code: row.item_code,
        description: row.description,
        quantity_ordered: qty,
        unit: row.unit,
        unit_price: unitPrice,
        line_total: lineTotal
      });
      groups[targetQuoteId].total += lineTotal;
    });

    return Object.values(groups);
  }, [lineItems, vendors, lineAwards, selectedQuoteId]);

  // Check if any items are unallocated
  const unallocatedItemsCount = useMemo(() => {
    return lineItems.filter((row) => {
      const hasAward = lineAwards[row.po_item_id]?.quote_id || selectedQuoteId;
      return !hasAward;
    }).length;
  }, [lineItems, lineAwards, selectedQuoteId]);

  // Calculate current selected total
  const selectedTotal = useMemo(() => {
    return lineItems.reduce((acc, row) => {
      const awarded = lineAwards[row.po_item_id];
      if (awarded) {
        return acc + row.quantity_ordered * awarded.unit_price;
      }
      if (selectedQuoteId) {
        const qData = row.vendor_quotes[selectedQuoteId];
        if (qData) return acc + row.quantity_ordered * qData.unit_price;
      }
      return acc;
    }, 0);
  }, [lineItems, lineAwards, selectedQuoteId]);

  // Calculate baseline historical total
  const historicalBaselineTotal = useMemo(() => {
    return lineItems.reduce((acc, row) => {
      if (row.historical_benchmark?.price) {
        return acc + row.quantity_ordered * row.historical_benchmark.price;
      }
      return acc;
    }, 0);
  }, [lineItems]);

  const savingsVsHistorical = useMemo(() => {
    if (historicalBaselineTotal === 0 || selectedTotal === 0) return null;
    const diff = historicalBaselineTotal - selectedTotal;
    const pct = (diff / historicalBaselineTotal) * 100;
    return { diff, pct };
  }, [historicalBaselineTotal, selectedTotal]);

  const handleInitiateAward = () => {
    if (awardedVendorsSummary.length === 0) {
      setErrorMsg("Please select quotes or award items before approving.");
      return;
    }
    setErrorMsg("");
    setShowSplitConfirmModal(true);
  };

  const hasExistingChildPOs = Boolean(poInfo?.child_pos && poInfo.child_pos.length > 0);

  const executeSplitAward = async () => {
    if (hasExistingChildPOs) {
      setErrorMsg("This RFQ has already been awarded and split into Purchase Orders. To change allocations, revoke the current award first.");
      return;
    }
    setAwarding(true);
    setErrorMsg("");
    setSuccessMsg("");

    try {
      const allocations = [];
      lineItems.forEach((row) => {
        const award = lineAwards[row.po_item_id];
        const quoteId = award?.quote_id || selectedQuoteId;
        if (quoteId) {
          const vendor = vendors.find((v) => v.quote_id === quoteId);
          const price = award ? award.unit_price : (row.vendor_quotes[quoteId]?.unit_price || 0);
          allocations.push({
            po_item_id: row.po_item_id,
            supplier_id: vendor?.supplier_id,
            quote_id: quoteId,
            unit_price: price,
            approved_unit_price: price
          });
        }
      });

      const res = await axios.post(
        `${process.env.REACT_APP_NETWORK}/orders/${orderId}/quotes/split-award`,
        { allocations },
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`,
            skip_zrok_interstitial: "true"
          }
        }
      );

      setShowSplitConfirmModal(false);
      setSplitResultData(res.data);
      setSuccessMsg(res.data.message || "Purchase Orders successfully created!");
      fetchComparison();
    } catch (err) {
      console.error("Failed to execute split award:", err);
      setErrorMsg(err.response?.data?.detail || "Failed to split and award quotes.");
    } finally {
      setAwarding(false);
    }
  };

  const executeRevokeAward = async () => {
    setRevoking(true);
    setErrorMsg("");
    setSuccessMsg("");
    try {
      const res = await axios.post(
        `${process.env.REACT_APP_NETWORK}/orders/${orderId}/quotes/revoke-award`,
        {},
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`,
            skip_zrok_interstitial: "true"
          }
        }
      );
      toast.success(res.data.message || "Award revoked successfully.");
      setShowRevokeConfirmModal(false);
      fetchComparison();
    } catch (err) {
      console.error("Failed to revoke award:", err);
      setErrorMsg(err.response?.data?.detail || "Failed to revoke award.");
    } finally {
      setRevoking(false);
    }
  };

  const childPoBySupplier = useMemo(() => {
    const map = {};
    (poInfo?.child_pos || []).forEach((c) => {
      if (c.supplier_id) {
        map[Number(c.supplier_id)] = c;
      }
      if (c.company) {
        map[c.company.trim().toLowerCase()] = c;
      }
    });
    return map;
  }, [poInfo?.child_pos]);

  if (!canCompareQuotes) {
    return (
      <div className={`w-full min-h-screen p-8 flex items-center justify-center ${isDark ? "bg-slate-950 text-slate-100" : "bg-slate-50 text-slate-900"}`}>
        <div className="max-w-md w-full p-6 text-center rounded-2xl border border-rose-200 dark:border-rose-900 bg-rose-50 dark:bg-rose-950/40 text-rose-800 dark:text-rose-200 space-y-3 shadow-lg">
          <ShieldAlert className="w-12 h-12 mx-auto text-rose-500" />
          <h2 className="text-base font-black">Confidential Sourcing Restricted</h2>
          <p className="text-xs opacity-80 leading-relaxed">
            Vendor price quotations, supplier bids, and side-by-side comparison matrices are confidential commercial data. Your account is authorized for request creation only.
          </p>
          <div className="pt-2">
            <button
              type="button"
              onClick={() => navigate(`/orders/${orderId}/edit`)}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-900 dark:bg-slate-200 dark:hover:bg-white text-white dark:text-slate-900 font-bold rounded-xl text-xs transition"
            >
              Return to Request
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      className={`w-full min-h-full flex flex-col flex-1 ${
        isDark ? "bg-slate-950 text-slate-100" : "bg-slate-50 text-slate-900"
      }`}
    >
      {/* ── TOP COMMAND BAR ─────────────────────────────────────────────── */}
      <div
        className={`sticky top-0 z-20 w-full px-4 sm:px-6 py-3.5 border-b backdrop-blur-md transition-colors ${
          isDark ? "bg-slate-900/90 border-slate-800" : "bg-white/90 border-slate-200 shadow-xs"
        }`}
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          {/* Breadcrumb & Title */}
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => {
                if (poInfo.doc_type === "RFQ") {
                  navigate("/orders/quotes");
                } else {
                  navigate(`/orders/${orderId}/edit`);
                }
              }}
              className={`p-2 rounded-xl border transition flex items-center justify-center ${
                isDark
                  ? "border-slate-800 hover:bg-slate-800 text-slate-300"
                  : "border-slate-200 hover:bg-slate-100 text-slate-700"
              }`}
              title={poInfo.doc_type === "RFQ" ? "Return to Vendor Quotes & Bidding" : "Return to Order Edit page"}
            >
              <ArrowLeft size={16} />
            </button>

            <div>
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                  PO #{poInfo.po_number} · Procurement Lifecycle
                </span>
                <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300">
                  {poInfo.lifecycle_stage} (v{poInfo.lifecycle_version})
                </span>
              </div>
              <h1 className="text-lg sm:text-xl font-black tracking-tight flex items-center gap-2">
                <Layers className="text-blue-500" size={20} />
                <span>Multi-Vendor Quote Comparison & Award Workspace</span>
              </h1>
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2 self-end sm:self-auto">
            <button
              type="button"
              onClick={fetchComparison}
              className={`p-2 rounded-xl border transition ${
                isDark ? "border-slate-800 hover:bg-slate-800 text-slate-300" : "border-slate-200 hover:bg-slate-100 text-slate-700"
              }`}
              title="Refresh Quote Matrix"
            >
              <RefreshCw size={15} className={loading ? "animate-spin" : ""} />
            </button>

            {canSendRFQ && (poInfo.lifecycle_stage === "CONFIRMED" || poInfo.status === "CONFIRMED") && (
              <button
                type="button"
                onClick={handleSendRFQDirect}
                disabled={sendingRfq}
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold bg-indigo-600 hover:bg-indigo-700 active:scale-95 text-white transition shadow-sm disabled:opacity-50"
                title="Dispatch / Send this RFQ to suppliers"
              >
                <Send size={14} className={sendingRfq ? "animate-spin" : ""} />
                <span>{sendingRfq ? "Sending RFQ..." : "Send RFQ to Vendors"}</span>
              </button>
            )}

            {canRecordQuote && (
              <button
                type="button"
                onClick={() => setShowAddQuoteModal(true)}
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold border border-blue-500/30 bg-blue-500/10 text-blue-600 dark:text-blue-400 hover:bg-blue-500/20 transition shadow-xs"
              >
                <Plus size={14} />
                <span>Add Vendor Quote</span>
              </button>
            )}

            {hasExistingChildPOs ? (
              <div className="flex items-center gap-2">
                <span className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-extrabold bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800">
                  <CheckCircle2 size={14} />
                  <span>Awarded ({poInfo.child_pos.length} POs Issued)</span>
                </span>
                {canApproveQuote && (
                  <button
                    type="button"
                    onClick={() => setShowRevokeConfirmModal(true)}
                    disabled={revoking}
                    className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold border border-rose-300 dark:border-rose-900/60 text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition active:scale-95 shadow-xs"
                    title="Revoke award and return RFQ to comparison mode"
                  >
                    <RotateCcw size={13} className={revoking ? "animate-spin" : ""} />
                    <span>Revoke Award</span>
                  </button>
                )}
              </div>
            ) : canApproveQuote ? (
              <button
                type="button"
                onClick={handleInitiateAward}
                disabled={awarding || selectedTotal === 0}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white disabled:opacity-50 transition shadow-md shadow-emerald-600/20"
                title={selectedTotal === 0 ? "Select a vendor quote or award line items below first" : "Confirm selected quote and issue Purchase Order"}
              >
                <Award size={15} />
                <span>{selectedTotal === 0 ? "Select Quote to Confirm" : "Confirm & Award Quote"}</span>
              </button>
            ) : null}

            <button
              type="button"
              onClick={() => {
                if (poInfo.doc_type === "RFQ") {
                  navigate("/orders/quotes");
                } else {
                  navigate(`/orders/${orderId}/edit`);
                }
              }}
              className={`px-3.5 py-2 text-xs font-bold rounded-xl border transition ${
                isDark ? "border-slate-800 hover:bg-slate-800 text-slate-300" : "border-slate-200 hover:bg-slate-100 text-slate-700"
              }`}
            >
              {poInfo.doc_type === "RFQ" ? "Back to Quotes" : "Back to Order"}
            </button>
          </div>
        </div>
      </div>

      {/* Notifications */}
      {successMsg && (
        <div className="mx-4 sm:mx-6 mt-4 p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-xs flex items-center gap-2 font-bold animate-in fade-in">
          <CheckCircle2 size={16} />
          <span>{successMsg}</span>
        </div>
      )}
      {errorMsg && (
        <div className="mx-4 sm:mx-6 mt-4 p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-500 text-xs flex items-center gap-2 font-bold animate-in fade-in">
          <AlertTriangle size={16} />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Already Split & Awarded Notification Banner */}
      {hasExistingChildPOs && (
        <div className="mx-4 sm:mx-6 mt-4 p-4 rounded-2xl bg-indigo-50/80 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800 flex flex-col md:flex-row md:items-center justify-between gap-3 shadow-xs">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-600 text-white flex items-center justify-center flex-none shadow-xs">
              <Layers size={20} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-indigo-200 dark:bg-indigo-900 text-indigo-800 dark:text-indigo-200 uppercase">
                  Awarded & Split
                </span>
                <h4 className="text-sm font-black text-indigo-950 dark:text-indigo-100">
                  Requisition Awarded across {poInfo.child_pos.length} Purchase Orders
                </h4>
              </div>
              <p className="text-xs text-indigo-700 dark:text-indigo-400 mt-0.5">
                Official Purchase Orders have already been generated from this RFQ.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            {poInfo.child_pos.map((c) => (
              <button
                key={c.id}
                type="button"
                onClick={() => navigate(`/orders/${c.id}/edit`)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-white dark:bg-slate-900 border border-indigo-300 dark:border-indigo-700 text-indigo-700 dark:text-indigo-300 hover:bg-indigo-50 dark:hover:bg-slate-800 transition shadow-xs"
              >
                <FileText size={13} />
                <span>{c.po_number} ({c.company})</span>
                <ExternalLink size={12} className="opacity-70" />
              </button>
            ))}
          </div>
        </div>
      )}

      {/* ── MAIN WORKSPACE CONTENT ─────────────────────────────────────── */}
      <div className="w-full flex-1 p-4 sm:p-6 space-y-6">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-32 space-y-3 text-slate-400">
            <Loader2 size={32} className="animate-spin text-blue-500" />
            <p className="text-sm font-medium">Constructing side-by-side quote comparison matrix...</p>
          </div>
        ) : vendors.length === 0 ? (
          /* Empty State: No quotes received yet */
          <div
            className={`w-full rounded-2xl border p-12 text-center space-y-4 ${
              isDark ? "bg-slate-900 border-slate-800" : "bg-white border-slate-200"
            }`}
          >
            <div className="w-12 h-12 rounded-2xl bg-blue-500/10 text-blue-500 mx-auto flex items-center justify-center">
              <FileText size={24} />
            </div>
            <div className="max-w-md mx-auto space-y-1">
              <h3 className="text-base font-bold">No Vendor Quotations Captured Yet</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Send RFQs to suppliers or click below to record quote responses received via email or supplier portals.
              </p>
            </div>
            {canRecordQuote && (
              <button
                type="button"
                onClick={() => setShowAddQuoteModal(true)}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white transition shadow-sm active:scale-95"
              >
                <Plus size={15} />
                <span>Record First Vendor Quote</span>
              </button>
            )}
          </div>
        ) : (
          <>
            {/* ── ROW 1: VENDOR SUMMARY CARDS ──────────────────────────── */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {vendors.map((v) => {
                const isSelected = selectedQuoteId === v.quote_id;
                const isFastest = fastestVendorQuote?.quote_id === v.quote_id;

                return (
                  <div
                    key={v.quote_id}
                    onClick={() => !hasExistingChildPOs && handleSelectEntireVendor(v.quote_id)}
                    className={`rounded-2xl border p-4 sm:p-5 flex flex-col justify-between space-y-3.5 transition-all relative ${
                      !hasExistingChildPOs ? "cursor-pointer" : "cursor-default"
                    } ${
                      isSelected
                        ? "border-blue-500 ring-2 ring-blue-500/20 shadow-md bg-blue-50/20 dark:bg-blue-950/20"
                        : isDark
                        ? "bg-slate-900/80 border-slate-800 hover:border-slate-700"
                        : "bg-white border-slate-200 hover:border-slate-300 shadow-xs"
                    }`}
                  >
                    {/* Badges on top */}
                    {isFastest && (
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border border-amber-300 dark:border-amber-800">
                          <Truck size={10} />
                          <span>Fastest Delivery</span>
                        </span>
                      </div>
                    )}

                    {/* Vendor Name & Total */}
                    <div>
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0 flex-1">
                          <h4 className="text-sm font-black tracking-tight truncate">{v.supplier_name}</h4>
                          <p className="text-[11px] text-slate-400 font-mono">
                            Ref: {v.quote_reference || "N/A"} · {v.quote_date || "No date"}
                          </p>
                        </div>
                        {/* Edit & Delete Action Buttons */}
                        {!hasExistingChildPOs && (
                          <div className="flex items-center gap-1 flex-none" onClick={(e) => e.stopPropagation()}>
                            <button
                              type="button"
                              onClick={() => setEditingQuote(v)}
                              className={`p-1.5 rounded-lg border transition ${
                                isDark
                                  ? "border-slate-700 hover:bg-slate-800 text-slate-300 hover:text-white"
                                  : "border-slate-200 hover:bg-slate-100 text-slate-600 hover:text-slate-900"
                              }`}
                              title={`Edit quotation from ${v.supplier_name}`}
                            >
                              <Edit3 size={13} />
                            </button>
                            <button
                              type="button"
                              onClick={() => setDeletingQuote(v)}
                              className={`p-1.5 rounded-lg border transition ${
                                isDark
                                  ? "border-rose-900/50 hover:bg-rose-950/60 text-rose-400 hover:text-rose-300"
                                  : "border-rose-200 hover:bg-rose-50 text-rose-600 hover:text-rose-700"
                              }`}
                              title={`Delete quotation from ${v.supplier_name}`}
                            >
                              <Trash2 size={13} />
                            </button>
                          </div>
                        )}
                      </div>

                      <div className="mt-2 flex items-baseline gap-1">
                        <span className="text-xl sm:text-2xl font-black font-mono tracking-tight text-slate-900 dark:text-white">
                          ${v.total_quoted_amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </span>
                        <span className="text-xs font-bold text-slate-400">{v.currency}</span>
                      </div>
                    </div>

                    {/* Meta Specs */}
                    <div className="pt-2 border-t border-slate-200/60 dark:border-slate-800 space-y-1 text-[11px] text-slate-500 dark:text-slate-400">
                      <div className="flex items-center justify-between">
                        <span>Lead Time:</span>
                        <span className="font-mono font-bold text-slate-700 dark:text-slate-200">
                          {v.delivery_lead_time_days ? `${v.delivery_lead_time_days} Days` : "Not specified"}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span>Incoterms:</span>
                        <span className="font-bold text-slate-700 dark:text-slate-200">{v.shipping_terms || "FOB"}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span>Items Quoted:</span>
                        <span className="font-mono font-bold text-slate-700 dark:text-slate-200">
                          {v.items_count} / {lineItems.length}
                        </span>
                      </div>
                    </div>

                    {/* Action Area */}
                    <div className="pt-1">
                      {hasExistingChildPOs ? (
                        (() => {
                          const childPo = childPoBySupplier[Number(v.supplier_id)] || childPoBySupplier[v.supplier_name?.trim()?.toLowerCase()];
                          if (childPo) {
                            return (
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  navigate(`/orders/${childPo.id}/edit`);
                                }}
                                className="w-full py-2 rounded-xl text-xs font-bold bg-blue-600 hover:bg-blue-700 active:scale-95 text-white transition flex items-center justify-center gap-1.5 shadow-sm shadow-blue-600/20"
                                title={`Open official Purchase Order ${childPo.po_number}`}
                              >
                                <ExternalLink size={13} />
                                <span>View Issued PO ({childPo.po_number})</span>
                              </button>
                            );
                          }
                          return (
                            <div className="w-full py-2 rounded-xl text-xs font-semibold bg-slate-100 dark:bg-slate-800/60 text-slate-400 flex items-center justify-center gap-1 border border-slate-200/50 dark:border-slate-800">
                              <span>Not Awarded</span>
                            </div>
                          );
                        })()
                      ) : (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleSelectEntireVendor(v.quote_id);
                            setErrorMsg("");
                            setShowSplitConfirmModal(true);
                          }}
                          className="w-full py-2 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white transition flex items-center justify-center gap-1.5 shadow-sm shadow-emerald-600/20"
                          title={`Confirm quote from ${v.supplier_name} and generate official Purchase Order`}
                        >
                          <Award size={14} />
                          <span>Confirm Quote</span>
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* ── ROW 2: SIDE-BY-SIDE LINE ITEM COMPARISON MATRIX ───────── */}
            <div
              className={`rounded-2xl border shadow-sm overflow-hidden ${
                isDark ? "bg-slate-900 border-slate-800" : "bg-white border-slate-200"
              }`}
            >
              <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold tracking-tight">Line Item Price & Availability Breakdown</h3>
                  <p className="text-[11px] text-slate-400">
                    Compare quoted prices against historical purchase benchmarks. Best unit price per line item is starred.
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={handleAutoPickLowest}
                    disabled={hasExistingChildPOs}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold border border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 transition shadow-xs ${
                      hasExistingChildPOs ? "opacity-40 cursor-not-allowed" : "hover:bg-emerald-500/20 active:scale-95"
                    }`}
                    title={hasExistingChildPOs ? "Cannot reallocate items while RFQ is awarded" : "Automatically allocate each line item to the supplier offering the lowest unit price"}
                  >
                    <Sparkles size={13} className="text-emerald-500" />
                    <span>Auto-Pick Lowest Bids</span>
                  </button>
                  <span className="text-[11px] font-mono text-slate-400 font-medium">
                    {lineItems.length} Line Items · {vendors.length} Quotes
                  </span>
                </div>
              </div>

              <div className="overflow-x-auto scrollbar-thin">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b text-[10px] font-bold uppercase tracking-wider bg-slate-100/80 dark:bg-slate-800/80 text-slate-500 sticky top-0 z-10">
                      <th className="py-3 px-4 min-w-[220px]">Line Item Description</th>
                      <th className="py-3 px-3 text-right min-w-[90px]">Req. Qty</th>
                      <th className="py-3 px-4 min-w-[170px] bg-slate-200/50 dark:bg-slate-800/40">
                        Historical Last Price
                      </th>
                      {vendors.map((v) => (
                        <th
                          key={v.quote_id}
                          className={`py-3 px-4 min-w-[190px] border-l ${
                            isDark ? "border-slate-800" : "border-slate-200"
                          } ${selectedQuoteId === v.quote_id ? "bg-blue-50/30 dark:bg-blue-950/20" : ""}`}
                        >
                          <div className="flex items-center justify-between gap-1.5">
                            <div className="truncate font-bold text-slate-900 dark:text-slate-100">{v.supplier_name}</div>
                            {!hasExistingChildPOs && (
                              <div className="flex items-center gap-1 flex-none" onClick={(e) => e.stopPropagation()}>
                                <button
                                  type="button"
                                  onClick={() => setEditingQuote(v)}
                                  className="p-1 rounded hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition"
                                  title={`Edit ${v.supplier_name} quote`}
                                >
                                  <Edit3 size={11} />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setDeletingQuote(v)}
                                  className="p-1 rounded hover:bg-rose-100 dark:hover:bg-rose-950/50 text-slate-400 hover:text-rose-600 transition"
                                  title={`Delete ${v.supplier_name} quote`}
                                >
                                  <Trash2 size={11} />
                                </button>
                              </div>
                            )}
                          </div>
                          <div className="text-[9px] text-slate-400 font-mono font-normal">
                            Lead: {v.delivery_lead_time_days || "—"}d · {v.shipping_terms || "FOB"}
                          </div>
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className={`divide-y ${isDark ? "divide-slate-800" : "divide-slate-100"}`}>
                    {lineItems.map((row) => {
                      const awardedForThisLine = lineAwards[row.po_item_id];

                      return (
                        <tr key={row.po_item_id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition">
                          {/* Item Name & Code */}
                          <td className="py-3 px-4 font-medium">
                            <div className="font-bold text-slate-900 dark:text-slate-100">
                              {row.item_code ? <span className="font-mono text-blue-500 mr-1.5">{row.item_code}</span> : null}
                              {row.description}
                            </div>
                          </td>

                          {/* Required Qty */}
                          <td className="py-3 px-3 text-right font-mono font-bold text-slate-700 dark:text-slate-300">
                            {row.quantity_ordered} <span className="text-[10px] text-slate-400 font-normal">{row.unit}</span>
                          </td>

                          {/* Historical Last Price Benchmark */}
                          <td className="py-3 px-4 bg-slate-50/50 dark:bg-slate-900/30 font-mono">
                            {row.historical_benchmark ? (
                              <div>
                                <span className="font-extrabold text-slate-900 dark:text-slate-100">
                                  ${row.historical_benchmark.price.toFixed(2)}
                                </span>
                                <div className="text-[10px] text-slate-400 truncate">
                                  {row.historical_benchmark.po_number || "Past PO"} · {row.historical_benchmark.date || ""}
                                </div>
                              </div>
                            ) : (
                              <span className="text-[10px] text-slate-400 italic">First purchase</span>
                            )}
                          </td>

                          {/* Vendor Quote Columns */}
                          {vendors.map((v) => {
                            const qData = row.vendor_quotes[v.quote_id];
                            if (!qData) {
                              return (
                                <td
                                  key={v.quote_id}
                                  className={`py-3 px-4 border-l text-center text-slate-400 text-[11px] italic ${
                                    isDark ? "border-slate-800" : "border-slate-200"
                                  }`}
                                >
                                  Not quoted
                                </td>
                              );
                            }

                            const isAwarded =
                              (awardedForThisLine && awardedForThisLine.quote_id === v.quote_id) ||
                              (!awardedForThisLine && selectedQuoteId === v.quote_id);

                            return (
                              <td
                                key={v.quote_id}
                                className={`py-3 px-4 border-l transition ${
                                  isDark ? "border-slate-800" : "border-slate-200"
                                } ${isAwarded ? "bg-blue-50/40 dark:bg-blue-950/30" : ""}`}
                              >
                                <div className="space-y-1.5">
                                  {/* Price + Trend Pill */}
                                  <div className="flex items-center justify-between gap-1">
                                    <div className="flex items-center gap-1 font-mono font-black text-sm text-slate-900 dark:text-white">
                                      {qData.is_lowest && (
                                        <Star size={12} className="text-emerald-500 fill-emerald-500 flex-none" />
                                      )}
                                      <span>${qData.unit_price.toFixed(2)}</span>
                                    </div>

                                    {/* Trend indicator vs benchmark */}
                                    {qData.price_trend === "DOWN" ? (
                                      <span className="inline-flex items-center gap-0.5 px-1.5 py-0.2 rounded text-[10px] font-bold bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300">
                                        <TrendingDown size={11} />
                                        <span>{Math.abs(qData.trend_pct)}%</span>
                                      </span>
                                    ) : qData.price_trend === "UP" ? (
                                      <span className="inline-flex items-center gap-0.5 px-1.5 py-0.2 rounded text-[10px] font-bold bg-rose-100 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300">
                                        <TrendingUp size={11} />
                                        <span>+{qData.trend_pct}%</span>
                                      </span>
                                    ) : (
                                      <span className="inline-flex items-center gap-0.5 px-1.5 py-0.2 rounded text-[10px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-500">
                                        <Minus size={11} />
                                      </span>
                                    )}
                                  </div>

                                  {/* Total Price */}
                                  <div className="text-[10px] text-slate-400 font-mono">
                                    Total: ${qData.total_price.toFixed(2)}
                                  </div>

                                  {/* Availability Tag */}
                                  <div className="flex items-center justify-between gap-1 pt-1">
                                    <span
                                      className={`px-1.5 py-0.2 rounded text-[9px] font-bold uppercase ${
                                        qData.availability === "AVAILABLE"
                                          ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300"
                                          : qData.availability === "PARTIAL"
                                          ? "bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300"
                                          : qData.availability === "SUBSTITUTE_OFFERED"
                                          ? "bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300"
                                          : "bg-rose-50 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300"
                                      }`}
                                    >
                                      {qData.availability}
                                    </span>

                                    {/* Line Award Selector */}
                                    {hasExistingChildPOs ? (
                                      isAwarded ? (
                                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-blue-600 text-white shadow-2xs">
                                          <Check size={10} />
                                          <span>Awarded</span>
                                        </span>
                                      ) : (
                                        <span className="text-[10px] text-slate-400 font-medium px-2 py-0.5">
                                          —
                                        </span>
                                      )
                                    ) : (
                                      <button
                                        type="button"
                                        onClick={() =>
                                          handleSelectLineAward(
                                            row.po_item_id,
                                            v.quote_id,
                                            qData.unit_price,
                                            qData.availability
                                          )
                                        }
                                        className={`px-2 py-0.5 rounded text-[10px] font-bold transition active:scale-95 ${
                                          isAwarded
                                            ? "bg-blue-600 text-white shadow-2xs"
                                            : "border border-slate-300 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
                                        }`}
                                      >
                                        {isAwarded ? "Awarded" : "Award Line"}
                                      </button>
                                    )}
                                  </div>
                                </div>
                              </td>
                            );
                          })}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            {/* ── ROW 3: BOTTOM STICKY AWARD ACTION BAR ────────────────── */}
            <div
              className={`rounded-2xl border p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 sticky bottom-4 z-20 shadow-xl ${
                isDark ? "bg-slate-900 border-slate-700 text-white" : "bg-white border-slate-300 text-slate-900"
              }`}
            >
              <div className="flex items-center gap-4 flex-wrap">
                <div>
                  <span className="block text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                    Total Awarded Order Value
                  </span>
                  <span className="text-xl sm:text-2xl font-black font-mono text-blue-600 dark:text-blue-400">
                    ${selectedTotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} {poInfo.currency || "USD"}
                  </span>
                </div>

                {savingsVsHistorical && (
                  <div className="border-l border-slate-200 dark:border-slate-800 pl-4">
                    <span className="block text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                      Variance vs Historical Baseline
                    </span>
                    <span
                      className={`text-sm font-black font-mono ${
                        savingsVsHistorical.diff >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-rose-500"
                      }`}
                    >
                      {savingsVsHistorical.diff >= 0 ? "Savings: " : "Cost Increase: "}
                      ${Math.abs(savingsVsHistorical.diff).toFixed(2)} ({savingsVsHistorical.pct.toFixed(1)}%)
                    </span>
                  </div>
                )}
                {/* Vendor Allocation Pills */}
                {awardedVendorsSummary.length > 0 && (
                  <div className="flex items-center gap-2 flex-wrap">
                    {awardedVendorsSummary.map((v) => (
                      <div
                        key={v.quote_id}
                        className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs shadow-2xs"
                      >
                        <Building2 size={12} className="text-blue-500" />
                        <span className="font-bold">{v.supplier_name}:</span>
                        <span className="text-slate-500 font-mono text-[11px]">{v.items.length} items</span>
                        <span className="font-mono font-bold text-slate-900 dark:text-slate-100">
                          ${v.total.toFixed(2)}
                        </span>
                      </div>
                    ))}
                    {unallocatedItemsCount > 0 && (
                      <span className="text-[11px] font-semibold text-amber-500">
                        ({unallocatedItemsCount} item{unallocatedItemsCount > 1 ? "s" : ""} unallocated)
                      </span>
                    )}
                  </div>
                )}
              </div>

              <div className="flex items-center gap-2">
                {hasExistingChildPOs ? (
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold text-slate-400 hidden sm:inline">
                      RFQ is locked in Awarded stage.
                    </span>
                    <button
                      type="button"
                      onClick={() => setShowRevokeConfirmModal(true)}
                      disabled={revoking}
                      className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold border border-rose-300 dark:border-rose-800 text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/50 transition active:scale-95 shadow-2xs"
                      title="Revoke award and unlock RFQ for re-allocation"
                    >
                      <RotateCcw size={13} className={revoking ? "animate-spin" : ""} />
                      <span>Revoke Award</span>
                    </button>
                  </div>
                ) : (
                  <>
                    <button
                      type="button"
                      onClick={() => {
                        setLineAwards({});
                        setSelectedQuoteId(null);
                      }}
                      className="px-3.5 py-2 rounded-xl text-xs font-bold border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
                    >
                      Reset Selections
                    </button>
                    <button
                      type="button"
                      onClick={handleInitiateAward}
                      disabled={awarding || selectedTotal === 0}
                      className="flex items-center gap-2 px-6 py-2.5 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white transition shadow-md shadow-emerald-600/20 disabled:opacity-50"
                    >
                      {awarding ? (
                        <>
                          <Loader2 size={14} className="animate-spin" />
                          <span>Processing Confirmation...</span>
                        </>
                      ) : awardedVendorsSummary.length > 1 ? (
                        <>
                          <Split size={15} />
                          <span>Confirm & Split into {awardedVendorsSummary.length} POs</span>
                        </>
                      ) : (
                        <>
                          <Award size={15} />
                          <span>Confirm Quote & Issue PO</span>
                        </>
                      )}
                    </button>
                  </>
                )}
              </div>
            </div>
          </>
        )}
      </div>

      {/* Add / Edit Vendor Quote Modal */}
      <VendorQuoteEntryModal
        isOpen={showAddQuoteModal || !!editingQuote}
        onClose={() => {
          setShowAddQuoteModal(false);
          setEditingQuote(null);
        }}
        po={{ ...poInfo, items: lineItems.map((li) => ({ id: li.po_item_id, ...li })) }}
        suppliers={suppliers}
        onQuoteSaved={fetchComparison}
        quoteToEdit={editingQuote}
        existingSupplierIds={vendors.map((v) => v.supplier_id)}
      />

      {/* ── MODAL: CONFIRM QUOTE DELETION ──────────────────────────────────── */}
      {deletingQuote && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs animate-in fade-in">
          <div
            className={`w-full max-w-md rounded-2xl border shadow-2xl p-6 space-y-4 ${
              isDark ? "bg-slate-900 border-slate-800 text-slate-100" : "bg-white border-slate-200 text-slate-900"
            }`}
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-rose-500/10 text-rose-500 flex items-center justify-center flex-none">
                <Trash2 size={20} />
              </div>
              <div>
                <h3 className="text-sm font-bold">Delete Vendor Quotation?</h3>
                <p className="text-xs text-slate-400">
                  {deletingQuote.supplier_name} (Ref: {deletingQuote.quote_reference || "N/A"})
                </p>
              </div>
            </div>

            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
              Are you sure you want to delete this quotation of{" "}
              <span className="font-mono font-bold text-slate-900 dark:text-white">
                ${deletingQuote.total_quoted_amount?.toFixed(2)} {deletingQuote.currency}
              </span>
              ? This will remove it from the comparison matrix and clear any awarded prices associated with it.
            </p>

            <div className="pt-2 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setDeletingQuote(null)}
                disabled={isDeleting}
                className="px-4 py-2 rounded-xl text-xs font-bold border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => handleDeleteQuote(deletingQuote)}
                disabled={isDeleting}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-rose-600 hover:bg-rose-700 active:scale-95 text-white transition shadow-sm disabled:opacity-50"
              >
                {isDeleting ? (
                  <>
                    <Loader2 size={13} className="animate-spin" />
                    <span>Deleting...</span>
                  </>
                ) : (
                  <>
                    <Trash2 size={13} />
                    <span>Delete Quote</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL: CONFIRM REVOKE AWARD ─────────────────────────────────────── */}
      {showRevokeConfirmModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs animate-in fade-in">
          <div
            className={`w-full max-w-md rounded-2xl border shadow-2xl p-6 space-y-4 ${
              isDark ? "bg-slate-900 border-slate-800 text-slate-100" : "bg-white border-slate-200 text-slate-900"
            }`}
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-rose-500/10 text-rose-500 flex items-center justify-center flex-none">
                <RotateCcw size={20} />
              </div>
              <div>
                <h3 className="text-sm font-bold">Revoke RFQ Award?</h3>
                <p className="text-xs text-slate-400">
                  Requisition #{poInfo.po_number}
                </p>
              </div>
            </div>

            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
              Are you sure you want to revoke this award? This will cancel the{" "}
              <span className="font-bold text-slate-900 dark:text-white">
                {poInfo.child_pos?.length || 0} Purchase Order(s)
              </span>{" "}
              already generated ({poInfo.child_pos?.map((c) => c.po_number).join(", ")}) and return this RFQ back to quote comparison.
            </p>

            <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-600 dark:text-amber-400 text-xs flex items-center gap-2">
              <AlertTriangle size={15} className="flex-none" />
              <span>Only allowed if no payments or shipments have been recorded on the issued POs.</span>
            </div>

            <div className="pt-2 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowRevokeConfirmModal(false)}
                disabled={revoking}
                className="px-4 py-2 rounded-xl text-xs font-bold border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={executeRevokeAward}
                disabled={revoking}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-rose-600 hover:bg-rose-700 active:scale-95 text-white transition shadow-sm disabled:opacity-50"
              >
                {revoking ? (
                  <>
                    <Loader2 size={13} className="animate-spin" />
                    <span>Revoking...</span>
                  </>
                ) : (
                  <>
                    <RotateCcw size={13} />
                    <span>Revoke & Re-open RFQ</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL: CONFIRM MULTI-VENDOR SPLIT / AWARD ──────────────────────── */}
      {showSplitConfirmModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs animate-in fade-in">
          <div
            className={`w-full max-w-2xl rounded-2xl border shadow-2xl overflow-hidden flex flex-col max-h-[90vh] ${
              isDark ? "bg-slate-900 border-slate-800 text-slate-100" : "bg-white border-slate-200 text-slate-900"
            }`}
          >
            {/* Header */}
            <div className="p-5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-blue-500/10 text-blue-500 flex items-center justify-center">
                  <Split size={18} />
                </div>
                <div>
                  <h3 className="text-base font-bold">
                    {awardedVendorsSummary.length > 1
                      ? `Confirm Multi-Vendor Award & Split (${awardedVendorsSummary.length} POs)`
                      : "Confirm Vendor Award & Issue PO"}
                  </h3>
                  <p className="text-xs text-slate-400">
                    {awardedVendorsSummary.length > 1
                      ? `Requisition ${poInfo.po_number} will be split into individual Purchase Orders.`
                      : `Purchase Order will be awarded to ${awardedVendorsSummary[0]?.supplier_name}.`}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowSplitConfirmModal(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
              >
                <X size={18} />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-5 overflow-y-auto space-y-4 text-xs">
              {unallocatedItemsCount > 0 && (
                <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-600 dark:text-amber-400 font-semibold flex items-center gap-2">
                  <AlertTriangle size={15} />
                  <span>
                    Warning: {unallocatedItemsCount} line item(s) have no supplier quote awarded. Only allocated items will be included in the generated Purchase Orders.
                  </span>
                </div>
              )}

              <p className="text-slate-400">
                Review the projected Purchase Orders that will be generated:
              </p>

              <div className="space-y-3">
                {awardedVendorsSummary.map((v, idx) => {
                  const projectedPoNumber =
                    awardedVendorsSummary.length > 1
                      ? `${poInfo.po_number?.replace("RFQ-", "PO-") || "PO"}-${String.fromCharCode(65 + idx)}`
                      : poInfo.po_number?.replace("RFQ-", "PO-") || "PO-0001";

                  return (
                    <div
                      key={v.quote_id}
                      className={`p-4 rounded-xl border space-y-2.5 ${
                        isDark ? "bg-slate-950/60 border-slate-800" : "bg-slate-50 border-slate-200"
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-black text-blue-600 dark:text-blue-400 text-sm">
                            {projectedPoNumber}
                          </span>
                          <span className="text-slate-400 font-bold">·</span>
                          <span className="font-bold text-slate-900 dark:text-white">{v.supplier_name}</span>
                        </div>
                        <span className="font-mono font-black text-slate-900 dark:text-white text-sm">
                          ${v.total.toFixed(2)} {v.currency}
                        </span>
                      </div>

                      <div className="border-t border-slate-200 dark:border-slate-800 pt-2">
                        <table className="w-full text-left text-[11px]">
                          <thead>
                            <tr className="text-slate-400 font-semibold border-b border-slate-200/50 dark:border-slate-800/50">
                              <th className="pb-1">Item Description</th>
                              <th className="pb-1 text-right">Qty</th>
                              <th className="pb-1 text-right">Unit Price</th>
                              <th className="pb-1 text-right">Subtotal</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-200/30 dark:divide-slate-800/30">
                            {v.items.map((it) => (
                              <tr key={it.po_item_id} className="text-slate-600 dark:text-slate-300">
                                <td className="py-1">
                                  {it.item_code ? <span className="font-mono text-blue-500 mr-1">{it.item_code}</span> : null}
                                  {it.description}
                                </td>
                                <td className="py-1 text-right font-mono">{it.quantity_ordered} {it.unit}</td>
                                <td className="py-1 text-right font-mono">${it.unit_price.toFixed(2)}</td>
                                <td className="py-1 text-right font-mono font-bold">${it.line_total.toFixed(2)}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="pt-2 flex items-center justify-between text-sm font-black border-t border-slate-200 dark:border-slate-800">
                <span>Total Combined Award:</span>
                <span className="font-mono text-blue-600 dark:text-blue-400 text-base">
                  ${selectedTotal.toFixed(2)} {poInfo.currency || "USD"}
                </span>
              </div>
            </div>

            {/* Actions */}
            <div className="p-4 border-t border-slate-200 dark:border-slate-800 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowSplitConfirmModal(false)}
                className="px-4 py-2 rounded-xl text-xs font-bold border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={executeSplitAward}
                disabled={awarding}
                className="flex items-center gap-1.5 px-6 py-2 rounded-xl text-xs font-bold bg-blue-600 hover:bg-blue-700 active:scale-95 text-white transition shadow-md shadow-blue-500/20 disabled:opacity-50"
              >
                {awarding ? (
                  <>
                    <Loader2 size={14} className="animate-spin" />
                    <span>Creating Purchase Orders...</span>
                  </>
                ) : (
                  <>
                    <Check size={14} />
                    <span>Confirm & Generate {awardedVendorsSummary.length} PO(s)</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL: SPLIT SUCCESS WITH DIRECT LINKS ─────────────────────────── */}
      {splitResultData && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs animate-in fade-in">
          <div
            className={`w-full max-w-lg rounded-2xl border shadow-2xl overflow-hidden flex flex-col p-6 text-center space-y-5 ${
              isDark ? "bg-slate-900 border-slate-800 text-slate-100" : "bg-white border-slate-200 text-slate-900"
            }`}
          >
            <div className="w-14 h-14 rounded-2xl bg-emerald-500/10 text-emerald-500 mx-auto flex items-center justify-center shadow-xs">
              <CheckCircle2 size={32} />
            </div>

            <div className="space-y-1">
              <h3 className="text-lg font-black tracking-tight">Purchase Orders Successfully Generated!</h3>
              <p className="text-xs text-slate-400">
                Requisition <span className="font-mono font-bold text-blue-500">{splitResultData.rfq_number}</span> has been awarded. Official Purchase Orders are now ready:
              </p>
            </div>

            {/* Generated PO Cards */}
            <div className="space-y-2 text-left text-xs">
              {(splitResultData.created_pos || []).map((po) => (
                <div
                  key={po.id}
                  className={`p-3.5 rounded-xl border flex items-center justify-between transition ${
                    isDark ? "bg-slate-950/50 border-slate-800 hover:border-slate-700" : "bg-slate-50 border-slate-200 hover:border-slate-300"
                  }`}
                >
                  <div>
                    <div className="font-mono font-black text-blue-600 dark:text-blue-400 text-sm">
                      {po.po_number}
                    </div>
                    <div className="font-bold text-slate-700 dark:text-slate-200">{po.company}</div>
                    <div className="text-[11px] text-slate-400 font-mono">
                      {po.items_count} items · ${po.total_amount?.toFixed(2)} {po.currency}
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => navigate(`/orders/${po.id}/edit`)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white transition shadow-xs"
                  >
                    <span>Open PO</span>
                    <ArrowRight size={13} />
                  </button>
                </div>
              ))}
            </div>

            {/* Modal Actions */}
            <div className="pt-2 flex items-center justify-center gap-3">
              <button
                type="button"
                onClick={() => navigate("/orders?tab=sourcing")}
                className="px-4 py-2 rounded-xl text-xs font-bold border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
              >
                Go to Sourcing Hub
              </button>
              <button
                type="button"
                onClick={() => setSplitResultData(null)}
                className="px-5 py-2 rounded-xl text-xs font-bold bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 hover:opacity-90 transition"
              >
                Stay in Workspace
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
