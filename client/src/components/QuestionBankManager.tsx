import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { Upload, Edit2, Trash2, Save, X } from "lucide-react";

export default function QuestionBankManager() {
  const utils = trpc.useUtils();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [selectedSubject, setSelectedSubject] = useState<string>("");
  const [selectedTopic, setSelectedTopic] = useState<string>("");
  const [editingQuestionId, setEditingQuestionId] = useState<number | null>(null);
  const [editFormData, setEditFormData] = useState<any>({});

  // Fetch unique subjects and topics
  const { data: subjects = [] } = trpc.qbAdmin.getUniqueSubjects.useQuery();
  const { data: topics = [] } = trpc.qbAdmin.getUniqueTopics.useQuery(
    { subject: selectedSubject },
    { enabled: !!selectedSubject }
  );

  // Fetch questions with filters
  const { data: questions = [] } = trpc.qbAdmin.getAllQuestions.useQuery(
    selectedSubject || selectedTopic
      ? {
          subject: selectedSubject || undefined,
          topic: selectedTopic || undefined,
        }
      : undefined
  );

  // Mutations
  const bulkUploadMutation = trpc.qbAdmin.bulkUploadQuestions.useMutation({
    onSuccess: (result) => {
      toast.success(`Uploaded ${result.stats?.questionsCreated || 0} questions!`);
      if (result.errors && result.errors.length > 0) {
        toast.error(`${result.errors.length} errors occurred. Check console for details.`);
        console.error("Upload errors:", result.errors);
      }
      utils.qbAdmin.getUniqueSubjects.invalidate();
      utils.qbAdmin.getAllQuestions.invalidate();
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    },
    onError: (error: any) => {
      toast.error(`Upload failed: ${error.message}`);
    },
  });

  const updateQuestionMutation = trpc.qbAdmin.updateQuestion.useMutation({
    onSuccess: () => {
      toast.success("Question updated successfully!");
      setEditingQuestionId(null);
      utils.qbAdmin.getAllQuestions.invalidate();
    },
    onError: (error: any) => {
      toast.error(`Update failed: ${error.message}`);
    },
  });

  const deleteQuestionMutation = trpc.qbAdmin.deleteQuestionPermanent.useMutation({
    onSuccess: () => {
      toast.success("Question deleted!");
      utils.qbAdmin.getAllQuestions.invalidate();
      utils.qbAdmin.getUniqueSubjects.invalidate();
    },
    onError: (error: any) => {
      toast.error(`Delete failed: ${error.message}`);
    },
  });

  // Handle file upload
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const text = await file.text();
      const questions = JSON.parse(text);

      if (!Array.isArray(questions)) {
        toast.error("JSON must be an array of questions");
        return;
      }

      // Validate required fields
      const requiredFields = ['board', 'grade', 'subject', 'topic', 'scope', 'questionType', 'questionText', 'correctAnswer', 'difficulty'];
      const missingFields = questions.some((q: any) => 
        requiredFields.some(field => !q[field])
      );

      if (missingFields) {
        toast.error("Some questions are missing required fields. Check the JSON format.");
        return;
      }

      bulkUploadMutation.mutate({ questions });
    } catch (error) {
      toast.error("Invalid JSON file format!");
      console.error(error);
    }
  };

  // Handle edit
  const startEdit = (question: any) => {
    setEditingQuestionId(question.id);
    setEditFormData({
      board: question.board,
      grade: question.grade,
      subject: question.subject,
      topic: question.topic,
      subTopic: question.subTopic || "",
      scope: question.scope,
      questionType: question.questionType,
      questionText: question.questionText,
      options: question.options || [],
      correctAnswer: question.correctAnswer,
      explanation: question.explanation || "",
      difficulty: question.difficulty,
      points: question.points,
      timeLimit: question.timeLimit,
    });
  };

  const saveEdit = () => {
    if (!editingQuestionId) return;
    updateQuestionMutation.mutate({
      id: editingQuestionId,
      ...editFormData,
    });
  };

  const cancelEdit = () => {
    setEditingQuestionId(null);
    setEditFormData({});
  };

  // Handle delete with confirmation
  const handleDelete = (questionId: number, questionText: string) => {
    if (confirm(`Are you sure you want to delete this question?\n\n"${questionText.substring(0, 100)}..."`)) {
      deleteQuestionMutation.mutate({ questionId });
    }
  };

  return (
    <div className="space-y-6">
      {/* Upload Section */}
      <Card>
        <CardHeader>
          <CardTitle>Upload Questions (JSON)</CardTitle>
          <CardDescription>
            Upload a JSON file with questions. The system will automatically create subjects and topics.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4">
            <Input
              ref={fileInputRef}
              type="file"
              accept=".json"
              onChange={handleFileUpload}
              className="flex-1"
            />
            <Button
              variant="outline"
              onClick={() => fileInputRef.current?.click()}
              disabled={bulkUploadMutation.isPending}
            >
              <Upload className="w-4 h-4 mr-2" />
              {bulkUploadMutation.isPending ? "Uploading..." : "Choose File"}
            </Button>
          </div>
          <p className="text-sm text-gray-500 mt-2">
            Use the question-generator.html page to create properly formatted JSON files.
          </p>
        </CardContent>
      </Card>

      {/* Browse Section */}
      <Card>
        <CardHeader>
          <CardTitle>Browse & Edit Questions</CardTitle>
          <CardDescription>
            Filter questions by subject and topic, then edit or delete them
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Filters */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Filter by Subject</Label>
              <Select value={selectedSubject || "__all__"} onValueChange={(val) => {
                setSelectedSubject(val === "__all__" ? "" : val);
                setSelectedTopic("");
              }}>
                <SelectTrigger>
                  <SelectValue placeholder="All Subjects" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__all__">All Subjects</SelectItem>
                  {subjects.map((subject) => (
                    <SelectItem key={subject || "unknown"} value={subject || "unknown"}>
                      {subject}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {selectedSubject && (
              <div>
                <Label>Filter by Topic</Label>
                <Select value={selectedTopic || "__all__"} onValueChange={(val) => setSelectedTopic(val === "__all__" ? "" : val)}>
                  <SelectTrigger>
                    <SelectValue placeholder="All Topics" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__all__">All Topics</SelectItem>
                    {topics.map((topic) => (
                      <SelectItem key={topic || "unknown"} value={topic || "unknown"}>
                        {topic}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>

          {/* Questions List */}
          <div className="space-y-3 mt-6">
            <div className="flex justify-between items-center">
              <h3 className="font-semibold text-lg">
                Questions ({questions.length})
              </h3>
              {(selectedSubject || selectedTopic) && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setSelectedSubject("");
                    setSelectedTopic("");
                  }}
                >
                  Clear Filters
                </Button>
              )}
            </div>

            {questions.length === 0 ? (
              <p className="text-center text-gray-500 py-8">
                No questions found. Upload a JSON file to get started.
              </p>
            ) : (
              questions.map((q: any) => (
                <Card key={q.id} className="p-4">
                  {editingQuestionId === q.id ? (
                    // Edit Mode
                    <div className="space-y-4">
                      <div className="grid grid-cols-3 gap-3">
                        <div>
                          <Label className="text-xs">Board</Label>
                          <Input
                            value={editFormData.board}
                            onChange={(e) => setEditFormData({ ...editFormData, board: e.target.value })}
                            className="h-8"
                          />
                        </div>
                        <div>
                          <Label className="text-xs">Grade</Label>
                          <Input
                            type="number"
                            value={editFormData.grade}
                            onChange={(e) => setEditFormData({ ...editFormData, grade: parseInt(e.target.value) })}
                            className="h-8"
                          />
                        </div>
                        <div>
                          <Label className="text-xs">Scope</Label>
                          <Select
                            value={editFormData.scope}
                            onValueChange={(val) => setEditFormData({ ...editFormData, scope: val })}
                          >
                            <SelectTrigger className="h-8">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="School">School</SelectItem>
                              <SelectItem value="Olympiad">Olympiad</SelectItem>
                              <SelectItem value="Competitive">Competitive</SelectItem>
                              <SelectItem value="Advanced">Advanced</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <Label className="text-xs">Subject</Label>
                          <Input
                            value={editFormData.subject}
                            onChange={(e) => setEditFormData({ ...editFormData, subject: e.target.value })}
                            className="h-8"
                          />
                        </div>
                        <div>
                          <Label className="text-xs">Topic</Label>
                          <Input
                            value={editFormData.topic}
                            onChange={(e) => setEditFormData({ ...editFormData, topic: e.target.value })}
                            className="h-8"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <Label className="text-xs">Question Type</Label>
                          <Select
                            value={editFormData.questionType}
                            onValueChange={(val) => setEditFormData({ ...editFormData, questionType: val })}
                          >
                            <SelectTrigger className="h-8">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="mcq">Multiple Choice</SelectItem>
                              <SelectItem value="true_false">True/False</SelectItem>
                              <SelectItem value="fill_blank">Fill in the Blank</SelectItem>
                              <SelectItem value="match">Match</SelectItem>
                              <SelectItem value="image_based">Image Based</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div>
                          <Label className="text-xs">Options (comma-separated)</Label>
                          <Input
                            value={Array.isArray(editFormData.options) ? editFormData.options.join(', ') : ''}
                            onChange={(e) => setEditFormData({ ...editFormData, options: e.target.value.split(',').map(o => o.trim()) })}
                            placeholder="Option 1, Option 2, Option 3"
                            className="h-8"
                          />
                        </div>
                      </div>

                      <div>
                        <Label className="text-xs">Question Text</Label>
                        <Textarea
                          value={editFormData.questionText}
                          onChange={(e) => setEditFormData({ ...editFormData, questionText: e.target.value })}
                          rows={3}
                        />
                      </div>

                      <div>
                        <Label className="text-xs">Correct Answer</Label>
                        <Input
                          value={editFormData.correctAnswer}
                          onChange={(e) => setEditFormData({ ...editFormData, correctAnswer: e.target.value })}
                          className="h-8"
                        />
                      </div>

                      <div className="grid grid-cols-3 gap-3">
                        <div>
                          <Label className="text-xs">Difficulty</Label>
                          <Select
                            value={editFormData.difficulty}
                            onValueChange={(val) => setEditFormData({ ...editFormData, difficulty: val })}
                          >
                            <SelectTrigger className="h-8">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="easy">Easy</SelectItem>
                              <SelectItem value="medium">Medium</SelectItem>
                              <SelectItem value="hard">Hard</SelectItem>
                              <SelectItem value="olympiad">Olympiad</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div>
                          <Label className="text-xs">Points</Label>
                          <Input
                            type="number"
                            value={editFormData.points}
                            onChange={(e) => setEditFormData({ ...editFormData, points: parseInt(e.target.value) })}
                            className="h-8"
                          />
                        </div>
                        <div>
                          <Label className="text-xs">Time (sec)</Label>
                          <Input
                            type="number"
                            value={editFormData.timeLimit}
                            onChange={(e) => setEditFormData({ ...editFormData, timeLimit: parseInt(e.target.value) })}
                            className="h-8"
                          />
                        </div>
                      </div>

                      <div className="flex gap-2 justify-end">
                        <Button size="sm" variant="outline" onClick={cancelEdit}>
                          <X className="w-4 h-4 mr-1" />
                          Cancel
                        </Button>
                        <Button size="sm" onClick={saveEdit}>
                          <Save className="w-4 h-4 mr-1" />
                          Save
                        </Button>
                      </div>
                    </div>
                  ) : (
                    // View Mode
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <div className="flex gap-2 mb-2 flex-wrap">
                          <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">
                            {q.board}
                          </span>
                          <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded">
                            Grade {q.grade}
                          </span>
                          <span className="text-xs bg-purple-100 text-purple-800 px-2 py-1 rounded">
                            {q.subject}
                          </span>
                          <span className="text-xs bg-orange-100 text-orange-800 px-2 py-1 rounded">
                            {q.topic}
                          </span>
                          <span className="text-xs bg-pink-100 text-pink-800 px-2 py-1 rounded">
                            {q.scope}
                          </span>
                        </div>
                        <p className="font-medium text-sm mb-2">{q.questionText}</p>
                        <div className="flex gap-2 text-xs text-gray-600">
                          <span className="bg-gray-100 px-2 py-1 rounded">{q.questionType}</span>
                          <span className="bg-gray-100 px-2 py-1 rounded">{q.difficulty}</span>
                          <span className="bg-gray-100 px-2 py-1 rounded">{q.points} pts</span>
                          <span className="bg-gray-100 px-2 py-1 rounded">{q.timeLimit}s</span>
                        </div>
                      </div>
                      <div className="flex gap-2 ml-4">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => startEdit(q)}
                        >
                          <Edit2 className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => handleDelete(q.id, q.questionText)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  )}
                </Card>
              ))
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

