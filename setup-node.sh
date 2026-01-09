#!/bin/bash

# Script para instalar e configurar Node.js
# Execute: bash setup-node.sh

set -e

echo "🔍 Verificando Node.js..."
echo ""

# Verificar se Node.js já está instalado
if command -v node &> /dev/null; then
    echo "✅ Node.js já está instalado: $(node --version)"
    echo "✅ npm já está instalado: $(npm --version)"
    exit 0
fi

echo "❌ Node.js não encontrado. Instalando..."
echo ""

# Verificar se Homebrew está instalado
if command -v brew &> /dev/null; then
    echo "✅ Homebrew encontrado"
    echo ""
    echo "Escolha o método de instalação:"
    echo "1) Instalar Node.js via Homebrew (mais simples)"
    echo "2) Instalar nvm (Node Version Manager - recomendado)"
    echo ""
    read -p "Digite 1 ou 2: " choice
    
    if [ "$choice" = "1" ]; then
        echo ""
        echo "📦 Instalando Node.js via Homebrew..."
        brew install node
        echo ""
        echo "✅ Node.js instalado com sucesso!"
        echo "   Versão: $(node --version)"
        echo "   npm: $(npm --version)"
    elif [ "$choice" = "2" ]; then
        echo ""
        echo "📦 Instalando nvm..."
        
        # Instalar nvm via script oficial
        curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash
        
        # Carregar nvm no shell atual
        export NVM_DIR="$HOME/.nvm"
        [ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"
        
        # Adicionar ao .zshrc se não estiver lá
        if ! grep -q "NVM_DIR" ~/.zshrc 2>/dev/null; then
            echo '' >> ~/.zshrc
            echo '# NVM Configuration' >> ~/.zshrc
            echo 'export NVM_DIR="$HOME/.nvm"' >> ~/.zshrc
            echo '[ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"' >> ~/.zshrc
            echo '[ -s "$NVM_DIR/bash_completion" ] && \. "$NVM_DIR/bash_completion"' >> ~/.zshrc
        fi
        
        # Instalar Node.js LTS
        echo ""
        echo "📦 Instalando Node.js LTS via nvm..."
        nvm install --lts
        nvm use --lts
        nvm alias default lts/*
        
        echo ""
        echo "✅ nvm e Node.js instalados com sucesso!"
        echo "   Versão: $(node --version)"
        echo "   npm: $(npm --version)"
        echo ""
        echo "⚠️  IMPORTANTE: Feche e reabra o terminal, ou execute:"
        echo "   source ~/.zshrc"
    else
        echo "❌ Opção inválida"
        exit 1
    fi
else
    echo "❌ Homebrew não encontrado!"
    echo ""
    echo "Por favor, instale o Homebrew primeiro:"
    echo "  /bin/bash -c \"\$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)\""
    exit 1
fi

echo ""
echo "🎉 Configuração concluída!"
echo ""
echo "Agora você pode executar:"
echo "  bash build-ios.sh"
echo "  ou"
echo "  npm run ios:open"

