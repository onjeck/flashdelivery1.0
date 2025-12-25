
import React, { useState } from 'react';
import { auth, db } from '../services/firebaseConfig';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { doc, setDoc } from 'firebase/firestore';
import { UserRole, User, DriverLevel } from '../types';
import { Database, Check, AlertTriangle, Loader2, Play, ShieldAlert } from 'lucide-react';

export const DbSeeder: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState<'idle' | 'confirm' | 'processing' | 'success' | 'error'>('idle');
  const [logs, setLogs] = useState<string[]>([]);
  const [errorType, setErrorType] = useState<string | null>(null);

  const addLog = (text: string) => setLogs(prev => [...prev, text]);

  const handleStart = () => {
    setStep('confirm');
    setErrorType(null);
  };

  const executeSeed = async () => {
    setStep('processing');
    setLoading(true);
    setLogs([]);
    setErrorType(null);
    addLog('Iniciando conexão com Firebase...');

    try {
      if (!auth) throw new Error('Firebase Auth não inicializado. Verifique firebaseConfig.ts');
      
      // 1. ADMIN
      addLog('Criando Admin...');
      await createUser('admin', 'admin123', {
        name: 'Central Admin',
        role: UserRole.ADMIN,
        preferences: { criticalAlerts: true, newOrders: true, statusUpdates: true, marketing: false }
      });
      addLog('✅ Admin criado.');

      // 2. MOTOBOY
      addLog('Criando Motoboy...');
      await createUser('moto', '123456', {
        name: 'Carlos Motoboy',
        role: UserRole.DRIVER,
        phone: '11999999999',
        isOnline: true,
        location: { lat: -23.5615, lng: -46.6559 },
        vehicle: { plate: 'ABC-1234', model: 'Honda CG 160' },
        stats: {
          totalDeliveries: 142,
          averageRating: 4.8,
          punctualityScore: 98,
          level: 'OURO' as DriverLevel,
          points: 2450,
          badges: ['Velocista']
        },
        preferences: { criticalAlerts: true, newOrders: true, statusUpdates: true, marketing: false }
      });
      addLog('✅ Motoboy criado.');

      // 3. CLIENTE
      addLog('Criando Cliente...');
      await createUser('loja', '123456', {
        name: 'Loja Exemplo',
        role: UserRole.CLIENT,
        phone: '1188888888',
        address: 'Av. Paulista, 1000, São Paulo',
        fixedDeliveryPrice: 10.00,
        preferences: { criticalAlerts: true, newOrders: true, statusUpdates: true, marketing: false }
      });
      addLog('✅ Cliente criado.');

      // 4. REGIAO
      addLog('Criando Regiões...');
      const regionData = { name: 'Centro Expandido', price: 8.00 };
      await setDoc(doc(db, 'regions', 'r1'), regionData);
      addLog('✅ Regiões criadas.');

      setStep('success');
    } catch (error: any) {
      console.error(error);
      setStep('error');
      
      let errorMsg = error.message;
      if (error.code === 'auth/operation-not-allowed') {
        errorMsg = 'Erro: Provedor de Email/Senha não ativado no Console do Firebase.';
        setErrorType('auth');
      } else if (error.code === 'permission-denied') {
        errorMsg = 'Erro: Permissão negada. Verifique as Regras do Firestore.';
        setErrorType('permission');
      } else if (error.code === 'auth/api-key-not-valid.-please-pass-a-valid-api-key.') {
        errorMsg = 'Erro: API Key inválida no arquivo firebaseConfig.ts';
      } else if (error.code === 'auth/email-already-in-use') {
         errorMsg = 'Erro: Usuários já existem no Authentication.';
      }
      
      addLog(`❌ FALHA: ${errorMsg}`);
    } finally {
      setLoading(false);
    }
  };

  const createUser = async (username: string, password: string, userData: Partial<User>) => {
    const email = `${username}@flashdelivery.app`;
    let uid = '';

    try {
      const cred = await createUserWithEmailAndPassword(auth, email, password);
      uid = cred.user.uid;
    } catch (e: any) {
      if (e.code === 'auth/email-already-in-use') {
        addLog(`⚠️ Usuário ${username} já existe (Auth).`);
        throw new Error(`O email ${email} já existe no Authentication. Para recriar, delete os usuários no Console do Firebase.`);
      } else {
        throw e;
      }
    }

    if (uid) {
      const fullUser: User = {
        id: uid,
        username,
        ...userData
      } as User;
      await setDoc(doc(db, 'users', uid), fullUser);
    }
  };

  if (step === 'success') {
    return (
      <div className="mt-4 p-4 bg-green-50 border border-green-200 text-green-800 rounded-lg text-sm">
        <h4 className="font-bold flex items-center gap-2 mb-2"><Check size={18}/> Sucesso!</h4>
        <p>Usuários criados. Use:</p>
        <ul className="list-disc ml-5 mt-1 space-y-1">
           <li><strong>admin</strong> / <strong>admin123</strong></li>
           <li><strong>loja</strong> / <strong>123456</strong></li>
           <li><strong>moto</strong> / <strong>123456</strong></li>
        </ul>
        <button type="button" onClick={() => setStep('idle')} className="mt-2 text-xs text-green-700 underline">Fechar</button>
      </div>
    );
  }

  return (
    <div className="mt-8 pt-6 border-t border-gray-200 w-full">
      <div className="bg-orange-50 p-4 rounded-lg border border-orange-100">
        <h4 className="text-sm font-bold text-orange-800 flex items-center gap-2 mb-2">
          <Database size={14} /> Configuração Inicial (Firebase)
        </h4>
        
        {step === 'idle' && (
           <>
            <p className="text-xs text-orange-700 mb-3">
              Seu banco de dados parece vazio? Clique abaixo para criar os usuários padrão.
            </p>
            <button 
              type="button"
              onClick={handleStart} 
              className="w-full bg-orange-200 hover:bg-orange-300 text-orange-900 text-xs font-bold py-2 rounded transition-colors flex justify-center items-center gap-2"
            >
              <Play size={14} /> Popular Banco de Dados
            </button>
           </>
        )}

        {step === 'confirm' && (
           <div className="animate-in fade-in">
             <p className="text-xs text-orange-800 font-bold mb-2">
               Certifique-se de que o provedor <b>Email/Password</b> está ATIVADO no Firebase Console -> Authentication.
             </p>
             <div className="flex gap-2">
               <button 
                type="button"
                onClick={() => setStep('idle')}
                className="flex-1 bg-gray-200 hover:bg-gray-300 text-gray-700 text-xs font-bold py-2 rounded"
               >
                 Cancelar
               </button>
               <button 
                type="button"
                onClick={executeSeed}
                className="flex-1 bg-orange-600 hover:bg-orange-700 text-white text-xs font-bold py-2 rounded"
               >
                 Confirmar Criação
               </button>
             </div>
           </div>
        )}

        {(step === 'processing' || step === 'error') && (
          <div className="mt-2 space-y-2">
            <div className="bg-white p-2 rounded border border-gray-200 h-32 overflow-y-auto text-xs font-mono shadow-inner">
              {logs.map((log, i) => (
                <div key={i} className={`mb-1 ${log.includes('❌') ? 'text-red-600 font-bold' : 'text-gray-600'}`}>
                  {log}
                </div>
              ))}
              {loading && <div className="flex items-center gap-2 text-blue-600 mt-2"><Loader2 size={12} className="animate-spin"/> Processando...</div>}
            </div>

            {/* Help Box for Permission Errors */}
            {step === 'error' && errorType === 'permission' && (
              <div className="bg-red-50 border border-red-200 rounded p-3 text-xs text-red-900 animate-in slide-in-from-top-2">
                 <h5 className="font-bold flex items-center gap-2 mb-2"><ShieldAlert size={14}/> Ação Necessária no Firebase Console</h5>
                 <p className="mb-2">Vá em <strong>Firestore Database &gt; Rules</strong> e cole este código:</p>
                 <pre className="bg-gray-800 text-gray-200 p-2 rounded overflow-x-auto font-mono mb-2 border border-gray-700">
{`rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /{document=**} {
      allow read, write: if true;
    }
  }
}`}
                 </pre>
                 <p>Clique em <strong>Publish</strong> e tente novamente.</p>
              </div>
            )}

            {step === 'error' && (
               <button type="button" onClick={() => setStep('idle')} className="w-full py-2 bg-red-100 hover:bg-red-200 text-red-800 font-bold rounded text-xs transition-colors">Tentar Novamente</button>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
