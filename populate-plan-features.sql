-- Script para popular plan_features com dados de exemplo
-- Este script associa todas as landing_features ativas aos planos ativos do produto

-- Primeiro, vamos verificar quantos planos e features existem
DO $$
DECLARE
  v_product_id uuid;
  v_plan_record record;
  v_feature_record record;
BEGIN
  -- Buscar o ID do produto 'APP Renda Recorrente'
  SELECT id INTO v_product_id 
  FROM products 
  WHERE nome = 'APP Renda Recorrente' 
  LIMIT 1;

  IF v_product_id IS NULL THEN
    RAISE NOTICE 'Produto não encontrado';
    RETURN;
  END IF;

  RAISE NOTICE 'Produto encontrado: %', v_product_id;

  -- Para cada plano ativo do produto
  FOR v_plan_record IN 
    SELECT id, name 
    FROM plans 
    WHERE product_id = v_product_id 
    AND is_active = true
  LOOP
    RAISE NOTICE 'Processando plano: % (%)', v_plan_record.name, v_plan_record.id;
    
    -- Limpar relações existentes deste plano
    DELETE FROM plan_features WHERE plan_id = v_plan_record.id;
    
    -- Associar todas as features ativas ao plano
    FOR v_feature_record IN 
      SELECT id, name 
      FROM landing_features 
      WHERE is_active = true
      ORDER BY order_position
    LOOP
      INSERT INTO plan_features (plan_id, feature_id)
      VALUES (v_plan_record.id, v_feature_record.id);
      
      RAISE NOTICE '  - Feature adicionada: %', v_feature_record.name;
    END LOOP;
  END LOOP;
  
  RAISE NOTICE 'Processo concluído!';
END $$;

-- Verificar o resultado
SELECT 
  p.name as plano,
  p.id as plano_id,
  COUNT(pf.id) as total_features
FROM plans p
LEFT JOIN plan_features pf ON pf.plan_id = p.id
WHERE p.is_active = true
GROUP BY p.id, p.name
ORDER BY p.name;
