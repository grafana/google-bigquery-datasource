import React from 'react';

import { fireEvent, render, screen } from '@testing-library/react';

import { BigQueryConfigEditor, BigQueryConfigEditorProps } from './ConfigEditor';

// Combobox uses canvas.measureText which  was causing test to fail
jest.mock('@grafana/ui', () => ({
  ...jest.requireActual('@grafana/ui'),
  Combobox: () => null,
}));

const mockOnOptionsChange = jest.fn();

const defaultProps: BigQueryConfigEditorProps = {
  options: {
    id: 1,
    uid: 'test-uid',
    orgId: 1,
    name: 'Test BigQuery',
    type: 'grafana-bigquery-datasource',
    typeName: 'BigQuery',
    typeLogoUrl: '',
    access: '',
    url: '',
    user: '',
    database: '',
    basicAuth: false,
    basicAuthUser: '',
    isDefault: false,
    readOnly: false,
    withCredentials: false,
    secureJsonFields: {},
    jsonData: { authenticationType: 'jwt' },
  },
  onOptionsChange: mockOnOptionsChange,
};

beforeEach(() => {
  mockOnOptionsChange.mockClear();
});

describe('BigQueryConfigEditor', () => {
  describe('Job timeout input', () => {
    test('clamp negative values to 0', () => {
      render(<BigQueryConfigEditor {...defaultProps} />);

      const jobTimeoutInput = screen.getByPlaceholderText('Optional, example 300');
      fireEvent.change(jobTimeoutInput, { target: { value: '-5' } });

      expect(mockOnOptionsChange).toHaveBeenCalledWith(
        expect.objectContaining({
          jsonData: expect.objectContaining({ JobTimeout: 0 }),
        })
      );
    });

    test('positive values remain unchanged', () => {
      render(<BigQueryConfigEditor {...defaultProps} />);

      const jobTimeoutInput = screen.getByPlaceholderText('Optional, example 300');
      fireEvent.change(jobTimeoutInput, { target: { value: '50' } });

      expect(mockOnOptionsChange).toHaveBeenCalledWith(
        expect.objectContaining({
          jsonData: expect.objectContaining({ JobTimeout: 50 }),
        })
      );
    });
  });
});
