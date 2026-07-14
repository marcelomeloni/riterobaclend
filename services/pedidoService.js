const { supabase } = require("../config/supabase");
const cupomService = require("./cupomService");
const emailService = require("./emailService");

// ─── CHECKOUT ENGINE ───
const { MercadoPagoConfig, Payment } = require('mercadopago');
const freteService = require('./freteService');

async function processCheckout(id_cliente, payload) {
  const { itens, id_endereco_entrega, codigo_cupom, metodo_pagamento, formData, transportadora, prazo_entrega, valor_frete: payload_valor_frete } = payload;
  
  if (!itens || itens.length === 0) {
    throw new Error("Carrinho vazio.");
  }

  // 1. Validação de Endereço
  const { data: endereco, error: endErr } = await supabase
    .from("endereco")
    .select("cep")
    .eq("id", id_endereco_entrega)
    .single();

  if (endErr || !endereco) throw new Error("Endereço de entrega inválido.");
  
  let valor_frete = payload_valor_frete || 0;
  let final_transportadora = transportadora || 'Desconhecida';
  let final_prazo = prazo_entrega || 0;

  console.log("=== INICIO CHECKOUT LOGS ===");
  console.log("PAYLOAD RECEBIDO:", JSON.stringify(payload, null, 2));

  try {
    const freteOptions = await freteService.calcularFrete(endereco.cep, itens);
    const validOptions = freteOptions.filter(o => !o.error);
    
    console.log("FRETE OPTIONS RETORNADAS PELO BACKEND (sem error):", JSON.stringify(validOptions.map(o => ({ name: o.name, price: o.price, custom_price: o.custom_price, time: o.delivery_time })), null, 2));

    if (validOptions.length > 0) {
      if (transportadora) {
        // Tenta encontrar a transportadora exata que o usuário escolheu (nome e prazo)
        const chosen = validOptions.find(o => o.name === transportadora && (o.custom_delivery_time || o.delivery_time) === prazo_entrega);
        if (chosen) {
          console.log("TRANSPORTADORA ENCONTRADA (MATCH EXATO):", chosen.name, chosen.custom_price || chosen.price);
          valor_frete = parseFloat(chosen.custom_price || chosen.price);
          final_prazo = chosen.custom_delivery_time || chosen.delivery_time;
        } else {
          // Fallback se não encontrar o par exato
          const fallback = validOptions.find(o => o.name === transportadora) || validOptions[0];
          console.log("TRANSPORTADORA ENCONTRADA (FALLBACK):", fallback.name, fallback.custom_price || fallback.price);
          valor_frete = parseFloat(fallback.custom_price || fallback.price);
          final_transportadora = fallback.name;
          final_prazo = fallback.custom_delivery_time || fallback.delivery_time;
        }
      } else {
        const cheapest = validOptions.reduce((prev, curr) => parseFloat(prev.custom_price || prev.price) < parseFloat(curr.custom_price || curr.price) ? prev : curr);
        console.log("TRANSPORTADORA ENCONTRADA (MAIS BARATA):", cheapest.name, cheapest.custom_price || cheapest.price);
        valor_frete = parseFloat(cheapest.custom_price || cheapest.price);
        final_transportadora = cheapest.name;
        final_prazo = cheapest.custom_delivery_time || cheapest.delivery_time;
      }
    } else {
      valor_frete = payload_valor_frete || 15.90;
      console.log("NENHUMA TRANSPORTADORA VALIDA, USANDO PAYLOAD OU PADRAO:", valor_frete);
    }
  } catch (err) {
    console.error("Erro ao calcular frete no backend, usando o valor enviado:", err);
    valor_frete = payload_valor_frete || 15.90;
  }
  
  console.log("FRETE FINAL APLICADO NO BACKEND:", valor_frete, final_transportadora, final_prazo);

  // Preparar os itens para o RPC (convertendo array para repassar pro Postgres)
  const itensRpc = itens.map(i => ({
    id_cafe: i.id,
    peso_gramas: i.peso_gramas || 250,
    moagem: i.moagem || "Em grão",
    pontuacao: i.pontuacao || "85",
    quantidade: i.quantidade
  }));

  console.log("=== RPC PARAMS ===", JSON.stringify({
    p_id_cliente: id_cliente,
    p_codigo_cupom: codigo_cupom || null,
    p_valor_frete: valor_frete,
    p_itens: itensRpc
  }, null, 2));

  // 2. Chamada atômica da RPC process_checkout
  const { data: pedido_id, error: rpcErr } = await supabase.rpc('process_checkout', {
    p_id_cliente: id_cliente,
    p_id_endereco_entrega: id_endereco_entrega,
    p_codigo_cupom: codigo_cupom || null,
    p_metodo_pagamento: metodo_pagamento,
    p_valor_frete: valor_frete,
    p_transportadora: final_transportadora,
    p_prazo_entrega: final_prazo,
    p_itens: itensRpc
  });

  if (rpcErr) {
    throw new Error(`Erro no banco de dados ao processar pedido: ${rpcErr.message}`);
  }

  // Busca o pedido completo recém-criado
  const pedido = await getById(pedido_id);

  // 2.5 Reverte o incremento de uso do cupom feito pela RPC
  // O cupom só deve ser contabilizado como usado quando o pedido for PAGO (status PREPARANDO)
  if (pedido.id_cupom) {
    console.log(`[CUPOM] Revertendo incremento de usos para o cupom ID: ${pedido.id_cupom}`);
    const { data: cupom } = await supabase.from("cupom").select("id, usos").eq("id", pedido.id_cupom).single();
    if (cupom && cupom.usos > 0) {
      console.log(`[CUPOM] Usos atuais: ${cupom.usos}. Atualizando para ${cupom.usos - 1}...`);
      const { error: updateErr } = await supabase.from("cupom").update({ usos: cupom.usos - 1 }).eq("id", cupom.id);
      if (updateErr) {
        console.error("[CUPOM] Erro ao reverter cupom:", updateErr);
      } else {
        console.log("[CUPOM] Reversão feita com sucesso!");
      }
    } else {
      console.log("[CUPOM] Cupom não encontrado ou usos já é 0.");
    }
  }

  // 3. Integração Mercado Pago via API de Orders (/v1/orders)
  let mpResponse = null;

  try {
    let payload_orders = null;

    if (metodo_pagamento === "pix") {
      const valorTotal = pedido.valor_total.toFixed(2);
      console.log("=== PIX VALOR TOTAL ===", { valor_total_db: pedido.valor_total, valor_enviado_mp: valorTotal });
      payload_orders = {
        type: "online",
        processing_mode: "automatic",
        total_amount: valorTotal,
        external_reference: pedido.id,
        payer: {
          email: pedido.cliente?.pessoa?.email || "cliente@ritero.com.br"
        },
        transactions: {
          payments: [
            {
              amount: valorTotal,
              payment_method: {
                id: "pix",
                type: "bank_transfer"
              }
            }
          ]
        }
      };
    } else if ((metodo_pagamento === "cartao_credito" || metodo_pagamento === "cartao_debito") && formData?.token) {
      const valorTotal = pedido.valor_total.toFixed(2);
      payload_orders = {
        type: "online",
        processing_mode: "automatic",
        total_amount: valorTotal,
        external_reference: pedido.id,
        payer: {
          email: formData.payer.email
        },
        transactions: {
          payments: [
            {
              amount: valorTotal,
              payment_method: {
                id: formData.payment_method_id,
                type: metodo_pagamento === "cartao_credito" ? "credit_card" : "debit_card",
                token: formData.token,
                installments: formData.installments || 1
              }
            }
          ]
        }
      };
    }

    if (payload_orders) {
      const crypto = require("crypto");
      const idempotencyKey = crypto.randomUUID();

      const res = await fetch("https://api.mercadopago.com/v1/orders", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${process.env.MERCADOPAGO_ACCESS_TOKEN}`,
          "X-Idempotency-Key": idempotencyKey
        },
        body: JSON.stringify(payload_orders)
      });
      mpResponse = await res.json();
      
      if (!res.ok) {
        throw mpResponse; // Lança o erro para o catch
      }
    }
    
    // Se a order for criada com sucesso, salvamos o transaction_id no pedido
    if (mpResponse && mpResponse.id) {
       const tx = mpResponse.transactions?.payments?.[0];
       const txId = tx?.id || mpResponse.id;
       await supabase.from("pedido").update({ mp_transaction_id: txId.toString() }).eq("id", pedido.id);
       
       if (mpResponse.status === "processed" && tx?.status_detail === "accredited") {
         // Atualiza no banco para Preparando e dispara eventos (cupom, email)
         await updateStatus(pedido.id, "PREPARANDO");
         pedido.status = "PREPARANDO";
       } else if (mpResponse.status === "action_required" || tx?.status === "action_required") {
         // Mantém "Aguardando Pagamento", PIX etc
       } else if (mpResponse.status === "rejected" || mpResponse.status === "cancelled" || tx?.status === "rejected") {
         await updateStatus(pedido.id, "CANCELADO");
         
         let msg = "Pagamento recusado pelo emissor do cartão. Verifique seus dados ou tente outro cartão.";
         switch (tx?.status_detail) {
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
    console.error("Erro ao gerar pagamento MP (Orders API):", JSON.stringify(mpError));
    await updateStatus(pedido.id, "CANCELADO");
    
    let errMsg = "Erro ao processar o pagamento. Verifique os dados do cartão.";
    const cause = mpError.cause?.[0] || mpError;
    if (cause.code === 10103) {
      errMsg = "O cartão inserido não corresponde à bandeira ou é de um tipo diferente. Verifique os dados.";
    } else if (cause.code === 10102) {
      errMsg = "Bandeira ou tipo de cartão não reconhecidos.";
    } else if (cause.code === 10104) {
      errMsg = "Cartão não encontrado.";
    } else if (mpError.message && !mpError.message.includes("Invalid")) {
      errMsg = mpError.message;
    }
    
    throw new Error(errMsg);
  }

  // Anexa dados do MP para retornar ao frontend
  const tx = mpResponse?.transactions?.payments?.[0];
  if (tx && tx.payment_method?.qr_code) {
    pedido.pix_qr_code = tx.payment_method.qr_code;
    pedido.pix_qr_code_base64 = tx.payment_method.qr_code_base64;
  }

  if (mpResponse && mpResponse.status) {
    pedido.mp_status = mpResponse.status;
  }

  return pedido;
}

// Restante das funções originais
async function listAll({ page = 1, limit = 15, status, search } = {}) {
  const from = (page - 1) * limit;
  const to = from + limit - 1;

  // Count query (mesmos filtros, sem paginação)
  let countQuery = supabase
    .from("pedido")
    .select("id", { count: "exact", head: true });

  // Data query
  let dataQuery = supabase
    .from("pedido")
    .select(`*, cliente:id_cliente ( id_pessoa, cpf, telefone, pessoa ( nome, email ) ), endereco:id_endereco_entrega ( * ), cupom:id_cupom ( codigo, tipo, valor ), item_pedido ( *, variante_cafe:id_variante_cafe ( *, cafe:id_cafe ( id, nome, cor, imagem_url ) ) )`)
    .order("data_criacao", { ascending: false })
    .range(from, to);

  // Filtro de status
  if (status && status !== "all") {
    countQuery = countQuery.eq("status", status);
    dataQuery = dataQuery.eq("status", status);
  }

  const [{ count, error: errCount }, { data, error }] = await Promise.all([
    countQuery,
    dataQuery,
  ]);

  if (errCount) throw errCount;
  if (error) throw error;

  const total = count || 0;

  return {
    data: data || [],
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit),
  };
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
  // Busca status antigo antes de atualizar
  const oldData = await getById(id);
  const oldStatus = oldData ? oldData.status : null;

  const updateData = { status };
  if (codigo_rastreio !== null) {
    updateData.codigo_rastreio = codigo_rastreio;
  }

  const { error } = await supabase
    .from("pedido")
    .update(updateData)
    .eq("id", id);
    
  if (error) throw error;

  const data = await getById(id);

  // Se o pedido foi PAGO agora (mudou para PREPARANDO), incrementa o uso do cupom
  if (oldStatus !== "PREPARANDO" && status === "PREPARANDO" && data.id_cupom) {
    const { data: cupom } = await supabase.from("cupom").select("id, usos").eq("id", data.id_cupom).single();
    if (cupom) {
      await supabase.from("cupom").update({ usos: cupom.usos + 1 }).eq("id", cupom.id);
    }
  }

  // Disparo de Email
  if (data && data.cliente && data.cliente.pessoa) {
    const clienteData = data.cliente.pessoa;
    const s = status.toLowerCase();
    if (s === "preparando") {
      emailService.sendOrderConfirmation(data, clienteData).catch(err => console.error(err));
    } else if (s === "enviado") {
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
    .eq("id_cliente", id_cliente)
    .neq("status", "AGUARDANDO_PAGAMENTO")
    .order("data_criacao", { ascending: false });
  if (error) throw error;
  return data;
}

module.exports = { listAll, getById, updateStatus, listByClienteId, processCheckout };
