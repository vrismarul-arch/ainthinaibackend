const db = require("../config/db");

const isAdmin = async (email) => {
  const [adminCheck] = await db.execute(
    "SELECT id FROM admin WHERE email = ?",
    [email]
  );
  return adminCheck.length > 0;
};

module.exports = { isAdmin };