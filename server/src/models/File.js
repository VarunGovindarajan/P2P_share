import mongoose from "mongoose";

const fileSchema = new mongoose.Schema(
  {
    filename: { type: String, required: true },
    originalName: { type: String, required: true },
    mimetype: { type: String, required: true },
    size: { type: Number, required: true },
    ownerId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    ipfsCid: { type: String, default: null },
    fileHash: { type: String, default: null },
    encryptionKeyEnc: { type: String, default: null },
    localPath: { type: String, default: null },
  },
  { timestamps: true }
);

export default mongoose.model("File", fileSchema);