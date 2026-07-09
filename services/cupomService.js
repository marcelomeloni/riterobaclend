const { supabase } = require("../config/supabase");

async function validarCupom(codigo) {
  const { data: cupom, error } = await supabase
    .from("cupom")
    .select("*")
    .ilike("codigo", codigo) // case insensitive
    .single();

  if (error || !cupom) {
    throw new Error("Cupom inválido ou não encontrado.");
  }

  if (!cupom.ativo) {
    throw new Error("Este cupom está inativo.");
  }

  const now = new Date();
  if (cupom.data_inicio && new Date(cupom.data_inicio) > now) {
    throw new Error("Este cupom ainda não é válido.");
  }

  if (cupom.data_fim && new Date(cupom.data_fim) < now) {
    throw new Error("Este cupom já expirou.");
  }

  if (cupom.limite_usos !== null && cupom.usos >= cupom.limite_usos) {
    throw new Error("Este cupom atingiu o limite de usos.");
  }

  return cupom;
}

async function listAll() {
  const { data, error } = await supabase.from("cupom").select("*").order("data_inicio", { ascending: false });
  if (error) throw error;
  return data;
}

async function getById(id) {
  const { data, error } = await supabase.from("cupom").select("*").eq("id", id).single();
  if (error) throw error;
  return data;
}

async function create(payload) {
  const { data, error } = await supabase.from("cupom").insert(payload).select().single();
  if (error) throw error;
  return data;
}

async function update(id, payload) {
  const { data, error } = await supabase.from("cupom").update(payload).eq("id", id).select().single();
  if (error) throw error;
  return data;
}

async function remove(id) {
  const { error } = await supabase.from("cupom").delete().eq("id", id);
  if (error) throw error;
}

async function getAnalytics(id) {
  const { data: cupom, error: cupomErr } = await supabase.from("cupom").select("*").eq("id", id).single();
  if (cupomErr) throw cupomErr;

  const { data: pedidos, error: pedidosErr } = await supabase
    .from("pedido")
    .select("*, cliente:id_cliente ( pessoa ( nome, email ) )")
    .eq("id_cupom", id)
    .order("data_criacao", { ascending: false });
  if (pedidosErr) throw pedidosErr;

  const total_pedidos = pedidos.length;
  const faturamento_total = pedidos.reduce((acc, p) => acc + Number(p.valor_total), 0);
  const total_descontos = pedidos.reduce((acc, p) => acc + Number(p.valor_desconto), 0);
  const ticket_medio = total_pedidos > 0 ? faturamento_total / total_pedidos : 0;
  
  const faturamento_produtos = pedidos.reduce((acc, p) => acc + Number(p.valor_pedidos || (p.valor_total - p.valor_frete + p.valor_desconto)), 0);
  const comissao_estimada = faturamento_produtos * 0.10; // 10% de comissão (afiliados)

  return {
    cupom,
    metricas: {
      total_pedidos,
      faturamento_total,
      faturamento_produtos,
      total_descontos,
      ticket_medio,
      comissao_estimada
    },
    pedidos
  };
}

module.exports = {
  validarCupom,
  listAll,
  getById,
  create,
  update,
  remove,
  getAnalytics
};
