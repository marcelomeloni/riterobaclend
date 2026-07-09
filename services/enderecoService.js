const { supabase } = require("../config/supabase");

async function listByClienteId(id_cliente) {
  const { data, error } = await supabase
    .from("endereco")
    .select("*")
    .eq("id_cliente", id_cliente);
  
  if (error) throw error;
  return data;
}

async function add(id_cliente, enderecoData) {
  // Se for o primeiro endereço ou se for is_default = true,
  // precisamos garantir que os outros fiquem falsos
  
  const { is_default } = enderecoData;

  if (is_default) {
    await supabase
      .from("endereco")
      .update({ is_default: false })
      .eq("id_cliente", id_cliente);
  } else {
    // Se não for default, verifica se tem algum. Se não tiver, vira default
    const existing = await listByClienteId(id_cliente);
    if (existing.length === 0) {
      enderecoData.is_default = true;
    }
  }

  const { data, error } = await supabase
    .from("endereco")
    .insert({ ...enderecoData, id_cliente })
    .select()
    .single();

  if (error) throw error;
  return data;
}

async function update(id, id_cliente, enderecoData) {
  const { is_default } = enderecoData;

  if (is_default) {
    await supabase
      .from("endereco")
      .update({ is_default: false })
      .eq("id_cliente", id_cliente);
  }

  const { data, error } = await supabase
    .from("endereco")
    .update(enderecoData)
    .eq("id", id)
    .eq("id_cliente", id_cliente)
    .select()
    .single();

  if (error) throw error;
  return data;
}

async function remove(id, id_cliente) {
  const { error } = await supabase
    .from("endereco")
    .delete()
    .eq("id", id)
    .eq("id_cliente", id_cliente);

  if (error) throw error;
  return true;
}

module.exports = {
  listByClienteId,
  add,
  update,
  remove
};
