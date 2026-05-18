import mongoose from "mongoose";

const permissionSchema = new mongoose.Schema(
  {
    fileId: { type: mongoose.Schema.Types.ObjectId, ref: "File", required: true },
    ownerId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    grantedTo: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  },
  { timestamps: true }
);

// Prevent duplicate permissions
permissionSchema.index({ fileId: 1, grantedTo: 1 }, { unique: true });

export default mongoose.model("Permission", permissionSchema);