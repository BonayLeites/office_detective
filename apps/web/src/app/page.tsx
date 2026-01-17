import Link from 'next/link';

import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';

export default function HomePage() {
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mx-auto max-w-4xl text-center">
        <h1 className="mb-4 text-4xl font-bold tracking-tight">Office Detective</h1>
        <p className="text-muted-foreground mb-8 text-lg">
          Solve corporate investigation cases by analyzing documents, connecting evidence, and
          uncovering the truth using AI-powered tools.
        </p>

        <div className="mb-12">
          <Link href="/cases">
            <Button size="lg">Start Investigation</Button>
          </Link>
        </div>

        <div className="grid gap-6 md:grid-cols-3">
          <Card className="p-6">
            <h3 className="mb-2 font-semibold">Analyze Documents</h3>
            <p className="text-muted-foreground text-sm">
              Browse emails, chats, invoices, and more to find crucial evidence.
            </p>
          </Card>

          <Card className="p-6">
            <h3 className="mb-2 font-semibold">AI Assistant</h3>
            <p className="text-muted-foreground text-sm">
              Ask questions and get AI-powered insights with source citations.
            </p>
          </Card>

          <Card className="p-6">
            <h3 className="mb-2 font-semibold">Build Your Case</h3>
            <p className="text-muted-foreground text-sm">
              Connect entities on the evidence board and submit your findings.
            </p>
          </Card>
        </div>
      </div>
    </div>
  );
}
