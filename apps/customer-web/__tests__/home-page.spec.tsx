import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import React from 'react';

vi.mock('next-intl', () => ({
  useLocale: () => 'en',
  useTranslations: () => (key: string) => key,
}));

const mockReplace = vi.fn();
vi.mock('@/i18n/routing', () => ({
  useRouter: () => ({
    replace: mockReplace,
    push: vi.fn(),
    prefetch: vi.fn(),
  }),
}));

import LocaleRoot from '../app/[locale]/page';

describe('Customer Web Home Page (LocaleRoot Splash)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    Storage.prototype.getItem = vi.fn(() => null);
  });

  it('renders LOOKIVA brand and loading dots on mount', () => {
    render(<LocaleRoot />);

    expect(screen.getByText('LOOKIVA')).toBeInTheDocument();
    expect(screen.getByText(/Premium Beauty & Wellness Nearby/)).toBeInTheDocument();
  });

  it('redirects to /language when language has not been chosen', () => {
    Storage.prototype.getItem = vi.fn((key: string) => {
      if (key === 'lookiva-access') return 'some-token';
      if (key === 'lookiva-onboarding-complete') return '1';
      return null;
    });

    render(<LocaleRoot />);

    act(() => {
      vi.advanceTimersByTime(1000);
    });

    expect(mockReplace).toHaveBeenCalledWith('/language');
  });

  it('redirects to /onboarding when language picked but onboarding not complete', () => {
    Storage.prototype.getItem = vi.fn((key: string) => {
      if (key === 'lookiva-access') return 'some-token';
      if (key === 'lookiva-language-chosen') return '1';
      return null;
    });

    render(<LocaleRoot />);

    act(() => {
      vi.advanceTimersByTime(1000);
    });

    expect(mockReplace).toHaveBeenCalledWith('/onboarding');
  });

  it('redirects to /home when onboarding and language are complete', () => {
    Storage.prototype.getItem = vi.fn((key: string) => {
      if (key === 'lookiva-access') return 'some-token';
      if (key === 'lookiva-onboarding-complete') return '1';
      if (key === 'lookiva-language-chosen') return '1';
      return null;
    });

    render(<LocaleRoot />);

    act(() => {
      vi.advanceTimersByTime(1000);
    });

    expect(mockReplace).toHaveBeenCalledWith('/home');
  });
});
