const { supabase } = require("../config/supabase");

// Helper para buscar lat/lon via Nominatim (OpenStreetMap)
async function getCoordinatesFromAddress(pdvData) {
  const { rua, numero, bairro, cidade, estado } = pdvData;
  const addressParts = [];
  if (rua) addressParts.push(`${rua}, ${numero || ""}`);
  if (bairro) addressParts.push(bairro);
  if (cidade) addressParts.push(cidade);
  if (estado) addressParts.push(estado);
  
  if (addressParts.length === 0) return null;
  
  const query = encodeURIComponent(addressParts.join(", "));
  
  try {
    const response = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${query}&limit=1`, {
      headers: { "User-Agent": "RiteroAdmin/1.0" }
    });
    const data = await response.json();
    
    if (data && data.length > 0) {
      return {
        lat: parseFloat(data[0].lat),
        long: parseFloat(data[0].lon)
      };
    }
  } catch (err) {
    console.error("Erro na geocodificação:", err);
  }
  return null;
}

// ─── LIST ───
async function listAll() {
  const { data, error } = await supabase
    .from("ponto_de_venda")
    .select("*")
    .order("nome");

  if (error) throw error;
  return data;
}

// ─── GET BY ID ───
async function getById(id) {
  const { data, error } = await supabase
    .from("ponto_de_venda")
    .select("*")
    .eq("id", id)
    .single();

  if (error) throw error;
  return data;
}

// ─── CREATE ───
async function create(pdvData) {
  // Se não foi enviada lat/long pelo client, busca automaticamente
  if (!pdvData.lat || !pdvData.long) {
    const coords = await getCoordinatesFromAddress(pdvData);
    if (coords) {
      pdvData.lat = coords.lat;
      pdvData.long = coords.long;
    }
  }

  const { data, error } = await supabase
    .from("ponto_de_venda")
    .insert(pdvData)
    .select()
    .single();

  if (error) throw error;
  return data;
}

// ─── UPDATE ───
async function update(id, pdvData) {
  // Se o endereço foi atualizado e não veio lat/long específica, busca de novo
  if (!pdvData.lat || !pdvData.long) {
    const coords = await getCoordinatesFromAddress(pdvData);
    if (coords) {
      pdvData.lat = coords.lat;
      pdvData.long = coords.long;
    }
  }

  const { data, error } = await supabase
    .from("ponto_de_venda")
    .update(pdvData)
    .eq("id", id)
    .select()
    .single();

  if (error) throw error;
  return data;
}

// ─── DELETE ───
async function remove(id) {
  const { error } = await supabase.from("ponto_de_venda").delete().eq("id", id);
  if (error) throw error;
}

module.exports = { listAll, getById, create, update, remove };
