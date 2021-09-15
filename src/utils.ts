import SqlParser from 'sql_parser';

export const SHIFTED = '_shifted';

export function formatBigqueryError(error) {
  let message = 'BigQuery: ';
  let status = '';
  let data = '';
  if (error !== undefined) {
    message += error.message ? error.message : 'Cannot connect to BigQuery API';
    status = error.code;
    data = error.errors[0].reason + ': ' + error.message;
  }
  return {
    data: {
      message: data,
    },
    status,
    statusText: message,
  };
}

export function getShiftPeriod(strInterval) {
  const shift = strInterval.match(/\d+/)[0];
  strInterval = strInterval.substr(shift.length, strInterval.length);

  if (strInterval.trim() === 'min') {
    strInterval = 'm';
  }
  return [strInterval, shift];
}

export function extractFromClause(sql: string) {
  return SqlParser.getProjectDatasetTableFromSql(sql);
}

export function findTimeField(sql, timeFields) {
  const select = sql.search(/select/i);
  const from = sql.search(/from/i);
  const fields = sql.substring(select + 6, from);
  const splitFrom = fields.split(',');
  let col;
  for (let i = 0; i < splitFrom.length; i++) {
    let field = splitFrom[i].search(/ AS /i);
    if (field === -1) {
      field = splitFrom[i].length;
    }
    col = splitFrom[i]
      .substring(0, field)
      .trim()
      .replace('`', '')
      .replace('`', '');
    col = col.replace(/\$__timeGroupAlias\(/g, '');
    col = col.replace(/\$__timeGroup\(/g, '');
    col = col.replace(/\$__timeFilter\(/g, '');
    col = col.replace(/\$__timeFrom\(/g, '');
    col = col.replace(/\$__timeTo\(/g, '');
    col = col.replace(/\$__millisTimeTo\(/g, '');
    col = col.replace(/\$__millisTimeFrom\(/g, '');
    for (const fl of timeFields) {
      if (fl.text === col) {
        return fl;
      }
    }
  }
  return null;
}
export function handleError(error) {
  if (error.cancelled === true) {
    return [];
  }
  let msg = error;
  if (error.data !== undefined) {
    msg = error.data.error;
  }
  throw formatBigqueryError(msg);
}
export function createTimeShiftQuery(query) {
  const res = getTimeShift(query.rawSql);
  if (!res) {
    return res;
  }
  const copy = query.constructor();
  for (const attr in query) {
    if (query.hasOwnProperty(attr)) {
      copy[attr] = query[attr];
    }
  }
  copy.rawSql = replaceTimeShift(copy.rawSql);
  copy.format += '#' + res;
  copy.refId += SHIFTED + '_' + res;
  return copy;
}

export function setupTimeShiftQuery(query, options) {
  const index = query.format.indexOf('#');
  const copy = options.constructor();
  for (const attr in options) {
    if (options.hasOwnProperty(attr)) {
      copy[attr] = options[attr];
    }
  }
  if (index === -1) {
    return copy;
  }
  let strInterval = query.format.substr(index + 1, query.format.len);
  const res = getShiftPeriod(strInterval);
  strInterval = res[0];
  if (!['s', 'min', 'h', 'd', 'w', 'm', 'w', 'y', 'M'].includes(strInterval)) {
    return copy;
  }
  query.format = query.format.substr(0, index);
  strInterval = res[0];
  const shift = res[1];

  if (strInterval === 'min') {
    strInterval = 'm';
  }
  copy.range.from = options.range.from.subtract(parseInt(shift, 10), strInterval);
  copy.range.to = options.range.to.subtract(parseInt(shift, 10), strInterval);
  return copy;
}

export function updatePartition(q, options) {
  if (q.indexOf('AND _PARTITIONTIME >= ') < 1) {
    return q;
  }
  if (q.indexOf('AND _PARTITIONTIME <') < 1) {
    return q;
  }
  const from = q.substr(q.indexOf('AND _PARTITIONTIME >= ') + 22, 21);

  const newFrom = "'" + formatDateToString(options.range.from._d, '-', true) + "'";
  q = q.replace(from, newFrom);
  const to = q.substr(q.indexOf('AND _PARTITIONTIME < ') + 21, 21);
  const newTo = "'" + formatDateToString(options.range.to._d, '-', true) + "'";

  q = q.replace(to, newTo) + '\n ';
  return q;
}

export function updateTableSuffix(q, options) {
  const ind = q.indexOf('AND  _TABLE_SUFFIX BETWEEN ');
  if (ind < 1) {
    return q;
  }
  const from = q.substr(ind + 28, 8);

  const newFrom = formatDateToString(options.range.from._d);
  q = q.replace(from, newFrom);
  const to = q.substr(ind + 43, 8);
  const newTo = formatDateToString(options.range.to._d);
  q = q.replace(to, newTo) + '\n ';
  return q;
}

// query utils
export function quoteLiteral(value) {
  return "'" + String(value).replace(/'/g, "''") + "'";
}

export function escapeLiteral(value) {
  return String(value).replace(/'/g, "''");
}

export function quoteFiledName(value) {
  const vals = value.split('.');
  let res = '';
  for (let i = 0; i < vals.length; i++) {
    res = res + '`' + String(vals[i]) + '`';
    if (vals.length > 1 && i + 1 < vals.length) {
      res = res + '.';
    }
  }
  return res;
}

export function formatDateToString(inputDate, separator = '', addtime = false) {
  const date = new Date(inputDate);
  // 01, 02, 03, ... 29, 30, 31
  const DD = (date.getDate() < 10 ? '0' : '') + date.getDate();
  // 01, 02, 03, ... 10, 11, 12
  const MM = (date.getMonth() + 1 < 10 ? '0' : '') + (date.getMonth() + 1);
  // 1970, 1971, ... 2015, 2016, ...
  const YYYY = date.getFullYear();

  // create the format you want
  let dateStr = YYYY + separator + MM + separator + DD;
  if (addtime === true) {
    dateStr += ' ' + date.toTimeString().substr(0, 8);
  }
  return dateStr;
}

export function getInterval(q, alias: boolean) {
  const interval: string[] = [];
  const res = alias
    ? q.match(/(\$__timeGroupAlias\(([\w._]+,)).*?(?=\))/g)
    : q.match(/(\$__timeGroup\(([\w_.]+,)).*?(?=\))/g);
  if (res) {
    interval[0] = res[0].split(',')[1] ? res[0].split(',')[1].trim() : res[0].split(',')[1];
    interval[1] = res[0].split(',')[2] ? res[0].split(',')[2].trim() : res[0].split(',')[2];
  }
  return interval;
}

export function getUnixSecondsFromString(str) {
  if (str === undefined) {
    return 0;
  }
  const res = getShiftPeriod(str);
  const groupPeriod = res[0];
  const groupVal = res[1];
  switch (groupPeriod) {
    case 's':
      return 1 * groupVal;
    case 'm':
      return 60 * groupVal;
    case 'h':
      return 3600 * groupVal;
    case 'd':
      return groupVal * 86400;
    case 'w':
      return 604800 * groupVal;
    case 'M':
      return 2629743 * groupVal;
    case 'y':
      return 31536000 * groupVal;
  }
  return 0;
}

export function getTimeShift(q) {
  let res: string;
  res = q.match(/(.*\$__timeShifting\().*?(?=\))/g);
  if (res) {
    res = res[0].substr(1 + res[0].lastIndexOf('('));
  }
  return res;
}

export function replaceTimeShift(q) {
  return q.replace(/(\$__timeShifting\().*?(?=\))./g, '');
}

export function convertToUtc(d) {
  return new Date(d.getTime() + d.getTimezoneOffset() * 60000);
}
