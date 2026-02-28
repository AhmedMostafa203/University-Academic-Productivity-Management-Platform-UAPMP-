const jwt = require("jsonwebtoken");
const User = require("../models/User");

/**
 * Middleware to authenticate a request using a JWT.
 * Accepts token in `Authorization: Bearer <token>` header or `?token=` query param.
 */
const authenticateToken = async (req, res, next) => {
  try {
    let token = null;
    const authHeader = req.headers["authorization"] || "";
    if (authHeader.startsWith("Bearer ")) {
      token = authHeader.split(" ")[1];
    } else if (req.query && req.query.token) {
      token = req.query.token;
    }

    if (!token) {
      return res
        .status(401)
        .json({ message: "Authentication token required", code: "NO_TOKEN" });
    }

    const secret = process.env.JWT_SECRET || "dev_jwt_secret";
    let payload;
    try {
      payload = jwt.verify(token, secret);
    } catch (err) {
      return res
        .status(401)
        .json({ message: "Invalid or expired token", code: "INVALID_TOKEN" });
    }

    const user = await User.findById(payload.id).select("-password");
    if (!user) {
      return res
        .status(401)
        .json({ message: "User not found", code: "USER_NOT_FOUND" });
    }

    req.user = user;
    next();
  } catch (error) {
    console.error("[ERROR] authenticateToken:", error.message);
    res
      .status(500)
      .json({
        message: "Internal server error",
        code: "INTERNAL_SERVER_ERROR",
      });
  }
};

/**
 * Authorization middleware generator based on user role.
 * e.g. `authorizeRole('student')`.
 */
const authorizeRole = (role) => {
  return (req, res, next) => {
    if (!req.user) {
      return res
        .status(401)
        .json({ message: "Not authenticated", code: "NOT_AUTHENTICATED" });
    }

    if (req.user.role !== role) {
      return res
        .status(403)
        .json({ message: "Forbidden: insufficient role", code: "FORBIDDEN" });
    }
    next();
  };
};

module.exports = {
  authenticateToken,
  authorizeRole,
};
