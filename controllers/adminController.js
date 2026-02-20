const db = require('../config/db');

// Dashboard stats
exports.getDashboard = async (req, res) => {
  try {
    const [rows] = await db.query('SELECT COUNT(*) AS users FROM users');
    res.json(rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
};

// Get all users
exports.getUsers = async (req, res) => {
  try {
    const [rows] = await db.query('SELECT * FROM users');
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
};

// Get admin profile
exports.getAdminProfile = async (req, res) => {
  try {
    const [rows] = await db.query(
      'SELECT id, name, email, phone_number FROM admins WHERE id = ?',
      [req.adminId]
    );

    if (rows.length === 0) {
      return res.status(404).json({ message: 'Admin not found' });
    }

    res.json(rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
};
