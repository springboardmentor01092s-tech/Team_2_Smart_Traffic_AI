import { useState } from "react";
import { FaRoute, FaArrowAltCircleRight, FaExclamationTriangle } from "react-icons/fa";
import API from "../services/api";

export default function TravelEstimator({ trafficData = [] }) {
  const [startNode, setStartNode] = useState("");
  const [endNode, setEndNode] = useState("");
  const [forecastHour, setForecastHour] = useState("null"); // null means LIVE
  const [loading, setLoading] = useState(false);
  const [estimate, setEstimate] = useState(null);
  const [error, setError] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setEstimate(null);

    if (!startNode || !endNode) {
      setError("Please select both a start and destination segment.");
      return;
    }

    if (startNode === endNode) {
      setError("Start and destination coordinates must be distinct.");
      return;
    }

    // Retrieve lat/lng of selected nodes
    const startObj = trafficData.find(item => item.id === parseInt(startNode));
    const endObj = trafficData.find(item => item.id === parseInt(endNode));

    if (!startObj || !endObj) {
      setError("Selected segments could not be found.");
      return;
    }

    setLoading(true);

    try {
      const hParam = forecastHour === "null" ? "" : `&hour=${forecastHour}`;
      const response = await API.get(
        `/traffic/route-estimate?start_lat=${startObj.latitude}&start_lng=${startObj.longitude}&end_lat=${endObj.latitude}&end_lng=${endObj.longitude}${hParam}`
      );
      setEstimate(response.data);
    } catch (err) {
      setError("Failed to compute travel metrics. Please try again.");
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
      fontFamily: "Inter, sans-serif",
      marginTop: "24px"
    }}>
      <h3 style={{ fontSize: "16px", fontWeight: "700", margin: "0 0 4px 0", display: "flex", alignItems: "center", gap: "8px" }}>
        <FaRoute style={{ color: "#3b82f6" }} /> AI Travel Time Estimator
      </h3>
      <p style={{ margin: "0 0 20px 0", color: "#94a3b8", fontSize: "12px" }}>Calculate expected travel ETA and retrieve smart detours utilizing ML speeds.</p>

      {error && <div style={{ background: "rgba(239, 68, 68, 0.15)", color: "#f87171", padding: "10px 14px", borderRadius: "6px", fontSize: "12px", marginBottom: "16px" }}>{error}</div>}

      <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
          <div>
            <label style={{ display: "block", fontSize: "11px", color: "#94a3b8", textTransform: "uppercase", fontWeight: "600", marginBottom: "6px" }}>Start Point</label>
            <select
              value={startNode}
              onChange={e => setStartNode(e.target.value)}
              style={{
                width: "100%",
                padding: "10px 14px",
                background: "#0f172a",
                border: "1px solid rgba(255,255,255,0.08)",
                borderRadius: "8px",
                color: "#f8fafc"
              }}
            >
              <option value="">Select segment...</option>
              {trafficData.map(item => (
                <option key={item.id} value={item.id}>{item.location}</option>
              ))}
            </select>
          </div>

          <div>
            <label style={{ display: "block", fontSize: "11px", color: "#94a3b8", textTransform: "uppercase", fontWeight: "600", marginBottom: "6px" }}>Destination Point</label>
            <select
              value={endNode}
              onChange={e => setEndNode(e.target.value)}
              style={{
                width: "100%",
                padding: "10px 14px",
                background: "#0f172a",
                border: "1px solid rgba(255,255,255,0.08)",
                borderRadius: "8px",
                color: "#f8fafc"
              }}
            >
              <option value="">Select segment...</option>
              {trafficData.map(item => (
                <option key={item.id} value={item.id}>{item.location}</option>
              ))}
            </select>
          </div>
        </div>

        <div>
          <label style={{ display: "block", fontSize: "11px", color: "#94a3b8", textTransform: "uppercase", fontWeight: "600", marginBottom: "6px" }}>Evaluation Hour</label>
          <select
            value={forecastHour}
            onChange={e => setForecastHour(e.target.value)}
            style={{
              width: "100%",
              padding: "10px 14px",
              background: "#0f172a",
              border: "1px solid rgba(255,255,255,0.08)",
              borderRadius: "8px",
              color: "#f8fafc"
            }}
          >
            <option value="null">Live Traffic (Current Node Speed)</option>
            {[...Array(24).keys()].map(h => (
              <option key={h} value={h}>{h === 0 ? "12 AM" : h === 12 ? "12 PM" : h > 12 ? `${h - 12} PM` : `${h} AM`}</option>
            ))}
          </select>
        </div>

        <button type="submit" disabled={loading} style={{
          background: "#3b82f6",
          color: "#ffffff",
          border: "none",
          padding: "12px",
          borderRadius: "8px",
          fontWeight: "600",
          cursor: "pointer",
          marginTop: "4px"
        }}>
          {loading ? "Computing Estimates..." : "Calculate ETA"}
        </button>
      </form>

      {/* Render Estimates Output */}
      {estimate && (
        <div style={{
          marginTop: "20px",
          padding: "16px",
          background: "rgba(255,255,255,0.02)",
          border: "1px solid rgba(255,255,255,0.05)",
          borderRadius: "8px",
          fontSize: "13px"
        }}>
          <h4 style={{ margin: "0 0 12px 0", color: "#f8fafc" }}>Estimated Travel Metrics</h4>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px", marginBottom: "16px" }}>
            <div>Distance: <strong style={{ color: "#3b82f6" }}>{estimate.distance_km} km</strong></div>
            <div>Average Speed: <strong style={{ color: "#3b82f6" }}>{estimate.average_speed_kmh} km/h</strong></div>
            <div>Travel Duration: <strong style={{ color: "#10b981", fontSize: "14px" }}>{estimate.duration_minutes} mins</strong></div>
            <div>Congestion Level: <strong style={{ color: estimate.congestion_status === "Critical" || estimate.congestion_status === "High" ? "#ef4444" : "#10b981" }}>{estimate.congestion_status}</strong></div>
          </div>

          {/* detours recommendation */}
          {estimate.alternative_route ? (
            <div style={{
              background: "rgba(234, 88, 12, 0.08)",
              border: "1px solid rgba(234, 88, 12, 0.2)",
              borderRadius: "6px",
              padding: "12px",
              color: "#fdba74"
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: "8px", fontWeight: "700", marginBottom: "6px" }}>
                <FaExclamationTriangle /> Smart Route Recommendation
              </div>
              <p style={{ margin: "0 0 6px 0", fontSize: "12px" }}>Bypass heavy density via: <strong>{estimate.alternative_route.name}</strong></p>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: "11px" }}>
                <span>Detour Dist: <strong>{estimate.alternative_route.distance_km} km</strong></span>
                <span>Detour ETA: <strong>{estimate.alternative_route.duration_minutes} mins</strong></span>
              </div>
            </div>
          ) : (
            <div style={{ color: "#94a3b8", fontSize: "11px", display: "flex", alignItems: "center", gap: "6px" }}>
              <FaArrowAltCircleRight /> Standard route is clear. No detour necessary.
            </div>
          )}
        </div>
      )}
    </div>
  );
}
