import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { trpc } from "@/lib/trpc";
import { useLocation, useParams } from "wouter";
import { CheckCircle2, XCircle, Clock, Award, Brain } from "lucide-react";
import ReactMarkdown from 'react-markdown';

export default function QuizReview() {
  const { sessionId } = useParams<{ sessionId: string }>();
  const [, setLocation] = useLocation();
  const { user } = useAuth();

  const { data: reviewData, isLoading } = trpc.parent.getQuizReview.useQuery(
    { sessionId: parseInt(sessionId!) },
    { enabled: !!sessionId }
  );

  const { data: previousAttempt } = trpc.parent.getPreviousAttempt.useQuery(
    { 
      moduleId: reviewData?.session.moduleId || 0,
      currentSessionId: parseInt(sessionId!) 
    },
    { enabled: !!reviewData?.session.moduleId }
  );

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading quiz review...</p>
        </div>
      </div>
    );
  }

  if (!reviewData) {
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

  const { session, responses, aiAnalysis } = reviewData;

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="container max-w-4xl">
              {/* Reattempt Test button only shown when child views their own results */}
              {user?.role === 'child' && (
                <Button
                  variant="outline"
                  onClick={() => setLocation(`/quiz/${session.moduleId}`)}
                  className="mt-4"
                >
                  🔄 Reattempt Test
                </Button>
              )}

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
            <div className="mt-4 flex justify-center">
              <Button 
                onClick={() => setLocation(`/quiz/${session.moduleId}`)}
                className="bg-blue-600 hover:bg-blue-700"
              >
                🔄 Reattempt Test
              </Button>
            </div>
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
                      {Math.floor(((previousAttempt.timeTaken || 0) - (session.timeTaken || 0)) / 60)}m {((previousAttempt.timeTaken || 0) - (session.timeTaken || 0)) % 60}s faster!
                    </p>
                  )}
                </div>

                {/* Accuracy Comparison */}
                <div className="bg-white p-4 rounded-lg border border-indigo-100">
                  <p className="text-sm text-gray-600 mb-2">Correct Answers</p>
                  <div className="flex items-center justify-between">
                    <div className="text-center">
                      <p className="text-2xl font-bold text-gray-400">{previousAttempt.correctAnswers}/{previousAttempt.totalQuestions}</p>
                      <p className="text-xs text-gray-500">Previous</p>
                    </div>
                    <div className="text-2xl">
                      {(session.correctAnswers || 0) > (previousAttempt.correctAnswers || 0) ? (
                        <span className="text-green-500">✓</span>
                      ) : (session.correctAnswers || 0) < (previousAttempt.correctAnswers || 0) ? (
                        <span className="text-red-500">✗</span>
                      ) : (
                        <span className="text-gray-400">≈</span>
                      )}
                    </div>
                    <div className="text-center">
                      <p className="text-2xl font-bold text-indigo-600">{session.correctAnswers}/{session.totalQuestions}</p>
                      <p className="text-xs text-gray-500">Current</p>
                    </div>
                  </div>
                  {(session.correctAnswers || 0) > (previousAttempt.correctAnswers || 0) && (
                    <p className="text-xs text-green-600 mt-2 text-center font-medium">
                      +{(session.correctAnswers || 0) - (previousAttempt.correctAnswers || 0)} more correct! 💪
                    </p>
                  )}
                </div>
              </div>

              {/* Overall Progress Message */}
              <div className="mt-4 p-3 bg-white rounded-lg border border-indigo-100">
                <p className="text-sm font-medium text-indigo-900">
                  {(session.scorePercentage || 0) > (previousAttempt.scorePercentage || 0) ? (
                    <span className="text-green-600">🌟 Great improvement! Keep up the excellent work!</span>
                  ) : (session.scorePercentage || 0) === (previousAttempt.scorePercentage || 0) ? (
                    <span className="text-blue-600">📚 Consistent performance. Try to improve speed or tackle harder questions!</span>
                  ) : (
                    <span className="text-orange-600">💡 Don't worry! Review the AI analysis below and practice the weak areas.</span>
                  )}
                </p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* AI Analysis */}
        {aiAnalysis && (
          <Card className="mb-6 border-blue-200 bg-gradient-to-br from-blue-50 to-indigo-50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-blue-900">
                <Brain className="w-6 h-6 text-blue-600" />
                AI Performance Analysis
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="prose prose-sm max-w-none prose-headings:text-blue-900 prose-strong:text-blue-800 prose-li:text-gray-700 prose-p:text-gray-700">
                <ReactMarkdown>{aiAnalysis.fullAnalysis}</ReactMarkdown>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Question-by-Question Review */}
        <div className="space-y-4">
          <h3 className="text-xl font-semibold">Question-by-Question Review</h3>
          {responses.map((response, index) => (
            <Card key={response.id} className={response.isCorrect ? 'border-green-200' : 'border-red-200'}>
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      {response.isCorrect ? (
                        <CheckCircle2 className="w-5 h-5 text-green-600" />
                      ) : (
                        <XCircle className="w-5 h-5 text-red-600" />
                      )}
                      <span className="font-semibold">Question {index + 1}</span>
                      <span className="text-xs px-2 py-1 rounded bg-gray-100">
                        {response.difficulty}
                      </span>
                      <span className="text-xs px-2 py-1 rounded bg-purple-100 text-purple-700">
                        {response.pointsEarned} / {response.maxPoints} points
                      </span>
                    </div>
                    <p className="text-gray-800 font-medium">{response.questionText}</p>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                {response.questionImage && (
                  <img 
                    src={response.questionImage} 
                    alt="Question" 
                    className="max-w-md rounded border"
                  />
                )}
                
                {/* Options for MCQ */}
                {response.questionType === 'mcq' && response.options && (
                  <div className="space-y-2">
                    {response.options.map((option: string, idx: number) => {
                      const isUserAnswer = response.userAnswer === option;
                      const isCorrectAnswer = response.correctAnswer === option;
                      
                      return (
                        <div
                          key={idx}
                          className={`p-3 rounded border ${
                            isCorrectAnswer
                              ? 'bg-green-50 border-green-300'
                              : isUserAnswer
                              ? 'bg-red-50 border-red-300'
                              : 'bg-gray-50 border-gray-200'
                          }`}
                        >
                          <div className="flex items-center gap-2">
                            {isCorrectAnswer && <CheckCircle2 className="w-4 h-4 text-green-600" />}
                            {isUserAnswer && !isCorrectAnswer && <XCircle className="w-4 h-4 text-red-600" />}
                            <span>{option}</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* True/False */}
                {response.questionType === 'true_false' && (
                  <div className="space-y-2">
                    {['True', 'False'].map((option) => {
                      const isUserAnswer = response.userAnswer === option;
                      const isCorrectAnswer = response.correctAnswer === option;
                      
                      return (
                        <div
                          key={option}
                          className={`p-3 rounded border ${
                            isCorrectAnswer
                              ? 'bg-green-50 border-green-300'
                              : isUserAnswer
                              ? 'bg-red-50 border-red-300'
                              : 'bg-gray-50 border-gray-200'
                          }`}
                        >
                          <div className="flex items-center gap-2">
                            {isCorrectAnswer && <CheckCircle2 className="w-4 h-4 text-green-600" />}
                            {isUserAnswer && !isCorrectAnswer && <XCircle className="w-4 h-4 text-red-600" />}
                            <span>{option}</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* Fill in blank / Other types */}
                {(response.questionType === 'fill_blank' || response.questionType === 'match') && (
                  <div className="space-y-2">
                    <div className="p-3 bg-gray-50 rounded border">
                      <p className="text-sm text-gray-600">Your Answer:</p>
                      <p className="font-medium">{response.userAnswer || '(No answer)'}</p>
                    </div>
                    <div className="p-3 bg-green-50 rounded border border-green-300">
                      <p className="text-sm text-gray-600">Correct Answer:</p>
                      <p className="font-medium text-green-700">{response.correctAnswer}</p>
                    </div>
                  </div>
                )}

                {/* Explanation */}
                {response.explanation && (
                  <div className="p-3 bg-blue-50 rounded border border-blue-200">
                    <p className="text-sm font-semibold text-blue-900 mb-1">Explanation:</p>
                    <p className="text-sm text-blue-800">{response.explanation}</p>
                  </div>
                )}

                <div className="flex items-center gap-4 text-xs text-gray-500 pt-2 border-t">
                  <span>Time spent: {response.timeSpent}s</span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}

