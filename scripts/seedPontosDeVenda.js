require("dotenv").config();
const { supabase } = require("../config/supabase");

const PONTOS = [
  {
    nome: "Nutri na Colher",
    rua: "Rua Giusepe Verdi",
    numero: "41",
    bairro: "",
    cidade: "Campinas",
    estado: "SP",
    cep: "13024-540",
    lat: -22.9005,
    long: -47.0580,
  },
  {
    nome: "Delha Confeitaria",
    rua: "R. dos Bandeirantes",
    numero: "693",
    bairro: "Cambuí",
    cidade: "Campinas",
    estado: "SP",
    cep: "13024-011",
    lat: -22.8990,
    long: -47.0530,
  },
  {
    nome: "Casa Jasmim",
    rua: "R. Dr. Viêira Bueno",
    numero: "344",
    bairro: "Cambuí",
    cidade: "Campinas",
    estado: "SP",
    cep: "13024-040",
    lat: -22.8985,
    long: -47.0545,
  },
  {
    nome: "Empório Maria Rosa",
    rua: "Rua Barão de Mota Paes",
    numero: "817",
    bairro: "Centro",
    cidade: "Espírito Santo do Pinhal",
    estado: "SP",
    cep: "13990-000",
    lat: -22.1897,
    long: -46.7439,
  },
  {
    nome: "Doceria Borboletas No Estômago",
    rua: "R. Cônego Motta",
    numero: "667, sala B",
    bairro: "Centro",
    cidade: "Cabreúva",
    estado: "SP",
    cep: "13315-000",
    lat: -23.3067,
    long: -47.1347,
  },
  {
    nome: "Cozinha da Leca",
    rua: "Rua Dr. Paulo C. P. Nogueira",
    numero: "",
    bairro: "Nova Campinas",
    cidade: "Campinas",
    estado: "SP",
    cep: "13092-104",
    lat: -22.8940,
    long: -47.0470,
  },
];

async function seed() {
  console.log("Iniciando seed de Pontos de Venda...");
  
  for (const ponto of PONTOS) {
    console.log(`Inserindo: ${ponto.nome}...`);
    const { data, error } = await supabase
      .from("ponto_de_venda")
      .insert(ponto);
      
    if (error) {
      console.error(`Erro ao inserir ${ponto.nome}:`, error.message);
    } else {
      console.log(`✅ ${ponto.nome} inserido com sucesso!`);
    }
  }
  
  console.log("Seed finalizado!");
}

seed();
