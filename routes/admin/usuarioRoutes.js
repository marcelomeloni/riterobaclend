const router = require("express").Router();
const usuarioController = require("../../controllers/admin/usuarioController");
const { requireAdmin } = require("../../middleware/auth");

router.use(requireAdmin);

router.get("/", usuarioController.index);
router.get("/:id", usuarioController.show);
router.post("/", usuarioController.store);
router.put("/:id", usuarioController.update);
router.delete("/:id", usuarioController.destroy);

module.exports = router;
