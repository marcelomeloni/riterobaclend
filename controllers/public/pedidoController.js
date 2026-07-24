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
    const topic = req.query.topic || req.query.type || req.body.type || req.body.action;
    const id = req.query['data.id'] || req.body.data?.id;

    console.log("[WEBHOOK MP] Notificação recebida:", { topic, id, query: req.query });

    if (!topic || !id) {
      return res.status(200).send('OK');
    }

    const { MercadoPagoConfig, Payment } = require('mercadopago');
    const mpClient = new MercadoPagoConfig({ accessToken: process.env.MERCADOPAGO_ACCESS_TOKEN });

    if (topic === 'payment' || topic.startsWith('payment.')) {
      const payment = new Payment(mpClient);
      const paymentInfo = await payment.get({ id });
      
      const pedidoId = paymentInfo.external_reference;
      const status = paymentInfo.status;
      
      console.log(`[WEBHOOK MP] Payment ${id} | Pedido: ${pedidoId} | Status: ${status}`);

      if (pedidoId) {
        if (status === 'approved') {
          await pedidoService.updateStatus(pedidoId, 'PREPARANDO');
        } else if (status === 'rejected' || status === 'cancelled') {
          await pedidoService.updateStatus(pedidoId, 'CANCELADO');
        }
      }
    } else if (topic === 'order' || topic === 'merchant_order') {
      // Quando criamos o pedido usando /v1/orders, os webhooks podem vir como 'order'
      let pedidoId = null;
      let isApproved = false;
      let isCancelled = false;

      // Tenta buscar no /v1/orders
      const orderRes = await fetch(`https://api.mercadopago.com/v1/orders/${id}`, {
        headers: { Authorization: `Bearer ${process.env.MERCADOPAGO_ACCESS_TOKEN}` }
      });

      if (orderRes.ok) {
        const orderInfo = await orderRes.json();
        pedidoId = orderInfo.external_reference;
        const tx = orderInfo.transactions?.payments?.[0];
        
        console.log(`[WEBHOOK MP] Order ${id} | Pedido: ${pedidoId} | Status: ${orderInfo.status}`);

        isApproved = (orderInfo.status === 'processed' || orderInfo.status === 'closed') && (tx?.status_detail === 'accredited' || tx?.status === 'approved');
        isCancelled = (orderInfo.status === 'rejected' || orderInfo.status === 'cancelled');
      } else {
        // Tenta no merchant_orders fallback
        const moRes = await fetch(`https://api.mercadopago.com/merchant_orders/${id}`, {
          headers: { Authorization: `Bearer ${process.env.MERCADOPAGO_ACCESS_TOKEN}` }
        });
        if (moRes.ok) {
          const moInfo = await moRes.json();
          pedidoId = moInfo.external_reference;
          console.log(`[WEBHOOK MP] Merchant Order ${id} | Pedido: ${pedidoId} | Status: ${moInfo.order_status}`);
          isApproved = moInfo.order_status === 'paid';
          isCancelled = moInfo.order_status === 'cancelled';
        }
      }

      if (pedidoId) {
        if (isApproved) {
          await pedidoService.updateStatus(pedidoId, 'PREPARANDO');
        } else if (isCancelled) {
          await pedidoService.updateStatus(pedidoId, 'CANCELADO');
        }
      }
    }
    
    res.status(200).send('OK');
  } catch (err) {
    console.error("Erro no webhook MP:", err);
    // Mesmo com erro interno no processamento, retornamos 200 pro MP parar de reenviar caso não seja fatal
    res.status(200).send('Erro processado');
  }
}

module.exports = { listMeusPedidos, checkout, getMeuPedidoById, confirmarPagamento, handleMercadoPagoWebhook };
