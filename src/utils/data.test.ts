import { toOption } from './data';

describe('toOption', () => {
  test('returns ComboboxOption with label and value', () => {
    const res = toOption('abc');
    expect(res).toEqual({ label: 'abc', value: 'abc' });
  });

  test('handles empty string', () => {
    const res = toOption('');
    expect(res).toEqual({ label: '', value: '' });
  });

  test('preserves special characters and whitespace', () => {
    const val = "a b@#%/\\'";
    const res = toOption(val);
    expect(res).toEqual({ label: val, value: val });
  });
});
