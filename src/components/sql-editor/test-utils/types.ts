import { monacoTypes } from '@grafana/ui';

export interface TestQueryModel {
  query: string;
  tokens: Pick<monacoTypes.Token, 'language' | 'offset' | 'type'>[][];
}
