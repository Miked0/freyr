import { useEffect, useState } from 'react';
import { api, endSession, type ImportedFile } from '@/api';
import { toCsv, type Expense } from '@/lib/finance';
import { downloadText, todayStamp } from '@/lib/download';
import { useProfile } from '@/lib/useProfile';
import { useTheme } from '@/lib/useTheme';
import type { ThemePreference } from '@/lib/theme';
import { useExpenses } from '@/store/expenses';
import { BentoCard } from '../BentoCard';
import { Button } from '../Button';
import { Icon } from '../Icon';
import { PageHeader } from '../PageHeader';
import { SegmentedControl } from '../SegmentedControl';
import { ConfirmDialog } from '../settings/ConfirmDialog';
import { DangerZone } from '../settings/DangerZone';
import { SettingRow } from '../settings/SettingRow';
import { SettingsNav, type SettingsNavItem } from '../settings/SettingsNav';
import { Toast } from '../settings/Toast';
import { csvExporter } from './exportCsv';
import { DataSection } from './settings/DataSection';
import { FinanceSection } from './settings/FinanceSection';
import { HistoryDialog } from './settings/HistoryDialog';
import { ProfileSection } from './settings/ProfileSection';
import { UNDO_MS, useImportHistory } from './settings/useImportHistory';

const SECTIONS: SettingsNavItem[] = [
  { id: 'perfil', label: 'Perfil', icon: 'user' },
  { id: 'aparencia', label: 'Aparência', icon: 'palette' },
  { id: 'financas', label: 'Finanças', icon: 'budget' },
  { id: 'dados', label: 'Dados e privacidade', icon: 'shield' },
  { id: 'cuidado', label: 'Zona de cuidado', icon: 'warning', tone: 'alert' },
];

const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;

/** Configurações (design system 2.3): profile, appearance, money, data and the actions that delete things. */
export function SettingsPage() {
  const { profile, status, error, load } = useProfile();
  const { preference, choose } = useTheme();
  const expenses = useExpenses(state => state.expenses);
  const history = useImportHistory();
  const [section, setSection] = useState('perfil');
  const [dialog, setDialog] = useState<null | 'history' | 'account'>(null);
  const [preselected, setPreselected] = useState<string[] | undefined>();
  const [toast, setToast] = useState<{ message: string; undo: boolean } | null>(null);

  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(null), toast.undo ? UNDO_MS : 4000);
    return () => clearTimeout(timer);
  }, [toast]);

  const go = (id: string) => {
    setSection(id);
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const openHistory = (file?: ImportedFile) => {
    setPreselected(file ? [file.name] : undefined);
    setDialog('history');
  };

  const deleteHistory = (doomed: Expense[], keepCopy: boolean) => {
    if (keepCopy) downloadText(`freyr-historico-apagado-${todayStamp()}.csv`, '﻿' + toCsv(doomed), 'text/csv;charset=utf-8');
    history.remove(doomed);
    setDialog(null);
    setToast({ message: `${plural(doomed.length, 'transação apagada', 'transações apagadas')}.`, undo: true });
  };

  const undo = async () => {
    await history.undo();
    setToast({ message: 'Tudo de volta.', undo: false });
  };

  const allowed = history.status === 'ready';
  const imported = history.files.reduce((sum, file) => sum + file.transactions, 0);

  let profileCards;
  if (profile) {
    // Remount with the stored values after each save, so each form starts from what the server keeps.
    profileCards = (
      <>
        <ProfileSection key={`p-${profile.display_name}-${profile.avatar_color}`} profile={profile} />
        <AppearanceCard preference={preference} onChange={choose} />
        <FinanceSection key={`f-${profile.monthly_budget}-${profile.invested_balance}`} profile={profile} />
      </>
    );
  } else {
    const note = status === 'unavailable'
      ? <p className="fr-field-hint">O perfil fica disponível quando você entra com uma conta.</p>
      : status === 'error'
        ? (
          <div className="fr-settings-save" style={{ borderTop: 0, paddingTop: 0 }}>
            <p role="alert" className="fr-profile-note is-bad">{error}</p>
            <Button variant="outline" onClick={() => load()}>Tentar de novo</Button>
          </div>
        )
        : <p role="status" className="fr-field-hint">Carregando perfil…</p>;
    profileCards = (
      <>
        <BentoCard title="Perfil" id="perfil" className="fr-settings-card">{note}</BentoCard>
        <AppearanceCard preference={preference} onChange={choose} />
      </>
    );
  }

  return (
    <>
      <PageHeader page="Configurações" title="Configurações" phrase="Seu perfil, suas preferências e o que fazer com os seus dados." />
      <div className="fr-settings">
        <div className="fr-settings-nav">
          <SettingsNav items={SECTIONS} active={section} onSelect={go} />
        </div>
        <div className="fr-settings-col">
          {profileCards}
          <DataSection files={allowed ? history.files : null} onRemoveFile={openHistory} onDownload={csvExporter(expenses)} />
          <DangerZone id="cuidado" title="Zona de cuidado" description="Ações que apagam dados. Cada uma pede confirmação.">
            <div>
              {allowed ? (
                <SettingRow
                  title="Apagar histórico de transações"
                  description="Remove as transações que vieram dos extratos: tudo, alguns meses ou os arquivos que você escolher. Lançamentos feitos à mão, categorias, metas e perfil continuam."
                >
                  <Button variant="danger" disabled={imported === 0} onClick={() => openHistory()}><Icon name="trash" size={16} />Apagar histórico…</Button>
                </SettingRow>
              ) : null}
              {profile ? (
                <SettingRow title="Excluir conta" description="Apaga a conta, as transações, as categorias e as metas. Não dá para desfazer.">
                  <Button variant="danger" onClick={() => setDialog('account')}>Excluir conta…</Button>
                </SettingRow>
              ) : null}
            </div>
          </DangerZone>
          {history.error ? <p role="alert" className="fr-profile-note is-bad">{history.error}</p> : null}
        </div>
      </div>

      <HistoryDialog
        open={dialog === 'history'}
        preselected={preselected}
        files={history.files}
        expenses={expenses}
        onClose={() => setDialog(null)}
        onConfirm={deleteHistory}
      />
      <DeleteAccountDialog open={dialog === 'account'} onClose={() => setDialog(null)} />
      <Toast
        message={toast?.message ?? null}
        actionLabel={toast?.undo ? 'Desfazer' : undefined}
        onAction={undo}
        onClose={() => { setToast(null); void history.commit(); }}
      />
    </>
  );
}

function AppearanceCard({ preference, onChange }: { preference: ThemePreference; onChange: (p: ThemePreference) => void }) {
  return (
    <BentoCard title="Aparência" id="aparencia" className="fr-settings-card">
      <div>
        <SettingRow title="Tema" description="Papel é o claro, Fiorde é o escuro. Automático segue o sistema do seu aparelho.">
          <SegmentedControl
            label="Tema"
            value={preference}
            onChange={value => onChange(value as ThemePreference)}
            options={[{ value: 'light', label: 'Papel' }, { value: 'dark', label: 'Fiorde' }, { value: 'auto', label: 'Automático' }]}
          />
        </SettingRow>
      </div>
    </BentoCard>
  );
}

function DeleteAccountDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  const close = () => {
    setPassword('');
    setError(null);
    onClose();
  };

  const confirm = async () => {
    setDeleting(true);
    setError(null);
    try {
      await api.deleteAccount(password);
      close();
      endSession();
    } catch (err) {
      setError((err as Error).message);
      setPassword('');
    } finally {
      setDeleting(false);
    }
  };

  return (
    <ConfirmDialog
      open={open}
      tone="danger"
      title="Excluir conta"
      confirmLabel={deleting ? 'Excluindo…' : 'Excluir conta'}
      disabled={!password}
      busy={deleting}
      onClose={close}
      onConfirm={confirm}
    >
      <p>Apaga a conta, as transações, as categorias e as metas. Não dá para desfazer, e você perde o acesso na hora.</p>
      <div className="fr-field">
        <label className="fr-field-label" htmlFor="delete-account-password">Confirme com sua senha</label>
        <input
          id="delete-account-password"
          className="fr-input"
          type="password"
          autoComplete="current-password"
          value={password}
          onChange={e => setPassword(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter' && password && !deleting) void confirm(); }}
        />
        {error ? <p role="alert" className="fr-field-error">{error}</p> : null}
      </div>
    </ConfirmDialog>
  );
}
