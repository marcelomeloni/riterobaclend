const pedidoService = require("../../services/pedidoService");

/**
 * GET /api/public/pedidos
 * Retorna os pedidos do cliente autenticado
 */
async function listMeusPedidos(req, res, next) {
  try {
    const pedidos = await pedidoService.listByClienteId(req.user.id);
    res.json(pedidos);
  } catch (err) {
    next(err);
  }
}

/**
 * POST /api/public/pedidos/checkout
 * Processa a criação do pedido
 */
async function checkout(req, res, next) {
  try {
    const payload = req.body;
    // req.user.id contém o ID da "pessoa".
    // precisamos achar o id_cliente dessa pessoa.
    const clienteService = require("../../services/clienteService");
    const me = await clienteService.getMe(req.user.id);
    
    // O id do cliente na tabela "cliente" precisa ser buscado (chave primária é id_pessoa)
    const { supabase } = require("../../config/supabase");
    const { data: cliente } = await supabase.from("cliente").select("id_pessoa").eq("id_pessoa", req.user.id).single();

    if (!cliente) {
      return res.status(400).json({ error: "Cliente não encontrado." });
    }

    const pedido = await pedidoService.processCheckout(cliente.id_pessoa, payload);
    res.status(201).json(pedido);
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/public/pedidos/:id
 * Busca um pedido específico do usuário autenticado
 */
async function getMeuPedidoById(req, res, next) {
  try {
    const pedido = await pedidoService.getById(req.params.id);
    if (!pedido || pedido.id_cliente !== req.user.id) {
      return res.status(404).json({ error: "Pedido não encontrado" });
    }
    res.json(pedido);
  } catch (err) {
    next(err);
  }
}

/**
 * PATCH /api/public/pedidos/:id/pagar
 * Simula aprovação de pagamento PIX - muda status para PREPARANDO
 */
async function confirmarPagamento(req, res, next) {
  try {
    const { id } = req.params;
    const pedido = await pedidoService.updateStatus(id, "PREPARANDO");
    res.json(pedido);
  } catch (err) {
    next(err);
  }
}

/**
 * POST /api/public/webhooks/mercadopago
 * Recebe notificações de pagamento do MP
 */
async function handleMercadoPagoWebhook(req, res, next) {
  try {
    const { action, data } = req.body;
    
    if (action === 'payment.created' || action === 'payment.updated') {
      const paymentId = data.id;
      
      const { MercadoPagoConfig, Payment } = require('mercadopago');
      const mpClient = new MercadoPagoConfig({ accessToken: process.env.MERCADOPAGO_ACCESS_TOKEN });
      const payment = new Payment(mpClient);
      
      const paymentInfo = await payment.get({ id: paymentId });
      
      const pedidoId = paymentInfo.external_reference;
      const status = paymentInfo.status;
      
      if (pedidoId) {
        if (status === 'approved') {
          await pedidoService.updateStatus(pedidoId, 'PREPARANDO');
        } else if (status === 'rejected' || status === 'cancelled') {
          await pedidoService.updateStatus(pedidoId, 'CANCELADO');
        }
      }
    }
    
    res.status(200).send('OK');
  } catch (err) {
    console.error("Erro no webhook MP:", err);
    res.status(500).send('Erro interno');
  }
}

module.exports = { listMeusPedidos, checkout, getMeuPedidoById, confirmarPagamento, handleMercadoPagoWebhook };
