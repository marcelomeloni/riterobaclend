const enderecoService = require("../../services/enderecoService");

async function list(req, res, next) {
  try {
    const enderecos = await enderecoService.listByClienteId(req.user.id);
    res.json(enderecos);
  } catch (err) {
    next(err);
  }
}

async function add(req, res, next) {
  try {
    const endereco = await enderecoService.add(req.user.id, req.body);
    res.status(201).json(endereco);
  } catch (err) {
    next(err);
  }
}

async function remove(req, res, next) {
  try {
    const { id } = req.params;
    await enderecoService.remove(id, req.user.id);
    res.status(204).end();
  } catch (err) {
    next(err);
  }
}

async function update(req, res, next) {
  try {
    const { id } = req.params;
    const endereco = await enderecoService.update(id, req.user.id, req.body);
    res.json(endereco);
  } catch (err) {
    next(err);
  }
}

module.exports = { list, add, remove, update };
