// middleware/auth.js
const jwt = require("jsonwebtoken");

function verifyToken(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).send({ msg: "No token provided" });
  }

  const token = authHeader.split(" ")[1];

  jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
    if (err) return res.status(401).send({ msg: "Invalid or expired token" });
    req.user = decoded; // e.g. { user_id, username }
    next();
  });
}

module.exports = verifyToken;
