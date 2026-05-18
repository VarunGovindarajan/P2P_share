import crypto from "crypto";

const ALGORITHM = "aes-256-cbc";

export const generateKey = () => crypto.randomBytes(32).toString("hex");

export const encryptFile = (fileBuffer, keyHex) => {
  const key = Buffer.from(keyHex, "hex");
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
  const encrypted = Buffer.concat([cipher.update(fileBuffer), cipher.final()]);
  // Prepend IV to encrypted data
  return Buffer.concat([iv, encrypted]);
};

export const decryptFile = (encryptedBuffer, keyHex) => {
  const key = Buffer.from(keyHex, "hex");
  const iv = encryptedBuffer.slice(0, 16);
  const data = encryptedBuffer.slice(16);
  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
  return Buffer.concat([decipher.update(data), decipher.final()]);
};

// Encrypt the AES key using a master secret so we can store it safely
export const encryptKey = (keyHex) => {
  const master = crypto
    .createHash("sha256")
    .update(process.env.JWT_SECRET)
    .digest();
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv(ALGORITHM, master, iv);
  const encrypted = Buffer.concat([
    cipher.update(Buffer.from(keyHex, "hex")),
    cipher.final(),
  ]);
  return iv.toString("hex") + ":" + encrypted.toString("hex");
};

export const decryptKey = (encryptedKeyStr) => {
  const master = crypto
    .createHash("sha256")
    .update(process.env.JWT_SECRET)
    .digest();
  const [ivHex, dataHex] = encryptedKeyStr.split(":");
  const iv = Buffer.from(ivHex, "hex");
  const data = Buffer.from(dataHex, "hex");
  const decipher = crypto.createDecipheriv(ALGORITHM, master, iv);
  return Buffer.concat([decipher.update(data), decipher.final()]).toString("hex");
};