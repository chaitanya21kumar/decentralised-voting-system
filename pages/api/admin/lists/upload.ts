// pages/api/admin/lists/upload.ts
import type { NextApiRequest, NextApiResponse } from "next";
import formidable, { IncomingForm } from "formidable";
import fs from "fs";
import pinataSDK from "@pinata/sdk";

// ✅ read keys from environment – never hard-code them
const pinata = new pinataSDK(
  process.env.PINATA_API_KEY as string,
  process.env.PINATA_SECRET_KEY as string,
);

export const config = {
  api: { bodyParser: false },     // tell Next.js not to parse multipart
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ success: false, message: "Method not allowed" });
  }

  const form = new IncomingForm({ keepExtensions: true });

  form.parse(req, async (err, _fields, files) => {
    if (err) {
      console.error("Formidable parse error:", err);
      return res.status(500).json({ success: false, message: "File parsing error" });
    }

    try {
      const fileKeys = Object.keys(files);
      const fileResponses: Record<string, { fileName: string; ipfsHash: string }> = {};

      for (const key of fileKeys) {
        const fileData = files[key];
        const file = Array.isArray(fileData) ? fileData[0] : fileData;
        if (!file) continue;

        const fileStream = fs.createReadStream(file.filepath);

        // 🔐 pins the file to IPFS under your Pinata account
        const result = await pinata.pinFileToIPFS(fileStream, {
          pinataMetadata: { name: file.originalFilename || "uploaded_file" },
        });

        fileResponses[key] = {
          fileName: file.originalFilename ?? "uploaded_file",
          ipfsHash: result.IpfsHash,
        };
      }

      return res.status(200).json({ success: true, data: fileResponses });
    } catch (error) {
      console.error("Pinata upload error:", error);
      if (!res.headersSent) {
        res.status(500).json({ success: false, message: "Server error during upload" });
      }
    }
  });
}
