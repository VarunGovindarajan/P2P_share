import { useState, useEffect } from "react";
import api from "../utils/axios";

export default function P2PTransfer({ socket, onSendFile }) {
  const [onlineUsers, setOnlineUsers] = useState([]);
  const [selectedFile, setSelectedFile] = useState(null);
  const [sending, setSending] = useState(false);

  useEffect(() => {
    const fetchOnlineUsers = () => {
      api.get("/auth/online-users").then((res) => setOnlineUsers(res.data));
    };
    fetchOnlineUsers();

    if (socket) {
      socket.on("online-users", fetchOnlineUsers);
      return () => socket.off("online-users", fetchOnlineUsers);
    }
  }, [socket]);

  const handleSend = async (targetUserId) => {
    if (!selectedFile) return alert("Select a file first");
    setSending(true);
    await onSendFile(targetUserId, selectedFile);
    setSending(false);
    setSelectedFile(null);
  };

  return (
    <div className="bg-gray-900 rounded-2xl p-5 mb-6">
      <h2 className="text-white font-semibold mb-3">
        Direct P2P Transfer
      </h2>

      <input
        type="file"
        onChange={(e) => setSelectedFile(e.target.files[0])}
        className="w-full bg-gray-800 text-gray-300 text-sm rounded-lg px-4 py-2 mb-4 cursor-pointer"
      />

      {selectedFile && (
        <p className="text-gray-400 text-xs mb-3">
          Selected: {selectedFile.name} ({(selectedFile.size / 1024).toFixed(1)} KB)
        </p>
      )}

      {onlineUsers.length === 0 ? (
        <p className="text-gray-600 text-sm">No other users online</p>
      ) : (
        <div className="space-y-2">
          <p className="text-gray-500 text-xs mb-2">Online peers:</p>
          {onlineUsers.map((u) => (
            <div key={u._id} className="flex items-center justify-between bg-gray-800 rounded-lg px-4 py-2">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-green-400 rounded-full" />
                <span className="text-white text-sm">{u.username}</span>
              </div>
              <button
                onClick={() => handleSend(u._id)}
                disabled={sending || !selectedFile}
                className="bg-blue-600 hover:bg-blue-700 disabled:opacity-40 text-white text-xs px-3 py-1.5 rounded-lg transition"
              >
                {sending ? "Sending..." : "Send"}
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}