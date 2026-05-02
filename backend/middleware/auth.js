const checkRole = (roles) => {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({ message: "Access denied, user doesn't have the necessary permission(s)." });
    }
    next();
  };
};
module.exports = { checkRole };