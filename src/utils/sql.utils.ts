import {
  QueryEditorExpressionType,
  QueryEditorFunctionExpression,
  QueryEditorGroupByExpression,
  QueryEditorPropertyExpression,
  QueryEditorPropertyType,
} from 'expressions';
import { isEmpty } from 'lodash';
import { BigQueryQueryNG } from 'types';

export function toRawSql(query: BigQueryQueryNG, projectId: string): string {
  let rawQuery = '';
  if (query.sql?.columns) {
    const columns = query.sql.columns.map((c) => {
      let rawColumn = '';
      if (c.name) {
        rawColumn += `${c.name}(${c.parameters?.map((p) => `${p.name}`)})`;
      } else {
        rawColumn += `${c.parameters?.map((p) => `${p.name}`)}`;
      }
      return rawColumn;
    });
    rawQuery += `SELECT ${columns.join(', ')} `;
  }

  if (query.dataset && query.table) {
    rawQuery += `FROM ${projectId}.${query.dataset}.${query.table} `;
  }

  if (query.sql?.whereString) {
    rawQuery += `WHERE ${query.sql.whereString} `;
  }

  if (query.sql?.groupBy?.[0]?.property.name) {
    const groupBy = query.sql.groupBy.map((g) => g.property.name).filter((g) => !isEmpty(g));
    rawQuery += `GROUP BY ${groupBy.join(', ')} `;
  }

  if (query.sql?.orderBy?.property.name) {
    rawQuery += `ORDER BY ${query.sql.orderBy.property.name} `;
  }

  if (query.sql?.orderByDirection) {
    rawQuery += `${query.sql.orderByDirection} `;
  }

  if (query.sql?.limit) {
    rawQuery += `LIMIT ${query.sql.limit} `;
  }
  return rawQuery;
}

/**
 * Creates a GroupByExpression for a specified field
 */
export function setGroupByField(field?: string): QueryEditorGroupByExpression {
  return {
    type: QueryEditorExpressionType.GroupBy,
    property: {
      type: QueryEditorPropertyType.String,
      name: field,
    },
  };
}

/**
 * Creates a PropertyExpression for a specified field
 */
export function setPropertyField(field?: string): QueryEditorPropertyExpression {
  return {
    type: QueryEditorExpressionType.Property,
    property: {
      type: QueryEditorPropertyType.String,
      name: field,
    },
  };
}

export function createFunctionField(functionName?: string): QueryEditorFunctionExpression {
  return {
    type: QueryEditorExpressionType.Function,
    name: functionName,
    parameters: [],
  };
}
