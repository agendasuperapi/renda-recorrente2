#!/bin/bash

# Script para criar build iOS/iPad
# Execute: bash build-ios.sh

set -e  # Para em caso de erro

# Carregar nvm se existir (para casos onde foi instalado mas não está no PATH)
export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"
[ -s "$NVM_DIR/bash_completion" ] && \. "$NVM_DIR/bash_completion"

echo "🚀 Iniciando build iOS/iPad..."
echo ""

# Verificar se Node.js está instalado
if ! command -v node &> /dev/null; then
    echo "❌ Node.js não encontrado!"
    echo ""
    echo "Por favor, execute primeiro:"
    echo "  bash setup-node.sh"
    echo ""
    echo "Isso irá instalar o Node.js automaticamente."
    exit 1
fi

echo "✅ Node.js encontrado: $(node --version)"
echo ""

# Verificar se npm está instalado
if ! command -v npm &> /dev/null; then
    echo "❌ npm não encontrado!"
    exit 1
fi

echo "✅ npm encontrado: $(npm --version)"
echo ""

# Instalar dependências se necessário
if [ ! -d "node_modules" ]; then
    echo "📦 Instalando dependências..."
    npm install
    echo ""
fi

# Fazer build do projeto
echo "🔨 Fazendo build do projeto web..."
npm run build
echo "✅ Build concluído!"
echo ""

# Verificar se a pasta ios existe
if [ ! -d "ios" ]; then
    echo "📱 Adicionando plataforma iOS..."
    npx cap add ios
    echo "✅ Plataforma iOS adicionada!"
    echo ""
fi

# Sincronizar arquivos
echo "🔄 Sincronizando arquivos com iOS..."
npx cap sync ios
echo "✅ Sincronização concluída!"
echo ""

# Capacitor 8 usa Swift Package Manager, não CocoaPods
# As dependências são gerenciadas automaticamente pelo Xcode

echo "🎉 Build iOS concluído com sucesso!"
echo ""
echo "📱 Para abrir no Xcode, execute:"
echo "   npm run cap:open:ios"
echo ""
echo "   ou"
echo ""
echo "   npx cap open ios"
echo ""

