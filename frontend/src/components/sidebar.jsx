import { useNavigate } from "react-router-dom";
import { useAuth } from "./AuthContext";
import {
  FaTachometerAlt,
  FaRoad,
  FaTrafficLight,
  FaVideo,
  FaExclamationTriangle,
  FaChartBar,
  FaFileAlt,
  FaCog,
  FaSignOutAlt
} from "react-icons/fa";

import "../styles/sidebar.css";

export default function Sidebar({ activeTab = "dashboard", setActiveTab }) {
  const { logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate("/");
  };

  const menuItems = [
    { id: "dashboard", label: "Dashboard", icon: <FaTachometerAlt /> },
    { id: "live", label: "Live Traffic", icon: <FaRoad /> },
    { id: "signals", label: "Signals Hub", icon: <FaTrafficLight /> },
    { id: "cameras", label: "Camera Nodes", icon: <FaVideo /> },
    { id: "incidents", label: "Incidents", icon: <FaExclamationTriangle /> },
    { id: "analytics", label: "Analytics", icon: <FaChartBar /> },
    { id: "reports", label: "Reports", icon: <FaFileAlt /> },
    { id: "settings", label: "Settings", icon: <FaCog /> }
  ];

  return (
    <aside className="sidebar">
      <div className="logo">
        <div className="logo-circle">🚦</div>
        <div>
          <h2>TrafficVision AI</h2>
          <span>Operations Console</span>
        </div>
      </div>

      <ul className="menu">
        {menuItems.map((item) => (
          <li
            key={item.id}
            className={activeTab === item.id ? "active" : ""}
            onClick={() => setActiveTab && setActiveTab(item.id)}
          >
            {item.icon} {item.label}
          </li>
        ))}
      </ul>

      <button className="logout-btn" onClick={handleLogout}>
        <FaSignOutAlt />
        Logout
      </button>
    </aside>
  );
}
