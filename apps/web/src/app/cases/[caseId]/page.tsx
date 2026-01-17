import type { Case } from '@/types';

import { Card } from '@/components/ui/card';
import { api } from '@/lib/api';

async function getCase(caseId: string): Promise<Case | null> {
  try {
    return await api.get<Case>(`/api/cases/${caseId}`);
  } catch {
    return null;
  }
}

export default async function CaseDetailPage({ params }: { params: Promise<{ caseId: string }> }) {
  const { caseId } = await params;
  const caseData = await getCase(caseId);

  if (!caseData) {
    return (
      <div className="p-8">
        <Card className="p-8 text-center">
          <h2 className="mb-2 text-xl font-semibold">Case Not Found</h2>
          <p className="text-muted-foreground">
            The requested case could not be found. Make sure the backend is running.
          </p>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">{caseData.title}</h1>
        <div className="mt-2 flex gap-2">
          <span className="bg-secondary rounded px-2 py-1 text-sm">{caseData.scenario_type}</span>
          <span className="bg-secondary rounded px-2 py-1 text-sm">
            Difficulty: {caseData.difficulty}/5
          </span>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <Card className="p-6">
          <h3 className="text-muted-foreground mb-2 text-sm font-medium">Documents</h3>
          <p className="text-3xl font-bold">{caseData.document_count}</p>
        </Card>

        <Card className="p-6">
          <h3 className="text-muted-foreground mb-2 text-sm font-medium">Entities</h3>
          <p className="text-3xl font-bold">{caseData.entity_count}</p>
        </Card>

        <Card className="p-6">
          <h3 className="text-muted-foreground mb-2 text-sm font-medium">Hints Used</h3>
          <p className="text-3xl font-bold">0</p>
        </Card>

        <Card className="p-6">
          <h3 className="text-muted-foreground mb-2 text-sm font-medium">Progress</h3>
          <p className="text-3xl font-bold">0%</p>
        </Card>
      </div>

      <div className="mt-8">
        <Card className="p-6">
          <h2 className="mb-4 text-xl font-semibold">Getting Started</h2>
          <ol className="text-muted-foreground list-inside list-decimal space-y-2">
            <li>Browse the Inbox to review documents</li>
            <li>Use Search to find specific information</li>
            <li>Ask the AI Assistant for help analyzing evidence</li>
            <li>Build your case on the Evidence Board</li>
            <li>Submit your findings when ready</li>
          </ol>
        </Card>
      </div>
    </div>
  );
}
