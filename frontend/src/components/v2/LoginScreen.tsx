import React, { useState, type FormEvent } from 'react';
import { AlertCircle, Lock, User, Eye, EyeOff, X } from 'lucide-react';
import PillButton from '@/components/ui/PillButton';
import Spinner from '@/components/ui/Spinner';
import { Logo } from '@/components/Hero';
import { api } from '@/api';
import { takeSearchParam, useGoogleLogin } from '@/lib/useGoogleLogin';
import { legalHref } from '@/legal/content';

interface TextInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string;
  icon?: React.ReactNode;
  error?: string;
}

const TextInput = React.forwardRef<HTMLInputElement, TextInputProps>(({ label, icon, error, className = '', id, ...props }, ref) => {
  const inputId = id || label.toLowerCase().replace(/\s+/g, '-');
  return (
    <div className="mb-4">
      <label htmlFor={inputId} className="block text-sm text-on-text-muted mb-2">
        {label}
      </label>
      <div className="relative">
        {icon && <span className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-on-text-muted pointer-events-none">{icon}</span>}
        <input
          ref={ref}
          id={inputId}
          className={`w-full rounded-full bg-transparent border pl-11 pr-5 py-3.5 text-surface placeholder:text-on-text-muted focus:border-brand-primary-light transition-colors ${
            error ? 'border-on-text-alert' : 'border-on-text-control hover:border-on-text-muted'
          } ${className}`}
          {...props}
        />
      </div>
      {error && <p className="mt-1.5 text-sm text-on-text-alert flex items-center gap-1.5" role="alert"><AlertCircle className="h-3.5 w-3.5" /> {error}</p>}
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
    error: 'bg-alert-soft text-on-text-alert',
    success: 'bg-positive-soft text-surface',
    warning: 'bg-brand-warm-soft text-surface',
    info: 'bg-brand-primary-soft text-brand-primary-light',
  };
  return (
    <div className={`mb-4 p-3 flex items-center gap-3 rounded-xl ${styles[variant]}`} role="alert">
      <AlertCircle className="h-4 w-4 flex-shrink-0" />
      <p className="text-sm font-medium flex-1">{children}</p>
      {onClose && <button type="button" onClick={onClose} className="cursor-pointer hover:opacity-70" aria-label="Fechar aviso"><X className="h-4 w-4" /></button>}
    </div>
  );
}

/** Google's "G", as its sign-in branding guidelines ask for next to the label. */
function GoogleMark() {
  return (
    <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden="true">
      <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" />
      <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" />
      <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z" />
      <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" />
    </svg>
  );
}

export default function LoginScreenV2({ onSuccess }: { onSuccess: () => void }) {
  const [isRegister, setIsRegister] = useState(false);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(() =>
    takeSearchParam('login') === 'google-erro' ? 'Não foi possível entrar com o Google. Tente de novo.' : null
  );
  const googleLogin = useGoogleLogin();
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

  const selectMode = (register: boolean) => {
    if (register === isRegister) return;
    setIsRegister(register);
    setError(null);
    setUsername('');
    setPassword('');
    setConfirmPassword('');
  };

  return (
    <main className="on-text bg-text text-surface min-h-screen flex flex-col">
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
                onClick={() => selectMode(false)}
                aria-pressed={!isRegister}
                className={`flex-1 px-4 py-2.5 rounded-full text-sm font-medium transition-colors ${
                  !isRegister ? 'bg-brand-primary-light text-text' : 'bg-transparent text-on-text-muted hover:bg-on-text-line'
                }`}
              >
                Entrar
              </button>
              <button
                type="button"
                onClick={() => selectMode(true)}
                aria-pressed={isRegister}
                className={`flex-1 px-4 py-2.5 rounded-full text-sm font-medium transition-colors ${
                  isRegister ? 'bg-brand-primary-light text-text' : 'bg-transparent text-on-text-muted hover:bg-on-text-line'
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
              <label htmlFor="password" className="block text-sm text-on-text-muted mb-2">
                {isRegister ? 'Criar senha' : 'Senha de acesso'}
              </label>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-on-text-muted pointer-events-none" />
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete={isRegister ? 'new-password' : 'current-password'}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  className="w-full rounded-full bg-transparent border border-on-text-control hover:border-on-text-muted pl-11 pr-14 py-3.5 text-surface placeholder:text-on-text-muted focus:border-brand-primary-light transition-colors"
                  placeholder={isRegister ? 'Mínimo 8 caracteres' : 'Digite a senha'}
                  required
                  disabled={submitting}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 p-3 rounded-full text-on-text-muted hover:text-surface transition-colors"
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

            {isRegister && (
              <p className="mb-4 text-sm text-on-text-muted">
                Ao criar a conta, você concorda com os{' '}
                <a className="underline hover:text-surface" href={legalHref('termos')}>Termos de Uso</a> e a{' '}
                <a className="underline hover:text-surface" href={legalHref('privacidade')}>Política de Privacidade</a>.
              </p>
            )}

            {error && <Alert>{error}</Alert>}

            <PillButton type="submit" tone="light" disabled={!username || !password || (isRegister && !confirmPassword) || submitting} icon={submitting ? <Spinner size="sm" /> : undefined}>
              {isRegister ? 'Criar conta' : 'Entrar'}
            </PillButton>

            {googleLogin && (
              <>
                <a
                  href="/api/auth/google"
                  className="mt-3 flex w-full items-center justify-center gap-3 rounded-full border border-on-text-control hover:border-on-text-muted px-5 py-3.5 text-sm font-medium text-surface transition-colors"
                >
                  <GoogleMark />
                  Entrar com Google
                </a>
                <p className="mt-2 text-xs text-on-text-muted">
                  Ao entrar com o Google pela primeira vez, você concorda com os Termos de Uso e a Política de Privacidade.
                </p>
              </>
            )}

            {!isRegister && (
              <p className="mt-4 text-sm text-on-text-muted">
                <a className="underline hover:text-surface" href={legalHref('privacidade')}>Privacidade</a>
                {' · '}
                <a className="underline hover:text-surface" href={legalHref('termos')}>Termos</a>
                {' · '}
                <a className="underline hover:text-surface" href={legalHref('lgpd')}>LGPD</a>
              </p>
            )}
          </form>
        </div>
      </div>
    </main>
  );
}