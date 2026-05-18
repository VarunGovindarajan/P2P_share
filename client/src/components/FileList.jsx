import api from "../utils/axios";

export default function FileList({ files, onDelete, onShare, isOwner }) {
  const formatSize = (bytes) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const handleDownload = async (file) => {
    try {
      const res = await api.get(`/files/${file._id}/download`, { responseType: "blob" });
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const a = document.createElement("a");
      a.href = url;
      a.download = file.originalName;
      a.click();
      window.URL.revokeObjectURL(url);
    } catch {
      alert("Download failed");
    }
  };

  const handleVerify = async (file) => {
    try {
      const res = await api.get(`/files/${file._id}/verify`);
      const { verified, reason, record } = res.data;
      if (verified) {
        alert(`✅ File verified!\n\nBlock Hash:\n${record.blockHash}\n\nTimestamp: ${new Date(record.timestamp).toLocaleString()}`);
      } else {
        alert(`❌ Verification failed!\n\nReason: ${reason}`);
      }
    } catch {
      alert("Verification request failed");
    }
  };

  const handleDelete = async (id) => {
    if (!confirm("Delete this file?")) return;
    try {
      await api.delete(`/files/${id}`);
      onDelete(id);
    } catch {
      alert("Delete failed");
    }
  };

  if (files.length === 0) {
    return <div className="text-center text-gray-600 py-12">No files here yet</div>;
  }

  return (
    <div className="space-y-3">
      {files.map((file) => (
        <div key={file._id} className="bg-gray-900 rounded-xl px-5 py-4">
          <div className="flex items-center justify-between">
            <div className="min-w-0 mr-4">
              <p className="text-white text-sm font-medium truncate">{file.originalName}</p>
              <p className="text-gray-500 text-xs mt-0.5">
                {formatSize(file.size)} · {new Date(file.createdAt).toLocaleDateString()}
              </p>
              {file.ipfsCid && (
                <p className="text-gray-600 text-xs mt-0.5 font-mono truncate">
                  IPFS: {file.ipfsCid}
                </p>
              )}
              {file.fileHash && (
                <p className="text-gray-600 text-xs mt-0.5 font-mono truncate">
                  SHA256: {file.fileHash.slice(0, 20)}...
                </p>
              )}
            </div>
            <div className="flex gap-2 shrink-0 flex-wrap justify-end">
              <button
                onClick={() => handleDownload(file)}
                className="bg-blue-600 hover:bg-blue-700 text-white text-xs px-3 py-1.5 rounded-lg transition"
              >
                Download
              </button>
              <button
                onClick={() => handleVerify(file)}
                className="bg-green-700 hover:bg-green-600 text-white text-xs px-3 py-1.5 rounded-lg transition"
              >
                Verify
              </button>
              {isOwner && (
                <>
                  <button
                    onClick={() => onShare(file)}
                    className="bg-purple-700 hover:bg-purple-600 text-white text-xs px-3 py-1.5 rounded-lg transition"
                  >
                    Share
                  </button>
                  <button
                    onClick={() => handleDelete(file._id)}
                    className="bg-gray-700 hover:bg-red-600 text-white text-xs px-3 py-1.5 rounded-lg transition"
                  >
                    Delete
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}