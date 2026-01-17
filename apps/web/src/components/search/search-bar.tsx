'use client';

import { Loader2, Search, X } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { type KeyboardEvent, useState } from 'react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

interface SearchBarProps {
  onSearch: (query: string) => void;
  isSearching?: boolean;
  initialQuery?: string;
}

export function SearchBar({ onSearch, isSearching = false, initialQuery = '' }: SearchBarProps) {
  const t = useTranslations('search');
  const tCommon = useTranslations('common');
  const [query, setQuery] = useState(initialQuery);

  const handleSubmit = () => {
    if (query.trim()) {
      onSearch(query.trim());
    }
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleSubmit();
    }
  };

  const handleClear = () => {
    setQuery('');
  };

  return (
    <div className="flex gap-2">
      <div className="relative flex-1">
        <Search className="text-muted-foreground absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2" />
        <Input
          value={query}
          onChange={e => {
            setQuery(e.target.value);
          }}
          onKeyDown={handleKeyDown}
          placeholder={t('placeholder')}
          className="pl-9 pr-9"
          disabled={isSearching}
        />
        {query && (
          <button
            type="button"
            onClick={handleClear}
            className="text-muted-foreground hover:text-foreground absolute right-3 top-1/2 -translate-y-1/2"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>
      <Button onClick={handleSubmit} disabled={!query.trim() || isSearching}>
        {isSearching ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            {t('searching')}
          </>
        ) : (
          tCommon('search')
        )}
      </Button>
    </div>
  );
}
