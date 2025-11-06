/**
 * ============================================
 * CHALLENGE CREATOR V2 - Focus Area Based
 * ============================================
 * Simplified challenge creation with Focus Areas
 * 
 * Features:
 * - Subject & Module selection
 * - Question count slider (10-100)
 * - Focus Area selection (Strengthen/Improve/Balanced)
 * - Duration estimation
 */

import React, { useState } from 'react';
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
import { Loader2, TrendingUp, TrendingDown, Minus, Clock, Target, Sparkles } from 'lucide-react';
import { toast } from 'sonner';

interface ChallengeCreatorProps {
  childId: number;
  childName: string;
  onSuccess?: (challengeId: number) => void;
  onCancel?: () => void;
}

type FocusArea = 'strengthen' | 'improve' | 'balanced';

export default function ChallengeCreatorV2({
  childId,
  childName,
  onSuccess,
  onCancel,
}: ChallengeCreatorProps) {
  // tRPC utils for query invalidation
  const utils = trpc.useUtils();
  
  // Step management
  const [step, setStep] = useState(1);

  // Step 1: Subject & Module selection
  const [selectedSubject, setSelectedSubject] = useState('');
  const [selectedModule, setSelectedModule] = useState<number | null>(null);

  // Step 2: Challenge configuration
  const [questionCount, setQuestionCount] = useState(20);
  const [focusArea, setFocusArea] = useState<FocusArea>('balanced');

  // Data fetching
  const { data: subjects, isLoading: loadingSubjects} = trpc.parent.getUniqueSubjects.useQuery();
  const { data: modules, isLoading: loadingModules } = trpc.parent.getModulesForSubject.useQuery(
    { subject: selectedSubject },
    { enabled: !!selectedSubject }
  );

  // Estimate duration (simple calculation: 1 min per question)
  const estimatedDuration = questionCount;

  // Create challenge mutation
  const createChallenge = trpc.parent.createAdaptiveChallenge.useMutation({
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
      focusArea,
    });
  };

  const canProceedToStep2 = selectedSubject && selectedModule;

  // Focus Area descriptions
  const focusAreaInfo = {
    strengthen: {
      icon: TrendingUp,
      color: 'text-green-600',
      bgColor: 'bg-green-50',
      borderColor: 'border-green-200',
      title: 'Strengthen',
      description: `Focus on topics where ${childName} is already performing well (>70% accuracy). Builds confidence and deepens mastery.`,
      badge: 'Best for: Exam prep, gifted students',
    },
    improve: {
      icon: TrendingDown,
      color: 'text-orange-600',
      bgColor: 'bg-orange-50',
      borderColor: 'border-orange-200',
      title: 'Improve',
      description: `Focus on topics where ${childName} needs more practice (<60% accuracy). Builds foundation and fills knowledge gaps.`,
      badge: 'Best for: Remedial learning, struggling topics',
    },
    balanced: {
      icon: Minus,
      color: 'text-blue-600',
      bgColor: 'bg-blue-50',
      borderColor: 'border-blue-200',
      title: 'Balanced',
      description: `Random mix of all topics with adaptive difficulty. Comprehensive assessment across the entire module.`,
      badge: 'Best for: General practice, exploration',
    },
  };

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
                  <Badge variant="secondary" className="flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    ~{estimatedDuration} min
                  </Badge>
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
                  <span>50 (Standard)</span>
                  <span>100 (Comprehensive)</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Focus Area Selection */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Sparkles className="w-5 h-5" />
                Focus Area
              </CardTitle>
              <CardDescription>
                What should this quiz focus on? The adaptive algorithm will adjust difficulty automatically.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <RadioGroup value={focusArea} onValueChange={(value: FocusArea) => setFocusArea(value)}>
                <div className="space-y-3">
                  {(Object.keys(focusAreaInfo) as FocusArea[]).map((area) => {
                    const info = focusAreaInfo[area];
                    const Icon = info.icon;
                    const isSelected = focusArea === area;
                    
                    return (
                      <div
                        key={area}
                        className={`flex items-start space-x-3 p-4 border-2 rounded-lg cursor-pointer transition-all ${
                          isSelected 
                            ? `${info.bgColor} ${info.borderColor}` 
                            : 'border-gray-200 hover:bg-accent'
                        }`}
                        onClick={() => setFocusArea(area)}
                      >
                        <RadioGroupItem value={area} id={area} />
                        <div className="flex-1">
                          <Label htmlFor={area} className="cursor-pointer font-semibold flex items-center gap-2">
                            <Icon className={`w-4 h-4 ${info.color}`} />
                            {info.title}
                          </Label>
                          <p className="text-sm text-muted-foreground mt-1">
                            {info.description}
                          </p>
                          <Badge variant="secondary" className="mt-2">{info.badge}</Badge>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </RadioGroup>
            </CardContent>
          </Card>

          <div className="flex justify-between pt-4">
            <Button variant="outline" onClick={() => setStep(1)}>
              Back
            </Button>
            <Button onClick={() => setStep(3)}>
              Next
            </Button>
          </div>
        </div>
      )}

      {/* Step 3: Review & Create */}
      {step === 3 && (
        <Card>
          <CardHeader>
            <CardTitle>Review Challenge</CardTitle>
            <CardDescription>Confirm the details before creating the challenge</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Summary */}
            <div className="space-y-3">
              <div className="flex justify-between py-2 border-b">
                <span className="text-muted-foreground">Student:</span>
                <span className="font-medium">{childName}</span>
              </div>
              <div className="flex justify-between py-2 border-b">
                <span className="text-muted-foreground">Subject:</span>
                <span className="font-medium">{selectedSubject}</span>
              </div>
              <div className="flex justify-between py-2 border-b">
                <span className="text-muted-foreground">Module:</span>
                <span className="font-medium">
                  {modules?.find(m => m.id === selectedModule)?.name}
                </span>
              </div>
              <div className="flex justify-between py-2 border-b">
                <span className="text-muted-foreground">Questions:</span>
                <span className="font-medium">{questionCount}</span>
              </div>
              <div className="flex justify-between py-2 border-b">
                <span className="text-muted-foreground">Estimated Time:</span>
                <span className="font-medium flex items-center gap-1">
                  <Clock className="w-4 h-4" />
                  ~{estimatedDuration} minutes
                </span>
              </div>
              <div className="flex justify-between py-2 border-b">
                <span className="text-muted-foreground">Focus Area:</span>
                <span className="font-medium capitalize flex items-center gap-2">
                  {React.createElement(focusAreaInfo[focusArea].icon, { 
                    className: `w-4 h-4 ${focusAreaInfo[focusArea].color}` 
                  })}
                  {focusArea}
                </span>
              </div>
            </div>

            {/* Adaptive Quiz Info */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex items-start gap-2">
                <Sparkles className="w-5 h-5 text-blue-600 mt-0.5" />
                <div>
                  <h4 className="font-semibold text-blue-900">AI-Powered Adaptive Quiz</h4>
                  <p className="text-sm text-blue-700 mt-1">
                    The quiz will automatically adjust difficulty based on {childName}'s performance,
                    keeping them in the optimal learning zone - challenging but achievable.
                  </p>
                </div>
              </div>
            </div>

            <div className="flex justify-between pt-4">
              <Button variant="outline" onClick={() => setStep(2)}>
                Back
              </Button>
              <Button 
                onClick={handleCreateChallenge} 
                disabled={createChallenge.isPending}
              >
                {createChallenge.isPending ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Creating...
                  </>
                ) : (
                  'Create Challenge'
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
