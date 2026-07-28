import { FaTachometerAlt, FaTrafficLight, FaVideo, FaExclamationTriangle, FaChartBar, FaFileAlt, FaCog } from "react-icons/fa";

function Sidebar() {
  return (
    <div
      style={{
        width: "240px",
        height: "100vh",
        background: "#1f2937",
        color: "white",
        padding: "20px",
        position: "fixed",
        left: 0,
        top: 0,
      }}
    >
      <h2 style={{ textAlign: "center", marginBottom: "30px" }}>
        TrafficVision AI
      </h2>

      <ul style={{ listStyle: "none", padding: 0 }}>
        <li style={itemStyle}>
          <FaTachometerAlt /> Dashboard
        </li>

        <li style={itemStyle}>
          <FaTrafficLight /> Live Traffic
        </li>

        <li style={itemStyle}>
          <FaTrafficLight /> Traffic Signals
        </li>

        <li style={itemStyle}>
          <FaVideo /> Camera Feeds
        </li>

        <li style={itemStyle}>
          <FaExclamationTriangle /> Incidents
        </li>

        <li style={itemStyle}>
          <FaChartBar /> Analytics
        </li>

        <li style={itemStyle}>
          <FaFileAlt /> Reports
        </li>

        <li style={itemStyle}>
          <FaCog /> Settings
        </li>
      </ul>
    </div>
  );
}

const itemStyle = {
  display: "flex",
  alignItems: "center",
  gap: "12px",
  padding: "14px",
  marginBottom: "10px",
  background: "#374151",
  borderRadius: "8px",
  cursor: "pointer",
};

export default Sidebar;