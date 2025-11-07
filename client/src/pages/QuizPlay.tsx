import { useAuth } from "@/_core/hooks/useAuth";
import { encryptedRoutes, decryptId } from "@shared/urlEncryption";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { trpc } from "@/lib/trpc";
import { useEffect, useState, useRef } from "react";
import { useLocation, useParams } from "wouter";
import { toast } from "sonner";

export default function QuizPlay() {
  const { moduleId: encryptedModuleId } = useParams<{ moduleId: string }>();
  const { user, loading } = useAuth({ redirectOnUnauthenticated: false });
  const [, setLocation] = useLocation();
  
  // Decrypt the module ID from URL
  let moduleId: number;
  try {
    moduleId = decryptId(encryptedModuleId!);
  } catch (error) {
    console.error('Failed to decrypt module ID:', error);
    setLocation('/child');
    return null;
  }
  const [childUser, setChildUser] = useState<any>(null);
  const [isReady, setIsReady] = useState(false);

  const [sessionId, setSessionId] = useState<number | null>(null);
  const [currentQuestion, setCurrentQuestion] = useState<any>(null);
  const [currentQuestionNumber, setCurrentQuestionNumber] = useState(0);
  const [totalQuestions, setTotalQuestions] = useState(0);
  const [userAnswer, setUserAnswer] = useState("");
  const [timeLeft, setTimeLeft] = useState(0);
  const [questionStartTime, setQuestionStartTime] = useState(Date.now());
  const [isQuizComplete, setIsQuizComplete] = useState(false);
  const [quizResults, setQuizResults] = useState<any>(null);
  const [feedbackState, setFeedbackState] = useState<{
    show: boolean;
    isCorrect: boolean;
    isTimeout?: boolean;
    correctAnswer?: string;
    pointsEarned?: number;
  } | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isTimeoutSubmission, setIsTimeoutSubmission] = useState(false);
  const autoAdvanceTimerRef = useRef<NodeJS.Timeout | null>(null);

  const utils = trpc.useUtils();

  const startQuizMutation = trpc.child.startQuiz.useMutation({
    onSuccess: (data) => {
      console.log('Quiz started:', data);
      setSessionId(data.sessionId);
      setCurrentQuestion(data.question);
      setCurrentQuestionNumber(data.currentQuestionNumber);
      setTotalQuestions(data.totalQuestions);
      setTimeLeft(data.question?.timeLimit || 60);
      setQuestionStartTime(Date.now());
    },
    onError: (error) => {
      console.error('Failed to start quiz:', error);
      toast.error(`Failed to start quiz: ${error.message}`);
      setLocation('/child');
    },
  });

  const submitAnswerMutation = trpc.child.submitAnswer.useMutation({
    onSuccess: (result) => {
      setIsSubmitting(false);
      
      // Clear any existing auto-advance timer
      if (autoAdvanceTimerRef.current) {
        clearTimeout(autoAdvanceTimerRef.current);
        autoAdvanceTimerRef.current = null;
      }
      
      // Show prominent feedback
      setFeedbackState({
        show: true,
        isCorrect: result.isCorrect,
        isTimeout: isTimeoutSubmission,
        correctAnswer: result.correctAnswer,
        pointsEarned: result.pointsEarned,
      });
      
      const wasTimeout = isTimeoutSubmission;
      // Reset timeout flag
      setIsTimeoutSubmission(false);
      
      // For correct answers, auto-advance after 1.5 seconds
      // For incorrect answers or timeouts, wait for user to click OK button
      if (result.isCorrect) {
        autoAdvanceTimerRef.current = setTimeout(() => {
          handleAdvanceToNext();
          autoAdvanceTimerRef.current = null;
        }, 1500);
      }
    },
    onError: (error) => {
      setIsSubmitting(false);
      console.error('Failed to submit answer:', error);
      toast.error('Failed to submit answer');
    },
  });

  const handleAdvanceToNext = () => {
    // Clear any pending auto-advance timer
    if (autoAdvanceTimerRef.current) {
      clearTimeout(autoAdvanceTimerRef.current);
      autoAdvanceTimerRef.current = null;
    }
    
    setFeedbackState(null);
    
    // Check if quiz is complete (we've answered all questions)
    if (currentQuestionNumber >= totalQuestions) {
      // Quiz complete
      completeQuizMutation.mutate({ 
        sessionId: sessionId!,
        childId: childUser?.id
      });
    } else {
      // Fetch next adaptive question
      getNextQuestionMutation.mutate({ sessionId: sessionId! });
    }
  };

  const getNextQuestionMutation = trpc.child.getNextQuestion.useMutation({
    onSuccess: (data) => {
      setCurrentQuestion(data.question);
      setCurrentQuestionNumber(data.currentQuestionNumber);
      setUserAnswer("");
      setTimeLeft(data.question?.timeLimit || 60);
      setQuestionStartTime(Date.now());
    },
    onError: (error: any) => {
      console.error('Failed to get next question:', error);
      toast.error('Failed to load next question');
    },
  });

  const completeChallengeM = trpc.child.completeChallenge.useMutation();

  const completeQuizMutation = trpc.child.completeQuiz.useMutation({
    onSuccess: (results) => {
      setIsQuizComplete(true);
      setQuizResults(results);
      toast.success("Quiz completed!");
      
      // Invalidate queries to refresh stats and challenges
      utils.child.getMyStats.invalidate();
      utils.child.getChallenges.invalidate();
      utils.parent.getCompletedChallenges.invalidate();
      
      // Check if this was a challenge and mark it complete
      const challengeId = localStorage.getItem('currentChallengeId');
      if (challengeId) {
        completeChallengeM.mutate({ 
          challengeId: parseInt(challengeId),
          childId: childUser?.id,
          sessionId: sessionId!
        });
        localStorage.removeItem('currentChallengeId');
        toast.success("🎯 Challenge completed!");
      }
    },
  });

  // Block navigation when quiz is in progress
  useEffect(() => {
    if (!sessionId || isQuizComplete) return;

    // Block page refresh/close
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = 'You have a quiz in progress. If you leave, all progress will be lost and the session will be terminated. Are you sure?';
      return e.returnValue;
    };

    // Block browser back button
    let isNavigatingAway = false;
    
    const handlePopState = (e: PopStateEvent) => {
      if (isNavigatingAway) return; // Already confirmed, allow navigation
      
      const confirmExit = window.confirm(
        'You have a quiz in progress. If you leave, all progress will be lost and the session will be terminated. Are you sure you want to exit?'
      );
      
      if (!confirmExit) {
        // User cancelled - push state back to prevent navigation
        window.history.pushState(null, '', window.location.href);
      } else {
        // User confirmed exit - remove listeners and navigate back
        isNavigatingAway = true;
        window.removeEventListener('beforeunload', handleBeforeUnload);
        window.removeEventListener('popstate', handlePopState);
        window.history.back();
      }
    };

    // Push initial state to enable back button detection
    window.history.pushState(null, '', window.location.href);

    window.addEventListener('beforeunload', handleBeforeUnload);
    window.addEventListener('popstate', handlePopState);

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      window.removeEventListener('popstate', handlePopState);
      // Clear any pending auto-advance timer on cleanup
      if (autoAdvanceTimerRef.current) {
        clearTimeout(autoAdvanceTimerRef.current);
        autoAdvanceTimerRef.current = null;
      }
    };
  }, [sessionId, isQuizComplete]);

  useEffect(() => {
    // Check for local child login first
    const storedUser = localStorage.getItem('childUser');
    if (storedUser) {
      try {
        const parsed = JSON.parse(storedUser);
        setChildUser(parsed);
        setIsReady(true);
      } catch (e) {
        setLocation('/');
      }
    } else if (!loading && !user) {
      setLocation('/');
    } else if (!loading && user?.role === 'child') {
      setIsReady(true);
    }
  }, [loading, user, setLocation]);

  useEffect(() => {
    if (moduleId && !sessionId && isReady) {
      // Check if this quiz is from a challenge
      const challengeIdStr = localStorage.getItem('currentChallengeId');
      const challengeId = challengeIdStr ? parseInt(challengeIdStr, 10) : undefined;
      
      // Note: Don't remove challengeId here - it's needed when quiz completes
      // It will be removed after the quiz is completed (see completeQuizM.onSuccess)
      
      startQuizMutation.mutate({ 
        moduleId,
        childId: childUser?.id,
        challengeId
      });
    }
  }, [moduleId, isReady]);

  // Timer countdown
  useEffect(() => {
    if (timeLeft > 0 && !isQuizComplete && !feedbackState) {
      const timer = setTimeout(() => setTimeLeft(timeLeft - 1), 1000);
      return () => clearTimeout(timer);
    } else if (timeLeft === 0 && sessionId && !isQuizComplete && !feedbackState && !isSubmitting) {
      // Auto-submit on timeout with empty answer
      setIsTimeoutSubmission(true);
      setIsSubmitting(true);
      submitAnswerMutation.mutate({
        sessionId: sessionId!,
        questionId: currentQuestion.id,
        userAnswer: "", // Empty answer = unanswered
        timeSpent: Math.floor((Date.now() - questionStartTime) / 1000),
      });
    }
  }, [timeLeft, isQuizComplete, feedbackState]);

  if (loading || !sessionId || !currentQuestion) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-50 to-purple-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading quiz...</p>
        </div>
      </div>
    );
  }

  if (isQuizComplete && quizResults) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 to-blue-50 flex items-center justify-center p-4">
        <Card className="max-w-2xl w-full">
          <CardHeader className="text-center">
            <div className="text-6xl mb-4">
              {quizResults.scorePercentage >= 90 ? "🏆" : quizResults.scorePercentage >= 70 ? "⭐" : "📚"}
            </div>
            <CardTitle className="text-3xl">Quiz Complete!</CardTitle>
            <CardDescription>Here's how you did</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="text-center">
              <p className="text-5xl font-bold text-indigo-600 mb-2">{quizResults.scorePercentage}%</p>
              <Progress value={quizResults.scorePercentage} className="h-4" />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="text-center p-4 bg-green-50 rounded-lg">
                <p className="text-3xl font-bold text-green-600">{quizResults.correctAnswers}</p>
                <p className="text-sm text-gray-600">Correct</p>
              </div>
              <div className="text-center p-4 bg-red-50 rounded-lg">
                <p className="text-3xl font-bold text-red-600">{quizResults.wrongAnswers}</p>
                <p className="text-sm text-gray-600">Wrong</p>
              </div>
              <div className="text-center p-4 bg-purple-50 rounded-lg">
                <p className="text-3xl font-bold text-purple-600">{quizResults.totalPoints}</p>
                <p className="text-sm text-gray-600">Points Earned</p>
              </div>
              <div className="text-center p-4 bg-blue-50 rounded-lg">
                <p className="text-3xl font-bold text-blue-600">{Math.floor(quizResults.timeTaken / 60)}:{(quizResults.timeTaken % 60).toString().padStart(2, '0')}</p>
                <p className="text-sm text-gray-600">Time Taken</p>
              </div>
            </div>

            <div className="flex flex-col gap-2">
              <Button 
                className="w-full" 
                onClick={() => setLocation(encryptedRoutes.quizReview(sessionId!))}
              >
                📊 View Detailed Analysis
              </Button>
              <div className="flex gap-2">
                <Button className="flex-1" variant="outline" onClick={() => setLocation('/child')}>
                  Back to Dashboard
                </Button>
                <Button className="flex-1" variant="outline" onClick={() => window.location.reload()}>
                  Retry Quiz
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!currentQuestion) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading question...</p>
        </div>
      </div>
    );
  }

  const progress = (currentQuestionNumber / totalQuestions) * 100;

  const handleSubmitAnswer = () => {
    // Prevent duplicate submissions
    if (isSubmitting || submitAnswerMutation.isPending || getNextQuestionMutation.isPending) {
      return;
    }
    
    if (!userAnswer.trim() && currentQuestion.questionType !== 'true_false') {
      toast.error("Please select an answer!");
      return;
    }

    const timeSpent = Math.floor((Date.now() - questionStartTime) / 1000);
    setIsSubmitting(true);
    
    submitAnswerMutation.mutate({
      sessionId: sessionId!,
      questionId: currentQuestion.id,
      userAnswer: userAnswer || "No answer",
      timeSpent,
    });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50 p-4">
      <div className="container mx-auto max-w-3xl py-8">
        {/* Progress Bar */}
        <div className="mb-6">
          <div className="flex justify-between mb-2">
            <span className="text-sm font-medium text-gray-700">
              Question {currentQuestionNumber} of {totalQuestions}
            </span>
            <span className={`text-sm font-bold ${timeLeft < 10 ? 'text-red-600' : 'text-gray-700'}`}>
              ⏱️ {timeLeft}s
            </span>
          </div>
          <Progress value={progress} className="h-2" />
        </div>

        {/* Question Card */}
        <Card className="shadow-xl">
          <CardHeader>
            <div className="flex justify-between items-start">
              <div className="flex-1">
                <CardTitle className="text-2xl mb-2">{currentQuestion.questionText}</CardTitle>
                <div className="flex gap-2">
                  <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded">
                    {currentQuestion.difficulty}
                  </span>
                  <span className="text-xs bg-purple-100 text-purple-700 px-2 py-1 rounded">
                    {currentQuestion.points} points
                  </span>
                </div>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Multiple Choice Questions */}
            {currentQuestion.questionType === 'multiple_choice' && currentQuestion.options && (
              <RadioGroup value={userAnswer} onValueChange={setUserAnswer}>
                {currentQuestion.options.map((option: string, idx: number) => (
                  <div key={idx} className="flex items-center space-x-2 p-3 border rounded hover:bg-gray-50">
                    <RadioGroupItem value={option} id={`option-${idx}`} />
                    <Label htmlFor={`option-${idx}`} className="flex-1 cursor-pointer">
                      {option}
                    </Label>
                  </div>
                ))}
              </RadioGroup>
            )}

            {/* True/False */}
            {currentQuestion.questionType === 'true_false' && (
              <RadioGroup value={userAnswer} onValueChange={setUserAnswer}>
                <div className="flex items-center space-x-2 p-3 border rounded hover:bg-gray-50">
                  <RadioGroupItem value="True" id="true" />
                  <Label htmlFor="true" className="flex-1 cursor-pointer">True</Label>
                </div>
                <div className="flex items-center space-x-2 p-3 border rounded hover:bg-gray-50">
                  <RadioGroupItem value="False" id="false" />
                  <Label htmlFor="false" className="flex-1 cursor-pointer">False</Label>
                </div>
              </RadioGroup>
            )}

            {/* Fill in the Blank */}
            {currentQuestion.questionType === 'fill_blank' && (
              <Input
                value={userAnswer}
                onChange={(e) => setUserAnswer(e.target.value)}
                placeholder="Type your answer here..."
                className="text-lg p-4"
              />
            )}

            {/* Match the Following */}
            {currentQuestion.questionType === 'match' && (
              <Input
                value={userAnswer}
                onChange={(e) => setUserAnswer(e.target.value)}
                placeholder="Enter your answer (e.g., A-1, B-2, C-3)"
                className="text-lg p-4"
              />
            )}

            {/* Image Based */}
            {currentQuestion.questionType === 'image_based' && (
              <>
                {currentQuestion.questionImage && (
                  <img 
                    src={currentQuestion.questionImage} 
                    alt="Question" 
                    className="w-full rounded-lg mb-4"
                  />
                )}
                <Input
                  value={userAnswer}
                  onChange={(e) => setUserAnswer(e.target.value)}
                  placeholder="Type your answer..."
                  className="text-lg p-4"
                />
              </>
            )}

            <Button 
              className="w-full py-6 text-lg" 
              onClick={handleSubmitAnswer}
              disabled={submitAnswerMutation.isPending || getNextQuestionMutation.isPending}
            >
              {submitAnswerMutation.isPending || getNextQuestionMutation.isPending ? (
                <>
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2 inline-block"></div>
                  Loading next question...
                </>
              ) : (
                <>{currentQuestionNumber === totalQuestions ? "Finish Quiz" : "Next Question"} →</>
              )}
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Prominent Feedback Overlay */}
      {feedbackState && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className={`bg-white rounded-2xl shadow-2xl p-8 max-w-md w-full transform transition-all ${
            feedbackState.isCorrect ? 'border-4 border-green-500' : feedbackState.isTimeout ? 'border-4 border-orange-500' : 'border-4 border-red-500'
          }`}>
            <div className="text-center">
              {/* Icon */}
              <div className={`w-24 h-24 mx-auto mb-6 rounded-full flex items-center justify-center ${
                feedbackState.isCorrect ? 'bg-green-100' : feedbackState.isTimeout ? 'bg-orange-100' : 'bg-red-100'
              }`}>
                {feedbackState.isCorrect ? (
                  <svg className="w-16 h-16 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                  </svg>
                ) : feedbackState.isTimeout ? (
                  <svg className="w-16 h-16 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                ) : (
                  <svg className="w-16 h-16 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                )}
              </div>

              {/* Title */}
              <h2 className={`text-4xl font-bold mb-4 ${
                feedbackState.isCorrect ? 'text-green-600' : feedbackState.isTimeout ? 'text-orange-600' : 'text-red-600'
              }`}>
                {feedbackState.isCorrect ? '🎉 Correct!' : feedbackState.isTimeout ? '⏰ Time\'s Up!' : '❌ Incorrect'}
              </h2>

              {/* Points or Correct Answer */}
              {feedbackState.isCorrect ? (
                <p className="text-2xl text-gray-700 font-semibold">
                  +{feedbackState.pointsEarned} points
                </p>
              ) : (
                <div className="space-y-2">
                  <p className="text-lg text-gray-600">The correct answer is:</p>
                  <p className="text-2xl font-bold text-gray-900 bg-gray-100 p-4 rounded-lg">
                    {feedbackState.correctAnswer}
                  </p>
                </div>
              )}

              {/* Action button for incorrect answers */}
              {!feedbackState.isCorrect && (
                <button
                  onClick={handleAdvanceToNext}
                  className="mt-6 px-8 py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg transition-colors"
                >
                  OK, Got it!
                </button>
              )}
              
              {/* Auto-advance indicator for correct answers */}
              {feedbackState.isCorrect && (
                <div className="mt-6 text-sm text-gray-500">
                  Moving to next question...
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

