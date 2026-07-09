const pedidoService = require("../../services/pedidoService");
const { supabase } = require("../../config/supabase");

/** GET /api/admin/pedidos */
async function index(req, res, next) {
  try {
    const pedidos = await pedidoService.listAll();
    res.json(pedidos);
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

