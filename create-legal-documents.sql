-- Criação da tabela legal_documents para armazenar termos de uso e política de privacidade
CREATE TABLE IF NOT EXISTS public.legal_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  type text NOT NULL UNIQUE CHECK (type IN ('terms', 'privacy')),
  content text NOT NULL,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- Habilitar RLS
ALTER TABLE public.legal_documents ENABLE ROW LEVEL SECURITY;

-- Policy para permitir que qualquer pessoa autenticada ou não possa ler
CREATE POLICY "Anyone can view legal documents"
  ON public.legal_documents
  FOR SELECT
  USING (true);

-- Policy para permitir que apenas admins possam editar
CREATE POLICY "Only admins can update legal documents"
  ON public.legal_documents
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid() AND role = 'super_admin'
    )
  );

-- Inserir conteúdo padrão para Termos de Uso
INSERT INTO public.legal_documents (type, content)
VALUES (
  'terms',
  'TERMOS DE USO - APP RENDA RECORRENTE

1. ACEITAÇÃO DOS TERMOS

Ao se cadastrar e utilizar o APP Renda Recorrente, você concorda com estes Termos de Uso. Se você não concordar com qualquer parte destes termos, não utilize nossos serviços.

2. DESCRIÇÃO DO SERVIÇO

O APP Renda Recorrente é uma plataforma de marketing de afiliados que permite aos usuários cadastrados divulgarem produtos e serviços parceiros e receberem comissões por indicações e vendas realizadas através de seus links únicos de afiliado.

3. CADASTRO E CONTA

3.1. Para utilizar nossos serviços, você deve:
- Ser maior de 18 anos ou ter autorização dos pais/responsáveis
- Fornecer informações verdadeiras, precisas e atualizadas
- Manter a segurança de suas credenciais de acesso
- Não compartilhar sua conta com terceiros

3.2. Você é responsável por todas as atividades realizadas em sua conta.

4. PROGRAMA DE AFILIADOS

4.1. Como afiliado, você poderá:
- Promover produtos e serviços aprovados pela plataforma
- Receber comissões conforme as regras de cada produto/plano
- Acompanhar suas métricas de desempenho no painel
- Solicitar saques quando atingir o valor mínimo estabelecido

4.2. É proibido:
- Utilizar métodos fraudulentos ou enganosos para gerar indicações
- Fazer spam ou práticas de marketing não autorizadas
- Violar direitos autorais ou marcas registradas
- Criar múltiplas contas para o mesmo CPF

5. COMISSÕES E PAGAMENTOS

5.1. As comissões são calculadas conforme percentuais definidos para cada plano/produto
5.2. O prazo de disponibilidade das comissões pode variar conforme política de cada produto
5.3. Saques só podem ser realizados após atingir o valor mínimo estabelecido
5.4. Pagamentos são realizados via PIX para a chave cadastrada
5.5. A plataforma reserva-se o direito de reter pagamentos em caso de suspeita de fraude

6. PROPRIEDADE INTELECTUAL

Todo o conteúdo da plataforma (textos, imagens, logos, códigos) é propriedade do APP Renda Recorrente ou de seus licenciadores e está protegido por leis de propriedade intelectual.

7. RESPONSABILIDADES E LIMITAÇÕES

7.1. A plataforma não se responsabiliza por:
- Perda de lucros ou receitas
- Interrupções temporárias do serviço
- Ações de terceiros (parceiros, produtos promovidos)
- Mudanças nas políticas de comissionamento

7.2. Você concorda em indenizar a plataforma contra quaisquer reclamações decorrentes do uso inadequado dos serviços.

8. MODIFICAÇÕES

Reservamo-nos o direito de modificar estes termos a qualquer momento. Alterações significativas serão comunicadas por email ou através da plataforma.

9. RESCISÃO

Podemos suspender ou encerrar sua conta a qualquer momento por violação destes termos, sem prejuízo de outras medidas cabíveis.

10. LEI APLICÁVEL

Estes termos são regidos pelas leis brasileiras. Qualquer disputa será resolvida no foro da comarca do domicílio do usuário.

11. CONTATO

Para dúvidas sobre estes termos, entre em contato através dos canais oficiais disponíveis na plataforma.

Última atualização: ' || to_char(now(), 'DD/MM/YYYY')
)
ON CONFLICT (type) DO NOTHING;

-- Inserir conteúdo padrão para Aviso de Privacidade
INSERT INTO public.legal_documents (type, content)
VALUES (
  'privacy',
  'AVISO DE PRIVACIDADE - APP RENDA RECORRENTE

Este Aviso de Privacidade descreve como coletamos, usamos, armazenamos e protegemos suas informações pessoais.

1. INFORMAÇÕES QUE COLETAMOS

1.1. Informações fornecidas por você:
- Nome completo
- CPF
- Email
- Telefone
- Endereço completo
- Data de nascimento
- Dados bancários (chave PIX)
- Redes sociais (Instagram, Facebook, TikTok)

1.2. Informações coletadas automaticamente:
- Endereço IP
- Tipo de navegador
- Sistema operacional
- Páginas visitadas
- Data e hora de acesso
- Links clicados

2. COMO USAMOS SUAS INFORMAÇÕES

Utilizamos seus dados para:
- Criar e gerenciar sua conta de afiliado
- Processar comissões e pagamentos
- Enviar comunicações importantes sobre o serviço
- Melhorar nossos serviços e experiência do usuário
- Prevenir fraudes e garantir segurança
- Cumprir obrigações legais e regulatórias
- Análises estatísticas e relatórios

3. COMPARTILHAMENTO DE INFORMAÇÕES

Podemos compartilhar suas informações com:
- Parceiros comerciais (empresas cujos produtos você promove)
- Processadores de pagamento
- Prestadores de serviços de tecnologia
- Autoridades governamentais quando exigido por lei
- Em caso de fusão, aquisição ou venda de ativos

Nunca vendemos suas informações pessoais para terceiros.

4. BASE LEGAL (LGPD)

Processamos seus dados com base em:
- Execução de contrato (prestação do serviço de afiliados)
- Cumprimento de obrigação legal
- Legítimo interesse (prevenção de fraudes, melhorias no serviço)
- Consentimento (quando aplicável)

5. ARMAZENAMENTO E SEGURANÇA

5.1. Seus dados são armazenados em servidores seguros com:
- Criptografia de dados em trânsito e em repouso
- Controles de acesso rigorosos
- Monitoramento de segurança 24/7
- Backups regulares

5.2. Mantemos seus dados pelo tempo necessário para:
- Cumprir as finalidades descritas neste aviso
- Atender obrigações legais (mínimo de 5 anos para dados fiscais)
- Resolver disputas

6. SEUS DIREITOS (LGPD)

Você tem direito a:
- Confirmação da existência de tratamento
- Acesso aos seus dados
- Correção de dados incompletos ou incorretos
- Anonimização, bloqueio ou eliminação de dados
- Portabilidade dos dados
- Informação sobre compartilhamento
- Revogação do consentimento
- Oposição a tratamento realizado

Para exercer seus direitos, entre em contato através dos canais oficiais.

7. COOKIES

Utilizamos cookies para:
- Manter você conectado
- Lembrar suas preferências
- Analisar uso da plataforma
- Personalizar conteúdo

Você pode gerenciar cookies nas configurações do seu navegador.

8. MENORES DE IDADE

Nossos serviços são destinados a maiores de 18 anos. Não coletamos intencionalmente dados de menores. Se identificarmos dados de menores, eles serão excluídos.

9. TRANSFERÊNCIA INTERNACIONAL

Seus dados podem ser transferidos para servidores localizados fora do Brasil, sempre com garantias adequadas de proteção conforme LGPD.

10. ALTERAÇÕES NESTE AVISO

Podemos atualizar este aviso periodicamente. Alterações significativas serão comunicadas por email ou notificação na plataforma.

11. ENCARREGADO DE DADOS (DPO)

Para questões sobre privacidade e proteção de dados, entre em contato através dos canais oficiais da plataforma.

12. RECLAMAÇÕES

Você pode registrar reclamações junto à Autoridade Nacional de Proteção de Dados (ANPD).

Última atualização: ' || to_char(now(), 'DD/MM/YYYY')
)
ON CONFLICT (type) DO NOTHING;
