"use client";

import { FormEvent, useState } from "react";
import type { CSSProperties } from "react";

type User = {
  id: number;
  name: string;
  email: string;
};

const API_URL = "http://127.0.0.1:8000";

export default function Home() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [users, setUsers] = useState<User[]>([]);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  async function loadUsers(token: string) {
    const response = await fetch(`${API_URL}/users`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      throw new Error("Unable to load users");
    }

    const data: User[] = await response.json();
    setUsers(data);
  }

  async function handleLogin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setMessage("");

    try {
      const response = await fetch(`${API_URL}/login`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email,
          password,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.detail || "Login failed");
      }

      localStorage.setItem("access_token", data.access_token);
      await loadUsers(data.access_token);

      setIsLoggedIn(true);
      setMessage("Login successful");
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : "Something went wrong"
      );
    } finally {
      setLoading(false);
    }
  }

  function handleLogout() {
    localStorage.removeItem("access_token");
    setUsers([]);
    setIsLoggedIn(false);
    setEmail("");
    setPassword("");
    setMessage("");
  }

  if (isLoggedIn) {
    return (
      <main style={styles.page}>
        <section style={styles.card}>
          <div style={styles.header}>
            <div>
              <p style={styles.label}>Dashboard</p >
              <h1 style={styles.title}>User List</h1>
            </div>

            <button style={styles.secondaryButton} onClick={handleLogout}>
              Log out
            </button>
          </div>

          {users.length === 0 ? (
            <p>No users found.</p >
          ) : (
            <div style={styles.userList}>
              {users.map((user) => (
                <article key={user.id} style={styles.userItem}>
                  <div style={styles.avatar}>
                    {user.name.charAt(0).toUpperCase()}
                  </div>

                  <div>
                    <strong>{user.name}</strong>
                    <p style={styles.email}>{user.email}</p >
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>
      </main>
    );
  }

  return (
    <main style={styles.page}>
      <section style={styles.card}>
        <p style={styles.label}>FastAPI User System</p >
        <h1 style={styles.title}>Welcome back</h1>
        <p style={styles.subtitle}>
          Sign in to view the registered users.
        </p >

        <form onSubmit={handleLogin} style={styles.form}>
          <label style={styles.field}>
            Email
            <input
              style={styles.input}
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="Enter your email"
              required
            />
          </label>

          <label style={styles.field}>
            Password
            <input
              style={styles.input}
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="Enter your password"
              required
            />
          </label>

          <button style={styles.primaryButton} type="submit" disabled={loading}>
            {loading ? "Signing in..." : "Sign in"}
          </button>
        </form>

        {message && <p style={styles.message}>{message}</p >}
      </section>
    </main>
  );
}

const styles: Record<string, CSSProperties> = {
  page: {
    minHeight: "100vh",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: "24px",
    background: "linear-gradient(135deg, #eef2ff, #f8fafc)",
    color: "#172033",
  },
  card: {
    width: "100%",
    maxWidth: "520px",
    padding: "36px",
    borderRadius: "20px",
    background: "#ffffff",
    boxShadow: "0 20px 55px rgba(15, 23, 42, 0.12)",
  },
  label: {
    margin: "0 0 8px",
    color: "#6366f1",
    fontSize: "14px",
    fontWeight: 700,
    textTransform: "uppercase",
    letterSpacing: "1px",
  },
  title: {
    margin: "0",
    fontSize: "32px",
  },
  subtitle: {
    margin: "10px 0 28px",
    color: "#64748b",
  },
  form: {
    display: "flex",
    flexDirection: "column",
    gap: "18px",
  },
  field: {
    display: "flex",
    flexDirection: "column",
    gap: "8px",
    fontWeight: 600,
  },
  input: {
    padding: "13px 14px",
    border: "1px solid #cbd5e1",
    borderRadius: "10px",
    fontSize: "16px",
  },
  primaryButton: {
    padding: "14px",
    border: "none",
    borderRadius: "10px",
    background: "#4f46e5",
    color: "#ffffff",
    fontSize: "16px",
    fontWeight: 700,
    cursor: "pointer",
  },
  secondaryButton: {
    padding: "10px 14px",
    border: "1px solid #cbd5e1",
    borderRadius: "9px",
    background: "#ffffff",
    cursor: "pointer",
  },
  message: {
    marginTop: "18px",
    color: "#dc2626",
  },
  header: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: "24px",
  },
  userList: {
    display: "flex",
    flexDirection: "column",
    gap: "12px",
  },
  userItem: {
    display: "flex",
    alignItems: "center",
    gap: "14px",
    padding: "14px",
    borderRadius: "12px",
    background: "#f8fafc",
  },
  avatar: {
    width: "42px",
    height: "42px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    borderRadius: "50%",
    background: "#e0e7ff",
    color: "#4338ca",
    fontWeight: 700,
  },
  email: {
    margin: "4px 0 0",
    color: "#64748b",
  },
};
