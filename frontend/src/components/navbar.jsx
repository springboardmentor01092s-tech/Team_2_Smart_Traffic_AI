import { useState, useEffect } from "react";
import { FaSearch, FaBell, FaChevronDown } from "react-icons/fa";
import { useAuth } from "./AuthContext";
import { useNavigate } from "react-router-dom";

import "../styles/navbar.css";

const API_URL = "http://127.0.0.1:8000";

export default function Navbar({ onSelectLocation, trafficData = [] }) {
  const [search, setSearch] = useState("");
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());

  const [showNotifications, setShowNotifications] = useState(false);
  const [showProfileMenu, setShowProfileMenu] = useState(false);

  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const displayUser = user || {
    fullName: "Guest User",
    email: "guest@agency.gov",
    role: "commuter"
  };

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const searchTraffic = async (value) => {
    if (!value.trim()) {
      setResults([]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const response = await fetch(
        `${API_URL}/search?q=${encodeURIComponent(value)}`
      );

      if (!response.ok) {
        throw new Error("Failed to fetch search results");
      }

      const data = await response.json();
      setResults(data);
    } catch (error) {
      console.error("Search Error:", error);
      setResults([]);
    } finally {
      setLoading(false);
    }
  };

  const handleSearchChange = (e) => {
    const value = e.target.value;
    setSearch(value);
    searchTraffic(value);
  };

  const handleLogout = () => {
    logout();
    navigate("/");
  };

  const date = currentTime.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });

  const time = currentTime.toLocaleTimeString("en-IN", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });

  // Calculate active notifications (High/Critical warnings)
  const criticalAlerts = (trafficData || []).filter(
    (item) => item.congestion_level === "Critical" || item.congestion_level === "High"
  );

  return (
    <header className="navbar">
      {/* Search */}
      <div className="search-box">
        <FaSearch className="search-icon" />
        <input
          type="text"
          placeholder="Search traffic location..."
          value={search}
          onChange={handleSearchChange}
        />

        {search.trim() !== "" && (
          <div className="search-dropdown">
            {loading ? (
              <div className="search-item">Searching...</div>
            ) : results.length === 0 ? (
              <div className="search-item">No Results Found</div>
            ) : (
              results.map((item) => (
                <div
                  key={item.id}
                  className="search-item"
                  onClick={() => {
                    setSearch(item.location);
                    setResults([]);
                    if (onSelectLocation) {
                      onSelectLocation([item.latitude, item.longitude]);
                    }
                  }}
                >
                  <strong>{item.location}</strong>
                  <div className="search-details">
                    Roadway: {item.road_name}
                  </div>
                  <div className="search-details">
                    Congestion: {item.congestion_level}
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>

      {/* Date & Time */}
      <div className="date-time">
        <div className="date-card">
          <span className="date-label">System Date</span>
          <h4>{date}</h4>
        </div>
        <div className="date-card">
          <span className="date-label">System Time</span>
          <h4>{time}</h4>
        </div>
      </div>

      {/* Right User Card / Dropdowns */}
      <div className="navbar-right">
        {/* Notifications Icon and Dropdown */}
        <div style={{ position: "relative" }}>
          <div 
            className="notification" 
            onClick={() => {
              setShowNotifications(!showNotifications);
              setShowProfileMenu(false);
            }}
          >
            <FaBell />
            {criticalAlerts.length > 0 && (
              <span className="badge">{criticalAlerts.length}</span>
            )}
          </div>

          {showNotifications && (
            <div className="dropdown-menu notification-dropdown">
              <h4>Active Congestion Alerts</h4>
              {criticalAlerts.length === 0 ? (
                <div className="dropdown-item empty">No active alerts</div>
              ) : (
                criticalAlerts.map((alert) => (
                  <div 
                    key={alert.id} 
                    className="dropdown-item alert-item"
                    onClick={() => {
                      if (onSelectLocation) {
                        onSelectLocation([alert.latitude, alert.longitude]);
                      }
                      setShowNotifications(false);
                    }}
                  >
                    <strong>{alert.location}</strong>: {alert.road_name}
                    <div style={{ fontSize: "10px", color: "#f87171", marginTop: "2.5px" }}>
                      🚨 {alert.congestion_level} Congestion detected
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </div>

        {/* Profile Info and Dropdown */}
        <div style={{ position: "relative" }}>
          <div 
            className="profile" 
            onClick={() => {
              setShowProfileMenu(!showProfileMenu);
              setShowNotifications(false);
            }}
          >
            <div className="avatar">
              {displayUser.fullName
                ? displayUser.fullName.charAt(0).toUpperCase()
                : "U"}
            </div>
            <div className="profile-info">
              <h4>{displayUser.fullName}</h4>
              <p>{displayUser.role}</p>
            </div>
            <FaChevronDown className="down-icon" />
          </div>

          {showProfileMenu && (
            <div className="dropdown-menu profile-dropdown">
              <div className="profile-header">
                <strong>{displayUser.fullName}</strong>
                <span>{displayUser.email}</span>
                <span className="role-badge">{displayUser.role}</span>
              </div>
              <hr className="divider" />
              <button className="dropdown-item logout" onClick={handleLogout}>
                Sign Out
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
