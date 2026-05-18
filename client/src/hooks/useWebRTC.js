import { useRef, useCallback } from "react";

const ICE_SERVERS = {
  iceServers: [{ urls: "stun:stun.l.google.com:19302" }],
};

const CHUNK_SIZE = 16 * 1024; // 16KB chunks

export const useWebRTC = (socket, onIncomingFile) => {
  const peerConnections = useRef({});
  const dataChannels = useRef({});
  const incomingFiles = useRef({});

  const createPeerConnection = useCallback((targetUserId) => {
    const pc = new RTCPeerConnection(ICE_SERVERS);

    pc.onicecandidate = ({ candidate }) => {
      if (candidate && socket) {
        socket.emit("webrtc-ice", { targetUserId, candidate });
      }
    };

    peerConnections.current[targetUserId] = pc;
    return pc;
  }, [socket]);

  // SENDER: initiate transfer
  const sendFile = useCallback(async (targetUserId, file, socket) => {
    const pc = createPeerConnection(targetUserId);

    const channel = pc.createDataChannel("file-transfer");
    dataChannels.current[targetUserId] = channel;

    channel.onopen = () => {
      const fileInfo = { name: file.name, size: file.size, type: file.type };
      channel.send(JSON.stringify({ type: "file-info", fileInfo }));

      const reader = new FileReader();
      reader.readAsArrayBuffer(file);
      reader.onload = () => {
        const buffer = reader.result;
        let offset = 0;
        while (offset < buffer.byteLength) {
          const chunk = buffer.slice(offset, offset + CHUNK_SIZE);
          channel.send(chunk);
          offset += CHUNK_SIZE;
        }
        channel.send(JSON.stringify({ type: "file-done" }));
      };
    };

    const offer = await pc.createOffer();
    await pc.setLocalDescription(offer);

    socket.emit("webrtc-offer", {
      targetUserId,
      offer,
      fileInfo: { name: file.name, size: file.size },
    });
  }, [createPeerConnection]);

  // RECEIVER: handle incoming offer
  const handleOffer = useCallback(async ({ fromUserId, offer, fileInfo, fromUsername }, socket) => {
    const accept = window.confirm(
      `${fromUsername} wants to send you "${fileInfo.name}" (${(fileInfo.size / 1024).toFixed(1)} KB). Accept?`
    );
    if (!accept) return;

    const pc = createPeerConnection(fromUserId);

    pc.ondatachannel = ({ channel }) => {
      const chunks = [];
      let receivedFileInfo = null;

      channel.onmessage = ({ data }) => {
        if (typeof data === "string") {
          const msg = JSON.parse(data);
          if (msg.type === "file-info") {
            receivedFileInfo = msg.fileInfo;
          } else if (msg.type === "file-done") {
            const blob = new Blob(chunks, { type: receivedFileInfo?.type });
            onIncomingFile(blob, receivedFileInfo);
          }
        } else {
          chunks.push(data);
        }
      };
    };

    await pc.setRemoteDescription(offer);
    const answer = await pc.createAnswer();
    await pc.setLocalDescription(answer);

    socket.emit("webrtc-answer", { targetUserId: fromUserId, answer });
  }, [createPeerConnection, onIncomingFile]);

  // Handle answer from receiver
  const handleAnswer = useCallback(async ({ fromUserId, answer }) => {
    const pc = peerConnections.current[fromUserId];
    if (pc) await pc.setRemoteDescription(answer);
  }, []);

  // Handle ICE candidates
  const handleIce = useCallback(async ({ fromUserId, candidate }) => {
    const pc = peerConnections.current[fromUserId];
    if (pc) await pc.addIceCandidate(candidate);
  }, []);

  return { sendFile, handleOffer, handleAnswer, handleIce };
};