import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { WaitingQueue } from './waiting-queue';

describe('WaitingQueue', () => {
  it('shows the empty state when isEmpty', () => {
    render(<WaitingQueue title="Waiting queue" emptyTitle="No one waiting" isEmpty items={[]} />);
    expect(screen.getByText('No one waiting')).toBeInTheDocument();
  });

  it('renders the provided items instead of the empty state when not empty', () => {
    render(
      <WaitingQueue
        title="Waiting queue"
        emptyTitle="No one waiting"
        isEmpty={false}
        items={[<li key="1">Patient #1</li>]}
      />,
    );
    expect(screen.getByText('Patient #1')).toBeInTheDocument();
    expect(screen.queryByText('No one waiting')).not.toBeInTheDocument();
  });
});
