const jwt = require("jsonwebtoken");
const { OAuth2Client } = require("google-auth-library");
const db = require("../config/db");

const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

// 🔹 GOOGLE LOGIN CONTROLLER
exports.googleLogin = async (req, res) => {
  try {
    const { token } = req.body;

    if (!token) {
      return res.status(400).json({ message: "Google token missing" });
    }

    // 1️⃣ Verify Google token
    const ticket = await client.verifyIdToken({
      idToken: token,
      audience: process.env.GOOGLE_CLIENT_ID,
    });

    const payload = ticket.getPayload();

    const {
      sub: google_id,
      name,
      email,
      picture,
      email_verified,
    } = payload;

    if (!email_verified) {
      return res.status(400).json({ message: "Email not verified" });
    }

    // 2️⃣ Check if user exists
    const [rows] = await db.execute(
      "SELECT * FROM users WHERE email = ?",
      [email]
    );

    let user;

    if (rows.length === 0) {
      // 3️⃣ Insert new user
      const [result] = await db.execute(
        `INSERT INTO users (google_id, name, email, profile_pic, role)
         VALUES (?, ?, ?, ?, ?)`,
        [google_id, name, email, picture, "user"]
      );

      user = {
        id: result.insertId,
        role: "user",
      };
    } else {
      user = rows[0];
    }

    // 4️⃣ Generate JWT
    const appToken = jwt.sign(
      {
        id: user.id,
        role: user.role,
      },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );

    return res.status(200).json({
      message: "Google login successful",
      token: appToken,
      role: user.role,
    });

  } catch (error) {
    console.error("Google Login Error:", error);
    return res.status(401).json({ message: "Invalid Google token" });
  }
};