import { useRef, useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import FormButton from "../../components/formButtons";
import FormInput from "../../components/formInputs";
import "../../styles/form.css";
import { registerValidation } from "./validation";
import api from "../../api/api";

function Register({ setUser }) {
  const navigate = useNavigate();
  const [role, setRole] = useState("Student");
  const fileInputRef = useRef(null);

  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    con_password: "",
    education: "",
    interests: "",
    profilePic: null,
    bio: "",
    expertise: "",
    qualifications: "",
    experience: "",
  });

  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [statusMsg, setStatusMsg] = useState({ type: "", text: "" });

  // ✅ Terms state + modal
  const [agreed, setAgreed] = useState(false);
  const [showTerms, setShowTerms] = useState(false);

  const handleChange = (e) => {
    const { name, value, type, files } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === "file" ? files[0] : value,
    }));
    if (statusMsg.text) setStatusMsg({ type: "", text: "" });
  };

  const handleRoleChange = (newRole) => {
    setRole(newRole);
    setErrors({});
    setStatusMsg({ type: "", text: "" });
  };

  // ✅ close modal with ESC
  useEffect(() => {
    const onKeyDown = (e) => {
      if (e.key === "Escape") setShowTerms(false);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setStatusMsg({ type: "", text: "" });

    if (!agreed) {
      setStatusMsg({ type: "error", text: "Please accept Terms & Conditions to register." });
      return;
    }

    const validationErrors = await registerValidation(formData, role);
    setErrors(validationErrors);
    if (Object.keys(validationErrors).length > 0) return;

    try {
      setLoading(true);

      const data = new FormData();
      Object.keys(formData).forEach((key) => {
        if (formData[key] !== null) data.append(key, formData[key]);
      });
      data.append("role", role);

      const res = await api.post("/register", data, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      localStorage.setItem("user", JSON.stringify(res.data.user));
      localStorage.setItem("role", res.data.user.role);
      localStorage.setItem("token", res.data.token);
      setUser(res.data.user);

      setStatusMsg({ type: "success", text: "Registration successful! Redirecting..." });

      setTimeout(() => {
        const userRole = res.data.user.role.toLowerCase();
        if (userRole === "admin") navigate("/admin-dashboard");
        else if (userRole === "instructor") navigate("/instructor-dashboard");
        else navigate("/");
      }, 2000);
    } catch (err) {
      if (err.response?.status === 409)
        setStatusMsg({ type: "error", text: "Email already registered!" });
      else setStatusMsg({ type: "error", text: "Server error, please try again later." });
    } finally {
      setLoading(false);
    }
  };

  const handleReset = (e) => {
    e.preventDefault();
    setFormData({
      name: "",
      email: "",
      password: "",
      con_password: "",
      education: "",
      interests: "",
      profilePic: null,
      bio: "",
      expertise: "",
      qualifications: "",
      experience: "",
    });
    if (fileInputRef.current) fileInputRef.current.value = "";
    setErrors({});
    setStatusMsg({ type: "", text: "" });
    setAgreed(false);
  };

  return (
    <div className="register-page-wrapper">
      <style>
        {`
          /* --- Global & Layout --- */
          .register-page-wrapper {
            min-height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
            background: #f8fafc;
            padding: 40px 20px;
            font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
          }

          .register-card {
            background: #ffffff;
            padding: 2.5rem;
            border-radius: 24px;
            box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 20px 25px -5px rgba(0, 0, 0, 0.05);
            width: 100%;
            max-width: 600px;
            border: 1px solid #eef2f6;
          }

          .register-card h2 {
            font-size: 1.75rem;
            font-weight: 700;
            color: #111827;
            text-align: center;
            margin-bottom: 1.5rem;
            letter-spacing: -0.025em;
          }

          /* --- Role Toggle --- */
          .role-toggle-container {
            display: flex;
            background: #f1f5f9;
            padding: 4px;
            border-radius: 12px;
            margin-bottom: 2rem;
          }

          .role-btn {
            flex: 1;
            border: none;
            padding: 10px;
            border-radius: 8px;
            font-weight: 600;
            font-size: 0.95rem;
            transition: all 0.2s ease;
            background: transparent;
            color: #64748b;
            cursor: pointer;
          }

          .role-btn.active {
            background: #ffffff;
            color: #7c3aed;
            box-shadow: 0 1px 3px rgba(0,0,0,0.1);
          }

          /* --- Status Alerts --- */
          .status-alert {
            padding: 12px 16px;
            border-radius: 12px;
            margin-bottom: 1.5rem;
            font-size: 0.9rem;
            text-align: center;
            font-weight: 500;
            animation: slideDown 0.3s ease;
          }
          .alert-error { background: #fef2f2; color: #dc2626; border: 1px solid #fee2e2; }
          .alert-success { background: #f0fdf4; color: #16a34a; border: 1px solid #dcfce7; }

          @keyframes slideDown {
            from { opacity: 0; transform: translateY(-10px); }
            to { opacity: 1; transform: translateY(0); }
          }

          /* --- Form Grid --- */
          .form-grid {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 16px;
          }

          @media (max-width: 640px) {
            .form-grid { grid-template-columns: 1fr; }
            .register-card { padding: 1.5rem; }
            .register-page-wrapper { padding: 10px; }
          }

          /* --- Terms Checkbox Area --- */
          .terms-row {
            margin-top: 20px;
            display: flex;
            align-items: center;
            gap: 10px;
            font-size: 0.9rem;
            color: #4b5563;
          }
          .terms-row input {
            width: 18px;
            height: 18px;
            accent-color: #7c3aed;
            cursor: pointer;
            border-radius: 4px;
          }
          .terms-link {
            color: #7c3aed;
            font-weight: 600;
            cursor: pointer;
            border: none;
            background: transparent;
            padding: 0;
            text-decoration: underline;
            text-underline-offset: 2px;
          }
          .terms-link:hover { color: #6d28d9; }

          /* --- Buttons --- */
          .action-buttons {
            display: flex;
            gap: 12px;
            margin-top: 1.5rem;
          }
          .action-buttons button {
            flex: 1;
            padding: 8px !important;
            border-radius: 12px !important;
            font-weight: 600 !important;
            font-size: 1rem !important;
            cursor: pointer;
            transition: transform 0.1s;
          }
          .action-buttons button:active { transform: scale(0.98); }

          .btn-submit { background: #7c3aed !important; color: white !important; border: none !important; }
          .btn-reset { background: #f1f5f9 !important; color: #64748b !important; border: none !important; }
          .btn-submit:hover { background: #6d28d9 !important; }
          .btn-reset:hover { background: #e2e8f0 !important; }

          .btn-disabled { opacity: 0.6; cursor: not-allowed !important; pointer-events: none; }

          .login-link {
            text-align: center;
            margin-top: 1.5rem;
            font-size: 0.9rem;
            color: #64748b;
          }
          .login-link a { color: #7c3aed; font-weight: 600; text-decoration: none; }
          .login-link a:hover { text-decoration: underline; }

          /* ------------------------------------------------ */
          /* ✅ PROFESSIONAL MODAL STYLES                     */
          /* ------------------------------------------------ */
          .terms-overlay {
            position: fixed;
            inset: 0;
            background: rgba(15, 23, 42, 0.4);
            backdrop-filter: blur(8px); /* Glass effect */
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 16px;
            z-index: 9999;
            animation: fadeIn 0.2s ease-out forwards;
          }

          .terms-modal {
            width: 100%;
            max-width: 650px;
            background: #ffffff;
            border-radius: 20px;
            box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25);
            display: flex;
            flex-direction: column;
            max-height: 85vh; /* Keep it within view */
            animation: scaleUp 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards;
            overflow: hidden;
            border: 1px solid rgba(255,255,255,0.5);
          }

          /* Modal Header */
          .terms-header {
            padding: 20px 24px;
            border-bottom: 1px solid #e2e8f0;
            display: flex;
            align-items: center;
            justify-content: space-between;
            background: #fff;
          }
          .terms-title {
            font-size: 1.25rem;
            font-weight: 700;
            color: #1e293b;
          }
          .terms-close-icon {
            background: #f1f5f9;
            border: none;
            color: #64748b;
            width: 32px;
            height: 32px;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 1.2rem;
            cursor: pointer;
            transition: all 0.2s;
          }
          .terms-close-icon:hover { background: #e2e8f0; color: #334155; }

          /* Modal Body */
          .terms-body {
            padding: 24px;
            overflow-y: auto;
            color: #475569;
            line-height: 1.7;
            font-size: 0.95rem;
          }
          .terms-body h4 {
            color: #0f172a;
            font-weight: 700;
            margin-bottom: 8px;
            margin-top: 24px;
            font-size: 1rem;
            display: flex;
            align-items: center;
            gap: 8px;
          }
          .terms-body h4:first-child { margin-top: 0; }
          .terms-body p { margin: 0; }

          /* Number badge for sections */
          .terms-num {
            background: #e0e7ff;
            color: #4338ca;
            font-size: 0.75rem;
            font-weight: 800;
            width: 24px;
            height: 24px;
            border-radius: 50%;
            display: inline-flex;
            align-items: center;
            justify-content: center;
          }

          /* Custom Scrollbar */
          .terms-body::-webkit-scrollbar { width: 6px; }
          .terms-body::-webkit-scrollbar-track { background: #f8fafc; }
          .terms-body::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 10px; }
          .terms-body::-webkit-scrollbar-thumb:hover { background: #94a3b8; }

          /* Modal Footer */
          .terms-footer {
            padding: 16px 24px;
            border-top: 1px solid #e2e8f0;
            background: #f8fafc;
            display: flex;
            gap: 12px;
            justify-content: flex-end;
          }

          .terms-btn-cancel {
            background: #ffffff;
            color: #475569;
            border: 1px solid #cbd5e1;
            padding: 10px 20px;
            border-radius: 10px;
            font-weight: 600;
            cursor: pointer;
            transition: all 0.2s;
          }
          .terms-btn-cancel:hover { background: #f1f5f9; }

          .terms-btn-accept {
            background: #7c3aed;
            color: #fff;
            border: none;
            padding: 10px 24px;
            border-radius: 10px;
            font-weight: 600;
            cursor: pointer;
            box-shadow: 0 4px 6px -1px rgba(124, 58, 237, 0.3);
            transition: all 0.2s;
          }
          .terms-btn-accept:hover { background: #6d28d9; box-shadow: 0 6px 10px -2px rgba(124, 58, 237, 0.4); }

          /* Animations */
          @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
          @keyframes scaleUp { from { transform: scale(0.95); opacity: 0; } to { transform: scale(1); opacity: 1; } }
        `}
      </style>

      {/* ✅ Professional Terms Modal */}
      {showTerms && (
        <div
          className="terms-overlay"
          onClick={() => setShowTerms(false)}
          role="dialog"
          aria-modal="true"
        >
          <div className="terms-modal" onClick={(e) => e.stopPropagation()}>
            <div className="terms-header">
              <span className="terms-title">Terms & Conditions</span>
              <button
                className="terms-close-icon"
                onClick={() => setShowTerms(false)}
                aria-label="Close"
              >
                &times;
              </button>
            </div>

            <div className="terms-body">
              <h4>
                <span className="terms-num">1</span> Acceptance of Terms
              </h4>
              <p>
                By accessing and creating an account on this platform, you agree to comply with and be bound by these Terms and Conditions. If you do not agree, please do not use our services.
              </p>

              <h4>
                <span className="terms-num">2</span> Account Security
              </h4>
              <p>
                You are responsible for safeguarding your login credentials. Any activity performed under your account is your sole responsibility. Notify us immediately of any unauthorized use.
              </p>

              <h4>
                <span className="terms-num">3</span> Course Usage Policy
              </h4>
              <p>
                Purchased courses are for personal use only. Sharing, redistributing, or reselling course content is strictly prohibited and may result in immediate account termination.
              </p>

              <h4>
                <span className="terms-num">4</span> Payments & Refunds
              </h4>
              <p>
                All payments are processed securely via third-party gateways. Refund requests are subject to the specific refund policy of the course instructor and platform guidelines.
              </p>

              <h4>
                <span className="terms-num">5</span> User Conduct
              </h4>
              <p>
                We maintain a zero-tolerance policy towards harassment, hate speech, or spam. Violating these community standards will lead to suspension of your account.
              </p>

              <h4>
                <span className="terms-num">6</span> Policy Updates
              </h4>
              <p>
                We reserve the right to modify these terms at any time. Continued use of the platform constitutes acceptance of the modified terms.
              </p>
            </div>

            <div className="terms-footer">
              <button className="terms-btn-cancel" onClick={() => setShowTerms(false)}>
                Decline
              </button>
              <button
                className="terms-btn-accept"
                onClick={() => {
                  setAgreed(true);
                  setShowTerms(false);
                  setStatusMsg({ type: "", text: "" });
                }}
              >
                Accept & Continue
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="register-card">
        <h2>Join as {role}</h2>

        <div className="role-toggle-container">
          <button
            type="button"
            className={`role-btn ${role === "Student" ? "active" : ""}`}
            onClick={() => handleRoleChange("Student")}
          >
            Student
          </button>
          <button
            type="button"
            className={`role-btn ${role === "Instructor" ? "active" : ""}`}
            onClick={() => handleRoleChange("Instructor")}
          >
            Instructor
          </button>
        </div>

        {statusMsg.text && (
          <div
            className={`status-alert ${
              statusMsg.type === "error" ? "alert-error" : "alert-success"
            }`}
          >
            {statusMsg.text}
          </div>
        )}

        <form onSubmit={handleSubmit} onReset={handleReset}>
          <div className="form-grid">
            <FormInput
              label="Full Name"
              type="text"
              name="name"
              onChange={handleChange}
              value={formData.name}
              error={errors.name}
            />
            <FormInput
              label="Email"
              type="email"
              name="email"
              placeholder="abc@mail.com"
              onChange={handleChange}
              value={formData.email}
              error={errors.email}
            />

            {role === "Student" && (
              <>
                <FormInput
                  label="Education"
                  type="text"
                  name="education"
                  placeholder="e.g. B.Sc CS"
                  onChange={handleChange}
                  value={formData.education}
                  error={errors.education}
                />
                <FormInput
                  label="Interests"
                  type="text"
                  name="interests"
                  placeholder="e.g. AI, Design"
                  onChange={handleChange}
                  value={formData.interests}
                  error={errors.interests}
                />
              </>
            )}

            {role === "Instructor" && (
              <>
                <FormInput
                  label="Bio"
                  type="text"
                  name="bio"
                  placeholder="Passion for teaching"
                  onChange={handleChange}
                  value={formData.bio}
                  error={errors.bio}
                />
                <FormInput
                  label="Expertise"
                  type="text"
                  name="expertise"
                  placeholder="e.g. Web Dev"
                  onChange={handleChange}
                  value={formData.expertise}
                  error={errors.expertise}
                />
                <FormInput
                  label="Qualifications"
                  type="text"
                  name="qualifications"
                  placeholder="e.g. M.Tech"
                  onChange={handleChange}
                  value={formData.qualifications}
                  error={errors.qualifications}
                />
                <FormInput
                  label="Experience (yrs)"
                  type="number"
                  name="experience"
                  onChange={handleChange}
                  value={formData.experience}
                  error={errors.experience}
                />
                <div style={{ gridColumn: "1 / -1" }}>
                  <FormInput
                    label="Profile Picture"
                    type="file"
                    name="profilePic"
                    onChange={handleChange}
                    inputRef={fileInputRef}
                    error={errors.profilePic}
                  />
                </div>
              </>
            )}

            <FormInput
              label="Password"
              type="password"
              name="password"
              onChange={handleChange}
              value={formData.password}
              error={errors.password}
            />
            <FormInput
              label="Confirm Password"
              type="password"
              name="con_password"
              onChange={handleChange}
              value={formData.con_password}
              error={errors.con_password}
            />
          </div>

          <div className="terms-row">
            <input
              type="checkbox"
              checked={agreed}
              onChange={(e) => setAgreed(e.target.checked)}
              id="termsCheck"
            />
            <label htmlFor="termsCheck">
              I agree to the{" "}
              <button
                type="button"
                className="terms-link"
                onClick={() => setShowTerms(true)}
              >
                Terms & Conditions
              </button>
            </label>
          </div>

          <div className="action-buttons">
            <FormButton type="reset" text="Clear" className="btn-reset" />
            <FormButton
              type="submit"
              text={loading ? "Creating..." : "Register"}
              disabled={loading || !agreed}
              className={`btn-submit ${loading || !agreed ? "btn-disabled" : ""}`}
              title={!agreed ? "Accept Terms & Conditions to register" : ""}
            />
          </div>

          <p className="login-link">
            Already have an account? <Link to="/login">Login Here</Link>
          </p>
        </form>
      </div>
    </div>
  );
}

export default Register;