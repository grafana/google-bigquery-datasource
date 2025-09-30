import React from 'react';

import { dateTime } from '@grafana/data';
import { Button, Combobox, DateTimePicker, Input, Select } from '@grafana/ui';
import {
  BasicConfig,
  Config,
  DateTimeWidgetProps,
  JsonItem,
  NumberWidgetProps,
  Settings,
  TextWidgetProps,
  Utils,
  Widgets,
} from '@react-awesome-query-builder/ui';
import { toOption } from 'utils/data';

const buttonLabels = {
  add: 'Add',
  remove: 'Remove',
};

export const emptyInitValue = {
  id: Utils.uuid(),
  type: 'group' as const,
  children1: {
    [Utils.uuid()]: {
      type: 'rule',
      properties: {
        field: null,
        operator: null,
        value: [],
        valueSrc: [],
      },
    } as JsonItem,
  },
};

export const widgets: Widgets = {
  ...BasicConfig.widgets,
  text: {
    ...BasicConfig.widgets.text,
    factory: function TextInput(props: TextWidgetProps) {
      return (
        <Input
          value={props?.value || ''}
          placeholder={props?.placeholder}
          onChange={(e) => props?.setValue(e.currentTarget.value)}
        />
      );
    },
  },
  number: {
    ...BasicConfig.widgets.number,
    factory: function NumberInput(props: NumberWidgetProps) {
      return (
        <Input
          value={Array.isArray(props?.value) ? (props.value[0] ?? '') : (props?.value ?? '')}
          placeholder={props?.placeholder}
          type="number"
          onChange={(e) => props?.setValue(Number.parseInt(e.currentTarget.value, 10))}
        />
      );
    },
  },
  datetime: {
    ...BasicConfig.widgets.datetime,
    factory: function DateTimeInput(props: DateTimeWidgetProps) {
      return (
        <DateTimePicker
          onChange={(e) => {
            props?.setValue(e?.format(BasicConfig.widgets.datetime.valueFormat));
          }}
          date={dateTime(Array.isArray(props?.value) ? props.value[0] : props?.value).utc()}
        />
      );
    },
  },
};

const { is_empty, is_not_empty, proximity, ...supportedOperators } = BasicConfig.operators;

export const settings: Settings = {
  ...BasicConfig.settings,
  canRegroup: false,
  maxNesting: 1,
  canReorder: false,
  showNot: false,
  addRuleLabel: buttonLabels.add,
  deleteLabel: buttonLabels.remove,
  renderConjs: function Conjunctions(conjProps) {
    return (
      <Combobox
        id={conjProps?.id}
        aria-label="Conjunction"
        options={
          conjProps?.conjunctionOptions
            ? Object.keys(conjProps?.conjunctionOptions).map(toOption)
            : Object.keys(BasicConfig.conjunctions).map(toOption)
        }
        value={conjProps?.selectedConjunction}
        onChange={(val) => conjProps?.setConjunction(val.value!)}
      />
    );
  },
  renderField: function Field(fieldProps) {
    return (
      // TODO: migrate this to ComboBox when we find a way to use ComboBox with icons. Disabling lint warning for now
      // eslint-disable-next-line @typescript-eslint/no-deprecated
      <Select
        id={fieldProps?.id}
        width={25}
        aria-label="Field"
        menuShouldPortal
        options={fieldProps?.items.map((f) => ({
          label: f.label,
          value: f.key,
          icon: (fieldProps.config?.fields[f.key] as any)?.mainWidgetProps?.customProps?.icon,
        }))}
        value={fieldProps?.selectedKey}
        onChange={(val) => {
          fieldProps?.setField(val.label!);
        }}
      />
    );
  },
  renderButton: function RAQBButton(buttonProps) {
    return (
      <Button
        type="button"
        title={`${buttonProps?.label} filter`}
        onClick={buttonProps?.onClick}
        variant="secondary"
        size="md"
        icon={buttonProps?.label === buttonLabels.add ? 'plus' : 'times'}
      />
    );
  },
  renderOperator: function Operator(operatorProps) {
    return (
      <Combobox
        options={operatorProps?.items.map((op) => ({ label: op.label, value: op.key }))}
        aria-label="Operator"
        value={operatorProps?.selectedKey}
        onChange={(val) => {
          operatorProps?.setField(val.value || '');
        }}
      />
    );
  },
};

export const raqbConfig: Config = {
  ...BasicConfig,
  widgets,
  settings,
  operators: supportedOperators as typeof BasicConfig.operators,
};

export type { Config };
