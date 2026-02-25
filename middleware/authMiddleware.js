const jwt = require("jsonwebtoken");

module.exports = (req, res, next) => {
  const header = req.headers.authorization;

  if (!header) {
    return res.status(401).json({ message: "No token provided" });
  }

  const token = header.split(" ")[1];

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // 🔥 IMPORTANT
    req.user = {
      id: decoded.id,
      role: decoded.role
    };

    next();

  } catch (err) {
    return res.status(401).json({ message: "Invalid token" });
  }
};
