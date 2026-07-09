const varianteCafeService = require("../../services/varianteCafeService");
const { uploadFile, deleteFile } = require("../../services/uploadService");

/** GET /api/admin/variantes?id_cafe=xxx */
async function index(req, res, next) {
  try {
    const { id_cafe } = req.query;
    if (!id_cafe) return res.status(400).json({ error: "Query param id_cafe é obrigatório." });
    const variantes = await varianteCafeService.listByCafe(id_cafe);
    res.json(variantes);
  } catch (err) { next(err); }
}

/** GET /api/admin/variantes/:id */
async function show(req, res, next) {
  try {
    const variante = await varianteCafeService.getById(req.params.id);
    res.json(variante);
  } catch (err) { next(err); }
}

/** POST /api/admin/variantes (com upload opcional) */
async function store(req, res, next) {
  try {
    const { id_cafe, preco, peso_gramas, estoque } = req.body;
    let imagem_url = null;

    if (req.file) {
      const { publicUrl } = await uploadFile(
        req.file.buffer, req.file.originalname, req.file.mimetype, "variantes"
      );
      imagem_url = publicUrl;
    }

    const variante = await varianteCafeService.create({
      id_cafe, preco, peso_gramas, estoque, imagem_url,
    });

    res.status(201).json(variante);
  } catch (err) { next(err); }
}

/** PUT /api/admin/variantes/:id (com upload opcional) */
async function update(req, res, next) {
  try {
    const { preco, peso_gramas, estoque } = req.body;
    const updateData = { preco, peso_gramas, estoque };

    if (req.file) {
      const existing = await varianteCafeService.getById(req.params.id);
      if (existing.imagem_url) await deleteFile(existing.imagem_url);

      const { publicUrl } = await uploadFile(
        req.file.buffer, req.file.originalname, req.file.mimetype, "variantes"
      );
      updateData.imagem_url = publicUrl;
    }

    const variante = await varianteCafeService.update(req.params.id, updateData);
    res.json(variante);
  } catch (err) { next(err); }
}

/** DELETE /api/admin/variantes/:id */
async function destroy(req, res, next) {
  try {
    const existing = await varianteCafeService.getById(req.params.id);
    if (existing.imagem_url) await deleteFile(existing.imagem_url);

    await varianteCafeService.remove(req.params.id);
    res.status(204).end();
  } catch (err) { next(err); }
}

module.exports = { index, show, store, update, destroy };
