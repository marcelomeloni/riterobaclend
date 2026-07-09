const usuarioService = require("../../services/usuarioService");

/** GET /api/admin/usuarios */
async function index(req, res, next) {
  try {
    const usuarios = await usuarioService.listAll();
    res.json(usuarios);
  } catch (err) { next(err); }
}

/** GET /api/admin/usuarios/:id */
async function show(req, res, next) {
  try {
    const usuario = await usuarioService.getById(req.params.id);
    res.json(usuario);
  } catch (err) { next(err); }
}

/** POST /api/admin/usuarios  (Cria admin) */
async function store(req, res, next) {
  try {
    const { nome, email, senha } = req.body;

    if (!nome || !email || !senha) {
      return res.status(400).json({ error: "Nome, email e senha são obrigatórios." });
    }

    if (senha.length < 8) {
      return res.status(400).json({ error: "A senha deve ter pelo menos 8 caracteres." });
    }

    const admin = await usuarioService.createAdmin({ nome, email, senha });
    res.status(201).json(admin);
  } catch (err) { next(err); }
}

/** PUT /api/admin/usuarios/:id */
async function update(req, res, next) {
  try {
    const { nome, email, senha, tipo, cpf, telefone } = req.body;
    const usuario = await usuarioService.update(req.params.id, {
      nome, email, senha, tipo, cpf, telefone,
    });
    res.json(usuario);
  } catch (err) { next(err); }
}

/** DELETE /api/admin/usuarios/:id */
async function destroy(req, res, next) {
  try {
    await usuarioService.remove(req.params.id);
    res.status(204).end();
  } catch (err) { next(err); }
}

module.exports = { index, show, store, update, destroy };
