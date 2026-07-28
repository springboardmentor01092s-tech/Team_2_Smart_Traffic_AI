import { FaMapMarkerAlt, FaTachometerAlt, FaExclamationTriangle, FaBell } from "react-icons/fa";
import "../styles/KPICards.css";

export default function KPICards({ trafficData = [] }) {
  // Calculations
  const totalLocations = trafficData.length;
  const avgSpeed = totalLocations > 0 
    ? Math.round(trafficData.reduce((acc, item) => acc + item.average_speed, 0) / totalLocations) 
    : 0;
  
  const congestedPoints = trafficData.filter(
    item => item.congestion_level === "High" || item.congestion_level === "Critical"
  ).length;

  const criticalIngresses = trafficData.filter(
    item => item.congestion_level === "Critical"
  ).length;

  const cards = [
    {
      title: "Monitored Zones",
      value: totalLocations,
      icon: <FaMapMarkerAlt />,
      color: "#3b82f6",
      desc: "Active coordinate nodes"
    },
    {
      title: "Average Network Speed",
      value: `${avgSpeed} km/h`,
      icon: <FaTachometerAlt />,
      color: "#10b981",
      desc: "Optimized speed index"
    },
    {
      title: "Congested Points",
      value: congestedPoints,
      icon: <FaExclamationTriangle />,
      color: "#ea580c",
      desc: "High/Critical level"
    },
    {
      title: "Critical Ingresses",
      value: criticalIngresses,
      icon: <FaBell />,
      color: "#ef4444",
      desc: "Requires response action"
    }
  ];

  return (
    <div className="kpi-container">
      {cards.map((card, index) => (
        <div key={index} className="kpi-card">
          <div className="kpi-icon" style={{ backgroundColor: `rgba(${card.color === "#3b82f6" ? "59, 130, 246" : card.color === "#10b981" ? "16, 185, 129" : card.color === "#ea580c" ? "234, 88, 12" : "239, 68, 116"}, 0.15)`, color: card.color }}>
            {card.icon}
          </div>
          <div className="kpi-details">
            <h3>{card.value}</h3>
            <span className="title">{card.title}</span>
            <span className="desc">{card.desc}</span>
          </div>
        </div>
      ))}
    </div>
  );
}
