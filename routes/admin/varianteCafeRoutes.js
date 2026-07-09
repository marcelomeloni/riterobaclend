const router = require("express").Router();
const varianteCafeController = require("../../controllers/admin/varianteCafeController");
const { requireAdmin } = require("../../middleware/auth");
const { upload } = require("../../middleware/upload");

router.use(requireAdmin);

router.get("/", varianteCafeController.index);
router.get("/:id", varianteCafeController.show);
router.post("/", upload.single("imagem"), varianteCafeController.store);
router.put("/:id", upload.single("imagem"), varianteCafeController.update);
router.delete("/:id", varianteCafeController.destroy);

module.exports = router;
