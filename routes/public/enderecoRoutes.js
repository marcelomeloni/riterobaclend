const express = require("express");
const enderecoController = require("../../controllers/public/enderecoController");
const { requireClient } = require("../../middleware/auth");

const router = express.Router();

router.use(requireClient);

router.get("/", enderecoController.list);
router.post("/", enderecoController.add);
router.delete("/:id", enderecoController.remove);
router.put("/:id", enderecoController.update);

module.exports = router;
