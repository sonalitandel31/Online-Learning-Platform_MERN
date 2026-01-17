import { useState, useEffect } from "react";
import api from "../../api/api";
import { useNavigate } from "react-router-dom";

function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);

  const [token, setToken] = useState("");
  const [resetToken, setResetToken] = useState("");

  const [statusMsg, setStatusMsg] = useState({ type: "", text: "" });
  const [timer, setTimer] = useState(0);

  const navigate = useNavigate();

  useEffect(() => {
    if (timer > 0) {
      const interval = setInterval(() => setTimer((t) => t - 1), 1000);
      return () => clearInterval(interval);
    }
  }, [timer]);

  const handleSendOtp = async () => {
    if (!email) return setStatusMsg({ type: "error", text: "Please enter your email" });
    setStatusMsg({ type: "", text: "" });
    setLoading(true);
    try {
      const res = await api.post("/auth/send-otp", { email });
      setToken(res.data.token);
      setStatusMsg({ type: "success", text: "OTP sent to your email" });
      setStep(2);
      setTimer(60);
    } catch (err) {
      setStatusMsg({ type: "error", text: err.response?.data?.message || "Failed to send OTP" });
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async () => {
    if (!otp) return setStatusMsg({ type: "error", text: "Please enter OTP" });
    setStatusMsg({ type: "", text: "" });
    setLoading(true);
    try {
      const res = await api.post("/auth/verify-otp", { email, otp, token });
      setResetToken(res.data.resetToken);
      setStatusMsg({ type: "success", text: "OTP verified successfully!" });
      setStep(3);
    } catch (err) {
      setStatusMsg({ type: "error", text: err.response?.data?.message || "Invalid OTP" });
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async () => {
    if (!newPassword || !confirmPassword)
      return setStatusMsg({ type: "error", text: "Please fill all fields" });
    if (newPassword !== confirmPassword)
      return setStatusMsg({ type: "error", text: "Passwords do not match" });

    setStatusMsg({ type: "", text: "" });
    setLoading(true);
    try {
      const res = await api.post("/auth/reset-password", {
        resetToken,
        newPassword,
      });

      setStatusMsg({ type: "success", text: res.data.message || "Password reset successful!" });

      setTimeout(() => {
        navigate("/login");
      }, 2000);
    } catch (err) {
      setStatusMsg({ type: "error", text: err.response?.data?.message || "Failed to reset password" });
    } finally {
      setLoading(false);
    }
  };

  const handleResendOtp = () => {
    if (timer > 0) return;
    handleSendOtp();
  };

  return (
    <div className="forgot-pw-wrapper">
      <style>
        {`
          .forgot-pw-wrapper {
            min-height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
            background-color: #f8f9fa;
            padding: 20px;
          }
          .forgot-card {
            width: 100%;
            max-width: 400px;
            padding: 2.5rem;
            border-radius: 20px;
            background-color: #fff;
            box-shadow: 0 10px 30px rgba(0,0,0,0.06);
            text-align: center;
          }
          .forgot-title {
            margin-bottom: 10px;
            font-weight: 800;
            font-size: 1.8rem;
            color: #2d3436;
          }
          .forgot-subtitle {
            font-size: 0.9rem;
            color: #636e72;
            margin-bottom: 1.5rem;
          }
          .status-box {
            padding: 12px;
            border-radius: 10px;
            margin-bottom: 1.5rem;
            font-size: 0.85rem;
            font-weight: 500;
          }
          .msg-error { background: #fff5f5; color: #e03131; border: 1px solid #ffc9c9; }
          .msg-success { background: #ebfbee; color: #099268; border: 1px solid #b2f2bb; }
          
          .forgot-input {
            width: 100%;
            padding: 12px 16px;
            margin-bottom: 12px;
            border: 1px solid #dfe6e9;
            border-radius: 12px;
            outline: none;
            transition: border 0.3s;
          }
          .forgot-input:focus {
            border-color: #9f64f7;
          }
          .forgot-btn {
            width: 100%;
            padding: 12px;
            background-color: #9f64f7;
            border: none;
            color: #fff;
            border-radius: 12px;
            cursor: pointer;
            font-weight: 700;
            margin-top: 10px;
            transition: opacity 0.3s;
          }
          .forgot-btn:disabled {
            opacity: 0.6;
            cursor: not-allowed;
          }
          .resend-container {
            margin-top: 1.5rem;
            font-size: 14px;
          }
          .link-text-btn {
            background: none;
            border: none;
            color: #9f64f7;
            font-weight: 700;
            cursor: pointer;
            text-decoration: none;
          }
          .link-text-btn:disabled {
            color: #b2bec3;
            cursor: not-allowed;
          }
          @media (max-width: 480px) {
            .forgot-card { padding: 1.5rem; }
            .forgot-title { font-size: 1.5rem; }
          }
        `}
      </style>

      <div className="forgot-card">
        <h2 className="forgot-title">Reset Password</h2>
        
        {/* Step Indicator Subtitles */}
        {step === 1 && <p className="forgot-subtitle">Enter your email to receive an OTP</p>}
        {step === 2 && <p className="forgot-subtitle">OTP sent to <b>{email}</b></p>}
        {step === 3 && <p className="forgot-subtitle">Create a strong new password</p>}

        {/* Status Message */}
        {statusMsg.text && (
          <div className={`status-box ${statusMsg.type === "error" ? "msg-error" : "msg-success"}`}>
            {statusMsg.text}
          </div>
        )}

        {step === 1 && (
          <>
            <input
              className="forgot-input"
              type="email"
              placeholder="Email Address"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
            <button className="forgot-btn" onClick={handleSendOtp} disabled={loading}>
              {loading ? "Sending..." : "Send OTP"}
            </button>
          </>
        )}

        {step === 2 && (
          <>
            <input
              className="forgot-input"
              type="text"
              inputMode="numeric"
              placeholder="Enter 6-digit OTP"
              value={otp}
              onChange={(e) => setOtp(e.target.value)}
            />
            <button className="forgot-btn" onClick={handleVerifyOtp} disabled={loading}>
              {loading ? "Verifying..." : "Verify OTP"}
            </button>
            <div className="resend-container">
              <span>Didn't receive it? </span>
              <button
                className="link-text-btn"
                onClick={handleResendOtp}
                disabled={timer > 0 || loading}
              >
                {timer > 0 ? `Resend in ${timer}s` : "Resend Now"}
              </button>
            </div>
          </>
        )}

        {step === 3 && (
          <>
            <input
              className="forgot-input"
              type="password"
              placeholder="New Password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
            />
            <input
              className="forgot-input"
              type="password"
              placeholder="Confirm New Password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
            />
            <button className="forgot-btn" onClick={handleResetPassword} disabled={loading}>
              {loading ? "Updating..." : "Update Password"}
            </button>
          </>
        )}
      </div>
    </div>
  );
}

export default ForgotPassword;