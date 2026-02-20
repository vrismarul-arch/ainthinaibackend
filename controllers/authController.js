const db = require('../config/db');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');

const { hashPassword, comparePassword } = require('../utils/hash');

exports.register = async (req, res) => {
  const { email, password } = req.body;
  const hashed = await hashPassword(password);

  await db.query(
    'INSERT INTO admins (email, password) VALUES (?, ?)',
    [email, hashed]
  );

  res.send('Registered');
};

exports.createAdmin = async (req, res) => {
  const { email, password } = req.body;

  const hash = await bcrypt.hash(password, 10);

  await db.query(
    "INSERT INTO admins (email, password) VALUES (?, ?)",
    [email, hash]
  );

  res.json({ message: "Admin created successfully" });
};


exports.login = async (req, res) => {
  const { email, password } = req.body;

  const [rows] = await db.query(
    'SELECT * FROM admins WHERE email=?',
    [email]
  );

  if (!rows.length) return res.status(401).send('User not found');

  const valid = await comparePassword(password, rows[0].password);

  if (!valid) return res.status(401).send('Wrong password');

  const token = jwt.sign({ id: rows[0].id }, process.env.JWT_SECRET);

  res.json({ token });
};
