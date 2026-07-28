import { useState } from "react";
import { useAuth } from "./AuthContext";
import API from "../services/api";

export default function TrafficForm({ onSuccess }) {
  const { user } = useAuth();
  const [location, setLocation] = useState("");
  const [roadName, setRoadName] = useState("");
  const [latitude, setLatitude] = useState("");
  const [longitude, setLongitude] = useState("");
  const [vehicleCount, setVehicleCount] = useState("");
  const [capacity, setCapacity] = useState("150");
  const [averageSpeed, setAverageSpeed] = useState("45");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);

  const isAuthorized = user && (user.role === "admin" || user.role === "operator");

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (!isAuthorized) {
      setError("Access denied. Only Operators and Administrators can add segments.");
      return;
    }

    setLoading(true);

    try {
      await API.post("/traffic/", {
        location,
        road_name: roadName,
        latitude: parseFloat(latitude),
        longitude: parseFloat(longitude),
        vehicle_count: parseInt(vehicleCount),
        capacity: parseInt(capacity),
        average_speed: parseFloat(averageSpeed),
      });

      setSuccess("Traffic segment logged successfully!");
      setLocation("");
      setRoadName("");
      setLatitude("");
      setLongitude("");
      setVehicleCount("");
      if (onSuccess) onSuccess();
    } catch (err) {
      setError(err.response?.data?.detail || "Failed to log telemetry. Try again.");
    } finally {
      setLoading(false);
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
      <h3 style={{ fontSize: "16px", fontWeight: "700", margin: "0 0 4px 0" }}>Ingest Telemetry Segment</h3>
      <p style={{ margin: "0 0 16px 0", color: "#94a3b8", fontSize: "12px" }}>Submit new roadway node to the adaptive ML engine.</p>

      {error && <div style={{ background: "rgba(239, 68, 68, 0.15)", color: "#f87171", padding: "10px 14px", borderRadius: "6px", fontSize: "12px", marginBottom: "16px" }}>{error}</div>}
      {success && <div style={{ background: "rgba(16, 185, 129, 0.15)", color: "#34d399", padding: "10px 14px", borderRadius: "6px", fontSize: "12px", marginBottom: "16px" }}>{success}</div>}

      <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
        <div>
          <label style={{ display: "block", fontSize: "11px", color: "#94a3b8", textTransform: "uppercase", fontWeight: "600", marginBottom: "6px" }}>Location / City Name</label>
          <input
            type="text"
            placeholder="e.g. Sector 5, Kolkata"
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            style={{
              width: "100%",
              padding: "10px 14px",
              background: "#0f172a",
              border: "1px solid rgba(255,255,255,0.08)",
              borderRadius: "8px",
              color: "#f8fafc",
              outline: "none"
            }}
            required
          />
        </div>

        <div>
          <label style={{ display: "block", fontSize: "11px", color: "#94a3b8", textTransform: "uppercase", fontWeight: "600", marginBottom: "6px" }}>Roadway Identity</label>
          <input
            type="text"
            placeholder="e.g. Bypass Expressway"
            value={roadName}
            onChange={(e) => setRoadName(e.target.value)}
            style={{
              width: "100%",
              padding: "10px 14px",
              background: "#0f172a",
              border: "1px solid rgba(255,255,255,0.08)",
              borderRadius: "8px",
              color: "#f8fafc",
              outline: "none"
            }}
            required
          />
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
          <div>
            <label style={{ display: "block", fontSize: "11px", color: "#94a3b8", textTransform: "uppercase", fontWeight: "600", marginBottom: "6px" }}>Latitude</label>
            <input
              type="number"
              step="any"
              placeholder="e.g. 22.572"
              value={latitude}
              onChange={(e) => setLatitude(e.target.value)}
              style={{
                width: "100%",
                padding: "10px 14px",
                background: "#0f172a",
                border: "1px solid rgba(255,255,255,0.08)",
                borderRadius: "8px",
                color: "#f8fafc",
                outline: "none"
              }}
              required
            />
          </div>

          <div>
            <label style={{ display: "block", fontSize: "11px", color: "#94a3b8", textTransform: "uppercase", fontWeight: "600", marginBottom: "6px" }}>Longitude</label>
            <input
              type="number"
              step="any"
              placeholder="e.g. 88.363"
              value={longitude}
              onChange={(e) => setLongitude(e.target.value)}
              style={{
                width: "100%",
                padding: "10px 14px",
                background: "#0f172a",
                border: "1px solid rgba(255,255,255,0.08)",
                borderRadius: "8px",
                color: "#f8fafc",
                outline: "none"
              }}
              required
            />
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "12px" }}>
          <div>
            <label style={{ display: "block", fontSize: "11px", color: "#94a3b8", textTransform: "uppercase", fontWeight: "600", marginBottom: "6px" }}>Vehicle Ingress</label>
            <input
              type="number"
              placeholder="50"
              value={vehicleCount}
              onChange={(e) => setVehicleCount(e.target.value)}
              style={{
                width: "100%",
                padding: "10px 14px",
                background: "#0f172a",
                border: "1px solid rgba(255,255,255,0.08)",
                borderRadius: "8px",
                color: "#f8fafc",
                outline: "none"
              }}
              required
            />
          </div>

          <div>
            <label style={{ display: "block", fontSize: "11px", color: "#94a3b8", textTransform: "uppercase", fontWeight: "600", marginBottom: "6px" }}>Lane Capacity</label>
            <input
              type="number"
              value={capacity}
              onChange={(e) => setCapacity(e.target.value)}
              style={{
                width: "100%",
                padding: "10px 14px",
                background: "#0f172a",
                border: "1px solid rgba(255,255,255,0.08)",
                borderRadius: "8px",
                color: "#f8fafc",
                outline: "none"
              }}
              required
            />
          </div>

          <div>
            <label style={{ display: "block", fontSize: "11px", color: "#94a3b8", textTransform: "uppercase", fontWeight: "600", marginBottom: "6px" }}>Speed (km/h)</label>
            <input
              type="number"
              value={averageSpeed}
              onChange={(e) => setAverageSpeed(e.target.value)}
              style={{
                width: "100%",
                padding: "10px 14px",
                background: "#0f172a",
                border: "1px solid rgba(255,255,255,0.08)",
                borderRadius: "8px",
                color: "#f8fafc",
                outline: "none"
              }}
              required
            />
          </div>
        </div>

        <button type="submit" disabled={loading} style={{
          background: isAuthorized ? "#3b82f6" : "#475569",
          color: "#ffffff",
          border: "none",
          padding: "12px",
          borderRadius: "8px",
          fontWeight: "600",
          cursor: isAuthorized ? "pointer" : "not-allowed",
          boxShadow: isAuthorized ? "0 4px 6px -1px rgba(59, 130, 246, 0.2)" : "none",
          marginTop: "8px"
        }}>
          {loading ? "Ingesting..." : isAuthorized ? "Ingest Segment" : "Operator Access Only"}
        </button>
      </form>
    </div>
  );
}
