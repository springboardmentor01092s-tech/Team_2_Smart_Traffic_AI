function Alerts() {
  const alerts = [
    {
      location: "Park Street",
      message: "Heavy Traffic",
      color: "#ef4444",
    },
    {
      location: "Howrah Bridge",
      message: "Accident Reported",
      color: "#f97316",
    },
    {
      location: "Salt Lake",
      message: "Traffic Flow Normal",
      color: "#22c55e",
    },
  ];

  return (
    <div
      style={{
        background: "#ffffff",
        padding: "20px",
        borderRadius: "12px",
        boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
      }}
    >
      <h2>🚨 Recent Alerts</h2>

      {alerts.map((alert, index) => (
        <div
          key={index}
          style={{
            marginTop: "15px",
            padding: "12px",
            borderLeft: `5px solid ${alert.color}`,
            background: "#f9fafb",
            borderRadius: "8px",
          }}
        >
          <strong>{alert.location}</strong>

          <p>{alert.message}</p>
        </div>
      ))}
    </div>
  );
}

export default Alerts;