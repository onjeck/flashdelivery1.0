
# ⚡ FlashDelivery Central

O **FlashDelivery** é uma solução completa de PWA (Progressive Web App) para gerenciamento de centrais de entregas e motoboys. O sistema oferece uma interface responsiva e moderna, com foco em usabilidade (Neubrutalismo/Cartoon) e rastreamento em tempo real.

## 🚀 Funcionalidades Principais

### 🏢 Painel Administrativo (Central)
- **Gestão de Pedidos:** Visualização de chamados pendentes, definição de preços e despacho para motoboys específicos.
- **Gestão de Usuários:** Cadastro e edição de Clientes e Entregadores.
- **Controle Financeiro:** Relatório de faturamento por motoboy e total da central.
- **Configuração de Regiões:** Definição de taxas de entrega por zona geográfica.
- **Customização de Temas:** Alternância entre temas *Cartoon*, *Corporativo* e *Dark*.

### 🏬 Painel do Cliente (Lojista)
- **Solicitação de Entrega:** Formulário simplificado para novos chamados.
- **Rastreamento ao Vivo:** Mapa com a posição em tempo real do motoboy e status da entrega.
- **Chat Integrado:** Comunicação direta com a central e o entregador.
- **Histórico e Avaliação:** Feedback sobre a qualidade do serviço prestado.

### 🏍️ Painel do Entregador (Motoboy)
- **Turno Online/Offline:** Controle de disponibilidade.
- **Otimização de Rota:** Algoritmo *Nearest Neighbor* que organiza múltiplas paradas para menor tempo de trajeto.
- **GPS em Tempo Real:** Monitoramento contínuo da posição via Geolocation API, sincronizando com a central e o cliente.
- **Sistema de Níveis e Pontos:** Gamificação baseada no desempenho e número de entregas.

## 🛠️ Stack Tecnológica

- **Frontend:** React 19 (ESM) + TypeScript.
- **Estilização:** Tailwind CSS (Design Neubrutalista).
- **Backend/Banco de Dados:** Firebase (Firestore + Authentication).
- **Mapas:** Leaflet.js + OpenStreetMap (Sem necessidade de chaves pagas do Google Maps).
- **Comunicação:** Sistema de eventos simulado (SocketService) para feedback instantâneo.
- **Ícones:** Lucide-React.

## ⚙️ Configuração do Ambiente

### 1. Firebase (Obrigatório para Modo Real)
O projeto está configurado para usar o **Firebase**. No arquivo `services/firebaseConfig.ts`, você deve inserir as credenciais do seu projeto criado no [Firebase Console](https://console.firebase.google.com/).

**Regras de Segurança do Firestore:**
Para desenvolvimento, certifique-se de que as regras permitem leitura e escrita:
```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /{document=**} {
      allow read, write: if true;
    }
  }
}
```

### 2. Autenticação
Ative o provedor **E-mail/Senha** na aba *Authentication* do Firebase.

## 📍 Sistema de GPS
O módulo do motoboy utiliza a API `navigator.geolocation.watchPosition`. Para que funcione corretamente:
- O dispositivo deve conceder permissão de localização.
- Em dispositivos móveis, o PWA deve estar em primeiro plano ou configurado como App instalado para melhor precisão.
- A posição é sincronizada com o Firestore a cada 10 segundos quando o motoboy está em movimento.

## 📱 PWA
O app é instalável em Android e iOS.
- **Android:** Chrome > Adicionar à tela inicial.
- **iOS:** Safari > Compartilhar > Adicionar à tela de início.

---
Desenvolvido com foco em alta performance e estética "Cartoon" para centrais de entrega modernas.
