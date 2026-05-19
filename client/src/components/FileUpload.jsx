import { useState, useRef } from "react";
import api from "../utils/axios";

export default function FileUpload({ onUploadSuccess }) {
  const [dragging, setDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState("");
  const inputRef = useRef();

  const handleUpload = async (file) => {
    if (!file) return;
    setError("");
    setUploading(true);
    setProgress(0);

    const formData = new FormData();
    formData.append("file", file);

    try {
      const res = await api.post("/files/upload", formData, {
        headers: { "Content-Type": "multipart/form-data" },
        onUploadProgress: (e) => {
          setProgress(Math.round((e.loaded * 100) / e.total));
        },
      });
      onUploadSuccess(res.data.file);
    } catch (err) {
      setError(err.response?.data?.message || "Upload failed");
    } finally {
      setUploading(false);
      setProgress(0);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) handleUpload(file);
  };

  return (
    <div style={{ marginBottom: 16 }}>
      <div
        onClick={() => !uploading && inputRef.current.click()}
        onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={handleDrop}
        style={{
          border: `1px dashed ${dragging ? "#6350dc" : "#252438"}`,
          borderRadius: 12,
          padding: "22px 20px",
          textAlign: "center",
          cursor: uploading ? "default" : "pointer",
          background: dragging ? "rgba(99,80,220,0.05)" : "transparent",
          transition: "border-color 0.15s, background 0.15s",
        }}
        onMouseEnter={e => {
          if (!uploading && !dragging) {
            e.currentTarget.style.borderColor = "#6350dc";
            e.currentTarget.style.background = "rgba(99,80,220,0.04)";
          }
        }}
        onMouseLeave={e => {
          if (!dragging) {
            e.currentTarget.style.borderColor = "#252438";
            e.currentTarget.style.background = "transparent";
          }
        }}
      >
        {/* Icon */}
        <div style={{
          width: 40, height: 40, borderRadius: 10,
          background: "rgba(99,80,220,0.12)",
          display: "flex", alignItems: "center",
          justifyContent: "center", margin: "0 auto 10px",
        }}>
          <i
            className={`ti ${uploading ? "ti-loader-2" : "ti-cloud-upload"}`}
            style={{
              fontSize: 20, color: "#8b7ff5",
              animation: uploading ? "spin 1s linear infinite" : "none",
            }}
            aria-hidden="true"
          />
        </div>

        {uploading ? (
          <>
            <p style={{ margin: 0, fontSize: 13, color: "#8b7ff5", fontWeight: 500 }}>
              uploading… {progress}%
            </p>
            {/* Progress bar */}
            <div style={{
              marginTop: 10, width: "100%", maxWidth: 200,
              margin: "10px auto 0",
              background: "#1a1928", borderRadius: 99, height: 3,
              overflow: "hidden",
            }}>
              <div style={{
                width: `${progress}%`, height: "100%",
                background: "linear-gradient(90deg, #6350dc, #8b7ff5)",
                borderRadius: 99,
                transition: "width 0.2s ease",
              }} />
            </div>
          </>
        ) : (
          <>
            <p style={{ margin: 0, fontSize: 13, color: "#5d5b78" }}>
              <span style={{ color: "#8b7ff5", fontWeight: 500 }}>click to upload</span>
              {" "}or drag & drop
            </p>
            <p style={{ margin: "4px 0 0", fontSize: 11, color: "#38364f" }}>
              any file up to 500 MB
            </p>
          </>
        )}

        <input
          ref={inputRef}
          type="file"
          style={{ display: "none" }}
          onChange={(e) => handleUpload(e.target.files[0])}
        />
      </div>

      {error && (
        <p style={{
          margin: "8px 0 0", fontSize: 12,
          color: "#E24B4A", display: "flex", alignItems: "center", gap: 5,
        }}>
          <i className="ti ti-alert-circle" style={{ fontSize: 13 }} aria-hidden="true" />
          {error}
        </p>
      )}
    </div>
  );
}