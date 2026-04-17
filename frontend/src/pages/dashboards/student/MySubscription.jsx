import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import api from "../../../api/api";
import {
  Calendar,
  CreditCard,
  RefreshCw,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Clock,
  ExternalLink,
  ShieldAlert,
  ArrowRight,
} from "lucide-react";

export default function MySubscription() {
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [sub, setSub] = useState(null);
  const [msg, setMsg] = useState({ type: "", text: "" });
  const [cancelLoading, setCancelLoading] = useState(false);

  // payment/resume ui
  const [paying, setPaying] = useState(false);

  const colors = {
    primary: "#6366f1",
    accent: "#f59e0b",
    danger: "#ef4444",
    success: "#22c55e",
  };

  const notify = (type, text) => setMsg({ type, text });

  const loadRazorpayScript = () =>
    new Promise((resolve) => {
      const existing = document.getElementById("razorpay-sdk");
      if (existing) return resolve(true);
      const script = document.createElement("script");
      script.id = "razorpay-sdk";
      script.src = "https://checkout.razorpay.com/v1/checkout.js";
      script.onload = () => resolve(true);
      script.onerror = () => resolve(false);
      document.body.appendChild(script);
    });

  const openRazorpayCheckout = ({ key, razorpaySubscriptionId, planName }) => {
    const options = {
      key,
      subscription_id: razorpaySubscriptionId,
      name: "LearnX",
      description: planName ? `Subscription - ${planName}` : "Subscription",

      handler: async function () {
        // Don't claim success instantly; webhook may take a moment
        notify("success", "Payment captured. Confirming subscription...");

        try {
          const { data } = await api.get("/subscriptions/me");
          const st = data?.subscription?.status;

          if (["active", "trial"].includes(st)) {
            setTimeout(() => navigate("/student/my-subscription"), 400);
            return;
          }

          // still processing -> stay on page but refresh state
          await fetchMe();
        } catch {
          // fallback: just refresh UI
          await fetchMe();
        }
      },

      modal: {
        ondismiss: () => notify("danger", "Payment cancelled"),
      },

      theme: { color: colors.primary },
    };

    const rzp = new window.Razorpay(options);
    rzp.open();
  };

  const fetchMe = async () => {
    try {
      setLoading(true);
      const { data } = await api.get("/subscriptions/me");
      setSub(data?.subscription || null);
    } catch (e) {
      console.error(e);
      notify("danger", "Failed to fetch subscription details");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMe();
  }, []);

  // ✅ Resume/Retry payment: uses your Option-A backend
  const resumePayment = async () => {
    try {
      if (!sub?.planId?._id) return notify("danger", "Plan not found for this subscription");
      setPaying(true);
      notify("", "");

      // calling same endpoint is correct: backend will return resume:true for pending same plan
      const { data } = await api.post("/razorpay/create", {
        planId: sub.planId._id,
        useTrial: false, // user is already in pending/past_due, pay now
      });

      if (!data?.success) return notify("danger", data?.message || "Failed to start payment");

      if (data?.trial?.enabled) {
        // In case backend decides trial (rare here), just refresh UI
        notify("success", "Trial active. Refreshing subscription...");
        await fetchMe();
        return;
      }

      if (data?.resume) notify("info", "Resuming your pending payment...");

      const ok = await loadRazorpayScript();
      if (!ok) return notify("danger", "Payment gateway failed to load");

      openRazorpayCheckout({
        key: data.key,
        razorpaySubscriptionId: data.razorpaySubscriptionId,
        planName: sub?.planId?.name,
      });
    } catch (e) {
      console.error(e);
      const apiMsg = e?.response?.data?.message || e?.message || "Payment process failed";
      notify("danger", apiMsg);
    } finally {
      setPaying(false);
    }
  };

  /**
   * Cancel subscription — what it does in YOUR backend:
   *
   * Your backend supports:
   * - mode="period_end" (recommended): stops auto-renew, keeps access until current period end
   * - mode="immediate": cancels right away (and attempts provider cancel)
   *
   * IMPORTANT: Your backend expects { mode }, not { reason }.
   */
  const cancel = async () => {
    if (!sub) return;

    const mode = window.confirm(
      "Cancel at period end?\n\nOK = Cancel at period end (recommended)\nCancel = Stop (do nothing)"
    )
      ? "period_end"
      : null;

    if (!mode) return;

    try {
      setCancelLoading(true);
      notify("", "");

      const { data } = await api.post("/subscriptions/cancel", { mode });

      if (!data?.success) return notify("danger", data?.message || "Cancel failed");

      notify("success", data?.message || "Subscription updated");
      await fetchMe();
    } catch (e) {
      console.error(e);
      notify("danger", "Cancellation failed. Please try again.");
    } finally {
      setCancelLoading(false);
    }
  };

  const statusConfig = (status) => {
    const configs = {
      trial: { color: colors.success, icon: <Clock size={16} />, label: "Free Trial" },
      active: { color: colors.success, icon: <CheckCircle2 size={16} />, label: "Active" },
      pending: { color: colors.accent, icon: <Clock size={16} />, label: "Pending Payment" },
      past_due: { color: colors.danger, icon: <ShieldAlert size={16} />, label: "Past Due" },
      cancelled: { color: "#64748b", icon: <XCircle size={16} />, label: "Cancelled" },
      expired: { color: "#1e293b", icon: <XCircle size={16} />, label: "Expired" },
    };
    return configs[status] || { color: colors.primary, icon: null, label: status };
  };

  const trialInfo = useMemo(() => {
    if (!sub || sub.status !== "trial" || !sub.trialEndDate) return null;

    const now = new Date();
    const end = new Date(sub.trialEndDate);
    const diffMs = end.getTime() - now.getTime();

    if (diffMs <= 0) return { ended: true, text: "Trial ended. Payment may be required." };

    const totalMinutes = Math.floor(diffMs / (1000 * 60));
    const days = Math.floor(totalMinutes / (60 * 24));
    const hours = Math.floor((totalMinutes - days * 24 * 60) / 60);
    const mins = totalMinutes - days * 24 * 60 - hours * 60;

    return {
      ended: false,
      text: days > 0 ? `${days}d ${hours}h remaining` : `${hours}h ${mins}m remaining`,
    };
  }, [sub]);

  const canCancel = sub && ["trial", "active", "past_due", "pending"].includes(sub.status);

  const formatDateTime = (d) =>
    d ? new Date(d).toLocaleDateString(undefined, { dateStyle: "long" }) : "-";

  // ✅ Expiry should come from currentPeriodEnd for active/past_due
  const expiryDate = useMemo(() => {
    if (!sub) return "-";
    if (sub.status === "trial") return sub.trialEndDate ? formatDateTime(sub.trialEndDate) : "Trial active";
    if (sub.currentPeriodEnd) return formatDateTime(sub.currentPeriodEnd);
    if (sub.endDate) return formatDateTime(sub.endDate);
    return "-";
  }, [sub]);

  const needsPaymentAction = sub && ["pending", "past_due"].includes(sub.status);

  return (
    <div className="container py-5" style={{ maxWidth: 850 }}>
      <div className="d-flex align-items-center justify-content-between mb-4">
        <h3 className="fw-black mb-0" style={{ color: "#1e1b4b" }}>
          My Subscription
        </h3>

        <button
          className="btn btn-white shadow-sm rounded-pill px-3 border d-flex align-items-center gap-2 small fw-bold"
          onClick={fetchMe}
          disabled={loading}
        >
          <RefreshCw size={14} className={loading ? "spin" : ""} /> Refresh
        </button>
      </div>

      {msg.text && (
        <div
          className={`alert alert-${msg.type || "info"} border-0 shadow-sm rounded-4 d-flex align-items-center gap-2 mb-4 animate__animated animate__fadeIn`}
        >
          {msg.type === "success" ? <CheckCircle2 size={18} /> : <AlertTriangle size={18} />}
          {msg.text}
        </div>
      )}

      {loading ? (
        <div className="card border-0 shadow-lg overflow-hidden" style={{ borderRadius: 20 }}>
          <style>{`
            .skeleton {
              background: #e2e5e7;
              background-image: linear-gradient(90deg, rgba(255, 255, 255, 0), rgba(255, 255, 255, 0.5), rgba(255, 255, 255, 0));
              background-size: 200px 100%;
              background-repeat: no-repeat;
              border-radius: 4px;
              display: inline-block;
              line-height: 1;
              animation: skeletonShimmer 1.5s infinite linear;
            }
            @keyframes skeletonShimmer {
              0% { background-position: -200px 0; }
              100% { background-position: calc(200px + 100%) 0; }
            }
          `}</style>
          
          {/* Top Banner Skeleton */}
          <div className="p-4 p-md-4" style={{ backgroundColor: "#e2e8f0" }}>
            <div className="d-flex justify-content-between align-items-start">
              <div>
                <div className="skeleton mb-2" style={{ height: "12px", width: "100px" }}></div>
                <div className="skeleton mb-2" style={{ height: "32px", width: "250px", borderRadius: "8px" }}></div>
                <div className="skeleton" style={{ height: "16px", width: "180px" }}></div>
              </div>
              <div className="skeleton rounded-pill" style={{ height: "36px", width: "100px" }}></div>
            </div>
          </div>
          
          {/* Card Body Skeleton */}
          <div className="card-body p-4 p-md-5 bg-white">
             {/* 2x2 Grid */}
             <div className="row g-4">
               {[1, 2, 3, 4].map(i => (
                 <div key={i} className="col-sm-6">
                   <div className="d-flex align-items-center gap-3">
                     <div className="skeleton rounded-4" style={{ width: "56px", height: "56px", flexShrink: 0 }}></div>
                     <div>
                       <div className="skeleton mb-2" style={{ height: "12px", width: "80px" }}></div>
                       <div className="skeleton" style={{ height: "20px", width: "140px" }}></div>
                     </div>
                   </div>
                 </div>
               ))}
             </div>
             
             {/* Footer Skeleton */}
             <div className="mt-5 pt-4 border-top d-flex flex-column flex-md-row justify-content-between align-items-center gap-3">
               <div className="skeleton" style={{ height: "16px", width: "250px" }}></div>
               <div className="skeleton" style={{ height: "20px", width: "150px" }}></div>
             </div>
          </div>
        </div>
      ) : !sub ? (
        <div
          className="card border-0 shadow-sm text-center p-5"
          style={{ borderRadius: 24, border: "2px dashed #e2e8f0" }}
        >
          <div className="mb-4">
            <div className="bg-light d-inline-block p-4 rounded-circle mb-3">
              <CreditCard size={40} className="text-muted" />
            </div>
            <h4 className="fw-bold">No Active Plan</h4>
            <p className="text-muted">You haven't subscribed to any plan yet. Unlock premium courses today!</p>
          </div>
          <Link
            to="/subscription-plans"
            className="btn btn-primary btn-lg rounded-pill px-5 shadow-lg border-0"
            style={{ backgroundColor: colors.primary }}
          >
            Browse Plans <ArrowRight size={18} className="ms-2" />
          </Link>
        </div>
      ) : (
        <div className="card border-0 shadow-lg overflow-hidden" style={{ borderRadius: 20 }}>
          <div className="p-4 p-md-4 text-white" style={{ background: `linear-gradient(135deg, #af59ec, #925ef3)` }}>
            <div className="d-flex justify-content-between align-items-start">
              <div>
                <span className="text-uppercase small fw-bold opacity-75">Current Plan</span>
                <h2 className="fw-black mb-1">{sub.planId?.name || "Premium Plan"}</h2>
                <p className="mb-0 opacity-75 fw-medium">
                  {sub.planId?.billingCycle} Billing •{" "}
                  {sub.planId?.accessType === "all" ? "Full Access" : "Selected Access"}
                </p>
              </div>
              <div
                className="px-3 py-2 rounded-pill d-flex align-items-center gap-2 fw-bold shadow-sm"
                style={{ backgroundColor: "rgba(255,255,255,0.2)", backdropFilter: "blur(10px)" }}
              >
                {statusConfig(sub.status).icon}
                {statusConfig(sub.status).label}
              </div>
            </div>
          </div>

          <div className="card-body p-4 p-md-5 bg-white">
            {trialInfo && (
              <div
                className={`alert border-0 rounded-4 d-flex align-items-center gap-3 mb-4 ${
                  trialInfo.ended ? "bg-warning-subtle text-warning-emphasis" : "bg-success-subtle text-success-emphasis"
                }`}
              >
                <Clock size={20} />
                <div>
                  <div className="fw-bold">Trial Status</div>
                  <div className="small">{trialInfo.text}</div>
                </div>
              </div>
            )}

            {/* ✅ Pending / Past Due => show resume button */}
            {needsPaymentAction && (
              <div className="alert bg-warning-subtle border-0 rounded-4 d-flex align-items-center gap-3 mb-4 text-warning-emphasis">
                <AlertTriangle size={20} />
                <div className="flex-grow-1">
                  <div className="fw-bold">Payment Required</div>
                  <div className="small">
                    {sub.status === "pending"
                      ? "Your checkout was not completed. Click Resume to finish payment."
                      : "Your last payment failed. Click Retry to pay again."}
                  </div>
                </div>

                <button
                  className="btn btn-sm rounded-pill fw-bold border-0 text-white"
                  style={{ backgroundColor: colors.primary, minWidth: 120 }}
                  onClick={resumePayment}
                  disabled={paying}
                >
                  {paying ? <span className="spinner-border spinner-border-sm" /> : sub.status === "pending" ? "Resume" : "Retry"}
                </button>
              </div>
            )}

            {/* Details */}
            <div className="row g-4">
              <div className="col-sm-6">
                <div className="d-flex align-items-center gap-3">
                  <div className="bg-light p-3 rounded-4 text-primary">
                    <Calendar size={24} />
                  </div>
                  <div>
                    <div className="text-muted small fw-bold text-uppercase">Member Since</div>
                    <div className="fw-bold">{formatDateTime(sub.startDate)}</div>
                  </div>
                </div>
              </div>

              <div className="col-sm-6">
                <div className="d-flex align-items-center gap-3">
                  <div className="bg-light p-3 rounded-4 text-primary">
                    <Clock size={24} />
                  </div>
                  <div>
                    <div className="text-muted small fw-bold text-uppercase">Expiry Date</div>
                    <div className="fw-bold">{expiryDate}</div>
                  </div>
                </div>
              </div>

              <div className="col-sm-6">
                <div className="d-flex align-items-center gap-3">
                  <div className="bg-light p-3 rounded-4 text-primary">
                    <RefreshCw size={24} />
                  </div>
                  <div>
                    <div className="text-muted small fw-bold text-uppercase">Auto Renew</div>
                    <div className="fw-bold">{sub.autoRenew ? "Enabled" : "Disabled"}</div>
                  </div>
                </div>
              </div>

              <div className="col-sm-6">
                <div className="d-flex align-items-center gap-3">
                  <div className="bg-light p-3 rounded-4 text-primary">
                    <ShieldAlert size={24} />
                  </div>
                  <div>
                    <div className="text-muted small fw-bold text-uppercase">Payment Provider</div>
                    <div className="fw-bold text-capitalize">{sub.provider || "razorpay"}</div>
                  </div>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="mt-5 pt-4 border-top d-flex flex-column flex-md-row justify-content-between align-items-center gap-3">
              <div className="text-muted small">
                Want to switch plans? Visit{" "}
                <Link to="/subscription-plans" className="text-primary fw-bold text-decoration-none">
                  Subscription Plans
                </Link>
              </div>

              {canCancel && (
                <button
                  className="btn btn-link text-danger fw-bold text-decoration-none d-flex align-items-center gap-2 p-0"
                  disabled={cancelLoading}
                  onClick={cancel}
                >
                  {cancelLoading ? <span className="spinner-border spinner-border-sm" /> : <XCircle size={18} />}
                  Cancel Subscription
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      <style
        dangerouslySetInnerHTML={{
          __html: `
        .fw-black { font-weight: 900; }
        .bg-success-subtle { background-color: #f0fdf4; color: #166534; }
        .bg-warning-subtle { background-color: #fffbeb; color: #92400e; }
        .spin { animation: spin 1s linear infinite; }
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
      `,
        }}
      />
    </div>
  );
}