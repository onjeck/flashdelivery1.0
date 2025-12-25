# FlashDelivery - Linting & Formatting

## ESLint
- **Arquivo:** `.eslintrc.json`
- **Comandos:**
  - `npm run lint` - Verifica erros
  - `npm run lint:fix` - Corrige automaticamente

## Prettier
- **Arquivo:** `.prettierrc.json`
- **Comandos:**
  - `npm run format` - Formata todos os arquivos
  - `npm run format:check` - Verifica formatação

## Type Checking
- `npm run type-check` - Verifica tipos TypeScript

## Testes (Vitest)
- `npm run test` - Executa testes
- `npm run test:ui` - Interface visual dos testes
- `npm run test:coverage` - Cobertura de testes

## Pre-commit (Opcional)
Para executar lint e format automaticamente antes de commits, instale:
```bash
npm install -D husky lint-staged
npx husky install
```

Então crie `.husky/pre-commit`:
```bash
npx lint-staged
```

E adicione ao `package.json`:
```json
"lint-staged": {
  "*.{ts,tsx}": "eslint --fix",
  "*.{ts,tsx,json,md}": "prettier --write"
}
```
