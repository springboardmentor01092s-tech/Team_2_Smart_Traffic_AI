import { useState } from "react";

import Sidebar from "../components/sidebar";
import Header from "../components/header";
import StatsCards from "../components/statscards";
import MapView from "../components/mapview";
import Alerts from "../components/alerts";
import Recommendations from "../components/recommendations";
import TrafficForm from "../components/trafficform";
import TrafficTable from "../components/traffictable";

function Dashboard() {
  const [refresh, setRefresh] = useState(false);

  const refreshTable = () => {
    setRefresh(!refresh);
  };

  return (
    <div
      style={{
        display: "flex",
        background: "#f3f4f6",
        minHeight: "100vh",
      }}
    >
      <Sidebar />

      <div
        style={{
          flex: 1,
          marginLeft: "240px",
          padding: "20px",
        }}
      >
        <Header />

        <div style={{ marginBottom: "20px" }}>
          <h1>TrafficVision AI Dashboard</h1>
          <p>Smart Traffic Prediction & Congestion Monitoring System</p>
        </div>

        <StatsCards />

        <MapView />

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: "20px",
            marginTop: "20px",
          }}
        >
          <Alerts />
          <Recommendations />
        </div>

        <TrafficForm onSuccess={refreshTable} />

        <TrafficTable refresh={refresh} />
      </div>
    </div>
  );
}

export default Dashboard;