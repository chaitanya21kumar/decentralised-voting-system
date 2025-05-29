import { serialize } from "cookie";

import type { NextApiRequest, NextApiResponse } from "next";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  // Clear the cookie
  if (req.method !== "POST") {
  return res.status(405).json({ message: "Method Not Allowed" });
}
  res.setHeader(
    "Set-Cookie",
    serialize("voterToken", "", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      path: "/",
      maxAge: 0, // Set to 0 to delete the cookie
    })
  );

  res.status(200).json({ success: true, message: "Logged out" });
}
