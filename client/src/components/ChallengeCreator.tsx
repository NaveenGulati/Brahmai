/**
 * ============================================
 * CHALLENGE CREATOR COMPONENT
 * ============================================
 * Centralized component for creating adaptive challenges
 * Reusable by: Parent, Teacher (future), Student (self-practice)
 * 
 * Features:
 * - Subject & Module selection
 * - Question count slider (10-100)
 * - Complexity slider (1-10) with live preview
 * - Focus area selection (Strengthen/Improve/Balanced)
 * - Performance insights display
 * - Duration estimation
 */

import { useState, useEffect } from 'react';
import { trpc } from '@/lib/trpc';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Badge } from '@/components/ui/badge';
import { Loader2, TrendingUp, TrendingDown, Minus, Clock, Target } from 'lucide-react';
import { toast } from 'sonner';

interface ChallengeCreatorProps {
  childId: number;
  childName: string;
  onSuccess?: (challengeId: number) => void;
  onCancel?: () => void;
  mode?: 'parent' | 'teacher' | 'student'; // For future use
}

export default function ChallengeCreator({
  childId,
  childName,
  onSuccess,
  onCancel,
  mode = 'parent',
}: ChallengeCreatorProps) {
  // tRPC utils for query invalidation
  const utils = trpc.useUtils();
  
  // Step management
  const [step, setStep] = useState(1);

  // Step 1: Subject & Module selection
  const [selectedSubject, setSelectedSubject] = useState('');
  const [selectedModule, setSelectedModule] = useState<number | null>(null);

  // Step 2: Challenge configuration
  const [questionCount, setQuestionCount] = useState(10);
  const [useComplexityBoundaries, setUseComplexityBoundaries] = useState(true);
  const [complexity, setComplexity] = useState(5);
  const [focusArea, setFocusArea] = useState<'strengthen' | 'improve' | 'balanced'>('balanced');

  // Data fetching
  const { data: subjects, isLoading: loadingSubjects } = trpc.challenge.getUniqueSubjects.useQuery();
  const { data: modules, isLoading: loadingModules } = trpc.challenge.getModulesForSubject.useQuery(
    { subject: selectedSubject },
    { enabled: !!selectedSubject }
  );
  const { data: performanceSummary } = trpc.challenge.getPerformanceSummary.useQuery(
    { childId, subject: selectedSubject },
    { enabled: !!selectedSubject }
  );
  // Static complexity definitions (instant lookup, no calculation)
  const COMPLEXITY_LEVELS: Record<number, { level: string; distribution: { easy: number; medium: number; hard: number }; description: string }> = {
    1: { level: 'Beginner', distribution: { easy: 100, medium: 0, hard: 0 }, description: '100% Easy' },
    2: { level: 'Beginner', distribution: { easy: 90, medium: 10, hard: 0 }, description: '90% Easy, 10% Medium' },
    3: { level: 'Beginner', distribution: { easy: 75, medium: 25, hard: 0 }, description: '75% Easy, 25% Medium' },
    4: { level: 'Beginner', distribution: { easy: 60, medium: 40, hard: 0 }, description: '60% Easy, 40% Medium' },
    5: { level: 'Intermediate', distribution: { easy: 50, medium: 50, hard: 0 }, description: '50% Easy, 50% Medium' },
    6: { level: 'Intermediate', distribution: { easy: 30, medium: 70, hard: 0 }, description: '30% Easy, 70% Medium' },
    7: { level: 'Intermediate', distribution: { easy: 10, medium: 90, hard: 0 }, description: '10% Easy, 90% Medium' },
    8: { level: 'Advanced', distribution: { easy: 0, medium: 75, hard: 25 }, description: '75% Medium, 25% Hard' },
    9: { level: 'Expert', distribution: { easy: 0, medium: 15, hard: 85 }, description: '15% Medium, 85% Hard' },
    10: { level: 'Expert', distribution: { easy: 0, medium: 0, hard: 100 }, description: '100% Hard' },
  };

  const complexityPreview = COMPLEXITY_LEVELS[complexity];
  const { data: estimatedDuration } = trpc.challenge.estimateChallengeDuration.useQuery(
    {
      moduleId: selectedModule || 0,
      questionCount,
      complexity,
    },
    { enabled: !!selectedModule }
  );

  // Create challenge mutation
  const createChallenge = trpc.challenge.createAdaptiveChallenge.useMutation({
    onSuccess: (data) => {
      toast.success('Challenge created successfully!');
      // Invalidate challenges query to refresh the list
      utils.parent.getPendingChallenges.invalidate();
      utils.parent.getCompletedChallenges.invalidate();
      onSuccess?.(data.challengeId);
    },
    onError: (error) => {
      toast.error(`Failed to create challenge: ${error.message}`);
    },
  });

  const handleCreateChallenge = () => {
    if (!selectedModule) {
      toast.error('Please select a module');
      return;
    }

    createChallenge.mutate({
      childId,
      moduleId: selectedModule,
      questionCount,
      complexity,
      focusArea,
      useComplexityBoundaries,
    });
  };

  const canProceedToStep2 = selectedSubject && selectedModule;

  return (
    <div className="space-y-6">
      {/* Progress indicator */}
      <div className="flex items-center justify-center gap-4">
        <div className={`flex items-center gap-2 ${step === 1 ? 'text-primary' : 'text-muted-foreground'}`}>
          <div className={`w-8 h-8 rounded-full flex items-center justify-center ${step === 1 ? 'bg-primary text-primary-foreground' : 'bg-muted'}`}>
            1
          </div>
          <span className="text-sm font-medium">Select Module</span>
        </div>
        <div className="w-12 h-0.5 bg-muted"></div>
        <div className={`flex items-center gap-2 ${step === 2 ? 'text-primary' : 'text-muted-foreground'}`}>
          <div className={`w-8 h-8 rounded-full flex items-center justify-center ${step === 2 ? 'bg-primary text-primary-foreground' : 'bg-muted'}`}>
            2
          </div>
          <span className="text-sm font-medium">Configure</span>
        </div>
        <div className="w-12 h-0.5 bg-muted"></div>
        <div className={`flex items-center gap-2 ${step === 3 ? 'text-primary' : 'text-muted-foreground'}`}>
          <div className={`w-8 h-8 rounded-full flex items-center justify-center ${step === 3 ? 'bg-primary text-primary-foreground' : 'bg-muted'}`}>
            3
          </div>
          <span className="text-sm font-medium">Review</span>
        </div>
      </div>

      {/* Step 1: Subject & Module Selection */}
      {step === 1 && (
        <Card>
          <CardHeader>
            <CardTitle>Select Subject & Module</CardTitle>
            <CardDescription>Choose what {childName} should practice</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Subject Selection */}
            <div className="space-y-2">
              <Label>Subject</Label>
              <Select value={selectedSubject} onValueChange={setSelectedSubject}>
                <SelectTrigger>
                  <SelectValue placeholder="Select subject" />
                </SelectTrigger>
                <SelectContent>
                  {loadingSubjects ? (
                    <SelectItem value="loading" disabled>
                      Loading...
                    </SelectItem>
                  ) : (
                    subjects?.map((subject) => (
                      <SelectItem key={subject} value={subject}>
                        {subject}
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>

            {/* Module Selection */}
            {selectedSubject && (
              <div className="space-y-2">
                <Label>Module/Topic</Label>
                <Select
                  value={selectedModule?.toString() || ''}
                  onValueChange={(value) => setSelectedModule(parseInt(value))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select module" />
                  </SelectTrigger>
                  <SelectContent>
                    {loadingModules ? (
                      <SelectItem value="loading" disabled>
                        Loading...
                      </SelectItem>
                    ) : (
                      modules?.map((module) => (
                        <SelectItem key={module.id} value={module.id.toString()}>
                          {module.name}
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="flex justify-between pt-4">
              <Button variant="outline" onClick={onCancel}>
                Cancel
              </Button>
              <Button onClick={() => setStep(2)} disabled={!canProceedToStep2}>
                Next
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 2: Challenge Configuration */}
      {step === 2 && (
        <div className="space-y-4">
          {/* Question Count */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Target className="w-5 h-5" />
                Number of Questions
              </CardTitle>
              <CardDescription>How many questions should this challenge have?</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <Label>Questions: {questionCount}</Label>
                  {estimatedDuration?.estimatedMinutes && (
                    <Badge variant="secondary" className="flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      ~{estimatedDuration.estimatedMinutes} min
                    </Badge>
                  )}
                </div>
                <Slider
                  value={[questionCount]}
                  onValueChange={(value) => setQuestionCount(value[0])}
                  min={10}
                  max={100}
                  step={5}
                  className="w-full"
                />
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>10 (Quick)</span>
                  <span>50 (Regular)</span>
                  <span>100 (Full)</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Adaptive Difficulty Info */}
          <Card>
            <CardHeader>
              <CardTitle>🔄 Adaptive Difficulty</CardTitle>
              <CardDescription>Questions automatically adapt to your child's performance</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="p-4 bg-muted rounded-lg space-y-2">
                <p className="text-sm font-medium">Smart Question Selection</p>
                <p className="text-sm text-muted-foreground">
                  Our adaptive algorithm analyzes your child's performance history and automatically selects questions at the optimal difficulty level. Questions will adapt in real-time based on their answers.
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Focus Area Selection */}
          <Card>
            <CardHeader>
              <CardTitle>Focus Area</CardTitle>
              <CardDescription>
                Target specific areas based on {childName}'s performance
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <RadioGroup value={focusArea} onValueChange={(value: any) => setFocusArea(value)}>
                {/* Strengthen */}
                <div className="flex items-start space-x-3 p-4 border rounded-lg hover:bg-accent cursor-pointer">
                  <RadioGroupItem value="strengthen" id="strengthen" />
                  <div className="flex-1">
                    <Label htmlFor="strengthen" className="flex items-center gap-2 cursor-pointer">
                      <TrendingUp className="w-4 h-4 text-green-600" />
                      <span className="font-medium">Strengthen Strong Areas</span>
                    </Label>
                    <p className="text-sm text-muted-foreground mt-1">
                      Focus on topics where {childName} is already performing well
                    </p>
                    {performanceSummary?.strong && performanceSummary.strong.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-2">
                        {performanceSummary.strong.slice(0, 3).map((item) => (
                          <Badge key={item.topic} variant="outline" className="text-xs">
                            {item.topic} ({item.accuracy.toFixed(0)}%)
                          </Badge>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {/* Improve Weaknesses */}
                <div className="flex items-start space-x-3 p-4 border rounded-lg hover:bg-accent cursor-pointer">
                  <RadioGroupItem value="improve" id="improve" />
                  <div className="flex-1">
                    <Label htmlFor="improve" className="flex items-center gap-2 cursor-pointer">
                      <TrendingDown className="w-4 h-4 text-orange-600" />
                      <span className="font-medium">Improve Weak Areas</span>
                    </Label>
                    <p className="text-sm text-muted-foreground mt-1">
                      Focus on topics where {childName} needs more practice
                    </p>
                    {performanceSummary?.weak && performanceSummary.weak.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-2">
                        {performanceSummary.weak.slice(0, 3).map((item) => (
                          <Badge key={item.topic} variant="outline" className="text-xs">
                            {item.topic} ({item.accuracy.toFixed(0)}%)
                          </Badge>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {/* Balanced */}
                <div className="flex items-start space-x-3 p-4 border rounded-lg hover:bg-accent cursor-pointer">
                  <RadioGroupItem value="balanced" id="balanced" />
                  <div className="flex-1">
                    <Label htmlFor="balanced" className="flex items-center gap-2 cursor-pointer">
                      <Minus className="w-4 h-4 text-blue-600" />
                      <span className="font-medium">Balanced Practice</span>
                    </Label>
                    <p className="text-sm text-muted-foreground mt-1">
                      Random mix of all topics in the selected module
                    </p>
                  </div>
                </div>
              </RadioGroup>
            </CardContent>
          </Card>

          <div className="flex justify-between">
            <Button variant="outline" onClick={() => setStep(1)}>
              Back
            </Button>
            <Button onClick={() => setStep(3)}>Next</Button>
          </div>
        </div>
      )}

      {/* Step 3: Review & Create */}
      {step === 3 && (
        <Card>
          <CardHeader>
            <CardTitle>Review Challenge</CardTitle>
            <CardDescription>Confirm the challenge details before creating</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-muted-foreground">Subject</p>
                <p className="font-medium">{selectedSubject}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Module</p>
                <p className="font-medium">
                  {modules?.find((m) => m.id === selectedModule)?.name}
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Questions</p>
                <p className="font-medium">{questionCount}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Estimated Time</p>
                <p className="font-medium">{estimatedDuration?.estimatedMinutes || '~15'} minutes</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Complexity</p>
                <p className="font-medium">
                  Level {complexity} ({complexityPreview.level})
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Focus</p>
                <p className="font-medium capitalize">{focusArea}</p>
              </div>
            </div>

            <div className="p-4 bg-muted rounded-lg">
              <p className="text-sm font-medium mb-2">Difficulty Mix:</p>
              <p className="text-sm text-muted-foreground">{complexityPreview.description}</p>
            </div>

            <div className="flex justify-between pt-4">
              <Button variant="outline" onClick={() => setStep(2)}>
                Back
              </Button>
              <Button onClick={handleCreateChallenge} disabled={createChallenge.isPending}>
                {createChallenge.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                Create Challenge
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

