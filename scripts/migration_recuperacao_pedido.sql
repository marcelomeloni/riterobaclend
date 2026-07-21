-- Script para habilitar recuperação de carrinhos/pedidos pendentes
-- Execute no painel SQL do Supabase

BEGIN;

ALTER TABLE pedido ADD COLUMN IF NOT EXISTS email_recuperacao_enviado BOOLEAN DEFAULT FALSE;

-- Criar um índice para otimizar as buscas por pedidos pendentes e não enviados
CREATE INDEX IF NOT EXISTS idx_pedido_status_recuperacao 
ON pedido (status, email_recuperacao_enviado);

COMMIT;
