const express = require("express");
const pdvController = require("../../controllers/public/pontoDeVendaController");

const router = express.Router();

router.get("/", pdvController.index);

module.exports = router;
