const router = require("express").Router();
const cafeController = require("../../controllers/admin/cafeController");
const { requireAdmin } = require("../../middleware/auth");
const { upload } = require("../../middleware/upload");

router.use(requireAdmin);

router.get("/", cafeController.index);
router.get("/:id", cafeController.show);
router.post("/", upload.single("imagem"), cafeController.store);
router.put("/:id", upload.single("imagem"), cafeController.update);
router.delete("/:id", cafeController.destroy);

module.exports = router;
