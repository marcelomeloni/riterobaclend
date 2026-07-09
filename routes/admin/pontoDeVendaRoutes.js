const router = require("express").Router();
const pontoDeVendaController = require("../../controllers/admin/pontoDeVendaController");
const { requireAdmin } = require("../../middleware/auth");

router.use(requireAdmin);

router.get("/", pontoDeVendaController.index);
router.get("/:id", pontoDeVendaController.show);
router.post("/", pontoDeVendaController.store);
router.put("/:id", pontoDeVendaController.update);
router.delete("/:id", pontoDeVendaController.destroy);

module.exports = router;
