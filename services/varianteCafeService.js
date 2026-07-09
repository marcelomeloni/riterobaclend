const { supabase } = require("../config/supabase");

// ─── LIST BY CAFE ───
async function listByCafe(idCafe) {
  const { data, error } = await supabase
    .from("variante_cafe")
    .select("*")
    .eq("id_cafe", idCafe)
    .order("preco");

  if (error) throw error;
  return data;
}

// ─── GET BY ID ───
async function getById(id) {
  const { data, error } = await supabase
    .from("variante_cafe")
    .select("*")
    .eq("id", id)
    .single();

  if (error) throw error;
  return data;
}

// ─── CREATE ───
async function create(varianteData) {
  const { data, error } = await supabase
    .from("variante_cafe")
    .insert(varianteData)
    .select()
    .single();

  if (error) throw error;
  return data;
}

// ─── UPDATE ───
async function update(id, varianteData) {
  const { data, error } = await supabase
    .from("variante_cafe")
    .update(varianteData)
    .eq("id", id)
    .select()
    .single();

  if (error) throw error;
  return data;
}

// ─── DELETE ───
async function remove(id) {
  const { error } = await supabase.from("variante_cafe").delete().eq("id", id);
  if (error) throw error;
}

module.exports = { listByCafe, getById, create, update, remove };
