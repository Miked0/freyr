import { useMemo } from 'react';
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts';
import { useExpenses } from '@/store/expenses';
import { formatCurrency, totalsByCategory } from '@/lib/finance';
import { categoryColor, pieSlices, readableTextOn, type PieSlice } from '@/lib/categoryColors';

const BACKGROUND = '#F7F6F3';

const formatPercent = (share: number) => `${(share * 100).toFixed(1).replace('.', ',')}%`;

const MIN_LABELLED_SHARE = 0.05;
const RADIAN = Math.PI / 180;

interface SliceLabelProps {
  cx: number;
  cy: number;
  midAngle: number;
  innerRadius: number;
  outerRadius: number;
  payload: PieSlice;
}

const SliceLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, payload }: SliceLabelProps) => {
  if (payload.share < MIN_LABELLED_SHARE) return null;
  const radius = innerRadius + (outerRadius - innerRadius) * 0.62;
  return (
    <text
      x={cx + radius * Math.cos(-midAngle * RADIAN)}
      y={cy + radius * Math.sin(-midAngle * RADIAN)}
      fill={readableTextOn(payload.color)}
      textAnchor="middle"
      dominantBaseline="central"
      className="num"
      fontSize={14}
      fontWeight={600}
      pointerEvents="none"
    >
      {formatPercent(payload.share)}
    </text>
  );
};

const SliceTooltip = ({ active, payload }: { active?: boolean; payload?: { payload?: PieSlice }[] }) => {
  const slice = payload?.[0]?.payload;
  if (!active || !slice) return null;
  return (
    <div className="bg-ink text-bg rounded-xl px-3.5 py-2.5 text-sm shadow-lg">
      <p className="text-on-ink-muted text-xs">{slice.category}</p>
      <p className="font-medium num text-base">
        {formatCurrency(slice.total)} · {formatPercent(slice.share)}
      </p>
    </div>
  );
};

export function DonutChart() {
  const { expenses } = useExpenses();
  const categories = useMemo(() => totalsByCategory(expenses), [expenses]);
  const slices = useMemo(() => pieSlices(categories), [categories]);

  if (categories.length === 0) {
    return <p className="text-muted text-center py-8">As categorias aparecem aqui depois do primeiro extrato.</p>;
  }

  return (
    <div className="h-[280px] sm:h-[320px]" role="img" aria-label={`Gráfico de pizza da participação de cada categoria: ${slices.map(s => `${s.category} ${formatPercent(s.share)}`).join(', ')}`}>
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={slices}
            dataKey="total"
            nameKey="category"
            outerRadius="92%"
            innerRadius="60%"
            startAngle={90}
            endAngle={-270}
            stroke={BACKGROUND}
            strokeWidth={2}
            isAnimationActive={false}
            labelLine={false}
            label={props => <SliceLabel {...(props as unknown as SliceLabelProps)} />}
          >
            {slices.map(slice => (
              <Cell key={slice.category} fill={slice.color} />
            ))}
          </Pie>
          <Tooltip content={<SliceTooltip />} />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}

export default DonutChart;