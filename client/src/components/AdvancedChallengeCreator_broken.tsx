/**
 * ============================================
 * ADVANCED CHALLENGE CREATOR COMPONENT
 * ============================================
 * Multi-topic challenge creation with adaptive mixing
 * 
 * Features:
 * - Select up to 10 topics across multiple subjects
 * - Choose all subtopics or specific ones
 * - Smart question count suggestions
 * - Real-time distribution preview
 * - Adaptive question mixing (not sequential)
 * - Graceful degradation for insufficient questions
 */

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Checkbox } from '@/components/ui/checkbox';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import {
  Loader2,
  ChevronDown,
  ChevronRight,
  Plus,
  X,
  Sparkles,
  Clock,
  AlertCircle,
  CheckCircle2,
} from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface TopicSelection {
  subject: string;
  topic: string;
  subtopics: string[] | 'all';
}

interface AvailableTopic {
  topic: string;
  description: string;
  totalQuestions: number;
  subtopics: Array<{
    name: string;
    questionCount: number;
  }>;
}

interface DistributionItem {
  subject: string;
  topic: string;
  subtopics: string[] | 'all';
  allocated: number;
  percentage: number;
  byDifficulty: {
    easy: number;
    medium: number;
    hard: number;
  };
}

interface AdvancedChallengeCreatorProps {
  childId: number;
  childName: string;
  onSuccess?: (challengeId: number) => void;
  onCancel?: () => void;
}

export default function AdvancedChallengeCreator({
  childId,
  childName,
  onSuccess,
  onCancel,
}: AdvancedChallengeCreatorProps) {
  // Step management
  const [step, setStep] = useState(1);

  // Topic selection state
  const [availableTopics, setAvailableTopics] = useState<Record<string, AvailableTopic[]>>({});
  const [loadingTopics, setLoadingTopics] = useState(true);
  const [selections, setSelections] = useState<TopicSelection[]>([]);
  const [expandedSubjects, setExpandedSubjects] = useState<Set<string>>(new Set());
  const [expandedTopics, setExpandedTopics] = useState<Set<string>>(new Set());

  // Configuration state
  const [totalQuestions, setTotalQuestions] = useState(30);
  const [focusArea, setFocusArea] = useState<'strengthen' | 'balanced' | 'improve'>('balanced');
  const [suggestion, setSuggestion] = useState<any>(null);
  const [distribution, setDistribution] = useState<DistributionItem[]>([]);
  const [loadingPreview, setLoadingPreview] = useState(false);

  // Challenge creation state
  const [creating, setCreating] = useState(false);

  // Fetch available topics on mount
  useEffect(() => {
    fetchAvailableTopics();
  }, [childId]);

  // Calculate dynamic min/max for slider
  const minQuestions = Math.max(selections.length * 3, 9); // 3 per topic, minimum 9
  const maxQuestions = 100;

  const fetchAvailableTopics = async () => {
    try {
      setLoadingTopics(true);
      const response = await fetch(`/api/advanced-challenge/available-topics?childId=${childId}`);
      const data = await response.json();
      
      if (data.success) {
        setAvailableTopics(data.data);
      } else {
        toast.error('Failed to load topics');
      }
    } catch (error) {
      console.error('Error fetching topics:', error);
      toast.error('Failed to load topics');
    } finally {
      setLoadingTopics(false);
    }
  };

  const fetchPreview = async () => {
    try {
      setLoadingPreview(true);
      const response = await fetch('/api/advanced-challenge/preview', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          selections,
          totalQuestions,
          focusArea,
        }),
      });
      
      const data = await response.json();
      
      if (data.success) {
        setSuggestion({
          recommended: data.suggestedTotal,
          minimum: Math.ceil(selections.length * 3),
          maximum: data.actualTotal
        });
        setDistribution(data.distribution);
        
        // Auto-adjust to recommended if first time
        if (!totalQuestions && data.suggestedTotal) {
          setTotalQuestions(data.suggestedTotal);
        }
      } else {
        toast.error('Failed to preview distribution');
      }
    } catch (error) {
      console.error('Error fetching preview:', error);
      toast.error('Failed to preview distribution');
    } finally {
      setLoadingPreview(false);
    }
  };

  const handleCreateChallenge = async () => {
    try {
      setCreating(true);
      const response = await fetch('/api/advanced-challenge/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          childId,
          selections,
          totalQuestions,
          focusArea,
          title: generateTitle(),
          message: `Good luck, ${childName}!`,
        }),
      });
      
      const data = await response.json();
      
      if (data.success) {
        toast.success(data.data.message);
        onSuccess?.(data.data.challengeId);
      } else {
        toast.error(data.error || 'Failed to create challenge');
      }
    } catch (error) {
      console.error('Error creating challenge:', error);
      toast.error('Failed to create challenge');
    } finally {
      setCreating(false);
    }
  };

  const generateTitle = () => {
    if (selections.length === 1) {
      return `${selections[0].topic} Challenge`;
    } else if (selections.length === 2) {
      return `${selections[0].topic} & ${selections[1].topic}`;
    } else {
      const subjects = [...new Set(selections.map(s => s.subject))];
      if (subjects.length === 1) {
        return `${subjects[0]} - ${selections.length} Topics`;
      } else {
        return `Multi-Subject Challenge - ${selections.length} Topics`;
      }
    }
  };

  const toggleSubject = (subject: string) => {
    const newExpanded = new Set(expandedSubjects);
    if (newExpanded.has(subject)) {
      newExpanded.delete(subject);
    } else {
      newExpanded.add(subject);
    }
    setExpandedSubjects(newExpanded);
  };

  const toggleTopic = (subject: string, topic: string) => {
    const key = `${subject}:${topic}`;
    const newExpanded = new Set(expandedTopics);
    if (newExpanded.has(key)) {
      newExpanded.delete(key);
    } else {
      newExpanded.add(key);
    }
    setExpandedTopics(newExpanded);
  };

  const isTopicSelected = (subject: string, topic: string) => {
    return selections.some(s => s.subject === subject && s.topic === topic);
  };

  const getTopicSelection = (subject: string, topic: string) => {
    return selections.find(s => s.subject === subject && s.topic === topic);
  };

  const toggleTopicSelection = (subject: string, topic: string, subtopics: string[]) => {
    const existing = getTopicSelection(subject, topic);
    
    if (existing) {
      // Remove selection
      setSelections(selections.filter(s => !(s.subject === subject && s.topic === topic)));
    } else {
      // Add selection (check max limit)
      if (selections.length >= 10) {
        toast.error('Maximum 10 topics allowed');
        return;
      }
      setSelections([...selections, { subject, topic, subtopics: 'all' }]);
    }
  };

  const updateSubtopicSelection = (subject: string, topic: string, subtopics: string[] | 'all') => {
    setSelections(selections.map(s => 
      (s.subject === subject && s.topic === topic)
        ? { ...s, subtopics }
        : s
    ));
  };

  const removeSelection = (index: number) => {
    setSelections(selections.filter((_, i) => i !== index));
  };

  const canProceedToStep2 = selections.length > 0;
  const canProceedToStep3 = totalQuestions >= (suggestion?.minimum || 3);

  return (
    <div className="space-y-6">
      {/* Progress indicator */}
      <div className="flex items-center justify-center gap-4">
        <div className={`flex items-center gap-2 ${step === 1 ? 'text-primary' : 'text-muted-foreground'}`}>
          <div className={`w-8 h-8 rounded-full flex items-center justify-center ${step === 1 ? 'bg-primary text-primary-foreground' : 'bg-muted'}`}>
            1
          </div>
          <span className="text-sm font-medium">Select Topics</span>
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

      {/* Step 1: Topic Selection */}
      {step === 1 && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left: Topic Tree */}
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Sparkles className="w-5 h-5" />
                Select Topics & Subtopics
              </CardTitle>
              <CardDescription>
                Choose up to 10 topics across different subjects. You can select all subtopics or pick specific ones.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {loadingTopics ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="w-6 h-6 animate-spin" />
                </div>
              ) : (
                <ScrollArea className="h-[500px] pr-4">
                  <div className="space-y-2">
                    {Object.entries(availableTopics).map(([subject, topics]) => (
                      <div key={subject} className="border rounded-lg">
                        {/* Subject Header */}
                        <button
                          onClick={() => toggleSubject(subject)}
                          className="w-full flex items-center justify-between p-3 hover:bg-muted/50 transition-colors"
                        >
                          <div className="flex items-center gap-2">
                            {expandedSubjects.has(subject) ? (
                              <ChevronDown className="w-4 h-4" />
                            ) : (
                              <ChevronRight className="w-4 h-4" />
                            )}
                            <span className="font-semibold">{subject}</span>
                            <Badge variant="secondary">{topics.length} topics</Badge>
                          </div>
                        </button>

                        {/* Topics List */}
                        {expandedSubjects.has(subject) && (
                          <div className="border-t">
                            {topics.map((topicData) => {
                              const isSelected = isTopicSelected(subject, topicData.topic);
                              const selection = getTopicSelection(subject, topicData.topic);
                              const topicKey = `${subject}:${topicData.topic}`;
                              const isExpanded = expandedTopics.has(topicKey);

                              return (
                                <div key={topicData.topic} className="border-b last:border-b-0">
                                  {/* Topic Header */}
                                  <div className="flex items-center gap-2 p-3 hover:bg-muted/30">
                                    <Checkbox
                                      checked={isSelected}
                                      onCheckedChange={() => toggleTopicSelection(subject, topicData.topic, topicData.subtopics.map(st => st.name))}
                                      disabled={!isSelected && selections.length >= 10}
                                    />
                                    <button
                                      onClick={() => toggleTopic(subject, topicData.topic)}
                                      className="flex-1 flex items-center justify-between text-left"
                                    >
                                      <div className="flex items-center gap-2">
                                        {isExpanded ? (
                                          <ChevronDown className="w-3 h-3" />
                                        ) : (
                                          <ChevronRight className="w-3 h-3" />
                                        )}
                                        <span className="font-medium">{topicData.topic}</span>
                                        <Badge variant="outline" className="text-xs">
                                          {topicData.subtopics.length} subtopics
                                        </Badge>
                                      </div>
                                    </button>
                                  </div>

                                  {/* Subtopics */}
                                  {isSelected && (
                                    <div className="bg-muted/20 p-3 space-y-2">
                                      <RadioGroup
                                        value={selection?.subtopics === 'all' ? 'all' : 'specific'}
                                        onValueChange={(value) => {
                                          if (value === 'all') {
                                            updateSubtopicSelection(subject, topicData.topic, []);
                                          } else if (value === 'specific') {
                                            // Initialize with empty array to show the subtopic list
                                            updateSubtopicSelection(subject, topicData.topic, []);
                                          }
                                        }}
                                      >
                                        <div className="flex items-center space-x-2">
                                          <RadioGroupItem value="all" id={`${topicKey}-all`} />
                                          <Label htmlFor={`${topicKey}-all`} className="text-sm">
                                            All subtopics ({topicData.subtopics.length})
                                          </Label>
                                        </div>
                                        <div className="flex items-center space-x-2">
                                          <RadioGroupItem value="specific" id={`${topicKey}-specific`} />
                                          <Label htmlFor={`${topicKey}-specific`} className="text-sm">
                                            Select specific subtopics
                                          </Label>
                                        </div>
                                      </RadioGroup>

                                      {Array.isArray(selection?.subtopics) && (
                                        <div className="ml-6 space-y-1 mt-2">
                                          {topicData.subtopics.map((subtopic) => {
                                            const selectedSubtopics = selection?.subtopics === 'all' ? [] : (selection?.subtopics || []);
                                            const isSubtopicSelected = selectedSubtopics.includes(subtopic.name);

                                            return (
                                              <div key={subtopic.name} className="flex items-center gap-2">
                                                <Checkbox
                                                  checked={isSubtopicSelected}
                                                  onCheckedChange={(checked) => {
                                                    const current = selection?.subtopics === 'all' ? [] : (selection?.subtopics || []);
                                                    const updated = checked
                                                      ? [...current, subtopic.name]
                                                      : current.filter(s => s !== subtopic.name);
                                                    updateSubtopicSelection(subject, topicData.topic, updated);
                                                  }}
                                                />
                                                <Label className="text-sm font-normal">
                                                  {subtopic.name}
                                                </Label>
                                              </div>
                                            );
                                          })}
                                        </div>
                                      )}
                                    </div>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              )}
            </CardContent>
          </Card>

          {/* Right: Selected Topics Summary */}
          <Card>
            <CardHeader>
              <CardTitle>Selected Topics</CardTitle>
              <CardDescription>
                {selections.length}/10 topics selected
              </CardDescription>
            </CardHeader>
            <CardContent>
              {selections.length === 0 ? (
                <div className="text-center text-muted-foreground py-8">
                  <AlertCircle className="w-8 h-8 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">No topics selected yet</p>
                </div>
              ) : (
                <ScrollArea className="h-[400px]">
                  <div className="space-y-2">
                    {selections.map((selection, index) => (
                      <div key={index} className="border rounded-lg p-3 space-y-1">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <p className="font-medium text-sm">{selection.topic}</p>
                            <p className="text-xs text-muted-foreground">{selection.subject}</p>
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-6 w-6 p-0"
                            onClick={() => removeSelection(index)}
                          >
                            <X className="w-4 h-4" />
                          </Button>
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {selection.subtopics === 'all' ? (
                            <span>All subtopics</span>
                          ) : (
                            <span>{selection.subtopics.length} subtopic(s) selected</span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* Step 2: Configuration */}
      {step === 2 && (
        <Card>
          <CardHeader>
            <CardTitle>Configure Quiz</CardTitle>
            <CardDescription>
              Set the total number of questions and difficulty focus
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Suggestion */}
            {suggestion && (
              <div className="bg-primary/10 border border-primary/20 rounded-lg p-4">
                <div className="flex items-start gap-3">
                  <Sparkles className="w-5 h-5 text-primary mt-0.5" />
                  <div className="flex-1">
                    <p className="font-medium text-sm mb-1">Recommended: {suggestion.recommended} questions</p>
                    <p className="text-sm text-muted-foreground">{suggestion.reasoning}</p>
                    <div className="flex items-center gap-2 mt-2 text-xs text-muted-foreground">
                      <Clock className="w-3 h-3" />
                      <span>Estimated duration: ~{suggestion.estimatedDuration} minutes</span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Question Count Slider */}
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <Label>Total Questions: {totalQuestions}</Label>
                {suggestion && (
                  <span className="text-xs text-muted-foreground">
                    Range: {suggestion.minimum} - {suggestion.maximum}
              <div>
              <Label>Total Questions: {totalQuestions}</Label>
              <Slider
                value={[totalQuestions]}
                onValueChange={([value]) => setTotalQuestions(value)}
                min={minQuestions}
                max={maxQuestions}
                step={1}
                className="mt-2"
              />
              <div className="flex justify-between text-xs text-muted-foreground mt-1">
                <span>Min: {minQuestions}</span>
                <span>Max: {maxQuestions}</span>
              </div>
            </div>/* Focus Area */}
            <div className="space-y-3">
              <Label>Focus Area</Label>
              <RadioGroup value={focusArea} onValueChange={(value: any) => setFocusArea(value)}>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="strengthen" id="strengthen" />
                  <Label htmlFor="strengthen" className="font-normal">
                    Strengthen (60% easy, 30% medium, 10% hard)
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="balanced" id="balanced" />
                  <Label htmlFor="balanced" className="font-normal">
                    Balanced (33% each difficulty)
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="improve" id="improve" />
                  <Label htmlFor="improve" className="font-normal">
                    Improve (10% easy, 30% medium, 60% hard)
                  </Label>
                </div>
              </RadioGroup>
            </div>

            <Separator />

            {/* Distribution Preview */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label>Distribution Preview</Label>rdContent>
        </Card>
      )}

      {/* Step 3: Review */}
      {step === 3 && (
        <Card>
          <CardHeader>
            <CardTitle>Review Challenge</CardTitle>
            <CardDescription>
              Review your challenge before creating it for {childName}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Challenge Title</Label>
              <p className="text-sm font-medium">{generateTitle()}</p>
            </div>

            <div className="space-y-2">
              <Label>Topics ({selections.length})</Label>
              <div className="text-sm space-y-1">
                {selections.map((sel, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-green-600" />
                    <span>{sel.subject} - {sel.topic}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Total Questions</Label>
                <p className="text-2xl font-bold">{totalQuestions}</p>
              </div>
              <div className="space-y-2">
                <Label>Estimated Duration</Label>
                <p className="text-2xl font-bold">~{totalQuestions} min</p>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Focus Area</Label>
              <Badge variant="secondary" className="capitalize">{focusArea}</Badge>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Navigation Buttons */}
      <div className="flex justify-between">
        {step === 1 ? (
          <Button variant="outline" onClick={onCancel}>
            Cancel
          </Button>
        ) : (
          <Button variant="outline" onClick={() => setStep(step - 1)}>
            Back
          </Button>
        )}

        {step < 3 ? (
          <Button
            onClick={() => setStep(step + 1)}
            disabled={step === 1 ? !canProceedToStep2 : !canProceedToStep3}
          >
            Next
          </Button>
        ) : (
          <Button onClick={handleCreateChallenge} disabled={creating}>
            {creating ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Creating...
              </>
            ) : (
              'Create Challenge'
            )}
          </Button>
        )}
      </div>
    </div>
  );
}
