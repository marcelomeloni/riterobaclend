const favoritoService = require("../../services/favoritoService");

async function list(req, res, next) {
  try {
    const favoritos = await favoritoService.listByClienteId(req.user.id);
    res.json(favoritos);
  } catch (err) {
    next(err);
  }
}

async function add(req, res, next) {
  try {
    const { id_cafe } = req.body;
    if (!id_cafe) {
      return res.status(400).json({ error: "O id_cafe é obrigatório." });
    }
    await favoritoService.add(req.user.id, id_cafe);
    res.status(201).json({ success: true });
  } catch (err) {
    next(err);
  }
}

async function remove(req, res, next) {
  try {
    const { id_cafe } = req.params;
    await favoritoService.remove(req.user.id, id_cafe);
    res.status(204).end();
  } catch (err) {
    next(err);
  }
}

module.exports = { list, add, remove };
