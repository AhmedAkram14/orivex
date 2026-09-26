import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { renderWithProviders } from '@/shared/test/render-with-providers';
import { AllergyPrompt } from './allergy-prompt';

describe('AllergyPrompt', () => {
  it('lets the patient say "None known" without writing anything into allergies', async () => {
    const onChooseNone = vi.fn();
    renderWithProviders(<AllergyPrompt noneChosen={false} onChooseNone={onChooseNone} />);

    await userEvent.click(screen.getByRole('button', { name: 'None known' }));

    expect(onChooseNone).toHaveBeenCalledTimes(1);
    expect(screen.getByText(/Your doctor will confirm it at your visit/)).toBeInTheDocument();
  });

  it('keeps the save button disabled until an allergy is typed', () => {
    renderWithProviders(<AllergyPrompt noneChosen={false} onChooseNone={vi.fn()} />);
    expect(screen.getByRole('button', { name: 'Save allergies' })).toBeDisabled();
  });
});
