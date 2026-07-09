const express = require("express");
const cupomController = require("../../controllers/public/cupomController");

const router = express.Router();

router.post("/validar", cupomController.validar);

module.exports = router;
