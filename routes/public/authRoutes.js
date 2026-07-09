const express = require("express");
const router = express.Router();
const authController = require("../../controllers/public/authController");
const { requireClient } = require("../../middleware/auth");

router.post("/register", authController.register);
router.post("/login", authController.login);
router.get("/me", requireClient, authController.me);

module.exports = router;
