const db = require('../config/db');

exports.getUsers = async (req, res) => {
  try {
    const [rows] = await db.query('SELECT * FROM users');
    res.json(rows);
  } catch (err) {
    res.status(500).json(err);
  }
};

exports.addUser = async (req, res) => {
  const { name, email } = req.body;

  try {
    await db.query(
      'INSERT INTO users (name, email) VALUES (?, ?)',
      [name, email]
    );
    res.json({ message: 'User added' });
  } catch (err) {
    res.status(500).json(err);
  }
};
