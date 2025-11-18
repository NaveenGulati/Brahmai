/**
 * ============================================
 * CHALLENGE NOTIFICATION COMPONENT
 * ============================================
 * Reusable component for displaying challenge notifications
 * Shows topic/subtopic details for advanced challenges
 * Used across all user profiles (Child, Parent, Teacher)
 */

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

interface ChallengeNotificationProps {
  challenge: any;
  viewType: 'pending' | 'completed';
  onStart?: (challengeId: number) => void;
  onDismiss?: (challengeId: number) => void;
  onViewDetails?: (sessionId: number) => void;
  showSelfPracticeLabel?: boolean;
}

export default function ChallengeNotification({
  challenge,
  viewType,
  onStart,
  onDismiss,
  onViewDetails,
  showSelfPracticeLabel = true,
}: ChallengeNotificationProps) {
  // Parse challengeScope for advanced challenges
  let challengeScope: any = null;
  let topics: any[] = [];
  
  try {
    // challengeScope might be a string (JSON) or already an object
    if (typeof challenge.challengeScope === 'string') {
      challengeScope = JSON.parse(challenge.challengeScope);
    } else {
      challengeScope = challenge.challengeScope;
    }
    topics = Array.isArray(challengeScope?.topics) ? challengeScope.topics : [];
  } catch (error) {
    console.error('[ChallengeNotification] Failed to parse challengeScope:', error);
    topics = [];
  }
  const isSelfPractice = challenge.assignedBy === challenge.assignedTo;
  const isAdvanced = challenge.challengeType === 'advanced';

  // Styling based on view type and self-practice
  const getCardStyles = () => {
    if (viewType === 'pending') {
      return 'bg-white border-2 border-yellow-400';
    }
    if (isSelfPractice) {
      return 'bg-blue-50 border-blue-200';
    }
    return 'bg-green-50 border-green-200';
  };

  const getScoreColor = () => {
    if (isSelfPractice) return 'text-blue-600';
    return 'text-green-600';
  };

  return (
    <Card className={`${getCardStyles()} relative`}>
      {/* Dismiss button for completed challenges */}
      {viewType === 'completed' && onDismiss && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onDismiss(challenge.id);
          }}
          className="absolute top-3 right-3 text-gray-400 hover:text-gray-600 transition-colors z-10"
          title="Dismiss challenge"
        >
          ✕
        </button>
      )}

      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-2 pr-6">
          <CardTitle className="text-lg">{challenge.title}</CardTitle>
          <div className="flex gap-1 flex-wrap justify-end">
            <Badge variant={isAdvanced ? 'default' : 'secondary'} className="whitespace-nowrap">
              {isAdvanced ? 'Advanced' : 'Simple'}
            </Badge>
            {isSelfPractice && showSelfPracticeLabel && (
              <Badge variant="outline" className="bg-blue-100 text-blue-800 border-blue-300">
                🎯 Self-Practice
              </Badge>
            )}
          </div>
        </div>

        {/* Challenge message */}
        {challenge.message && (
          <CardDescription className="text-base">
            {challenge.message.split(/\*\*(.+?)\*\*/).map((part: string, i: number) => 
              i % 2 === 1 ? <strong key={i} className="font-bold text-gray-900">{part}</strong> : part
            )}
          </CardDescription>
        )}

        {/* Topics and subtopics for advanced challenges */}
        {isAdvanced && topics.length > 0 && (
          <div className="mt-3 space-y-2">
            <p className="text-sm font-semibold text-gray-700">Topics Covered:</p>
            <div className="space-y-1.5">
              {topics.map((topic: any, idx: number) => (
                <div key={idx} className="text-sm bg-muted/50 rounded-md p-2">
                  <div className="font-medium text-gray-900">
                    {topic.subjectName} - {topic.topicName}
                  </div>
                  {topic.subtopics && topic.subtopics.length > 0 && (
                    <div className="mt-1 flex flex-wrap gap-1">
                      {topic.subtopics.map((subtopic: string, subIdx: number) => (
                        <span key={subIdx} className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded">
                          {subtopic}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Simple challenge module info */}
        {!isAdvanced && challenge.module && (
          <div className="mt-2">
            <p className="text-sm text-muted-foreground">
              <span className="font-medium">Module:</span> {challenge.subject?.name} - {challenge.module.name}
            </p>
          </div>
        )}
      </CardHeader>

      <CardContent className="pt-0">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
          {/* Challenge metadata */}
          <div className="text-sm text-gray-600 space-y-1">
            {viewType === 'pending' && challenge.expiresAt && (
              <p>📅 Due: {new Date(challenge.expiresAt).toLocaleDateString()}</p>
            )}
            {viewType === 'completed' && challenge.completedAt && (
              <p>✅ Completed: {new Date(challenge.completedAt).toLocaleDateString('en-US', {
                day: 'numeric',
                month: 'short',
                year: 'numeric',
                hour: 'numeric',
                minute: '2-digit',
                hour12: true
              })}</p>
            )}
            <p className="text-xs text-muted-foreground">
              📝 {challenge.questionCount} questions
            </p>
            {viewType === 'completed' && challenge.session && (
              <>
                <p className="text-xs">
                  ✓ {challenge.session.correctAnswers}/{challenge.session.totalQuestions} correct
                </p>
                {challenge.session.timeTaken && (
                  <p className="text-xs">
                    ⏱️ {Math.floor(challenge.session.timeTaken / 60)}m {challenge.session.timeTaken % 60}s
                  </p>
                )}
              </>
            )}
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-2">
            {viewType === 'pending' && onStart && (
              <Button
                onClick={() => onStart(challenge.id)}
                className="bg-gradient-to-r from-green-500 to-blue-500 hover:from-green-600 hover:to-blue-600"
              >
                Start Challenge 🚀
              </Button>
            )}
            {viewType === 'completed' && challenge.session && onViewDetails && (
              <div className="flex items-center gap-2">
                <span className={`text-2xl font-bold ${getScoreColor()}`}>
                  {challenge.session.scorePercentage}%
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onViewDetails(challenge.sessionId)}
                >
                  View Details
                </Button>
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
