import React, { useState, type FormEvent } from 'react';
import { AlertCircle, Lock, User, Eye, EyeOff, ShieldCheck, X } from 'lucide-react';
import PillButton from '@/components/ui/PillButton';
import Spinner from '@/components/ui/Spinner';
import { Logo } from '@/components/Hero';
import { api } from '@/api';
import { legalHref } from '@/legal/content';

// Legal links stay in the text color: the consent sentence marks them with a soft underline, the footer row only on hover.
const consentLink = 'text-on-text-muted underline decoration-on-text-control underline-offset-4 hover:text-surface hover:decoration-surface transition-colors';
const quietLink = 'inline-block py-1 text-on-text-muted no-underline hover:text-surface hover:underline underline-offset-4 transition-colors';

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
              <p className="mb-5 text-xs leading-5 text-on-text-muted">
                Ao criar a conta, você concorda com os{' '}
                <a className={consentLink} href={legalHref('termos')}>Termos de Uso</a> e a{' '}
                <a className={consentLink} href={legalHref('privacidade')}>Política de Privacidade</a>.
              </p>
            )}

            {error && <Alert>{error}</Alert>}

            <PillButton type="submit" tone="light" disabled={!username || !password || (isRegister && !confirmPassword) || submitting} icon={submitting ? <Spinner size="sm" /> : undefined}>
              {isRegister ? 'Criar conta' : 'Entrar'}
            </PillButton>

            {!isRegister && (
              <nav aria-label="Documentos legais" className="mt-6 flex items-center gap-2 text-xs text-on-text-muted">
                <ShieldCheck className="h-3.5 w-3.5 flex-none" aria-hidden="true" />
                <a className={quietLink} href={legalHref('privacidade')}>Privacidade</a>
                <span aria-hidden="true">·</span>
                <a className={quietLink} href={legalHref('termos')}>Termos</a>
                <span aria-hidden="true">·</span>
                <a className={quietLink} href={legalHref('lgpd')}>LGPD</a>
              </nav>
            )}
          </form>
        </div>
      </div>
    </main>
  );
}