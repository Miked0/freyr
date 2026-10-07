import { useId, useState, type FormEvent } from 'react';
import type { Profile, ProfilePatch } from '@/api';
import { formatDate } from '@/lib/finance';
import { formatBudget, parseBudget, useProfile } from '@/lib/useProfile';
import { readDashboardPeriod, saveDashboardPeriod, type DashboardPeriod } from '@/lib/dashboardPeriod';
import { BentoCard } from '../../BentoCard';
import { Button } from '../../Button';
import { SegmentedControl } from '../../SegmentedControl';
import { SettingRow } from '../../settings/SettingRow';

/** The money settings: monthly spending goal, what is invested today and what the overview opens on. */
export function FinanceSection({ profile }: { profile: Profile }) {
  const { save } = useProfile();
  const id = useId();
  const [budgetText, setBudgetText] = useState(formatBudget(profile.monthly_budget));
  const [budgetError, setBudgetError] = useState<string | null>(null);
  const [investedText, setInvestedText] = useState(formatBudget(profile.invested_balance));
  const [investedError, setInvestedError] = useState<string | null>(null);
  const [period, setPeriod] = useState<DashboardPeriod>(readDashboardPeriod);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const budget = parseBudget(budgetText);
  const invested = parseBudget(investedText);
  const patch: ProfilePatch = {};
  if (budget !== profile.monthly_budget) patch.monthly_budget = budget ?? null;
  if (invested !== profile.invested_balance) patch.invested_balance = invested ?? null;
  const dirty = Object.keys(patch).length > 0;

  const edited = () => {
    setSaved(false);
    setError(null);
  };

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (!dirty || saving) return;
    if (budget === undefined) {
      setBudgetError('Escreva a meta em reais, como 2.500,00, ou deixe vazio.');
      return;
    }
    if (invested === undefined) {
      setInvestedError('Escreva o valor investido em reais, como 4.250,00, ou deixe vazio.');
      return;
    }
    setSaving(true);
    try {
      await save(patch);
      setSaved(true);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <BentoCard title="Finanças" id="financas" className="fr-settings-card">
      <form onSubmit={submit} noValidate>
        <SettingRow title={<label htmlFor={`${id}-budget`}>Meta de gasto mensal (R$)</label>} description="O máximo que você quer gastar por mês. Deixe vazio para não usar.">
          <div className="fr-field">
            <input
              id={`${id}-budget`}
              className="fr-input fr-num"
              type="text"
              inputMode="decimal"
              value={budgetText}
              placeholder="Ex.: 6.000,00"
              aria-invalid={budgetError ? true : undefined}
              aria-describedby={budgetError ? `${id}-budget-error` : undefined}
              onChange={e => { setBudgetText(e.target.value); setBudgetError(null); edited(); }}
            />
            {budgetError ? <p id={`${id}-budget-error`} role="alert" className="fr-field-error">{budgetError}</p> : null}
          </div>
        </SettingRow>
        <SettingRow
          title={<label htmlFor={`${id}-invested`}>Quanto você tem investido hoje (R$)</label>}
          description="Some CDB, caixinhas, Tesouro e ações. Entra no Saldo total como Investido; daqui em diante as aplicações e os resgates do extrato ajustam esse valor."
        >
          <div className="fr-field">
            <input
              id={`${id}-invested`}
              className="fr-input fr-num"
              type="text"
              inputMode="decimal"
              value={investedText}
              placeholder="0,00"
              aria-invalid={investedError ? true : undefined}
              aria-describedby={`${id}-invested-hint${investedError ? ` ${id}-invested-error` : ''}`}
              onChange={e => { setInvestedText(e.target.value); setInvestedError(null); edited(); }}
            />
            {profile.invested_balance_on ? <p id={`${id}-invested-hint`} className="fr-field-hint">Informado em {formatDate(profile.invested_balance_on)}.</p> : null}
            {investedError ? <p id={`${id}-invested-error`} role="alert" className="fr-field-error">{investedError}</p> : null}
          </div>
        </SettingRow>
        <SettingRow title="Período do painel" description="O que a Visão geral mostra quando você abre o Freyr.">
          <SegmentedControl
            label="Período do painel"
            value={period}
            onChange={value => { setPeriod(value as DashboardPeriod); saveDashboardPeriod(value as DashboardPeriod); }}
            options={[{ value: '30d', label: 'Últimos 30 dias' }, { value: 'month', label: 'Mês atual' }]}
          />
        </SettingRow>
        <div className="fr-settings-save">
          <Button type="submit" variant="outline" disabled={!dirty || saving}>{saving ? 'Salvando…' : 'Salvar valores'}</Button>
          {error ? <p role="alert" className="fr-profile-note is-bad">{error}</p> : null}
          {saved && !dirty ? <p role="status" className="fr-profile-note is-ok">Valores salvos.</p> : null}
        </div>
      </form>
    </BentoCard>
  );
}
