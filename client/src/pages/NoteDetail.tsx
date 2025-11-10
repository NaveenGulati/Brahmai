import React, { useState } from 'react';
import { trpc } from '@/lib/trpc';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { ArrowLeft, Brain, CheckCircle2, XCircle, Sparkles, Trophy } from 'lucide-react';
import { toast } from 'sonner';
import { useLocation, useParams } from 'wouter';

export function NoteDetail() {
  const [, setLocation] = useLocation();
  const params = useParams();
  const noteId = parseInt(params.id || '0');

  const [quizStarted, setQuizStarted] = useState(false);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [showExplanation, setShowExplanation] = useState(false);
  const [score, setScore] = useState(0);
  const [quizCompleted, setQuizCompleted] = useState(false);

  // Fetch note details
  const { data: note, isLoading: noteLoading } = trpc.smartNotes.getById.useQuery({ noteId });

  // Fetch or generate questions
  const { data: questions, isLoading: questionsLoading, refetch: refetchQuestions } = 
    trpc.smartNotes.getQuestions.useQuery({ noteId });

  // Generate questions mutation
  const generateQuestionsMutation = trpc.smartNotes.generateQuestions.useMutation({
    onSuccess: () => {
      toast.success('Practice questions generated! 🎉');
      refetchQuestions();
      setQuizStarted(true);
    },
    onError: () => {
      toast.error('Failed to generate questions. Please try again.');
    },
  });

  // Record quiz attempt mutation
  const recordAttemptMutation = trpc.smartNotes.recordQuizAttempt.useMutation();

  if (noteLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 via-pink-50 to-blue-50 p-6">
        <div className="max-w-4xl mx-auto">
          <div className="animate-pulse space-y-4">
            <div className="h-12 bg-gray-200 rounded w-1/3"></div>
            <div className="h-64 bg-gray-200 rounded"></div>
          </div>
        </div>
      </div>
    );
  }

  if (!note) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 via-pink-50 to-blue-50 p-6">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Note not found</h2>
          <Button onClick={() => setLocation('/child/notes')}>
            Back to My Notes
          </Button>
        </div>
      </div>
    );
  }

  const subject = note.tags.find((t) => t.type === 'subject')?.name || 'General';
  const topic = note.tags.find((t) => t.type === 'topic')?.name;
  const subTopic = note.tags.find((t) => t.type === 'subTopic')?.name;

  const currentQuestion = questions?.[currentQuestionIndex];
  const totalQuestions = questions?.length || 0;

  const handleAnswerSelect = (answerIndex: number) => {
    if (showExplanation) return; // Prevent changing answer after submission
    setSelectedAnswer(answerIndex);
  };

  const handleSubmitAnswer = () => {
    if (selectedAnswer === null || !currentQuestion) return;

    setShowExplanation(true);
    if (selectedAnswer === currentQuestion.correctAnswerIndex) {
      setScore(score + 1);
      toast.success('Correct! 🎉');
    } else {
      toast.error('Not quite right. Check the explanation!');
    }
  };

  const handleNextQuestion = () => {
    if (currentQuestionIndex < totalQuestions - 1) {
      setCurrentQuestionIndex(currentQuestionIndex + 1);
      setSelectedAnswer(null);
      setShowExplanation(false);
    } else {
      // Quiz completed
      setQuizCompleted(true);
      recordAttemptMutation.mutate({
        noteId,
        score,
        totalQuestions,
      });
    }
  };

  const handleRestartQuiz = () => {
    setQuizStarted(false);
    setCurrentQuestionIndex(0);
    setSelectedAnswer(null);
    setShowExplanation(false);
    setScore(0);
    setQuizCompleted(false);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-pink-50 to-blue-50 p-6">
      <div className="max-w-4xl mx-auto">
        {/* Back button */}
        <Button
          variant="ghost"
          onClick={() => setLocation('/child/notes')}
          className="mb-4"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to My Notes
        </Button>

        {/* Note content */}
        <Card className="border-2 border-purple-200 mb-6">
          <CardContent className="p-6">
            {/* Tags */}
            <div className="flex flex-wrap gap-2 mb-4">
              <Badge className="bg-blue-100 text-blue-800">{subject}</Badge>
              {topic && <Badge className="bg-purple-100 text-purple-800">{topic}</Badge>}
              {subTopic && <Badge className="bg-pink-100 text-pink-800">{subTopic}</Badge>}
            </div>

            {/* Note text */}
            <p className="text-gray-800 text-lg leading-relaxed mb-4">{note.content}</p>

            {/* Source context */}
            {note.sourceQuestion && (
              <p className="text-sm text-gray-500 border-t pt-4">
                From a question about: "{note.sourceQuestion.text}"
              </p>
            )}
          </CardContent>
        </Card>

        {/* Quiz section */}
        {!quizStarted && !quizCompleted && (
          <Card className="border-2 border-purple-200">
            <CardContent className="p-8 text-center">
              <Brain className="w-16 h-16 text-purple-600 mx-auto mb-4" />
              <h2 className="text-2xl font-bold text-gray-900 mb-2">
                Ready to test yourself?
              </h2>
              <p className="text-gray-600 mb-6">
                Our AI will create 5 questions just for you, based on this note.
              </p>
              <Button
                size="lg"
                onClick={() => {
                  if (questions && questions.length > 0) {
                    setQuizStarted(true);
                  } else {
                    generateQuestionsMutation.mutate({ noteId });
                  }
                }}
                disabled={generateQuestionsMutation.isPending || questionsLoading}
                className="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600"
              >
                {generateQuestionsMutation.isPending ? (
                  <>
                    <Sparkles className="w-5 h-5 mr-2 animate-spin" />
                    Generating Questions...
                  </>
                ) : (
                  <>
                    <Brain className="w-5 h-5 mr-2" />
                    Generate Practice Questions
                  </>
                )}
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Quiz in progress */}
        {quizStarted && !quizCompleted && currentQuestion && (
          <Card className="border-2 border-purple-200">
            <CardContent className="p-6">
              {/* Progress bar */}
              <div className="mb-6">
                <div className="flex justify-between text-sm text-gray-600 mb-2">
                  <span>Question {currentQuestionIndex + 1} of {totalQuestions}</span>
                  <span>Score: {score}/{totalQuestions}</span>
                </div>
                <Progress value={((currentQuestionIndex + 1) / totalQuestions) * 100} />
              </div>

              {/* Question */}
              <h3 className="text-xl font-semibold text-gray-900 mb-4">
                {currentQuestion.questionText}
              </h3>

              {/* Options */}
              <div className="space-y-3 mb-6">
                {(currentQuestion.options as string[]).map((option, index) => {
                  const isSelected = selectedAnswer === index;
                  const isCorrect = index === currentQuestion.correctAnswerIndex;
                  const showResult = showExplanation;

                  let className = 'p-4 border-2 rounded-lg cursor-pointer transition-all ';
                  if (!showResult) {
                    className += isSelected
                      ? 'border-purple-500 bg-purple-50'
                      : 'border-gray-300 hover:border-purple-300';
                  } else {
                    if (isCorrect) {
                      className += 'border-green-500 bg-green-50';
                    } else if (isSelected && !isCorrect) {
                      className += 'border-red-500 bg-red-50';
                    } else {
                      className += 'border-gray-300 bg-gray-50';
                    }
                  }

                  return (
                    <div
                      key={index}
                      className={className}
                      onClick={() => handleAnswerSelect(index)}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-gray-800">{option}</span>
                        {showResult && isCorrect && (
                          <CheckCircle2 className="w-5 h-5 text-green-600" />
                        )}
                        {showResult && isSelected && !isCorrect && (
                          <XCircle className="w-5 h-5 text-red-600" />
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Explanation */}
              {showExplanation && (
                <div className="bg-blue-50 border-2 border-blue-200 rounded-lg p-4 mb-4">
                  <h4 className="font-semibold text-blue-900 mb-2">Explanation:</h4>
                  <p className="text-blue-800">{currentQuestion.explanation}</p>
                </div>
              )}

              {/* Action buttons */}
              <div className="flex justify-end gap-3">
                {!showExplanation ? (
                  <Button
                    onClick={handleSubmitAnswer}
                    disabled={selectedAnswer === null}
                  >
                    Submit Answer
                  </Button>
                ) : (
                  <Button onClick={handleNextQuestion}>
                    {currentQuestionIndex < totalQuestions - 1 ? 'Next Question' : 'Finish Quiz'}
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Quiz completed */}
        {quizCompleted && (
          <Card className="border-2 border-purple-200">
            <CardContent className="p-8 text-center">
              <Trophy className="w-20 h-20 text-yellow-500 mx-auto mb-4" />
              <h2 className="text-3xl font-bold text-gray-900 mb-2">Great effort!</h2>
              <p className="text-2xl text-gray-700 mb-6">
                You got <span className="font-bold text-purple-600">{score}</span> out of{' '}
                <span className="font-bold">{totalQuestions}</span> correct!
              </p>
              <div className="flex justify-center gap-3">
                <Button variant="outline" onClick={() => setLocation('/child/notes')}>
                  Back to My Notes
                </Button>
                <Button onClick={handleRestartQuiz}>
                  Try Another Note
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
