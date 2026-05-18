import { useState } from "react";
import api from "../utils/axios";

export default function ShareModal({ file, onClose }) {
  const [username, setUsername] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleGrant = async () => {
    if (!username.trim()) return;
    setLoading(true);
    setError("");
    setMessage("");
    try {
      const res = await api.post(`/files/${file._id}/grant`, { username });
      setMessage(res.data.message);
      setUsername("");
    } catch (err) {
      setError(err.response?.data?.message || "Failed to grant access");
    } finally {
      setLoading(false);
    }
  };

  const handleRevoke = async () => {
    if (!username.trim()) return;
    setLoading(true);
    setError("");
    setMessage("");
    try {
      const res = await api.post(`/files/${file._id}/revoke`, { username });
      setMessage(res.data.message);
      setUsername("");
    } catch (err) {
      setError(err.response?.data?.message || "Failed to revoke access");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 px-4">
      <div className="bg-gray-900 rounded-2xl p-6 w-full max-w-md shadow-xl">
        <h2 className="text-white font-bold text-lg mb-1">Share File</h2>
        <p className="text-gray-400 text-sm mb-4 truncate">{file.originalName}</p>

        {message && (
          <div className="bg-green-500/10 border border-green-500/30 text-green-400 text-sm rounded-lg px-4 py-2 mb-3">
            {message}
          </div>
        )}
        {error && (
          <div className="bg-red-500/10 border border-red-500/30 text-red-400 text-sm rounded-lg px-4 py-2 mb-3">
            {error}
          </div>
        )}

        <input
          type="text"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          placeholder="Enter username"
          className="w-full bg-gray-800 text-white rounded-lg px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-500 mb-3"
        />

        <div className="flex gap-2">
          <button
            onClick={handleGrant}
            disabled={loading}
            className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-sm font-medium py-2 rounded-lg transition"
          >
            Grant Access
          </button>
          <button
            onClick={handleRevoke}
            disabled={loading}
            className="flex-1 bg-red-700 hover:bg-red-600 disabled:opacity-50 text-white text-sm font-medium py-2 rounded-lg transition"
          >
            Revoke Access
          </button>
        </div>

        <button
          onClick={onClose}
          className="w-full mt-3 bg-gray-800 hover:bg-gray-700 text-gray-400 text-sm py-2 rounded-lg transition"
        >
          Close
        </button>
      </div>
    </div>
  );
}