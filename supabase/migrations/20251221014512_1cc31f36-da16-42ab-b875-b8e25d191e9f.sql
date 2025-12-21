-- Ajustar view para não tratar pagamentos de trial (amount=0) como erro
CREATE OR REPLACE VIEW public.view_commission_processing_stats
WITH (security_invoker = true)
AS
SELECT
  environment,
  COUNT(*) AS total,
  COALESCE(SUM(amount), 0) AS total_amount,

  -- Processados: inclui trials (amount=0) que apenas não geram comissão
  COUNT(*) FILTER (
    WHERE commission_processed = true
      AND (
        commission_error IS NULL
        OR commission_error ILIKE '%Trial payment%'
      )
  ) AS processed,
  COALESCE(
    SUM(amount) FILTER (
      WHERE commission_processed = true
        AND (
          commission_error IS NULL
          OR commission_error ILIKE '%Trial payment%'
        )
    ),
    0
  ) AS processed_amount,

  -- Pendentes: ainda não processados e sem erro
  COUNT(*) FILTER (WHERE commission_processed = false AND commission_error IS NULL) AS pending,
  COALESCE(SUM(amount) FILTER (WHERE commission_processed = false AND commission_error IS NULL), 0) AS pending_amount,

  -- Erros reais: exclui trials (amount=0)
  COUNT(*) FILTER (
    WHERE commission_error IS NOT NULL
      AND commission_error NOT ILIKE '%Trial payment%'
  ) AS with_error,
  COALESCE(
    SUM(amount) FILTER (
      WHERE commission_error IS NOT NULL
        AND commission_error NOT ILIKE '%Trial payment%'
    ),
    0
  ) AS error_amount
FROM public.unified_payments
GROUP BY environment;

COMMENT ON VIEW public.view_commission_processing_stats IS 'Estatísticas de processamento de comissões por ambiente (trials não contam como erro)';