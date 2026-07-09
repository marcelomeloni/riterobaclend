const avaliacaoService = require("../../services/avaliacaoService");

async function listByCafe(req, res, next) {
  try {
    const { id_cafe } = req.params;
    const result = await avaliacaoService.listByCafeId(id_cafe);
    res.json(result);
  } catch (err) {
    next(err);
  }
}

async function create(req, res, next) {
  try {
    const { id_cafe, nota, comentario } = req.body;
    const id_cliente = req.user.id; // from authMiddleware

    if (!id_cafe || !nota) {
      return res.status(400).json({ error: "Café e nota são obrigatórios." });
    }

    const result = await avaliacaoService.createOrUpdate({ id_cliente, id_cafe, nota, comentario });
    res.json(result);
  } catch (err) {
    next(err);
  }
}

module.exports = {
  listByCafe,
  create
};
