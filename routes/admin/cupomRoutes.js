const router = require("express").Router();
const cupomController = require("../../controllers/admin/cupomController");
const { requireAdmin } = require("../../middleware/auth");

router.use(requireAdmin);

router.get("/", cupomController.index);
router.get("/:id", cupomController.show);
router.get("/:id/analytics", cupomController.analytics);
router.post("/", cupomController.store);
router.put("/:id", cupomController.update);
router.delete("/:id", cupomController.destroy);

module.exports = router;
