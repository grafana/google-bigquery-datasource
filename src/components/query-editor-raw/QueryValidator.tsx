import { css } from '@emotion/css';
import { formattedValueToString, getValueFormat, GrafanaTheme2, TimeRange } from '@grafana/data';
import { Icon, Spinner, useStyles2 } from '@grafana/ui';
import { BigQueryAPI, ValidationResults } from 'api';
import React, { useState, useMemo, useEffect, useContext } from 'react';
import { useAsyncFn } from 'react-use';
import useDebounce from 'react-use/lib/useDebounce';
import { BigQueryQueryNG } from 'types';
import { DatasourceContext } from '../../context/datasource-context';

export interface QueryValidatorProps {
  apiClient: BigQueryAPI;
  query: BigQueryQueryNG;
  range?: TimeRange;
  onValidate: (isValid: boolean) => void;
}

const getStyles = (theme: GrafanaTheme2) => {
  return {
    error: css`
      color: ${theme.colors.error.text};
      font-size: ${theme.typography.bodySmall.fontSize};
      font-family: ${theme.typography.fontFamilyMonospace};
    `,
    valid: css`
      color: ${theme.colors.success.text};
    `,
    info: css`
      color: ${theme.colors.text.secondary};
    `,
  };
};

export function QueryValidator({ apiClient, query, onValidate, range }: QueryValidatorProps) {
  const styles = useStyles2(getStyles);

  const [validationResult, setValidationResult] = useState<ValidationResults | null>();

  const [state, validateQuery] = useAsyncFn(
    async (q: BigQueryQueryNG) => {
      if (!q.location || q.rawSql.trim() === '') {
        return null;
      }

      return await apiClient.validateQuery(q, range);
    },
    [apiClient]
  );

  const [,] = useDebounce(
    async () => {
      const result = await validateQuery(query);
      if (result) {
        setValidationResult(result);
      }

      return null;
    },
    1000,
    [query, validateQuery]
  );

  useEffect(() => {
    if (validationResult?.isError) {
      onValidate(false);
    }
    if (validationResult?.isValid) {
      onValidate(true);
    }
  }, [validationResult, onValidate]);

  if (!state.value && !state.loading) {
    return null;
  }

  const error = state.value?.error ? processErrorMessage(state.value.error) : '';

  if (state.loading) {
    return (
      <div className={styles.info}>
        <Spinner inline={true} size={12} /> Validating query...
      </div>
    );
  }

  return state.value ? (
    <>
      {state.value.isValid && state.value.statistics && (
        <ValidMessage bytes={state.value.statistics.TotalBytesProcessed} />
      )}
      {state.value.isError && <div className={styles.error}>{error}</div>}
    </>
  ) : null;
}

function processErrorMessage(error: string) {
  const splat = error.split(':');
  if (splat.length > 2) {
    return splat.slice(2).join(':');
  }
  return error;
}

const ValidMessage = ({ bytes }: { bytes: number }) => {
  const styles = useStyles2(getStyles);
  const { onDemandComputePrice } = useContext(DatasourceContext);

  const valueFormatter = useMemo(() => getValueFormat('bytes'), []);
  const currencyFormatter = useMemo(() => getValueFormat('currency:$'), []);

  const costPerByte = useMemo(() => {
    if (!onDemandComputePrice) {
      return undefined;
    }
    const bytesInATB = 1024 * 1024 * 1024 * 1024;
    const perByte = onDemandComputePrice / bytesInATB;

    return formattedValueToString(currencyFormatter(bytes * perByte, 4));
  }, [bytes, currencyFormatter, onDemandComputePrice]);

  const formattedBytes = formattedValueToString(valueFormatter(bytes));

  return (
    <div className={styles.valid}>
      <Icon name="check" /> This query will process <strong>{formattedBytes}</strong> when run
      {costPerByte ? <>, costing approximately {costPerByte}</> : '.'}
    </div>
  );
};
