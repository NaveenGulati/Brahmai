import { useAuth } from "@/_core/hooks/useAuth";
import { decryptId, encryptedRoutes } from "@shared/urlEncryption";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";
import { useLocation, useParams } from "wouter";
import { CheckCircle2, XCircle, Clock, Award, Brain, Sparkles } from "lucide-react";
import ReactMarkdown from 'react-markdown';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import 'katex/dist/katex.min.css';
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
          <ReactMarkdown
            remarkPlugins={[remarkMath]}
            rehypePlugins={[rehypeKatex]}
          >
            {paragraph}
          </ReactMarkdown>
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
  const [simplificationLevels, setSimplificationLevels] = useState<Record<number, number>>({});
  const [explanationHistory, setExplanationHistory] = useState<Record<number, string[]>>({});
  const [highlightedQuestionId, setHighlightedQuestionId] = useState<number | null>(null);
  const [highlightIndex, setHighlightIndex] = useState<number>(-1);
  const [isSavingNote, setIsSavingNote] = useState(false);
  const explanationScrollRefs = useRef<Record<number, HTMLDivElement | null>>({});
  
  // Practice Similar Questions state
  const [showPracticeModal, setShowPracticeModal] = useState(false);
  const [practiceQuestions, setPracticeQuestions] = useState<any[]>([]);
  const [currentPracticeIndex, setCurrentPracticeIndex] = useState(0);
  const [practiceAnswers, setPracticeAnswers] = useState<Record<number, string>>({});
  const [practiceSubmitted, setPracticeSubmitted] = useState<Record<number, boolean>>({});
  const [originalQuestionForPractice, setOriginalQuestionForPractice] = useState<any>(null);
  const [showReattemptDialog, setShowReattemptDialog] = useState(false);
  const [reattemptParams, setReattemptParams] = useState<{
    questionCount: number;
    focusArea: 'strengthen' | 'improve' | 'balanced';
  }>({ questionCount: 20, focusArea: 'balanced' });
  
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

  // Create self-challenge mutation for reattempt
  const createSelfChallengeMutation = trpc.child.createSelfChallenge.useMutation({
    onSuccess: (data) => {
      // Store challenge ID and navigate to quiz
      localStorage.setItem('currentChallengeId', data.challengeId.toString());
      setShowReattemptDialog(false);
      // Navigate to quiz page
      setLocation(encryptedRoutes.quiz(actualReviewData?.session.moduleId || 0));
    },
    onError: (error) => {
      console.error('Failed to create challenge:', error);
      toast.error('Failed to create quiz. Please try again.');
    },
  });

  // Detailed explanation mutations - call both unconditionally (React hooks rule)
  const parentExplanationMutation = trpc.parent.generateDetailedExplanation.useMutation();
  const childExplanationMutation = trpc.child.generateDetailedExplanation.useMutation();
  const generateExplanationMutation = isChild ? childExplanationMutation : parentExplanationMutation;

  // Simplify explanation mutations - call both unconditionally (React hooks rule)
  const parentSimplifyMutation = trpc.parent.simplifyExplanation.useMutation();
  const childSimplifyMutation = trpc.child.simplifyExplanation.useMutation();
  const simplifyExplanationMutation = isChild ? childSimplifyMutation : parentSimplifyMutation;
  
  // Similar questions mutations - call both unconditionally (React hooks rule)
  const parentSimilarQuestionsMutation = trpc.parent.generateSimilarQuestions.useMutation();
  const childSimilarQuestionsMutation = trpc.child.generateSimilarQuestions.useMutation();
  const generateSimilarQuestionsMutation = isChild ? childSimilarQuestionsMutation : parentSimilarQuestionsMutation;

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
  
  const handlePracticeSimilar = async (response: any) => {
    try {
      // Get the detailed explanation if available
      const detailedExplanation = expandedExplanations[response.questionId] || '';
      
      const result = await generateSimilarQuestionsMutation.mutateAsync({
        questionId: response.questionId,
        questionText: response.questionText,
        correctAnswer: response.correctAnswer,
        detailedExplanation,
        moduleId: session.moduleId,
      });
      
      setPracticeQuestions(result.questions);
      setOriginalQuestionForPractice(response);
      setCurrentPracticeIndex(0);
      setPracticeAnswers({});
      setPracticeSubmitted({});
      setShowPracticeModal(true);
      toast.success('Practice questions generated!');
    } catch (error) {
      console.error('Failed to generate similar questions:', error);
      toast.error('Failed to generate practice questions. Please try again.');
    }
  };
  
  const handlePracticeAnswer = (questionIndex: number, answer: string) => {
    setPracticeAnswers(prev => ({
      ...prev,
      [questionIndex]: answer,
    }));
  };
  
  const handlePracticeSubmit = (questionIndex: number) => {
    setPracticeSubmitted(prev => ({
      ...prev,
      [questionIndex]: true,
    }));
  };
  
  const closePracticeModal = () => {
    setShowPracticeModal(false);
    setPracticeQuestions([]);
    setCurrentPracticeIndex(0);
    setPracticeAnswers({});
    setPracticeSubmitted({});
    setOriginalQuestionForPractice(null);
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
                  onClick={() => {
                    setReattemptParams({
                      questionCount: session.totalQuestions,
                      focusArea: (session.focusArea as 'strengthen' | 'improve' | 'balanced') || 'balanced'
                    });
                    setShowReattemptDialog(true);
                  }}
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  🔄 Reattempt Quiz
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
                          {response.difficulty?.toUpperCase()} • {response.maxPoints} pts
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

                      {/* Detailed AI Explanation for all questions */}
                      {(
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
                            <div className="bg-gradient-to-br from-purple-50 to-pink-50 border-2 border-purple-200 rounded-lg overflow-hidden">
                              <div className="flex items-center gap-2 p-4 pb-3">
                                <Brain className="w-5 h-5 text-purple-600" />
                                <h4 className="font-semibold text-purple-900">AI Detailed Explanation</h4>
                              </div>
                              
                              {/* Scrollable container with sticky audio controls */}
                              <div 
                                ref={(el) => { explanationScrollRefs.current[response.questionId] = el; }}
                                className="max-h-[600px] overflow-y-auto relative"
                              >
                                {/* Audio player - sticky within scrollable container */}
                                <div className="sticky top-0 z-10 bg-gradient-to-br from-purple-50 to-pink-50">
                                <TTSPlayer
                                  key={`tts-${response.questionId}-${simplificationLevels[response.questionId] ?? 0}`}
                                  questionId={response.questionId}
                                  isChild={isChild}
                                  explanationText={expandedExplanations[response.questionId]}
                                  simplificationLevel={simplificationLevels[response.questionId] ?? 0}
                                  isSavingNote={isSavingNote}
                                  onHighlightChange={(index) => {
                                    setHighlightedQuestionId(response.questionId);
                                    setHighlightIndex(index);
                                  }}
                                  onSaveNote={async (selectedText) => {
                                    if (!selectedText || selectedText.length < 10) {
                                      toast.error('Please select the section you want to add to your notes (at least 10 characters)');
                                      return;
                                    }
                                    
                                    setIsSavingNote(true);
                                    try {
                                      const subject = session.subjectName || 'General';
                                      
                                      const apiResponse = await fetch('/api/notes', {
                                        method: 'POST',
                                        headers: {
                                          'Content-Type': 'application/json',
                                        },
                                        credentials: 'include',
                                        body: JSON.stringify({
                                          highlightedText: selectedText,
                                          questionId: response.questionId,
                                          subject,
                                        }),
                                      });
                                      
                                      if (!apiResponse.ok) {
                                        const error = await apiResponse.json();
                                        throw new Error(error.error || 'Failed to save note');
                                      }
                                      
                                      const result = await apiResponse.json();
                                      console.log('✅ Note saved successfully!', result);
                                      
                                      toast.success(
                                        `Note saved to your ${subject} notes! 🚀`,
                                        {
                                          action: {
                                            label: 'View All Notes',
                                            onClick: () => window.location.href = '/child/notes',
                                          },
                                        }
                                      );
                                    } catch (error) {
                                      console.error('❌ Error saving note:', error);
                                      console.error('❌ Error details:', JSON.stringify(error, null, 2));
                                      toast.error('Failed to save note. Please try again.');
                                    } finally {
                                      setIsSavingNote(false);
                                    }
                                  }}
                                />
                                </div>
                                
                                {/* Explanation text - scrollable */}
                                <div className="text-gray-800 p-4 pt-2">
                                  <HighlightedText
                                    text={expandedExplanations[response.questionId]}
                                    highlightIndex={highlightedQuestionId === response.questionId ? highlightIndex : -1}
                                  />
                                  
                                  {/* Feedback buttons */}
                                  <div className="mt-6 pt-4 border-t border-purple-200 flex items-center justify-center gap-3">
                                    {/* Go Back button - show at level 2/4 and above (simplificationLevel >= 1) */}
                                    {(simplificationLevels[response.questionId] ?? 0) >= 1 && (
                                      <Button
                                        onClick={() => {
                                          const currentLevel = simplificationLevels[response.questionId] ?? 0;
                                          const history = explanationHistory[response.questionId] || [];
                                          
                                          if (history.length >= 1) {
                                            // Get previous explanation (last item in history)
                                            const previousExplanation = history[history.length - 1];
                                            
                                            // Update to previous level
                                            setExpandedExplanations(prev => ({
                                              ...prev,
                                              [response.questionId]: previousExplanation,
                                            }));
                                            setSimplificationLevels(prev => ({
                                              ...prev,
                                              [response.questionId]: currentLevel - 1,
                                            }));
                                            
                                            // Remove last item from history
                                            setExplanationHistory(prev => ({
                                              ...prev,
                                              [response.questionId]: history.slice(0, -1),
                                            }));
                                            
                                            toast.success(`Returned to level ${currentLevel}/4`);
                                            
                                            // Auto-scroll to top of explanation
                                            const scrollContainer = explanationScrollRefs.current[response.questionId];
                                            if (scrollContainer) {
                                              scrollContainer.scrollTo({ top: 0, behavior: 'smooth' });
                                            }
                                          }
                                        }}
                                        variant="outline"
                                        size="sm"
                                        className="border-blue-300 text-blue-700 hover:bg-blue-50"
                                      >
                                        ← Go back
                                      </Button>
                                    )}
                                    
                                    <Button
                                      onClick={() => {
                                        toast.success('Great! Glad you understood! 🎉');
                                      }}
                                      variant="outline"
                                      size="sm"
                                      className="border-green-300 text-green-700 hover:bg-green-50"
                                    >
                                      <CheckCircle2 className="w-4 h-4 mr-2" />
                                      I understand!
                                    </Button>
                                    
                                    {(simplificationLevels[response.questionId] ?? 0) < 3 && (
                                      <Button
                                        onClick={async () => {
                                          const currentLevel = simplificationLevels[response.questionId] ?? 0;
                                          const previousExplanation = expandedExplanations[response.questionId];
                                          
                                          try {
                                            const result = await simplifyExplanationMutation.mutateAsync({
                                              questionId: response.questionId,
                                              currentLevel,
                                              previousExplanation,
                                            });
                                            
                                            // Save current explanation to history before updating
                                            const currentExplanation = expandedExplanations[response.questionId];
                                            setExplanationHistory(prev => ({
                                              ...prev,
                                              [response.questionId]: [...(prev[response.questionId] || []), currentExplanation],
                                            }));
                                            
                                            // Update explanation and level
                                            setExpandedExplanations(prev => ({
                                              ...prev,
                                              [response.questionId]: result.explanationText,
                                            }));
                                            setSimplificationLevels(prev => ({
                                              ...prev,
                                              [response.questionId]: result.simplificationLevel,
                                            }));
                                            
                                            toast.success(`Simplified to level ${result.simplificationLevel + 1}/4`);
                                            
                                            // Auto-scroll to top of explanation
                                            const scrollContainer = explanationScrollRefs.current[response.questionId];
                                            if (scrollContainer) {
                                              scrollContainer.scrollTo({ top: 0, behavior: 'smooth' });
                                            }
                                          } catch (error) {
                                            console.error('Failed to simplify:', error);
                                            toast.error('Failed to simplify explanation. Please try again.');
                                          }
                                        }}
                                        variant="outline"
                                        size="sm"
                                        className="border-orange-300 text-orange-700 hover:bg-orange-50"
                                        disabled={simplifyExplanationMutation.isPending}
                                      >
                                        {simplifyExplanationMutation.isPending ? (
                                          <>
                                            <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-orange-600 mr-2"></div>
                                            Simplifying...
                                          </>
                                        ) : (
                                          <>
                                            🤔 Make it simpler
                                          </>
                                        )}
                                      </Button>
                                    )}
                                    
                                    {(simplificationLevels[response.questionId] ?? 0) >= 3 && (
                                      <p className="text-sm text-gray-500 italic">This is the simplest explanation available</p>
                                    )}
                                  </div>
                                  
                                  {/* Show current simplification level if > 0 */}
                                  {(simplificationLevels[response.questionId] ?? 0) > 0 && (
                                    <div className="mt-3 text-center">
                                      <span className="inline-block px-3 py-1 bg-purple-100 text-purple-700 rounded-full text-xs font-medium">
                                        Simplification Level: {simplificationLevels[response.questionId] + 1}/4
                                      </span>
                                    </div>
                                  )}
                                  
                                  {/* Practice Similar Questions Button */}
                                  <div className="mt-4 pt-4 border-t border-purple-200">
                                    <Button
                                      onClick={() => handlePracticeSimilar(response)}
                                      disabled={generateSimilarQuestionsMutation.isPending}
                                      size="sm"
                                      className="w-full bg-gradient-to-r from-pink-500 to-purple-600 text-white font-semibold shadow-lg hover:shadow-xl hover:from-pink-600 hover:to-purple-700 transition-all duration-200 transform hover:scale-[1.02]"
                                    >
                                      {generateSimilarQuestionsMutation.isPending ? (
                                        <>
                                          <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-pink-600 mr-2"></div>
                                          Generating Practice Questions...
                                        </>
                                      ) : (
                                        <>
                                          <Sparkles className="w-3 h-3 mr-2" />
                                          Practice Similar Questions
                                        </>
                                      )}
                                    </Button>
                                  </div>
                                </div>
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

      {/* Reattempt Quiz Dialog */}
      <Dialog open={showReattemptDialog} onOpenChange={setShowReattemptDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Reattempt Quiz</DialogTitle>
            <DialogDescription>
              Customize your quiz parameters or keep the same settings from your previous attempt.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            {/* Question Count */}
            <div className="space-y-2">
              <Label htmlFor="questionCount">Number of Questions</Label>
              <Input
                id="questionCount"
                type="number"
                min="5"
                max="50"
                value={reattemptParams.questionCount}
                onChange={(e) => setReattemptParams(prev => ({
                  ...prev,
                  questionCount: parseInt(e.target.value) || 20
                }))}
              />
            </div>

            {/* Focus Area */}
            <div className="space-y-2">
              <Label htmlFor="focusArea">Focus Area</Label>
              <Select
                value={reattemptParams.focusArea}
                onValueChange={(value: 'strengthen' | 'improve' | 'balanced') => 
                  setReattemptParams(prev => ({ ...prev, focusArea: value }))
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="strengthen">
                    <div className="flex flex-col">
                      <span className="font-medium">🛡️ Strengthen</span>
                      <span className="text-xs text-gray-500">Build confidence with easier questions</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="balanced">
                    <div className="flex flex-col">
                      <span className="font-medium">⚖️ Balanced</span>
                      <span className="text-xs text-gray-500">Even mix of all difficulty levels</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="improve">
                    <div className="flex flex-col">
                      <span className="font-medium">🚀 Improve</span>
                      <span className="text-xs text-gray-500">Challenge yourself with harder questions</span>
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowReattemptDialog(false)}>
              Cancel
            </Button>
            <Button 
              onClick={() => {
                createSelfChallengeMutation.mutate({
                  childId: user?.id,
                  moduleId: actualReviewData?.session.moduleId || 0,
                  questionCount: reattemptParams.questionCount,
                  focusArea: reattemptParams.focusArea
                });
              }}
              disabled={createSelfChallengeMutation.isLoading}
            >
              {createSelfChallengeMutation.isLoading ? 'Creating...' : 'Start Quiz'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Practice Similar Questions Modal */}
      <Dialog open={showPracticeModal} onOpenChange={closePracticeModal}>
        <DialogContent className="sm:max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <div className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-pink-600" />
              <DialogTitle>Practice Mode - Similar Questions</DialogTitle>
            </div>
            <DialogDescription>
              Practice with {practiceQuestions.length} questions similar to the original concept. Your answers won't be saved.
            </DialogDescription>
          </DialogHeader>
          
          {practiceQuestions.length > 0 && (
            <div className="space-y-6 py-4">
              {/* Progress indicator */}
              <div className="flex items-center justify-between text-sm text-gray-600">
                <span>Question {currentPracticeIndex + 1} of {practiceQuestions.length}</span>
                <span className="text-pink-600 font-medium">Practice Mode</span>
              </div>
              
              {/* Current practice question */}
              {practiceQuestions.map((question, idx) => (
                <div key={idx} className={idx === currentPracticeIndex ? 'block' : 'hidden'}>
                  <div className="bg-gradient-to-br from-pink-50 to-purple-50 border-2 border-pink-200 rounded-lg p-6">
                    {/* Question text */}
                    <div className="mb-4">
                      <div className="flex items-center justify-between mb-3">
                        <h3 className="font-semibold text-lg">Question {idx + 1}</h3>
                        <span className={`px-2 py-1 rounded text-xs font-medium uppercase ${
                          question.difficulty === 'easy' ? 'bg-green-100 text-green-800' :
                          question.difficulty === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                          'bg-red-100 text-red-800'
                        }`}>
                          {question.difficulty}
                        </span>
                      </div>
                      <ReactMarkdown
                        remarkPlugins={[remarkMath]}
                        rehypePlugins={[rehypeKatex]}
                        className="prose prose-sm max-w-none"
                      >
                        {question.questionText}
                      </ReactMarkdown>
                    </div>
                    
                    {/* Answer options */}
                    <div className="space-y-2 mb-4">
                      {question.type === 'MCQ' ? (
                        ['A', 'B', 'C', 'D'].map((option) => (
                          <button
                            key={option}
                            onClick={() => handlePracticeAnswer(idx, option)}
                            disabled={practiceSubmitted[idx]}
                            className={`w-full text-left p-3 rounded-lg border-2 transition-all ${
                              practiceAnswers[idx] === option
                                ? 'border-pink-500 bg-pink-100'
                                : 'border-gray-300 hover:border-pink-300 bg-white'
                            } ${
                              practiceSubmitted[idx]
                                ? option === question.correctAnswer
                                  ? 'border-green-500 bg-green-100'
                                  : practiceAnswers[idx] === option
                                  ? 'border-red-500 bg-red-100'
                                  : 'opacity-50'
                                : ''
                            }`}
                          >
                            <ReactMarkdown
                              remarkPlugins={[remarkMath]}
                              rehypePlugins={[rehypeKatex]}
                              className="prose prose-sm max-w-none"
                            >
                              {question[`option${option}`]}
                            </ReactMarkdown>
                          </button>
                        ))
                      ) : (
                        ['True', 'False'].map((option) => (
                          <button
                            key={option}
                            onClick={() => handlePracticeAnswer(idx, option)}
                            disabled={practiceSubmitted[idx]}
                            className={`w-full text-left p-3 rounded-lg border-2 transition-all ${
                              practiceAnswers[idx] === option
                                ? 'border-pink-500 bg-pink-100'
                                : 'border-gray-300 hover:border-pink-300 bg-white'
                            } ${
                              practiceSubmitted[idx]
                                ? option === question.correctAnswer
                                  ? 'border-green-500 bg-green-100'
                                  : practiceAnswers[idx] === option
                                  ? 'border-red-500 bg-red-100'
                                  : 'opacity-50'
                                : ''
                            }`}
                          >
                            {option}
                          </button>
                        ))
                      )}
                    </div>
                    
                    {/* Submit button */}
                    {!practiceSubmitted[idx] && practiceAnswers[idx] && (
                      <Button
                        onClick={() => handlePracticeSubmit(idx)}
                        className="w-full bg-pink-600 hover:bg-pink-700"
                      >
                        Submit Answer
                      </Button>
                    )}
                    
                    {/* Feedback after submission */}
                    {practiceSubmitted[idx] && (
                      <div className="mt-4 space-y-3">
                        {/* Correct/Incorrect indicator */}
                        <div className={`p-3 rounded-lg ${
                          practiceAnswers[idx] === question.correctAnswer
                            ? 'bg-green-100 border-2 border-green-500'
                            : 'bg-red-100 border-2 border-red-500'
                        }`}>
                          {practiceAnswers[idx] === question.correctAnswer ? (
                            <div className="flex items-center gap-2 text-green-700">
                              <CheckCircle2 className="w-5 h-5" />
                              <span className="font-semibold">Correct!</span>
                            </div>
                          ) : (
                            <div className="space-y-2">
                              <div className="flex items-center gap-2 text-red-700">
                                <XCircle className="w-5 h-5" />
                                <span className="font-semibold">Incorrect</span>
                              </div>
                              <p className="text-sm text-red-700">
                                Correct answer: <strong>{question.correctAnswer}</strong>
                              </p>
                            </div>
                          )}
                        </div>
                        
                        {/* Explanation */}
                        <div className="bg-white border-2 border-purple-200 rounded-lg p-4">
                          <h4 className="font-semibold text-purple-900 mb-2 flex items-center gap-2">
                            <Brain className="w-4 h-4" />
                            Explanation
                          </h4>
                          <ReactMarkdown
                            remarkPlugins={[remarkMath]}
                            rehypePlugins={[rehypeKatex]}
                            className="prose prose-sm max-w-none"
                          >
                            {question.explanation}
                          </ReactMarkdown>
                        </div>
                      </div>
                    )}
                  </div>
                  
                  {/* Navigation buttons */}
                  <div className="flex justify-between mt-4">
                    <Button
                      variant="outline"
                      onClick={() => setCurrentPracticeIndex(Math.max(0, currentPracticeIndex - 1))}
                      disabled={currentPracticeIndex === 0}
                    >
                      ← Previous
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => setCurrentPracticeIndex(Math.min(practiceQuestions.length - 1, currentPracticeIndex + 1))}
                      disabled={currentPracticeIndex === practiceQuestions.length - 1 || !practiceSubmitted[idx]}
                    >
                      Next →
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
          
          <DialogFooter>
            <Button variant="outline" onClick={closePracticeModal}>
              Back to Review
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

