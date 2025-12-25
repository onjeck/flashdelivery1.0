#!/bin/bash

# FlashDelivery v1.1 - Setup Verification Script
# Execute este arquivo para verificar se tudo está configurado corretamente

echo "🔍 FlashDelivery v1.1 - Verification Script"
echo "============================================="
echo ""

# Cores
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Função para verificar arquivo
check_file() {
  if [ -f "$1" ]; then
    echo -e "${GREEN}✓${NC} $1"
    return 0
  else
    echo -e "${RED}✗${NC} $1 (MISSING)"
    return 1
  fi
}

# Função para verificar comando
check_command() {
  if command -v "$1" &> /dev/null; then
    echo -e "${GREEN}✓${NC} $1"
    return 0
  else
    echo -e "${RED}✗${NC} $1 (NOT INSTALLED)"
    return 1
  fi
}

echo "📦 Verificando dependências globais..."
check_command "node"
check_command "npm"
echo ""

echo "📁 Verificando arquivos de configuração..."
check_file ".eslintrc.json"
check_file ".prettierrc.json"
check_file ".env.example"
check_file "vite.config.ts"
check_file "tsconfig.json"
check_file "vitest.config.ts"
echo ""

echo "📚 Verificando documentação..."
check_file "LINTING_SETUP.md"
check_file "PERFORMANCE_GUIDE.md"
check_file "PWA_GUIDE.md"
check_file "SECURITY_GUIDE.md"
check_file "UPDATE_SUMMARY.md"
echo ""

echo "🛠️ Verificando utilitários..."
check_file "utils/performanceUtils.ts"
check_file "utils/pwaUtils.ts"
check_file "utils/securityUtils.ts"
check_file "utils/securityHeaders.ts"
check_file "utils/firebaseRules.ts"
echo ""

echo "✅ Verificação concluída!"
echo ""
echo "📋 Próximos passos:"
echo "1. npm install"
echo "2. cp .env.example .env.local"
echo "3. Preencher credenciais em .env.local"
echo "4. npm run dev"
echo ""
