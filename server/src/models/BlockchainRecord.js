import mongoose from "mongoose";

const blockchainRecordSchema = new mongoose.Schema({
  fileId: { type: mongoose.Schema.Types.ObjectId, ref: "File", required: true },
  fileHash: { type: String, required: true },
  previousHash: { type: String, required: true },
  blockHash: { type: String, required: true },
  timestamp: { type: Date, default: Date.now },
});

export default mongoose.model("BlockchainRecord", blockchainRecordSchema);