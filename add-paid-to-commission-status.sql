-- Adiciona o valor 'paid' ao enum commission_status se ele não existir
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_enum 
    WHERE enumlabel = 'paid' 
    AND enumtypid = (
      SELECT oid FROM pg_type WHERE typname = 'commission_status'
    )
  ) THEN
    ALTER TYPE commission_status ADD VALUE 'paid';
  END IF;
END $$;

-- Comentário explicativo
COMMENT ON TYPE commission_status IS 'Status das comissões: pending (pendente), available (disponível para saque), paid (pago)';
