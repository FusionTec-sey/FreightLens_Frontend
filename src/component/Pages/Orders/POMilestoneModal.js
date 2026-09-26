import React from "react";
import {
  X,
  Calendar,
  Clock,
  CheckCircle2,
  Truck,
  FileText,
  Ship,
  Send,
  Check,
  CreditCard,
  Sparkles
} from "lucide-react";
import { useTheme } from "../../../context/ThemeContext";

export default function POMilestoneModal({
  isOpen,
  onClose,
  formData,
  onChange,
  activeStageKey = "DRAFT",
  isAccountsOrAdmin = false,
}) {
  const { isDark } = useTheme();

  if (!isOpen) return null;

  const isRFQ = formData.doc_type === "RFQ";
  const stage = (activeStageKey || formData.status || formData.lifecycle_stage || "").toUpperCase();

  const handleAutoFillForStage = () => {
    const today = new Date().toISOString().split("T")[0];
    const stageUpper = stage.toUpperCase();
    if (["DRAFT", "CONFIRMED", "RFQ_SENT", "SOURCING", "QUOTE_RECEIVED", "QUOTE_APPROVED", "PO_ISSUED", "ORDERED"].includes(stageUpper) && !formData.order_mail_date) {
      onChange("order_mail_date", today);
    }
    if (["RFQ_SENT", "SOURCING", "QUOTE_RECEIVED", "QUOTE_APPROVED", "PO_ISSUED", "ORDERED"].includes(stageUpper) && !formData.quote_sent_date) {
      onChange("quote_sent_date", today);
    }
    if (["QUOTE_RECEIVED", "QUOTE_APPROVED", "PO_ISSUED", "ORDERED"].includes(stageUpper) && !formData.quote_received_date) {
      onChange("quote_received_date", today);
    }
    if (["QUOTE_APPROVED", "PO_ISSUED", "ORDERED"].includes(stageUpper) && !formData.pi_confirmed_date) {
      onChange("pi_confirmed_date", today);
    }
    if (["PART_PAID", "PAID"].includes(stageUpper) && !formData.payment_date) {
      onChange("payment_date", today);
    }
    if (["PAID"].includes(stageUpper) && !formData.balance_payment_date) {
      onChange("balance_payment_date", today);
    }
    // Note: eta_date is not auto-updated here; shipping schedule is determined manually or via BL/vessel tracking
  };

  const isPaymentStage = !isRFQ && (
    ["ORDERED", "PO_ISSUED", "PART_PAID", "PAID", "IN_PRODUCTION", "READY", "PACKED", "SHIPPED", "ARRIVED", "RECEIVED", "COMPLETED"].includes(stage) ||
    Boolean(formData.payment_date) ||
    Boolean(formData.balance_payment_date) ||
    (Array.isArray(formData.payments) && formData.payments.length > 0)
  );

  // Determine completion/active state for each milestone
  const milestones = [
    {
      id: "order_mail_date",
      label: isRFQ ? "RFQ Request Date" : "Request Date",
      description: "When the requisition or procurement request was authored",
      value: formData.order_mail_date || "",
      icon: Send,
      isRelevant: ["DRAFT", "CONFIRMED", "PENDING"].includes(activeStageKey?.toUpperCase()),
    },
    {
      id: "quote_sent_date",
      label: "Asked for Quote (RFQ Sent)",
      description: "When RFQ inquiry was dispatched to vendor(s)",
      value: formData.quote_sent_date || "",
      icon: Clock,
      isRelevant: ["RFQ_SENT", "SOURCING"].includes(activeStageKey?.toUpperCase()),
    },
    {
      id: "quote_received_date",
      label: "Received Quote",
      description: "When supplier pricing and availability response arrived",
      value: formData.quote_received_date || "",
      icon: FileText,
      isRelevant: ["QUOTE_RECEIVED"].includes(activeStageKey?.toUpperCase()),
    },
    {
      id: "pi_confirmed_date",
      label: "Confirm-Quote / PI Date",
      description: "When proforma invoice or official quote was confirmed",
      value: formData.pi_confirmed_date || "",
      icon: CheckCircle2,
      isRelevant: ["QUOTE_APPROVED", "PO_ISSUED", "ORDERED"].includes(activeStageKey?.toUpperCase()),
    },
    {
      id: "payment_date",
      label: "Advance Payment Date",
      description: "When initial deposit or advance was cleared",
      value: formData.payment_date || "",
      icon: CreditCard,
      isRelevant: ["PART_PAID"].includes(activeStageKey?.toUpperCase()),
      accountsOnly: true,
      paymentOnly: true,
    },
    {
      id: "balance_payment_date",
      label: "Balance Payment Date",
      description: "When final balance was disbursed to vendor",
      value: formData.balance_payment_date || "",
      icon: CreditCard,
      isRelevant: ["PAID"].includes(activeStageKey?.toUpperCase()),
      accountsOnly: true,
      paymentOnly: true,
    },
    {
      id: "eta_date",
      label: "Estimated Arrival (ETA)",
      description: "Target destination port / warehouse delivery date",
      value: formData.eta_date || "",
      icon: Ship,
      isRelevant: ["IN_PRODUCTION", "READY", "SHIPPED", "ARRIVED"].includes(activeStageKey?.toUpperCase()),
      hideOnRFQ: true,
    },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div
        className={`w-full max-w-2xl rounded-2xl border shadow-2xl flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-150 ${
          isDark
            ? "bg-slate-900 border-slate-800 text-white"
            : "bg-white border-slate-200 text-slate-900"
        }`}
      >
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between flex-none">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-purple-500/10 text-purple-600 dark:text-purple-400">
              <Calendar size={18} />
            </div>
            <div>
              <h3 className="text-sm sm:text-base font-black tracking-tight">
                {isRFQ ? "Sourcing Timeline & Milestones" : "Purchasing Timeline & Milestone Dates"}
              </h3>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                {isRFQ ? "Track RFQ quotation and award dates" : "Manage all lifecycle milestone dates and logistics handling parameters"}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleAutoFillForStage}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-purple-300 dark:border-purple-800 bg-purple-50 dark:bg-purple-950/40 text-purple-700 dark:text-purple-300 text-xs font-bold hover:bg-purple-100 dark:hover:bg-purple-900/60 active:scale-95 transition shadow-xs"
              title="Automatically fill dates up to current stage using today's date"
            >
              <Sparkles size={13} className="text-purple-600 dark:text-purple-400" />
              <span>Auto-fill Stage Dates</span>
            </button>

            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Scrollable Milestone Content */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4 scrollbar-thin">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            {milestones.map((m) => {
              if (m.accountsOnly && !isAccountsOrAdmin) return null;
              if (m.paymentOnly && !isPaymentStage) return null;
              if (m.hideOnRFQ && isRFQ) return null;
              const IconComponent = m.icon;
              const hasVal = Boolean(m.value);

              return (
                <div
                  key={m.id}
                  className={`p-3 rounded-xl border transition ${
                    m.isRelevant
                      ? isDark
                        ? "bg-purple-950/20 border-purple-800/60 ring-1 ring-purple-500/30"
                        : "bg-purple-50/50 border-purple-200 ring-1 ring-purple-500/20"
                      : isDark
                      ? "bg-slate-800/40 border-slate-800"
                      : "bg-slate-50/60 border-slate-200"
                  }`}
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <div className="flex items-center gap-1.5">
                      <IconComponent
                        size={14}
                        className={
                          m.isRelevant
                            ? "text-purple-500"
                            : hasVal
                            ? "text-emerald-500"
                            : "text-slate-400"
                        }
                      />
                      <label className="text-[11px] font-bold">
                        {m.label}
                      </label>
                    </div>

                    <div className="flex items-center gap-1.5">
                      {m.isRelevant && (
                        <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-purple-500 text-white uppercase tracking-wider">
                          Current Stage
                        </span>
                      )}
                      {!m.isRelevant && hasVal && (
                        <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center gap-0.5">
                          <Check size={10} /> Set
                        </span>
                      )}
                      {!hasVal ? (
                        <button
                          type="button"
                          onClick={() => onChange(m.id, new Date().toISOString().split("T")[0])}
                          className="px-1.5 py-0.5 rounded text-[10px] font-bold text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 bg-blue-50 dark:bg-blue-950/50 hover:bg-blue-100 dark:hover:bg-blue-900/60 transition"
                          title="Set date to Today"
                        >
                          Today
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => onChange(m.id, "")}
                          className="px-1.5 py-0.5 rounded text-[10px] text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition"
                          title="Clear date"
                        >
                          Clear
                        </button>
                      )}
                    </div>
                  </div>

                  <input
                    type="date"
                    value={m.value}
                    onChange={(e) => onChange(m.id, e.target.value)}
                    className={`w-full px-2.5 py-1.5 border rounded-lg text-xs font-mono font-medium focus:outline-none focus:ring-2 focus:ring-purple-500 transition ${
                      isDark
                        ? "bg-slate-900 border-slate-700 text-white"
                        : "bg-white border-slate-300 text-slate-900"
                    }`}
                  />
                  <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-1 truncate">
                    {m.description}
                  </p>
                </div>
              );
            })}
          </div>

          {/* Freight Mode & Logistics Remarks - Procurement (Accounts / Admin) Only, hidden in Sourcing / RFQ */}
          {!isRFQ && isAccountsOrAdmin && (
            <div
              className={`p-3.5 rounded-xl border space-y-3 ${
                isDark ? "bg-slate-800/40 border-slate-800" : "bg-slate-50 border-slate-200"
              }`}
            >
              <div className="flex items-center gap-2">
                <Truck size={14} className="text-blue-500" />
                <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                  Logistics & Transport Parameters
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                    Freight Method
                  </label>
                  <select
                    value={formData.freight_type || "Sea Freight"}
                    onChange={(e) => onChange("freight_type", e.target.value)}
                    className={`w-full px-2.5 py-1.5 border rounded-lg text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                      isDark
                        ? "bg-slate-900 border-slate-700 text-white"
                        : "bg-white border-slate-300 text-slate-900"
                    }`}
                  >
                    <option value="Sea Freight">Sea Freight (FCL / LCL)</option>
                    <option value="Air Freight">Air Freight</option>
                    <option value="Land Transport">Land Transport</option>
                    <option value="Courier / Express">Courier / Express</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                    Logistics Remarks / Instructions
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Port Victoria delivery, fragile cargo"
                    value={formData.remark || ""}
                    onChange={(e) => onChange("remark", e.target.value)}
                    className={`w-full px-2.5 py-1.5 border rounded-lg text-xs font-medium focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                      isDark
                        ? "bg-slate-900 border-slate-700 text-white placeholder-slate-500"
                        : "bg-white border-slate-300 text-slate-900 placeholder-slate-400"
                    }`}
                  />
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-3.5 sm:p-4 border-t border-slate-200 dark:border-slate-800 flex items-center justify-end gap-2 flex-none">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 active:scale-95 text-white font-bold rounded-xl text-xs transition shadow-xs"
          >
            Apply & Close
          </button>
        </div>
      </div>
    </div>
  );
}
