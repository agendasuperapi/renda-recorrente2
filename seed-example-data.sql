-- DADOS DE EXEMPLO PARA O SISTEMA
-- Execute este SQL no Supabase SQL Editor
-- IMPORTANTE: Faça login no sistema antes de executar para que seu usuário exista

DO $$
DECLARE
  admin_user_id uuid;
  plan_free_id uuid;
  plan_pro_id uuid;
  coupon1_id uuid := gen_random_uuid();
  coupon2_id uuid := gen_random_uuid();
  subscription1_id uuid := gen_random_uuid();
BEGIN
  -- Pegar o ID do primeiro usuário cadastrado
  SELECT id INTO admin_user_id FROM auth.users ORDER BY created_at LIMIT 1;
  
  IF admin_user_id IS NULL THEN
    RAISE EXCEPTION 'Nenhum usuário encontrado. Faça login no sistema primeiro!';
  END IF;
  
  -- Pegar IDs dos planos existentes
  SELECT id INTO plan_free_id FROM plans WHERE name = 'Afiliação FREE';
  SELECT id INTO plan_pro_id FROM plans WHERE name = 'Afiliação PRO';

  -- 1. INSERIR CUPONS DE EXEMPLO
  INSERT INTO coupons (id, name, code, type, value, description, max_uses, current_uses, is_active, created_by, valid_until)
  VALUES 
    (coupon1_id, 'Desconto Primeira Assinatura', 'PRIMEIRA50', 'percentage', 50, '50% de desconto na primeira mensalidade', 100, 15, true, admin_user_id, NOW() + INTERVAL '90 days'),
    (coupon2_id, 'Trial Gratuito 7 Dias', 'TRIAL7', 'days', 7, '7 dias de teste grátis', 50, 8, true, admin_user_id, NOW() + INTERVAL '60 days');

  -- 2. Associar cupons ao usuário atual
  INSERT INTO affiliate_coupons (affiliate_id, coupon_id)
  VALUES 
    (admin_user_id, coupon1_id),
    (admin_user_id, coupon2_id);

  -- 3. INSERIR ASSINATURA DE EXEMPLO
  INSERT INTO subscriptions (id, user_id, plan_id, status, current_period_start, current_period_end, stripe_subscription_id)
  VALUES 
    (subscription1_id, admin_user_id, plan_pro_id, 'active', NOW() - INTERVAL '15 days', NOW() + INTERVAL '15 days', 'sub_example_' || substr(md5(random()::text), 1, 8));

  -- 4. INSERIR COMISSÕES DE EXEMPLO
  INSERT INTO commissions (affiliate_id, subscription_id, commission_type, percentage, amount, status, reference_month, available_date, notes)
  VALUES 
    (admin_user_id, subscription1_id, 'recurring', 25, 24.25, 'available', DATE_TRUNC('month', NOW()), NOW(), 'Comissão mensal recorrente'),
    (admin_user_id, subscription1_id, 'recurring', 25, 24.25, 'available', DATE_TRUNC('month', NOW() - INTERVAL '1 month'), NOW() - INTERVAL '1 month', 'Comissão do mês anterior'),
    (admin_user_id, subscription1_id, 'signup', 25, 97.00, 'withdrawn', DATE_TRUNC('month', NOW() - INTERVAL '2 months'), NOW() - INTERVAL '2 months', 'Comissão de adesão'),
    (admin_user_id, subscription1_id, 'recurring', 25, 24.25, 'pending', DATE_TRUNC('month', NOW()), NOW() + INTERVAL '5 days', 'Aguardando aprovação'),
    (admin_user_id, subscription1_id, 'recurring', 25, 24.25, 'available', DATE_TRUNC('month', NOW()), NOW(), 'Comissão disponível 2');

  -- 5. INSERIR SAQUES DE EXEMPLO
  INSERT INTO withdrawals (affiliate_id, amount, commission_ids, pix_key, pix_type, status, requested_date)
  VALUES 
    (admin_user_id, 145.75, ARRAY[(SELECT id FROM commissions WHERE affiliate_id = admin_user_id AND status = 'available' LIMIT 1)], '12345678901', 'cpf', 'pending', NOW() - INTERVAL '2 days'),
    (admin_user_id, 97.00, ARRAY[(SELECT id FROM commissions WHERE affiliate_id = admin_user_id AND status = 'withdrawn' LIMIT 1)], '12345678901', 'cpf', 'paid', NOW() - INTERVAL '30 days');

  -- Atualizar a data de pagamento do saque pago
  UPDATE withdrawals 
  SET approved_date = NOW() - INTERVAL '29 days',
      paid_date = NOW() - INTERVAL '28 days',
      approved_by = admin_user_id
  WHERE status = 'paid' AND affiliate_id = admin_user_id;

  -- 6. INSERIR ATIVIDADES DE EXEMPLO
  INSERT INTO activities (user_id, activity_type, description, metadata)
  VALUES 
    (admin_user_id, 'commission', 'Nova comissão recebida', jsonb_build_object('amount', 24.25, 'type', 'recurring')),
    (admin_user_id, 'withdrawal', 'Solicitação de saque realizada', jsonb_build_object('amount', 145.75, 'status', 'pending')),
    (admin_user_id, 'signup', 'Cadastro no programa de afiliados', jsonb_build_object('plan', 'PRO')),
    (admin_user_id, 'coupon', 'Novo cupom criado', jsonb_build_object('code', 'PRIMEIRA50', 'discount', 50)),
    (admin_user_id, 'profile', 'Perfil atualizado', jsonb_build_object('fields', ARRAY['phone', 'pix_key']));

  -- 7. INSERIR EVENTOS STRIPE (simulados)
  INSERT INTO stripe_events (event_id, event_type, event_data, processed)
  VALUES 
    ('evt_' || substr(md5(random()::text), 1, 16), 'customer.subscription.created', jsonb_build_object('id', 'sub_example_001', 'status', 'active', 'plan', jsonb_build_object('amount', 9700)), true),
    ('evt_' || substr(md5(random()::text), 1, 16), 'invoice.paid', jsonb_build_object('id', 'in_example_001', 'amount', 9700, 'status', 'paid'), true),
    ('evt_' || substr(md5(random()::text), 1, 16), 'customer.subscription.updated', jsonb_build_object('id', 'sub_example_001', 'status', 'active'), true),
    ('evt_' || substr(md5(random()::text), 1, 16), 'invoice.payment_succeeded', jsonb_build_object('id', 'in_example_002', 'amount', 9700), false),
    ('evt_' || substr(md5(random()::text), 1, 16), 'customer.subscription.deleted', jsonb_build_object('id', 'sub_example_002', 'status', 'canceled'), false);

  RAISE NOTICE '✓ Dados de exemplo inseridos com sucesso!';
  RAISE NOTICE 'User ID: %', admin_user_id;
  RAISE NOTICE '✓ 2 cupons criados (PRIMEIRA50, TRIAL7)';
  RAISE NOTICE '✓ 1 assinatura ativa';
  RAISE NOTICE '✓ 5 comissões (3 disponíveis, 1 pendente, 1 paga)';
  RAISE NOTICE '✓ 2 saques (1 pendente, 1 pago)';
  RAISE NOTICE '✓ 5 atividades registradas';
  RAISE NOTICE '✓ 5 eventos Stripe simulados';
END $$;
