// pages/api/admin/updateAdmin.ts
import type { NextApiRequest, NextApiResponse } from "next";
import bcrypt        from "bcryptjs";
import Admin         from "../../../models/Admin";
import connectToDB   from "../../../lib/mongodb";

/**
 * PUT /api/admin/updateAdmin
 * Body: { currentEmail, newEmail, newPassword }
 *
 * – verifies the current admin exists
 * – updates email + password hash in one atomic op
 */
export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "PUT")
    return res.status(405).json({ success: false, message: "PUT only" });

  const { currentEmail, newEmail, newPassword } = req.body;
  if (!currentEmail || !newEmail || !newPassword)
    return res
      .status(400)
      .json({ success: false, message: "Missing fields in body" });

  try {
    await connectToDB();

    const admin = await Admin.findOne({ email: currentEmail });
    if (!admin)
      return res
        .status(404)
        .json({ success: false, message: "Current admin not found" });

    // hash the new password
    const password = await bcrypt.hash(newPassword, 10);

    // single MongoDB update
    admin.email = newEmail;
    admin.password = password;
    await admin.save();

    return res
      .status(200)
      .json({ success: true, message: "Admin credentials updated" });
  } catch (err) {
    console.error("updateAdmin_error", err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
}
