import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { trpc } from "@/lib/trpc";
import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { toast } from "sonner";

export default function ParentDashboard() {
  const { user, loading, isAuthenticated, logout } = useAuth();
  const [, setLocation] = useLocation();
  const [selectedSubject, setSelectedSubject] = useState<number | null>(null);
  const [selectedModule, setSelectedModule] = useState<number | null>(null);
  const [isAddQuestionOpen, setIsAddQuestionOpen] = useState(false);
  const [isBulkUploadOpen, setIsBulkUploadOpen] = useState(false);
  const [isCreateChildOpen, setIsCreateChildOpen] = useState(false);

  const { data: subjects } = trpc.parent.getSubjects.useQuery();
  const { data: modules } = trpc.parent.getModules.useQuery(
    { subjectId: selectedSubject! },
    { enabled: !!selectedSubject }
  );
  const { data: questions } = trpc.parent.getQuestions.useQuery(
    { moduleId: selectedModule! },
    { enabled: !!selectedModule }
  );
  const { data: children } = trpc.parent.getChildren.useQuery();

  const utils = trpc.useUtils();
  const createQuestionMutation = trpc.parent.createQuestion.useMutation({
    onSuccess: () => {
      toast.success("Question added successfully!");
      utils.parent.getQuestions.invalidate();
      setIsAddQuestionOpen(false);
    },
  });

  const bulkUploadMutation = trpc.parent.bulkUploadQuestions.useMutation({
    onSuccess: () => {
      toast.success("Questions uploaded successfully!");
      utils.parent.getQuestions.invalidate();
      setIsBulkUploadOpen(false);
    },
  });

  const deleteQuestionMutation = trpc.parent.deleteQuestion.useMutation({
    onSuccess: () => {
      toast.success("Question deleted!");
      utils.parent.getQuestions.invalidate();
    },
  });

  const createChildMutation = trpc.parent.createChild.useMutation({
    onSuccess: () => {
      toast.success("Child account created successfully!");
      utils.parent.getChildren.invalidate();
      setIsCreateChildOpen(false);
    },
    onError: (error) => {
      toast.error("Failed to create child account: " + error.message);
    },
  });

  const deleteChildMutation = trpc.parent.deleteChild.useMutation({
    onSuccess: () => {
      toast.success("Child account deleted successfully!");
      utils.parent.getChildren.invalidate();
    },
    onError: (error) => {
      toast.error("Failed to delete child account: " + error.message);
    },
  });

  useEffect(() => {
    if (!loading && (!isAuthenticated || (user?.role !== 'parent' && user?.role !== 'admin'))) {
      setLocation('/');
    }
  }, [loading, isAuthenticated, user, setLocation]);

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center">Loading...</div>;
  }

  const handleAddQuestion = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    
    const questionType = formData.get('questionType') as string;
    let options: any = null;
    let correctAnswer = formData.get('correctAnswer') as string;

    if (questionType === 'mcq') {
      options = [
        formData.get('option1'),
        formData.get('option2'),
        formData.get('option3'),
        formData.get('option4'),
      ];
    }

    createQuestionMutation.mutate({
      moduleId: selectedModule!,
      questionType: questionType as any,
      questionText: formData.get('questionText') as string,
      options,
      correctAnswer,
      explanation: formData.get('explanation') as string,
      difficulty: formData.get('difficulty') as any,
      points: parseInt(formData.get('points') as string) || 10,
      timeLimit: parseInt(formData.get('timeLimit') as string) || 60,
    });
  };

  const handleBulkUpload = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const jsonText = formData.get('jsonData') as string;

    try {
      const questions = JSON.parse(jsonText);
      bulkUploadMutation.mutate({
        moduleId: selectedModule!,
        questions,
      });
    } catch (error) {
      toast.error("Invalid JSON format!");
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <h1 className="text-2xl font-bold text-gray-900">👨‍👩‍👧 Parent Dashboard</h1>
          <div className="flex items-center gap-4">
            <span className="text-sm text-gray-600">Welcome, {user?.name}</span>
            <Button variant="outline" size="sm" onClick={() => logout()}>
              Logout
            </Button>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8">
        <Tabs defaultValue="questions" className="space-y-6">
          <TabsList className="grid w-full max-w-md grid-cols-2">
            <TabsTrigger value="questions">Question Bank</TabsTrigger>
            <TabsTrigger value="progress">Child Progress</TabsTrigger>
          </TabsList>

          {/* Question Bank Tab */}
          <TabsContent value="questions" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Manage Question Bank</CardTitle>
                <CardDescription>Add, edit, or upload questions for your child</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Subject Selection */}
                <div>
                  <Label>Select Subject</Label>
                  <Select onValueChange={(val) => { setSelectedSubject(parseInt(val)); setSelectedModule(null); }}>
                    <SelectTrigger>
                      <SelectValue placeholder="Choose a subject" />
                    </SelectTrigger>
                    <SelectContent>
                      {subjects?.map((subject) => (
                        <SelectItem key={subject.id} value={subject.id.toString()}>
                          {subject.icon} {subject.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Module Selection */}
                {selectedSubject && (
                  <div>
                    <Label>Select Module/Topic</Label>
                    <Select onValueChange={(val) => setSelectedModule(parseInt(val))}>
                      <SelectTrigger>
                        <SelectValue placeholder="Choose a module" />
                      </SelectTrigger>
                      <SelectContent>
                        {modules?.map((module) => (
                          <SelectItem key={module.id} value={module.id.toString()}>
                            {module.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                {/* Action Buttons */}
                {selectedModule && (
                  <div className="flex gap-2">
                    <Dialog open={isAddQuestionOpen} onOpenChange={setIsAddQuestionOpen}>
                      <DialogTrigger asChild>
                        <Button>Add Question</Button>
                      </DialogTrigger>
                      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
                        <DialogHeader>
                          <DialogTitle>Add New Question</DialogTitle>
                          <DialogDescription>Create a new question for this module</DialogDescription>
                        </DialogHeader>
                        <form onSubmit={handleAddQuestion} className="space-y-4">
                          <div>
                            <Label>Question Type</Label>
                            <Select name="questionType" defaultValue="mcq">
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="mcq">Multiple Choice</SelectItem>
                                <SelectItem value="true_false">True/False</SelectItem>
                                <SelectItem value="fill_blank">Fill in the Blank</SelectItem>
                                <SelectItem value="match">Match the Following</SelectItem>
                                <SelectItem value="image_based">Image Based</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>

                          <div>
                            <Label>Question Text</Label>
                            <Textarea name="questionText" required placeholder="Enter the question..." />
                          </div>

                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <Label>Option 1</Label>
                              <Input name="option1" placeholder="First option" />
                            </div>
                            <div>
                              <Label>Option 2</Label>
                              <Input name="option2" placeholder="Second option" />
                            </div>
                            <div>
                              <Label>Option 3</Label>
                              <Input name="option3" placeholder="Third option" />
                            </div>
                            <div>
                              <Label>Option 4</Label>
                              <Input name="option4" placeholder="Fourth option" />
                            </div>
                          </div>

                          <div>
                            <Label>Correct Answer</Label>
                            <Input name="correctAnswer" required placeholder="Enter correct answer" />
                          </div>

                          <div>
                            <Label>Explanation</Label>
                            <Textarea name="explanation" placeholder="Explain the answer..." />
                          </div>

                          <div className="grid grid-cols-3 gap-4">
                            <div>
                              <Label>Difficulty</Label>
                              <Select name="difficulty" defaultValue="medium">
                                <SelectTrigger>
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
                              <Label>Points</Label>
                              <Input name="points" type="number" defaultValue="10" />
                            </div>
                            <div>
                              <Label>Time Limit (sec)</Label>
                              <Input name="timeLimit" type="number" defaultValue="60" />
                            </div>
                          </div>

                          <Button type="submit" className="w-full">Add Question</Button>
                        </form>
                      </DialogContent>
                    </Dialog>

                    <Dialog open={isBulkUploadOpen} onOpenChange={setIsBulkUploadOpen}>
                      <DialogTrigger asChild>
                        <Button variant="outline">Bulk Upload (JSON)</Button>
                      </DialogTrigger>
                      <DialogContent className="max-w-2xl">
                        <DialogHeader>
                          <DialogTitle>Bulk Upload Questions</DialogTitle>
                          <DialogDescription>Upload multiple questions using JSON format</DialogDescription>
                        </DialogHeader>
                        <form onSubmit={handleBulkUpload} className="space-y-4">
                          <div>
                            <Label>JSON Data</Label>
                            <Textarea 
                              name="jsonData" 
                              rows={15}
                              placeholder={`[\n  {\n    "questionType": "mcq",\n    "questionText": "What is 2+2?",\n    "options": ["2", "3", "4", "5"],\n    "correctAnswer": "4",\n    "explanation": "2+2 equals 4",\n    "difficulty": "easy",\n    "points": 10,\n    "timeLimit": 60\n  }\n]`}
                            />
                          </div>
                          <Button type="submit" className="w-full">Upload Questions</Button>
                        </form>
                      </DialogContent>
                    </Dialog>
                  </div>
                )}

                {/* Questions List */}
                {questions && questions.length > 0 && (
                  <div className="space-y-2 mt-6">
                    <h3 className="font-semibold">Questions ({questions.length})</h3>
                    {questions.map((q) => (
                      <Card key={q.id} className="p-4">
                        <div className="flex justify-between items-start">
                          <div className="flex-1">
                            <p className="font-medium">{q.questionText}</p>
                            <div className="flex gap-2 mt-2 text-xs text-gray-500">
                              <span className="bg-blue-100 px-2 py-1 rounded">{q.questionType}</span>
                              <span className="bg-green-100 px-2 py-1 rounded">{q.difficulty}</span>
                              <span className="bg-purple-100 px-2 py-1 rounded">{q.points} pts</span>
                            </div>
                          </div>
                          <Button 
                            variant="destructive" 
                            size="sm"
                            onClick={() => deleteQuestionMutation.mutate({ id: q.id })}
                          >
                            Delete
                          </Button>
                        </div>
                      </Card>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Child Progress Tab */}
          <TabsContent value="progress" className="space-y-6">
            <Card>
              <CardHeader>
                <div className="flex justify-between items-center">
                  <div>
                    <CardTitle>Manage Child Accounts</CardTitle>
                    <CardDescription>Create and manage accounts for your children</CardDescription>
                  </div>
                  <Dialog open={isCreateChildOpen} onOpenChange={setIsCreateChildOpen}>
                    <DialogTrigger asChild>
                      <Button>+ Create Child Account</Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Create Child Account</DialogTitle>
                        <DialogDescription>
                          Create a new account for your child to access quizzes
                        </DialogDescription>
                      </DialogHeader>
                      <form
                        onSubmit={(e) => {
                          e.preventDefault();
                          const formData = new FormData(e.currentTarget);
                          const name = formData.get('name') as string;
                          const username = formData.get('username') as string;
                          const password = formData.get('password') as string;
                          const email = formData.get('email') as string;
                          
                          createChildMutation.mutate({
                            name,
                            username,
                            password,
                            email: email || undefined,
                          });
                        }}
                        className="space-y-4"
                      >
                        <div>
                          <Label htmlFor="name">Child's Name *</Label>
                          <Input
                            id="name"
                            name="name"
                            required
                            placeholder="Enter child's full name"
                          />
                        </div>
                        <div>
                          <Label htmlFor="username">Username *</Label>
                          <Input
                            id="username"
                            name="username"
                            required
                            placeholder="Choose a unique username"
                            minLength={3}
                          />
                          <p className="text-xs text-gray-500 mt-1">
                            Minimum 3 characters
                          </p>
                        </div>
                        <div>
                          <Label htmlFor="password">Password *</Label>
                          <Input
                            id="password"
                            name="password"
                            type="password"
                            required
                            placeholder="Create a password"
                            minLength={4}
                          />
                          <p className="text-xs text-gray-500 mt-1">
                            Minimum 4 characters
                          </p>
                        </div>
                        <div>
                          <Label htmlFor="email">Email (Optional)</Label>
                          <Input
                            id="email"
                            name="email"
                            type="email"
                            placeholder="child@example.com"
                          />
                        </div>
                        <div className="bg-blue-50 p-3 rounded text-sm">
                          <p className="font-semibold text-blue-900">📝 Login Credentials:</p>
                          <p className="text-blue-700 mt-1">
                            Your child will use these credentials on the Student Login page.
                            Make sure to remember the username and password!
                          </p>
                        </div>
                        <Button type="submit" className="w-full" disabled={createChildMutation.isPending}>
                          {createChildMutation.isPending ? "Creating..." : "Create Account"}
                        </Button>
                      </form>
                    </DialogContent>
                  </Dialog>
                </div>
              </CardHeader>
              <CardContent>
                {children && children.length > 0 ? (
                  <div className="space-y-2">
                    {children.map((child) => (
                      <div key={child.id} className="flex items-center justify-between p-3 bg-gray-50 rounded">
                        <div>
                          <p className="font-semibold">{child.name}</p>
                          <p className="text-sm text-gray-500">{child.username ? `@${child.username}` : child.email || 'No email'}</p>
                        </div>
                        <div className="flex gap-2">
                          <Button variant="outline" size="sm" onClick={() => {
                            // Scroll to progress section
                            document.getElementById(`child-progress-${child.id}`)?.scrollIntoView({ behavior: 'smooth' });
                          }}>
                            View Progress
                          </Button>
                          <Button 
                            variant="destructive" 
                            size="sm" 
                            onClick={() => {
                              if (confirm(`Are you sure you want to delete ${child.name}'s account? This action cannot be undone.`)) {
                                deleteChildMutation.mutate({ childId: child.id });
                              }
                            }}
                            disabled={deleteChildMutation.isPending}
                          >
                            Delete
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-gray-500 text-center py-4">No child accounts yet. Create one to get started!</p>
                )}
              </CardContent>
            </Card>

            {children && children.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>Child Progress Monitoring</CardTitle>
                  <CardDescription>Track your child's learning journey</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {children.map((child) => (
                      <div key={child.id} id={`child-progress-${child.id}`}>
                        <ChildProgressCard childId={child.id} childName={child.name || 'Child'} />
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

function ChildProgressCard({ childId, childName }: { childId: number; childName: string }) {
  const { data: stats } = trpc.parent.getChildProgress.useQuery({ childId });
  const { data: history } = trpc.parent.getChildQuizHistory.useQuery({ childId, limit: 5 });

  return (
    <Card>
      <CardHeader>
        <CardTitle>{childName}</CardTitle>
      </CardHeader>
      <CardContent>
        {stats ? (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center p-3 bg-blue-50 rounded">
              <p className="text-2xl font-bold text-blue-600">{stats.totalQuizzes}</p>
              <p className="text-sm text-gray-600">Total Quizzes</p>
            </div>
            <div className="text-center p-3 bg-green-50 rounded">
              <p className="text-2xl font-bold text-green-600">{stats.averageScore}%</p>
              <p className="text-sm text-gray-600">Avg Score</p>
            </div>
            <div className="text-center p-3 bg-purple-50 rounded">
              <p className="text-2xl font-bold text-purple-600">{stats.totalPoints}</p>
              <p className="text-sm text-gray-600">Total Points</p>
            </div>
            <div className="text-center p-3 bg-orange-50 rounded">
              <p className="text-2xl font-bold text-orange-600">{stats.currentStreak} 🔥</p>
              <p className="text-sm text-gray-600">Current Streak</p>
            </div>
          </div>
        ) : (
          <p className="text-gray-500">No data available</p>
        )}

        {history && history.length > 0 && (
          <div className="mt-4">
            <h4 className="font-semibold mb-2">Recent Quizzes</h4>
            <div className="space-y-2">
              {history.map((quiz) => (
                <div key={quiz.id} className="flex justify-between text-sm p-2 bg-gray-50 rounded">
                  <span>Quiz #{quiz.id}</span>
                  <span className="font-semibold">{quiz.scorePercentage}%</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

