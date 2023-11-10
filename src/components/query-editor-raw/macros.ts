import { MacroType } from '@grafana/experimental';

export const MACROS = [
  {
    id: '$__timeFilter(dateColumn)',
    name: '$__timeFilter(dateColumn)',
    text: '$__timeFilter',
    args: ['dateColumn'],
    type: MacroType.Filter,
    description:
      'Will be replaced by a time range filter using the specified column name. For example, dateColumn BETWEEN FROM_UNIXTIME(1494410783) AND FROM_UNIXTIME(1494410983)',
  },
  {
    id: '$__timeFrom()',
    name: '$__timeFrom()',
    text: '$__timeFrom',
    args: [],
    type: MacroType.Filter,
    description:
      'Will be replaced by the start of the currently active time selection. For example, FROM_UNIXTIME(1494410783)',
  },
  {
    id: '$__timeTo()',
    name: '$__timeTo()',
    text: '$__timeTo',
    args: [],
    type: MacroType.Filter,
    description:
      'Will be replaced by the end of the currently active time selection. For example, FROM_UNIXTIME(1494410983)',
  },
  {
    id: "$__timeGroup(dateColumn, '5m')",
    name: "$__timeGroup(dateColumn, '5m')",
    text: '$__timeGroup',
    args: ['dateColumn', "'5m'"],
    type: MacroType.Value,
    description:
      'Will be replaced by an expression usable in GROUP BY clause. For example, *cast(cast(UNIX_TIMESTAMP(dateColumn)/(300) as signed)*300 as signed),*',
  },
];
