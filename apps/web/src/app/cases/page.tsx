import Link from 'next/link';

import type { Case } from '@/types';

import { Card } from '@/components/ui/card';
import { api } from '@/lib/api';

async function getCases(): Promise<Case[]> {
  try {
    const response = await api.get<{ cases: Case[]; total: number }>('/api/cases');
    return response.cases;
  } catch {
    // Return empty array if API is not available
    return [];
  }
}

export default async function CasesPage() {
  const cases = await getCases();

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Investigation Cases</h1>
        <p className="text-muted-foreground">Select a case to begin your investigation</p>
      </div>

      {cases.length === 0 ? (
        <Card className="p-8 text-center">
          <p className="text-muted-foreground">
            No cases available yet. Start the backend server and create your first case.
          </p>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {cases.map(c => (
            <Link key={c.case_id} href={`/cases/${c.case_id}`}>
              <Card className="p-6 transition-shadow hover:shadow-lg">
                <h3 className="mb-2 font-semibold">{c.title}</h3>
                <div className="mb-4 flex gap-2">
                  <span className="bg-secondary rounded px-2 py-1 text-xs">{c.scenario_type}</span>
                  <span className="bg-secondary rounded px-2 py-1 text-xs">
                    Difficulty: {c.difficulty}/5
                  </span>
                </div>
                <div className="text-muted-foreground text-sm">
                  <p>{c.document_count} documents</p>
                  <p>{c.entity_count} entities</p>
                </div>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
