import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import API from "../services/api";

function Login() {
  const navigate = useNavigate();

  const [form, setForm] = useState({
    email: "",
    password: "",
  });

  const handleChange = (e) => {
    setForm({
      ...form,
      [e.target.name]: e.target.value,
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      const response = await API.post("/login", form);

      localStorage.setItem("token", response.data.access_token);

      alert("Login Successful!");

      navigate("/dashboard");
    } catch (error) {
      alert("Invalid Email or Password");
      console.error(error);
    }
  };

  return (
    <div style={{ padding: "40px" }}>
      <h2>Login</h2>

      <form onSubmit={handleSubmit}>
        <input
          type="email"
          name="email"
          placeholder="Email"
          value={form.email}
          onChange={handleChange}
        />
        <br />
        <br />

        <input
          type="password"
          name="password"
          placeholder="Password"
          value={form.password}
          onChange={handleChange}
        />
        <br />
        <br />

        <button type="submit">Login</button>
      </form>

      <br />

      <Link to="/register">Create Account</Link>
    </div>
  );
}

export default Login;