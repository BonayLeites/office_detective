'use client';

import { FileText, MessageSquare, Search } from 'lucide-react';
import Link from 'next/link';

import { Button } from '@/components/ui/button';

interface EmptyBoardStateProps {
  caseId: string;
  onSuggestionClick: (query: string) => void;
}

const SUGGESTIONS = ['Marcus', 'Sunshine', 'invoice', 'approval', 'vendor'];

export function EmptyBoardState({ caseId, onSuggestionClick }: EmptyBoardStateProps) {
  return (
    <div className="bg-muted/30 flex h-full items-center justify-center">
      <div className="max-w-md text-center">
        <div className="mb-4 text-4xl">🔍</div>
        <h2 className="mb-2 text-xl font-semibold">Tu tablero de investigación</h2>
        <p className="text-muted-foreground mb-6">
          Busca personas o documentos para comenzar. Marca sospechosos y recopila evidencia.
        </p>

        <div className="mb-6">
          <p className="mb-2 text-sm font-medium">Prueba buscar:</p>
          <div className="flex flex-wrap justify-center gap-2">
            {SUGGESTIONS.map(s => (
              <Button
                key={s}
                variant="outline"
                size="sm"
                onClick={() => {
                  onSuggestionClick(s);
                }}
              >
                {s}
              </Button>
            ))}
          </div>
        </div>

        <div className="flex justify-center gap-3">
          <Link href={`/cases/${caseId}/inbox`}>
            <Button variant="ghost" size="sm" className="gap-2">
              <FileText className="h-4 w-4" />
              Ver Inbox
            </Button>
          </Link>
          <Link href={`/cases/${caseId}/chat`}>
            <Button variant="ghost" size="sm" className="gap-2">
              <MessageSquare className="h-4 w-4" />
              Preguntar a ARIA
            </Button>
          </Link>
          <Link href={`/cases/${caseId}/search`}>
            <Button variant="ghost" size="sm" className="gap-2">
              <Search className="h-4 w-4" />
              Buscar
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
