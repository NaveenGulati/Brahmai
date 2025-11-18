/**
 * ============================================
 * CREATE CHALLENGE PAGE
 * ============================================
 * Dedicated page for creating challenges (Simple or Advanced)
 * Accessible by all profiles: Child, Parent, Teacher
 * Responsive design for mobile and desktop
 */

import { useState, useEffect } from 'react';
import { useLocation, useRoute } from 'wouter';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Sparkles, Target, ArrowLeft, User } from 'lucide-react';
import ChallengeCreator from '@/components/ChallengeCreator';
import AdvancedChallengeCreator from '@/components/AdvancedChallengeCreator';
import { useAuth } from '@/_core/hooks/useAuth';
import { trpc } from '@/lib/trpc';

interface CreateChallengeProps {
  // Optional: if creating for someone else (parent/teacher creating for child)
  targetUserId?: number;
  targetUserName?: string;
}

export default function CreateChallenge({ targetUserId: propTargetUserId, targetUserName: propTargetUserName }: CreateChallengeProps) {
  const [, navigate] = useLocation();
  const [match, params] = useRoute('/create-challenge/:targetUserId');
  const [challengeType, setChallengeType] = useState<'simple' | 'advanced' | null>(null);
  const { user, loading } = useAuth();
  
  // Use route param if available, otherwise use prop
  const targetUserId = params?.targetUserId ? parseInt(params.targetUserId) : propTargetUserId;
  const targetUserName = propTargetUserName;
  
  // Get child profile for current user if they're a child
  const [childProfileId, setChildProfileId] = useState<number | null>(null);
  
  useEffect(() => {
    const storedUser = localStorage.getItem('childUser');
    if (storedUser) {
      try {
        const parsed = JSON.parse(storedUser);
        setChildProfileId(parsed.id);
      } catch (e) {
        console.error('Failed to parse childUser:', e);
      }
    }
  }, []);
  
  // Determine the actual child ID to use
  const actualChildId = targetUserId || childProfileId || user?.id;
  const actualChildName = targetUserName || user?.name || 'Student';
  
  if (loading) {
    return <div className="min-h-screen flex items-center justify-center">Loading...</div>;
  }

  const handleSuccess = (challengeId: number) => {
    // Navigate back to appropriate dashboard
    if (user?.role === 'parent') {
      navigate('/parent');
    } else if (user?.role === 'teacher') {
      navigate('/teacher');
    } else {
      navigate('/child');
    }
  };

  const handleCancel = () => {
    // Navigate back to appropriate dashboard
    if (user?.role === 'parent') {
      navigate('/parent');
    } else if (user?.role === 'teacher') {
      navigate('/teacher');
    } else {
      navigate('/child');
    }
  };

  const getPageTitle = () => {
    if (targetUserId && targetUserId !== actualChildId) {
      return `Create Challenge for ${targetUserName || 'Student'}`;
    }
    return 'Create Challenge';
  };

  const getPageDescription = () => {
    if (targetUserId && targetUserId !== actualChildId) {
      return `Set up a personalized challenge for ${targetUserName || 'Student'}`;
    }
    return 'Challenge yourself and track your progress';
  };

  // If type not selected, show selection screen
  if (!challengeType) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20">
        <div className="container max-w-4xl mx-auto px-4 py-6 md:py-12">
          {/* Header */}
          <div className="mb-6 md:mb-8">
            <Button
              variant="ghost"
              onClick={handleCancel}
              className="mb-4 -ml-2"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back
            </Button>
            
            <div className="flex items-start gap-4">
              <div className="flex-1">
                <h1 className="text-2xl md:text-3xl font-bold tracking-tight mb-2">
                  {getPageTitle()}
                </h1>
                <p className="text-muted-foreground">
                  {getPageDescription()}
                </p>
              </div>
              
              {targetUserId && targetUserId !== actualChildId && (
                <div className="hidden md:flex items-center gap-2 px-4 py-2 bg-primary/10 rounded-lg">
                  <User className="w-4 h-4 text-primary" />
                  <span className="text-sm font-medium text-primary">
                    {targetUserName || 'Student'}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Challenge Type Selection */}
          <Card className="shadow-lg">
            <CardHeader>
              <CardTitle>Choose Challenge Type</CardTitle>
              <CardDescription>
                Select the type of challenge that best fits your learning goals
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 md:space-y-6">
              <RadioGroup 
                value={challengeType || ''} 
                onValueChange={(value: any) => setChallengeType(value)}
                className="space-y-4"
              >
                {/* Simple Challenge Option */}
                <div className="relative">
                  <div className="flex items-start space-x-3 p-4 md:p-6 border-2 rounded-lg hover:border-primary/50 hover:bg-accent/5 transition-all cursor-pointer">
                    <RadioGroupItem value="simple" id="simple" className="mt-1" />
                    <div className="flex-1 min-w-0">
                      <Label htmlFor="simple" className="cursor-pointer">
                        <div className="flex items-center gap-2 mb-2">
                          <Target className="w-5 h-5 flex-shrink-0" />
                          <span className="font-semibold text-base md:text-lg">Simple Challenge</span>
                        </div>
                        <p className="text-sm md:text-base text-muted-foreground mb-3">
                          Focus on a single module or topic. Perfect for targeted practice and mastery of specific concepts.
                        </p>
                        <div className="flex flex-wrap gap-2">
                          <span className="text-xs bg-muted px-2 py-1 rounded">Single module</span>
                          <span className="text-xs bg-muted px-2 py-1 rounded">10-100 questions</span>
                          <span className="text-xs bg-muted px-2 py-1 rounded">Difficulty control</span>
                        </div>
                      </Label>
                    </div>
                  </div>
                </div>

                {/* Advanced Challenge Option */}
                <div className="relative">
                  <div className="flex items-start space-x-3 p-4 md:p-6 border-2 rounded-lg hover:border-primary/50 hover:bg-accent/5 transition-all cursor-pointer">
                    <RadioGroupItem value="advanced" id="advanced" className="mt-1" />
                    <div className="flex-1 min-w-0">
                      <Label htmlFor="advanced" className="cursor-pointer">
                        <div className="flex items-center gap-2 mb-2 flex-wrap">
                          <Sparkles className="w-5 h-5 text-primary flex-shrink-0" />
                          <span className="font-semibold text-base md:text-lg">Advanced Challenge</span>
                          <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full font-medium">
                            RECOMMENDED
                          </span>
                        </div>
                        <p className="text-sm md:text-base text-muted-foreground mb-3">
                          Mix multiple topics across subjects. Questions are adaptively mixed for comprehensive assessment.
                        </p>
                        <div className="flex flex-wrap gap-2">
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

              {/* Action Buttons */}
              <div className="flex flex-col-reverse sm:flex-row justify-end gap-3 pt-4 border-t">
                <Button
                  variant="outline"
                  onClick={handleCancel}
                  className="w-full sm:w-auto"
                >
                  Cancel
                </Button>
                <Button
                  onClick={() => {
                    if (challengeType) {
                      // Type is already selected, this button is just for mobile UX
                    }
                  }}
                  disabled={!challengeType}
                  className="w-full sm:w-auto"
                >
                  Continue
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Info Cards */}
          <div className="grid md:grid-cols-2 gap-4 mt-6">
            <Card className="bg-muted/50">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm">💡 Pro Tip</CardTitle>
              </CardHeader>
              <CardContent className="text-sm text-muted-foreground">
                Start with a simple challenge to warm up, then move to advanced challenges for comprehensive practice.
              </CardContent>
            </Card>
            
            <Card className="bg-muted/50">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm">🎯 Goal Setting</CardTitle>
              </CardHeader>
              <CardContent className="text-sm text-muted-foreground">
                Set realistic targets and track your progress. Consistency is key to improvement!
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    );
  }

  // Show selected challenge creator
  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20">
      <div className="container max-w-6xl mx-auto px-4 py-6 md:py-12">
        {/* Header */}
        <div className="mb-6">
          <Button
            variant="ghost"
            onClick={() => setChallengeType(null)}
            className="mb-4 -ml-2"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Change Type
          </Button>
          
          <div className="flex items-center gap-3 mb-2">
            {challengeType === 'simple' ? (
              <Target className="w-6 h-6" />
            ) : (
              <Sparkles className="w-6 h-6 text-primary" />
            )}
            <h1 className="text-2xl md:text-3xl font-bold tracking-tight">
              {challengeType === 'simple' ? 'Simple' : 'Advanced'} Challenge
            </h1>
          </div>
          <p className="text-muted-foreground">
            {challengeType === 'simple' 
              ? 'Configure your focused practice session'
              : 'Build a comprehensive multi-topic challenge'
            }
          </p>
        </div>

        {/* Challenge Creator Component */}
        <div className="space-y-6">
          {challengeType === 'simple' ? (
            <ChallengeCreator
              childId={actualChildId}
              childName={actualChildName}
              onSuccess={handleSuccess}
              onCancel={handleCancel}
            />
          ) : (
            <AdvancedChallengeCreator
              childId={actualChildId}
              childName={actualChildName}
              onSuccess={handleSuccess}
              onCancel={handleCancel}
            />
          )}
        </div>
      </div>
    </div>
  );
}
