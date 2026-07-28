import { useState, useEffect, useCallback } from "react";
import Sidebar from "../components/sidebar";
import Navbar from "../components/navbar";
import KPICards from "../components/KPICards";
import TrafficMap from "../components/trafficmap";
import AlertPanel from "../components/alertpanel";
import RecommendPanel from "../components/recommendpanel";
import TrafficForm from "../components/trafficform";
import TrafficTable from "../components/traffictable";
import TravelEstimator from "../components/travel_estimator";
import PredictionReports from "../components/prediction_reports";
import API from "../services/api";

import "../styles/dashboard.css";

export default function Dashboard() {
  const [trafficData, setTrafficData] = useState([]);
  const [forecastHour, setForecastHour] = useState(null); // null means LIVE Mode
  const [activeTab, setActiveTab] = useState("dashboard"); // active tab state
  const [loading, setLoading] = useState(true);
  const [simulating, setSimulating] = useState(false);
  const [focusedLocation, setFocusedLocation] = useState(null);

  const [forecastData, setForecastData] = useState([]);
  const displayData = forecastHour === null ? trafficData : forecastData;

  const fetchTraffic = useCallback(async () => {
    try {
      const response = await API.get("/traffic/");
      setTrafficData(response.data);
    } catch (error) {
      console.error("Error fetching traffic:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchTraffic();
    }, 0);
    return () => clearInterval(timer);
  }, [fetchTraffic]);

  // Handle predictions hour slider changes
  useEffect(() => {
    if (forecastHour !== null) {
      const fetchForecast = async () => {
        try {
          const response = await API.get(`/traffic/predict?hour=${forecastHour}`);
          setForecastData(response.data);
        } catch (error) {
          console.error("Error fetching forecast:", error);
        }
      };
      fetchForecast();
    }
  }, [forecastHour]);

  const handleSimulate = async () => {
    try {
      setSimulating(true);
      const response = await API.post("/traffic/simulate");
      alert(response.data.message || "Simulated traffic fluctuations successfully!");
      fetchTraffic();
    } catch (error) {
      console.error("Error running simulation:", error);
      alert("Failed to run traffic simulation.");
    } finally {
      setSimulating(false);
    }
  };

  if (loading) {
    return (
      <div style={{
        display: "flex",
        height: "100vh",
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: "#0f172a",
        color: "#ffffff",
        fontFamily: "Inter, sans-serif"
      }}>
        <h2>Loading Operations System Dashboard...</h2>
      </div>
    );
  }

  // Render content based on selected sidebar tab
  const renderTabContent = () => {
    switch (activeTab) {
      case "live":
        return (
          <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
            <div style={{
              background: "#1e293b",
              padding: "20px 24px",
              borderRadius: "12px",
              border: "1px solid rgba(255, 255, 255, 0.05)"
            }}>
              <h2 style={{ margin: "0 0 4px 0", color: "#f8fafc", fontSize: "20px" }}>Live Traffic Ingress & Maps</h2>
              <p style={{ margin: "0", color: "#94a3b8", fontSize: "13px" }}>Plot nodes on the GIS tracker, ingest database coordinates, and manage active segments.</p>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1.8fr 1fr", gap: "24px" }}>
              <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
                <TrafficMap trafficData={trafficData} focusedLocation={focusedLocation} />
                <TrafficTable trafficData={trafficData} onDeleteSuccess={fetchTraffic} />
              </div>
              <div style={{ display: "flex", flexDirection: "column" }}>
                <TrafficForm onSuccess={fetchTraffic} />
              </div>
            </div>
          </div>
        );

      case "signals":
        return (
          <div className="tab-placeholder-card">
            <h2>Signals Hub</h2>
            <p className="subtitle">Real-time adaptive smart light split controls</p>
            <div className="placeholder-details">
              <span className="icon-badge">🚦</span>
              <h3>Adaptive Offsets Active</h3>
              <p>Green light duration extensions are automatically fed to local controllers based on live congestion weights.</p>
            </div>
          </div>
        );

      case "cameras":
        return (
          <div className="tab-placeholder-card">
            <h2>Camera Nodes</h2>
            <p className="subtitle">High definition CCTV and video analytical feeds</p>
            <div className="placeholder-details">
              <span className="icon-badge">📹</span>
              <h3>Video Analytics Processing</h3>
              <p>Automatic vehicle classification and counting active on all primary ingress cameras.</p>
            </div>
          </div>
        );

      case "incidents":
        return (
          <div className="tab-placeholder-card">
            <h2>Incidents Feed</h2>
            <p className="subtitle">Logged road blocks, construction alerts, and safety events</p>
            <div className="placeholder-details">
              <span className="icon-badge">⚠️</span>
              <h3>No Major Incidents Reported</h3>
              <p>Emergency dispatch loops normal. Operations console monitoring standard flows.</p>
            </div>
          </div>
        );

      case "analytics":
        return (
          <div className="tab-placeholder-card">
            <h2>System Analytics</h2>
            <p className="subtitle">Congestion charts, speed trends, and bottleneck historical logs</p>
            <div className="placeholder-details">
              <span className="icon-badge">📈</span>
              <h3>Historical Congestion Mapping</h3>
              <p>Access speed and vehicle count logs from last 30 days to optimize corridor lanes.</p>
            </div>
          </div>
        );

      case "reports":
        return (
          <div className="tab-placeholder-card">
            <h2>Reports Dispatch</h2>
            <p className="subtitle">Exported logs, forecast printouts, and operations worksheets</p>
            <div className="placeholder-details">
              <span className="icon-badge">📄</span>
              <h3>PDF Exporters Online</h3>
              <p>Ready to compile hourly congestion forecast summaries for metropolitan planners.</p>
            </div>
          </div>
        );

      case "settings":
        return (
          <div className="tab-placeholder-card">
            <h2>Console Settings</h2>
            <p className="subtitle">Manage user permission roles, GIS maps sources, and AI thresholds</p>
            <div className="placeholder-details">
              <span className="icon-badge">⚙️</span>
              <h3>System Configurations</h3>
              <p>Adjust vehicle capacity factors, ML trigger intervals, and operations notification lists.</p>
            </div>
          </div>
        );

      case "dashboard":
      default:
        return (
          <>
            {/* Dashboard Control Header */}
            <div style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              margin: "0 0 24px 0",
              background: "#1e293b",
              padding: "20px 24px",
              borderRadius: "12px",
              boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.3)",
              border: "1px solid rgba(255, 255, 255, 0.05)"
            }}>
              <div>
                <h2 style={{ margin: "0 0 4px 0", color: "#f8fafc", fontSize: "20px" }}>Traffic Operations Command</h2>
                <p style={{ margin: "0", color: "#94a3b8", fontSize: "13px" }}>Monitor live congestion profiles, dispatch alerts, and optimize signal durations.</p>
              </div>
              
              <div style={{ display: "flex", alignItems: "center", gap: "24px" }}>
                {/* Hour forecast slider */}
                <div style={{ display: "flex", alignItems: "center", gap: "12px", background: "rgba(255,255,255,0.02)", padding: "8px 16px", borderRadius: "8px", border: "1px solid rgba(255,255,255,0.04)" }}>
                  <label style={{ color: "#94a3b8", fontSize: "12px", fontWeight: "600", textTransform: "uppercase" }}>AI Forecast Hour:</label>
                  <input
                    type="range"
                    min="-1"
                    max="23"
                    value={forecastHour === null ? -1 : forecastHour}
                    onChange={(e) => {
                      const val = parseInt(e.target.value);
                      setForecastHour(val === -1 ? null : val);
                    }}
                    style={{ cursor: "pointer", width: "120px" }}
                  />
                  <span style={{ color: "#3b82f6", fontWeight: "bold", fontSize: "13px", minWidth: "80px", textAlign: "right" }}>
                    {forecastHour === null ? "LIVE Mode" : `${forecastHour === 0 ? "12 AM" : forecastHour === 12 ? "12 PM" : forecastHour > 12 ? `${forecastHour - 12} PM` : `${forecastHour} AM`}`}
                  </span>
                </div>

                <button
                  onClick={handleSimulate}
                  disabled={simulating}
                  style={{
                    padding: "10px 20px",
                    background: "#ea580c",
                    color: "#ffffff",
                    border: "none",
                    borderRadius: "6px",
                    fontWeight: "bold",
                    cursor: "pointer",
                    boxShadow: "0 2px 4px rgba(234, 88, 12, 0.2)"
                  }}
                >
                  {simulating ? "Simulating..." : "Simulate Flow"}
                </button>
              </div>
            </div>

            {/* KPI metrics */}
            <KPICards trafficData={displayData} />

            {/* Main GIS Map and logs grid */}
            <div className="dashboard-grid">
              <div className="map-section">
                <TrafficMap trafficData={displayData} focusedLocation={focusedLocation} />
                <TravelEstimator trafficData={trafficData} />
              </div>

              <div className="side-section">
                <AlertPanel trafficData={displayData} />
                <RecommendPanel trafficData={displayData} />
                <PredictionReports trafficData={trafficData} />
              </div>
            </div>
          </>
        );
    }
  };

  return (
    <div className="dashboard">
      <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} />

      <div className="dashboard-content">
        <Navbar onSelectLocation={setFocusedLocation} trafficData={trafficData} />
        {renderTabContent()}
      </div>
    </div>
  );
}
