import connectToDatabase from "../../../lib/mongodb";
import Admin from "../../../models/Admin";
import bcrypt from "bcrypt";
// import jwt from "jsonwebtoken";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ success: false, message: "Method not allowed" });
  }

  try {
    await connectToDatabase();


    const { email, password } = req.body;
    console.log("Login Attempt:", email);

    const admin = await Admin.findOne({ email });

    if (!admin) {
      console.log("Admin not found");
      return res.status(401).json({ success: false, message: "Invalid email or password" });
    }

    console.log("Stored Hashed Password:", admin.password);
    console.log("Entered Password:", password);

    const isPasswordValid = await bcrypt.compare(password, admin.password);
    console.log("Password Valid:", isPasswordValid);

    if (!isPasswordValid) {
      return res.status(401).json({ success: false, message: "Invalid email or password" });
    }

    // Uncomment if you want to use JWT authentication
    // const token = jwt.sign({ adminId: admin._id }, process.env.JWT_SECRET, { expiresIn: "1h" });
    // res.setHeader("Set-Cookie", `token=${token}; HttpOnly; Path=/; Max-Age=3600; Secure; SameSite=Strict`);

    console.log("Login Successful");
    return res.status(200).json({ success: true, message: "Login successful" });

  } catch (error) {
    console.error("Login error:", error);
    return res.status(500).json({ success: false, message: "Server error" });
  }
}
