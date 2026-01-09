# Guia para Criar Build iOS/iPad

Este guia explica como criar o executável para iPhone e iPad usando Capacitor.

## Pré-requisitos

1. **Node.js instalado** (versão 18 ou superior)
   - **Se Node.js não estiver instalado**, execute primeiro:
     ```bash
     bash setup-node.sh
     ```
   - Este script irá instalar o Node.js automaticamente via Homebrew ou nvm
   - Verifique com: `node --version`

2. **Xcode instalado** (versão 14 ou superior)
   - Baixe da App Store ou do site da Apple
   - Abra o Xcode pelo menos uma vez para aceitar os termos

3. **CocoaPods instalado** (gerenciador de dependências iOS)
   - Será instalado automaticamente pelo script `build-ios.sh`
   - Ou manualmente: `sudo gem install cocoapods`

## Passos para Criar o Build iOS

### Passo 0: Instalar Node.js (se necessário)

**Se você receber o erro "command not found: npm"**, execute primeiro:

```bash
bash setup-node.sh
```

Este script irá:
- Verificar se Node.js está instalado
- Instalar via Homebrew ou nvm (você escolhe)
- Configurar o ambiente automaticamente

### Opção 1: Usando os Scripts Automatizados (Recomendado)

```bash
# 1. Instalar Node.js (se necessário)
bash setup-node.sh

# 2. Criar build iOS (faz tudo automaticamente)
bash build-ios.sh

# 3. Abrir no Xcode
npm run cap:open:ios
```

### Opção 2: Passo a Passo Manual

```bash
# 1. Instalar dependências
npm install

# 2. Fazer build do projeto web
npm run build

# 3. Adicionar plataforma iOS (apenas na primeira vez)
npm run cap:add:ios

# 4. Sincronizar arquivos com iOS
npm run cap:sync:ios

# 5. Abrir projeto no Xcode
npm run cap:open:ios
```

## No Xcode

1. **Selecionar o dispositivo/simulador:**
   - No topo do Xcode, escolha um iPhone ou iPad (físico ou simulador)

2. **Para testar no simulador:**
   - Selecione um simulador (ex: "iPhone 15 Pro" ou "iPad Pro")
   - Clique no botão ▶️ (Run) ou pressione `Cmd + R`

3. **Para criar um build para dispositivo físico:**
   - Conecte seu iPhone/iPad via USB
   - Selecione seu dispositivo no topo
   - Configure seu Apple Developer Account (se necessário)
   - Clique em ▶️ (Run)

4. **Para criar um arquivo .ipa (para distribuição):**
   - Menu: **Product** → **Archive**
   - Aguarde o processo de build
   - No Organizer, você pode:
     - Exportar para TestFlight
     - Exportar para App Store
     - Exportar para desenvolvimento (Ad Hoc)

## Configurações Importantes

### Bundle Identifier
O Bundle ID está configurado em `capacitor.config.ts` como:
```
app.lovable.d58d1d52fb1b448691d7558c22792e39
```

Se você precisar alterar, edite o arquivo `capacitor.config.ts` e depois execute:
```bash
npm run cap:sync:ios
```

### Suporte a iPhone e iPad
O projeto já está configurado para suportar ambos os dispositivos. A configuração está em:
- `capacitor.config.ts` → `ios.preferredContentMode: 'mobile'`

## Solução de Problemas

### Erro: "CocoaPods not found"
```bash
sudo gem install cocoapods
cd ios/App
pod install
```

### Erro: "No such module 'Capacitor'"
```bash
cd ios/App
pod install
```

### Erro: Node.js não encontrado
Se você usa nvm:
```bash
nvm use
# ou
nvm install 18
nvm use 18
```

### Limpar e Reconstruir
```bash
# Limpar build
rm -rf ios
npm run build
npm run cap:add:ios
npm run cap:sync:ios
```

## Scripts Disponíveis

- `npm run ios:build` - Faz build web e sincroniza com iOS
- `npm run ios:open` - Faz build, sincroniza e abre no Xcode
- `npm run cap:sync:ios` - Sincroniza apenas os arquivos
- `npm run cap:open:ios` - Abre o projeto no Xcode

## Próximos Passos

Após criar o build no Xcode:
1. **Teste no simulador** para verificar se tudo funciona
2. **Teste em dispositivo físico** para validar funcionalidades nativas
3. **Configure certificados** na Apple Developer se for publicar na App Store
4. **Crie um Archive** para distribuição via TestFlight ou App Store

