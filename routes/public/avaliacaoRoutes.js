const express = require("express");
const avaliacaoController = require("../../controllers/public/avaliacaoController");
const { requireClient } = require("../../middleware/auth");

const router = express.Router();

router.get("/:id_cafe", avaliacaoController.listByCafe);
router.post("/", requireClient, avaliacaoController.create);

module.exports = router;
