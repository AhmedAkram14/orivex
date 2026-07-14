import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { FeatureGuard } from './feature-guard';

describe('FeatureGuard', () => {
  it('renders children when the flag resolves to true', () => {
    render(
      <FeatureGuard flag="new-thing" defaultValue>
        <span>New feature</span>
      </FeatureGuard>,
    );
    expect(screen.getByText('New feature')).toBeInTheDocument();
  });

  it('renders the fallback when the flag resolves to false (the default)', () => {
    render(
      <FeatureGuard flag="new-thing" fallback={<span>Hidden</span>}>
        <span>New feature</span>
      </FeatureGuard>,
    );
    expect(screen.getByText('Hidden')).toBeInTheDocument();
    expect(screen.queryByText('New feature')).not.toBeInTheDocument();
  });
});
