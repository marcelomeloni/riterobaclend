const { supabase } = require("../config/supabase");
const bcrypt = require("bcryptjs");

const SALT_ROUNDS = 12;

// ─── LIST (Todos: clientes + admins) ───
async function listAll() {
  // Busca todas as pessoas
  const { data: pessoas, error } = await supabase
    .from("pessoa")
    .select("id, nome, email")
    .order("nome");

  if (error) throw error;

  // Busca os IDs de admin
  const { data: admins } = await supabase.from("admin").select("id_pessoa");
  const adminIds = new Set((admins || []).map((a) => a.id_pessoa));

  // Busca dados de clientes
  const { data: clientes } = await supabase.from("cliente").select("id_pessoa, cpf, telefone");
  const clienteMap = new Map((clientes || []).map((c) => [c.id_pessoa, c]));

  // Monta lista unificada
  return pessoas.map((p) => ({
    id: p.id,
    nome: p.nome,
    email: p.email,
    tipo: adminIds.has(p.id) ? "admin" : "cliente",
    cpf: clienteMap.get(p.id)?.cpf || null,
    telefone: clienteMap.get(p.id)?.telefone || null,
  }));
}

// ─── GET BY ID ───
async function getById(id) {
  const { data: pessoa, error } = await supabase
    .from("pessoa")
    .select("id, nome, email")
    .eq("id", id)
    .single();

  if (error) throw error;

  // Verifica se é admin
  const { data: admin } = await supabase
    .from("admin")
    .select("id_pessoa")
    .eq("id_pessoa", id)
    .maybeSingle();

  // Se for cliente, busca CPF/telefone
  const { data: cliente } = await supabase
    .from("cliente")
    .select("cpf, telefone")
    .eq("id_pessoa", id)
    .maybeSingle();

  return {
    ...pessoa,
    tipo: admin ? "admin" : "cliente",
    cpf: cliente?.cpf || null,
    telefone: cliente?.telefone || null,
  };
}

// ─── CREATE ADMIN ───
async function createAdmin({ nome, email, senha }) {
  const hashedPassword = await bcrypt.hash(senha, SALT_ROUNDS);

  // Cria pessoa
  const { data: pessoa, error: pessoaErr } = await supabase
    .from("pessoa")
    .insert({ nome, email, senha: hashedPassword })
    .select()
    .single();

  if (pessoaErr) throw pessoaErr;

  // Insere na tabela admin
  const { error: adminErr } = await supabase
    .from("admin")
    .insert({ id_pessoa: pessoa.id });

  if (adminErr) throw adminErr;

  return { id: pessoa.id, nome, email, tipo: "admin" };
}

// ─── UPDATE ───
async function update(id, updateData) {
  const pessoaUpdate = {};
  if (updateData.nome) pessoaUpdate.nome = updateData.nome;
  if (updateData.email) pessoaUpdate.email = updateData.email;
  if (updateData.senha) pessoaUpdate.senha = await bcrypt.hash(updateData.senha, SALT_ROUNDS);

  if (Object.keys(pessoaUpdate).length > 0) {
    const { error } = await supabase.from("pessoa").update(pessoaUpdate).eq("id", id);
    if (error) throw error;
  }

  // Atualiza tipo se mudou
  if (updateData.tipo) {
    const { data: isAdmin } = await supabase
      .from("admin")
      .select("id_pessoa")
      .eq("id_pessoa", id)
      .maybeSingle();

    if (updateData.tipo === "admin" && !isAdmin) {
      // Promove a admin
      await supabase.from("admin").insert({ id_pessoa: id });
    } else if (updateData.tipo === "cliente" && isAdmin) {
      // Remove de admin
      await supabase.from("admin").delete().eq("id_pessoa", id);
    }
  }

  // Atualiza dados de cliente (CPF / Telefone)
  if (updateData.cpf !== undefined || updateData.telefone !== undefined) {
    const { data: cliente } = await supabase
      .from("cliente")
      .select("id_pessoa")
      .eq("id_pessoa", id)
      .maybeSingle();

    const clienteUpdate = {};
    if (updateData.cpf !== undefined) clienteUpdate.cpf = updateData.cpf;
    if (updateData.telefone !== undefined) clienteUpdate.telefone = updateData.telefone;

    if (cliente) {
      await supabase.from("cliente").update(clienteUpdate).eq("id_pessoa", id);
    }
  }

  return getById(id);
}

// ─── DELETE ───
async function remove(id) {
  // Cascading delete: pessoa -> admin/cliente (ON DELETE CASCADE no DB)
  const { error } = await supabase.from("pessoa").delete().eq("id", id);
  if (error) throw error;
}

// ─── LOGIN (para authController) ───
async function findByEmail(email) {
  const { data, error } = await supabase
    .from("pessoa")
    .select("id, nome, email, senha")
    .eq("email", email)
    .single();

  if (error) return null;

  // Verifica se é admin
  const { data: admin } = await supabase
    .from("admin")
    .select("id_pessoa")
    .eq("id_pessoa", data.id)
    .maybeSingle();

  return { ...data, tipo: admin ? "admin" : "cliente" };
}

module.exports = { listAll, getById, createAdmin, update, remove, findByEmail };
