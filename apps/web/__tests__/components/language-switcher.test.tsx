import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi, beforeEach } from 'vitest';

// Mock next-intl
vi.mock('next-intl', () => ({
  useLocale: vi.fn(() => 'en'),
}));

// Mock i18n navigation
const mockReplace = vi.fn();
vi.mock('@/i18n/navigation', () => ({
  useRouter: () => ({
    replace: mockReplace,
  }),
  usePathname: () => '/cases',
}));

import { LanguageSwitcher } from '@/components/layout/language-switcher';

describe('LanguageSwitcher', () => {
  beforeEach(() => {
    mockReplace.mockClear();
  });

  it('renders a select with language options', () => {
    render(<LanguageSwitcher />);

    const select = screen.getByRole('combobox', { name: 'Select language' });
    expect(select).toBeInTheDocument();

    // Check options exist
    expect(screen.getByRole('option', { name: 'English' })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'Español' })).toBeInTheDocument();
  });

  it('shows current locale as selected', () => {
    render(<LanguageSwitcher />);

    const select = screen.getByRole('combobox');
    expect(select).toHaveValue('en');
  });

  it('calls router.replace when language is changed', async () => {
    const user = userEvent.setup();
    render(<LanguageSwitcher />);

    const select = screen.getByRole('combobox');
    await user.selectOptions(select, 'es');

    expect(mockReplace).toHaveBeenCalledWith('/cases', { locale: 'es' });
  });

  it('has correct number of locale options', () => {
    render(<LanguageSwitcher />);

    const options = screen.getAllByRole('option');
    expect(options).toHaveLength(2); // en, es
  });
});
