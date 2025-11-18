-- DADOS DE EXEMPLO PARA O SISTEMA
-- Execute este SQL no Supabase SQL Editor

-- Observação: Este SQL assume que já existe pelo menos 1 usuário cadastrado (você)
-- Vamos buscar o ID do primeiro usuário cadastrado para usar como referência

DO $$
DECLARE
  admin_user_id uuid;
  affiliate1_id uuid := gen_random_uuid();
  affiliate2_id uuid := gen_random_uuid();
  affiliate3_id uuid := gen_random_uuid();
  plan_free_id uuid;
  plan_pro_id uuid;
  coupon1_id uuid := gen_random_uuid();
  coupon2_id uuid := gen_random_uuid();
  subscription1_id uuid := gen_random_uuid();
  subscription2_id uuid := gen_random_uuid();
BEGIN
  -- Pegar o ID do primeiro usuário (admin)
  SELECT id INTO admin_user_id FROM auth.users LIMIT 1;
  
  -- Pegar IDs dos planos existentes
  SELECT id INTO plan_free_id FROM plans WHERE name = 'Afiliação FREE';
  SELECT id INTO plan_pro_id FROM plans WHERE name = 'Afiliação PRO';

  -- 1. INSERIR USUÁRIOS DE EXEMPLO (na tabela auth.users primeiro)
  -- Nota: Em produção, estes usuários seriam criados via signup
  -- Aqui vamos apenas criar perfis simulados
  
  -- Inserir perfis de afiliados de exemplo
  INSERT INTO profiles (id, name, username, phone, cpf, email, city, state, instagram, pix_type, pix_key, affiliate_code, referrer_code)
  VALUES 
    (affiliate1_id, 'Maria Silva', 'maria_silva', '11987654321', '12345678901', 'maria@example.com', 'São Paulo', 'SP', '@mariasilva', 'cpf', '12345678901', 'MARIA123', NULL),
    (affiliate2_id, 'João Santos', 'joao_santos', '21987654321', '98765432109', 'joao@example.com', 'Rio de Janeiro', 'RJ', '@joaosantos', 'email', 'joao@example.com', 'JOAO456', NULL),
    (affiliate3_id, 'Ana Costa', 'ana_costa', '31987654321', '45678912345', 'ana@example.com', 'Belo Horizonte', 'MG', '@anacosta', 'telefone', '31987654321', 'ANA789', 'MARIA123');

  -- Atribuir roles de afiliado
  INSERT INTO user_roles (user_id, role)
  VALUES 
    (affiliate1_id, 'afiliado'),
    (affiliate2_id, 'afiliado'),
    (affiliate3_id, 'afiliado');

  -- 2. INSERIR CUPONS DE EXEMPLO
  INSERT INTO coupons (id, name, code, type, value, description, max_uses, current_uses, is_active, created_by)
  VALUES 
    (coupon1_id, 'Desconto Primeira Assinatura', 'PRIMEIRA50', 'percentage', 50, 'cupom de 50% de desconto na primeira mensalidade', 100, 15, true, admin_user_id),
    (coupon2_id, 'Trial Gratuito 7 Dias', 'TRIAL7', 'days', 7, '7 dias de teste grátis', 50, 8, true, admin_user_id);

  -- Associar cupons aos afiliados
  INSERT INTO affiliate_coupons (affiliate_id, coupon_id)
  VALUES 
    (affiliate1_id, coupon1_id),
    (affiliate1_id, coupon2_id),
    (affiliate2_id, coupon1_id);

  -- 3. INSERIR ASSINATURAS DE EXEMPLO
  INSERT INTO subscriptions (id, user_id, plan_id, status, current_period_start, current_period_end, stripe_subscription_id)
  VALUES 
    (subscription1_id, affiliate1_id, plan_pro_id, 'active', NOW() - INTERVAL '15 days', NOW() + INTERVAL '15 days', 'sub_test123'),
    (subscription2_id, affiliate2_id, plan_free_id, 'active', NOW() - INTERVAL '30 days', NOW() + INTERVAL '30 days', 'sub_test456');

  -- 4. INSERIR REFERRALS/INDICAÇÕES
  INSERT INTO referrals (referrer_id, referred_id, status, coupon_code, conversion_date)
  VALUES 
    (affiliate1_id, affiliate2_id, 'converted', 'PRIMEIRA50', NOW() - INTERVAL '10 days'),
    (affiliate1_id, affiliate3_id, 'converted', 'PRIMEIRA50', NOW() - INTERVAL '5 days'),
    (affiliate2_id, affiliate3_id, 'registered', 'TRIAL7', NOW() - INTERVAL '2 days');

  -- 5. INSERIR SUB-AFILIADOS
  INSERT INTO sub_affiliates (parent_affiliate_id, sub_affiliate_id, level)
  VALUES 
    (affiliate1_id, affiliate2_id, 1),
    (affiliate1_id, affiliate3_id, 1),
    (affiliate2_id, affiliate3_id, 1);

  -- 6. INSERIR COMISSÕES
  INSERT INTO commissions (affiliate_id, subscription_id, commission_type, percentage, amount, status, reference_month, available_date)
  VALUES 
    (affiliate1_id, subscription1_id, 'recurring', 25, 24.25, 'available', DATE_TRUNC('month', NOW()), NOW()),
    (affiliate1_id, subscription1_id, 'recurring', 25, 24.25, 'available', DATE_TRUNC('month', NOW() - INTERVAL '1 month'), NOW() - INTERVAL '1 month'),
    (affiliate1_id, subscription2_id, 'signup', 25, 0, 'available', DATE_TRUNC('month', NOW()), NOW()),
    (affiliate2_id, subscription2_id, 'recurring', 15, 0, 'available', DATE_TRUNC('month', NOW()), NOW()),
    (admin_user_id, subscription1_id, 'recurring', 25, 24.25, 'pending', DATE_TRUNC('month', NOW()), NOW() + INTERVAL '5 days');

  -- 7. INSERIR SAQUES
  INSERT INTO withdrawals (affiliate_id, amount, commission_ids, pix_key, pix_type, status, requested_date)
  VALUES 
    (affiliate1_id, 48.50, ARRAY[(SELECT id FROM commissions WHERE affiliate_id = affiliate1_id LIMIT 1)], '12345678901', 'cpf', 'pending', NOW() - INTERVAL '2 days'),
    (affiliate2_id, 150.00, ARRAY[(SELECT id FROM commissions WHERE affiliate_id = affiliate2_id LIMIT 1)], 'joao@example.com', 'email', 'approved', NOW() - INTERVAL '7 days');

  -- 8. INSERIR ATIVIDADES
  INSERT INTO activities (user_id, activity_type, description, metadata)
  VALUES 
    (affiliate1_id, 'commission', 'Nova comissão recebida', '{"amount": 24.25}'::jsonb),
    (affiliate1_id, 'referral', 'Nova indicação convertida', '{"referred_name": "João Santos"}'::jsonb),
    (affiliate2_id, 'signup', 'Cadastro realizado com sucesso', '{}'::jsonb),
    (affiliate2_id, 'withdrawal', 'Solicitação de saque aprovada', '{"amount": 150.00}'::jsonb);

  -- 9. INSERIR EVENTOS STRIPE (simulados)
  INSERT INTO stripe_events (event_id, event_type, event_data, processed)
  VALUES 
    ('evt_test_001', 'customer.subscription.created', '{"id": "sub_test123", "status": "active"}'::jsonb, true),
    ('evt_test_002', 'invoice.paid', '{"id": "in_test123", "amount": 9700}'::jsonb, true),
    ('evt_test_003', 'customer.subscription.updated', '{"id": "sub_test123", "status": "active"}'::jsonb, true);

  RAISE NOTICE 'Dados de exemplo inseridos com sucesso!';
  RAISE NOTICE 'Admin User ID: %', admin_user_id;
  RAISE NOTICE 'Afiliados criados: Maria Silva, João Santos, Ana Costa';
  RAISE NOTICE 'Cupons criados: PRIMEIRA50, TRIAL7';
END $$;
