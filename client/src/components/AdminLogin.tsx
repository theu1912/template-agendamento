import { useState } from 'react';
import { trpc } from '@/lib/trpc'; 
import { siteConfig } from '@/config/site';

export function AdminLogin({ onLoginSuccess }: { onLoginSuccess: () => void }) {
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const loginMutation = trpc.auth.login.useMutation({
    onSuccess: () => {
      localStorage.setItem('barbarov_token', 'acesso_libertado');
      onLoginSuccess();
    },
    onError: (err) => {
      setError('Senha incorreta: ' + err.message);
    }
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    loginMutation.mutate({ password });
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-zinc-50">
      <div className="w-full max-w-md p-8 space-y-6 bg-white border border-zinc-200 rounded-xl shadow-xl">
        <div className="text-center">
          <h2 className="text-3xl font-black text-[#800020] tracking-wider">{siteConfig.nomeBarbeariaCurto.toUpperCase()}</h2>
          <p className="text-zinc-500 text-sm mt-1 uppercase tracking-widest font-bold">Acesso Restrito</p>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4 mt-8">
          <div>
            <input
              type="password"
              placeholder="Digite a senha master..."
              className="w-full px-4 py-3 bg-white border-2 border-zinc-300 rounded-lg text-zinc-900 focus:outline-none focus:border-[#800020] transition-colors text-center font-semibold"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>
          {error && <p className="text-[#800020] text-sm text-center font-bold">{error}</p>}
          <button
            type="submit"
            disabled={loginMutation.isPending}
            className="w-full py-3 font-black text-white bg-[#800020] rounded-lg hover:bg-[#5a0016] transition-all disabled:opacity-50 uppercase tracking-widest mt-2 shadow-md"
          >
            {loginMutation.isPending ? 'A verificar...' : 'Entrar no Painel'}
          </button>
        </form>
      </div>
    </div>
  );
}