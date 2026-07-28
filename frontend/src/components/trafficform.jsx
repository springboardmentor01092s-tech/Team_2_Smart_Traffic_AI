import { useState } from "react";
import API from "../services/api";

function TrafficForm({ onSuccess }) {
  const [location, setLocation] = useState("");
  const [vehicleCount, setVehicleCount] = useState("");
  const [congestionLevel, setCongestionLevel] = useState("Low");

  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      await API.post("/traffic/", {
        location,
        vehicle_count: Number(vehicleCount),
        congestion_level: congestionLevel,
      });

      alert("Traffic Added Successfully!");

      setLocation("");
      setVehicleCount("");
      setCongestionLevel("Low");

      if (onSuccess) {
        onSuccess();
      }
    } catch (err) {
      console.log(err);
      alert("Error adding traffic.");
    }
  };

  return (
    <div
      style={{
        background: "#fff",
        padding: "20px",
        borderRadius: "10px",
        marginTop: "20px",
        boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
      }}
    >
      <h2>Add Traffic Data</h2>

      <form onSubmit={handleSubmit}>
        <input
          type="text"
          placeholder="Location"
          value={location}
          onChange={(e) => setLocation(e.target.value)}
          required
          style={{
            width: "100%",
            padding: "10px",
            marginBottom: "10px",
          }}
        />

        <input
          type="number"
          placeholder="Vehicle Count"
          value={vehicleCount}
          onChange={(e) => setVehicleCount(e.target.value)}
          required
          style={{
            width: "100%",
            padding: "10px",
            marginBottom: "10px",
          }}
        />

        <select
          value={congestionLevel}
          onChange={(e) => setCongestionLevel(e.target.value)}
          style={{
            width: "100%",
            padding: "10px",
            marginBottom: "15px",
          }}
        >
          <option>Low</option>
          <option>Medium</option>
          <option>High</option>
        </select>

        <button
          type="submit"
          style={{
            width: "100%",
            padding: "12px",
            background: "#2563eb",
            color: "white",
            border: "none",
            borderRadius: "8px",
            cursor: "pointer",
          }}
        >
          Add Traffic
        </button>
      </form>
    </div>
  );
}

export default TrafficForm;