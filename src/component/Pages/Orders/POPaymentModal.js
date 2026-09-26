import React, { useState, useEffect, useMemo } from "react";
import axios from "axios";
import {
  X,
  CreditCard,
  CheckCircle2,
  AlertCircle,
  AlertTriangle,
  Plus,
  Trash2,
  Receipt,
  Check,
  Loader2,
  Edit3,
  Paperclip,
  Download,
  FileUp
} from "lucide-react";
import { toast } from "react-toastify";
import { useTheme } from "../../../context/ThemeContext";
import { ordersApi } from "../../../services/ordersApi";
import CurrencyInput, { CurrencyDisplay } from "../../UI/UXComponent/CurrencyInput";

const downloadBlob = (blob, name) => {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = name;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
};

export default function POPaymentModal({
  isOpen,
  onClose,
  orderId,
  poNumber = "",
  supplierName = "",
  totalAmount = 0,
  itemsSubtotal = 0,
  advanceAmount = 0,
  balanceAmount = 0,
  currency = "USD",
  currencySymbol = null,
  paymentStatus = "NONE",
  paymentDate = "",
  balancePaymentDate = "",
  existingPayments = [],
  isAccountsOrAdmin = true,
  onPaymentSaved,
}) {
  const { isDark } = useTheme();
  const activeSymbol = currencySymbol || currency || "$";

  // If totalAmount is 0 or empty, automatically use itemsSubtotal as per total item cost
  const effectiveTotal = useMemo(() => {
    const rawTotal = parseFloat(totalAmount) || 0;
    const rawSubtotal = parseFloat(itemsSubtotal) || 0;
    return rawTotal > 0 ? rawTotal : rawSubtotal;
  }, [totalAmount, itemsSubtotal]);

  const [paymentsList, setPaymentsList] = useState(existingPayments || []);
  const [showRecordModal, setShowRecordModal] = useState(false);
  const [isDeletingId, setIsDeletingId] = useState(null);
  const [editingPayment, setEditingPayment] = useState(null);

  // Form State for Recording Payment Entry Popup (Manual Entry)
  const [paymentType, setPaymentType] = useState("ADVANCE");
  const [amount, setAmount] = useState("");
  const [paidDate, setPaidDate] = useState(new Date().toISOString().slice(0, 10));
  const [paymentMethod, setPaymentMethod] = useState("Bank Transfer (TT)");
  const [referenceNumber, setReferenceNumber] = useState("");
  const [notes, setNotes] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [allowOverpayment, setAllowOverpayment] = useState(false);
  const [uploadingProofId, setUploadingProofId] = useState(null);
  const [recordProofFile, setRecordProofFile] = useState(null);

  const handleRowProofUpload = async (paymentId, file) => {
    if (!file || !paymentId) return;
    setUploadingProofId(paymentId);
    const formData = new FormData();
    formData.append("file", file);
    formData.append("document_type", "payment_proof");
    formData.append("payment_id", paymentId);
    try {
      await ordersApi.uploadDocument(formData);
      toast.success(`Proof '${file.name}' attached successfully!`);
      if (orderId && !String(orderId).startsWith("temp-")) {
        const refreshed = await axios.get(`${process.env.REACT_APP_NETWORK}/orders/${orderId}/payments`, {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`,
            skip_zrok_interstitial: "true",
          },
        });
        if (refreshed.data?.payments) {
          setPaymentsList(refreshed.data.payments);
        }
      }
    } catch (err) {
      console.error("Proof upload failed:", err);
      toast.error("Failed to upload payment proof document.");
    } finally {
      setUploadingProofId(null);
    }
  };

  const handleDownloadProof = async (docId, fileName) => {
    try {
      const blob = await ordersApi.downloadDocument(docId);
      downloadBlob(blob, fileName || `payment_proof_${docId}.pdf`);
    } catch (err) {
      console.error("Download failed:", err);
      toast.error("Could not download payment proof.");
    }
  };

  useEffect(() => {
    setPaymentsList(existingPayments || []);
  }, [existingPayments]);

  // Fetch fresh payments from backend when modal opens
  useEffect(() => {
    if (isOpen && orderId && !String(orderId).startsWith("temp-")) {
      axios
        .get(`${process.env.REACT_APP_NETWORK}/orders/${orderId}/payments`, {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`,
            skip_zrok_interstitial: "true",
          },
        })
        .then((res) => {
          if (res.data?.payments) {
            setPaymentsList(res.data.payments);
          }
        })
        .catch((err) => {
          console.warn("Could not fetch remote payments:", err);
        });
    }
  }, [isOpen, orderId]);

  // Calculate current paid total from payments list, falling back to advanceAmount
  const totalPaid = useMemo(() => {
    if (paymentsList.length > 0) {
      return paymentsList.reduce((acc, p) => acc + (parseFloat(p.amount) || 0), 0);
    }
    return parseFloat(advanceAmount) || 0;
  }, [paymentsList, advanceAmount]);

  const currentBalance = Math.max(0, effectiveTotal - totalPaid);
  const percentPaid = effectiveTotal > 0 ? Math.min(100, Math.round((totalPaid / effectiveTotal) * 100)) : 0;

  // Base cleared payments excluding the one being edited (prevents false overpayment/refund conflicts on edit)
  const basePaidForValidation = useMemo(() => {
    if (editingPayment) {
      return Math.max(0, totalPaid - (parseFloat(editingPayment.amount) || 0));
    }
    return totalPaid;
  }, [editingPayment, totalPaid]);

  const balanceForValidation = Math.max(0, effectiveTotal - basePaidForValidation);

  // Overpayment & Excess Refund detection
  const rawAmtNum = parseFloat(amount) || 0;
  const isOverpayment = paymentType !== "RETURN" && effectiveTotal > 0 && rawAmtNum > (balanceForValidation + 0.01);
  const isExcessRefund = paymentType === "RETURN" && Math.abs(rawAmtNum) > (basePaidForValidation + 0.01);

  const currentPaymentStatus = currentBalance <= 0.01 && effectiveTotal > 0
    ? "FULLY_PAID"
    : totalPaid > 0
    ? "PART_PAID"
    : "UNPAID";

  // Open the Record Payment Popup for New Payment Entry
  const handleOpenRecordModal = () => {
    setEditingPayment(null);
    setErrorMsg("");
    setAmount("");
    setReferenceNumber("");
    setNotes("");
    setAllowOverpayment(false);
    setRecordProofFile(null);
    setPaymentType(totalPaid <= 0 ? "ADVANCE" : "PROGRESS");
    setPaidDate(new Date().toISOString().slice(0, 10));
    setShowRecordModal(true);
  };

  // Open the Record Payment Popup for Editing an Existing Payment
  const handleOpenEditModal = (p) => {
    setEditingPayment(p);
    setErrorMsg("");
    setPaymentType(p.payment_type || "ADVANCE");
    setAmount(Math.abs(parseFloat(p.amount) || 0).toString());
    setPaidDate(p.paid_date ? p.paid_date.slice(0, 10) : new Date().toISOString().slice(0, 10));
    setPaymentMethod(p.payment_method || "Bank Transfer (TT)");
    setReferenceNumber(p.reference_number || "");
    setNotes(p.notes || "");
    setAllowOverpayment(false);
    setRecordProofFile(null);
    setShowRecordModal(true);
  };

  // Submit Payment Record (Manual Entry or Edit)
  const handleSubmitPayment = async (e) => {
    if (e && e.preventDefault) e.preventDefault();
    const rawAmt = parseFloat(amount);
    if (isNaN(rawAmt) || rawAmt === 0) {
      setErrorMsg("Please enter a valid non-zero payment amount.");
      return;
    }

    // Negative amounts are ONLY acceptable when payment type is RETURN
    if (rawAmt < 0 && paymentType !== "RETURN") {
      setErrorMsg("Negative amounts are only acceptable when payment type is 'Return Payment'.");
      return;
    }

    if (paymentType !== "RETURN" && rawAmt <= 0) {
      setErrorMsg("Payment amount must be greater than zero.");
      return;
    }

    // Overpayment restriction
    if (paymentType !== "RETURN" && effectiveTotal > 0 && rawAmt > (balanceForValidation + 0.01)) {
      if (!allowOverpayment) {
        setErrorMsg(
          `Payment amount (${currency} ${rawAmt.toLocaleString(undefined, { minimumFractionDigits: 2 })}) exceeds the remaining balance due (${currency} ${balanceForValidation.toLocaleString(undefined, { minimumFractionDigits: 2 })}). Please adjust the amount or check "Authorize Overpayment".`
        );
        return;
      }
    }

    // Excess refund restriction
    if (paymentType === "RETURN" && Math.abs(rawAmt) > (basePaidForValidation + 0.01)) {
      setErrorMsg(
        `Return payment (${currency} ${Math.abs(rawAmt).toLocaleString(undefined, { minimumFractionDigits: 2 })}) cannot exceed total already paid (${currency} ${basePaidForValidation.toLocaleString(undefined, { minimumFractionDigits: 2 })}).`
      );
      return;
    }

    // For Return Payment, normalize to negative deduction (refund)
    const amtNum = paymentType === "RETURN" ? -Math.abs(rawAmt) : rawAmt;

    setIsSubmitting(true);
    setErrorMsg("");

    const paymentPayload = {
      amount: amtNum,
      payment_type: paymentType,
      currency: currency,
      paid_date: paidDate,
      payment_method: paymentMethod,
      reference_number: referenceNumber,
      notes: notes,
      allow_overpayment: allowOverpayment,
    };

    try {
      if (orderId && !String(orderId).startsWith("temp-")) {
        let res;
        const isEditingSavedPayment = editingPayment && !String(editingPayment.id).startsWith("temp-");

        if (isEditingSavedPayment) {
          res = await axios.put(
            `${process.env.REACT_APP_NETWORK}/orders/${orderId}/payments/${editingPayment.id}`,
            paymentPayload,
            {
              headers: {
                Authorization: `Bearer ${localStorage.getItem("token")}`,
                skip_zrok_interstitial: "true",
              },
            }
          );
          toast.success(res.data?.message || `Payment updated successfully!`);
        } else {
          res = await axios.post(
            `${process.env.REACT_APP_NETWORK}/orders/${orderId}/payments`,
            paymentPayload,
            {
              headers: {
                Authorization: `Bearer ${localStorage.getItem("token")}`,
                skip_zrok_interstitial: "true",
              },
            }
          );
          const successText = paymentType === "RETURN"
            ? `Return payment of ${currency} ${Math.abs(amtNum).toLocaleString()} recorded!`
            : (res.data?.message || `Payment of ${currency} ${amtNum.toLocaleString()} cleared!`);
          toast.success(successText);
        }

        const savedPaymentId = res.data?.payment?.id;
        if (recordProofFile && savedPaymentId) {
          const formData = new FormData();
          formData.append("file", recordProofFile);
          formData.append("document_type", "payment_proof");
          formData.append("payment_id", savedPaymentId);
          try {
            await ordersApi.uploadDocument(formData);
            toast.success("Payment proof attached successfully!");
          } catch (docErr) {
            console.error("Failed to upload payment proof:", docErr);
            toast.warning("Payment recorded, but proof upload failed.");
          }
        }

        // Re-fetch authoritative payments list with documents
        let updatedList;
        try {
          const refreshed = await axios.get(`${process.env.REACT_APP_NETWORK}/orders/${orderId}/payments`, {
            headers: {
              Authorization: `Bearer ${localStorage.getItem("token")}`,
              skip_zrok_interstitial: "true",
            },
          });
          if (refreshed.data?.payments) {
            updatedList = refreshed.data.payments;
          }
        } catch {
          // fallback
        }

        const savedPayment = res.data?.payment || {
          id: editingPayment ? editingPayment.id : Date.now(),
          ...paymentPayload,
          status: paymentType === "RETURN" ? "RETURNED" : "PAID",
          created_at: new Date().toISOString(),
        };

        if (!updatedList) {
          updatedList = res.data?.payments || (
            editingPayment
              ? paymentsList.map((p) => (p.id === editingPayment.id ? savedPayment : p))
              : [savedPayment, ...paymentsList]
          );
        }
        setPaymentsList(updatedList);

        const newTotalPaid = res.data?.advance_amount !== undefined
          ? res.data.advance_amount
          : updatedList.reduce((acc, p) => acc + (parseFloat(p.amount) || 0), 0);

        const newBalance = res.data?.balance_amount !== undefined
          ? res.data.balance_amount
          : Math.max(0, effectiveTotal - newTotalPaid);

        const newStatus = res.data?.payment_status || (
          newBalance <= 0.01 && effectiveTotal > 0 ? "FULLY_PAID" : newTotalPaid > 0 ? "PART_PAID" : "NONE"
        );

        if (onPaymentSaved) {
          onPaymentSaved({
            advance_amount: newTotalPaid,
            balance_amount: newBalance,
            payment_status: newStatus,
            payment_date: savedPayment.paid_date || paymentDate,
            balance_payment_date: newBalance <= 0.01 ? (savedPayment.paid_date || balancePaymentDate) : balancePaymentDate,
            payments: updatedList,
          });
        }
      } else {
        // Staged local payment for unsaved new order
        if (editingPayment) {
          const updatedPayment = {
            ...editingPayment,
            ...paymentPayload,
            status: paymentType === "RETURN" ? "RETURNED" : "PAID",
          };
          const updatedList = paymentsList.map((p) => (p.id === editingPayment.id ? updatedPayment : p));
          setPaymentsList(updatedList);

          const newTotalPaid = updatedList.reduce((acc, p) => acc + (parseFloat(p.amount) || 0), 0);
          const newBalance = Math.max(0, effectiveTotal - newTotalPaid);
          const newStatus = newBalance <= 0.01 && effectiveTotal > 0 ? "FULLY_PAID" : newTotalPaid > 0 ? "PART_PAID" : "NONE";

          if (onPaymentSaved) {
            onPaymentSaved({
              advance_amount: newTotalPaid,
              balance_amount: newBalance,
              payment_status: newStatus,
              payment_date: updatedPayment.paid_date || paymentDate,
              balance_payment_date: newBalance <= 0.01 ? (updatedPayment.paid_date || balancePaymentDate) : balancePaymentDate,
              payments: updatedList,
            });
          }
          toast.success("Payment entry updated.");
        } else {
          const stagedPayment = {
            id: `temp-${Date.now()}`,
            ...paymentPayload,
            status: paymentType === "RETURN" ? "RETURNED" : "PAID",
            created_at: new Date().toISOString(),
          };

          const successText = paymentType === "RETURN"
            ? `Return payment of ${currency} ${Math.abs(amtNum).toLocaleString()} staged.`
            : `Payment of ${currency} ${amtNum.toLocaleString()} staged.`;
          toast.success(successText);

          const updatedList = [stagedPayment, ...paymentsList];
          setPaymentsList(updatedList);

          const newTotalPaid = updatedList.reduce((acc, p) => acc + (parseFloat(p.amount) || 0), 0);
          const newBalance = Math.max(0, effectiveTotal - newTotalPaid);
          const newStatus = newBalance <= 0.01 && effectiveTotal > 0 ? "FULLY_PAID" : newTotalPaid > 0 ? "PART_PAID" : "NONE";

          if (onPaymentSaved) {
            onPaymentSaved({
              advance_amount: newTotalPaid,
              balance_amount: newBalance,
              payment_status: newStatus,
              payment_date: stagedPayment.paid_date || paymentDate,
              balance_payment_date: newBalance <= 0.01 ? (stagedPayment.paid_date || balancePaymentDate) : balancePaymentDate,
              payments: updatedList,
            });
          }
        }
      }

      // Close sub-modal and reset form
      setAmount("");
      setReferenceNumber("");
      setNotes("");
      setEditingPayment(null);
      setShowRecordModal(false);
    } catch (err) {
      console.error("Failed to record payment:", err);
      setErrorMsg(err.response?.data?.detail || "Failed to record payment. Please check financial authorization.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Delete payment handler
  const handleDeletePayment = async (paymentId) => {
    if (!window.confirm("Are you sure you want to void / delete this payment record?")) {
      return;
    }

    setIsDeletingId(paymentId);
    try {
      if (orderId && !String(paymentId).startsWith("temp-")) {
        const res = await axios.delete(
          `${process.env.REACT_APP_NETWORK}/orders/${orderId}/payments/${paymentId}`,
          {
            headers: {
              Authorization: `Bearer ${localStorage.getItem("token")}`,
              skip_zrok_interstitial: "true",
            },
          }
        );
        toast.success(res.data?.message || "Payment deleted successfully");

        const updatedList = res.data?.remaining_payments || paymentsList.filter((p) => String(p.id) !== String(paymentId));
        setPaymentsList(updatedList);

        const newTotalPaid = res.data?.advance_amount !== undefined
          ? res.data.advance_amount
          : updatedList.reduce((acc, p) => acc + (parseFloat(p.amount) || 0), 0);

        const newBalance = res.data?.balance_amount !== undefined
          ? res.data.balance_amount
          : Math.max(0, effectiveTotal - newTotalPaid);

        const newStatus = res.data?.payment_status || (
          newBalance <= 0.01 && effectiveTotal > 0 ? "FULLY_PAID" : newTotalPaid > 0 ? "PART_PAID" : "NONE"
        );

        if (onPaymentSaved) {
          onPaymentSaved({
            advance_amount: newTotalPaid,
            balance_amount: newBalance,
            payment_status: newStatus,
            payments: updatedList,
          });
        }
      } else {
        // Local staged payment removal
        const updatedList = paymentsList.filter((p) => String(p.id) !== String(paymentId));
        setPaymentsList(updatedList);
        const newTotalPaid = updatedList.reduce((acc, p) => acc + (parseFloat(p.amount) || 0), 0);
        const newBalance = Math.max(0, effectiveTotal - newTotalPaid);
        const newStatus = newBalance <= 0.01 && effectiveTotal > 0 ? "FULLY_PAID" : newTotalPaid > 0 ? "PART_PAID" : "NONE";

        toast.success("Payment entry removed");
        if (onPaymentSaved) {
          onPaymentSaved({
            advance_amount: newTotalPaid,
            balance_amount: newBalance,
            payment_status: newStatus,
            payments: updatedList,
          });
        }
      }
    } catch (err) {
      console.error("Failed to delete payment:", err);
      toast.error(err.response?.data?.detail || "Failed to delete payment record");
    } finally {
      setIsDeletingId(null);
    }
  };

  if (!isOpen) return null;

  return (
    <>
      {/* ── MASTER MODAL: PAYMENT CLEARANCE & FINANCIAL LEDGER ─────────── */}
      <div
        className="fixed inset-0 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150"
        style={{ zIndex: 1000 }}
      >
        <div
          className={`w-full max-w-3xl rounded-2xl border shadow-2xl flex flex-col max-h-[92vh] animate-in zoom-in-95 duration-150 ${
            isDark
              ? "bg-slate-900 border-slate-800 text-white"
              : "bg-white border-slate-200 text-slate-900"
          }`}
          style={{ zIndex: 1001 }}
        >
          {/* Header */}
          <div className="p-4 sm:p-5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between flex-none">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                <CreditCard size={22} />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-base sm:text-lg font-black tracking-tight">
                    Payment Clearance & Financial Ledger
                  </h3>
                  <span
                    className={`text-[10px] font-extrabold uppercase px-2.5 py-0.5 rounded-full border ${
                      currentPaymentStatus === "FULLY_PAID"
                        ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20"
                        : currentPaymentStatus === "PART_PAID"
                        ? "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20"
                        : "bg-slate-500/10 text-slate-500 border-slate-500/20"
                    }`}
                  >
                    {currentPaymentStatus === "FULLY_PAID"
                      ? "Fully Paid"
                      : currentPaymentStatus === "PART_PAID"
                      ? "Part Paid"
                      : "Unpaid"}
                  </span>
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  {poNumber ? `PO: ${poNumber}` : "Draft Order"} • {supplierName || "Supplier Pending"} • Currency: {currency}
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
            >
              <X size={18} />
            </button>
          </div>

          {/* Scrollable Modal Content */}
          <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-5 scrollbar-thin">
            {/* Auto-Calculated Financial Summary Banner */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {/* Total Order Amount */}
              <div
                className={`p-3.5 rounded-xl border ${
                  isDark ? "bg-slate-800/60 border-slate-700" : "bg-slate-50 border-slate-200"
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                    Total Order Value
                  </span>
                  <span className="text-[9px] px-1.5 py-0.2 rounded font-bold bg-blue-500/10 text-blue-500">
                    Auto Subtotal
                  </span>
                </div>
                <div className="text-xl font-black font-mono tracking-tight">
                  <CurrencyDisplay amount={effectiveTotal} currency={currency} symbol={activeSymbol} />
                </div>
              </div>

              {/* Total Cleared / Paid */}
              <div
                className={`p-3.5 rounded-xl border ${
                  isDark ? "bg-emerald-950/20 border-emerald-900/40" : "bg-emerald-50/60 border-emerald-200"
                }`}
              >
                <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider block mb-1">
                  Total Cleared (Paid)
                </span>
                <div className="text-xl font-black font-mono tracking-tight text-emerald-600 dark:text-emerald-400">
                  <CurrencyDisplay amount={totalPaid} currency={currency} symbol={activeSymbol} />
                </div>
              </div>

              {/* Outstanding Balance Due */}
              <div
                className={`p-3.5 rounded-xl border ${
                  currentBalance > 0.01
                    ? isDark
                      ? "bg-amber-950/20 border-amber-900/40 text-amber-500"
                      : "bg-amber-50/60 border-amber-200 text-amber-700"
                    : isDark
                    ? "bg-slate-800/40 border-slate-700 text-slate-400"
                    : "bg-slate-50 border-slate-200 text-slate-600"
                }`}
              >
                <span className="text-[10px] font-bold uppercase tracking-wider block mb-1 opacity-70">
                  Remaining Due
                </span>
                <div className="text-xl font-black font-mono tracking-tight">
                  <CurrencyDisplay amount={currentBalance} currency={currency} symbol={activeSymbol} />
                </div>
              </div>
            </div>

            {/* Payment Progress Bar */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xs font-bold">
                <span className="text-slate-500 dark:text-slate-400">Payment Clearance Progress</span>
                <span className="font-mono text-blue-600 dark:text-blue-400">{percentPaid}% Cleared</span>
              </div>
              <div className="w-full h-2 rounded-full bg-slate-200 dark:bg-slate-800 overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-300 ${
                    percentPaid >= 100
                      ? "bg-emerald-500"
                      : percentPaid >= 50
                      ? "bg-blue-600"
                      : "bg-amber-500"
                  }`}
                  style={{ width: `${percentPaid}%` }}
                />
              </div>
            </div>

            {/* Action Bar with ONLY ONE BUTTON: Record Payment */}
            <div className="flex items-center justify-between gap-3 pt-2">
              <div className="flex items-center gap-2">
                <Receipt className="w-4 h-4 text-slate-400" />
                <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                  Payment History & Ledger ({paymentsList.length})
                </span>
              </div>

              {/* ONLY ONE BUTTON: Record Payment */}
              <button
                type="button"
                onClick={handleOpenRecordModal}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white font-bold text-xs rounded-xl transition shadow-xs flex items-center gap-1.5"
              >
                <Plus size={14} />
                <span>Record Payment</span>
              </button>
            </div>

            {/* Multiple Payments Financial Ledger Table */}
            {paymentsList.length === 0 ? (
              <div
                className={`p-8 rounded-2xl border border-dashed text-center space-y-2 ${
                  isDark ? "border-slate-800 bg-slate-900/40" : "border-slate-200 bg-slate-50/50"
                }`}
              >
                <div className="w-12 h-12 rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-400 flex items-center justify-center mx-auto">
                  <CreditCard size={24} />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-slate-700 dark:text-slate-300">
                    No Payments Cleared Yet
                  </h4>
                  <p className="text-xs text-slate-400 max-w-sm mx-auto mt-1">
                    No payments logged yet. Click &quot;Record Payment&quot; above to log a payment against the outstanding balance of {currency} {effectiveTotal.toFixed(2)}.
                  </p>
                </div>
              </div>
            ) : (
              <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800 shadow-2xs">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr
                      className={`text-[10px] font-bold uppercase tracking-wider border-b ${
                        isDark ? "bg-slate-950/60 border-slate-800 text-slate-400" : "bg-slate-50 border-slate-200 text-slate-500"
                      }`}
                    >
                      <th className="py-2.5 px-3">Date</th>
                      <th className="py-2.5 px-3">Type</th>
                      <th className="py-2.5 px-3">Payment Method</th>
                      <th className="py-2.5 px-3">Reference #</th>
                      <th className="py-2.5 px-3">Notes</th>
                      <th className="py-2.5 px-3 text-right">Amount</th>
                      <th className="py-2.5 px-3 text-center">Status</th>
                      <th className="py-2.5 px-3 text-center">Proof / Attachment</th>
                      {isAccountsOrAdmin && <th className="py-2.5 px-3 text-center">Action</th>}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200/50 dark:divide-slate-800">
                    {paymentsList.map((p, idx) => {
                      const isReturn = p.payment_type === "RETURN" || parseFloat(p.amount) < 0;
                      const amtVal = parseFloat(p.amount || 0);

                      return (
                        <tr
                          key={p.id || idx}
                          className={
                            isReturn
                              ? isDark ? "bg-rose-950/20 hover:bg-rose-950/30" : "bg-rose-50/50 hover:bg-rose-50/80"
                              : isDark ? "hover:bg-slate-800/40" : "hover:bg-slate-50"
                          }
                        >
                          <td className="py-2.5 px-3 font-mono text-[11px] whitespace-nowrap">
                            {p.paid_date ? p.paid_date.slice(0, 10) : "—"}
                          </td>
                          <td className="py-2.5 px-3 font-bold text-[11px]">
                            <span
                              className={`px-2 py-0.5 rounded-full text-[9px] font-bold border ${
                                isReturn
                                  ? "bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20"
                                  : p.payment_type === "ADVANCE"
                                  ? "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20"
                                  : p.payment_type === "BALANCE"
                                  ? "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20"
                                  : p.payment_type === "FULL"
                                  ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20"
                                  : "bg-slate-500/10 text-slate-600 dark:text-slate-400 border-slate-500/20"
                              }`}
                            >
                              {isReturn ? "↩️ RETURN PAYMENT" : (p.payment_type || "PAYMENT")}
                            </span>
                          </td>
                          <td className="py-2.5 px-3 text-slate-600 dark:text-slate-300 text-[11px]">
                            {p.payment_method || "Direct Transfer"}
                          </td>
                          <td className="py-2.5 px-3 font-mono text-[11px] text-slate-500">
                            {p.reference_number || "—"}
                          </td>
                          <td className="py-2.5 px-3 text-slate-500 dark:text-slate-400 text-[11px] max-w-[150px] truncate">
                            {p.notes || "—"}
                          </td>
                          <td className={`py-2.5 px-3 text-right font-mono font-black text-[12px] whitespace-nowrap ${
                            isReturn
                              ? "text-rose-600 dark:text-rose-400"
                              : "text-emerald-600 dark:text-emerald-400"
                          }`}>
                            {isReturn ? "- " : ""}{p.currency || currency} {Math.abs(amtVal).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </td>
                          <td className="py-2.5 px-3 text-center">
                            <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold border ${
                              isReturn
                                ? "bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20"
                                : "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20"
                            }`}>
                              {isReturn ? "RETURNED" : (p.status || "CLEARED")}
                            </span>
                          </td>
                          {/* Proof / Attachment Column */}
                          <td className="py-2.5 px-3 text-center">
                            {(() => {
                              const proofDoc = p.evidence_doc || (p.documents && p.documents.length > 0 ? p.documents[0] : null);
                              const isUploading = uploadingProofId === p.id;

                              if (isUploading) {
                                return (
                                  <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded-lg text-[10px] font-bold bg-blue-500/10 text-blue-600 dark:text-blue-400">
                                    <Loader2 size={12} className="animate-spin" />
                                    <span>Uploading...</span>
                                  </span>
                                );
                              }

                              if (proofDoc) {
                                return (
                                  <div className="inline-flex items-center justify-center gap-1.5">
                                    <button
                                      type="button"
                                      onClick={() => handleDownloadProof(proofDoc.id, proofDoc.file_name || proofDoc.title)}
                                      className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-lg text-[10px] font-bold bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30 transition shadow-2xs group"
                                      title={`Download ${proofDoc.file_name || "Payment Proof"}`}
                                    >
                                      <Paperclip size={11} className="group-hover:scale-110 transition-transform text-emerald-600 dark:text-emerald-400" />
                                      <span className="max-w-[90px] truncate">{proofDoc.file_name || "Proof"}</span>
                                      <Download size={10} className="opacity-60" />
                                    </button>
                                    {isAccountsOrAdmin && (
                                      <label
                                        className="p-1 rounded-md text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer transition"
                                        title="Replace proof"
                                      >
                                        <FileUp size={12} />
                                        <input
                                          type="file"
                                          className="hidden"
                                          accept=".pdf,.png,.jpg,.jpeg,.doc,.docx"
                                          onChange={(e) => {
                                            if (e.target.files?.[0]) {
                                              handleRowProofUpload(p.id, e.target.files[0]);
                                            }
                                          }}
                                        />
                                      </label>
                                    )}
                                  </div>
                                );
                              }

                              if (isAccountsOrAdmin && !isReturn) {
                                return (
                                  <label className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[10px] font-bold text-slate-500 hover:text-emerald-600 dark:hover:text-emerald-400 border border-dashed border-slate-300 dark:border-slate-700 hover:border-emerald-500/50 bg-slate-50/50 dark:bg-slate-800/30 hover:bg-emerald-50/20 cursor-pointer transition">
                                    <Paperclip size={10} />
                                    <span>+ Attach Proof</span>
                                    <input
                                      type="file"
                                      className="hidden"
                                      accept=".pdf,.png,.jpg,.jpeg,.doc,.docx"
                                      onChange={(e) => {
                                        if (e.target.files?.[0]) {
                                          handleRowProofUpload(p.id, e.target.files[0]);
                                        }
                                      }}
                                    />
                                  </label>
                                );
                              }

                              return <span className="text-[11px] text-slate-400">—</span>;
                            })()}
                          </td>
                          {isAccountsOrAdmin && (
                            <td className="py-2.5 px-3 text-center">
                              <div className="flex items-center justify-center gap-1.5">
                                <button
                                  type="button"
                                  onClick={() => handleOpenEditModal(p)}
                                  className="p-1 text-slate-400 hover:text-blue-500 rounded-md transition"
                                  title="Edit Payment Entry"
                                >
                                  <Edit3 size={13} />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleDeletePayment(p.id)}
                                  disabled={isDeletingId === p.id}
                                  className="p-1 text-slate-400 hover:text-red-500 rounded-md transition disabled:opacity-50"
                                  title="Delete / Void Payment"
                                >
                                  {isDeletingId === p.id ? (
                                    <Loader2 size={13} className="animate-spin text-red-500" />
                                  ) : (
                                    <Trash2 size={13} />
                                  )}
                                </button>
                              </div>
                            </td>
                          )}
                        </tr>
                      );
                    })}
                  </tbody>
                  <tfoot>
                    <tr
                      className={`border-t font-bold ${
                        isDark ? "bg-slate-950/80 border-slate-800" : "bg-slate-50 border-slate-200"
                      }`}
                    >
                      <td colSpan={5} className="py-2 px-3 text-right text-slate-400 text-[11px]">
                        Total Cleared Payments:
                      </td>
                      <td className="py-2 px-3 text-right font-mono text-xs text-emerald-600 dark:text-emerald-400 font-black">
                        {currency} {totalPaid.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                      </td>
                      <td colSpan={isAccountsOrAdmin ? 3 : 2}></td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="p-3.5 sm:p-4 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between flex-none">
            <div className="text-xs text-slate-500 dark:text-slate-400">
              {percentPaid >= 100 ? (
                <span className="text-emerald-600 dark:text-emerald-400 font-bold flex items-center gap-1">
                  <Check size={14} /> Order fully settled
                </span>
              ) : (
                <span>
                  Outstanding: <strong className="font-mono">{currency} {currentBalance.toFixed(2)}</strong>
                </span>
              )}
            </div>

            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2 bg-blue-600 hover:bg-blue-700 active:scale-95 text-white font-bold rounded-xl text-xs transition shadow-xs"
            >
              Done & Return
            </button>
          </div>
        </div>
      </div>

      {/* ── POPUP OVER THE POPUP: RECORD PAYMENT ENTRY (MANUAL ENTRY ONLY) ── */}
      {showRecordModal && (
        <div
          className="fixed inset-0 flex items-center justify-center p-4 bg-black/75 animate-in fade-in duration-150"
          style={{ zIndex: 9999 }}
        >
          <div
            className={`w-full max-w-lg rounded-2xl border shadow-2xl flex flex-col max-h-[92vh] animate-in zoom-in-95 duration-150 ${
              isDark ? "bg-slate-900 border-slate-800 text-white" : "bg-white border-slate-200 text-slate-900"
            }`}
            style={{ zIndex: 10000 }}
          >
            {/* Header */}
            <div className="p-4 sm:p-5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between flex-none">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                  <CreditCard size={18} />
                </div>
                <div>
                  <h3 className="text-sm sm:text-base font-bold tracking-tight">
                    {editingPayment ? "Edit Payment Entry" : "Record Payment Entry"}
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    {poNumber ? `Order: ${poNumber}` : "Purchase Order"} • {editingPayment ? `Editing Payment #${editingPayment.id}` : "Manual Entry"}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setShowRecordModal(false);
                  setEditingPayment(null);
                }}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
              >
                <X size={16} />
              </button>
            </div>

            {/* Form Body (Manual Input Only - No Quick Presets) */}
            <form onSubmit={handleSubmitPayment} className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4">
              {/* Outstanding Due Snapshot Banner */}
              <div
                className={`p-3 rounded-xl border flex items-center justify-between text-xs ${
                  isDark ? "bg-slate-800/60 border-slate-700" : "bg-slate-50 border-slate-200"
                }`}
              >
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Total PO Value</span>
                  <span className="font-mono font-bold text-slate-700 dark:text-slate-300">
                    {currency} {effectiveTotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                    {editingPayment ? "Other Cleared" : "Already Cleared"}
                  </span>
                  <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400">
                    {currency} {(editingPayment ? basePaidForValidation : totalPaid).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                  </span>
                </div>
                <div className="text-right">
                  <span className="text-[10px] font-bold text-amber-500 uppercase tracking-wider block">
                    {editingPayment ? "Max Available" : "Remaining Due"}
                  </span>
                  <span className="font-mono font-bold text-amber-600 dark:text-amber-400 text-sm">
                    {currency} {(editingPayment ? balanceForValidation : currentBalance).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                  </span>
                </div>
              </div>

              {/* Error Message */}
              {errorMsg && (
                <div className="p-2.5 rounded-xl bg-red-500/10 border border-red-500/20 text-red-500 text-xs flex items-center gap-2">
                  <AlertCircle size={14} className="flex-none" />
                  <span>{errorMsg}</span>
                </div>
              )}

              {/* Manual Input Fields */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* Payment Type */}
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                    Payment Type *
                  </label>
                  <select
                    value={paymentType}
                    onChange={(e) => {
                      setPaymentType(e.target.value);
                      setErrorMsg("");
                    }}
                    className={`w-full px-2.5 py-2 border rounded-lg text-xs font-bold focus:outline-none focus:ring-2 focus:ring-emerald-500 ${
                      isDark ? "bg-slate-800 border-slate-700 text-white" : "bg-white border-slate-300 text-slate-900"
                    }`}
                  >
                    <option value="ADVANCE">Advance Deposit</option>
                    <option value="PROGRESS">Progress / Milestone</option>
                    <option value="BALANCE">Balance Settlement</option>
                    <option value="FULL">Full Payment (100%)</option>
                    <option value="RETURN">↩️ Return Payment / Refund</option>
                  </select>
                </div>

                {/* Amount (Manual Input with Currency formatting on blur, number on edit) */}
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                    {paymentType === "RETURN" ? `Return / Refund Amount (${activeSymbol}) *` : `Payment Amount (${activeSymbol}) *`}
                  </label>
                  <CurrencyInput
                    currency={currency}
                    symbol={activeSymbol}
                    placeholder={paymentType === "RETURN" ? "-500.00" : "0.00"}
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    allowNegative={paymentType === "RETURN"}
                    autoFocus
                    className={`w-full px-2.5 py-2 border rounded-lg text-xs font-mono font-black focus:outline-none focus:ring-2 focus:ring-emerald-500 ${
                      paymentType === "RETURN"
                        ? "text-rose-600 dark:text-rose-400 bg-rose-50/20 border-rose-300 dark:border-rose-800"
                        : isDark ? "bg-slate-800 border-slate-700 text-white placeholder-slate-500" : "bg-white border-slate-300 text-slate-900 placeholder-slate-400"
                    }`}
                  />
                </div>

                {/* Informative Banner for Return Payment */}
                {paymentType === "RETURN" && (
                  <div className="sm:col-span-2 p-2.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-400 text-xs flex items-center gap-2">
                    <AlertCircle size={14} className="flex-none" />
                    <span>
                      <strong>Return Payment:</strong> A negative amount represents a refund / return payment. This will deduct from cleared payments and increase the remaining due. Negative amount is only acceptable for this type.
                    </span>
                  </div>
                )}

                {/* Overpayment Warning & Restriction Box */}
                {isOverpayment && (
                  <div className="sm:col-span-2 p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-700 dark:text-amber-400 text-xs space-y-1.5 animate-in fade-in duration-150">
                    <div className="flex items-center gap-2 font-bold">
                      <AlertTriangle size={15} className="text-amber-600 dark:text-amber-400 flex-none" />
                      <span>Overpayment Warning: Amount exceeds remaining order balance!</span>
                    </div>
                    <p className="text-[11px] leading-relaxed">
                      The entered amount of <strong>{currency} {rawAmtNum.toFixed(2)}</strong> exceeds the remaining balance of <strong>{currency} {(editingPayment ? balanceForValidation : currentBalance).toFixed(2)}</strong> by <strong>{currency} {(rawAmtNum - (editingPayment ? balanceForValidation : currentBalance)).toFixed(2)}</strong>.
                    </p>
                    <label className="flex items-center gap-2 mt-2 pt-2 border-t border-amber-500/20 cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={allowOverpayment}
                        onChange={(e) => {
                          setAllowOverpayment(e.target.checked);
                          setErrorMsg("");
                        }}
                        className="w-4 h-4 rounded text-amber-600 focus:ring-amber-500 cursor-pointer"
                      />
                      <span className="font-bold text-[11px] text-amber-800 dark:text-amber-300">
                        Authorize Overpayment (Acknowledge and override restriction)
                      </span>
                    </label>
                  </div>
                )}

                {/* Excess Refund Error Box */}
                {isExcessRefund && (
                  <div className="sm:col-span-2 p-2.5 rounded-xl bg-red-500/10 border border-red-500/30 text-red-600 dark:text-rose-400 text-xs flex items-center gap-2 animate-in fade-in duration-150">
                    <AlertCircle size={14} className="flex-none" />
                    <span>
                      <strong>Excess Refund Error:</strong> Return amount ({currency} {Math.abs(rawAmtNum).toFixed(2)}) cannot exceed total cleared payments ({currency} {(editingPayment ? basePaidForValidation : totalPaid).toFixed(2)}).
                    </span>
                  </div>
                )}

                {/* Clearance Date */}
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                    Clearance Date *
                  </label>
                  <input
                    type="date"
                    value={paidDate}
                    onChange={(e) => setPaidDate(e.target.value)}
                    className={`w-full px-2.5 py-2 border rounded-lg text-xs font-mono focus:outline-none focus:ring-2 focus:ring-emerald-500 ${
                      isDark ? "bg-slate-800 border-slate-700 text-white" : "bg-white border-slate-300 text-slate-900"
                    }`}
                  />
                </div>

                {/* Payment Method */}
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                    Payment Method
                  </label>
                  <select
                    value={paymentMethod}
                    onChange={(e) => setPaymentMethod(e.target.value)}
                    className={`w-full px-2.5 py-2 border rounded-lg text-xs font-medium focus:outline-none focus:ring-2 focus:ring-emerald-500 ${
                      isDark ? "bg-slate-800 border-slate-700 text-white" : "bg-white border-slate-300 text-slate-900"
                    }`}
                  >
                    <option value="Bank Transfer (TT)">Bank Wire / TT</option>
                    <option value="Cheque">Cheque</option>
                    <option value="Cash">Cash</option>
                    <option value="Letter of Credit (LC)">Letter of Credit (LC)</option>
                    <option value="Credit Card">Corporate Card</option>
                  </select>
                </div>

                {/* Reference Number */}
                <div className="sm:col-span-2">
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                    Reference / Cheque # / Trx ID
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. TT-2026-9481 or CHQ-00129"
                    value={referenceNumber}
                    onChange={(e) => setReferenceNumber(e.target.value)}
                    className={`w-full px-2.5 py-2 border rounded-lg text-xs font-mono focus:outline-none focus:ring-2 focus:ring-emerald-500 ${
                      isDark ? "bg-slate-800 border-slate-700 text-white placeholder-slate-500" : "bg-white border-slate-300 text-slate-900 placeholder-slate-400"
                    }`}
                  />
                </div>

                {/* Notes */}
                <div className="sm:col-span-2">
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                    Transaction Notes / Remarks
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Cleared via MCB Corporate Account"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    className={`w-full px-2.5 py-2 border rounded-lg text-xs font-medium focus:outline-none focus:ring-2 focus:ring-emerald-500 ${
                      isDark ? "bg-slate-800 border-slate-700 text-white placeholder-slate-500" : "bg-white border-slate-300 text-slate-900 placeholder-slate-400"
                    }`}
                  />
                </div>

                {/* Payment Proof / Swift Slip Attachment Dropzone */}
                {!editingPayment && (
                  <div className="sm:col-span-2">
                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                      Payment Proof / Swift Slip (Optional)
                    </label>
                    {recordProofFile ? (
                      <div className={`p-2.5 rounded-xl border flex items-center justify-between text-xs ${
                        isDark ? "bg-slate-800 border-slate-700" : "bg-slate-50 border-slate-200"
                      }`}>
                        <div className="flex items-center gap-2 truncate">
                          <Paperclip size={14} className="text-emerald-500 flex-none" />
                          <span className="font-medium text-slate-700 dark:text-slate-200 truncate">{recordProofFile.name}</span>
                          <span className="text-[10px] text-slate-400 font-mono">
                            ({(recordProofFile.size / 1024).toFixed(1)} KB)
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={() => setRecordProofFile(null)}
                          className="p-1 text-slate-400 hover:text-rose-500 rounded-md transition"
                          title="Remove file"
                        >
                          <X size={14} />
                        </button>
                      </div>
                    ) : (
                      <label className={`flex flex-col items-center justify-center p-3 rounded-xl border border-dashed cursor-pointer transition ${
                        isDark ? "border-slate-700 hover:border-emerald-500 bg-slate-800/40 hover:bg-slate-800/80" : "border-slate-300 hover:border-emerald-500 bg-slate-50/50 hover:bg-emerald-50/20"
                      }`}>
                        <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400">
                          <FileUp size={15} className="text-emerald-500" />
                          <span className="text-xs font-semibold">Click to attach Bank Transfer Swift slip / TT slip</span>
                        </div>
                        <span className="text-[10px] text-slate-400 mt-0.5">PDF, PNG, JPG up to 10MB</span>
                        <input
                          type="file"
                          className="hidden"
                          accept=".pdf,.png,.jpg,.jpeg,.doc,.docx"
                          onChange={(e) => {
                            if (e.target.files?.[0]) {
                              setRecordProofFile(e.target.files[0]);
                            }
                          }}
                        />
                      </label>
                    )}
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div className="pt-3 border-t border-slate-200 dark:border-slate-800 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowRecordModal(false);
                    setEditingPayment(null);
                  }}
                  className="px-4 py-2 rounded-xl border border-slate-300 dark:border-slate-700 font-bold text-xs text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white font-bold rounded-xl text-xs transition shadow-xs flex items-center gap-1.5 disabled:opacity-50"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 size={13} className="animate-spin" />
                      <span>{editingPayment ? "Updating Payment..." : "Saving Payment..."}</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle2 size={14} />
                      <span>{editingPayment ? "Update Payment Record" : "Clear & Record Payment"}</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
