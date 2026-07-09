const { supabase } = require("../config/supabase");

async function listByCafeId(id_cafe) {
  // Busca todas as avaliações com os dados do cliente e da pessoa vinculada
  const { data, error } = await supabase
    .from("avaliacao")
    .select(`
      id,
      nota,
      comentario,
      data,
      cliente (
        pessoa (
          nome
        )
      )
    `)
    .eq("id_cafe", id_cafe)
    .order("data", { ascending: false });

  if (error) throw error;

  // Busca também os detalhes do café (como avaliacao_media e total de avaliacoes)
  const { data: cafeData, error: cafeError } = await supabase
    .from("cafe")
    .select("avaliacao_media")
    .eq("id", id_cafe)
    .single();

  if (cafeError) throw cafeError;

  return {
    avaliacoes: data,
    estatisticas: {
      media: cafeData.avaliacao_media || 0,
      total: data.length
    }
  };
}

async function createOrUpdate({ id_cliente, id_cafe, nota, comentario }) {
  // Verifica se já existe avaliação deste cliente para este café
  const { data: existing } = await supabase
    .from("avaliacao")
    .select("id")
    .eq("id_cliente", id_cliente)
    .eq("id_cafe", id_cafe)
    .single();

  if (existing) {
    const { error } = await supabase
      .from("avaliacao")
      .update({ nota, comentario, data: new Date().toISOString() })
      .eq("id", existing.id);
    if (error) throw error;
  } else {
    const { error } = await supabase
      .from("avaliacao")
      .insert({ id_cliente, id_cafe, nota, comentario });
    if (error) throw error;
  }

  // Recalcular a média
  const { data: todasAvaliacoes, error: errAvaliacoes } = await supabase
    .from("avaliacao")
    .select("nota")
    .eq("id_cafe", id_cafe);

  if (errAvaliacoes) throw errAvaliacoes;

  let novaMedia = 0;
  if (todasAvaliacoes.length > 0) {
    const soma = todasAvaliacoes.reduce((acc, curr) => acc + curr.nota, 0);
    novaMedia = Number((soma / todasAvaliacoes.length).toFixed(1));
  }

  // Atualizar a média no café
  const { error: errUpdateCafe } = await supabase
    .from("cafe")
    .update({ avaliacao_media: novaMedia })
    .eq("id", id_cafe);

  if (errUpdateCafe) throw errUpdateCafe;

  return { success: true, novaMedia };
}

module.exports = {
  listByCafeId,
  createOrUpdate
};
