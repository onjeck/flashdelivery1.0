# Guia de Publicação

Este guia irá ajudá-lo a publicar o aplicativo no GitHub e na Vercel.

## 1. Resumo das Alterações

As seguintes alterações e correções foram implementadas no código e estão prontas para serem enviadas:

- **Correção do Build**: Adiciona a dependência `terser` para corrigir um erro de build na Vercel.
- **Correção do Tema**: O principal problema da troca de temas que não funcionava foi corrigido. O painel de administração agora reflete o tema selecionado.
- **Correção do Sistema de Notificações**: Um erro que impedia o funcionamento das notificações foi corrigido pela adição do `NotificationProvider` ausente no `App.tsx`.
- **Gestão de Administradores**: A página "Gestão de Cadastros" agora busca e exibe corretamente a lista de administradores, permitindo a sua visualização e gerenciamento.
- **Privacidade nos Recibos**: O nome de login do usuário foi removido dos recibos de clientes e motoboys para aumentar a privacidade.

## 2. Fazendo o Commit das Alterações

Abra o seu terminal na pasta do projeto e execute os seguintes comandos para fazer o commit das alterações que foram feitas.

**Comandos Git:**

1. Instale as dependências atualizadas:
   ```bash
   npm install
   ```

2. Adicione todos os arquivos modificados ao stage (incluindo `package.json` e `package-lock.json`):
   ```bash
   git add .
   ```

3. Faça o commit com a mensagem sugerida (copie e cole a mensagem abaixo):
   ```bash
   git commit -m "fix: Adiciona terser para corrigir build e implementa melhorias

Este commit aborda várias questões e melhorias no painel de administração:

- **Build**: Adiciona a dependência `terser` para corrigir um erro de build na Vercel.
- **Tema**: Corrige um bug importante onde a troca de tema não funcionava. Os estilos fixos no AdminDashboard foram substituídos por variáveis CSS dinâmicas do contexto do tema.
- **Sistema de Notificação**: Corrige um erro crítico adicionando o `NotificationProvider` que estava faltando no componente principal do aplicativo.
- **Gerenciamento de Usuários**: Implementa corretamente a exibição e o gerenciamento de contas de administrador na página "Gestão de Cadastros".
- **Privacidade do Recibo**: Remove o nome de usuário de login dos recibos gerados para clientes e motoristas para melhorar a privacidade."
   ```

## 3. Publicando no GitHub

1.  **Crie um novo repositório no GitHub:**
    *   Vá para [github.com/new](https://github.com/new).
    *   Dê um nome ao seu repositório (por exemplo, `flashdelivery-central`).
    *   Escolha se o repositório será público ou privado.
    *   **Não** inicialize o repositório com um `README`, `.gitignore` ou licença, pois o projeto local já possui esses arquivos.
    *   Clique em "Create repository".

2.  **Conecte seu repositório local ao GitHub:**
    *   Na página do seu novo repositório no GitHub, copie a URL do repositório remoto. Ela será algo como `https://github.com/seu-usuario/flashdelivery-central.git`.
    *   No seu terminal, execute o seguinte comando, substituindo a URL pela sua:
        ```bash
        git remote add origin https://github.com/seu-usuario/flashdelivery-central.git
        ```

3.  **Verifique o nome da sua branch principal:**
    *   Execute `git branch`. A branch com um `*` na frente é a sua branch atual (geralmente `main` ou `master`).

4.  **Envie seu código para o GitHub:**
    *   Execute o comando abaixo, substituindo `main` pelo nome da sua branch principal, se for diferente:
        ```bash
        git push -u origin main
        ```

## 4. Publicando na Vercel

A Vercel oferece uma integração contínua com o GitHub, o que torna a publicação muito simples.

1.  **Crie uma conta na Vercel:**
    *   Acesse [vercel.com](https://vercel.com) e crie uma conta gratuita, você pode usar sua conta do GitHub para se inscrever.

2.  **Importe seu projeto do GitHub:**
    *   No seu dashboard da Vercel, clique em "Add New..." -> "Project".
    *   Na seção "Import Git Repository", selecione o repositório do GitHub que você acabou de criar.
    *   A Vercel irá detectar automaticamente que é um projeto Vite. As configurações padrão de build (`npm run build` ou `vite build`) e o diretório de saída (`dist`) devem funcionar sem alterações.

3.  **Configure as Variáveis de Ambiente (se necessário):**
    *   Se o seu projeto precisar de chaves de API ou outras variáveis de ambiente (como as do Firebase), você pode adicioná-las em "Settings" -> "Environment Variables" no painel do seu projeto na Vercel.

4.  **Faça o Deploy:**
    *   Clique no botão "Deploy". A Vercel irá construir e publicar seu aplicativo.
    *   Após a conclusão, você receberá uma URL pública para acessar seu aplicativo.
