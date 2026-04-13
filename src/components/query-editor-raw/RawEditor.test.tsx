import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { QueryFormat } from '../../types';
import { RawEditor } from './RawEditor';

// AutoSizer relies on DOM measurements which aren't available in jsdom.
// The v2 API uses `renderProp` for render functions — NOT the JSX `children` prop.
// Mirroring the real API here ensures tests catch regressions where the wrong
// prop name is used (e.g. switching back to `children` would silently render nothing).
jest.mock('react-virtualized-auto-sizer', () => ({
  AutoSizer: ({
    renderProp,
    ChildComponent,
    Child,
  }: {
    renderProp?: (size: { width: number; height: number }) => React.ReactNode;
    ChildComponent?: React.ComponentType<{ width: number; height: number }>;
    Child?: React.ComponentType<{ width: number; height: number }>;
  }) => {
    const size = { width: 800, height: 600 };
    if (renderProp) {
      return <>{renderProp(size)}</>;
    }
    const Component = Child ?? ChildComponent;
    if (Component) {
      return <Component {...size} />;
    }
    // Mirrors real AutoSizer v2: `children` is not a supported prop — return nothing.
    return null;
  },
}));

// SQLEditor renders a Monaco editor instance – too heavy for unit tests.
// It receives a render-prop `children`; call it so QueryToolbox (with the
// expand button) gets rendered.
jest.mock('@grafana/plugin-ui', () => ({
  ...jest.requireActual('@grafana/plugin-ui'),
  SQLEditor: ({ children }: { children?: (props: { formatQuery: () => void }) => React.ReactNode }) => (
    <div data-testid="sql-editor">{children && children({ formatQuery: jest.fn() })}</div>
  ),
}));

// useMeasure relies on ResizeObserver. Return a stable [ref, size] tuple.
jest.mock('react-use', () => ({
  ...jest.requireActual('react-use'),
  useMeasure: () => [{ current: null }, { width: 800, height: 30 }],
}));

// QueryValidator triggers async API calls; stub it out.
jest.mock('./QueryValidator', () => ({
  QueryValidator: () => null,
}));

// Stub Modal: render children directly when open.
jest.mock('@grafana/ui', () => ({
  ...jest.requireActual('@grafana/ui'),
  Modal: ({
    isOpen,
    children,
    title,
    onDismiss,
  }: {
    isOpen: boolean;
    children: React.ReactNode;
    title: string;
    onDismiss: () => void;
  }) =>
    isOpen ? (
      <div role="dialog" aria-label={title}>
        {children}
      </div>
    ) : null,
}));

const mockApiClient = {
  getColumns: jest.fn().mockResolvedValue([]),
  getTables: jest.fn().mockResolvedValue([]),
  getDatasets: jest.fn().mockResolvedValue([]),
  getProjects: jest.fn().mockResolvedValue([]),
  getTableSchema: jest.fn().mockResolvedValue(null),
  validateQuery: jest.fn().mockResolvedValue({ isValid: true }),
};

const baseQuery = {
  refId: 'A',
  rawSql: 'SELECT 1',
  format: QueryFormat.Table,
};

function renderRawEditor() {
  return render(
    <RawEditor
      apiClient={mockApiClient as any}
      query={baseQuery as any}
      queryToValidate={baseQuery as any}
      onChange={jest.fn()}
      onRunQuery={jest.fn()}
      onValidate={jest.fn()}
    />
  );
}

describe('RawEditor', () => {
  it('renders the SQL editor without crashing', () => {
    renderRawEditor();
    expect(screen.getByTestId('sql-editor')).toBeInTheDocument();
  });

  it('opens the expanded modal when the expand button is clicked', () => {
    renderRawEditor();

    // Modal should not be visible initially
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();

    // Click the expand icon button (tooltip "Expand editor")
    const expandButton = screen.getByRole('button', { name: /expand editor/i });
    fireEvent.click(expandButton);

    // Modal should now be open and contain the editor
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByTestId('sql-editor')).toBeInTheDocument();
  });

  it('renders the SQL editor inside the expanded modal (not just an empty dialog)', () => {
    renderRawEditor();
    fireEvent.click(screen.getByRole('button', { name: /expand editor/i }));

    const dialog = screen.getByRole('dialog');
    // The SQL editor must be a descendant of the dialog — if AutoSizer is called
    // with the wrong prop (e.g. `children` instead of `renderProp`), AutoSizer
    // silently renders nothing and this assertion fails.
    expect(dialog).toContainElement(screen.getByTestId('sql-editor'));
  });

  it('closes the modal when expand is clicked again inside the modal', () => {
    renderRawEditor();

    // Open the modal
    fireEvent.click(screen.getByRole('button', { name: /expand editor/i }));
    expect(screen.getByRole('dialog')).toBeInTheDocument();

    // Inside the modal there is a collapse button (tooltip "Collapse editor")
    const collapseButton = screen.getByRole('button', { name: /collapse editor/i });
    fireEvent.click(collapseButton);

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });
});
