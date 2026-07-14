import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { WidgetContainer } from './widget-container';

describe('WidgetContainer', () => {
  it('renders its children when not loading', () => {
    render(
      <WidgetContainer title="Quick actions">
        <p>Real content</p>
      </WidgetContainer>,
    );
    expect(screen.getByText('Real content')).toBeInTheDocument();
    expect(screen.getByText('Quick actions')).toBeInTheDocument();
  });

  it('shows a loading skeleton instead of children when loading', () => {
    render(
      <WidgetContainer title="Quick actions" loading>
        <p>Real content</p>
      </WidgetContainer>,
    );
    expect(screen.queryByText('Real content')).not.toBeInTheDocument();
    expect(document.querySelector('[aria-busy="true"]')).toBeInTheDocument();
  });
});
