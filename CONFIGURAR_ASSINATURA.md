# Como Configurar Assinatura no Xcode

## Erro: "Signing for 'App' requires a development team"

Este erro ocorre porque o Xcode precisa de uma conta Apple Developer para assinar o app.

## Solução Passo a Passo

### Opção 1: Usar Apple ID Gratuita (Recomendado para Desenvolvimento)

Você pode usar sua Apple ID pessoal gratuitamente para desenvolvimento e testes no seu próprio dispositivo.

#### Passo 1: Adicionar Apple ID no Xcode

1. Abra o Xcode
2. Vá em **Xcode** → **Settings** (ou **Preferences** em versões antigas)
3. Clique na aba **Accounts**
4. Clique no botão **+** (mais) no canto inferior esquerdo
5. Selecione **Apple ID**
6. Digite seu email e senha da Apple ID
7. Clique em **Sign In**

#### Passo 2: Configurar Assinatura no Projeto

1. No Xcode, no painel esquerdo, clique no projeto **"App"** (ícone azul no topo)
2. Selecione o target **"App"** na lista de targets
3. Vá para a aba **"Signing & Capabilities"**
4. Marque a opção **"Automatically manage signing"**
5. No campo **"Team"**, selecione sua Apple ID (deve aparecer seu nome ou email)
6. O Xcode irá automaticamente:
   - Criar um certificado de desenvolvimento
   - Criar um perfil de provisionamento
   - Configurar o Bundle Identifier (pode precisar ajustar se já estiver em uso)

#### Passo 3: Ajustar Bundle Identifier (se necessário)

Se aparecer um erro dizendo que o Bundle ID já está em uso:

1. No mesmo painel "Signing & Capabilities"
2. Clique em **"Bundle Identifier"**
3. Altere para algo único, por exemplo:
   - `app.lovable.d58d1d52fb1b448691d7558c22792e39` → `app.rendarecorrente.heron` (use seu nome ou algo único)
4. O Xcode irá atualizar automaticamente

### Opção 2: Criar Conta Apple Developer (Para Publicação)

Se você planeja publicar na App Store, precisará de uma conta Apple Developer paga ($99/ano):

1. Acesse: https://developer.apple.com/programs/
2. Inscreva-se no programa
3. Após aprovação, adicione a conta no Xcode (mesmo processo da Opção 1)

## Verificar se Está Funcionando

Após configurar:

1. O campo **"Team"** deve mostrar sua Apple ID
2. Deve aparecer uma mensagem verde: **"Signing certificate is valid"**
3. O **Bundle Identifier** deve estar configurado
4. Não deve haver erros vermelhos

## Solução de Problemas

### Erro: "No accounts with App Store Connect access"

**Solução:** Isso é normal para Apple ID gratuita. Você ainda pode desenvolver e testar no seu dispositivo. Apenas ignore este aviso.

### Erro: "Bundle Identifier is already in use"

**Solução:** 
- Altere o Bundle Identifier para algo único
- Use formato: `com.seunome.app` ou `app.rendarecorrente.heron`

### Erro: "Failed to create provisioning profile"

**Solução:**
1. Certifique-se de que "Automatically manage signing" está marcado
2. Tente limpar: Xcode → Product → Clean Build Folder (Shift + Cmd + K)
3. Tente novamente

### Erro: "Your account already has a valid signing certificate"

**Solução:** Isso é bom! Significa que o certificado já existe. Apenas selecione seu Team e continue.

## Próximos Passos

Após configurar a assinatura:

1. Selecione seu iPhone no menu de dispositivos
2. Clique em ▶️ (Run)
3. O app será instalado no seu iPhone!

## Nota Importante

- **Apple ID Gratuita:** Permite desenvolver e testar no seu próprio dispositivo
- **Apple Developer Pago:** Necessário apenas para publicar na App Store ou distribuir para outros dispositivos

Para desenvolvimento pessoal, a Apple ID gratuita é suficiente!

