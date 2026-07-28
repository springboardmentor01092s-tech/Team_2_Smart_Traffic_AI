import { FaFilePdf, FaClock } from "react-icons/fa";

export default function PredictionReports({ trafficData = [] }) {
  const criticalCount = trafficData.filter(item => item.congestion_level === "Critical").length;
  const highCount = trafficData.filter(item => item.congestion_level === "High").length;
  
  const handlePrint = () => {
    window.print();
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
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "16px" }}>
        <div>
          <h3 style={{ fontSize: "16px", fontWeight: "700", margin: "0 0 4px 0" }}>Congestion Forecast Report</h3>
          <span style={{ fontSize: "11px", color: "#94a3b8" }}>System-wide predictive warnings report</span>
        </div>
        <button
          onClick={handlePrint}
          style={{
            background: "rgba(59, 130, 246, 0.1)",
            border: "1px solid rgba(59, 130, 246, 0.2)",
            borderRadius: "6px",
            color: "#3b82f6",
            padding: "6px 12px",
            fontSize: "11px",
            fontWeight: "700",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            gap: "6px"
          }}
        >
          <FaFilePdf /> Export PDF
        </button>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: "12px", background: "rgba(255,255,255,0.02)", padding: "10px 14px", borderRadius: "6px" }}>
          <span>Critical Hotspots Detected:</span>
          <strong style={{ color: "#ef4444" }}>{criticalCount} locations</strong>
        </div>

        <div style={{ display: "flex", justifyContent: "space-between", fontSize: "12px", background: "rgba(255,255,255,0.02)", padding: "10px 14px", borderRadius: "6px" }}>
          <span>High Ingress Bottlenecks:</span>
          <strong style={{ color: "#ea580c" }}>{highCount} locations</strong>
        </div>

        <div style={{
          marginTop: "6px",
          fontSize: "11px",
          color: "#94a3b8",
          display: "flex",
          alignItems: "center",
          gap: "6px",
          background: "rgba(59, 130, 246, 0.05)",
          padding: "10px",
          borderRadius: "6px",
          border: "1px solid rgba(59, 130, 246, 0.1)"
        }}>
          <FaClock style={{ color: "#3b82f6" }} />
          <span>Model recalculates predictions dynamically on hourly slider intervals.</span>
        </div>
      </div>
    </div>
  );
}
