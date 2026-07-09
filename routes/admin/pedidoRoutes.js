const router = require("express").Router();
const pedidoController = require("../../controllers/admin/pedidoController");
const { requireAdmin } = require("../../middleware/auth");

router.use(requireAdmin);

router.get("/", pedidoController.index);
router.get("/:id", pedidoController.show);
router.patch("/:id/status", pedidoController.updateStatus);

module.exports = router;
