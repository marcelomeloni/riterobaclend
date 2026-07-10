const { supabase } = require("../config/supabase");
const cupomService = require("./cupomService");
const emailService = require("./emailService");

// ─── CHECKOUT ENGINE ───
const { MercadoPagoConfig, Payment } = require('mercadopago');
const freteService = require('./freteService');

async function processCheckout(id_cliente, payload) {
  const { itens, id_endereco_entrega, codigo_cupom, metodo_pagamento, formData } = payload;
  
  if (!itens || itens.length === 0) {
    throw new Error("Carrinho vazio.");
  }

  // 1. Validação de Endereço e Cálculo Seguro de Frete
  const { data: endereco, error: endErr } = await supabase
    .from("endereco")
    .select("cep")
    .eq("id", id_endereco_entrega)
    .single();

  if (endErr || !endereco) throw new Error("Endereço de entrega inválido.");
  
  let valor_frete = 0;
  try {
    const freteOptions = await freteService.calcularFrete(endereco.cep, itens);
    const validOptions = freteOptions.filter(o => !o.error);
    if (validOptions.length > 0) {
      valor_frete = Math.min(...validOptions.map(o => parseFloat(o.custom_price || o.price)));
    } else {
      valor_frete = 15.90;
    }
  } catch (err) {
    console.error("Erro ao calcular frete no backend, usando default:", err);
    valor_frete = 15.90;
  }

  // Preparar os itens para o RPC (convertendo array para repassar pro Postgres)
  const itensRpc = itens.map(i => ({
    id_cafe: i.id,
    peso_gramas: i.peso_gramas || 250,
    quantidade: i.quantidade
  }));

  // 2. Chamada atômica da RPC process_checkout
  const { data: pedido_id, error: rpcErr } = await supabase.rpc('process_checkout', {
    p_id_cliente: id_cliente,
    p_id_endereco_entrega: id_endereco_entrega,
    p_codigo_cupom: codigo_cupom || null,
    p_metodo_pagamento: metodo_pagamento,
    p_valor_frete: valor_frete,
    p_itens: itensRpc
  });

  if (rpcErr) {
    throw new Error(`Erro no banco de dados ao processar pedido: ${rpcErr.message}`);
  }

  // Busca o pedido completo recém-criado
  const pedido = await getById(pedido_id);

  // 3. Integração Mercado Pago
  const mpClient = new MercadoPagoConfig({ accessToken: process.env.MERCADOPAGO_ACCESS_TOKEN, options: { timeout: 10000 } });
  const payment = new Payment(mpClient);
  let mpResponse = null;

  try {
    if (metodo_pagamento === "pix") {
      const paymentData = {
        transaction_amount: Number(pedido.valor_total.toFixed(2)),
        description: `Pedido #${pedido.id.substring(0,8)} - Ritero`,
        payment_method_id: 'pix',
        payer: {
          email: pedido.cliente?.pessoa?.email || "cliente@ritero.com.br",
          first_name: pedido.cliente?.pessoa?.nome || "Cliente"
        },
        external_reference: pedido.id
      };
      mpResponse = await payment.create({ body: paymentData });
    } else if ((metodo_pagamento === "cartao_credito" || metodo_pagamento === "cartao_debito") && formData?.token) {
      const paymentData = {
        transaction_amount: Number(pedido.valor_total.toFixed(2)),
        token: formData.token,
        description: `Pedido #${pedido.id.substring(0,8)} - Ritero`,
        installments: formData.installments || 1,
        payment_method_id: formData.payment_method_id,
        payer: {
          email: formData.payer.email,
          identification: {
            type: formData.payer.identification.type,
            number: formData.payer.identification.number
          }
        },
        external_reference: pedido.id
      };

      // 🔍 LOG DE DEBUG — remover depois de resolver o problema do token
      console.log("🟡 [MP DEBUG] Enviando pagamento com cartão", {
        pedido_id: pedido.id,
        metodo_pagamento,
        token_prefix: formData.token ? formData.token.substring(0, 8) + "..." : null,
        token_length: formData.token?.length,
        payment_method_id: formData.payment_method_id,
        installments: paymentData.installments,
        valor: paymentData.transaction_amount,
        timestamp_backend: new Date().toISOString()
      });

      mpResponse = await payment.create({ body: paymentData });

      console.log("🟢 [MP DEBUG] Resposta do MP", {
        id: mpResponse?.id,
        status: mpResponse?.status,
        status_detail: mpResponse?.status_detail
      });
    } else if (metodo_pagamento === "cartao_credito" || metodo_pagamento === "cartao_debito") {
      // Caiu aqui = método era cartão mas o formData.token não veio (frontend não gerou o token)
      console.error("🔴 [MP DEBUG] formData.token ausente! Pagamento não será processado.", {
        pedido_id: pedido.id,
        metodo_pagamento,
        formData_recebido: formData
      });
    }
    
    // Se o pagamento for criado com sucesso, salvamos o transaction_id no pedido
    if (mpResponse && mpResponse.id) {
       await supabase.from("pedido").update({ mp_transaction_id: mpResponse.id.toString() }).eq("id", pedido.id);
       
       if (mpResponse.status === "approved") {
         // Atualiza no banco para Preparando
         await supabase.from("pedido").update({ status: "PREPARANDO" }).eq("id", pedido.id);
         pedido.status = "PREPARANDO";
       } else if (mpResponse.status === "in_process" || mpResponse.status === "pending") {
         // Mantém "Aguardando Pagamento", o webhook de "CONT" atualizará depois
       } else if (mpResponse.status === "rejected" || mpResponse.status === "cancelled") {
         await supabase.from("pedido").update({ status: "CANCELADO" }).eq("id", pedido.id);
         
         let msg = "Pagamento recusado pelo emissor do cartão. Verifique seus dados ou tente outro cartão.";
         switch (mpResponse.status_detail) {
           case "cc_rejected_other_reason": msg = "Recusado por erro geral da operadora."; break;
           case "cc_rejected_call_for_authorize": msg = "Recusado: Você precisa autorizar o pagamento junto ao banco."; break;
           case "cc_rejected_insufficient_amount": msg = "Recusado: Saldo ou limite insuficiente."; break;
           case "cc_rejected_bad_filled_security_code": msg = "Recusado: Código de segurança (CVV) inválido."; break;
           case "cc_rejected_bad_filled_date": msg = "Recusado: Problema com a data de vencimento."; break;
           case "cc_rejected_bad_filled_other": msg = "Recusado: Verifique se os dados do cartão estão corretos."; break;
           case "cc_rejected_high_risk": msg = "Recusado pelo sistema de segurança antifraude."; break;
         }
         throw new Error(msg);
       }
    }
  } catch (mpError) {
    console.error("Erro ao gerar pagamento MP:", mpError);
    // 🔍 LOG DE DEBUG — detalhe completo do erro (útil pra "Card Token not found", code 2006)
    console.error("🔴 [MP DEBUG] Detalhe do erro", {
      pedido_id: pedido.id,
      metodo_pagamento,
      mp_message: mpError.message,
      mp_cause: mpError.cause,
      mp_status: mpError.status,
      timestamp_backend: new Date().toISOString()
    });
    await supabase.from("pedido").update({ status: "CANCELADO" }).eq("id", pedido.id);
    
    let errMsg = "Erro ao processar o pagamento. Verifique os dados do cartão.";
    if (mpError.message === 'diff_param_bins' || (mpError.cause && mpError.cause[0]?.code === 10103)) {
      errMsg = "O cartão inserido não corresponde à bandeira ou é de um tipo diferente (ex: usando cartão de crédito na aba de débito). Verifique os dados.";
    } else if (mpError.message === 'not_result_by_params' || (mpError.cause && mpError.cause[0]?.code === 10102)) {
      errMsg = "Bandeira ou tipo de cartão não reconhecidos. Certifique-se de que está usando um cartão válido para este método de pagamento.";
    } else if (mpError.message === 'bin_not_found' || (mpError.cause && mpError.cause[0]?.code === 10104)) {
      errMsg = "Cartão não encontrado. Verifique se o número foi digitado corretamente.";
    } else if (mpError.message && !mpError.message.includes("Invalid")) {
      errMsg = mpError.message;
    }
    
    throw new Error(errMsg);
  }

  // Anexa dados do MP para retornar ao frontend
  if (mpResponse && mpResponse.point_of_interaction?.transaction_data) {
    pedido.pix_qr_code = mpResponse.point_of_interaction.transaction_data.qr_code;
    pedido.pix_qr_code_base64 = mpResponse.point_of_interaction.transaction_data.qr_code_base64;
  }

  if (mpResponse && mpResponse.status) {
    pedido.mp_status = mpResponse.status;
  }

  // Envia e-mail async
  if (pedido.cliente && pedido.cliente.pessoa) {
    emailService.sendOrderConfirmation(pedido, pedido.cliente.pessoa).catch(e => console.error(e));
  }

  return pedido;
}

// Restante das funcções originais
async function listAll() {
  const { data, error } = await supabase
    .from("pedido")
    .select(`*, cliente:id_cliente ( id_pessoa, cpf, telefone, pessoa ( nome, email ) ), endereco:id_endereco_entrega ( * ), cupom:id_cupom ( codigo, tipo, valor ), item_pedido ( *, variante_cafe:id_variante_cafe ( *, cafe:id_cafe ( id, nome, cor, imagem_url ) ) )`)
    .order("data_criacao", { ascending: false });
  if (error) throw error;
  return data;
}

async function getById(id) {
  const { data, error } = await supabase
    .from("pedido")
    .select(`*, cliente:id_cliente ( id_pessoa, cpf, telefone, pessoa ( nome, email ) ), endereco:id_endereco_entrega ( * ), cupom:id_cupom ( codigo, tipo, valor ), item_pedido ( *, variante_cafe:id_variante_cafe ( *, cafe:id_cafe ( id, nome, cor, imagem_url ) ) )`)
    .eq("id", id).single();
  if (error) throw error;
  return data;
}

async function updateStatus(id, status, codigo_rastreio = null) {
  const updateData = { status };
  if (codigo_rastreio !== null) {
    updateData.codigo_rastreio = codigo_rastreio;
  }

  const { data, error } = await supabase
    .from("pedido")
    .update(updateData)
    .eq("id", id)
    .select(`*, cliente:id_cliente ( pessoa ( nome, email ) )`)
    .single();
    
  if (error) throw error;

  // Disparo de Email
  if (data && data.cliente && data.cliente.pessoa) {
    const clienteData = data.cliente.pessoa;
    const s = status.toLowerCase();
    if (s === "enviado") {
      emailService.sendOrderShipped(data, clienteData).catch(err => console.error(err));
    } else if (s === "entregue") {
      emailService.sendOrderDelivered(data, clienteData).catch(err => console.error(err));
    }
  }

  return data;
}

async function listByClienteId(id_cliente) {
  const { data, error } = await supabase
    .from("pedido")
    .select(`*, endereco:id_endereco_entrega ( * ), cupom:id_cupom ( codigo, tipo, valor ), item_pedido ( *, variante_cafe:id_variante_cafe ( *, cafe:id_cafe ( id, nome, cor, imagem_url ) ) )`)
    .eq("id_cliente", id_cliente).order("data_criacao", { ascending: false });
  if (error) throw error;
  return data;
}

module.exports = { listAll, getById, updateStatus, listByClienteId, processCheckout };
