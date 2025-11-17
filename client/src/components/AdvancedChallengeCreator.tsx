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

  // Challenge creation state
  const [creating, setCreating] = useState(false);

  // Calculate dynamic min/max for slider
  const minQuestions = Math.max(selections.length * 3, 9); // 3 per topic, minimum 9
  const maxQuestions = 100;

  // Fetch available topics on mount
  useEffect(() => {
    fetchAvailableTopics();
  }, [childId]);

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

  const toggleSelection = (subject: string, topic: string) => {
    const existing = selections.find(s => s.subject === subject && s.topic === topic);
    
    if (existing) {
      // Remove selection
      setSelections(selections.filter(s => !(s.subject === subject && s.topic === topic)));
    } else {
      // Add selection with 'all' subtopics by default
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

  const createChallenge = async () => {
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
          title: `Advanced Challenge - ${new Date().toLocaleDateString()}`,
          message: `Multi-topic challenge covering ${selections.length} topics`
        })
      });
      
      const data = await response.json();
      
      if (data.success) {
        toast.success('Challenge created successfully!');
        onSuccess?.(data.challengeId);
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

  return (
    <div className="space-y-6">
      {/* Progress Steps */}
      <div className="flex items-center justify-center">
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
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Left: Topic Tree */}
          <Card className="md:col-span-2">
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
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                </div>
              ) : (
                <ScrollArea className="h-[500px] pr-4">
                  <div className="space-y-2">
                    {Object.entries(availableTopics).map(([subject, topics]) => {
                      const isSubjectExpanded = expandedSubjects.has(subject);
                      
                      return (
                        <Collapsible
                          key={subject}
                          open={isSubjectExpanded}
                          onOpenChange={() => {
                            const newExpanded = new Set(expandedSubjects);
                            if (isSubjectExpanded) {
                              newExpanded.delete(subject);
                            } else {
                              newExpanded.add(subject);
                            }
                            setExpandedSubjects(newExpanded);
                          }}
                        >
                          <CollapsibleTrigger className="flex items-center gap-2 w-full p-3 rounded-lg hover:bg-accent">
                            {isSubjectExpanded ? (
                              <ChevronDown className="w-4 h-4" />
                            ) : (
                              <ChevronRight className="w-4 h-4" />
                            )}
                            <span className="font-semibold">{subject}</span>
                            <Badge variant="outline" className="ml-auto">
                              {topics.length} {topics.length === 1 ? 'topic' : 'topics'}
                            </Badge>
                          </CollapsibleTrigger>
                          <CollapsibleContent className="pl-6 pt-2 space-y-2">
                            {topics.map((topicData) => {
                              const isSelected = selections.some(
                                s => s.subject === subject && s.topic === topicData.topic
                              );
                              const selection = selections.find(
                                s => s.subject === subject && s.topic === topicData.topic
                              );
                              const isTopicExpanded = expandedTopics.has(`${subject}-${topicData.topic}`);
                              
                              return (
                                <div key={topicData.topic} className="border rounded-lg p-3">
                                  <Collapsible
                                    open={isSelected && isTopicExpanded}
                                    onOpenChange={() => {
                                      const key = `${subject}-${topicData.topic}`;
                                      const newExpanded = new Set(expandedTopics);
                                      if (isTopicExpanded) {
                                        newExpanded.delete(key);
                                      } else {
                                        newExpanded.add(key);
                                      }
                                      setExpandedTopics(newExpanded);
                                    }}
                                  >
                                    <div className="flex items-start gap-3">
                                      <Checkbox
                                        checked={isSelected}
                                        onCheckedChange={() => toggleSelection(subject, topicData.topic)}
                                        className="mt-1"
                                      />
                                      <div className="flex-1">
                                        <div className="flex items-center justify-between">
                                          <CollapsibleTrigger className="flex items-center gap-2 hover:text-primary">
                                            {isSelected && isTopicExpanded ? (
                                              <ChevronDown className="w-4 h-4" />
                                            ) : (
                                              <ChevronRight className="w-4 h-4" />
                                            )}
                                            <span className="font-medium">{topicData.topic}</span>
                                          </CollapsibleTrigger>
                                          <Badge variant="secondary">
                                            {topicData.subtopics.length} {topicData.subtopics.length === 1 ? 'subtopic' : 'subtopics'}
                                          </Badge>
                                        </div>
                                        
                                        <CollapsibleContent className="mt-3 space-y-3">
                                          <RadioGroup
                                            value={selection?.subtopics === 'all' ? 'all' : 'specific'}
                                            onValueChange={(value) => {
                                              if (value === 'all') {
                                                updateSubtopicSelection(subject, topicData.topic, 'all');
                                              } else {
                                                updateSubtopicSelection(subject, topicData.topic, []);
                                              }
                                            }}
                                          >
                                            <div className="flex items-center space-x-2">
                                              <RadioGroupItem value="all" id={`all-${subject}-${topicData.topic}`} />
                                              <Label htmlFor={`all-${subject}-${topicData.topic}`} className="font-normal">
                                                All subtopics ({topicData.subtopics.length})
                                              </Label>
                                            </div>
                                            <div className="flex items-center space-x-2">
                                              <RadioGroupItem value="specific" id={`specific-${subject}-${topicData.topic}`} />
                                              <Label htmlFor={`specific-${subject}-${topicData.topic}`} className="font-normal">
                                                Select specific subtopics
                                              </Label>
                                            </div>
                                          </RadioGroup>
                                          
                                          {Array.isArray(selection?.subtopics) && (
                                            <div className="pl-6 space-y-2 border-l-2 border-muted">
                                              {topicData.subtopics.map((subtopic) => {
                                                const current = selection.subtopics as string[];
                                                const isChecked = current.includes(subtopic.name);
                                                
                                                return (
                                                  <div key={subtopic.name} className="flex items-center space-x-2">
                                                    <Checkbox
                                                      checked={isChecked}
                                                      onCheckedChange={(checked) => {
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
                                        </CollapsibleContent>
                                      </div>
                                    </div>
                                  </Collapsible>
                                </div>
                              );
                            })}
                          </CollapsibleContent>
                        </Collapsible>
                      );
                    })}
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
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <AlertCircle className="w-12 h-12 text-muted-foreground mb-3" />
                  <p className="text-sm text-muted-foreground">
                    No topics selected yet
                  </p>
                </div>
              ) : (
                <ScrollArea className="h-[500px]">
                  <div className="space-y-3">
                    {selections.map((selection, index) => (
                      <div key={index} className="border rounded-lg p-3">
                        <div className="flex items-start justify-between mb-2">
                          <div className="flex-1">
                            <p className="font-medium text-sm">{selection.topic}</p>
                            <p className="text-xs text-muted-foreground">{selection.subject}</p>
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => removeSelection(index)}
                            className="h-6 w-6 p-0"
                          >
                            <X className="w-4 h-4" />
                          </Button>
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {selection.subtopics === 'all' ? (
                            <span>All subtopics</span>
                          ) : (
                            <span>{selection.subtopics.length} specific subtopics</span>
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
            {/* Question Count Slider */}
            <div className="space-y-3">
              <Label>Total Questions: {totalQuestions}</Label>
              <Slider
                value={[totalQuestions]}
                onValueChange={([value]) => setTotalQuestions(value)}
                min={minQuestions}
                max={maxQuestions}
                step={1}
                className="mt-2"
              />
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>Min: {minQuestions}</span>
                <span>Max: {maxQuestions}</span>
              </div>
            </div>

            <Separator />

            {/* Focus Area */}
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
          </CardContent>
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
          <CardContent className="space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Questions</p>
                <p className="text-2xl font-bold">{totalQuestions}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Topics Selected</p>
                <p className="text-2xl font-bold">{selections.length}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Focus Area</p>
                <p className="text-lg font-semibold capitalize">{focusArea}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Estimated Duration</p>
                <p className="text-lg font-semibold">{totalQuestions} minutes</p>
              </div>
            </div>

            <Separator />

            <div>
              <p className="text-sm font-medium mb-3">Selected Topics:</p>
              <div className="space-y-2">
                {selections.map((selection, index) => (
                  <div key={index} className="flex items-center justify-between border rounded-lg p-3">
                    <div>
                      <p className="font-medium text-sm">{selection.topic}</p>
                      <p className="text-xs text-muted-foreground">
                        {selection.subject} • {selection.subtopics === 'all' ? 'All subtopics' : `${selection.subtopics.length} subtopics`}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Navigation Buttons */}
      <div className="flex items-center justify-between">
        <Button
          variant="outline"
          onClick={() => {
            if (step === 1) {
              onCancel?.();
            } else {
              setStep(step - 1);
            }
          }}
        >
          {step === 1 ? 'Cancel' : 'Back'}
        </Button>

        {step < 3 ? (
          <Button
            onClick={() => setStep(step + 1)}
            disabled={step === 1 && selections.length === 0}
          >
            Next
          </Button>
        ) : (
          <Button
            onClick={createChallenge}
            disabled={creating}
          >
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
