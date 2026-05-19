import { useState, useEffect, useCallback, useRef } from "react";
import { io } from "socket.io-client";
import { useAuth } from "../context/AuthContext";
import FileUpload from "../components/FileUpload";
import FileList from "../components/FileList";
import ShareModal from "../components/ShareModal";
import P2PTransfer from "../components/P2PTransfer";
import { useWebRTC } from "../hooks/useWebRTC";
import api from "../utils/axios";

// ─── Helpers ────────────────────────────────────────────────────────────────

function getFileType(filename = "") {
  const ext = filename.split(".").pop()?.toLowerCase();
  if (["pdf"].includes(ext)) return "pdf";
  if (["png", "jpg", "jpeg", "gif", "webp", "svg"].includes(ext)) return "img";
  if (["doc", "docx", "txt", "md"].includes(ext)) return "doc";
  if (["zip", "tar", "gz", "rar", "7z"].includes(ext)) return "zip";
  if (["mp4", "mov", "avi", "mkv"].includes(ext)) return "video";
  if (["mp3", "wav", "flac"].includes(ext)) return "audio";
  return "generic";
}

function FileTypeIcon({ filename }) {
  const type = getFileType(filename);
  const map = {
    pdf:     { icon: "ti-file-type-pdf",  bg: "rgba(216,90,48,0.12)",   color: "#D85A30" },
    img:     { icon: "ti-photo",           bg: "rgba(99,80,220,0.12)",   color: "#8b7ff5" },
    doc:     { icon: "ti-file-description",bg: "rgba(29,158,117,0.12)", color: "#1D9E75" },
    zip:     { icon: "ti-file-zip",        bg: "rgba(186,117,23,0.12)", color: "#EF9F27" },
    video:   { icon: "ti-video",           bg: "rgba(212,83,126,0.12)", color: "#D4537E" },
    audio:   { icon: "ti-music",           bg: "rgba(55,138,221,0.12)", color: "#378ADD" },
    generic: { icon: "ti-file",            bg: "rgba(136,135,128,0.12)",color: "#888780" },
  };
  const { icon, bg, color } = map[type] || map.generic;
  return (
    <div style={{
      width: 36, height: 36, borderRadius: 8,
      background: bg, display: "flex", alignItems: "center",
      justifyContent: "center", flexShrink: 0,
    }}>
      <i className={`ti ${icon}`} style={{ fontSize: 16, color }} aria-hidden="true" />
    </div>
  );
}

function formatSize(bytes) {
  if (!bytes) return "—";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function timeAgo(dateStr) {
  if (!dateStr) return "";
  const diff = (Date.now() - new Date(dateStr)) / 1000;
  if (diff < 60) return "just now";
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

// ─── Notification ────────────────────────────────────────────────────────────

function NotificationItem({ title, message }) {
  return (
    <div style={{
      background: "#1a1928",
      border: "0.5px solid #2e2c47",
      borderLeft: "2px solid #8b7ff5",
      borderRadius: 10,
      padding: "11px 14px",
      display: "flex",
      gap: 10,
      alignItems: "flex-start",
      animation: "pipedrop-slideIn 0.25s ease",
    }}>
      <i className="ti ti-bell" style={{ fontSize: 14, color: "#8b7ff5", marginTop: 1, flexShrink: 0 }} aria-hidden="true" />
      <div>
        <div style={{ fontSize: 12, fontWeight: 500, color: "#dddbed" }}>{title}</div>
        <div style={{ fontSize: 11, color: "#5d5b78", marginTop: 2 }}>{message}</div>
      </div>
    </div>
  );
}

function Notifications({ notifications }) {
  if (!notifications.length) return null;
  return (
    <div
      aria-live="polite"
      style={{
        position: "fixed", bottom: 24, right: 24,
        display: "flex", flexDirection: "column", gap: 8,
        width: 268, zIndex: 50,
      }}
    >
      {notifications.map((n) => (
        <NotificationItem key={n.id} title={n.title} message={n.message} />
      ))}
    </div>
  );
}

// ─── Enhanced FileList ────────────────────────────────────────────────────────

function EnhancedFileList({ files, onDelete, onShare, isOwner }) {
  if (!files.length) {
    return (
      <div style={{
        textAlign: "center", padding: "40px 0",
        color: "#4e4c68", fontSize: 13,
      }}>
        <i className="ti ti-inbox" style={{ fontSize: 28, display: "block", marginBottom: 10 }} aria-hidden="true" />
        No files here yet
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      {files.map((file) => (
        <div
          key={file._id}
          style={{
            background: "#14131e",
            border: "0.5px solid #252438",
            borderRadius: 10,
            padding: "12px 14px",
            display: "flex",
            alignItems: "center",
            gap: 12,
            transition: "border-color 0.15s",
          }}
          onMouseEnter={e => e.currentTarget.style.borderColor = "#3a3858"}
          onMouseLeave={e => e.currentTarget.style.borderColor = "#252438"}
        >
          <FileTypeIcon filename={file.filename || file.name} />

          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{
              fontSize: 13, fontWeight: 500, color: "#dddbed",
              whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
            }}>
              {file.filename || file.name}
            </div>
            <div style={{
              fontSize: 11, color: "#4e4c68", marginTop: 2,
              fontFamily: "'DM Mono', monospace",
            }}>
              {formatSize(file.size)} · {timeAgo(file.createdAt)}
            </div>
          </div>

          <div style={{ display: "flex", gap: 4 }}>
            <a
              href={file.url || "#"}
              download
              style={{
                width: 28, height: 28, borderRadius: 7,
                background: "none", border: "0.5px solid transparent",
                display: "flex", alignItems: "center", justifyContent: "center",
                color: "#4e4c68", fontSize: 15, textDecoration: "none",
                transition: "background 0.12s, color 0.12s",
                cursor: "pointer",
              }}
              aria-label="Download"
              onMouseEnter={e => { e.currentTarget.style.background = "#1e1d2e"; e.currentTarget.style.color = "#c8c6d8"; e.currentTarget.style.borderColor = "#2a2840"; }}
              onMouseLeave={e => { e.currentTarget.style.background = "none"; e.currentTarget.style.color = "#4e4c68"; e.currentTarget.style.borderColor = "transparent"; }}
            >
              <i className="ti ti-download" aria-hidden="true" />
            </a>

            {isOwner && (
              <button
                onClick={() => onShare(file)}
                style={{
                  width: 28, height: 28, borderRadius: 7,
                  background: "none", border: "0.5px solid transparent",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  color: "#4e4c68", fontSize: 15, cursor: "pointer",
                  transition: "background 0.12s, color 0.12s",
                }}
                aria-label="Share"
                onMouseEnter={e => { e.currentTarget.style.background = "#1e1d2e"; e.currentTarget.style.color = "#8b7ff5"; e.currentTarget.style.borderColor = "#2a2840"; }}
                onMouseLeave={e => { e.currentTarget.style.background = "none"; e.currentTarget.style.color = "#4e4c68"; e.currentTarget.style.borderColor = "transparent"; }}
              >
                <i className="ti ti-user-plus" aria-hidden="true" />
              </button>
            )}

            {isOwner && (
              <button
                onClick={() => onDelete(file._id)}
                style={{
                  width: 28, height: 28, borderRadius: 7,
                  background: "none", border: "0.5px solid transparent",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  color: "#4e4c68", fontSize: 15, cursor: "pointer",
                  transition: "background 0.12s, color 0.12s",
                }}
                aria-label="Delete"
                onMouseEnter={e => { e.currentTarget.style.background = "#1e1d2e"; e.currentTarget.style.color = "#E24B4A"; e.currentTarget.style.borderColor = "#2a2840"; }}
                onMouseLeave={e => { e.currentTarget.style.background = "none"; e.currentTarget.style.color = "#4e4c68"; e.currentTarget.style.borderColor = "transparent"; }}
              >
                <i className="ti ti-trash" aria-hidden="true" />
              </button>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── Dashboard ───────────────────────────────────────────────────────────────

export default function Dashboard() {
  const { user, logout } = useAuth();
  const [files, setFiles] = useState([]);
  const [sharedFiles, setSharedFiles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState("my");
  const [sharingFile, setSharingFile] = useState(null);
  const [notifications, setNotifications] = useState([]);
  const [onlineCount, setOnlineCount] = useState(0);
  const socketRef = useRef(null);

  const token = localStorage.getItem("token");

  const addNotification = useCallback((title, message) => {
    const id = Date.now();
    setNotifications((prev) => [...prev, { id, title, message }]);
    setTimeout(() => setNotifications((prev) => prev.filter((n) => n.id !== id)), 4000);
  }, []);

  const onIncomingFile = useCallback((blob, fileInfo) => {
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = fileInfo.name;
    a.click();
    window.URL.revokeObjectURL(url);
    addNotification("File received!", `You received "${fileInfo.name}" via P2P`);
  }, [addNotification]);

  const { sendFile, handleOffer, handleAnswer, handleIce } = useWebRTC(
    socketRef.current,
    onIncomingFile
  );

  useEffect(() => {
    if (!token) return;
    const socket = io(import.meta.env.VITE_SOCKET_URL || "http://localhost:5000", {
      auth: { token },
    });
    socketRef.current = socket;

    socket.on("online-users", (users) => setOnlineCount(users.length));
    socket.on("file-uploaded", ({ username, filename }) => {
      if (username !== user?.username)
        addNotification("New file uploaded", `${username} uploaded ${filename}`);
    });
    socket.on("access-granted", ({ filename, from }) => {
      addNotification("File shared with you", `${from} shared "${filename}"`);
      api.get("/files/shared").then((res) => setSharedFiles(res.data));
    });
    socket.on("webrtc-offer", (data) => handleOffer(data, socket));
    socket.on("webrtc-answer", handleAnswer);
    socket.on("webrtc-ice", handleIce);

    return () => socket.disconnect();
  }, [token]);

  useEffect(() => {
    Promise.all([api.get("/files"), api.get("/files/shared")])
      .then(([myRes, sharedRes]) => {
        setFiles(myRes.data);
        setSharedFiles(sharedRes.data);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const handleUploadSuccess = (newFile) => setFiles((prev) => [newFile, ...prev]);
  const handleDelete = (id) => setFiles((prev) => prev.filter((f) => f._id !== id));
  const handleSendFile = async (targetUserId, file) => {
    await sendFile(targetUserId, file, socketRef.current);
  };

  const initials = user?.username
    ? user.username.slice(0, 2).toUpperCase()
    : "??";

  return (
    <>
      {/* Inject animation keyframes once */}
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500&family=DM+Mono:wght@400;500&display=swap');
        @keyframes pipedrop-slideIn {
          from { opacity: 0; transform: translateX(14px); }
          to   { opacity: 1; transform: translateX(0); }
        }
      `}</style>

      <div style={{
        minHeight: "100vh",
        background: "#0a0a0f",
        color: "#e8e6f0",
        fontFamily: "'DM Sans', sans-serif",
        padding: "28px 32px",
        position: "relative",
        boxSizing: "border-box",
      }}>

        {/* Subtle ambient glow */}
        <div style={{
          position: "fixed", top: -120, right: -80,
          width: 340, height: 340, borderRadius: "50%",
          background: "radial-gradient(circle, rgba(99,80,220,0.10) 0%, transparent 70%)",
          pointerEvents: "none", zIndex: 0,
        }} />

        <div style={{ maxWidth: 720, margin: "0 auto", position: "relative", zIndex: 1 }}>

          {/* ── Header ─────────────────────────────────────────────────────── */}
          <div style={{
            display: "flex", alignItems: "center",
            justifyContent: "space-between", marginBottom: 28,
          }}>
            {/* Logo */}
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <div style={{
                width: 34, height: 34,
                background: "linear-gradient(135deg, #6350dc, #a88bfa)",
                borderRadius: 9, display: "flex",
                alignItems: "center", justifyContent: "center",
              }}>
                <i className="ti ti-arrows-exchange" style={{ fontSize: 17, color: "#fff" }} aria-hidden="true" />
              </div>
              <span style={{ fontSize: 15, fontWeight: 500, letterSpacing: "-0.01em" }}>
                p2p<span style={{ color: "#8b7ff5" }}>share</span>
              </span>
            </div>

            {/* Right side */}
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              {/* Online badge */}
              <div style={{
                display: "flex", alignItems: "center", gap: 6,
                fontSize: 12, color: "#7a7891",
                background: "#14131e",
                border: "0.5px solid #252438",
                padding: "5px 11px", borderRadius: 20,
              }}>
                <span style={{
                  width: 6, height: 6, borderRadius: "50%",
                  background: "#4ade80",
                  boxShadow: "0 0 6px rgba(74,222,128,0.55)",
                  display: "inline-block",
                }} />
                <span style={{ color: "#e8e6f0", fontWeight: 500 }}>{onlineCount}</span>
                <span>online</span>
              </div>

              {/* User chip */}
              <div style={{
                display: "flex", alignItems: "center", gap: 8,
                background: "#14131e",
                border: "0.5px solid #252438",
                padding: "5px 12px 5px 6px",
                borderRadius: 20, fontSize: 12, color: "#7a7891",
              }}>
                <div style={{
                  width: 22, height: 22, borderRadius: "50%",
                  background: "linear-gradient(135deg, #6350dc, #a88bfa)",
                  display: "flex", alignItems: "center",
                  justifyContent: "center",
                  fontSize: 9, fontWeight: 500, color: "#fff",
                }}>
                  {initials}
                </div>
                {user?.username}
              </div>

              <button
                onClick={logout}
                style={{
                  background: "none",
                  border: "0.5px solid #2a2840",
                  color: "#7a7891",
                  fontSize: 12,
                  fontFamily: "'DM Sans', sans-serif",
                  padding: "5px 12px",
                  borderRadius: 8, cursor: "pointer",
                  transition: "border-color 0.15s, color 0.15s",
                }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = "#4a4668"; e.currentTarget.style.color = "#c8c6d8"; }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = "#2a2840"; e.currentTarget.style.color = "#7a7891"; }}
              >
                sign out
              </button>
            </div>
          </div>

          {/* ── P2P Panel ──────────────────────────────────────────────────── */}
          <div style={{
            background: "#14131e",
            border: "0.5px solid #252438",
            borderRadius: 14,
            padding: "18px 20px",
            marginBottom: 20,
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
              <span style={{
                fontSize: 11, fontWeight: 500,
                letterSpacing: "0.08em", textTransform: "uppercase",
                color: "#5d5b78",
              }}>
                P2P Transfer
              </span>
              <span style={{
                fontSize: 10,
                background: "rgba(99,80,220,0.15)",
                color: "#8b7ff5",
                border: "0.5px solid rgba(99,80,220,0.3)",
                padding: "2px 8px", borderRadius: 20,
                fontFamily: "'DM Mono', monospace",
              }}>
                WebRTC
              </span>
            </div>

            {/* P2PTransfer renders its own internals — wrap it with our styles */}
            <P2PTransfer socket={socketRef.current} onSendFile={handleSendFile} />
          </div>

          {/* ── Tabs ───────────────────────────────────────────────────────── */}
          <div style={{
            display: "flex", gap: 4, marginBottom: 18,
            background: "#14131e",
            border: "0.5px solid #252438",
            padding: 4, borderRadius: 10, width: "fit-content",
          }}>
            {[
              { key: "my",     label: "My files",       icon: "ti-files",  count: files.length },
              { key: "shared", label: "Shared with me", icon: "ti-share",  count: sharedFiles.length },
            ].map(({ key, label, icon, count }) => (
              <button
                key={key}
                onClick={() => setTab(key)}
                style={{
                  background: tab === key ? "#252438" : "none",
                  border: "none",
                  color: tab === key ? "#e8e6f0" : "#5d5b78",
                  fontSize: 13,
                  fontFamily: "'DM Sans', sans-serif",
                  fontWeight: 400,
                  padding: "6px 16px",
                  borderRadius: 7, cursor: "pointer",
                  display: "flex", alignItems: "center", gap: 6,
                  transition: "background 0.15s, color 0.15s",
                }}
              >
                <i className={`ti ${icon}`} aria-hidden="true" />
                {label}
                <span style={{
                  fontSize: 11, fontFamily: "'DM Mono', monospace",
                  background: tab === key ? "rgba(99,80,220,0.2)" : "#1e1d2e",
                  color: tab === key ? "#8b7ff5" : "#5d5b78",
                  padding: "1px 6px", borderRadius: 10,
                }}>
                  {count}
                </span>
              </button>
            ))}
          </div>

          {/* ── Upload zone (my files only) ────────────────────────────────── */}
          {tab === "my" && (
            <div style={{ marginBottom: 16 }}>
              {/* Wrap FileUpload with styled drop zone styling via a wrapper */}
              <FileUpload onUploadSuccess={handleUploadSuccess} />
            </div>
          )}

          {/* ── File list ──────────────────────────────────────────────────── */}
          {loading ? (
            <div style={{
              textAlign: "center", padding: "40px 0",
              fontSize: 13, color: "#4e4c68",
            }}>
              <i className="ti ti-loader-2" style={{
                fontSize: 22, display: "block", marginBottom: 8,
                animation: "spin 1s linear infinite",
              }} aria-hidden="true" />
              loading files…
              <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
            </div>
          ) : (
            <EnhancedFileList
              files={tab === "my" ? files : sharedFiles}
              onDelete={handleDelete}
              onShare={setSharingFile}
              isOwner={tab === "my"}
            />
          )}

        </div>

        {/* ── Modals & overlays ──────────────────────────────────────────────── */}
        {sharingFile && (
          <ShareModal file={sharingFile} onClose={() => setSharingFile(null)} />
        )}

        <Notifications notifications={notifications} />
      </div>
    </>
  );
}