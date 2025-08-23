import { render, screen, fireEvent } from '@testing-library/react';
import App from './App';
import { describe, it, expect, vi } from 'vitest';

// Mocking the Monaco Editor component
vi.mock('@monaco-editor/react', () => ({
  __esModule: true,
  default: ({ value, onChange }) => <textarea data-testid="monaco-editor" value={value} onChange={e => onChange(e.target.value)} />,
  DiffEditor: ({ original, modified }) => (
    <div>
      <textarea data-testid="diff-editor-original" defaultValue={original} />
      <textarea data-testid="diff-editor-modified" defaultValue={modified} />
    </div>
  ),
}));

// Mocking the Split component
vi.mock('react-split', () => ({
    __esModule: true,
    default: ({ children }) => <div>{children}</div>
}));

describe('App', () => {
  it('renders the main application layout', () => {
    render(<App />);
    expect(screen.getByText('BasedSyntax')).toBeInTheDocument();
    expect(screen.getByText('Output')).toBeInTheDocument();
  });

  it('changes language and updates editor content', () => {
    render(<App />);
    const languageSelect = screen.getByRole('combobox');
    fireEvent.change(languageSelect, { target: { value: 'python' } });
    expect(languageSelect.value).toBe('python');
    const editor = screen.getByTestId('monaco-editor');
    expect(editor.value).toContain('def fib(n):');
  });

  it('updates editor stats on change', () => {
    render(<App />);
    const editor = screen.getByTestId('monaco-editor');
    fireEvent.change(editor, { target: { value: 'hello world' } });
    expect(screen.getByText(/11 chars/)).toBeInTheDocument();
    expect(screen.getByText(/1 lines/)).toBeInTheDocument();
  });
});
