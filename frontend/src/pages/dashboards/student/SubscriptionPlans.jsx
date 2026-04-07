import { useEffect, useMemo, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import api from "../../../api/api";
import {
  Check, Zap, Star, ShieldCheck, Clock, CreditCard, AlertCircle, ChevronRight, CheckCircle2
} from "lucide-react";

export default function SubscriptionPlans() {
  const navigate = useNavigate();
  const [plans, setPlans] = useState([]);
  const [mySub, setMySub] = useState(null); // NEW: Track the user's current subscription
  const [loading, setLoading] = useState(true);
  const [payingId, setPayingId] = useState(null);
  const [msg, setMsg] = useState({ type: "", text: "" });

  const notify = (type, text) => setMsg({ type, text });

  const colors = {
    primary: "#6366f1",
    accent: "#f59e0b",
    success: "#22c55e",
  };

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

  // NEW: Fetch both plans and the user's active subscription at the same time
  const fetchData = async () => {
    try {
      setLoading(true);
      const [plansRes, meRes] = await Promise.all([
        api.get("/subscriptions/plans"),
        api.get("/subscriptions/me").catch(() => ({ data: null })) // Fails safely if not logged in
      ]);
      
      setPlans(plansRes.data?.plans || []);
      
      // Only store active or trial subscriptions
      const sub = meRes.data?.subscription;
      if (sub && ["active", "trial"].includes(sub.status)) {
        setMySub(sub);
      }
    } catch (e) {
      console.error(e);
      notify("danger", "Failed to load plans");
      setPlans([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // ---------- Visibility rules ----------
  const isRazorpayLinked = (p) => Boolean(p?.providerPlanId);

  const visiblePlans = useMemo(() => {
    return (plans || []).filter((p) => {
      const activeStatus = p.isActive !== undefined ? p.isActive : true;
      return activeStatus && isRazorpayLinked(p);
    });
  }, [plans]);

  const openRazorpayCheckout = ({ key, razorpaySubscriptionId, planName }) => {
    const options = {
      key,
      subscription_id: razorpaySubscriptionId,
      name: "LearnX",
      description: planName ? `Subscription - ${planName}` : "Subscription",

      handler: async function (response) {
        notify("success", "Payment captured. Verifying...");
        try {
          await api.post("/razorpay/verify-subscription", {
            razorpay_payment_id: response?.razorpay_payment_id,
            razorpay_subscription_id: response?.razorpay_subscription_id,
            razorpay_signature: response?.razorpay_signature,
          });
          
          navigate("/me/subscription");
        } catch (e) {
          console.error(e);
          notify("danger", e?.response?.data?.message || "Verification failed. Please refresh.");
          setTimeout(() => navigate("/me/subscription"), 700);
        }
      },
      modal: { ondismiss: () => notify("danger", "Payment cancelled") },
      theme: { color: colors.primary },
    };

    const rzp = new window.Razorpay(options);
    rzp.open();
  };

  const subscribe = async (plan, useTrial = true) => {
    try {
      setPayingId(plan._id);
      notify("", "");

      const { data } = await api.post("/razorpay/create", {
        planId: plan._id,
        useTrial: Boolean(useTrial),
      });

      if (!data?.success) return notify("danger", data?.message || "Creation failed");

      if (data?.trial?.enabled) {
        notify("success", `Trial Activated! You have ${data?.trial?.trialDays || plan?.trialDays} days of free access.`);
        setTimeout(() => navigate("/me/subscription"), 900);
        return;
      }

      if (data?.resume) notify("info", "Resuming your pending payment...");

      const ok = await loadRazorpayScript();
      if (!ok) return notify("danger", "Payment gateway failed to load");

      openRazorpayCheckout({
        key: data.key,
        razorpaySubscriptionId: data.razorpaySubscriptionId,
        planName: plan.name,
      });
    } catch (e) {
      console.error(e);
      notify("danger", e?.response?.data?.message || e?.message || "Subscription process failed");
    } finally {
      setPayingId(null);
    }
  };

  return (
    <div className="container py-5" style={{ maxWidth: 1200 }}>
      {/* HEADER */}
      <div className="text-center mb-4 animate__animated animate__fadeInDown">
        <h1 className="fw-black mb-2" style={{ color: "#1e1b4b", fontSize: "2.5rem" }}>Ready to Level Up?</h1>
        <p className="text-muted mx-auto" style={{ maxWidth: 600 }}>Choose a plan that fits your learning pace.</p>
      </div>

      {/* NEW: Banner for users who already have an active subscription */}
      {mySub && (
        <div className="alert border-0 shadow-sm mb-5 d-flex align-items-center justify-content-between p-4 rounded-4" style={{ backgroundColor: "#eef2ff", color: "#3730a3" }}>
          <div className="d-flex align-items-center gap-3">
            <CheckCircle2 size={24} className="text-primary" />
            <div>
              <h6 className="fw-bold mb-1">You have an active subscription!</h6>
              <p className="small mb-0 opacity-75">You are currently subscribed to <strong>{mySub.planId?.name || "Premium"}</strong>.</p>
            </div>
          </div>
          <Link to="/me/subscription" className="btn btn-sm btn-primary rounded-pill px-4 fw-bold shadow-sm">
            Manage Subscription
          </Link>
        </div>
      )}

      {msg.text && (
        <div className={`alert alert-${msg.type || "info"} border-0 shadow-sm d-flex align-items-center gap-2 mb-4 animate__animated animate__fadeIn`} style={{ borderRadius: 12 }}>
          {msg.type === "success" ? <ShieldCheck size={20} /> : <AlertCircle size={20} />}
          {msg.text}
        </div>
      )}

      {loading ? (
        <div className="text-center py-5">
          <div className="spinner-border" style={{ color: colors.primary }} role="status" />
          <p className="mt-3 text-muted fw-bold">Fetching latest offers...</p>
        </div>
      ) : visiblePlans.length === 0 ? (
        <div className="text-center py-5 bg-light rounded-4 border border-dashed">
          <AlertCircle size={48} className="text-muted mb-3" />
          <h4 className="text-muted">No subscription plans available right now.</h4>
          <p>Please check back later or contact support.</p>
        </div>
      ) : (
        <div className="row g-4 justify-content-center">
          {visiblePlans.map((p) => {
            const hasTrial = Number(p.trialDays || 0) > 0;
            const isPopular = Boolean(p.isFeatured);
            
            // NEW: Check if this card represents the plan the user already owns
            const isCurrentPlan = mySub && String(mySub.planId?._id) === String(p._id);

            return (
              <div key={p._id} className="col-md-6 col-lg-4 animate__animated animate__fadeInUp">
                <div className={`card h-100 border-0 shadow-lg position-relative transition-all ${isPopular ? "popular-card" : ""} ${isCurrentPlan ? "opacity-75" : ""}`} style={{ borderRadius: 24, overflow: "hidden" }}>
                  
                  {isPopular && !isCurrentPlan && (
                    <div className="position-absolute top-0 end-0 px-4 py-1 small fw-bold text-white" style={{ backgroundColor: colors.accent, borderBottomLeftRadius: 16, zIndex: 10 }}>
                      <Star size={12} fill="white" className="me-1 mb-1" /> MOST POPULAR
                    </div>
                  )}

                  {/* NEW: Badge for Current Plan */}
                  {isCurrentPlan && (
                    <div className="position-absolute top-0 end-0 px-4 py-1 small fw-bold text-white bg-success" style={{ borderBottomLeftRadius: 16, zIndex: 10 }}>
                      <Check size={12} className="me-1 mb-1" /> YOUR PLAN
                    </div>
                  )}

                  <div className="card-body p-4 p-xl-5 d-flex flex-column">
                    <h4 className="fw-bold mb-1" style={{ color: "#1e1b4b" }}>{p.name}</h4>
                    <p className="text-muted small mb-4">{p.description}</p>
                    <div className="mb-4">
                      <div className="d-flex align-items-baseline">
                        <span className="h1 fw-black mb-0" style={{ color: colors.primary }}>₹{p.price}</span>
                        <span className="ms-2 text-muted fw-semibold">/ {p.billingCycle}</span>
                      </div>
                      {hasTrial && <div className="mt-2 text-success fw-bold small"><Zap size={14} fill={colors.success} /> Includes {p.trialDays}-day free trial</div>}
                    </div>
                    <div className="mb-5">
                      <FeatureItem text={p.accessType === "all" ? "Unlimited access to all courses" : "Access to selected courses"} />
                      <FeatureItem text="Mobile & Laptop access" />
                      <FeatureItem text="Course completion certificates" />
                    </div>
                    
                    <div className="mt-auto">
                      {/* NEW: Button logic changes if they already own this plan */}
                      {isCurrentPlan ? (
                         <button className="btn btn-lg w-100 rounded-pill fw-bold text-success border shadow-sm" disabled style={{ backgroundColor: "#f0fdf4", borderColor: "#22c55e" }}>
                            <CheckCircle2 size={18} className="me-2" /> Current Plan
                         </button>
                      ) : (
                        <>
                          <button
                            className={`btn btn-lg w-100 rounded-pill fw-bold text-white border-0 shadow-sm transition-all`}
                            style={{ backgroundColor: hasTrial ? colors.success : colors.primary }}
                            disabled={payingId === p._id || mySub !== null} // Disabled if they own ANY plan to prevent double subs right now
                            onClick={() => subscribe(p, hasTrial)}
                          >
                            {payingId === p._id ? <span className="spinner-border spinner-border-sm me-2" /> : hasTrial ? <Clock size={18} className="me-2" /> : <CreditCard size={18} className="me-2" />}
                            {mySub ? "Switching Not Enabled" : hasTrial ? `Try Free for ${p.trialDays} Days` : "Get Started"}
                          </button>
                          {hasTrial && !mySub && (
                            <button className="btn btn-link btn-sm text-muted w-100 mt-2 text-decoration-none fw-bold" onClick={() => subscribe(p, false)}>
                              Skip trial and pay now <ChevronRight size={14} />
                            </button>
                          )}
                        </>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <style dangerouslySetInnerHTML={{
        __html: `
        .fw-black { font-weight: 900; }
        .popular-card { transform: scale(1.03); border: 2px solid ${colors.accent} !important; }
        .transition-all { transition: all 0.3s ease; }
        .card:hover { transform: translateY(-8px); }
        .shadow-primary { box-shadow: 0 10px 15px -3px rgba(175, 99, 241, 0.3); }
      `}} />
    </div>
  );
}

function FeatureItem({ text }) {
  return (
    <div className="d-flex align-items-center gap-2 mb-3">
      <div className="rounded-circle p-1 bg-light"><Check size={14} className="text-primary" /></div>
      <span className="small fw-semibold">{text}</span>
    </div>
  );
}