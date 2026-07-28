import { FaTrash, FaRoad } from "react-icons/fa";
import { useAuth } from "./AuthContext";
import API from "../services/api";

export default function TrafficTable({ trafficData = [], onDeleteSuccess }) {
  const { user } = useAuth();
  const isAdmin = user && user.role === "admin";

  const handleDelete = async (id) => {
    if (!window.confirm("Are you sure you want to delete this segment?")) return;

    try {
      await API.delete(`/traffic/${id}`);
      if (onDeleteSuccess) onDeleteSuccess();
    } catch (err) {
      alert(err.response?.data?.detail || "Failed to delete traffic segment.");
    }
  };

  const getBadgeColor = (level) => {
    switch (level) {
      case "Low":
        return { bg: "rgba(16, 185, 129, 0.15)", color: "#10b981" };
      case "Moderate":
        return { bg: "rgba(245, 158, 11, 0.15)", color: "#f59e0b" };
      case "High":
        return { bg: "rgba(234, 88, 12, 0.15)", color: "#ea580c" };
      case "Critical":
        return { bg: "rgba(239, 68, 68, 0.15)", color: "#ef4444" };
      default:
        return { bg: "rgba(59, 130, 246, 0.15)", color: "#3b82f6" };
    }
  };

  return (
    <div style={{
      background: "#1e293b",
      border: "1px solid rgba(255, 255, 255, 0.05)",
      borderRadius: "12px",
      padding: "24px",
      boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.2)",
      color: "#f8fafc",
      fontFamily: "Inter, sans-serif"
    }}>
      <h3 style={{ fontSize: "16px", fontWeight: "700", margin: "0 0 16px 0", display: "flex", alignItems: "center", gap: "8px" }}>
        <FaRoad style={{ color: "#3b82f6" }} /> Monitored Traffic Corridors
      </h3>

      <div style={{ overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left", fontSize: "13px" }}>
          <thead>
            <tr style={{ borderBottom: "1px solid rgba(255,255,255,0.06)", color: "#94a3b8" }}>
              <th style={{ padding: "12px 8px" }}>Location</th>
              <th style={{ padding: "12px 8px" }}>Roadway</th>
              <th style={{ padding: "12px 8px" }}>Coordinates</th>
              <th style={{ padding: "12px 8px" }}>Density</th>
              <th style={{ padding: "12px 8px" }}>Speed</th>
              <th style={{ padding: "12px 8px" }}>Congestion</th>
              {isAdmin && <th style={{ padding: "12px 8px", textAlign: "center" }}>Actions</th>}
            </tr>
          </thead>
          <tbody>
            {trafficData.length === 0 ? (
              <tr>
                <td colSpan={isAdmin ? 7 : 6} style={{ textAlign: "center", padding: "24px", color: "#64748b" }}>
                  No active traffic corridors found.
                </td>
              </tr>
            ) : (
              trafficData.map((item) => {
                const badge = getBadgeColor(item.congestion_level);
                return (
                  <tr key={item.id} style={{ borderBottom: "1px solid rgba(255,255,255,0.03)", transition: "background 0.2s" }} onMouseEnter={(e) => e.currentTarget.style.background = "rgba(255,255,255,0.01)"} onMouseLeave={(e) => e.currentTarget.style.background = "transparent"}>
                    <td style={{ padding: "14px 8px", fontWeight: "600" }}>{item.location}</td>
                    <td style={{ padding: "14px 8px", color: "#cbd5e1" }}>{item.road_name}</td>
                    <td style={{ padding: "14px 8px", color: "#94a3b8", fontSize: "11px" }}>{item.latitude.toFixed(4)}, {item.longitude.toFixed(4)}</td>
                    <td style={{ padding: "14px 8px" }}><strong>{item.vehicle_count}</strong> / {item.capacity}</td>
                    <td style={{ padding: "14px 8px" }}>{item.average_speed} km/h</td>
                    <td style={{ padding: "14px 8px" }}>
                      <span style={{
                        background: badge.bg,
                        color: badge.color,
                        padding: "2px 8px",
                        borderRadius: "4px",
                        fontSize: "11px",
                        fontWeight: "700",
                        textTransform: "uppercase"
                      }}>{item.congestion_level}</span>
                    </td>
                    {isAdmin && (
                      <td style={{ padding: "14px 8px", textAlign: "center" }}>
                        <button
                          onClick={() => handleDelete(item.id)}
                          style={{
                            background: "rgba(239, 68, 68, 0.1)",
                            border: "none",
                            color: "#ef4444",
                            padding: "6px",
                            borderRadius: "4px",
                            cursor: "pointer"
                          }}
                          title="Delete Segment"
                        >
                          <FaTrash />
                        </button>
                      </td>
                    )}
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
