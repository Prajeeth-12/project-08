"use client";

import React, { useState } from "react";

interface AuthModalProps {
  onSuccess: (token: string, user: { id: string; role: string; full_name: string }) => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({ onSuccess }) => {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [role, setRole] = useState("CANDIDATE");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    const url = isLogin
      ? "http://localhost:8000/api/auth/login"
      : "http://localhost:8000/api/auth/register";

    const payload = isLogin
      ? { email, password }
      : { email, password, full_name: fullName, role };

    try {
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.detail || "Authentication request failed");
      }

      const data = await res.json();
      onSuccess(data.access_token, {
        id: data.user_id,
        role: data.role,
        full_name: data.full_name,
      });
    } catch (err: any) {
      setError(err.message || "Failed to authenticate");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 max-w-md w-full shadow-2xl space-y-4">
      <div className="flex justify-between items-center border-b border-slate-800 pb-3">
        <h2 className="text-lg font-bold text-slate-100">
          {isLogin ? "Platform Sign In" : "Register Candidate Profile"}
        </h2>
        <button
          onClick={() => setIsLogin(!isLogin)}
          className="text-xs text-indigo-400 hover:underline"
        >
          {isLogin ? "Need an account? Register" : "Have an account? Login"}
        </button>
      </div>

      {error && (
        <div className="p-2 bg-rose-950 border border-rose-800 text-rose-300 text-xs rounded">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-3 text-xs">
        {!isLogin && (
          <div>
            <label className="block text-slate-400 mb-1">Full Name</label>
            <input
              type="text"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              required
              className="w-full p-2 bg-slate-950 border border-slate-800 rounded text-slate-200 focus:outline-none focus:border-indigo-500"
            />
          </div>
        )}

        <div>
          <label className="block text-slate-400 mb-1">Email Address</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="w-full p-2 bg-slate-950 border border-slate-800 rounded text-slate-200 focus:outline-none focus:border-indigo-500"
          />
        </div>

        <div>
          <label className="block text-slate-400 mb-1">Password</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            className="w-full p-2 bg-slate-950 border border-slate-800 rounded text-slate-200 focus:outline-none focus:border-indigo-500"
          />
        </div>

        {!isLogin && (
          <div>
            <label className="block text-slate-400 mb-1">Institutional Role</label>
            <select
              value={role}
              onChange={(e) => setRole(e.target.value)}
              className="w-full p-2 bg-slate-950 border border-slate-800 rounded text-slate-200 focus:outline-none focus:border-indigo-500"
            >
              <option value="CANDIDATE">Candidate / Student</option>
              <option value="FACULTY">Faculty / Evaluator</option>
              <option value="ADMIN">Platform Admin</option>
            </select>
          </div>
        )}

        <button
          type="submit"
          disabled={loading}
          className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold rounded-lg transition shadow-lg mt-2"
        >
          {loading ? "Authenticating..." : isLogin ? "Sign In" : "Register Profile"}
        </button>
      </form>
    </div>
  );
};
