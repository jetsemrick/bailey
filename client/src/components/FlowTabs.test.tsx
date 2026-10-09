import { describe, expect, test, vi, afterEach } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import FlowTabs from './FlowTabs';
import type { Flow } from '../db/types';

function flow(id: string, name: string, by: 'aff' | 'neg' = 'neg'): Flow {
  return {
    id,
    user_id: 'u',
    round_id: 'r',
    position_name: name,
    initiated_by: by,
    tab_kind: 'standard',
    display_order: 0,
    created_at: '',
    updated_at: '',
  };
}

const flows = [flow('a', 'Case', 'aff'), flow('b', 'Signing Statements CP')];

function renderTabs(overrides: Partial<Parameters<typeof FlowTabs>[0]> = {}) {
  const props = {
    flows,
    activeFlowId: 'b',
    onSelect: vi.fn(),
    onAdd: vi.fn(),
    onRename: vi.fn(),
    onDelete: vi.fn(),
    onReorder: vi.fn(),
    ...overrides,
  };
  render(<FlowTabs {...props} />);
  return props;
}

afterEach(cleanup);

describe('FlowTabs', () => {
  test('renders tabs in a single non-wrapping row with truncated names', () => {
    renderTabs();
    const tablist = screen.getByRole('tablist');
    expect(tablist.className).toContain('flex-nowrap');
    expect(tablist.className).toContain('overflow-x-auto');
    const tab = screen.getByRole('tab', { name: /Signing Statements CP/ });
    expect(tab.className).toContain('whitespace-nowrap');
    expect(tab.className).toContain('shrink-0');
    expect(screen.getByText('Signing Statements CP').className).toContain('truncate');
  });

  test('exposes the full name and side on hover', () => {
    renderTabs();
    expect(screen.getByRole('tab', { name: /Signing Statements CP/ }).getAttribute('title')).toBe(
      'Signing Statements CP (Neg)'
    );
    expect(screen.getByRole('tab', { name: /Case/ }).getAttribute('title')).toBe('Case (Aff)');
  });

  test('marks the active tab selected and selects on click', () => {
    const props = renderTabs();
    expect(screen.getByRole('tab', { name: /Signing Statements CP/ }).getAttribute('aria-selected')).toBe('true');
    fireEvent.click(screen.getByRole('tab', { name: /Case/ }));
    expect(props.onSelect).toHaveBeenCalledWith('a');
  });

  test('keeps the add button outside the scrolling strip', () => {
    const props = renderTabs();
    const add = screen.getByRole('button', { name: 'Add new flow tab' });
    expect(screen.getByRole('tablist').contains(add)).toBe(false);
    fireEvent.click(add);
    expect(props.onAdd).toHaveBeenCalled();
  });
});
