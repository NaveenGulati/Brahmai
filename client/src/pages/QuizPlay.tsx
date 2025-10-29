import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { trpc } from "@/lib/trpc";
import { useEffect, useState } from "react";
import { useLocation, useParams } from "wouter";
import { toast } from "sonner";

export default function QuizPlay() {
  const { moduleId } = useParams<{ moduleId: string }>();
  const { user, loading } = useAuth({ redirectOnUnauthenticated: false });
  const [, setLocation] = useLocation();
  const [childUser, setChildUser] = useState<any>(null);
  const [isReady, setIsReady] = useState(false);

  const [sessionId, setSessionId] = useState<number | null>(null);
  const [questions, setQuestions] = useState<any[]>([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [userAnswer, setUserAnswer] = useState("");
  const [timeLeft, setTimeLeft] = useState(0);
  const [questionStartTime, setQuestionStartTime] = useState(Date.now());
  const [isQuizComplete, setIsQuizComplete] = useState(false);
  const [quizResults, setQuizResults] = useState<any>(null);

  const utils = trpc.useUtils();

  const startQuizMutation = trpc.child.startQuiz.useMutation({
    onSuccess: (data) => {
      console.log('Quiz started:', data);
      setSessionId(data.sessionId);
      setQuestions(data.questions);
      setCurrentQuestionIndex(0);
      setTimeLeft(data.questions[0]?.timeLimit || 60);
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
      if (result.isCorrect) {
        toast.success(`Correct! +${result.pointsEarned} points`);
      } else {
        toast.error(`Wrong! Correct answer: ${result.correctAnswer}`);
      }
      
      // Move to next question
      if (currentQuestionIndex < questions.length - 1) {
        setCurrentQuestionIndex(currentQuestionIndex + 1);
        setUserAnswer("");
        setTimeLeft(questions[currentQuestionIndex + 1]?.timeLimit || 60);
        setQuestionStartTime(Date.now());
      } else {
        // Quiz complete
        completeQuizMutation.mutate({ 
          sessionId: sessionId!,
          childId: childUser?.id
        });
      }
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

  useEffect(() => {
    // Check for local child login first
    const storedUser = localStorage.getItem('childUser');
    if (storedUser) {
      try {
        const parsed = JSON.parse(storedUser);
        setChildUser(parsed);
        setIsReady(true);
      } catch (e) {
        setLocation('/child-login');
      }
    } else if (!loading && !user) {
      setLocation('/child-login');
    } else if (!loading && user?.role === 'child') {
      setIsReady(true);
    }
  }, [loading, user, setLocation]);

  useEffect(() => {
    if (moduleId && !sessionId && isReady) {
      startQuizMutation.mutate({ 
        moduleId: parseInt(moduleId),
        childId: childUser?.id
      });
    }
  }, [moduleId, isReady]);

  // Timer countdown
  useEffect(() => {
    if (timeLeft > 0 && !isQuizComplete) {
      const timer = setTimeout(() => setTimeLeft(timeLeft - 1), 1000);
      return () => clearTimeout(timer);
    } else if (timeLeft === 0 && sessionId && !isQuizComplete) {
      // Auto-submit on timeout
      handleSubmitAnswer();
    }
  }, [timeLeft, isQuizComplete]);

  if (loading || !sessionId || questions.length === 0) {
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

            <div className="flex gap-2">
              <Button className="flex-1" onClick={() => setLocation('/child')}>
                Back to Dashboard
              </Button>
              <Button className="flex-1" variant="outline" onClick={() => window.location.reload()}>
                Retry Quiz
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const currentQuestion = questions[currentQuestionIndex];
  const progress = ((currentQuestionIndex + 1) / questions.length) * 100;

  const handleSubmitAnswer = () => {
    if (!userAnswer.trim() && currentQuestion.questionType !== 'true_false') {
      toast.error("Please select an answer!");
      return;
    }

    const timeSpent = Math.floor((Date.now() - questionStartTime) / 1000);
    
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
              Question {currentQuestionIndex + 1} of {questions.length}
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
            {/* MCQ */}
            {currentQuestion.questionType === 'mcq' && currentQuestion.options && (
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
              disabled={submitAnswerMutation.isPending}
            >
              {currentQuestionIndex === questions.length - 1 ? "Finish Quiz" : "Next Question"} →
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

