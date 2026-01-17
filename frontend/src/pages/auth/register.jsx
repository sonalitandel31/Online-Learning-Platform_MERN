import { useRef, useState } from "react";
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

  const handleChange = (e) => {
    const { name, value, type, files } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === "file" ? files[0] : value,
    }));
    // Clear status message when user interacts
    if (statusMsg.text) setStatusMsg({ type: "", text: "" });
  };

  const handleRoleChange = (newRole) => {
    setRole(newRole);
    setErrors({});
    setStatusMsg({ type: "", text: "" });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setStatusMsg({ type: "", text: "" });

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
      else 
        setStatusMsg({ type: "error", text: "Server error, please try again later." });
    } finally {
      setLoading(false);
    }
  };

  const handleReset = (e) => {
    e.preventDefault();
    setFormData({
      name: "", email: "", password: "", con_password: "", education: "",
      interests: "", profilePic: null, bio: "", expertise: "",
      qualifications: "", experience: "",
    });
    if (fileInputRef.current) fileInputRef.current.value = "";
    setErrors({});
    setStatusMsg({ type: "", text: "" });
  };

  return (
    <div className="register-page-wrapper">
      <style>
        {`
          .register-page-wrapper {
            min-height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
            background: #f4f7fe;
            padding: 40px 20px;
          }

          .register-card {
            background: #ffffff;
            padding: 2.5rem;
            border-radius: 24px;
            box-shadow: 0 20px 40px rgba(0,0,0,0.08);
            width: 100%;
            max-width: 600px;
          }

          .register-card h2 {
            font-size: 1.6rem;
            font-weight: 800;
            color: #1a1a1a;
            text-align: center;
            margin-bottom: 1.5rem;
          }

          .role-toggle-container {
            display: flex;
            background: #f1f3f5;
            padding: 5px;
            border-radius: 12px;
            margin-bottom: 2rem;
          }

          .role-btn {
            flex: 1;
            border: none;
            padding: 10px;
            border-radius: 10px;
            font-weight: 600;
            transition: all 0.3s ease;
            background: transparent;
            color: #495057;
          }

          .role-btn.active {
            background: white;
            color: #9f64f7;
            box-shadow: 0 4px 12px rgba(0,0,0,0.05);
          }

          .status-alert {
            padding: 12px;
            border-radius: 10px;
            margin-bottom: 1.5rem;
            font-size: 0.9rem;
            text-align: center;
            animation: slideDown 0.3s ease;
          }
          .alert-error { background: #fff5f5; color: #e03131; border: 1px solid #ffc9c9; }
          .alert-success { background: #ebfbee; color: #099268; border: 1px solid #b2f2bb; }

          @keyframes slideDown {
            from { opacity: 0; transform: translateY(-10px); }
            to { opacity: 1; transform: translateY(0); }
          }

          .form-grid {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 15px;
          }

          .action-buttons {
            display: flex;
            gap: 15px;
            margin-top: 2rem;
          }

          .action-buttons button {
            flex: 1;
            padding: 12px !important;
            border-radius: 12px !important;
            font-weight: 700 !important;
          }

          .btn-submit { background: #9f64f7 !important; color: white !important; border: none !important; }
          .btn-reset { background: #f1f3f5 !important; color: #495057 !important; border: none !important; }

          .login-link {
            text-align: center;
            margin-top: 1.5rem;
            font-size: 0.9rem;
            color: #6c757d;
          }

          .login-link a { color: #9f64f7; font-weight: 700; text-decoration: none; }

          @media (max-width: 600px) {
            .form-grid { grid-template-columns: 1fr; }
            .register-card { padding: 1.5rem; }
            .register-page-wrapper { padding: 20px 10px; }
          }
        `}
      </style>

      <div className="register-card">
        <h2>Join as {role}</h2>

        {/* Custom Role Toggle */}
        <div className="role-toggle-container">
          <button 
            className={`role-btn ${role === "Student" ? "active" : ""}`}
            onClick={() => handleRoleChange("Student")}
          >
            Student
          </button>
          <button 
            className={`role-btn ${role === "Instructor" ? "active" : ""}`}
            onClick={() => handleRoleChange("Instructor")}
          >
            Instructor
          </button>
        </div>

        {statusMsg.text && (
          <div className={`status-alert ${statusMsg.type === "error" ? "alert-error" : "alert-success"}`}>
            {statusMsg.text}
          </div>
        )}

        <form onSubmit={handleSubmit} onReset={handleReset}>
          <div className="form-grid">
            <FormInput label="Full Name" type="text" name="name" onChange={handleChange} value={formData.name} error={errors.name} />
            <FormInput label="Email" type="email" name="email" placeholder="abc@mail.com" onChange={handleChange} value={formData.email} error={errors.email} />

            {role === "Student" && (
              <>
                <FormInput label="Education" type="text" name="education" placeholder="e.g. B.Sc CS" onChange={handleChange} value={formData.education} error={errors.education} />
                <FormInput label="Interests" type="text" name="interests" placeholder="e.g. AI, Design" onChange={handleChange} value={formData.interests} error={errors.interests} />
              </>
            )}

            {role === "Instructor" && (
              <>
                <FormInput label="Bio" type="text" name="bio" placeholder="Passion for teaching" onChange={handleChange} value={formData.bio} error={errors.bio} />
                <FormInput label="Expertise" type="text" name="expertise" placeholder="e.g. Web Dev" onChange={handleChange} value={formData.expertise} error={errors.expertise} />
                <FormInput label="Qualifications" type="text" name="qualifications" placeholder="e.g. M.Tech" onChange={handleChange} value={formData.qualifications} error={errors.qualifications} />
                <FormInput label="Experience (yrs)" type="number" name="experience" onChange={handleChange} value={formData.experience} error={errors.experience} />
                <div style={{ gridColumn: "1 / -1" }}>
                  <FormInput label="Profile Picture" type="file" name="profilePic" onChange={handleChange} inputRef={fileInputRef} error={errors.profilePic} />
                </div>
              </>
            )}

            <FormInput label="Password" type="password" name="password" onChange={handleChange} value={formData.password} error={errors.password} />
            <FormInput label="Confirm Password" type="password" name="con_password" onChange={handleChange} value={formData.con_password} error={errors.con_password} />
          </div>

          <div className="action-buttons">
            <FormButton type="reset" text="Clear" className="btn-reset" />
            <FormButton type="submit" text={loading ? "Creating..." : "Register"} disabled={loading} className="btn-submit" />
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