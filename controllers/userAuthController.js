const jwt = require("jsonwebtoken");
const { OAuth2Client } = require("google-auth-library");
const db = require("../config/db");

const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

// Get Google user info from either an ID token or an access token
const getGoogleProfile = async ({ token, access_token }) => {
  // Case 1: ID token (GoogleLogin component)
  if (token) {
    const ticket = await client.verifyIdToken({
      idToken: token,
      audience: process.env.GOOGLE_CLIENT_ID,
    });
    return ticket.getPayload();
  }

  // Case 2: access token (useGoogleLogin custom button)
  if (access_token) {
    const response = await fetch(
      "https://www.googleapis.com/oauth2/v3/userinfo",
      { headers: { Authorization: `Bearer ${access_token}` } }
    );

    if (!response.ok) {
      throw new Error("Failed to fetch Google user info");
    }

    return await response.json();
  }

  return null;
};

// 🔹 GOOGLE LOGIN CONTROLLER
exports.googleLogin = async (req, res) => {
  try {
    const { token, access_token } = req.body;

    if (!token && !access_token) {
      return res.status(400).json({ message: "Google token missing" });
    }

    // 1️⃣ Verify with Google
    const payload = await getGoogleProfile({ token, access_token });

    if (!payload) {
      return res.status(400).json({ message: "Invalid Google data" });
    }

    const { sub: google_id, name, email, picture, email_verified } = payload;

    if (!email || !email_verified) {
      return res.status(400).json({ message: "Email not verified" });
    }

    // 2️⃣ Check if user exists
    const [rows] = await db.execute("SELECT * FROM users WHERE email = ?", [
      email,
    ]);

    let user;

    if (rows.length === 0) {
      // 3️⃣ New user
      const [result] = await db.execute(
        `INSERT INTO users (google_id, name, email, profile_pic, role)
         VALUES (?, ?, ?, ?, ?)`,
        [google_id, name, email, picture, "user"]
      );

      user = { id: result.insertId, role: "user" };
    } else {
      user = rows[0];

      // backfill Google data for users who registered with email first
      if (!user.google_id || !user.profile_pic) {
        await db.execute(
          `UPDATE users
           SET google_id = COALESCE(google_id, ?),
               profile_pic = COALESCE(profile_pic, ?)
           WHERE id = ?`,
          [google_id, picture, user.id]
        );
      }
    }

    // 4️⃣ App JWT
    const appToken = jwt.sign(
      { id: user.id, role: user.role },
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