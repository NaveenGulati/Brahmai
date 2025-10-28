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
        <Button 
          variant="outline" 
          onClick={() => setLocation('/parent')}
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
          </CardContent>
        </Card>

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

