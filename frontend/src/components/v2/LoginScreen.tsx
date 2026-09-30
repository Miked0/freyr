import React, { useState, type FormEvent } from 'react';
import { AlertCircle, Lock, User, Eye, EyeOff, X } from 'lucide-react';
import PillButton from '@/components/ui/PillButton';
import Spinner from '@/components/ui/Spinner';
import Button from '@/components/ui/Button';
import { Logo } from '@/components/Hero';
import { api } from '@/api';

interface TextInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string;
  icon?: React.ReactNode;
  error?: string;
}

const TextInput = React.forwardRef<HTMLInputElement, TextInputProps>(({ label, icon, error, className = '', id, ...props }, ref) => {
  const inputId = id || label.toLowerCase().replace(/\s+/g, '-');
  return (
    <div className="mb-4">
      <label htmlFor={inputId} className="block text-sm text-on-ink-muted mb-2">
        {label}
      </label>
      <div className="relative">
        {icon && <span className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-on-ink-muted pointer-events-none">{icon}</span>}
        <input
          ref={ref}
          id={inputId}
          className={`w-full rounded-full bg-transparent border pl-11 pr-5 py-3.5 text-bg placeholder:text-on-ink-muted outline-none focus:border-accent-light transition-colors ${
            error ? 'border-danger focus:border-danger focus:ring-2 focus:ring-danger-soft' : 'border-on-ink-hairline hover:border-on-ink-muted/50'
          } ${className}`}
          {...props}
        />
      </div>
      {error && <p className="mt-1.5 text-sm text-danger flex items-center gap-1.5" role="alert"><AlertCircle className="h-3.5 w-3.5" /> {error}</p>}
    </div>
  );
});

TextInput.displayName = 'TextInput';

interface AlertProps {
  children: React.ReactNode;
  variant?: 'error' | 'success' | 'warning' | 'info';
  onClose?: () => void;
}

function Alert({ children, variant = 'error', onClose }: AlertProps) {
  const styles = {
    error: 'bg-danger-soft text-danger',
    success: 'bg-success-soft text-success',
    warning: 'bg-warm-soft text-warm',
    info: 'bg-accent-soft text-accent',
  };
  return (
    <div className={`mb-4 p-3 flex items-center gap-3 rounded-xl ${styles[variant]}`} role="alert">
      <AlertCircle className="h-4 w-4 flex-shrink-0" />
      <p className="text-sm font-medium flex-1">{children}</p>
      {onClose && <button onClick={onClose} className="cursor-pointer hover:opacity-70" aria-label="Fechar aviso"><X className="h-4 w-4" /></button>}
    </div>
  );
}

export default function LoginScreenV2({ onSuccess }: { onSuccess: () => void }) {
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
            <div className="flex gap-2 mb-6">
              <button
                type="button"
                onClick={toggleMode}
                className={`flex-1 px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                  !isRegister ? 'bg-accent-light text-ink' : 'bg-transparent text-on-ink-muted hover:bg-on-ink-hairline'
                }`}
              >
                Entrar
              </button>
              <button
                type="button"
                onClick={toggleMode}
                className={`flex-1 px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                  isRegister ? 'bg-accent-light text-ink' : 'bg-transparent text-on-ink-muted hover:bg-on-ink-hairline'
                }`}
              >
                Cadastrar
              </button>
            </div>

            <TextInput
              label="Nome de usuário"
              icon={<User className="h-4 w-4" />}
              type="text"
              autoComplete="username"
              autoFocus
              value={username}
              onChange={e => setUsername(e.target.value)}
              placeholder={isRegister ? 'Escolha um nome de usuário' : 'Seu nome de usuário'}
              required
              disabled={submitting}
            />

            <div className="mb-4">
              <label htmlFor="password" className="block text-sm text-on-ink-muted mb-2">
                {isRegister ? 'Criar senha' : 'Senha de acesso'}
              </label>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-on-ink-muted pointer-events-none" />
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete={isRegister ? 'new-password' : 'current-password'}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  className="w-full rounded-full bg-transparent border border-on-ink-hairline pl-11 pr-14 py-3.5 text-bg placeholder:text-on-ink-muted outline-none focus:border-accent-light"
                  placeholder={isRegister ? 'Mínimo 8 caracteres' : 'Digite a senha'}
                  required
                  disabled={submitting}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-on-ink-muted hover:text-bg transition-colors"
                  aria-label={showPassword ? 'Ocultar senha' : 'Mostrar senha'}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            {isRegister && (
              <TextInput
                label="Confirmar senha"
                icon={<Lock className="h-4 w-4" />}
                type={showPassword ? 'text' : 'password'}
                autoComplete="new-password"
                value={confirmPassword}
                onChange={e => setConfirmPassword(e.target.value)}
                placeholder="Confirme a senha"
                required
                disabled={submitting}
              />
            )}

            {error && <Alert>{error}</Alert>}

            <PillButton type="submit" tone="light" disabled={!username || !password || (isRegister && !confirmPassword) || submitting} icon={submitting ? <Spinner size="sm" /> : undefined}>
              {isRegister ? 'Criar conta' : 'Entrar'}
            </PillButton>
          </form>
        </div>
      </div>
    </main>
  );
}