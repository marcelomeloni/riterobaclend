-- Script de migração para habilitar emissão de NF-e na tabela de pedidos
-- Execute este script no editor SQL do Supabase.

BEGIN;

-- 1. Adiciona as colunas necessárias na tabela 'pedido'
ALTER TABLE pedido ADD COLUMN IF NOT EXISTS nfe_chave VARCHAR(44);
ALTER TABLE pedido ADD COLUMN IF NOT EXISTS nfe_xml_url TEXT;
ALTER TABLE pedido ADD COLUMN IF NOT EXISTS nfe_pdf_url TEXT;

-- 2. Cria índices para otimizar buscas por chave da nota fiscal
CREATE INDEX IF NOT EXISTS idx_pedido_nfe_chave ON pedido(nfe_chave);

COMMIT;

-- INSTRUÇÕES ADICIONAIS SUPABASE BUCKET:
-- 1. Acesse o painel do Supabase.
-- 2. Vá em "Storage" -> "New bucket".
-- 3. Nomeie o bucket como "nfe-documents".
-- 4. Deixe-o como público ou privado conforme a política de segurança que desejar.
-- 5. Se privado, crie uma Policy (RPA/RLS) para permitir que os administradores leiam/escrevam os arquivos.
