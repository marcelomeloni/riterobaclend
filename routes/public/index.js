const express = require("express");
const router = express.Router();

const authRoutes = require("./authRoutes");
const pedidoRoutes = require("./pedidoRoutes");
const pdvRoutes = require("./pontoDeVendaRoutes");
const enderecoRoutes = require("./enderecoRoutes");
const favoritoRoutes = require("./favoritoRoutes");
const avaliacaoRoutes = require("./avaliacaoRoutes");
const freteRoutes = require("./freteRoutes");
const cupomRoutes = require("./cupomRoutes");
const webhookRoutes = require("./webhookRoutes");

router.use("/auth", authRoutes);
router.use("/pedidos", pedidoRoutes);
router.use("/pontos-de-venda", pdvRoutes);
router.use("/enderecos", enderecoRoutes);
router.use("/favoritos", favoritoRoutes);
router.use("/avaliacoes", avaliacaoRoutes);
router.use("/frete", freteRoutes);
router.use("/cupons", cupomRoutes);
router.use("/webhooks", webhookRoutes);

module.exports = router;
