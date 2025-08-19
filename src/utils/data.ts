import { ComboboxOption } from '@grafana/ui';


export const toOption = (value: string) => ({ label: value, value }) as ComboboxOption<string>;
