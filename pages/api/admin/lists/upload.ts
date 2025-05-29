import { NextApiRequest, NextApiResponse } from "next";
import formidable, { File as FormidableFile, IncomingForm } from "formidable";
// import { verifyAdminAuth } from "../../../../lib/verifyAdminAuth";
import fs from "fs";
import pinataSDK from "@pinata/sdk";
const pinata = new pinataSDK("90b3ccabe543388210da", "7c3eaed89e56b0ebebd4a793d42a6dfd89626a7469aec2087e863bf2f4103380");

export const config = {
  api: {
    bodyParser: false,
  },
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    res.status(405).json({ success: false, message: "Method not allowed" });
    return;
  }

  const form = new IncomingForm({ keepExtensions: true });

  form.parse(req, async (err, fields, files) => {
    if (err) {
      console.error("Formidable parse error:", err);
      res.status(500).json({ success: false, message: "File parsing error" });
      return;
    }

    try {
    
      const fileKeys = Object.keys(files);
      const fileResponses: Record<string, any> = {};

      for (const key of fileKeys) {
        const fileData = files[key];
        // Handle both array or single file
        const file = Array.isArray(fileData) ? fileData[0] : fileData;
        if (file) {
          const fileStream = fs.createReadStream(file.filepath);
          
          const result = await pinata.pinFileToIPFS(fileStream, {
            pinataMetadata: { name: file.originalFilename || "uploaded_file" },
          });

          fileResponses[key] = {
            fileName: file.originalFilename,
            ipfsHash: result.IpfsHash,
          };
        } else {
          console.error(`File is undefined for key: ${key}`);
        }
      }

      res.status(200).json({ success: true, data: fileResponses });
    } catch (error) {
      console.error("Pinata Upload Error:", error);
       if (!res.headersSent)
      res.status(500).json({ success: false, message: "Server error" });
  
    }
  });
}
