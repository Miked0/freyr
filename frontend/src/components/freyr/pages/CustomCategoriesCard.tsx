import { useEffect, useState, type FormEvent } from 'react';
import { Trash2 } from 'lucide-react';
import { api, type AccountCategory, type CategoryCatalog } from '@/api';
import Button from '@/components/ui/Button';
import { useExpenses } from '@/store/expenses';
import { BentoCard } from '../BentoCard';
import { CategoryTag } from '../CategoryTag';

/** The categories the user created, up to their plan's limit. */
export function CustomCategoriesCard() {
  const reload = useExpenses(state => state.load);
  const [catalog, setCatalog] = useState<CategoryCatalog | null>(null);
  const [name, setName] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api.getCategoryCatalog().then(setCatalog).catch(() => setCatalog(null));
  }, []);

  const create = async (event: FormEvent) => {
    event.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const created = await api.createCategory(name.trim());
      setCatalog(prev => prev && { ...prev, categories: [...prev.categories, created] });
      setName('');
      await reload();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const remove = async (category: AccountCategory) => {
    if (!window.confirm(`Apagar a categoria ${category.name}? As transações dela voltam para Outros.`)) return;
    setError(null);
    try {
      await api.deleteCategory(category.id);
      setCatalog(prev => prev && { ...prev, categories: prev.categories.filter(c => c.id !== category.id) });
      await reload();
    } catch (err) {
      setError((err as Error).message);
    }
  };

  if (!catalog) return null;
  const custom = catalog.categories.filter(c => c.is_custom);
  const full = custom.length >= catalog.custom_limit;

  return (
    <BentoCard span={12} title="Criadas por você">
      <p className="text-ink-muted mb-3">{custom.length} de {catalog.custom_limit} do seu plano. Escolha uma delas ao editar uma transação, e as próximas compras na mesma loja já entram nela.</p>
      <ul className="fr-tx mb-4" aria-label="Criadas por você">
        {custom.map(c => (
          <li key={c.id}>
            <span className="fr-tx-name"><CategoryTag tone="brand">{c.name}</CategoryTag></span>
            <Button variant="ghost" size="sm" onClick={() => remove(c)} aria-label={`Apagar ${c.name}`} title="Apagar" className="hover:!text-alert">
              <Trash2 className="h-4 w-4" />
            </Button>
          </li>
        ))}
      </ul>
      {full ? (
        <p className="text-ink-muted mb-3">Você chegou ao limite do seu plano. Apague uma categoria para criar outra.</p>
      ) : null}
      {error ? <p role="alert" className="text-alert mb-3">{error}</p> : null}
      <form onSubmit={create} className="flex flex-wrap gap-2 items-end">
        <label className="flex-1 min-w-[200px]">
          <span className="field-label">Nova categoria</span>
          <input value={name} onChange={e => setName(e.target.value)} maxLength={40} className="input" placeholder="Ex.: Viagem a Lisboa" disabled={full} />
        </label>
        <Button type="submit" loading={busy} disabled={full}>Criar</Button>
      </form>
    </BentoCard>
  );
}
