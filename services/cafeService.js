const { supabase } = require("../config/supabase");

// ─── LIST ───
async function listAll() {
  const { data, error } = await supabase
    .from("cafe")
    .select("*, variante_cafe(*)")
    .order("nome");

  if (error) throw error;
  return data;
}

// ─── GET BY ID ───
async function getById(id) {
  const { data, error } = await supabase
    .from("cafe")
    .select("*, variante_cafe(*)")
    .eq("id", id)
    .single();

  if (error) throw error;
  return data;
}

// ─── CREATE ───
async function create(cafeData) {
  const { data, error } = await supabase
    .from("cafe")
    .insert(cafeData)
    .select()
    .single();

  if (error) throw error;
  return data;
}

// ─── UPDATE ───
async function update(id, cafeData) {
  const { data, error } = await supabase
    .from("cafe")
    .update(cafeData)
    .eq("id", id)
    .select()
    .single();

  if (error) throw error;
  return data;
}

// ─── DELETE ───
async function remove(id) {
  // Primeiro deleta as variantes associadas
  await supabase.from("variante_cafe").delete().eq("id_cafe", id);

  const { error } = await supabase.from("cafe").delete().eq("id", id);
  if (error) throw error;
}

module.exports = { listAll, getById, create, update, remove };
