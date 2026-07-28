import { FaBell, FaInfoCircle } from "react-icons/fa";
import "../styles/alertpanel.css";

export default function AlertPanel({ trafficData = [] }) {
  const alerts = trafficData.filter(
    (item) => item.congestion_level === "Critical" || item.congestion_level === "High"
  );

  return (
    <div className="alert-panel">
      <div className="panel-header">
        <FaBell className="panel-icon" />
        <h3>Operations Dispatch Feed</h3>
      </div>

      <div className="alerts-list">
        {alerts.length === 0 ? (
          <div className="empty-alerts">
            <FaInfoCircle />
            <p>No active bottlenecks logged across segments.</p>
          </div>
        ) : (
          alerts.map((item) => (
            <div
              key={item.id}
              className={`alert-card ${item.congestion_level.toLowerCase()}`}
            >
              <div className="alert-badge">
                {item.congestion_level}
              </div>
              <div className="alert-content">
                <h4>{item.location}</h4>
                <p>Roadway: {item.road_name}</p>
                <div className="meta">
                  <span>Vehicles: {item.vehicle_count}</span>
                  <span>Speed: {item.average_speed} km/h</span>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
