import { MacroType } from '@grafana/plugin-ui';

export const MACROS = [
  {
    id: '$__timeFilter(dateColumn)',
    name: '$__timeFilter(dateColumn)',
    text: '$__timeFilter',
    args: ['dateColumn'],
    type: MacroType.Filter,
    description:
      "Will be replaced by a time range filter using the specified column name. For example, dateColumn >= '2024-01-01T00:00:00Z' AND dateColumn <= '2024-01-02T00:00:00Z'",
  },
  {
    id: '$__timeFrom()',
    name: '$__timeFrom()',
    text: '$__timeFrom',
    args: [],
    type: MacroType.Value,
    description:
      "Will be replaced by the start of the currently active time selection, as a timestamp value. For example, TIMESTAMP('2024-01-01T00:00:00Z'). With a column argument it expands to a lower-bound filter instead: dateColumn >= '2024-01-01T00:00:00Z'",
  },
  {
    id: '$__timeTo()',
    name: '$__timeTo()',
    text: '$__timeTo',
    args: [],
    type: MacroType.Value,
    description:
      "Will be replaced by the end of the currently active time selection, as a timestamp value. For example, TIMESTAMP('2024-01-02T00:00:00Z'). With a column argument it expands to an upper-bound filter instead: dateColumn <= '2024-01-02T00:00:00Z'",
  },
  {
    id: "$__timeGroup(dateColumn, '5m')",
    name: "$__timeGroup(dateColumn, '5m')",
    text: '$__timeGroup',
    args: ['dateColumn', "'5m'"],
    type: MacroType.Value,
    description:
      'Will be replaced by an expression usable in a GROUP BY clause. For example, TIMESTAMP_MILLIS(DIV(UNIX_MILLIS(dateColumn), 300000) * 300000)',
  },
];
