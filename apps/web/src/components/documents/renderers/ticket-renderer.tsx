import type { DocumentWithChunks } from '@/types';

import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

interface TicketRendererProps {
  document: DocumentWithChunks;
}

interface TicketData {
  ticketNumber?: string;
  status?: string;
  priority?: string;
  submitted?: string;
  requester?: string;
  category?: string;
  subject?: string;
  description?: string;
  resolution?: string;
  resolvedBy?: string;
  resolutionDate?: string;
}

export function TicketRenderer({ document }: TicketRendererProps) {
  const ticket = parseTicket(document.body);

  // If parsing failed, show raw content
  if (!ticket.ticketNumber && !ticket.subject) {
    return (
      <div className="prose prose-sm dark:prose-invert max-w-none">
        <pre className="whitespace-pre-wrap font-mono text-sm">{document.body}</pre>
      </div>
    );
  }

  const statusVariant = ticket.status?.toLowerCase().includes('resolved')
    ? 'default'
    : ticket.status?.toLowerCase().includes('pending')
      ? 'secondary'
      : 'outline';

  const priorityColor = ticket.priority?.toLowerCase().includes('high')
    ? 'text-red-600'
    : ticket.priority?.toLowerCase().includes('normal')
      ? 'text-yellow-600'
      : 'text-green-600';

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="bg-muted/50 rounded-lg p-4">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <code className="text-primary text-sm font-semibold">{ticket.ticketNumber}</code>
          <div className="flex items-center gap-2">
            {ticket.status && (
              <Badge variant={statusVariant}>{ticket.status.replace('✓', '').trim()}</Badge>
            )}
            {ticket.priority && (
              <span className={cn('text-xs font-medium', priorityColor)}>{ticket.priority}</span>
            )}
          </div>
        </div>

        <div className="grid gap-2 text-sm">
          {ticket.submitted && (
            <div className="flex gap-2">
              <span className="text-muted-foreground w-20 shrink-0">Submitted:</span>
              <span>{ticket.submitted}</span>
            </div>
          )}
          {ticket.requester && (
            <div className="flex gap-2">
              <span className="text-muted-foreground w-20 shrink-0">Requester:</span>
              <span className="font-medium">{ticket.requester}</span>
            </div>
          )}
          {ticket.category && (
            <div className="flex gap-2">
              <span className="text-muted-foreground w-20 shrink-0">Category:</span>
              <Badge variant="outline" className="font-normal">
                {ticket.category}
              </Badge>
            </div>
          )}
        </div>
      </div>

      {/* Subject & Description */}
      <div className="space-y-2">
        {ticket.subject && <h3 className="text-lg font-semibold">{ticket.subject}</h3>}
        {ticket.description && (
          <p className="text-muted-foreground text-sm leading-relaxed">{ticket.description}</p>
        )}
      </div>

      {/* Resolution */}
      {ticket.resolution && (
        <div className="border-primary/20 bg-primary/5 rounded-lg border-l-4 p-4">
          <div className="mb-2 flex items-center gap-2">
            <span className="text-primary text-sm font-semibold">Resolution</span>
            {ticket.resolutionDate && (
              <span className="text-muted-foreground text-xs">({ticket.resolutionDate})</span>
            )}
          </div>
          <p className="text-sm">{ticket.resolution}</p>
          {ticket.resolvedBy && (
            <p className="text-muted-foreground mt-2 text-xs">Resolved by: {ticket.resolvedBy}</p>
          )}
        </div>
      )}
    </div>
  );
}

function parseTicket(body: string): TicketData {
  const ticket: TicketData = {};

  // Remove box-drawing characters and clean up lines
  const lines = body
    .split('\n')
    .map(line => line.replace(/[┌┐└┘├┤─│]/g, '').trim())
    .filter(line => line.length > 0);

  let inDescription = false;
  let inResolution = false;
  const descriptionLines: string[] = [];
  const resolutionLines: string[] = [];

  for (const line of lines) {
    // Skip system header
    if (line.includes('SUPPORT SYSTEM')) continue;

    // Check for field patterns
    const ticketMatch = /^Ticket\s*#?:?\s*(.+)$/i.exec(line);
    if (ticketMatch?.[1]) {
      ticket.ticketNumber = ticketMatch[1].trim();
      continue;
    }

    const statusMatch = /^Status:?\s*(.+)$/i.exec(line);
    if (statusMatch?.[1]) {
      ticket.status = statusMatch[1].trim();
      continue;
    }

    const priorityMatch = /^Priority:?\s*(.+)$/i.exec(line);
    if (priorityMatch?.[1]) {
      ticket.priority = priorityMatch[1].trim();
      continue;
    }

    const submittedMatch = /^Submitted:?\s*(.+)$/i.exec(line);
    if (submittedMatch?.[1]) {
      ticket.submitted = submittedMatch[1].trim();
      continue;
    }

    const requesterMatch = /^Requester:?\s*(.+)$/i.exec(line);
    if (requesterMatch?.[1]) {
      ticket.requester = requesterMatch[1].trim();
      continue;
    }

    const categoryMatch = /^Category:?\s*(.+)$/i.exec(line);
    if (categoryMatch?.[1]) {
      ticket.category = categoryMatch[1].trim();
      continue;
    }

    const subjectMatch = /^Subject:?\s*(.+)$/i.exec(line);
    if (subjectMatch?.[1]) {
      ticket.subject = subjectMatch[1].trim();
      inDescription = false;
      continue;
    }

    // Check for section markers
    if (/^Description:?$/i.test(line)) {
      inDescription = true;
      inResolution = false;
      continue;
    }

    const resolutionHeaderMatch = /^RESOLUTION\s*\(([^)]+)\)/i.exec(line);
    if (resolutionHeaderMatch?.[1]) {
      ticket.resolutionDate = resolutionHeaderMatch[1];
      inDescription = false;
      inResolution = true;
      continue;
    }

    const resolvedByMatch = /^Resolved\s+by:?\s*(.+)$/i.exec(line);
    if (resolvedByMatch?.[1]) {
      ticket.resolvedBy = resolvedByMatch[1].trim();
      continue;
    }

    // Accumulate content
    if (inDescription) {
      descriptionLines.push(line);
    } else if (inResolution) {
      resolutionLines.push(line);
    }
  }

  ticket.description = descriptionLines.join(' ').trim();
  ticket.resolution = resolutionLines
    .filter(l => !l.toLowerCase().startsWith('resolved by'))
    .join(' ')
    .trim();

  return ticket;
}
