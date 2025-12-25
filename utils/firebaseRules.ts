/**
 * Firebase Security Rules Generator
 * Copie estas regras para seu Firestore no Console do Firebase
 * 
 * Menu: Firestore Database > Rules
 * Cole o conteúdo abaixo
 */

const firebaseSecurityRules = `
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Funcao para validar autenticacao
    function isSignedIn() {
      return request.auth != null;
    }
    
    // Funcao para verificar se é admin
    function isAdmin() {
      return isSignedIn() && 
             get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'ADMIN';
    }
    
    // Funcao para verificar propriedade
    function isOwner(userId) {
      return isSignedIn() && request.auth.uid == userId;
    }
    
    // Users collection
    match /users/{userId} {
      // Ler: apenas o próprio usuário ou admin
      allow read: if isOwner(userId) || isAdmin();
      
      // Criar: qualquer um autenticado
      allow create: if isSignedIn() && request.resource.data.role in ['CLIENT', 'DRIVER'];
      
      // Atualizar: próprio usuário ou admin
      allow update: if isOwner(userId) || isAdmin();
      
      // Deletar: apenas admin
      allow delete: if isAdmin();
    }
    
    // Orders collection
    match /orders/{orderId} {
      // Ler: criador, driver atribuído, ou admin
      allow read: if isSignedIn() && 
                     (request.auth.uid == resource.data.clientId || 
                      request.auth.uid == resource.data.driverId || 
                      isAdmin());
      
      // Criar: clientes autenticados
      allow create: if isSignedIn() && request.resource.data.clientId == request.auth.uid;
      
      // Atualizar: cliente (apenas status), driver, ou admin
      allow update: if isSignedIn() && 
                       (request.auth.uid == resource.data.clientId ||
                        request.auth.uid == resource.data.driverId ||
                        isAdmin());
      
      // Deletar: apenas admin
      allow delete: if isAdmin();
      
      // Validate data structure
      allow write: if request.resource.data.keys().hasAll(['clientId', 'status', 'createdAt']);
    }
    
    // Messages collection
    match /messages/{messageId} {
      // Ler: participantes da conversa
      allow read: if isSignedIn() && 
                     (request.auth.uid in resource.data.participants);
      
      // Criar: qualquer autenticado
      allow create: if isSignedIn() && 
                       request.resource.data.senderId == request.auth.uid &&
                       request.auth.uid in request.resource.data.participants;
      
      // Deletar: apenas o criador da mensagem
      allow delete: if isSignedIn() && request.auth.uid == resource.data.senderId;
    }
    
    // Notifications collection
    match /notifications/{notificationId} {
      // Ler: apenas o destinatário
      allow read: if isSignedIn() && request.auth.uid == resource.data.userId;
      
      // Criar: sistema/admin
      allow create: if isAdmin();
      
      // Deletar: o destinatário
      allow delete: if isSignedIn() && request.auth.uid == resource.data.userId;
    }
    
    // Ratings collection
    match /ratings/{ratingId} {
      // Ler: público
      allow read: if true;
      
      // Criar: clientes autenticados após entrega
      allow create: if isSignedIn() && 
                       request.resource.data.userId == request.auth.uid &&
                       request.resource.data.rating >= 1 &&
                       request.resource.data.rating <= 5;
      
      // Deletar: apenas admin
      allow delete: if isAdmin();
    }
  }
}
`;

export default firebaseSecurityRules;
