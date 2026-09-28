import { useState, type FormEvent } from 'react';
import { AlertCircle, Lock } from 'lucide-react';
import PillButton from '@/components/ui/PillButton';
import Spinner from '@/components/ui/Spinner';
import { Logo } from '@/components/Hero';
import { api } from '@/api';

export default function LoginScreen({ onSuccess }: { onSuccess: () => void }) {
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (!password) return;
    setSubmitting(true);
    setError(null);
    try {
      await api.login(password);
      onSuccess();
    } catch (err) {
      setError((err as Error).message);
      setPassword('');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <main className="on-ink bg-ink text-bg min-h-screen flex flex-col">
      <div className="max-w-[1240px] w-full mx-auto px-5 sm:px-10 py-6">
        <Logo className="text-[34px]" />
      </div>
      <div className="flex-1 flex items-center">
        <div className="max-w-[1240px] w-full mx-auto px-5 sm:px-10 pb-24 grid gap-12 lg:grid-cols-[1.3fr_1fr] items-end">
          <h1 className="display text-[56px] sm:text-[88px]">
            Seus gastos, <span className="keyword">só seus</span>.
          </h1>
          <form onSubmit={submit} className="max-w-md w-full">
            <label htmlFor="password" className="block text-sm text-on-ink-muted mb-3">Senha de acesso</label>
            <div className="relative">
              <Lock className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-on-ink-muted pointer-events-none" />
              <input
                id="password"
                type="password"
                autoComplete="current-password"
                autoFocus
                value={password}
                onChange={e => setPassword(e.target.value)}
                className="w-full rounded-full bg-transparent border border-on-ink-hairline pl-11 pr-5 py-3.5 text-bg placeholder:text-on-ink-muted outline-none focus:border-accent-light"
                placeholder="Digite a senha"
              />
            </div>
            {error && (
              <p className="mt-3 flex items-center gap-2 text-sm text-[#F0A08C]" role="alert">
                <AlertCircle className="h-4 w-4" /> {error}
              </p>
            )}
            <PillButton type="submit" tone="light" className="mt-5" disabled={!password || submitting} icon={submitting ? <Spinner size="sm" /> : undefined}>
              Entrar
            </PillButton>
          </form>
        </div>
      </div>
    </main>
  );
}
