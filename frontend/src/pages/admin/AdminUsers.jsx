import { useEffect, useState } from "react";
import { apiRequest } from "../../api";

// Fully working: lists real users from MongoDB and can activate/deactivate them.
export default function AdminUsers() {
  const [users, setUsers] = useState([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  const load = () => {
    apiRequest("/auth/users")
      .then((d) => setUsers(d.users))
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  };

  useEffect(load, []);

  const toggle = async (id) => {
    try {
      await apiRequest(`/auth/users/${id}/toggle`, { method: "PATCH" });
      load();
    } catch (e) {
      alert(e.message);
    }
  };

  if (loading) return <div><h1>Users</h1><p className="muted">Loading...</p></div>;

  return (
    <div>
      <h1>Users</h1>
      <p className="muted" style={{ marginBottom: 14 }}>
        Live data from the database. Deactivated users cannot log in.
      </p>
      {error && <div className="error-msg">{error}</div>}
      <div className="table-wrap">
        <table>
          <thead>
            <tr><th>Name</th><th>Email</th><th>Role</th><th>Joined</th><th>Status</th><th>Action</th></tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.id}>
                <td>{u.name}</td>
                <td>{u.email}</td>
                <td><span className="pill gray">{u.role}</span></td>
                <td>{new Date(u.createdAt).toLocaleDateString()}</td>
                <td>
                  {u.isActive
                    ? <span className="pill green">Active</span>
                    : <span className="pill red">Deactivated</span>}
                </td>
                <td>
                  {u.role !== "admin" && (
                    <button className="btn btn-sm btn-outline" onClick={() => toggle(u.id)}>
                      {u.isActive ? "Deactivate" : "Activate"}
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
