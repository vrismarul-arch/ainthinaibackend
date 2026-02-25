// middleware/admin.js
module.exports = (req, res, next) => {
  if (req.user && req.user.role === 'admin') {
    next();
  } else {
    return res.status(403).json({ message: "Admin access required" });
  }
};