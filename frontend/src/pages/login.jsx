import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../components/AuthContext";
import { FaUser, FaEnvelope, FaLock, FaEye, FaEyeSlash } from "react-icons/fa";
import API from "../services/api";
import "../styles/login.css";

export default function Login() {
  const [isLogin, setIsLogin] = useState(true);
  const [showPassword, setShowPassword] = useState(false);

  // Login inputs
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");

  // Register inputs
  const [regFullName, setRegFullName] = useState("");
  const [regEmail, setRegEmail] = useState("");
  const [regPassword, setRegPassword] = useState("");
  const [regRole, setRegRole] = useState("commuter");

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);

  const { login } = useAuth();
  const navigate = useNavigate();

  const handleLoginSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    setLoading(true);

    try {
      await login(loginEmail, loginPassword);
      navigate("/dashboard");
    } catch (err) {
      setError(err.message || "Invalid email address or password.");
    } finally {
      setLoading(false);
    }
  };

  const handleRegisterSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    setLoading(true);

    try {
      await API.post("/register", {
        full_name: regFullName,
        email: regEmail,
        password: regPassword,
        role: regRole,
      });

      setSuccess("Account registered successfully! Switching to login...");
      setTimeout(() => {
        setIsLogin(true);
        setLoginEmail(regEmail);
        setSuccess("");
      }, 1500);
    } catch (err) {
      setError(err.response?.data?.detail || "Registration failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      {/* Left Branding Panel (Blue theme deep navy gradient) */}
      <div className="auth-left">
        <div className="auth-left-content">
          <div className="logo-container">
            <div className="traffic-logo">
              <span className="logo-icon">🚦</span>
            </div>
          </div>
          
          <h1 className="brand-title">TrafficVision AI</h1>
          
          {isLogin ? (
            <>
              <h2 className="brand-subtitle">
                Smart Traffic Prediction<br />& Congestion Monitoring
              </h2>
              <p className="brand-description">
                AI-powered intelligent traffic management platform for real-time congestion monitoring, traffic analytics and smarter city transportation.
              </p>
              
              <div className="pills-container">
                <div className="pill-item">
                  <span className="pill-emoji">🚦</span> AI Traffic Monitoring
                </div>
                <div className="pill-item">
                  <span className="pill-emoji">📍</span> Live Traffic Analysis
                </div>
                <div className="pill-item">
                  <span className="pill-emoji">📊</span> Smart Dashboard
                </div>
              </div>
            </>
          ) : (
            <>
              <h2 className="brand-subtitle">
                Create Your Account
              </h2>
              <p className="brand-description">
                Register to access the AI-powered Traffic Prediction and Congestion Monitoring System.
              </p>
            </>
          )}
        </div>
      </div>

      {/* Right Form Panel (Cool ice blue/light grey theme) */}
      <div className="auth-right">
        <div className="auth-card">
          {error && <div className="error-alert">{error}</div>}
          {success && <div className="success-alert">{success}</div>}

          {isLogin ? (
            // Login Form
            <form onSubmit={handleLoginSubmit} className="auth-form">
              <h2 className="form-title">Welcome Back</h2>
              <p className="form-subtitle">Login to your administrator account</p>

              <div className="form-group">
                <label className="form-label">Email Address</label>
                <div className="input-with-icon">
                  <FaEnvelope className="input-icon" />
                  <input
                    type="email"
                    placeholder="Enter your email"
                    value={loginEmail}
                    onChange={(e) => setLoginEmail(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Password</label>
                <div className="input-with-icon">
                  <FaLock className="input-icon" />
                  <input
                    type={showPassword ? "text" : "password"}
                    placeholder="Enter your password"
                    value={loginPassword}
                    onChange={(e) => setLoginPassword(e.target.value)}
                    required
                  />
                  <button
                    type="button"
                    className="password-toggle"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? <FaEyeSlash /> : <FaEye />}
                  </button>
                </div>
              </div>

              <div className="form-actions-row">
                <label className="checkbox-container">
                  <input type="checkbox" />
                  <span className="checkbox-label">Remember Me</span>
                </label>
                <a href="#forgot" className="forgot-link">Forgot Password?</a>
              </div>

              <button type="submit" className="submit-btn" disabled={loading}>
                {loading ? "Signing In..." : "Sign In"}
              </button>

              <div className="form-divider">
                <span>OR</span>
              </div>

              <p className="switch-auth-mode">
                Don't have an account?{" "}
                <span className="switch-link" onClick={() => { setIsLogin(false); setError(""); setSuccess(""); }}>
                  Create Account
                </span>
              </p>
            </form>
          ) : (
            // Register Form
            <form onSubmit={handleRegisterSubmit} className="auth-form">
              <h2 className="form-title">Create Account</h2>
              <p className="form-subtitle">Register a new dispatcher account</p>

              <div className="form-group">
                <label className="form-label">Full Name</label>
                <div className="input-with-icon">
                  <FaUser className="input-icon" />
                  <input
                    type="text"
                    placeholder="Enter full name"
                    value={regFullName}
                    onChange={(e) => setRegFullName(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Email</label>
                <div className="input-with-icon">
                  <FaEnvelope className="input-icon" />
                  <input
                    type="email"
                    placeholder="Enter email"
                    value={regEmail}
                    onChange={(e) => setRegEmail(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Password</label>
                <div className="input-with-icon">
                  <FaLock className="input-icon" />
                  <input
                    type={showPassword ? "text" : "password"}
                    placeholder="Create password"
                    value={regPassword}
                    onChange={(e) => setRegPassword(e.target.value)}
                    required
                  />
                  <button
                    type="button"
                    className="password-toggle"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? <FaEyeSlash /> : <FaEye />}
                  </button>
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Role</label>
                <div className="input-with-icon">
                  <select
                    value={regRole}
                    onChange={(e) => setRegRole(e.target.value)}
                    required
                    className="role-select"
                  >
                    <option value="commuter">Commuter</option>
                    <option value="operator">Traffic Operator</option>
                    <option value="admin">Administrator</option>
                  </select>
                </div>
              </div>

              <button type="submit" className="submit-btn" disabled={loading}>
                {loading ? "Registering..." : "Create Account"}
              </button>

              <p className="switch-auth-mode">
                Already have an account?{" "}
                <span className="switch-link" onClick={() => { setIsLogin(true); setError(""); setSuccess(""); }}>
                  Login
                </span>
              </p>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
