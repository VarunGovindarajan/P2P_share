import crypto from "crypto";
import BlockchainRecord from "../models/BlockchainRecord.js";

const computeBlockHash = (fileId, fileHash, previousHash, timestamp) => {
  return crypto
    .createHash("sha256")
    .update(`${fileId}${fileHash}${previousHash}${timestamp}`)
    .digest("hex");
};

export const addBlock = async (fileId, fileHash) => {
  // Get last block to chain from
  const lastBlock = await BlockchainRecord.findOne().sort({ timestamp: -1 });
  const previousHash = lastBlock ? lastBlock.blockHash : "0".repeat(64);
  const timestamp = new Date();
  const blockHash = computeBlockHash(fileId, fileHash, previousHash, timestamp);

  const record = await BlockchainRecord.create({
    fileId,
    fileHash,
    previousHash,
    blockHash,
    timestamp,
  });

  return record;
};

export const verifyFile = async (fileId, currentFileHash) => {
  const record = await BlockchainRecord.findOne({ fileId });
  if (!record) return { verified: false, reason: "No blockchain record found" };

  // Check file hash matches
  if (record.fileHash !== currentFileHash)
    return { verified: false, reason: "File has been tampered" };

  // Recompute block hash to verify chain integrity
  const recomputed = computeBlockHash(
    record.fileId,
    record.fileHash,
    record.previousHash,
    record.timestamp
  );

  if (recomputed !== record.blockHash)
    return { verified: false, reason: "Blockchain record is corrupt" };

  return {
    verified: true,
    record: {
      fileHash: record.fileHash,
      previousHash: record.previousHash,
      blockHash: record.blockHash,
      timestamp: record.timestamp,
    },
  };
};