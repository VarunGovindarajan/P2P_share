import { PinataSDK } from "pinata";

let pinata = null;

const getPinata = () => {
  if (!pinata) {
    pinata = new PinataSDK({
      pinataJwt: process.env.PINATA_JWT,
      pinataGateway: process.env.PINATA_GATEWAY,
    });
  }
  return pinata;
};

export const uploadToIPFS = async (fileBuffer, filename = "upload") => {
  try {
    const blob = new Blob([fileBuffer]);
    const file = new File([blob], filename, { type: "application/octet-stream" });
    const result = await getPinata().upload.public.file(file);
    return result.cid;
  } catch (err) {
    console.error("IPFS UPLOAD ERROR:", err);
    throw err;
  }
};

export const getFromIPFS = async (cid) => {
  const response = await fetch(`https://${process.env.PINATA_GATEWAY}/ipfs/${cid}`);
  if (!response.ok) throw new Error(`IPFS fetch failed: ${response.statusText}`);
  const arrayBuffer = await response.arrayBuffer();
  return Buffer.from(arrayBuffer);
};