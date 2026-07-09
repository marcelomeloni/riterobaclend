const { supabase } = require("../config/supabase");

async function listByClienteId(id_cliente) {
  // Join the favorito table with the cafe table to get coffee details
  const { data, error } = await supabase
    .from("favorito")
    .select(`
      data_adicionado,
      cafe (
        id,
        nome,
        cor,
        imagem_url,
        ativo,
        variante_cafe (
          preco
        )
      )
    `)
    .eq("id_cliente", id_cliente);

  if (error) throw error;
  return data;
}

async function add(id_cliente, id_cafe) {
  // Verificamos se o café existe
  const { data: cafe, error: cafeErr } = await supabase
    .from("cafe")
    .select("id")
    .eq("id", id_cafe)
    .single();

  if (cafeErr || !cafe) throw new Error("Café não encontrado.");

  // Inserimos nos favoritos
  const { error } = await supabase
    .from("favorito")
    .insert({ id_cliente, id_cafe });

  // Pode dar erro 23505 (unique constraint violation) se já for favorito
  if (error && error.code !== '23505') throw error;
  
  return { success: true };
}

async function remove(id_cliente, id_cafe) {
  const { error } = await supabase
    .from("favorito")
    .delete()
    .eq("id_cliente", id_cliente)
    .eq("id_cafe", id_cafe);

  if (error) throw error;
  return true;
}

module.exports = {
  listByClienteId,
  add,
  remove
};
