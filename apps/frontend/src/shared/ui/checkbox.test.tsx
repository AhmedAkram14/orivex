import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { Checkbox } from './checkbox';

describe('Checkbox', () => {
  it('toggles checked state via keyboard, not just mouse', async () => {
    render(<Checkbox aria-label="Acknowledge suggestion" />);
    const checkbox = screen.getByRole('checkbox', { name: 'Acknowledge suggestion' });

    expect(checkbox).toHaveAttribute('aria-checked', 'false');

    checkbox.focus();
    await userEvent.keyboard(' ');
    expect(checkbox).toHaveAttribute('aria-checked', 'true');
  });

  it('cannot be toggled when disabled', async () => {
    render(<Checkbox aria-label="Disabled option" disabled />);
    const checkbox = screen.getByRole('checkbox', { name: 'Disabled option' });

    await userEvent.click(checkbox);
    expect(checkbox).toHaveAttribute('aria-checked', 'false');
  });
});
