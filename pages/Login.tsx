
import React, { useState } from 'react';
import { UserRole } from '../types';
import { db } from '../services/mockDb';
import { Lock, User, Loader2, Bike } from 'lucide-react';

interface LoginProps {
  onLogin: (role: UserRole) => void;
}

export const Login: React.FC<LoginProps> = ({ onLogin }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const user = await db.login(username, password);
      onLogin(user.role);
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Usuário ou senha incorretos.');
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center relative overflow-hidden bg-[#AEE2FF]">
      
      {/* Background Decor */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-10 left-10 text-white opacity-80 animate-pulse delay-700">
           <CloudShape size={80} />
        </div>
        <div className="absolute top-20 right-20 text-white opacity-90 animate-pulse">
           <CloudShape size={100} />
        </div>
        <div className="absolute bottom-0 left-0 right-0 h-48 sm:h-64 flex items-end justify-center z-0 opacity-50 sm:opacity-100">
             <div className="w-16 h-24 bg-[#5D9CEC] mx-1 border-2 border-black rounded-t-lg"></div>
             <div className="w-24 h-40 bg-[#FFCE54] mx-1 border-2 border-black rounded-t-lg"></div>
             <div className="w-20 h-32 bg-[#48CFAD] mx-1 border-2 border-black rounded-t-lg"></div>
             <div className="w-28 h-56 bg-[#FC6E51] mx-1 border-2 border-black rounded-t-lg relative">
                 <div className="absolute top-4 left-4 w-4 h-4 bg-white border border-black"></div>
                 <div className="absolute top-4 right-4 w-4 h-4 bg-white border border-black"></div>
                 <div className="absolute top-12 left-4 w-4 h-4 bg-white border border-black"></div>
                 <div className="absolute top-12 right-4 w-4 h-4 bg-white border border-black"></div>
             </div>
             <div className="w-20 h-28 bg-[#AC92EC] mx-1 border-2 border-black rounded-t-lg"></div>
        </div>
        <div className="absolute bottom-0 left-0 right-0 h-4 bg-[#656D78] border-t-4 border-black z-10"></div>
      </div>

      {/* Main Content */}
      <div className="relative z-20 flex flex-col items-center w-full max-w-lg px-4">
        
        {/* Logo Section (central title replaced by logo) */}
        <div className="mb-8 flex items-center justify-center">
            <img src="/flashdelivery.png" alt="Flash Delivery logo" className="w-40 h-40 sm:w-56 sm:h-56 object-contain" />
        </div>

        {/* Login Card */}
        <div className="w-full bg-white rounded-[2rem] border-4 border-black shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] pt-12 pb-8 px-8 relative">
            
            {/* Banner Header */}
            <div className="absolute -top-6 left-1/2 -translate-x-1/2 bg-[#F6BB42] border-4 border-black px-6 py-2 rounded-xl shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] whitespace-nowrap z-30 transform rotate-1">
                <span className="font-['Titan_One'] text-black text-sm sm:text-lg uppercase tracking-wide">Acesso ao Sistema</span>
            </div>

            <form onSubmit={handleLogin} className="space-y-5">
              
              <div>
                <label className="font-bold text-gray-700 ml-4 mb-1 block uppercase text-xs tracking-wider">Usuário</label>
                <div className="relative group">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-gray-500 group-focus-within:text-black transition-colors">
                    <User size={24} strokeWidth={2.5} />
                  </div>
                  <input
                    type="text"
                    required
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className="block w-full pl-12 pr-4 py-4 bg-gray-50 border-4 border-gray-200 rounded-full text-gray-900 font-bold focus:bg-white focus:border-black focus:ring-0 outline-none transition-all placeholder-gray-400"
                    placeholder="Seu login"
                  />
                </div>
              </div>

              <div>
                <label className="font-bold text-gray-700 ml-4 mb-1 block uppercase text-xs tracking-wider">Senha</label>
                <div className="relative group">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-gray-500 group-focus-within:text-black transition-colors">
                    <Lock size={24} strokeWidth={2.5} />
                  </div>
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="block w-full pl-12 pr-4 py-4 bg-gray-50 border-4 border-gray-200 rounded-full text-gray-900 font-bold focus:bg-white focus:border-black focus:ring-0 outline-none transition-all placeholder-gray-400"
                    placeholder="••••••"
                  />
                </div>
              </div>

              {error && (
                <div className="bg-red-100 border-2 border-red-500 text-red-700 p-3 rounded-xl text-center font-bold text-sm">
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-[#FFCE54] hover:bg-[#F6BB42] text-black border-4 border-black rounded-full py-4 text-xl font-['Titan_One'] uppercase tracking-widest shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:translate-y-1 hover:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] active:translate-y-2 active:shadow-none transition-all flex items-center justify-center gap-3"
              >
                {loading ? <Loader2 className="animate-spin w-8 h-8" /> : (
                    <>
                        Entrar <Bike className="w-8 h-8 stroke-[2.5px]" />
                    </>
                )}
              </button>
            </form>
        </div>
      </div>
    </div>
  );
};

const CloudShape = ({ size }: { size: number }) => (
  <svg 
    width={size} 
    height={size * 0.6} 
    viewBox="0 0 24 24" 
    fill="currentColor" 
    xmlns="http://www.w3.org/2000/svg"
  >
    <path d="M17.5 19C19.9853 19 22 16.9853 22 14.5C22 12.132 20.177 10.244 17.819 10.034C17.657 6.618 14.826 4 11.5 4C8.48 4 5.856 6.167 5.257 9.12C2.553 9.751 0.5 12.164 0.5 15C0.5 18.314 3.186 21 6.5 21H17.5V19Z" />
  </svg>
);
