-- Criar view para estatísticas de processamento de comissões
CREATE OR REPLACE VIEW view_commission_processing_stats AS
SELECT
  environment,
  COUNT(*) AS total,
  COALESCE(SUM(amount), 0) AS total_amount,
  COUNT(*) FILTER (WHERE commission_processed = true AND commission_error IS NULL) AS processed,
  COALESCE(SUM(amount) FILTER (WHERE commission_processed = true AND commission_error IS NULL), 0) AS processed_amount,
  COUNT(*) FILTER (WHERE commission_processed = false AND commission_error IS NULL) AS pending,
  COALESCE(SUM(amount) FILTER (WHERE commission_processed = false AND commission_error IS NULL), 0) AS pending_amount,
  COUNT(*) FILTER (WHERE commission_error IS NOT NULL) AS with_error,
  COALESCE(SUM(amount) FILTER (WHERE commission_error IS NOT NULL), 0) AS error_amount
FROM unified_payments
GROUP BY environment;

-- Habilitar RLS na view
ALTER VIEW view_commission_processing_stats SET (security_invoker = true);

-- Comentário para documentação
COMMENT ON VIEW view_commission_processing_stats IS 'Estatísticas de processamento de comissões por ambiente';