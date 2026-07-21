const cafeService = require("../../services/cafeService");
const { uploadFile, deleteFile } = require("../../services/uploadService");

/** GET /api/admin/cafes */
async function index(req, res, next) {
  try {
    const cafes = await cafeService.listAll();
    res.json(cafes);
  } catch (err) { next(err); }
}

/** GET /api/admin/cafes/:id */
async function show(req, res, next) {
  try {
    const cafe = await cafeService.getById(req.params.id);
    res.json(cafe);
  } catch (err) { next(err); }
}

/** POST /api/admin/cafes  (com upload opcional de imagem) */
async function store(req, res, next) {
  try {
    const { nome, variedade, processo, regiao, torra, cor, ativo, pontuacao } = req.body;
    let imagem_url = null;

    // Se veio arquivo de imagem
    if (req.file) {
      const { publicUrl } = await uploadFile(
        req.file.buffer,
        req.file.originalname,
        req.file.mimetype,
        "cafes"
      );
      imagem_url = publicUrl;
    }

    const cafe = await cafeService.create({
      nome, variedade, processo, regiao, torra, cor, imagem_url,
      pontuacao: pontuacao || null,
      ativo: ativo === 'true' || ativo === true
    });

    res.status(201).json(cafe);
  } catch (err) { next(err); }
}

/** PUT /api/admin/cafes/:id  (com upload opcional de imagem) */
async function update(req, res, next) {
  try {
    const { nome, variedade, processo, regiao, torra, cor, ativo, pontuacao } = req.body;
    const updateData = { 
      nome, variedade, processo, regiao, torra, cor,
      pontuacao: pontuacao || null,
      ativo: ativo === 'true' || ativo === true
    };

    // Se veio nova imagem, faz upload e remove a antiga
    if (req.file) {
      const existing = await cafeService.getById(req.params.id);
      if (existing.imagem_url) await deleteFile(existing.imagem_url);

      const { publicUrl } = await uploadFile(
        req.file.buffer,
        req.file.originalname,
        req.file.mimetype,
        "cafes"
      );
      updateData.imagem_url = publicUrl;
    }

    const cafe = await cafeService.update(req.params.id, updateData);
    res.json(cafe);
  } catch (err) { next(err); }
}

/** DELETE /api/admin/cafes/:id */
async function destroy(req, res, next) {
  try {
    // Remove imagem do storage antes de deletar o registro
    const existing = await cafeService.getById(req.params.id);
    if (existing.imagem_url) await deleteFile(existing.imagem_url);

    await cafeService.remove(req.params.id);
    res.status(204).end();
  } catch (err) { next(err); }
}

module.exports = { index, show, store, update, destroy };
