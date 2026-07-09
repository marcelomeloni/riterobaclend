/**
 * Script para criar o primeiro administrador via terminal.
 * 
 * Uso:
 *   node scripts/createAdmin.js "Nome" "email@ritero.com.br" "SenhaForte123"
 */

require("dotenv").config();

const { createClient } = require("@supabase/supabase-js");
const bcrypt = require("bcryptjs");

const SALT_ROUNDS = 12;

async function main() {
  const [,, nome, email, senhaPlain] = process.argv;

  if (!nome || !email || !senhaPlain) {
    console.error("\n❌ Uso correto:");
    console.error('   node scripts/createAdmin.js "Nome Completo" "email@ritero.com.br" "SenhaForte123"\n');
    process.exit(1);
  }

  const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_KEY,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );

  console.log("\n☕ Ritero – Criando administrador...\n");

  // 1. Hash da senha
  const senhaHash = await bcrypt.hash(senhaPlain, SALT_ROUNDS);
  console.log("🔒 Senha criptografada com bcrypt (12 rounds)");

  // 2. Insere na tabela pessoa
  const { data: pessoa, error: errPessoa } = await supabase
    .from("pessoa")
    .insert({ nome, email, senha: senhaHash })
    .select()
    .single();

  if (errPessoa) {
    console.error("❌ Erro ao criar pessoa:", errPessoa.message);
    process.exit(1);
  }

  console.log(`✅ Pessoa criada  →  ID: ${pessoa.id}`);

  // 3. Insere na tabela admin
  const { error: errAdmin } = await supabase
    .from("admin")
    .insert({ id_pessoa: pessoa.id });

  if (errAdmin) {
    console.error("❌ Erro ao promover a admin:", errAdmin.message);
    process.exit(1);
  }

  console.log(`🛡️  Promovido a Admin`);
  console.log("\n─────────────────────────────────────");
  console.log(`  Nome:   ${nome}`);
  console.log(`  Email:  ${email}`);
  console.log(`  Tipo:   Administrador`);
  console.log(`  ID:     ${pessoa.id}`);
  console.log("─────────────────────────────────────\n");
  console.log("✅ Pronto! Use essas credenciais para logar no painel admin.\n");
}

main();
