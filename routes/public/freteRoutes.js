const express = require("express");
const freteController = require("../../controllers/public/freteController");

const router = express.Router();

router.post("/calcular", freteController.calcularFrete);

module.exports = router;
