'use client';

import { AlertTriangle, Send } from 'lucide-react';
import { useState } from 'react';

import { EvidenceSelector } from './evidence-selector';

import type { Entity, PinnedItem } from '@/types';

import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';

interface SubmissionFormProps {
  entities: Entity[];
  pinnedItems: PinnedItem[];
  onSubmit: (data: SubmissionData) => Promise<void>;
  isSubmitting: boolean;
}

export interface SubmissionData {
  culpritIds: string[];
  evidenceIds: string[];
  explanation: string;
}

export function SubmissionForm({
  entities,
  pinnedItems,
  onSubmit,
  isSubmitting,
}: SubmissionFormProps) {
  const [selectedCulprits, setSelectedCulprits] = useState<Set<string>>(new Set());
  const [selectedEvidence, setSelectedEvidence] = useState<Set<string>>(new Set());
  const [explanation, setExplanation] = useState('');

  // Filter to only show person entities as potential culprits
  const personEntities = entities.filter(e => e.entity_type === 'person');

  const toggleCulprit = (id: string) => {
    setSelectedCulprits(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const toggleEvidence = (id: string) => {
    setSelectedEvidence(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const handleSubmit = async () => {
    await onSubmit({
      culpritIds: Array.from(selectedCulprits),
      evidenceIds: Array.from(selectedEvidence),
      explanation,
    });
  };

  const canSubmit =
    selectedCulprits.size > 0 &&
    selectedEvidence.size >= 1 &&
    explanation.trim().length >= 20 &&
    !isSubmitting;

  return (
    <ScrollArea className="h-full">
      <div className="space-y-8 p-6">
        {/* Warning */}
        <div className="flex items-start gap-3 rounded-lg border border-amber-300 bg-amber-50 p-4 dark:border-amber-800 dark:bg-amber-950">
          <AlertTriangle className="mt-0.5 h-5 w-5 flex-shrink-0 text-amber-600" />
          <div>
            <h3 className="font-medium text-amber-800 dark:text-amber-200">
              Ready to submit your findings?
            </h3>
            <p className="mt-1 text-sm text-amber-700 dark:text-amber-300">
              This action cannot be undone. Make sure you&apos;ve reviewed all evidence and are
              confident in your conclusion before submitting.
            </p>
          </div>
        </div>

        {/* Culprit Selection */}
        <section>
          <h2 className="mb-4 text-lg font-semibold">1. Identify the Culprit(s)</h2>
          <p className="text-muted-foreground mb-4 text-sm">
            Select the person(s) responsible for the fraudulent activity.
          </p>

          <div className="grid gap-2 sm:grid-cols-2">
            {personEntities.map(entity => {
              const isSelected = selectedCulprits.has(entity.entity_id);
              return (
                <label
                  key={entity.entity_id}
                  className={cn(
                    'flex cursor-pointer items-center gap-3 rounded-lg border p-3 transition-colors',
                    isSelected
                      ? 'border-primary bg-primary/5'
                      : 'border-border hover:border-primary/50',
                  )}
                >
                  <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={() => {
                      toggleCulprit(entity.entity_id);
                    }}
                    className="h-4 w-4 rounded border-gray-300"
                  />
                  <div>
                    <p className="font-medium">{entity.name}</p>
                    {typeof entity.attrs_json['role'] === 'string' && (
                      <p className="text-muted-foreground text-xs">{entity.attrs_json['role']}</p>
                    )}
                  </div>
                </label>
              );
            })}
          </div>

          {personEntities.length === 0 && (
            <p className="text-muted-foreground text-sm">
              No person entities found. Make sure the case has been loaded properly.
            </p>
          )}
        </section>

        {/* Evidence Selection */}
        <section>
          <h2 className="mb-4 text-lg font-semibold">2. Select Supporting Evidence</h2>
          <p className="text-muted-foreground mb-4 text-sm">
            Choose the documents and evidence that support your conclusion.
          </p>

          <EvidenceSelector
            pinnedItems={pinnedItems}
            selectedIds={selectedEvidence}
            onToggle={toggleEvidence}
            minRequired={1}
          />
        </section>

        {/* Explanation */}
        <section>
          <h2 className="mb-4 text-lg font-semibold">3. Explain Your Reasoning</h2>
          <p className="text-muted-foreground mb-4 text-sm">
            Provide a brief explanation of how the fraud was committed and how you reached your
            conclusion.
          </p>

          <Textarea
            value={explanation}
            onChange={e => {
              setExplanation(e.target.value);
            }}
            placeholder="Describe the fraud mechanism and your reasoning..."
            rows={5}
            className="resize-none"
          />
          <p className="text-muted-foreground mt-2 text-xs">
            {explanation.length}/20 characters minimum
          </p>
        </section>

        {/* Submit */}
        <section className="border-border border-t pt-6">
          <Button onClick={handleSubmit} disabled={!canSubmit} size="lg" className="w-full gap-2">
            <Send className="h-4 w-4" />
            Submit Case Solution
          </Button>

          {!canSubmit && (
            <p className="text-muted-foreground mt-2 text-center text-sm">
              {selectedCulprits.size === 0 && 'Select at least one culprit. '}
              {selectedEvidence.size < 1 && 'Select at least one piece of evidence. '}
              {explanation.trim().length < 20 && 'Explanation must be at least 20 characters.'}
            </p>
          )}
        </section>
      </div>
    </ScrollArea>
  );
}
