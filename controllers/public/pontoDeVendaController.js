const pontoDeVendaService = require("../../services/pontoDeVendaService");

/** GET /api/public/pontos-de-venda */
async function index(req, res, next) {
  try {
    const pdvs = await pontoDeVendaService.listAll();
    res.json(pdvs);
  } catch (err) { next(err); }
}

module.exports = { index };
