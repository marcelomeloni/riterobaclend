const { supabase } = require("../config/supabase");
const bcrypt = require("bcryptjs");

const SALT_ROUNDS = 12;

async function register({ nome, email, senha, cpf, telefone }) {
  const hashedPassword = await bcrypt.hash(senha, SALT_ROUNDS);

  // 1. Cria a pessoa
  const { data: pessoa, error: pessoaErr } = await supabase
    .from("pessoa")
    .insert({ nome, email, senha: hashedPassword })
    .select()
    .single();

  if (pessoaErr) {
    if (pessoaErr.code === "23505") {
      throw new Error("Email já cadastrado.");
    }
    throw pessoaErr;
  }

  // 2. Cria o cliente associado
  const { error: clienteErr } = await supabase
    .from("cliente")
    .insert({ id_pessoa: pessoa.id, cpf, telefone });

  if (clienteErr) {
    throw clienteErr;
  }

  return {
    id: pessoa.id,
    nome: pessoa.nome,
    email: pessoa.email,
    cpf,
    telefone,
    tipo: "cliente"
  };
}

async function login(email, senha) {
  // Busca pessoa pelo email
  const { data: pessoa, error } = await supabase
    .from("pessoa")
    .select("id, nome, email, senha")
    .eq("email", email)
    .single();

  if (error || !pessoa) {
    throw new Error("Credenciais inválidas.");
  }

  // Verifica a senha
  const isValid = await bcrypt.compare(senha, pessoa.senha);
  if (!isValid) {
    throw new Error("Credenciais inválidas.");
  }

  // Verifica se é cliente (opcionalmente, pode ser admin também, mas esse login é para clientes)
  const { data: cliente, error: clienteErr } = await supabase
    .from("cliente")
    .select("cpf, telefone")
    .eq("id_pessoa", pessoa.id)
    .maybeSingle();

  if (clienteErr || !cliente) {
    throw new Error("Acesso restrito a clientes.");
  }

  return {
    id: pessoa.id,
    nome: pessoa.nome,
    email: pessoa.email,
    cpf: cliente.cpf,
    telefone: cliente.telefone,
    tipo: "cliente"
  };
}

async function getMe(id_pessoa) {
  // Busca pessoa
  const { data: pessoa, error } = await supabase
    .from("pessoa")
    .select("id, nome, email")
    .eq("id", id_pessoa)
    .single();

  if (error) throw error;

  // Busca cliente
  const { data: cliente, error: clienteErr } = await supabase
    .from("cliente")
    .select("cpf, telefone")
    .eq("id_pessoa", id_pessoa)
    .maybeSingle();
    
  if (clienteErr || !cliente) {
     throw new Error("Cliente não encontrado.");
  }

  return {
    id: pessoa.id,
    nome: pessoa.nome,
    email: pessoa.email,
    cpf: cliente.cpf,
    telefone: cliente.telefone,
    tipo: "cliente"
  };
}

module.exports = {
  register,
  login,
  getMe
};
