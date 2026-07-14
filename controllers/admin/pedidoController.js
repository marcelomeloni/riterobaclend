const pedidoService = require("../../services/pedidoService");
const { supabase } = require("../../config/supabase");

/** GET /api/admin/pedidos?page=1&limit=15&status=PREPARANDO&search=João */
async function index(req, res, next) {
  try {
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit) || 15));
    const status = req.query.status || undefined;
    const search = req.query.search || undefined;

    const result = await pedidoService.listAll({ page, limit, status, search });
    res.json(result);
  } catch (err) { next(err); }
}

/** GET /api/admin/pedidos/:id */
async function show(req, res, next) {
  try {
    const pedido = await pedidoService.getById(req.params.id);
    res.json(pedido);
  } catch (err) { next(err); }
}

/** PATCH /api/admin/pedidos/:id/status */
async function updateStatus(req, res, next) {
  try {
    const { status, codigo_rastreio } = req.body;
    const validStatuses = [
      "AGUARDANDO_PAGAMENTO", "PREPARANDO", "ENVIADO", "ENTREGUE", "CANCELADO",
      "pendente", "em_preparo", "enviado", "entregue", "cancelado"
    ];

    if (!status || !validStatuses.includes(status)) {
      return res.status(400).json({
        error: `Status inválido. Use: ${validStatuses.join(", ")}`,
      });
    }

    const data = await pedidoService.updateStatus(req.params.id, status, codigo_rastreio !== undefined ? codigo_rastreio : null);
    res.json(data);
  } catch (err) { next(err); }
}

module.exports = { index, show, updateStatus };

