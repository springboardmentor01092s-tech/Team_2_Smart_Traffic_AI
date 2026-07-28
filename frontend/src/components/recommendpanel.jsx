import { FaLightbulb, FaTrafficLight, FaCheckCircle } from "react-icons/fa";
import "../styles/recommendpanel.css";

export default function RecommendPanel({ trafficData = [] }) {
  const recommendations = trafficData
    .filter((item) => item.congestion_level === "Critical" || item.congestion_level === "High")
    .map((item) => {
      let greenExtension = 15;
      let action = "Extend Green Light Phase";
      if (item.congestion_level === "Critical") {
        greenExtension = 30;
        action = "Initiate Express Green Wave Bypass";
      }

      return {
        id: item.id,
        location: item.location,
        roadName: item.road_name,
        action,
        value: `+${greenExtension}s Green Light Offset`,
        reason: `Density ratio exceeding safety thresholds (${item.vehicle_count}/${item.capacity} capacity)`,
      };
    });

  return (
    <div className="recommend-panel">
      <div className="panel-header">
        <FaLightbulb className="panel-icon" />
        <h3>Adaptive Timing Advice</h3>
      </div>

      <div className="recommendations-list">
        {recommendations.length === 0 ? (
          <div className="empty-recommendations">
            <FaCheckCircle style={{ color: "#10b981", fontSize: "20px" }} />
            <p>Junction splits are optimized. All segments normal.</p>
          </div>
        ) : (
          recommendations.map((rec) => (
            <div key={rec.id} className="recommend-card">
              <div className="rec-badge">
                <FaTrafficLight />
                <span>{rec.value}</span>
              </div>
              <h4>{rec.location}</h4>
              <span className="road">{rec.roadName}</span>
              <p className="action-step">Action: <strong>{rec.action}</strong></p>
              <p className="reason">{rec.reason}</p>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
