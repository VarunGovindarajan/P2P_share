import { useState, useEffect, useCallback, useRef } from "react";
import { io } from "socket.io-client";
import { useAuth } from "../context/AuthContext";
import FileUpload from "../components/FileUpload";
import FileList from "../components/FileList";
import ShareModal from "../components/ShareModal";
import Notifications from "../components/Notifications";
import P2PTransfer from "../components/P2PTransfer";
import { useWebRTC } from "../hooks/useWebRTC";
import api from "../utils/axios";

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

  // Handle incoming P2P file
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

  // Setup socket
  useEffect(() => {
    if (!token) return;

const socket = io(import.meta.env.VITE_SOCKET_URL || "http://localhost:5000", {
  auth: { token },
});    socketRef.current = socket;

    socket.on("online-users", (users) => setOnlineCount(users.length));

    socket.on("file-uploaded", ({ username, filename }) => {
      if (username !== user?.username) {
        addNotification("New file uploaded", `${username} uploaded ${filename}`);
      }
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

  return (
    <div className="min-h-screen bg-gray-950 text-white p-8">
      <div className="max-w-3xl mx-auto">

        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold">P2P File Share</h1>
            <p className="text-gray-400 text-sm mt-1">
              Welcome, {user?.username} ·{" "}
              <span className="text-green-400">{onlineCount} online</span>
            </p>
          </div>
          <button
            onClick={logout}
            className="bg-gray-800 hover:bg-gray-700 text-sm px-4 py-2 rounded-lg transition"
          >
            Logout
          </button>
        </div>

        {/* P2P Transfer */}
        <P2PTransfer socket={socketRef.current} onSendFile={handleSendFile} />

        {/* Tabs */}
        <div className="flex gap-2 mb-6">
          <button
            onClick={() => setTab("my")}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition
              ${tab === "my" ? "bg-blue-600 text-white" : "bg-gray-800 text-gray-400 hover:bg-gray-700"}`}
          >
            My Files ({files.length})
          </button>
          <button
            onClick={() => setTab("shared")}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition
              ${tab === "shared" ? "bg-blue-600 text-white" : "bg-gray-800 text-gray-400 hover:bg-gray-700"}`}
          >
            Shared With Me ({sharedFiles.length})
          </button>
        </div>

        {tab === "my" && <FileUpload onUploadSuccess={handleUploadSuccess} />}

        {loading ? (
          <p className="text-gray-500 text-sm text-center py-8 animate-pulse">Loading files...</p>
        ) : (
          <FileList
            files={tab === "my" ? files : sharedFiles}
            onDelete={handleDelete}
            onShare={setSharingFile}
            isOwner={tab === "my"}
          />
        )}
      </div>

      {sharingFile && (
        <ShareModal file={sharingFile} onClose={() => setSharingFile(null)} />
      )}
      <Notifications notifications={notifications} />
    </div>
  );
}