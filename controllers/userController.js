const bcrypt = require("bcryptjs");
const db = require("../config/db");

// 🔹 GET /api/users/profile
exports.getProfile = async (req, res) => {
  try {
    const [rows] = await db.execute(
      `SELECT id, name, email, phone, profile_pic, role, created_at
       FROM users
       WHERE id = ?`,
      [req.user.id]
    );

    if (rows.length === 0) {
      return res.status(404).json({ message: "User not found" });
    }

    return res.status(200).json(rows[0]);
  } catch (error) {
    console.error("Get profile error:", error);
    return res.status(500).json({ message: "Server error" });
  }
};

// 🔹 PUT /api/users/profile
exports.updateProfile = async (req, res) => {
  try {
    const { name, phone, profile_pic } = req.body;

    if (name !== undefined && !String(name).trim()) {
      return res.status(400).json({ message: "Name cannot be empty" });
    }

    // only update fields that were actually sent
    const fields = [];
    const values = [];

    if (name !== undefined) {
      fields.push("name = ?");
      values.push(String(name).trim());
    }
    if (phone !== undefined) {
      fields.push("phone = ?");
      values.push(phone || null);
    }
    if (profile_pic !== undefined) {
      fields.push("profile_pic = ?");
      values.push(profile_pic || null);
    }

    if (fields.length === 0) {
      return res.status(400).json({ message: "Nothing to update" });
    }

    values.push(req.user.id);

    await db.execute(
      `UPDATE users SET ${fields.join(", ")} WHERE id = ?`,
      values
    );

    const [rows] = await db.execute(
      `SELECT id, name, email, phone, profile_pic, role, created_at
       FROM users
       WHERE id = ?`,
      [req.user.id]
    );

    return res.status(200).json({
      message: "Profile updated successfully",
      user: rows[0],
    });
  } catch (error) {
    console.error("Update profile error:", error);
    return res.status(500).json({ message: "Server error" });
  }
};

// 🔹 PUT /api/users/change-password
exports.changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!newPassword || newPassword.length < 6) {
      return res
        .status(400)
        .json({ message: "New password must be at least 6 characters" });
    }

    const [rows] = await db.execute(
      "SELECT id, password FROM users WHERE id = ?",
      [req.user.id]
    );

    if (rows.length === 0) {
      return res.status(404).json({ message: "User not found" });
    }

    const user = rows[0];

    // Google-only users have no password yet, so they can set one directly
    if (user.password) {
      if (!currentPassword) {
        return res.status(400).json({ message: "Current password required" });
      }
      const match = await bcrypt.compare(currentPassword, user.password);
      if (!match) {
        return res.status(400).json({ message: "Current password is wrong" });
      }
    }

    const hashed = await bcrypt.hash(newPassword, 10);

    await db.execute("UPDATE users SET password = ? WHERE id = ?", [
      hashed,
      req.user.id,
    ]);

    return res.status(200).json({ message: "Password updated successfully" });
  } catch (error) {
    console.error("Change password error:", error);
    return res.status(500).json({ message: "Server error" });
  }
};

// 🔹 DELETE /api/users/profile
exports.deleteAccount = async (req, res) => {
  try {
    await db.execute("DELETE FROM users WHERE id = ?", [req.user.id]);
    return res.status(200).json({ message: "Account deleted" });
  } catch (error) {
    console.error("Delete account error:", error);
    return res.status(500).json({ message: "Server error" });
  }
};