import { useState } from "react";
import { Link } from "react-router-dom";
import "../styles/forgotpassword.css";

export default function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");

  const handleSubmit = (e) => {
    e.preventDefault();
    setMessage("If your account is registered, a reset email has been sent.");
  };

  return (
    <div className="forgot-container">
      <div className="forgot-card">
        <h2>Reset Password</h2>
        <p className="subtitle">Enter your email to retrieve access credentials</p>

        {message && <div className="success-alert">{message}</div>}

        <form onSubmit={handleSubmit}>
          <div className="input-group">
            <label htmlFor="email">Email Address</label>
            <input
              id="email"
              type="email"
              placeholder="e.g. name@agency.gov"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>

          <button type="submit">Send Reset Instructions</button>
        </form>

        <p className="auth-redirect">
          Remember your credentials? <Link to="/">Login</Link>
        </p>
      </div>
    </div>
  );
}
