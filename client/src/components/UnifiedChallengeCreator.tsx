/**
 * ============================================
 * UNIFIED CHALLENGE CREATOR
 * ============================================
 * Wrapper component that allows parents to choose between:
 * - Simple Challenge (single module)
 * - Advanced Challenge (multiple topics)
 */

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Sparkles, Target } from 'lucide-react';
import ChallengeCreator from './ChallengeCreator';
import AdvancedChallengeCreator from './AdvancedChallengeCreator';

interface UnifiedChallengeCreatorProps {
  childId: number;
  childName: string;
  onSuccess?: (challengeId: number) => void;
  onCancel?: () => void;
}

export default function UnifiedChallengeCreator({
  childId,
  childName,
  onSuccess,
  onCancel,
}: UnifiedChallengeCreatorProps) {
  const [challengeType, setChallengeType] = useState<'simple' | 'advanced' | null>(null);

  // If type not selected, show selection screen
  if (!challengeType) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Create Challenge for {childName}</CardTitle>
          <CardDescription>
            Choose the type of challenge you want to create
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <RadioGroup value={challengeType || ''} onValueChange={(value: any) => setChallengeType(value)}>
            {/* Simple Challenge Option */}
            <div className="relative">
              <div className="flex items-start space-x-3 p-4 border-2 rounded-lg hover:border-primary/50 transition-colors cursor-pointer">
                <RadioGroupItem value="simple" id="simple" className="mt-1" />
                <div className="flex-1">
                  <Label htmlFor="simple" className="cursor-pointer">
                    <div className="flex items-center gap-2 mb-1">
                      <Target className="w-5 h-5" />
                      <span className="font-semibold text-base">Simple Challenge</span>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Focus on a single module or topic. Perfect for targeted practice and mastery of specific concepts.
                    </p>
                    <div className="mt-2 flex flex-wrap gap-2">
                      <span className="text-xs bg-muted px-2 py-1 rounded">Single module</span>
                      <span className="text-xs bg-muted px-2 py-1 rounded">10-100 questions</span>
                      <span className="text-xs bg-muted px-2 py-1 rounded">Complexity control</span>
                    </div>
                  </Label>
                </div>
              </div>
            </div>

            {/* Advanced Challenge Option */}
            <div className="relative">
              <div className="flex items-start space-x-3 p-4 border-2 rounded-lg hover:border-primary/50 transition-colors cursor-pointer">
                <RadioGroupItem value="advanced" id="advanced" className="mt-1" />
                <div className="flex-1">
                  <Label htmlFor="advanced" className="cursor-pointer">
                    <div className="flex items-center gap-2 mb-1">
                      <Sparkles className="w-5 h-5 text-primary" />
                      <span className="font-semibold text-base">Advanced Challenge</span>
                      <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full font-medium">
                        NEW
                      </span>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Mix multiple topics across subjects. Questions are adaptively mixed for comprehensive assessment.
                    </p>
                    <div className="mt-2 flex flex-wrap gap-2">
                      <span className="text-xs bg-primary/10 text-primary px-2 py-1 rounded">Up to 10 topics</span>
                      <span className="text-xs bg-primary/10 text-primary px-2 py-1 rounded">Cross-subject</span>
                      <span className="text-xs bg-primary/10 text-primary px-2 py-1 rounded">Adaptive mixing</span>
                      <span className="text-xs bg-primary/10 text-primary px-2 py-1 rounded">Smart distribution</span>
                    </div>
                  </Label>
                </div>
              </div>
            </div>
          </RadioGroup>

          <div className="flex justify-end">
            <button
              onClick={onCancel}
              className="text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              Cancel
            </button>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Render selected challenge type
  if (challengeType === 'simple') {
    return (
      <ChallengeCreator
        childId={childId}
        childName={childName}
        onSuccess={onSuccess}
        onCancel={() => setChallengeType(null)}
      />
    );
  }

  if (challengeType === 'advanced') {
    return (
      <AdvancedChallengeCreator
        childId={childId}
        childName={childName}
        onSuccess={onSuccess}
        onCancel={() => setChallengeType(null)}
      />
    );
  }

  return null;
}
