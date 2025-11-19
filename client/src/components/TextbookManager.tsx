import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { BookOpen, Plus, Edit2, Trash2, Upload, Sparkles, Eye } from "lucide-react";
import QuestionReviewInterface from "@/components/QuestionReviewInterface";

export default function TextbookManager() {
  const utils = trpc.useUtils();
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [selectedTextbook, setSelectedTextbook] = useState<any>(null);

  // Fetch textbooks
  const { data: textbooks = [], isLoading } = trpc.qbAdmin.getTextbooks.useQuery();

  // Create textbook mutation
  const createTextbookMutation = trpc.qbAdmin.createTextbook.useMutation({
    onSuccess: () => {
      toast.success("Textbook created successfully!");
      setIsCreateDialogOpen(false);
      utils.qbAdmin.getTextbooks.invalidate();
    },
    onError: (error: any) => {
      toast.error(`Failed to create textbook: ${error.message}`);
    },
  });

  // Delete textbook mutation
  const deleteTextbookMutation = trpc.qbAdmin.deleteTextbook.useMutation({
    onSuccess: () => {
      toast.success("Textbook deleted successfully!");
      utils.qbAdmin.getTextbooks.invalidate();
    },
    onError: (error: any) => {
      toast.error(`Failed to delete textbook: ${error.message}`);
    },
  });

  const handleCreateTextbook = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    
    createTextbookMutation.mutate({
      name: formData.get("name") as string,
      author: formData.get("author") as string || undefined,
      publisher: formData.get("publisher") as string || undefined,
      isbn: formData.get("isbn") as string || undefined,
      board: formData.get("board") as string || undefined,
      grade: formData.get("grade") ? parseInt(formData.get("grade") as string) : undefined,
      subject: formData.get("subject") as string || undefined,
    });
  };

  const handleDeleteTextbook = (id: number) => {
    if (confirm("Are you sure you want to delete this textbook? This will also delete all associated chapters.")) {
      deleteTextbookMutation.mutate({ id });
    }
  };

  if (isLoading) {
    return <div className="text-center py-8">Loading textbooks...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Header with Create Button */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Textbook Library</h2>
          <p className="text-gray-600">Manage textbooks and upload chapter PDFs for question generation</p>
        </div>
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Add Textbook
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <form onSubmit={handleCreateTextbook}>
              <DialogHeader>
                <DialogTitle>Add New Textbook</DialogTitle>
                <DialogDescription>
                  Enter textbook details. You can add chapters and upload PDFs after creating the textbook.
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid gap-2">
                  <Label htmlFor="name">Textbook Name *</Label>
                  <Input id="name" name="name" placeholder="e.g., Mathematics for Class 7" required />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label htmlFor="board">Board</Label>
                    <Select name="board">
                      <SelectTrigger>
                        <SelectValue placeholder="Select board" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="ICSE">ICSE</SelectItem>
                        <SelectItem value="CBSE">CBSE</SelectItem>
                        <SelectItem value="IB">IB</SelectItem>
                        <SelectItem value="State">State Board</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="grade">Grade</Label>
                    <Select name="grade">
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
                <div className="grid gap-2">
                  <Label htmlFor="subject">Subject</Label>
                  <Input id="subject" name="subject" placeholder="e.g., Mathematics, Physics" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label htmlFor="author">Author</Label>
                    <Input id="author" name="author" placeholder="Author name" />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="publisher">Publisher</Label>
                    <Input id="publisher" name="publisher" placeholder="Publisher name" />
                  </div>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="isbn">ISBN</Label>
                  <Input id="isbn" name="isbn" placeholder="ISBN number" />
                </div>
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={createTextbookMutation.isPending}>
                  {createTextbookMutation.isPending ? "Creating..." : "Create Textbook"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Textbook Grid */}
      {textbooks.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <BookOpen className="h-16 w-16 text-gray-400 mb-4" />
            <h3 className="text-lg font-semibold mb-2">No Textbooks Yet</h3>
            <p className="text-gray-600 mb-4">Get started by adding your first textbook</p>
            <Button onClick={() => setIsCreateDialogOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Add Textbook
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {textbooks.map((textbook: any) => (
            <Card key={textbook.id} className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <CardTitle className="text-lg line-clamp-2">{textbook.name}</CardTitle>
                    <CardDescription className="mt-1">
                      {textbook.board && textbook.grade && (
                        <span className="text-sm">{textbook.board} - Grade {textbook.grade}</span>
                      )}
                      {textbook.subject && (
                        <span className="block text-sm text-purple-600">{textbook.subject}</span>
                      )}
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 text-sm text-gray-600 mb-4">
                  {textbook.author && (
                    <div><span className="font-medium">Author:</span> {textbook.author}</div>
                  )}
                  {textbook.publisher && (
                    <div><span className="font-medium">Publisher:</span> {textbook.publisher}</div>
                  )}
                  {textbook.isbn && (
                    <div><span className="font-medium">ISBN:</span> {textbook.isbn}</div>
                  )}
                </div>
                <div className="flex gap-2">
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="flex-1"
                    onClick={() => setSelectedTextbook(textbook)}
                  >
                    <Upload className="h-4 w-4 mr-2" />
                    Manage Chapters
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => handleDeleteTextbook(textbook.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Chapter Manager Dialog */}
      {selectedTextbook && (
        <ChapterManagerDialog 
          textbook={selectedTextbook} 
          open={!!selectedTextbook}
          onClose={() => setSelectedTextbook(null)}
        />
      )}
    </div>
  );
}

// Chapter Manager Dialog Component
function ChapterManagerDialog({ textbook, open, onClose }: any) {
  const utils = trpc.useUtils();
  const [isAddingChapter, setIsAddingChapter] = useState(false);

  // Fetch chapters
  const { data: chapters = [] } = trpc.qbAdmin.getChapters.useQuery(
    { textbookId: textbook.id },
    { enabled: open }
  );

  // Create chapter mutation
  const createChapterMutation = trpc.qbAdmin.createChapter.useMutation({
    onSuccess: () => {
      toast.success("Chapter added successfully!");
      setIsAddingChapter(false);
      utils.qbAdmin.getChapters.invalidate();
    },
    onError: (error: any) => {
      toast.error(`Failed to add chapter: ${error.message}`);
    },
  });

  const handleAddChapter = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    
    createChapterMutation.mutate({
      textbookId: textbook.id,
      chapterNumber: parseInt(formData.get("chapterNumber") as string),
      title: formData.get("title") as string,
      pageStart: formData.get("pageStart") ? parseInt(formData.get("pageStart") as string) : undefined,
      pageEnd: formData.get("pageEnd") ? parseInt(formData.get("pageEnd") as string) : undefined,
    });
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{textbook.name}</DialogTitle>
          <DialogDescription>
            Manage chapters and upload PDFs for AI question generation
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Add Chapter Form */}
          {isAddingChapter ? (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Add New Chapter</CardTitle>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleAddChapter} className="space-y-4">
                  <div className="grid grid-cols-3 gap-4">
                    <div className="grid gap-2">
                      <Label htmlFor="chapterNumber">Chapter Number *</Label>
                      <Input 
                        id="chapterNumber" 
                        name="chapterNumber" 
                        type="number" 
                        min="1"
                        required 
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="pageStart">Page Start</Label>
                      <Input id="pageStart" name="pageStart" type="number" min="1" />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="pageEnd">Page End</Label>
                      <Input id="pageEnd" name="pageEnd" type="number" min="1" />
                    </div>
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="title">Chapter Title *</Label>
                    <Input 
                      id="title" 
                      name="title" 
                      placeholder="e.g., Integers" 
                      required 
                    />
                  </div>
                  <div className="flex gap-2">
                    <Button type="submit" disabled={createChapterMutation.isPending}>
                      {createChapterMutation.isPending ? "Adding..." : "Add Chapter"}
                    </Button>
                    <Button 
                      type="button" 
                      variant="outline" 
                      onClick={() => setIsAddingChapter(false)}
                    >
                      Cancel
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          ) : (
            <Button onClick={() => setIsAddingChapter(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Add Chapter
            </Button>
          )}

          {/* Chapters List */}
          <div className="space-y-3">
            {chapters.length === 0 ? (
              <Card>
                <CardContent className="text-center py-8 text-gray-500">
                  <p>No chapters added yet. Add your first chapter to get started.</p>
                </CardContent>
              </Card>
            ) : (
              chapters.map((chapter: any) => (
                <Card key={chapter.id}>
                  <CardContent className="flex items-center justify-between py-4">
                    <div className="flex-1">
                      <div className="font-semibold">
                        Chapter {chapter.chapterNumber}: {chapter.title}
                      </div>
                      {chapter.pageStart && chapter.pageEnd && (
                        <div className="text-sm text-gray-600">
                          Pages {chapter.pageStart} - {chapter.pageEnd}
                        </div>
                      )}
                      <div className="text-sm text-gray-500 mt-1">
                        Status: <span className="capitalize">{chapter.status || 'pending'}</span>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button 
                        size="sm" 
                        variant="outline"
                        onClick={() => {
                          // TODO: Implement PDF upload
                          toast.info("PDF upload coming soon! For now, you can manually add extracted text.");
                        }}
                      >
                        <Upload className="h-4 w-4 mr-2" />
                        Upload PDF
                      </Button>
                      <GenerateQuestionsButton chapter={chapter} textbook={textbook} />
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}


// Generate Questions Button Component
function GenerateQuestionsButton({ chapter, textbook }: { chapter: any; textbook: any }) {
  const utils = trpc.useUtils();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [showReview, setShowReview] = useState(false);
  const [currentJobId, setCurrentJobId] = useState<number | null>(null);
  const [formData, setFormData] = useState({
    board: textbook.board || 'CBSE',
    grade: textbook.grade || 7,
    subject: textbook.subject || '',
    topic: chapter.title || '',
    subTopic: '',
  });

  // Generate questions mutation
  const generateMutation = trpc.qbAdmin.generateQuestionsFromChapter.useMutation({
    onSuccess: (result) => {
      toast.success(`Generated ${result.questionsGenerated} questions!`);
      setCurrentJobId(result.jobId);
      setShowReview(true);
      utils.qbAdmin.getGenerationJobs.invalidate();
    },
    onError: (error: any) => {
      toast.error(`Generation failed: ${error.message}`);
    },
  });

  const handleGenerate = () => {
    if (!formData.subject || !formData.topic || !formData.subTopic) {
      toast.error('Please fill in all required fields');
      return;
    }

    if (!chapter.extractedText) {
      toast.error('This chapter has no extracted text. Please upload and process a PDF first.');
      return;
    }

    generateMutation.mutate({
      chapterId: chapter.id,
      board: formData.board,
      grade: formData.grade,
      subject: formData.subject,
      topic: formData.topic,
      subTopic: formData.subTopic,
    });
  };

  return (
    <>
      <Button 
        size="sm" 
        variant="default"
        onClick={() => setIsDialogOpen(true)}
      >
        <Sparkles className="h-4 w-4 mr-2" />
        Generate Questions
      </Button>

      {/* Generation Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Generate Questions with AI</DialogTitle>
            <DialogDescription>
              Generate 50+ questions from this chapter using AI. Questions will follow the master specification.
            </DialogDescription>
          </DialogHeader>

          {!showReview ? (
            <>
              <div className="space-y-4">
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <div className="flex items-start gap-2">
                    <Sparkles className="h-5 w-5 text-blue-600 mt-0.5" />
                    <div className="text-sm">
                      <div className="font-semibold text-blue-900 mb-1">AI Question Generation</div>
                      <ul className="text-blue-800 space-y-1">
                        <li>• 50+ questions per subtopic</li>
                        <li>• 90% MCQs, 10% True/False</li>
                        <li>• Difficulty mix: 30% Easy, 40% Medium, 30% Hard</li>
                        <li>• Includes detailed explanations with emojis</li>
                        <li>• Duplicate detection enabled</li>
                      </ul>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Board *</Label>
                    <Select 
                      value={formData.board} 
                      onValueChange={(value) => setFormData({ ...formData, board: value })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="CBSE">CBSE</SelectItem>
                        <SelectItem value="ICSE">ICSE</SelectItem>
                        <SelectItem value="IB">IB</SelectItem>
                        <SelectItem value="State">State Board</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label>Grade *</Label>
                    <Select 
                      value={formData.grade.toString()} 
                      onValueChange={(value) => setFormData({ ...formData, grade: parseInt(value) })}
                    >
                      <SelectTrigger>
                        <SelectValue />
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
                  <Label>Subject *</Label>
                  <Input
                    value={formData.subject}
                    onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                    placeholder="e.g., Mathematics, Physics"
                  />
                </div>

                <div>
                  <Label>Topic *</Label>
                  <Input
                    value={formData.topic}
                    onChange={(e) => setFormData({ ...formData, topic: e.target.value })}
                    placeholder="e.g., Integers, Fractions"
                  />
                </div>

                <div>
                  <Label>Sub-Topic *</Label>
                  <Input
                    value={formData.subTopic}
                    onChange={(e) => setFormData({ ...formData, subTopic: e.target.value })}
                    placeholder="e.g., Addition of Integers, Multiplication of Fractions"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Be specific - AI will generate 50+ questions for this subtopic
                  </p>
                </div>

                {!chapter.extractedText && (
                  <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                    <div className="flex items-start gap-2">
                      <Upload className="h-5 w-5 text-yellow-600 mt-0.5" />
                      <div className="text-sm text-yellow-800">
                        <div className="font-semibold mb-1">No extracted text available</div>
                        <p>Please upload and process a PDF for this chapter first.</p>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              <DialogFooter>
                <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                  Cancel
                </Button>
                <Button 
                  onClick={handleGenerate} 
                  disabled={generateMutation.isPending || !chapter.extractedText}
                >
                  {generateMutation.isPending ? (
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
            </>
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

              {currentJobId && <QuestionReviewInterface jobId={currentJobId} />}

              <DialogFooter>
                <Button onClick={() => {
                  setIsDialogOpen(false);
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
