const pontoDeVendaService = require("../../services/pontoDeVendaService");

/** GET /api/admin/pontos-de-venda */
async function index(req, res, next) {
  try {
    const pdvs = await pontoDeVendaService.listAll();
    res.json(pdvs);
  } catch (err) { next(err); }
}

/** GET /api/admin/pontos-de-venda/:id */
async function show(req, res, next) {
  try {
    const pdv = await pontoDeVendaService.getById(req.params.id);
    res.json(pdv);
  } catch (err) { next(err); }
}

/** POST /api/admin/pontos-de-venda */
async function store(req, res, next) {
  try {
    const { nome, cep, estado, cidade, bairro, rua, numero, lat, long: lng } = req.body;
    const pdv = await pontoDeVendaService.create({
      nome, cep, estado, cidade, bairro, rua, numero,
      lat: lat || null,
      long: lng || null,
    });
    res.status(201).json(pdv);
  } catch (err) { next(err); }
}

/** PUT /api/admin/pontos-de-venda/:id */
async function update(req, res, next) {
  try {
    const { nome, cep, estado, cidade, bairro, rua, numero, lat, long: lng } = req.body;
    const pdv = await pontoDeVendaService.update(req.params.id, {
      nome, cep, estado, cidade, bairro, rua, numero,
      lat: lat || null,
      long: lng || null,
    });
    res.json(pdv);
  } catch (err) { next(err); }
}

/** DELETE /api/admin/pontos-de-venda/:id */
async function destroy(req, res, next) {
  try {
    await pontoDeVendaService.remove(req.params.id);
    res.status(204).end();
  } catch (err) { next(err); }
}

module.exports = { index, show, store, update, destroy };
