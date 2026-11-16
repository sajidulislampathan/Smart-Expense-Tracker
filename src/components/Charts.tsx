import React, { useState } from 'react';
import { CurrencyCode } from '../types/finance';
import { formatCompactCurrency, formatCurrency, formatMonthShort } from '../lib/format';

export interface MonthlyCashFlowPoint {
  month: string;
  income: number;
  expense: number;
  net: number;
}

interface CashFlowChartProps {
  data: MonthlyCashFlowPoint[];
  currency: CurrencyCode;
}

export const CashFlowChart: React.FC<CashFlowChartProps> = ({ data, currency }) => {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  const maxVal = Math.max(100, ...data.flatMap((d) => [d.income, d.expense]));
  const width = 620;
  const height = 220;
  const padLeft = 58;
  const padRight = 16;
  const padTop = 16;
  const padBottom = 34;
  const plotW = width - padLeft - padRight;
  const plotH = height - padTop - padBottom;

  const yTicks = [0, 0.25, 0.5, 0.75, 1];
  const groupW = plotW / Math.max(1, data.length);
  const barW = Math.min(22, Math.max(10, groupW * 0.26));
  const barGap = 4;

  const hovered = hoveredIndex !== null ? data[hoveredIndex] : null;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-5 text-xs text-slate-600 dark:text-slate-400">
          <span className="inline-flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-xs bg-emerald-600 dark:bg-emerald-500 inline-block" />
            Income
          </span>
          <span className="inline-flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-xs bg-rose-600 dark:bg-rose-500 inline-block" />
            Expenses
          </span>
        </div>

        <div className="text-xs font-mono tabular-nums text-slate-600 dark:text-slate-300 min-h-[18px]">
          {hovered ? (
            <span>
              {formatMonthShort(hovered.month)}: +{formatCurrency(hovered.income, currency)} / -
              {formatCurrency(hovered.expense, currency)} (Net {formatCurrency(hovered.net, currency)})
            </span>
          ) : (
            <span className="text-slate-400 dark:text-slate-500">Hover a month to inspect totals</span>
          )}
        </div>
      </div>

      <div className="w-full overflow-x-auto">
        <svg
          viewBox={`0 0 ${width} ${height}`}
          className="w-full min-w-[420px] h-56 select-none"
          role="img"
          aria-label="Six-month income and expense comparison chart"
        >
          {yTicks.map((ratio) => {
            const y = padTop + plotH - ratio * plotH;
            const value = ratio * maxVal;
            return (
              <g key={ratio}>
                <line
                  x1={padLeft}
                  y1={y}
                  x2={width - padRight}
                  y2={y}
                  className="stroke-slate-200 dark:stroke-slate-800"
                  strokeWidth={1}
                />
                <text
                  x={padLeft - 8}
                  y={y + 4}
                  textAnchor="end"
                  className="fill-slate-400 dark:fill-slate-500 text-[10px] font-mono tabular-nums"
                >
                  {formatCompactCurrency(value, currency)}
                </text>
              </g>
            );
          })}

          {data.map((point, idx) => {
            const centerX = padLeft + groupW * idx + groupW / 2;
            const incH = (point.income / maxVal) * plotH;
            const expH = (point.expense / maxVal) * plotH;
            const incY = padTop + plotH - incH;
            const expY = padTop + plotH - expH;
            const isActive = hoveredIndex === idx;

            return (
              <g
                key={point.month}
                onMouseEnter={() => setHoveredIndex(idx)}
                onMouseLeave={() => setHoveredIndex(null)}
                className="cursor-pointer"
              >
                <rect
                  x={padLeft + groupW * idx + 2}
                  y={padTop}
                  width={groupW - 4}
                  height={plotH}
                  rx={4}
                  className={
                    isActive
                      ? 'fill-slate-100/80 dark:fill-slate-800/50 transition-colors'
                      : 'fill-transparent'
                  }
                />
                <rect
                  x={centerX - barW - barGap / 2}
                  y={incY}
                  width={barW}
                  height={Math.max(incH, point.income > 0 ? 2 : 0)}
                  rx={3}
                  className="fill-emerald-600 dark:fill-emerald-500"
                />
                <rect
                  x={centerX + barGap / 2}
                  y={expY}
                  width={barW}
                  height={Math.max(expH, point.expense > 0 ? 2 : 0)}
                  rx={3}
                  className="fill-rose-600 dark:fill-rose-500"
                />
                <text
                  x={centerX}
                  y={height - 10}
                  textAnchor="middle"
                  className={`text-[11px] font-mono ${
                    isActive
                      ? 'fill-slate-900 dark:fill-slate-100 font-semibold'
                      : 'fill-slate-500 dark:fill-slate-400'
                  }`}
                >
                  {formatMonthShort(point.month)}
                </text>
              </g>
            );
          })}
        </svg>
      </div>
    </div>
  );
};

export interface CategorySlice {
  category: string;
  amount: number;
  percentage: number;
  color: string;
}

const SLICE_COLORS = [
  '#0F766E',
  '#0284C7',
  '#D97706',
  '#DC2626',
  '#4F46E5',
  '#059669',
  '#7C3AED',
  '#DB2777',
  '#475569',
];

export function buildCategorySlices(
  totalsByCategory: Map<string, number>,
  totalAmount: number,
): CategorySlice[] {
  return Array.from(totalsByCategory.entries())
    .sort((a, b) => b[1] - a[1])
    .map(([category, amount], idx) => ({
      category,
      amount,
      percentage: totalAmount > 0 ? (amount / totalAmount) * 100 : 0,
      color: SLICE_COLORS[idx % SLICE_COLORS.length],
    }));
}

interface CategoryDonutChartProps {
  slices: CategorySlice[];
  total: number;
  currency: CurrencyCode;
  emptyLabel: string;
}

export const CategoryDonutChart: React.FC<CategoryDonutChartProps> = ({
  slices,
  total,
  currency,
  emptyLabel,
}) => {
  if (slices.length === 0 || total <= 0) {
    return (
      <div className="py-12 text-center text-sm text-slate-500 dark:text-slate-400">
        {emptyLabel}
      </div>
    );
  }

  const size = 180;
  const strokeWidth = 24;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;

  let cumulativeOffset = 0;

  return (
    <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-center">
      <div className="md:col-span-5 flex items-center justify-center">
        <div className="relative w-44 h-44">
          <svg viewBox={`0 0 ${size} ${size}`} className="w-full h-full -rotate-90">
            <circle
              cx={size / 2}
              cy={size / 2}
              r={radius}
              fill="none"
              strokeWidth={strokeWidth}
              className="stroke-slate-100 dark:stroke-slate-800"
            />
            {slices.map((slice) => {
              const dashLength = (slice.percentage / 100) * circumference;
              const dashOffset = -cumulativeOffset;
              cumulativeOffset += dashLength;
              return (
                <circle
                  key={slice.category}
                  cx={size / 2}
                  cy={size / 2}
                  r={radius}
                  fill="none"
                  stroke={slice.color}
                  strokeWidth={strokeWidth}
                  strokeDasharray={`${dashLength} ${circumference - dashLength}`}
                  strokeDashoffset={dashOffset}
                />
              );
            })}
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center text-center px-4">
            <span className="text-[11px] text-slate-500 dark:text-slate-400">Total</span>
            <span className="text-sm font-semibold font-mono tabular-nums text-slate-900 dark:text-slate-100 truncate max-w-full">
              {formatCurrency(total, currency)}
            </span>
          </div>
        </div>
      </div>

      <div className="md:col-span-7 space-y-3">
        {slices.map((slice) => (
          <div key={slice.category} className="space-y-1">
            <div className="flex items-center justify-between gap-3 text-sm">
              <div className="flex items-center gap-2.5 min-w-0">
                <span
                  className="w-2.5 h-2.5 rounded-xs shrink-0"
                  style={{ backgroundColor: slice.color }}
                />
                <span className="text-slate-800 dark:text-slate-200 truncate">
                  {slice.category}
                </span>
              </div>
              <div className="flex items-center gap-3 shrink-0 font-mono tabular-nums text-xs">
                <span className="text-slate-500 dark:text-slate-400">
                  {slice.percentage.toFixed(1)}%
                </span>
                <span className="font-medium text-slate-900 dark:text-slate-100">
                  {formatCurrency(slice.amount, currency)}
                </span>
              </div>
            </div>
            <div className="w-full h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
              <div
                className="h-full rounded-full"
                style={{
                  width: `${Math.min(100, Math.max(2, slice.percentage))}%`,
                  backgroundColor: slice.color,
                }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
