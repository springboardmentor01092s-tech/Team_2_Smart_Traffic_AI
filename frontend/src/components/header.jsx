import { FaBell, FaUserCircle } from "react-icons/fa";

function Header() {
  return (
    <div
      style={{
        background: "#ffffff",
        padding: "15px 20px",
        borderRadius: "10px",
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
        marginBottom: "20px",
      }}
    >
      <input
        type="text"
        placeholder="Search..."
        style={{
          width: "300px",
          padding: "10px",
          borderRadius: "8px",
          border: "1px solid #ccc",
        }}
      />

      <div style={{ display: "flex", alignItems: "center", gap: "20px" }}>
        <FaBell size={22} />
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <FaUserCircle size={35} />
          <div>
            <strong>Admin</strong>
            <br />
            <small>Traffic Controller</small>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Header;