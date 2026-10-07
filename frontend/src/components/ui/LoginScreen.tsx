import { useState, type FormEvent } from 'react';
import { User, Lock, Eye, EyeOff } from 'lucide-react';
import PillButton from './PillButton';
import Spinner from './Spinner';
import TextInput from './TextInput';
import { Logo } from '@/components/v2/Hero';
import { api } from '@/api';

export default function LoginScreen({ onSuccess }: { onSuccess: () => void }) {
  const [isRegister, setIsRegister] = useState(false);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (!username || !password) return;
    if (isRegister && password !== confirmPassword) {
      setError('As senhas não conferem.');
      return;
    }
    if (isRegister && password.length < 8) {
      setError('A senha deve ter no mínimo 8 caracteres.');
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      if (isRegister) {
        await api.register(username, password);
      } else {
        await api.login(username, password);
      }
      onSuccess();
    } catch (err) {
      setError((err as Error).message);
      setPassword('');
      setConfirmPassword('');
    } finally {
      setSubmitting(false);
    }
  };

  const toggleMode = () => {
    setIsRegister(prev => !prev);
    setError(null);
    setUsername('');
    setPassword('');
    setConfirmPassword('');
  };

  return (
    <main className="bg-surface text-text min-h-screen flex flex-col">
      <div className="max-w-[1240px] w-full mx-auto px-5 sm:px-10 py-6">
        <Logo className="text-[34px]" />
      </div>
      <div className="flex-1 flex items-center">
        <div className="max-w-[1240px] w-full mx-auto px-5 sm:px-10 pb-24 grid gap-12 lg:grid-cols-[1.3fr_1fr] items-end">
          <h1 className="display text-[56px] sm:text-[88px]">
            Envie o extrato. O Freyr <span className="keyword">organiza o resto</span>.
          </h1>
          <form onSubmit={submit} className="max-w-md w-full">
            <div className="flex gap-2 mb-6">
              <button
                type="button"
                onClick={toggleMode}
                className={`flex-1 px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                  !isRegister ? 'bg-brand-primary text-surface' : 'bg-transparent text-ink-muted hover:bg-surface-wash'
                }`}
              >
                Entrar
              </button>
              <button
                type="button"
                onClick={toggleMode}
                className={`flex-1 px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                  isRegister ? 'bg-brand-primary text-surface' : 'bg-transparent text-ink-muted hover:bg-surface-wash'
                }`}
              >
                Cadastrar
              </button>
            </div>

            <TextInput
              id="username"
              label="Nome de usuário"
              placeholder={isRegister ? 'Escolha um nome de usuário' : 'Seu nome de usuário'}
              value={username}
              onChange={e => setUsername(e.target.value)}
              required
              disabled={submitting}
              autoComplete="username"
              autoFocus
              leftIcon={<User className="h-4 w-4 text-ink-muted pointer-events-none" />}
            />

            <div className="mt-4 relative">
              <label htmlFor="password" className="field-label">
                {isRegister ? 'Criar senha' : 'Senha de acesso'}
              </label>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-ink-muted pointer-events-none" />
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete={isRegister ? 'new-password' : 'current-password'}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  className="input w-full pl-11 pr-14 py-3.5"
                  placeholder={isRegister ? 'Mínimo 8 caracteres' : 'Digite a senha'}
                  required
                  disabled={submitting}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-ink-muted hover:text-text transition-colors"
                  aria-label={showPassword ? 'Ocultar senha' : 'Mostrar senha'}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            {isRegister && (
              <div className="mt-4">
                <TextInput
                  id="confirmPassword"
                  label="Confirmar senha"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Confirme a senha"
                  value={confirmPassword}
                  onChange={e => setConfirmPassword(e.target.value)}
                  required
                  disabled={submitting}
                  autoComplete="new-password"
                  leftIcon={<Lock className="h-4 w-4 text-ink-muted pointer-events-none" />}
                />
              </div>
            )}

            {error && (
              <p className="mt-4 flex items-center gap-2 text-sm text-alert" role="alert">
                <span className="flex-shrink-0">!</span> {error}
              </p>
            )}

            <PillButton type="submit" tone="light" disabled={!username || !password || (isRegister && !confirmPassword) || submitting} icon={submitting ? <Spinner size="sm" /> : undefined}>
              {isRegister ? 'Criar conta' : 'Entrar'}
            </PillButton>
          </form>
        </div>
      </div>
    </main>
  );
}