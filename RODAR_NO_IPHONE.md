# Como Rodar o App no iPhone Físico

## Passo a Passo no Xcode

### 1. Selecionar o iPhone Físico

No topo do Xcode, ao lado do botão ▶️ (Run):
- Clique no menu dropdown (onde provavelmente está escrito "iPhone 15 Pro" ou nome de um simulador)
- Selecione **"iPhone de Heron 16 Pro Max"** ou o nome do seu iPhone

### 2. Configurar Assinatura (Signing)

1. No painel esquerdo do Xcode, clique no projeto **"App"** (ícone azul no topo)
2. Selecione o target **"App"** na lista de targets
3. Vá para a aba **"Signing & Capabilities"**
4. Marque a opção **"Automatically manage signing"**
5. Selecione seu **Team** (sua conta Apple Developer)
   - Se não aparecer nenhum team, você precisará:
     - Fazer login com sua Apple ID: Xcode → Settings → Accounts → Adicionar sua Apple ID
     - Ou criar uma conta Apple Developer (gratuita para desenvolvimento)

### 3. Confiar no Computador (no iPhone)

**IMPORTANTE:** Na primeira vez que conectar o iPhone:

1. No iPhone, aparecerá uma mensagem: **"Confiar neste computador?"**
2. Toque em **"Confiar"**
3. Digite a senha do iPhone se solicitado

### 4. Executar o App

1. No Xcode, clique no botão **▶️ (Run)** ou pressione **Cmd + R**
2. O Xcode irá:
   - Compilar o projeto
   - Instalar o app no iPhone
   - Abrir o app automaticamente

### 5. Permitir App de Desenvolvedor (no iPhone)

Na primeira execução, no iPhone:

1. Vá em **Configurações** → **Geral** → **VPN e Gerenciamento de Dispositivo**
2. Toque no perfil do desenvolvedor (seu nome ou email)
3. Toque em **"Confiar em [seu nome]"**
4. Confirme toque em **"Confiar"**

Agora o app deve abrir normalmente!

## Solução de Problemas

### Erro: "No signing certificate found"

**Solução:**
1. Xcode → Settings → Accounts
2. Adicione sua Apple ID
3. Selecione sua conta e clique em "Download Manual Profiles"
4. Volte para Signing & Capabilities e selecione seu Team

### Erro: "Device is not registered"

**Solução:**
1. No Xcode, vá em Window → Devices and Simulators
2. Selecione seu iPhone
3. Clique em "Use for Development"
4. Pode ser necessário fazer login com sua Apple ID

### Erro: "Could not launch app"

**Solução:**
1. Desbloqueie o iPhone
2. Confie no computador (se ainda não fez)
3. Configure o perfil de desenvolvedor nas Configurações do iPhone
4. Tente executar novamente

### App não aparece no iPhone

**Solução:**
1. Verifique se o cabo USB está bem conectado
2. Tente desconectar e reconectar
3. No iPhone: Configurações → Geral → VPN e Gerenciamento de Dispositivo → Confiar no desenvolvedor

## Dicas

- **Mantenha o iPhone desbloqueado** durante a instalação
- **Mantenha o cabo conectado** durante o desenvolvimento
- Para **debugging**, você pode ver logs no Xcode (aba Console na parte inferior)
- Para **testar sem cabo**, você pode usar TestFlight (requer conta Apple Developer paga)

## Próximos Passos

Após conseguir rodar no iPhone:
- Teste todas as funcionalidades
- Verifique performance
- Teste em diferentes orientações (portrait/landscape)
- Teste notificações push (se aplicável)

