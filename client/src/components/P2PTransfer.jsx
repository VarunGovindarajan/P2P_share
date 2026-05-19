import { useState, useEffect } from "react";
import api from "../utils/axios";

export default function P2PTransfer({ socket, onSendFile }) {
  const [onlineUsers, setOnlineUsers] = useState([]);
  const [selectedFile, setSelectedFile] = useState(null);
  const [sending, setSending] = useState(false);
  const [sendingTo, setSendingTo] = useState(null);

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
    if (!selectedFile) return;
    setSending(true);
    setSendingTo(targetUserId);
    await onSendFile(targetUserId, selectedFile);
    setSending(false);
    setSendingTo(null);
    setSelectedFile(null);
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>

      {/* File picker */}
      <label style={{
        display: "flex", alignItems: "center", gap: 10,
        background: "#0e0d17",
        border: `0.5px solid ${selectedFile ? "#6350dc" : "#252438"}`,
        borderRadius: 8, padding: "9px 12px",
        cursor: "pointer", transition: "border-color 0.15s",
      }}>
        <i className="ti ti-paperclip" style={{ fontSize: 15, color: "#5d5b78", flexShrink: 0 }} aria-hidden="true" />
        <span style={{
          fontSize: 13, color: selectedFile ? "#dddbed" : "#38364f",
          flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
        }}>
          {selectedFile ? selectedFile.name : "choose a file to send…"}
        </span>
        {selectedFile && (
          <span style={{
            fontSize: 11, color: "#5d5b78",
            fontFamily: "'DM Mono', monospace", flexShrink: 0,
          }}>
            {(selectedFile.size / 1024).toFixed(1)} KB
          </span>
        )}
        <input
          type="file"
          style={{ display: "none" }}
          onChange={(e) => setSelectedFile(e.target.files[0])}
        />
      </label>

      {/* Peers list */}
      {onlineUsers.length === 0 ? (
        <div style={{
          display: "flex", alignItems: "center", gap: 8,
          padding: "10px 0", color: "#38364f", fontSize: 13,
        }}>
          <i className="ti ti-wifi-off" style={{ fontSize: 15 }} aria-hidden="true" />
          no other users online
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          <span style={{
            fontSize: 11, color: "#5d5b78",
            textTransform: "uppercase", letterSpacing: "0.07em", fontWeight: 500,
          }}>
            online peers
          </span>
          {onlineUsers.map((u) => (
            <div
              key={u._id}
              style={{
                display: "flex", alignItems: "center", justifyContent: "space-between",
                background: "#0e0d17",
                border: "0.5px solid #252438",
                borderRadius: 8, padding: "9px 12px",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{
                  width: 7, height: 7, borderRadius: "50%",
                  background: "#4ade80",
                  boxShadow: "0 0 5px rgba(74,222,128,0.5)",
                  display: "inline-block", flexShrink: 0,
                }} />
                <div style={{
                  width: 26, height: 26, borderRadius: "50%",
                  background: "linear-gradient(135deg, #6350dc, #a88bfa)",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: 10, fontWeight: 500, color: "#fff",
                }}>
                  {u.username.slice(0, 2).toUpperCase()}
                </div>
                <span style={{ fontSize: 13, color: "#dddbed" }}>{u.username}</span>
              </div>

              <button
                onClick={() => handleSend(u._id)}
                disabled={sending || !selectedFile}
                style={{
                  background: selectedFile && !sending
                    ? "linear-gradient(135deg, #6350dc, #8b7ff5)"
                    : "#1a1928",
                  border: "none",
                  borderRadius: 7,
                  padding: "6px 14px",
                  fontSize: 12,
                  fontFamily: "'DM Sans', sans-serif",
                  fontWeight: 500,
                  color: selectedFile && !sending ? "#fff" : "#3a3858",
                  cursor: selectedFile && !sending ? "pointer" : "not-allowed",
                  display: "flex", alignItems: "center", gap: 6,
                  transition: "opacity 0.15s",
                  opacity: sending && sendingTo !== u._id ? 0.4 : 1,
                }}
              >
                {sending && sendingTo === u._id ? (
                  <>
                    <i className="ti ti-loader-2" style={{
                      fontSize: 13,
                      animation: "spin 1s linear infinite",
                    }} aria-hidden="true" />
                    sending…
                  </>
                ) : (
                  <>
                    <i className="ti ti-send" style={{ fontSize: 13 }} aria-hidden="true" />
                    send
                  </>
                )}
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}