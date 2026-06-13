import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import FormButton from "../../components/formButtons";
import FormInput from "../../components/formInputs";
import "../../styles/form.css";
import { loginValidation } from "./validation";
import api from "../../api/api";

import { useTheme } from "../../context/ThemeContext";

function Login({ setUser }) {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({ email: "", password: "" });
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);

  const [statusMsg, setStatusMsg] = useState({ type: "", text: "" });

  const { identifier } = useParams();

  const { setPrimaryColor, setLogoUrl } = useTheme();

  const [branding, setBranding] = useState({
    logo: null,
    primaryColor: "#9f64f7", 
    companyName: ""
  });

  const handleChange = (e) => {
    setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }));
    // if (statusMsg.text) setStatusMsg({ type: "", text: "" });
    if (statusMsg.type === "success") {
      setStatusMsg({ type: "", text: "" });
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setStatusMsg({ type: "", text: "" });

    const validationErrors = await loginValidation(formData);
    setErrors(validationErrors);
    if (Object.keys(validationErrors).length > 0) return;

    try {
      setLoading(true);
      const res = await api.post("/login", formData);

      const role = res.data.user.role.toLowerCase();
      localStorage.setItem("user", JSON.stringify(res.data.user));
      localStorage.setItem("role", role);
      localStorage.setItem("token", res.data.token);
      
      setUser(res.data.user);

      setStatusMsg({ type: "success", text: "Login successful! Redirecting..." });

      setTimeout(() => {
        if (role === "admin") navigate("/admin-dashboard");
        else if (role === "instructor") navigate("/instructor-dashboard");
        else if (role === "hr_manager") navigate("/hr-dashboard");
        else navigate("/");
      }, 1000);
    } catch (err) {
      const errorText =
        err.response?.data?.message ||   
        err.response?.data?.error ||    
        err.message ||
        "Login failed!";
      setStatusMsg({ type: "error", text: errorText });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (identifier) {
      localStorage.setItem("portalIdentifier", identifier);
      
      api.get(`/companies/portal/${identifier}`)
        .then(res => {
          if (res.data.success) {
            setBranding({
              logo: res.data.logo,
              primaryColor: res.data.primaryColor,
              companyName: res.data.name
            });
            setPrimaryColor(res.data.primaryColor);
            setLogoUrl(res.data.logo);
          }
        })
        .catch(err => console.error("Portal not found, falling back to default"));
    } else {
      localStorage.removeItem("portalIdentifier");
      
      setPrimaryColor('#6f42c1');
      setLogoUrl(null);
    }
  }, [identifier, setPrimaryColor, setLogoUrl]);
  
  return (
    <div className="login-page-wrapper">
      <style>
        {`
          .login-page-wrapper {
            min-height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
            background: #f8f9fa;
            padding: 20px;
          }

          .login-card {
            background: #ffffff;
            padding: 2.5rem;
            border-radius: 16px;
            box-shadow: 0 10px 25px rgba(0,0,0,0.05);
            width: 100%;
            max-width: 420px;
            border-top: 6px solid ${branding.primaryColor}; 
            transition: border-color 0.3s ease;
          }

          .login-card h1 {
            font-size: 1.75rem;
            font-weight: 800;
            color: #2d3436;
            margin-bottom: 0.5rem;
            text-align: center;
          }
          .brand-logo {
            display: block;
            margin: 0 auto 1.5rem auto;
            max-height: 50px;
            object-fit: contain;
          }

          .subtitle {
            text-align: center;
            color: #636e72;
            margin-bottom: 2rem;
            font-size: 0.9rem;
          }

          .status-alert {
            padding: 12px;
            border-radius: 8px;
            margin-bottom: 1.5rem;
            font-size: 0.85rem;
            font-weight: 500;
            text-align: center;
            animation: fadeIn 0.3s ease;
          }
          .alert-error { background: #fff5f5; color: #e03131; border: 1px solid #ffc9c9; }
          .alert-success { background: #ebfbee; color: #099268; border: 1px solid #b2f2bb; }

          @keyframes fadeIn {
            from { opacity: 0; transform: translateY(-10px); }
            to { opacity: 1; transform: translateY(0); }
          }

          .form-footer {
            display: flex;
            justify-content: flex-end;
            margin: -5px 0 20px 0;
          }

          .form-footer a {
            font-size: 0.85rem;
            color: ${branding.primaryColor};
            text-decoration: none;
            font-weight: 600;
          }

          .button-container { width: 100%; margin-top: 1rem; }
          
          .button-container button {
            width: 100% !important;
            padding: 12px !important;
            border-radius: 10px !important;
            background: ${branding.primaryColor} !important;
            border: none !important;
            color: white !important;
            font-weight: 700 !important;
            cursor: pointer;
            transition: opacity 0.2s;
          }

          .button-container button:disabled { opacity: 0.7; cursor: not-allowed; }

          .signup-text {
            text-align: center;
            margin-top: 1.5rem;
            font-size: 0.9rem;
            color: #636e72;
          }

          .signup-text a { color: ${branding.primaryColor}; font-weight: 700; text-decoration: none; }

          @media (max-width: 480px) {
            .login-card { padding: 1.5rem; }
          }
        `}
      </style>

      <div className="login-card">
        {branding.logo ? (
          <img src={branding.logo} alt="Company Logo" className="brand-logo" />
        ) : (
          <h1>Welcome Back</h1>
        )}
        <p className="subtitle">
          {branding.companyName 
            ? `Sign in to your ${branding.companyName} portal` 
            : "Please enter your details to sign in"}
        </p>

        {statusMsg.text && (
          <div className={`status-alert ${statusMsg.type === "error" ? "alert-error" : "alert-success"}`}>
            {statusMsg.text}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <FormInput
            label="Email Address"
            type="email"
            name="email"
            id="email"
            placeholder="example@mail.com"
            value={formData.email}
            onChange={handleChange}
            error={errors.email}
            autoComplete="email"
          />

          <FormInput
            label="Password"
            type="password"
            name="password"
            id="password"
            placeholder="••••••••"
            value={formData.password}
            onChange={handleChange}
            error={errors.password}
            autoComplete="current-password"
          />

          <div className="form-footer">
            <Link to="/forgot-password">Forgot Password?</Link>
          </div>

          <div className="button-container">
            <FormButton
              type="submit"
              text={loading ? "Verifying..." : "Sign In"}
              disabled={loading}
            />
          </div>

          {!identifier ? (
            <p className="signup-text">
              New here? <Link to="/register">Create an account</Link>
            </p>
          ) : (
            <p className="signup-text" style={{ fontSize: "0.85rem" }}>
              Need access? <span style={{ color: branding.primaryColor, fontWeight: 600 }}>Contact your HR Manager</span>
            </p>
          )}
        </form>
      </div>
    </div>
  );
}

export default Login;