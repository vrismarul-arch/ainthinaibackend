const db = require("../config/db");

// 🔹 Get All Users (Admin)
exports.getUsers = async (req, res) => {
  try {
    const [rows] = await db.query("SELECT * FROM users");
    res.status(200).json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
};

// 🔹 Add User
exports.addUser = async (req, res) => {
  const { name, email } = req.body;

  try {
    await db.query(
      "INSERT INTO users (name, email) VALUES (?, ?)",
      [name, email]
    );

    res.status(201).json({ message: "User added successfully" });

  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
};

// 🔹 Get Logged-in User Profile
exports.getProfile = async (req, res) => {
  try {
    const userId = req.user.id;

    const [rows] = await db.query(
      "SELECT id, name, email, profile_pic,phone, role FROM users WHERE id = ?",
      [userId]
    );

    if (rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    res.status(200).json(rows[0]);

  } catch (error) {
    console.error("Profile Error:", error);
    res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
};
exports.updateProfile = async (req, res) => {
  try {
    const userId = req.user.id;
    const { name, email, phone } = req.body;

    await db.query(
      `UPDATE users 
       SET name = ?, email = ?, phone = ?
       WHERE id = ?`,
      [name, email, phone, userId]
    );

    res.status(200).json({
      success: true,
      message: "Profile updated successfully"
    });

  } catch (error) {
    console.error("Update Profile Error:", error);
    res.status(500).json({
      success: false,
      message: "Server error"
    });
  }
};