import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { CheckCircle, XCircle, Eye, ThumbsUp, ThumbsDown, AlertCircle } from "lucide-react";
import ReactMarkdown from "react-markdown";

interface QuestionReviewInterfaceProps {
  jobId: number;
}

export default function QuestionReviewInterface({ jobId }: QuestionReviewInterfaceProps) {
  const utils = trpc.useUtils();
  const [selectedQuestion, setSelectedQuestion] = useState<any>(null);
  const [reviewAction, setReviewAction] = useState<'approve' | 'reject' | null>(null);
  const [reviewNotes, setReviewNotes] = useState("");

  // Fetch generated questions
  const { data: questions = [], isLoading } = trpc.qbAdmin.getGeneratedQuestions.useQuery({ jobId });

  // Approve mutation
  const approveMutation = trpc.qbAdmin.approveGeneratedQuestion.useMutation({
    onSuccess: () => {
      toast.success("Question approved and added to question bank!");
      setSelectedQuestion(null);
      setReviewAction(null);
      setReviewNotes("");
      utils.qbAdmin.getGeneratedQuestions.invalidate();
    },
    onError: (error: any) => {
      toast.error(`Failed to approve: ${error.message}`);
    },
  });

  // Reject mutation
  const rejectMutation = trpc.qbAdmin.rejectGeneratedQuestion.useMutation({
    onSuccess: () => {
      toast.success("Question rejected");
      setSelectedQuestion(null);
      setReviewAction(null);
      setReviewNotes("");
      utils.qbAdmin.getGeneratedQuestions.invalidate();
    },
    onError: (error: any) => {
      toast.error(`Failed to reject: ${error.message}`);
    },
  });

  const handleReview = () => {
    if (!selectedQuestion || !reviewAction) return;

    if (reviewAction === 'approve') {
      approveMutation.mutate({
        generatedQuestionId: selectedQuestion.id,
        reviewNotes,
      });
    } else {
      if (!reviewNotes.trim()) {
        toast.error("Please provide a reason for rejection");
        return;
      }
      rejectMutation.mutate({
        generatedQuestionId: selectedQuestion.id,
        reviewNotes,
      });
    }
  };

  const pendingQuestions = questions.filter((q: any) => q.reviewStatus === 'pending');
  const approvedQuestions = questions.filter((q: any) => q.reviewStatus === 'approved');
  const rejectedQuestions = questions.filter((q: any) => q.reviewStatus === 'rejected');

  if (isLoading) {
    return <div className="text-center py-8">Loading questions...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardDescription>Pending Review</CardDescription>
            <CardTitle className="text-3xl text-yellow-600">{pendingQuestions.length}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardDescription>Approved</CardDescription>
            <CardTitle className="text-3xl text-green-600">{approvedQuestions.length}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardDescription>Rejected</CardDescription>
            <CardTitle className="text-3xl text-red-600">{rejectedQuestions.length}</CardTitle>
          </CardHeader>
        </Card>
      </div>

      {/* Pending Questions */}
      {pendingQuestions.length > 0 && (
        <div>
          <h3 className="text-lg font-semibold mb-4">Questions Pending Review</h3>
          <div className="space-y-4">
            {pendingQuestions.map((q: any) => (
              <QuestionCard
                key={q.id}
                question={q}
                onReview={(action) => {
                  setSelectedQuestion(q);
                  setReviewAction(action);
                }}
              />
            ))}
          </div>
        </div>
      )}

      {/* Approved Questions */}
      {approvedQuestions.length > 0 && (
        <div>
          <h3 className="text-lg font-semibold mb-4 text-green-700">Approved Questions</h3>
          <div className="space-y-4">
            {approvedQuestions.map((q: any) => (
              <QuestionCard key={q.id} question={q} readonly />
            ))}
          </div>
        </div>
      )}

      {/* Rejected Questions */}
      {rejectedQuestions.length > 0 && (
        <div>
          <h3 className="text-lg font-semibold mb-4 text-red-700">Rejected Questions</h3>
          <div className="space-y-4">
            {rejectedQuestions.map((q: any) => (
              <QuestionCard key={q.id} question={q} readonly />
            ))}
          </div>
        </div>
      )}

      {/* Review Dialog */}
      <Dialog open={!!reviewAction} onOpenChange={() => {
        setReviewAction(null);
        setReviewNotes("");
      }}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {reviewAction === 'approve' ? 'Approve Question' : 'Reject Question'}
            </DialogTitle>
            <DialogDescription>
              {reviewAction === 'approve' 
                ? 'This question will be added to the main question bank.'
                : 'Please provide a reason for rejecting this question.'}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="reviewNotes">
                {reviewAction === 'approve' ? 'Review Notes (Optional)' : 'Rejection Reason *'}
              </Label>
              <Textarea
                id="reviewNotes"
                value={reviewNotes}
                onChange={(e) => setReviewNotes(e.target.value)}
                placeholder={reviewAction === 'approve' 
                  ? 'Add any notes about this question...'
                  : 'Explain why this question is being rejected...'}
                rows={4}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setReviewAction(null);
              setReviewNotes("");
            }}>
              Cancel
            </Button>
            <Button
              onClick={handleReview}
              disabled={approveMutation.isPending || rejectMutation.isPending}
              variant={reviewAction === 'approve' ? 'default' : 'destructive'}
            >
              {approveMutation.isPending || rejectMutation.isPending
                ? 'Processing...'
                : reviewAction === 'approve'
                ? 'Approve & Add to Bank'
                : 'Reject Question'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// Question Card Component
function QuestionCard({ 
  question, 
  onReview, 
  readonly = false 
}: { 
  question: any; 
  onReview?: (action: 'approve' | 'reject') => void;
  readonly?: boolean;
}) {
  const [showDetails, setShowDetails] = useState(false);
  const data = question.questionData;

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'easy': return 'bg-green-100 text-green-800';
      case 'medium': return 'bg-yellow-100 text-yellow-800';
      case 'hard': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'approved': return 'bg-green-100 text-green-800';
      case 'rejected': return 'bg-red-100 text-red-800';
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <Badge className={getDifficultyColor(data.difficulty)}>
                {data.difficulty}
              </Badge>
              <Badge className={getStatusColor(question.reviewStatus)}>
                {question.reviewStatus}
              </Badge>
              <Badge variant="outline">{data.questionType}</Badge>
              <Badge variant="outline">{data.points} pts</Badge>
              {question.qualityScore && (
                <Badge variant="outline">Quality: {question.qualityScore}/100</Badge>
              )}
            </div>
            <CardTitle className="text-lg">{data.questionText}</CardTitle>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {/* Options */}
          <div>
            <div className="font-medium text-sm text-gray-600 mb-2">Options:</div>
            <div className="space-y-2">
              {data.options.map((option: string, index: number) => (
                <div 
                  key={index} 
                  className={`p-2 rounded ${
                    option === data.correctAnswer 
                      ? 'bg-green-50 border border-green-200' 
                      : 'bg-gray-50'
                  }`}
                >
                  <span className="font-medium">{String.fromCharCode(65 + index)}.</span> {option}
                  {option === data.correctAnswer && (
                    <CheckCircle className="inline-block ml-2 h-4 w-4 text-green-600" />
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Explanation */}
          <div>
            <div className="font-medium text-sm text-gray-600 mb-1">Brief Explanation:</div>
            <p className="text-sm text-gray-700">{data.explanation}</p>
          </div>

          {/* Show/Hide Detailed Explanation */}
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowDetails(!showDetails)}
          >
            <Eye className="h-4 w-4 mr-2" />
            {showDetails ? 'Hide' : 'Show'} Detailed Explanation
          </Button>

          {showDetails && (
            <div className="border-t pt-4">
              <div className="font-medium text-sm text-gray-600 mb-2">Detailed Explanation:</div>
              <div className="prose prose-sm max-w-none">
                <ReactMarkdown>{data.detailedExplanation}</ReactMarkdown>
              </div>
              <div className="mt-4 grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="font-medium">Bloom's Level:</span> {data.bloomsLevel}
                </div>
                <div>
                  <span className="font-medium">Time Limit:</span> {data.timeLimit}s
                </div>
                <div className="col-span-2">
                  <span className="font-medium">Tags:</span> {data.tags.join(', ')}
                </div>
              </div>
            </div>
          )}

          {/* Review Notes */}
          {question.reviewNotes && (
            <div className="border-t pt-4">
              <div className="flex items-start gap-2">
                <AlertCircle className="h-4 w-4 text-gray-500 mt-0.5" />
                <div>
                  <div className="font-medium text-sm text-gray-600">Review Notes:</div>
                  <p className="text-sm text-gray-700">{question.reviewNotes}</p>
                </div>
              </div>
            </div>
          )}

          {/* Action Buttons */}
          {!readonly && onReview && (
            <div className="flex gap-2 pt-4 border-t">
              <Button
                onClick={() => onReview('approve')}
                className="flex-1"
                variant="default"
              >
                <ThumbsUp className="h-4 w-4 mr-2" />
                Approve
              </Button>
              <Button
                onClick={() => onReview('reject')}
                className="flex-1"
                variant="destructive"
              >
                <ThumbsDown className="h-4 w-4 mr-2" />
                Reject
              </Button>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
