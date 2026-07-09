const express = require("express");
const router = express.Router();
const pedidoController = require("../../controllers/public/pedidoController");

router.post("/mercadopago", pedidoController.handleMercadoPagoWebhook);

module.exports = router;
