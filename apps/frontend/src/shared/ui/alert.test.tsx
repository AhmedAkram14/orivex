import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { Alert } from './alert';

describe('Alert', () => {
  it('is announced as an alert region with its title and content', () => {
    render(
      <Alert variant="danger" title="Request failed">
        Please try again.
      </Alert>,
    );

    const alert = screen.getByRole('alert');
    expect(alert).toHaveTextContent('Request failed');
    expect(alert).toHaveTextContent('Please try again.');
  });
});
