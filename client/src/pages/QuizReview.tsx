import { useAuth } from "@/_core/hooks/useAuth";
import { decryptId, encryptedRoutes } from "@shared/urlEncryption";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { trpc } from "@/lib/trpc";
import { useLocation, useParams } from "wouter";
import { CheckCircle2, XCircle, Clock, Award, Brain, Sparkles } from "lucide-react";
import ReactMarkdown from 'react-markdown';
import { useState, useRef, useEffect } from 'react';
import { TTSPlayer } from '@/components/TTSPlayer';

/**
 * Component to display text with paragraph-level highlighting
 * 
 * Splits markdown text into paragraphs and highlights the current one during audio playback.
 */
function HighlightedText({ text, highlightIndex }: { text: string; highlightIndex: number }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const paragraphRefs = useRef<(HTMLDivElement | null)[]>([]);
  
  // Split text into paragraphs (double newline or markdown headers)
  const paragraphs = text.split(/\n\n+/).filter(p => p.trim().length > 0);
  
  // Auto-scroll to highlighted paragraph
  useEffect(() => {
    if (highlightIndex >= 0 && paragraphRefs.current[highlightIndex]) {
      paragraphRefs.current[highlightIndex]?.scrollIntoView({
        behavior: 'smooth',
        block: 'center',
      });
    }
  }, [highlightIndex]);
  
  return (
    <div ref={containerRef} className="prose prose-sm max-w-none">
      {paragraphs.map((paragraph, index) => (
        <div
          key={index}
          ref={(el) => {
            paragraphRefs.current[index] = el;
          }}
          className={`transition-all duration-200 rounded-lg ${
            index === highlightIndex
              ? 'bg-yellow-200 shadow-lg p-3 border-2 border-yellow-400'
              : 'p-1'
          }`}
        >
          <ReactMarkdown>{paragraph}</ReactMarkdown>
        </div>
      ))}
    </div>
  );
}

export default function QuizReview() {
  // ALL HOOKS MUST BE AT THE TOP - BEFORE ANY CONDITIONAL RETURNS
  const { sessionId: encryptedSessionId } = useParams<{ sessionId: string }>();
  // Decrypt the session ID from URL
  let sessionId: number;
  try {
    sessionId = decryptId(encryptedSessionId!);
  } catch (error) {
    console.error('Failed to decrypt session ID:', error);
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-600">Invalid quiz session</p>
          <Button onClick={() => setLocation('/parent')} className="mt-4">
            Back to Dashboard
          </Button>
        </div>
      </div>
    );
  }
  const [, setLocation] = useLocation();
  const { user } = useAuth({ redirectOnUnauthenticated: false });
  const [aiAnalysis, setAiAnalysis] = useState<{ fullAnalysis: string } | null>(null);
  const [expandedExplanations, setExpandedExplanations] = useState<Record<number, string>>({});
  const [highlightedQuestionId, setHighlightedQuestionId] = useState<number | null>(null);
  const [highlightIndex, setHighlightIndex] = useState<number>(-1);
  
  // Determine if the current user is a child based on their role
  const isChild = user?.role === 'child';

  // Query hooks - must be called unconditionally
  const { data: reviewData, isLoading } = trpc.parent.getQuizReview.useQuery(
    { sessionId },
    { enabled: !!sessionId && !isChild }
  );
  
  const { data: childReviewData, isLoading: isChildLoading } = trpc.child.getQuizReview.useQuery(
    { sessionId },
    { enabled: !!sessionId && isChild }
  );
  
  const actualReviewData = isChild ? childReviewData : reviewData;
  const actualLoading = isChild ? isChildLoading : isLoading;

  const { data: previousAttempt } = trpc.parent.getPreviousAttempt.useQuery(
    { 
      moduleId: actualReviewData?.session.moduleId || 0,
      currentSessionId: sessionId 
    },
    { enabled: !!actualReviewData?.session.moduleId && !isChild }
  );

  // AI Analysis mutations - call both unconditionally (React hooks rule)
  const parentAnalysisMutation = trpc.parent.generateAIAnalysis.useMutation();
  const childAnalysisMutation = trpc.child.generateAIAnalysis.useMutation();
  const generateAnalysisMutation = isChild ? childAnalysisMutation : parentAnalysisMutation;

  // Detailed explanation mutations - call both unconditionally (React hooks rule)
  const parentExplanationMutation = trpc.parent.generateDetailedExplanation.useMutation();
  const childExplanationMutation = trpc.child.generateDetailedExplanation.useMutation();
  const generateExplanationMutation = isChild ? childExplanationMutation : parentExplanationMutation;

  // NOW we can do conditional returns - all hooks have been called
  if (actualLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading quiz review...</p>
        </div>
      </div>
    );
  }

  if (!actualReviewData) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-600">Quiz not found</p>
          <Button onClick={() => setLocation('/parent')} className="mt-4">
            Back to Dashboard
          </Button>
        </div>
      </div>
    );
  }

  const { session, responses } = actualReviewData;

  const handleGenerateAnalysis = async () => {
    try {
      const result = await generateAnalysisMutation.mutateAsync({ sessionId });
      setAiAnalysis(result);
    } catch (error) {
      console.error('Failed to generate analysis:', error);
    }
  };

  const handleGetDetailedExplanation = async (response: any) => {
    try {
      const result = await generateExplanationMutation.mutateAsync({
        questionId: response.questionId,
        questionText: response.questionText,
        correctAnswer: response.correctAnswer,
        userAnswer: response.userAnswer,
        grade: '7',
      });
      setExpandedExplanations(prev => ({
        ...prev,
        [response.questionId]: result.detailedExplanation,
      }));
    } catch (error) {
      console.error('Failed to generate explanation:', error);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="container max-w-4xl">
        {/* Back button */}
        <Button
          variant="outline"
          onClick={() => setLocation(isChild ? '/child' : '/parent')}
          className="mb-4"
        >
          ← Back to Dashboard
        </Button>

        {/* Quiz Summary */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="text-2xl">Quiz Review - Session #{session.id}</CardTitle>
            <p className="text-gray-600">
              {session.moduleName} • {session.subjectName}
            </p>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center p-4 bg-blue-50 rounded-lg">
                <p className="text-3xl font-bold text-blue-600">{session.scorePercentage}%</p>
                <p className="text-sm text-gray-600">Score</p>
              </div>
              <div className="text-center p-4 bg-green-50 rounded-lg">
                <p className="text-3xl font-bold text-green-600">{session.correctAnswers}</p>
                <p className="text-sm text-gray-600">Correct</p>
              </div>
              <div className="text-center p-4 bg-red-50 rounded-lg">
                <p className="text-3xl font-bold text-red-600">{session.wrongAnswers}</p>
                <p className="text-sm text-gray-600">Wrong</p>
              </div>
              <div className="text-center p-4 bg-purple-50 rounded-lg">
                <p className="text-3xl font-bold text-purple-600">{session.totalPoints}</p>
                <p className="text-sm text-gray-600">Points</p>
              </div>
            </div>
            <div className="mt-4 flex items-center justify-center gap-4 text-sm text-gray-600">
              <div className="flex items-center gap-1">
                <Clock className="w-4 h-4" />
                <span>{Math.floor((session.timeTaken || 0) / 60)}m {(session.timeTaken || 0) % 60}s</span>
              </div>
              <div className="flex items-center gap-1">
                <Award className="w-4 h-4" />
                <span>{session.totalQuestions} questions</span>
              </div>
            </div>
            {isChild && (
              <div className="mt-4 flex justify-center">
                <Button 
                  onClick={() => setLocation(encryptedRoutes.quiz(session.moduleId))}
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  🔄 Reattempt Test
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Progress Comparison */}
        {previousAttempt && (
          <Card className="mb-6 border-indigo-200 bg-gradient-to-br from-indigo-50 to-purple-50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-indigo-900">
                📊 Progress Comparison
              </CardTitle>
              <p className="text-sm text-gray-600">Comparing with previous attempt</p>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Score Comparison */}
                <div className="bg-white p-4 rounded-lg border border-indigo-100">
                  <p className="text-sm text-gray-600 mb-2">Score</p>
                  <div className="flex items-center justify-between">
                    <div className="text-center">
                      <p className="text-2xl font-bold text-gray-400">{previousAttempt.scorePercentage}%</p>
                      <p className="text-xs text-gray-500">Previous</p>
                    </div>
                    <div className="text-2xl">
                      {(session.scorePercentage || 0) > (previousAttempt.scorePercentage || 0) ? (
                        <span className="text-green-500">↗</span>
                      ) : (session.scorePercentage || 0) < (previousAttempt.scorePercentage || 0) ? (
                        <span className="text-red-500">↘</span>
                      ) : (
                        <span className="text-gray-400">→</span>
                      )}
                    </div>
                    <div className="text-center">
                      <p className="text-2xl font-bold text-indigo-600">{session.scorePercentage}%</p>
                      <p className="text-xs text-gray-500">Current</p>
                    </div>
                  </div>
                  {(session.scorePercentage || 0) > (previousAttempt.scorePercentage || 0) && (
                    <p className="text-xs text-green-600 mt-2 text-center font-medium">
                      +{(session.scorePercentage || 0) - (previousAttempt.scorePercentage || 0)}% improvement! 🎉
                    </p>
                  )}
                  {(session.scorePercentage || 0) < (previousAttempt.scorePercentage || 0) && (
                    <p className="text-xs text-orange-600 mt-2 text-center font-medium">
                      {(previousAttempt.scorePercentage || 0) - (session.scorePercentage || 0)}% lower - keep practicing!
                    </p>
                  )}
                </div>

                {/* Time Comparison */}
                <div className="bg-white p-4 rounded-lg border border-indigo-100">
                  <p className="text-sm text-gray-600 mb-2">Time Taken</p>
                  <div className="flex items-center justify-between">
                    <div className="text-center">
                      <p className="text-lg font-bold text-gray-400">
                        {Math.floor((previousAttempt.timeTaken || 0) / 60)}:{String((previousAttempt.timeTaken || 0) % 60).padStart(2, '0')}
                      </p>
                      <p className="text-xs text-gray-500">Previous</p>
                    </div>
                    <div className="text-2xl">
                      {(session.timeTaken || 0) < (previousAttempt.timeTaken || 0) ? (
                        <span className="text-green-500">⚡</span>
                      ) : (
                        <span className="text-gray-400">🕐</span>
                      )}
                    </div>
                    <div className="text-center">
                      <p className="text-lg font-bold text-indigo-600">
                        {Math.floor((session.timeTaken || 0) / 60)}:{String((session.timeTaken || 0) % 60).padStart(2, '0')}
                      </p>
                      <p className="text-xs text-gray-500">Current</p>
                    </div>
                  </div>
                  {(session.timeTaken || 0) < (previousAttempt.timeTaken || 0) && (
                    <p className="text-xs text-green-600 mt-2 text-center font-medium">
                      Faster by {Math.floor(((previousAttempt.timeTaken || 0) - (session.timeTaken || 0)) / 60)}m {((previousAttempt.timeTaken || 0) - (session.timeTaken || 0)) % 60}s! ⚡
                    </p>
                  )}
                </div>

                {/* Correct Answers Comparison */}
                <div className="bg-white p-4 rounded-lg border border-indigo-100">
                  <p className="text-sm text-gray-600 mb-2">Correct Answers</p>
                  <div className="flex items-center justify-between">
                    <div className="text-center">
                      <p className="text-2xl font-bold text-gray-400">{previousAttempt.correctAnswers}</p>
                      <p className="text-xs text-gray-500">Previous</p>
                    </div>
                    <div className="text-2xl">
                      {(session.correctAnswers || 0) > (previousAttempt.correctAnswers || 0) ? (
                        <span className="text-green-500">↗</span>
                      ) : (session.correctAnswers || 0) < (previousAttempt.correctAnswers || 0) ? (
                        <span className="text-red-500">↘</span>
                      ) : (
                        <span className="text-gray-400">→</span>
                      )}
                    </div>
                    <div className="text-center">
                      <p className="text-2xl font-bold text-indigo-600">{session.correctAnswers}</p>
                      <p className="text-xs text-gray-500">Current</p>
                    </div>
                  </div>
                  {(session.correctAnswers || 0) > (previousAttempt.correctAnswers || 0) && (
                    <p className="text-xs text-green-600 mt-2 text-center font-medium">
                      +{(session.correctAnswers || 0) - (previousAttempt.correctAnswers || 0)} more correct! 🎯
                    </p>
                  )}
                </div>
              </div>

              {/* Overall Progress Message */}
              <div className="mt-4 p-4 bg-white rounded-lg border border-indigo-100">
                {(session.scorePercentage || 0) > (previousAttempt.scorePercentage || 0) ? (
                  <p className="text-center text-indigo-700 font-medium">
                    🎉 Great progress! You're getting better at {session.moduleName}!
                  </p>
                ) : (session.scorePercentage || 0) === (previousAttempt.scorePercentage || 0) ? (
                  <p className="text-center text-indigo-700 font-medium">
                    📚 Consistent performance! Keep practicing to improve further.
                  </p>
                ) : (
                  <p className="text-center text-orange-700 font-medium">
                    💪 Don't give up! Review the concepts and try again - you'll do better!
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* AI Analysis Section */}
        <Card className="mb-6 border-purple-200 bg-gradient-to-br from-purple-50 to-pink-50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-purple-900">
              <Brain className="w-6 h-6" />
              AI Performance Analysis
            </CardTitle>
            <p className="text-sm text-gray-600">Get personalized insights powered by AI</p>
          </CardHeader>
          <CardContent>
            {!aiAnalysis ? (
              <div className="text-center py-6">
                <Button
                  onClick={handleGenerateAnalysis}
                  disabled={generateAnalysisMutation.isPending}
                  className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white"
                >
                  {generateAnalysisMutation.isPending ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      Analyzing...
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4 mr-2" />
                      Generate AI Analysis
                    </>
                  )}
                </Button>
                <p className="text-xs text-gray-500 mt-2">
                  Click to get detailed insights on your performance
                </p>
              </div>
            ) : (
              <div className="prose prose-sm max-w-none">
                <ReactMarkdown>{aiAnalysis.fullAnalysis}</ReactMarkdown>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Questions Review */}
        <Card>
          <CardHeader>
            <CardTitle>Question-by-Question Review</CardTitle>
            <p className="text-sm text-gray-600">Review each question and your answers</p>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              {responses.map((response, index) => (
                <div
                  key={response.id}
                  className={`p-4 rounded-lg border-2 ${
                    response.isCorrect
                      ? 'border-green-200 bg-green-50'
                      : 'border-red-200 bg-red-50'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div className="flex-shrink-0 mt-1">
                      {response.isCorrect ? (
                        <CheckCircle2 className="w-6 h-6 text-green-600" />
                      ) : (
                        <XCircle className="w-6 h-6 text-red-600" />
                      )}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-start justify-between mb-2">
                        <h3 className="font-semibold text-gray-900">
                          Question {index + 1}
                        </h3>
                        <span className={`px-2 py-1 rounded text-xs font-medium ${
                          response.difficulty === 'easy' ? 'bg-green-100 text-green-800' :
                          response.difficulty === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                          'bg-red-100 text-red-800'
                        }`}>
                          {response.difficulty?.toUpperCase()} • {response.points} pts
                        </span>
                      </div>
                      <p className="text-gray-700 mb-3">{response.questionText}</p>

                      {response.questionType === 'multiple_choice' && (
                        <div className="space-y-2 mb-3">
                          {response.options?.map((option: string, optIndex: number) => {
                            const isUserAnswer = option === response.userAnswer;
                            const isCorrectAnswer = option === response.correctAnswer;
                            
                            return (
                              <div
                                key={optIndex}
                                className={`p-2 rounded border ${
                                  isCorrectAnswer
                                    ? 'border-green-500 bg-green-100'
                                    : isUserAnswer
                                    ? 'border-red-500 bg-red-100'
                                    : 'border-gray-200 bg-white'
                                }`}
                              >
                                <span className="font-medium">{String.fromCharCode(65 + optIndex)}.</span> {option}
                                {isCorrectAnswer && <span className="ml-2 text-green-600 font-medium">✓ Correct</span>}
                                {isUserAnswer && !isCorrectAnswer && <span className="ml-2 text-red-600 font-medium">✗ Your answer</span>}
                              </div>
                            );
                          })}
                        </div>
                      )}

                      {response.questionType !== 'multiple_choice' && (
                        <div className="grid grid-cols-2 gap-3 mb-3">
                          <div>
                            <p className="text-xs text-gray-600 mb-1">Your Answer:</p>
                            <p className={`font-medium ${response.isCorrect ? 'text-green-700' : 'text-red-700'}`}>
                              {response.userAnswer || 'No answer'}
                            </p>
                          </div>
                          <div>
                            <p className="text-xs text-gray-600 mb-1">Correct Answer:</p>
                            <p className="font-medium text-green-700">{response.correctAnswer}</p>
                          </div>
                        </div>
                      )}

                      {response.explanation && (
                        <div className="mt-3 p-3 bg-blue-50 border border-blue-200 rounded">
                          <p className="text-sm text-blue-900">
                            <span className="font-semibold">Explanation: </span>
                            {response.explanation}
                          </p>
                        </div>
                      )}

                      {/* Detailed AI Explanation for wrong answers */}
                      {!response.isCorrect && (
                        <div className="mt-3">
                          {!expandedExplanations[response.questionId] ? (
                            <Button
                              onClick={() => handleGetDetailedExplanation(response)}
                              disabled={generateExplanationMutation.isPending}
                              variant="outline"
                              size="sm"
                              className="border-purple-300 text-purple-700 hover:bg-purple-50"
                            >
                              {generateExplanationMutation.isPending ? (
                                <>
                                  <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-purple-600 mr-2"></div>
                                  Generating...
                                </>
                              ) : (
                                <>
                                  <Sparkles className="w-3 h-3 mr-2" />
                                  Get Detailed Explanation
                                </>
                              )}
                            </Button>
                          ) : (
                            <div className="p-4 bg-gradient-to-br from-purple-50 to-pink-50 border-2 border-purple-200 rounded-lg">
                              <div className="flex items-center gap-2 mb-3">
                                <Brain className="w-5 h-5 text-purple-600" />
                                <h4 className="font-semibold text-purple-900">AI Detailed Explanation</h4>
                              </div>
                              
                              {/* Audio player at top */}
                              <div className="mb-3">
                                <TTSPlayer
                                  questionId={response.questionId}
                                  isChild={isChild}
                                  explanationText={expandedExplanations[response.questionId]}
                                  onHighlightChange={(index) => {
                                    setHighlightedQuestionId(response.questionId);
                                    setHighlightIndex(index);
                                  }}
                                />
                              </div>
                              
                              <div className="text-gray-800 mb-3">
                                <HighlightedText
                                  text={expandedExplanations[response.questionId]}
                                  highlightIndex={highlightedQuestionId === response.questionId ? highlightIndex : -1}
                                />
                              </div>
                              
                              {/* Audio player at bottom */}
                              <div className="mt-3">
                                <TTSPlayer
                                  questionId={response.questionId}
                                  isChild={isChild}
                                  explanationText={expandedExplanations[response.questionId]}
                                  onHighlightChange={(index) => {
                                    setHighlightedQuestionId(response.questionId);
                                    setHighlightIndex(index);
                                  }}
                                />
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

