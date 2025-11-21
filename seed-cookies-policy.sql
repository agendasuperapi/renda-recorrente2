-- Insert default cookies policy into legal_documents table
INSERT INTO legal_documents (type, content)
VALUES (
  'cookies',
  '# Política de Cookies

Última atualização: ' || TO_CHAR(CURRENT_DATE, 'DD/MM/YYYY') || '

## O que são cookies?

Cookies são pequenos arquivos de texto que são armazenados no seu navegador quando você visita nosso site. Eles nos ajudam a fornecer uma melhor experiência de usuário, personalizar conteúdo e analisar o tráfego do nosso site.

## Como usamos cookies?

### Cookies Essenciais
Esses cookies são necessários para o funcionamento básico do site. Eles permitem:
- Manter sua sessão ativa enquanto navega
- Lembrar suas preferências de idioma e tema
- Garantir a segurança durante a navegação

### Cookies de Desempenho
Esses cookies nos ajudam a entender como os visitantes interagem com nosso site, permitindo:
- Análise de páginas mais visitadas
- Identificação de áreas que precisam de melhorias
- Medição da eficácia de nossas campanhas

### Cookies de Funcionalidade
Esses cookies permitem que o site lembre de suas escolhas para fornecer recursos aprimorados:
- Preferências de personalização
- Configurações de conta
- Conteúdo recomendado baseado em suas interações

### Cookies de Marketing
Com seu consentimento, usamos cookies de marketing para:
- Exibir anúncios relevantes para você
- Limitar o número de vezes que você vê um anúncio
- Medir a eficácia de campanhas publicitárias

## Cookies de Terceiros

Podemos usar cookies de terceiros para:
- Google Analytics: análise de tráfego e comportamento
- Redes sociais: compartilhamento de conteúdo
- Ferramentas de marketing: otimização de campanhas

## Gerenciamento de Cookies

Você pode controlar e/ou excluir cookies conforme desejar. Você pode excluir todos os cookies já presentes no seu computador e configurar a maioria dos navegadores para impedir que sejam armazenados.

### Como desativar cookies:

**Google Chrome:**
1. Clique em Menu > Configurações
2. Role para baixo e clique em "Avançado"
3. Em "Privacidade e segurança", clique em "Configurações de conteúdo"
4. Clique em "Cookies"

**Mozilla Firefox:**
1. Clique em Menu > Opções
2. Selecione "Privacidade e Segurança"
3. Em "Cookies e dados de sites", configure suas preferências

**Safari:**
1. Clique em Safari > Preferências
2. Clique em "Privacidade"
3. Configure suas opções de cookies

**Microsoft Edge:**
1. Clique em Menu > Configurações
2. Selecione "Privacidade, pesquisa e serviços"
3. Em "Cookies", configure suas preferências

## Impacto da Desativação

Ao desativar cookies, algumas funcionalidades do site podem não funcionar corretamente:
- Você pode precisar fazer login novamente em cada visita
- Suas preferências personalizadas serão perdidas
- Alguns recursos interativos podem não funcionar

## Atualizações desta Política

Podemos atualizar esta Política de Cookies periodicamente. Notificaremos sobre mudanças significativas através de um aviso em destaque em nosso site.

## Consentimento

Ao continuar navegando em nosso site, você concorda com o uso de cookies de acordo com esta política. Você pode alterar suas preferências de cookies a qualquer momento através das configurações do seu navegador.

## Contato

Se você tiver dúvidas sobre nossa Política de Cookies, entre em contato:
- E-mail: contato@apprendarecorrente.com
- Telefone: (11) 99999-9999

---

Esta política faz parte dos nossos Termos de Uso e Política de Privacidade.'
)
ON CONFLICT (type) DO UPDATE
SET content = EXCLUDED.content,
    updated_at = CURRENT_TIMESTAMP;
