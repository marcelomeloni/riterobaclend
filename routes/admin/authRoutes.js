const router = require("express").Router();
const authController = require("../../controllers/admin/authController");
const { requireAdmin } = require("../../middleware/auth");

// Rota pública
router.post("/login", authController.login);

// Rota protegida
router.get("/me", requireAdmin, authController.me);

module.exports = router;
