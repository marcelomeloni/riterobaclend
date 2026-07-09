const express = require("express");
const router = express.Router();
const pedidoController = require("../../controllers/public/pedidoController");
const { requireClient } = require("../../middleware/auth");

router.get("/", requireClient, pedidoController.listMeusPedidos);
router.post("/checkout", requireClient, pedidoController.checkout);
router.get("/:id", requireClient, pedidoController.getMeuPedidoById);
router.patch("/:id/pagar", requireClient, pedidoController.confirmarPagamento);

module.exports = router;
