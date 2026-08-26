import React, { useEffect, useState } from "react";
import Layout from "../components/Layout";
import api from "../services/api";

const ROLES = [
  "super_admin",
  "admin",
  "traffic_operator",
  "analyst",
  "viewer",
];

export default function UsersRoles() {
  const [items, setItems] = useState([]);
  const [counts, setCounts] = useState({
    total: 0,
    active: 0,
    admins: 0,
    operators: 0,
  });

  const [q, setQ] = useState("");
  const [role, setRole] = useState("all");
  const [status, setStatus] = useState("all");

  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);

  const [showAdd, setShowAdd] = useState(false);
  const [editing, setEditing] = useState(null);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const perPage = 8;

  const emptyForm = {
    name: "",
    email: "",
    password: "",
    role: "traffic_operator",
    phone: "",
    department: "",
    assignedArea: "All Locations",
  };

  const [form, setForm] = useState(emptyForm);

  // ======================================================
  // LOAD USERS
  // ======================================================

  const load = async (
    currentPage = page,
    currentQ = q,
    currentRole = role,
    currentStatus = status
  ) => {
    try {
      setLoading(true);

      const { data } = await api.get("/users", {
        params: {
          q: currentQ,
          role: currentRole,
          status: currentStatus,
          page: currentPage,
          perPage,
        },
      });

      setItems(data.items);
      setCounts(data.counts);
      setTotal(data.total);
    } catch (err) {
      setError("Could not load users.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load(page, q, role, status);
  }, [page, q, role, status]);

  // ======================================================
  // SEARCH
  // ======================================================

  const search = async (e) => {
    e.preventDefault();
    setPage(1);
    await load(1, q, role, status);
  };

  // ======================================================
  // OPEN ADD
  // ======================================================

  const openAdd = () => {
    setEditing(null);
    setForm(emptyForm);
    setError("");
    setShowAdd(true);
  };

  // ======================================================
  // OPEN EDIT
  // ======================================================

  const openEdit = (user) => {
    setEditing(user);

    setForm({
      name: user.name || "",
      email: user.email || "",
      password: "",
      role: user.role || "traffic_operator",
      phone: user.phone || "",
      department: user.department || "",
      assignedArea: user.assignedArea || "All Locations",
    });

    setError("");
    setShowAdd(true);
  };

  // ======================================================
  // SUBMIT
  // ======================================================

  const submit = async (e) => {
    e.preventDefault();

    setError("");

    try {
      if (editing) {
        await api.put(`/users/${editing.id}`, form);
      } else {
        await api.post("/users", form);
      }

      setShowAdd(false);
      setEditing(null);
      setForm(emptyForm);

      await load(page, q, role, status);
    } catch (err) {
      setError(
        err.response?.data?.error || "Could not save user."
      );
    }
  };

  // ======================================================
  // TOGGLE STATUS
  // ======================================================

  const toggleStatus = async (user) => {
    try {
      await api.patch(`/users/${user.id}/status`, {
        status:
          user.status === "active"
            ? "inactive"
            : "active",
      });

      await load(page, q, role, status);
    } catch {
      setError("Could not update status.");
    }
  };

  // ======================================================
  // DELETE
  // ======================================================

  const remove = async (user) => {
    const ok = window.confirm(
      `Delete ${user.name}?`
    );

    if (!ok) return;

    try {
      await api.delete(`/users/${user.id}`);

      await load(page, q, role, status);
    } catch (err) {
      setError(
        err.response?.data?.error ||
          "Could not delete user."
      );
    }
  };

  const totalPages = Math.max(
    1,
    Math.ceil(total / perPage)
  );
    return (
    <Layout
      title="Users & Roles"
      subtitle="Manage TrafficVision AI accounts and permissions"
    >
      {/* ========================= STATS ========================= */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        {[
          ["Total Users", counts.total],
          ["Active Users", counts.active],
          ["Administrators", counts.admins],
          ["Traffic Operators", counts.operators],
        ].map(([label, value]) => (
          <div key={label} className="card">
            <p className="text-xs text-slate-500">{label}</p>
            <p className="text-2xl font-bold text-white">
              {value ?? 0}
            </p>
          </div>
        ))}
      </div>

      {/* ========================= SEARCH ========================= */}
      <form
        onSubmit={search}
        className="flex flex-wrap gap-2 mb-5"
      >
        <input
          className="input flex-1 min-w-[220px]"
          placeholder="Search by name, email or role..."
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />

        <select
          className="input"
          value={role}
          onChange={(e) => setRole(e.target.value)}
        >
          <option value="all">All Roles</option>

          {ROLES.map((r) => (
            <option key={r} value={r}>
              {r.replaceAll("_", " ")}
            </option>
          ))}
        </select>

        <select
          className="input"
          value={status}
          onChange={(e) => setStatus(e.target.value)}
        >
          <option value="all">All Status</option>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
        </select>

        <button className="btn-secondary">
          Search
        </button>

        <button
          type="button"
          className="btn-primary"
          onClick={openAdd}
        >
          + Add User
        </button>
      </form>

      {error && (
        <p className="text-red-400 text-sm mb-4">
          {error}
        </p>
      )}

      {/* ========================= ADD / EDIT ========================= */}

      {showAdd && (
        <form
          onSubmit={submit}
          className="card mb-6 grid md:grid-cols-3 gap-3"
        >
          <input
            className="input"
            placeholder="Full Name"
            required
            value={form.name}
            onChange={(e) =>
              setForm({
                ...form,
                name: e.target.value,
              })
            }
          />

          <input
            className="input"
            type="email"
            placeholder="Email Address"
            required
            value={form.email}
            onChange={(e) =>
              setForm({
                ...form,
                email: e.target.value,
              })
            }
          />

          {!editing && (
            <input
              className="input"
              type="password"
              placeholder="Password"
              minLength={8}
              required
              value={form.password}
              onChange={(e) =>
                setForm({
                  ...form,
                  password: e.target.value,
                })
              }
            />
          )}

          <select
            className="input"
            value={form.role}
            onChange={(e) =>
              setForm({
                ...form,
                role: e.target.value,
              })
            }
          >
            {ROLES.map((r) => (
              <option key={r} value={r}>
                {r.replaceAll("_", " ")}
              </option>
            ))}
          </select>

          <input
            className="input"
            placeholder="Phone Number"
            value={form.phone}
            onChange={(e) =>
              setForm({
                ...form,
                phone: e.target.value,
              })
            }
          />

          <input
            className="input"
            placeholder="Department"
            value={form.department}
            onChange={(e) =>
              setForm({
                ...form,
                department: e.target.value,
              })
            }
          />

          <input
            className="input md:col-span-3"
            placeholder="Assigned Area"
            value={form.assignedArea}
            onChange={(e) =>
              setForm({
                ...form,
                assignedArea: e.target.value,
              })
            }
          />

          <div className="md:col-span-3 flex gap-2 mt-2">
            <button className="btn-primary">
              {editing
                ? "Save Changes"
                : "Create User"}
            </button>

            <button
              type="button"
              className="btn-secondary"
              onClick={() => {
                setShowAdd(false);
                setEditing(null);
              }}
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      {/* ========================= USERS TABLE ========================= */}

      <div className="card overflow-x-auto">
        <table className="w-full min-w-[760px] text-sm">
          <thead>
            <tr className="border-b border-border text-left text-slate-400">
              <th className="py-3">User</th>
              <th>Role</th>
              <th>Department</th>
              <th>Assigned Area</th>
              <th>Status</th>
              <th>Last Active</th>
              <th>Actions</th>
            </tr>
          </thead>

          <tbody>
            {loading ? (
              <tr>
                <td
                  colSpan={7}
                  className="py-8 text-center text-slate-400"
                >
                  Loading users...
                </td>
              </tr>
            ) : items.length === 0 ? (
              <tr>
                <td
                  colSpan={7}
                  className="py-8 text-center text-slate-500"
                >
                  No users found.
                </td>
              </tr>
            ) : (
              items.map((u) => (
                <tr
                  key={u.id}
                  className="border-b border-border/40"
                >
                  <td className="py-3">
                    <p className="font-medium text-white">
                      {u.name}
                    </p>

                    <p className="text-xs text-slate-400">
                      {u.email}
                    </p>

                    {u.phone && (
                      <p className="text-xs text-slate-500">
                        📞 {u.phone}
                      </p>
                    )}
                  </td>

                  <td className="capitalize">
                    {u.role.replaceAll("_", " ")}
                  </td>

                  <td>
                    {u.department || "—"}
                  </td>

                  <td>
                    {u.assignedArea || "—"}
                  </td>

                  <td>
                    <button
                      onClick={() =>
                        toggleStatus(u)
                      }
                      className={`px-3 py-1 rounded-full text-xs font-medium ${
                        u.status === "active"
                          ? "bg-green-500/20 text-green-300"
                          : "bg-red-500/20 text-red-300"
                      }`}
                    >
                      {u.status}
                    </button>
                  </td>

                  <td className="text-slate-400 text-xs">
                    {u.lastActive
                      ? new Date(
                          u.lastActive
                        ).toLocaleString()
                      : "—"}
                  </td>

                  <td>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        className="btn-secondary text-xs px-3 py-1"
                        onClick={() =>
                          openEdit(u)
                        }
                      >
                        Edit
                      </button>

                      <button
                        type="button"
                        className="px-3 py-1 rounded-lg bg-red-500/10 text-red-300 text-xs hover:bg-red-500/20"
                        onClick={() =>
                          remove(u)
                        }
                      >
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>

        {/* ========================= PAGINATION ========================= */}

        <div className="flex justify-between items-center mt-5 text-sm text-slate-400">
          <p>
            Showing {items.length} of {total} users
          </p>

          <div className="flex items-center gap-2">
            <button
              className="btn-secondary text-xs px-3 py-1"
              disabled={page === 1}
              onClick={() =>
                setPage((p) => p - 1)
              }
            >
              Prev
            </button>

            <span>
              Page {page} of {totalPages}
            </span>

            <button
              className="btn-secondary text-xs px-3 py-1"
              disabled={page >= totalPages}
              onClick={() =>
                setPage((p) => p + 1)
              }
            >
              Next
            </button>
          </div>
        </div>
      </div>
    </Layout>
  );
}

