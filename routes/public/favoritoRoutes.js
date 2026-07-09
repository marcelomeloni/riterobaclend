const express = require("express");
const favoritoController = require("../../controllers/public/favoritoController");
const { requireClient } = require("../../middleware/auth");

const router = express.Router();

router.use(requireClient);

router.get("/", favoritoController.list);
router.post("/", favoritoController.add);
router.delete("/:id_cafe", favoritoController.remove);

module.exports = router;
