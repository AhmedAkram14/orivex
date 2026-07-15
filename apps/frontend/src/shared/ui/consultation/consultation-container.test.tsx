import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { ConsultationContainer } from './consultation-container';

describe('ConsultationContainer', () => {
  it('renders left navigation, main content, and an optional right panel', () => {
    render(
      <ConsultationContainer leftNav={<p>Left nav</p>} rightPanel={<p>Right panel</p>}>
        <p>Main content</p>
      </ConsultationContainer>,
    );
    expect(screen.getByText('Left nav')).toBeInTheDocument();
    expect(screen.getByText('Main content')).toBeInTheDocument();
    expect(screen.getByText('Right panel')).toBeInTheDocument();
  });

  it('renders without a right panel when omitted, and never nests a second <main> landmark', () => {
    render(
      <main>
        <ConsultationContainer leftNav={<p>Left nav</p>}>
          <p>Main content</p>
        </ConsultationContainer>
      </main>,
    );
    expect(screen.getAllByRole('main')).toHaveLength(1);
  });
});
