import type { NextApiRequest, NextApiResponse } from "next";
import formidable, { IncomingForm } from "formidable";
import fs from "fs";
import axios from "axios";
import FormData from "form-data";

export const config = {
  api: { bodyParser: false },
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
    console.log("Parsed files:", files); // Add this line for debugging

    const fileKeys = Object.keys(files);
    const fileResponses: Record<string, { fileName: string; ipfsHash: string }> = {};

    for (const key of fileKeys) {
      const fileData = files[key];
      const file = Array.isArray(fileData) ? fileData[0] : fileData;
      if (!file) {
        console.warn(`No file found under key: ${key}`);
        continue;
      }

      console.log(`Uploading file:`, file); // Debug file info

      const fileStream = fs.createReadStream(file.filepath);

      const formData = new FormData();
      formData.append("file", fileStream, file.originalFilename || "uploaded_file");

      const metadata = JSON.stringify({
        name: file.originalFilename || "uploaded_file",
      });
      formData.append("pinataMetadata", metadata);

      const response = await axios.post("https://api.pinata.cloud/pinning/pinFileToIPFS", formData, {
        headers: {
          ...formData.getHeaders(),
          pinata_api_key: process.env.PINATA_API_KEY!,
          pinata_secret_api_key: process.env.PINATA_SECRET_KEY!,
        },
        maxBodyLength: Infinity,
      });

      fileResponses[key] = {
        fileName: file.originalFilename ?? "uploaded_file",
        ipfsHash: response.data.IpfsHash,
      };
    }

    return res.status(200).json({ success: true, data: fileResponses });
  } catch (error: any) {
    console.error("Pinata upload error:", error?.response?.data || error.message || error);
    if (!res.headersSent) {
      res.status(500).json({ success: false, message: "Server error during upload" });
    }
  }
});

}
