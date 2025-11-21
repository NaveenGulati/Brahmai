import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { BookOpen, Plus, Upload, Sparkles, Eye, CheckSquare } from "lucide-react";
import QuestionReviewInterface from "@/components/QuestionReviewInterface";

export default function TextbookManagerV2() {
  const utils = trpc.useUtils();
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isUploadDialogOpen, setIsUploadDialogOpen] = useState(false);
  const [selectedTextbook, setSelectedTextbook] = useState<any>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadProgress, setUploadProgress] = useState<string>("");

  // Fetch textbooks
  const { data: textbooks = [], isLoading } = trpc.qbAdmin.getTextbooks.useQuery();

  // Create textbook mutation
  const createMutation = trpc.qbAdmin.createTextbook.useMutation({
    onSuccess: () => {
      toast.success("Textbook created successfully!");
      setIsCreateDialogOpen(false);
      utils.qbAdmin.getTextbooks.invalidate();
    },
    onError: (error: any) => {
      toast.error(`Failed to create textbook: ${error.message}`);
    },
  });

  // Upload PDF mutation
  const uploadMutation = trpc.qbAdmin.uploadAndProcessPDF.useMutation({
    onSuccess: (result) => {
      toast.success(`PDF uploaded! ${result.chaptersCreated} chapters auto-generated.`);
      setIsUploadDialogOpen(false);
      setSelectedFile(null);
      setUploadProgress("");
      utils.qbAdmin.getTextbooks.invalidate();
    },
    onError: (error: any) => {
      toast.error(`Upload failed: ${error.message}`);
      setUploadProgress("");
    },
  });

  const handleCreateTextbook = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    
    const boards = formData.get('boards') as string;
    const boardsArray = boards.split(',').map(b => b.trim()).filter(Boolean);

    createMutation.mutate({
      name: formData.get('name') as string,
      author: formData.get('author') as string || undefined,
      publisher: formData.get('publisher') as string || undefined,
      isbn: formData.get('isbn') as string || undefined,
      boards: JSON.stringify(boardsArray),
      grade: parseInt(formData.get('grade') as string),
      subject: formData.get('subject') as string,
    });
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.type !== 'application/pdf') {
        toast.error('Please select a PDF file');
        return;
      }
      setSelectedFile(file);
    }
  };

  const handleUploadPDF = async () => {
    if (!selectedFile || !selectedTextbook) {
      toast.error('Please select a file and textbook');
      return;
    }

    setUploadProgress('Reading PDF...');

    // Convert file to base64
    const reader = new FileReader();
    reader.onload = async (e) => {
      const base64 = e.target?.result as string;
      const base64Data = base64.split(',')[1]; // Remove data:application/pdf;base64, prefix

      setUploadProgress('Uploading to server...');

      uploadMutation.mutate({
        textbookId: selectedTextbook.id,
        pdfBase64: base64Data,
        fileName: selectedFile.name,
      });
    };

    reader.onerror = () => {
      toast.error('Failed to read PDF file');
      setUploadProgress('');
    };

    reader.readAsDataURL(selectedFile);
  };

  if (isLoading) {
    return <div className="text-center py-8">Loading textbooks...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Textbook Management</h2>
          <p className="text-gray-600">Add textbooks and upload PDFs to auto-generate chapters</p>
        </div>
        <div className="flex gap-2">
          <Button onClick={() => setIsCreateDialogOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Add Textbook
          </Button>
          <Button onClick={() => setIsUploadDialogOpen(true)} variant="outline">
            <Upload className="h-4 w-4 mr-2" />
            Upload PDF
          </Button>
        </div>
      </div>

      {/* Textbooks Grid */}
      {textbooks.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <BookOpen className="h-12 w-12 mx-auto text-gray-400 mb-4" />
            <p className="text-gray-600 mb-4">No textbooks yet. Add your first textbook to get started.</p>
            <Button onClick={() => setIsCreateDialogOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Add Textbook
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {textbooks.map((textbook: any) => (
            <TextbookCard 
              key={textbook.id} 
              textbook={textbook}
              onUploadClick={() => {
                setSelectedTextbook(textbook);
                setIsUploadDialogOpen(true);
              }}
            />
          ))}
        </div>
      )}

      {/* Create Textbook Dialog */}
      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Add New Textbook</DialogTitle>
            <DialogDescription>
              Enter textbook details. You'll upload the PDF next to auto-generate chapters.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleCreateTextbook}>
            <div className="space-y-4">
              <div>
                <Label htmlFor="name">Textbook Name *</Label>
                <Input
                  id="name"
                  name="name"
                  required
                  placeholder="e.g., NCERT Mathematics Class 7"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="boards">Boards * (comma-separated)</Label>
                  <Input
                    id="boards"
                    name="boards"
                    required
                    placeholder="e.g., CBSE, ICSE, IB"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Enter multiple boards separated by commas
                  </p>
                </div>

                <div>
                  <Label htmlFor="grade">Grade *</Label>
                  <Select name="grade" required>
                    <SelectTrigger>
                      <SelectValue placeholder="Select grade" />
                    </SelectTrigger>
                    <SelectContent>
                      {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map((g) => (
                        <SelectItem key={g} value={g.toString()}>{g}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div>
                <Label htmlFor="subject">Subject *</Label>
                <Input
                  id="subject"
                  name="subject"
                  required
                  placeholder="e.g., Mathematics, Physics, Chemistry"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="author">Author</Label>
                  <Input
                    id="author"
                    name="author"
                    placeholder="e.g., NCERT"
                  />
                </div>

                <div>
                  <Label htmlFor="publisher">Publisher</Label>
                  <Input
                    id="publisher"
                    name="publisher"
                    placeholder="e.g., NCERT Publication"
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="isbn">ISBN</Label>
                <Input
                  id="isbn"
                  name="isbn"
                  placeholder="e.g., 978-81-7450-647-9"
                />
              </div>
            </div>

            <DialogFooter className="mt-6">
              <Button type="button" variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={createMutation.isPending}>
                {createMutation.isPending ? 'Creating...' : 'Create Textbook'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Upload PDF Dialog */}
      <Dialog open={isUploadDialogOpen} onOpenChange={setIsUploadDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Upload Textbook PDF</DialogTitle>
            <DialogDescription>
              Upload an OCR'd PDF (Adobe Scan Premium). Chapters will be auto-generated.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {!selectedTextbook && (
              <div>
                <Label>Select Textbook *</Label>
                <Select onValueChange={(value) => {
                  const textbook = textbooks.find((t: any) => t.id === parseInt(value));
                  setSelectedTextbook(textbook);
                }}>
                  <SelectTrigger>
                    <SelectValue placeholder="Choose a textbook" />
                  </SelectTrigger>
                  <SelectContent>
                    {textbooks.map((textbook: any) => (
                      <SelectItem key={textbook.id} value={textbook.id.toString()}>
                        {textbook.name} - Grade {textbook.grade}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {selectedTextbook && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="font-semibold text-blue-900">{selectedTextbook.name}</div>
                <div className="text-sm text-blue-700">
                  Grade {selectedTextbook.grade} • {selectedTextbook.subject}
                </div>
              </div>
            )}

            <div>
              <Label htmlFor="pdf-file">PDF File *</Label>
              <Input
                id="pdf-file"
                type="file"
                accept="application/pdf"
                onChange={handleFileSelect}
              />
              {selectedFile && (
                <p className="text-sm text-green-600 mt-2">
                  ✓ {selectedFile.name} ({(selectedFile.size / 1024 / 1024).toFixed(2)} MB)
                </p>
              )}
            </div>

            {uploadProgress && (
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <div className="flex items-center gap-2">
                  <Sparkles className="h-5 w-5 text-yellow-600 animate-spin" />
                  <div className="text-sm text-yellow-800">{uploadProgress}</div>
                </div>
              </div>
            )}

            <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
              <div className="text-sm text-gray-700">
                <div className="font-semibold mb-2">What happens next:</div>
                <ul className="space-y-1">
                  <li>✓ PDF uploaded to secure storage</li>
                  <li>✓ Text extracted from OCR PDF</li>
                  <li>✓ AI auto-catalogs chapters</li>
                  <li>✓ Chapters ready for question generation</li>
                </ul>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setIsUploadDialogOpen(false);
              setSelectedFile(null);
              setSelectedTextbook(null);
              setUploadProgress('');
            }}>
              Cancel
            </Button>
            <Button 
              onClick={handleUploadPDF}
              disabled={!selectedFile || !selectedTextbook || uploadMutation.isPending}
            >
              {uploadMutation.isPending ? (
                <>
                  <Sparkles className="h-4 w-4 mr-2 animate-spin" />
                  Processing...
                </>
              ) : (
                <>
                  <Upload className="h-4 w-4 mr-2" />
                  Upload & Process
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// Textbook Card Component
function TextbookCard({ textbook, onUploadClick }: { textbook: any; onUploadClick: () => void }) {
  const [showChapters, setShowChapters] = useState(false);
  const { data: chapters = [] } = trpc.qbAdmin.getChapters.useQuery(
    { textbookId: textbook.id },
    { enabled: showChapters }
  );

  const boards = textbook.boards ? JSON.parse(textbook.boards) : [textbook.board];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">{textbook.name}</CardTitle>
        <CardDescription>
          <div className="flex flex-wrap gap-1 mt-2">
            {boards.map((board: string, index: number) => (
              <Badge key={index} variant="outline">{board}</Badge>
            ))}
            <Badge variant="outline">Grade {textbook.grade}</Badge>
            <Badge variant="outline">{textbook.subject}</Badge>
          </div>
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {textbook.author && (
            <div className="text-sm text-gray-600">
              <span className="font-medium">Author:</span> {textbook.author}
            </div>
          )}
          {textbook.publisher && (
            <div className="text-sm text-gray-600">
              <span className="font-medium">Publisher:</span> {textbook.publisher}
            </div>
          )}
          
          <div className="flex gap-2">
            <Button size="sm" variant="outline" onClick={() => setShowChapters(!showChapters)}>
              <Eye className="h-4 w-4 mr-2" />
              {showChapters ? 'Hide' : 'View'} Chapters
            </Button>
            <Button size="sm" onClick={onUploadClick}>
              <Upload className="h-4 w-4 mr-2" />
              Upload PDF
            </Button>
          </div>

          {showChapters && (
            <div className="mt-4 space-y-2">
              {chapters.length === 0 ? (
                <p className="text-sm text-gray-500">No chapters yet. Upload a PDF to auto-generate chapters.</p>
              ) : (
                chapters.map((chapter: any) => (
                  <ChapterItem key={chapter.id} chapter={chapter} textbook={textbook} />
                ))
              )}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

// Chapter Item Component
function ChapterItem({ chapter, textbook }: { chapter: any; textbook: any }) {
  const [showGenerate, setShowGenerate] = useState(false);
  const [showReview, setShowReview] = useState(false);
  const [currentJobId, setCurrentJobId] = useState<number | null>(null);

  const utils = trpc.useUtils();

  const generateMutation = trpc.qbAdmin.generateQuestionsFromChapter.useMutation({
    onSuccess: (result) => {
      toast.success(`Generated ${result.questionsGenerated} questions!`);
      setCurrentJobId(result.jobId);
      setShowReview(true);
      setShowGenerate(false);
    },
    onError: (error: any) => {
      toast.error(`Generation failed: ${error.message}`);
    },
  });

  const handleGenerate = (formData: any) => {
    generateMutation.mutate({
      chapterId: chapter.id,
      ...formData,
    });
  };

  return (
    <>
      <div className="border rounded-lg p-3">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="font-medium">
              Chapter {chapter.chapterNumber}: {chapter.title}
            </div>
            <div className="text-xs text-gray-500 mt-1">
              Pages {chapter.pageStart}-{chapter.pageEnd}
            </div>
          </div>
          <Button size="sm" onClick={() => setShowGenerate(true)}>
            <Sparkles className="h-4 w-4 mr-2" />
            Generate
          </Button>
        </div>
      </div>

      {/* Generate Dialog */}
      <Dialog open={showGenerate} onOpenChange={setShowGenerate}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Generate Questions - {chapter.title}</DialogTitle>
            <DialogDescription>
              AI will generate 50-75+ questions based on chapter content
            </DialogDescription>
          </DialogHeader>

          {!showReview ? (
            <GenerateQuestionsForm
              chapter={chapter}
              textbook={textbook}
              onGenerate={handleGenerate}
              isGenerating={generateMutation.isPending}
            />
          ) : (
            <>
              <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-4">
                <div className="flex items-center gap-2">
                  <Sparkles className="h-5 w-5 text-green-600" />
                  <div className="text-sm text-green-800">
                    <div className="font-semibold">Questions generated successfully!</div>
                    <p>Review and approve questions below.</p>
                  </div>
                </div>
              </div>

              {currentJobId && <QuestionReviewInterfaceWithBulk jobId={currentJobId} />}

              <DialogFooter>
                <Button onClick={() => {
                  setShowGenerate(false);
                  setShowReview(false);
                  setCurrentJobId(null);
                }}>
                  Close
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}

// Generate Questions Form
function GenerateQuestionsForm({ chapter, textbook, onGenerate, isGenerating }: any) {
  const [formData, setFormData] = useState({
    board: textbook.boards ? JSON.parse(textbook.boards)[0] : 'CBSE',
    grade: textbook.grade || 7,
    subject: textbook.subject || '',
    topic: chapter.title || '',
    subTopic: '',
  });

  return (
    <div className="space-y-4">
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex items-start gap-2">
          <Sparkles className="h-5 w-5 text-blue-600 mt-0.5" />
          <div className="text-sm">
            <div className="font-semibold text-blue-900 mb-1">AI Question Generation</div>
            <ul className="text-blue-800 space-y-1">
              <li>• 50+ questions (75+ for Math/Physics/numerical subjects)</li>
              <li>• 90% MCQs, 10% True/False</li>
              <li>• Difficulty: 30% Easy, 40% Medium, 30% Hard</li>
              <li>• Grade-appropriate explanations (Indian curriculum)</li>
              <li>• Hard questions near-Olympiad level</li>
            </ul>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label>Board</Label>
          <Select 
            value={formData.board} 
            onValueChange={(value) => setFormData({ ...formData, board: value })}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {(textbook.boards ? JSON.parse(textbook.boards) : ['CBSE']).map((board: string) => (
                <SelectItem key={board} value={board}>{board}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label>Grade</Label>
          <Input value={formData.grade} disabled />
        </div>
      </div>

      <div>
        <Label>Subject</Label>
        <Input value={formData.subject} disabled />
      </div>

      <div>
        <Label>Topic</Label>
        <Input value={formData.topic} onChange={(e) => setFormData({ ...formData, topic: e.target.value })} />
      </div>

      <div>
        <Label>Sub-Topic *</Label>
        <Input
          value={formData.subTopic}
          onChange={(e) => setFormData({ ...formData, subTopic: e.target.value })}
          placeholder="e.g., Addition of Integers, Multiplication of Fractions"
        />
        <p className="text-xs text-gray-500 mt-1">
          Be specific - AI will generate questions for this subtopic
        </p>
      </div>

      <DialogFooter>
        <Button 
          onClick={() => onGenerate(formData)}
          disabled={isGenerating || !formData.subTopic}
        >
          {isGenerating ? (
            <>
              <Sparkles className="h-4 w-4 mr-2 animate-spin" />
              Generating...
            </>
          ) : (
            <>
              <Sparkles className="h-4 w-4 mr-2" />
              Generate Questions
            </>
          )}
        </Button>
      </DialogFooter>
    </div>
  );
}

// Question Review with Bulk Approve
function QuestionReviewInterfaceWithBulk({ jobId }: { jobId: number }) {
  const [selectedQuestions, setSelectedQuestions] = useState<number[]>([]);
  const utils = trpc.useUtils();

  const { data: questions = [] } = trpc.qbAdmin.getGeneratedQuestions.useQuery({ jobId });

  const bulkApproveMutation = trpc.qbAdmin.bulkApproveGeneratedQuestions.useMutation({
    onSuccess: (result) => {
      toast.success(`Approved ${result.successCount} questions!`);
      if (result.failedCount > 0) {
        toast.error(`Failed to approve ${result.failedCount} questions`);
      }
      setSelectedQuestions([]);
      utils.qbAdmin.getGeneratedQuestions.invalidate();
    },
    onError: (error: any) => {
      toast.error(`Bulk approve failed: ${error.message}`);
    },
  });

  const pendingQuestions = questions.filter((q: any) => q.reviewStatus === 'pending');

  const handleSelectAll = () => {
    if (selectedQuestions.length === pendingQuestions.length) {
      setSelectedQuestions([]);
    } else {
      setSelectedQuestions(pendingQuestions.map((q: any) => q.id));
    }
  };

  const handleBulkApprove = () => {
    if (selectedQuestions.length === 0) {
      toast.error('Please select questions to approve');
      return;
    }

    bulkApproveMutation.mutate({
      generatedQuestionIds: selectedQuestions,
    });
  };

  return (
    <div className="space-y-4">
      {pendingQuestions.length > 0 && (
        <div className="flex items-center justify-between bg-gray-50 p-3 rounded-lg">
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={selectedQuestions.length === pendingQuestions.length}
              onChange={handleSelectAll}
              className="h-4 w-4"
            />
            <span className="text-sm font-medium">
              {selectedQuestions.length} of {pendingQuestions.length} selected
            </span>
          </div>
          <Button
            size="sm"
            onClick={handleBulkApprove}
            disabled={selectedQuestions.length === 0 || bulkApproveMutation.isPending}
          >
            <CheckSquare className="h-4 w-4 mr-2" />
            Bulk Approve ({selectedQuestions.length})
          </Button>
        </div>
      )}

      <QuestionReviewInterface jobId={jobId} />
    </div>
  );
}
