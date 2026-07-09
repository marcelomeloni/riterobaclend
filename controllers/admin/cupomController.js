const cupomService = require("../../services/cupomService");

/** GET /api/admin/cupons */
async function index(req, res, next) {
  try {
    const cupons = await cupomService.listAll();
    res.json(cupons);
  } catch (err) { next(err); }
}

/** GET /api/admin/cupons/:id */
async function show(req, res, next) {
  try {
    const cupom = await cupomService.getById(req.params.id);
    res.json(cupom);
  } catch (err) { next(err); }
}

/** POST /api/admin/cupons */
async function store(req, res, next) {
  try {
    const { codigo, tipo, valor, data_inicio, data_fim, ativo, limite_usos } = req.body;
    const cupom = await cupomService.create({
      codigo, tipo, valor, data_inicio,
      data_fim: data_fim || null,
      ativo: ativo !== undefined ? ativo : true,
      limite_usos: limite_usos || null,
      usos: 0,
    });
    res.status(201).json(cupom);
  } catch (err) { next(err); }
}

/** PUT /api/admin/cupons/:id */
async function update(req, res, next) {
  try {
    const { codigo, tipo, valor, data_inicio, data_fim, ativo, limite_usos } = req.body;
    const cupom = await cupomService.update(req.params.id, {
      codigo, tipo, valor, data_inicio,
      data_fim: data_fim || null,
      ativo,
      limite_usos: limite_usos || null,
    });
    res.json(cupom);
  } catch (err) { next(err); }
}

/** DELETE /api/admin/cupons/:id */
async function destroy(req, res, next) {
  try {
    await cupomService.remove(req.params.id);
    res.status(204).end();
  } catch (err) { next(err); }
}

/** GET /api/admin/cupons/:id/analytics */
async function analytics(req, res, next) {
  try {
    const data = await cupomService.getAnalytics(req.params.id);
    res.json(data);
  } catch (err) { next(err); }
}

module.exports = { index, show, store, update, destroy, analytics };
