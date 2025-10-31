import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { trpc } from "@/lib/trpc";
import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { toast } from "sonner";

export default function TeacherDashboard() {
  const { user, loading, isAuthenticated, logout } = useAuth();
  const [, setLocation] = useLocation();
  const [isCreateClassOpen, setIsCreateClassOpen] = useState(false);
  const [selectedClass, setSelectedClass] = useState<number | null>(null);

  // Redirect if not teacher
  useEffect(() => {
    if (!loading && (!isAuthenticated || user?.role !== 'teacher')) {
      setLocation('/');
    }
  }, [loading, isAuthenticated, user, setLocation]);

  const { data: classes, isLoading: classesLoading } = trpc.teacher.getMyClasses.useQuery();
  const utils = trpc.useUtils();

  const createClassMutation = trpc.teacher.createClass.useMutation({
    onSuccess: () => {
      toast.success("Class created successfully!");
      setIsCreateClassOpen(false);
      utils.teacher.getMyClasses.invalidate();
    },
    onError: (error) => {
      toast.error("Failed to create class: " + error.message);
    },
  });

  const deleteClassMutation = trpc.teacher.deleteClass.useMutation({
    onSuccess: () => {
      toast.success("Class deleted successfully!");
      utils.teacher.getMyClasses.invalidate();
      setSelectedClass(null);
    },
    onError: (error) => {
      toast.error("Failed to delete class: " + error.message);
    },
  });

  const handleCreateClass = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    
    createClassMutation.mutate({
      name: formData.get('name') as string,
      description: formData.get('description') as string || undefined,
      board: formData.get('board') as any,
      grade: parseInt(formData.get('grade') as string),
    });
  };

  if (loading || classesLoading) {
    return <div className="min-h-screen flex items-center justify-center">Loading...</div>;
  }

  const totalStudents = classes?.reduce((sum, cls) => sum + cls.studentCount, 0) || 0;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <h1 className="text-2xl font-bold text-gray-900">👨‍🏫 Teacher Dashboard</h1>
          <div className="flex items-center gap-4">
            <span className="text-sm text-gray-600">Welcome, {user?.name}</span>
            <Button variant="outline" size="sm" onClick={async () => {
              await logout();
              window.location.href = '/';
            }}>
              Logout
            </Button>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8 space-y-8">
        {/* Statistics Overview */}
        <div className="grid md:grid-cols-3 gap-6">
          <Card>
            <CardHeader className="pb-3">
              <CardDescription>Total Classes</CardDescription>
              <CardTitle className="text-3xl">{classes?.length || 0}</CardTitle>
            </CardHeader>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardDescription>Total Students</CardDescription>
              <CardTitle className="text-3xl">{totalStudents}</CardTitle>
            </CardHeader>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardDescription>Active Classes</CardDescription>
              <CardTitle className="text-3xl">
                {classes?.filter(c => c.isActive).length || 0}
              </CardTitle>
            </CardHeader>
          </Card>
        </div>

        {/* Class Management */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>My Classes</CardTitle>
              <CardDescription>Manage your classes and students</CardDescription>
            </div>
            <Dialog open={isCreateClassOpen} onOpenChange={setIsCreateClassOpen}>
              <DialogTrigger asChild>
                <Button>+ Create Class</Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Create New Class</DialogTitle>
                  <DialogDescription>
                    Add a new class to manage students and assignments
                  </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleCreateClass} className="space-y-4 mt-4">
                  <div>
                    <Label htmlFor="name">Class Name *</Label>
                    <Input
                      id="name"
                      name="name"
                      required
                      placeholder="e.g., Grade 7 Section A"
                    />
                  </div>
                  <div>
                    <Label htmlFor="description">Description</Label>
                    <Textarea
                      id="description"
                      name="description"
                      placeholder="Optional description"
                    />
                  </div>
                  <div>
                    <Label htmlFor="board">Board *</Label>
                    <Select name="board" required>
                      <SelectTrigger>
                        <SelectValue placeholder="Select board" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="CBSE">CBSE</SelectItem>
                        <SelectItem value="ICSE">ICSE</SelectItem>
                        <SelectItem value="IB">IB</SelectItem>
                        <SelectItem value="State">State Board</SelectItem>
                        <SelectItem value="Other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="grade">Grade *</Label>
                    <Select name="grade" required>
                      <SelectTrigger>
                        <SelectValue placeholder="Select grade" />
                      </SelectTrigger>
                      <SelectContent>
                        {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map(g => (
                          <SelectItem key={g} value={g.toString()}>{g}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <Button type="submit" className="w-full" disabled={createClassMutation.isPending}>
                    {createClassMutation.isPending ? "Creating..." : "Create Class"}
                  </Button>
                </form>
              </DialogContent>
            </Dialog>
          </CardHeader>
          <CardContent>
            {classes && classes.length > 0 ? (
              <div className="space-y-3">
                {classes.map((cls) => (
                  <Card key={cls.id} className="p-4">
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <h3 className="font-semibold text-lg">{cls.name}</h3>
                        {cls.description && (
                          <p className="text-sm text-gray-600 mt-1">{cls.description}</p>
                        )}
                        <div className="flex gap-4 mt-2 text-sm text-gray-500">
                          <span>📚 {cls.board}</span>
                          <span>🎓 Grade {cls.grade}</span>
                          <span>👥 {cls.studentCount} students</span>
                          <span className={cls.isActive ? "text-green-600" : "text-gray-400"}>
                            {cls.isActive ? "● Active" : "○ Inactive"}
                          </span>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setSelectedClass(cls.id)}
                        >
                          View Students
                        </Button>
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => {
                            if (confirm(`Delete class "${cls.name}"? This will remove all students from the class.`)) {
                              deleteClassMutation.mutate({ classId: cls.id });
                            }
                          }}
                          disabled={deleteClassMutation.isPending}
                        >
                          Delete
                        </Button>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            ) : (
              <p className="text-center text-gray-500 py-8">
                No classes yet. Create your first class to get started!
              </p>
            )}
          </CardContent>
        </Card>

        {/* Class Details View */}
        {selectedClass && (
          <ClassDetailsView
            classId={selectedClass}
            onClose={() => setSelectedClass(null)}
          />
        )}
      </div>
    </div>
  );
}

function ClassDetailsView({ classId, onClose }: { classId: number; onClose: () => void }) {
  const [searchQuery, setSearchQuery] = useState('');
  const [isAddStudentOpen, setIsAddStudentOpen] = useState(false);

  const { data: students } = trpc.teacher.getClassStudents.useQuery({ classId });
  const { data: performance } = trpc.teacher.getClassPerformance.useQuery({ classId });
  const { data: searchResults } = trpc.teacher.searchChildren.useQuery(
    { query: searchQuery },
    { enabled: searchQuery.length >= 2 }
  );
  const utils = trpc.useUtils();

  const addStudentMutation = trpc.teacher.addStudentToClass.useMutation({
    onSuccess: () => {
      toast.success("Student added to class!");
      utils.teacher.getClassStudents.invalidate({ classId });
      utils.teacher.getClassPerformance.invalidate({ classId });
      utils.teacher.getMyClasses.invalidate();
      setIsAddStudentOpen(false);
      setSearchQuery('');
    },
    onError: (error) => {
      toast.error("Failed to add student: " + error.message);
    },
  });

  const removeStudentMutation = trpc.teacher.removeStudentFromClass.useMutation({
    onSuccess: () => {
      toast.success("Student removed from class!");
      utils.teacher.getClassStudents.invalidate({ classId });
      utils.teacher.getClassPerformance.invalidate({ classId });
      utils.teacher.getMyClasses.invalidate();
    },
    onError: (error) => {
      toast.error("Failed to remove student: " + error.message);
    },
  });

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle>Class Students</CardTitle>
          <CardDescription>
            Class Average: {performance?.classAverage || 0}% | Total Quizzes: {performance?.totalQuizzes || 0}
          </CardDescription>
        </div>
        <div className="flex gap-2">
          <Dialog open={isAddStudentOpen} onOpenChange={setIsAddStudentOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm">+ Add Student</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add Student to Class</DialogTitle>
                <DialogDescription>
                  Search for students by username
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 mt-4">
                <Input
                  placeholder="Search by username..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
                {searchResults && searchResults.length > 0 && (
                  <div className="space-y-2 max-h-60 overflow-y-auto">
                    {searchResults.map((child) => (
                      <Card key={child.id} className="p-3">
                        <div className="flex justify-between items-center">
                          <div>
                            <p className="font-semibold">{child.name}</p>
                            <p className="text-sm text-gray-500">@{child.username}</p>
                          </div>
                          <Button
                            size="sm"
                            onClick={() => addStudentMutation.mutate({ classId, childId: child.id })}
                            disabled={addStudentMutation.isPending}
                          >
                            Add
                          </Button>
                        </div>
                      </Card>
                    ))}
                  </div>
                )}
                {searchQuery.length >= 2 && (!searchResults || searchResults.length === 0) && (
                  <p className="text-center text-gray-500 py-4">No students found</p>
                )}
              </div>
            </DialogContent>
          </Dialog>
          <Button variant="outline" size="sm" onClick={onClose}>Close</Button>
        </div>
      </CardHeader>
      <CardContent>
        {students && students.length > 0 ? (
          <div className="space-y-2">
            {students.map((student) => {
              const studentPerf = performance?.students.find(s => s.userId === student.userId);
              return (
                <Card key={student.id} className="p-3">
                  <div className="flex justify-between items-center">
                    <div className="flex-1">
                      <p className="font-semibold">{student.name}</p>
                      <p className="text-sm text-gray-500">@{student.username}</p>
                      {studentPerf?.stats && (
                        <div className="flex gap-4 mt-1 text-xs text-gray-600">
                          <span>📊 Avg: {studentPerf.stats.avgScore}%</span>
                          <span>📝 Quizzes: {studentPerf.stats.totalQuizzes}</span>
                          <span>⭐ Points: {student.totalPoints}</span>
                          <span>🔥 Streak: {student.currentStreak}</span>
                        </div>
                      )}
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        if (confirm(`Remove ${student.name} from this class?`)) {
                          removeStudentMutation.mutate({ classId, childId: student.id });
                        }
                      }}
                      disabled={removeStudentMutation.isPending}
                    >
                      Remove
                    </Button>
                  </div>
                </Card>
              );
            })}
          </div>
        ) : (
          <p className="text-center text-gray-500 py-8">
            No students in this class yet. Add students to get started!
          </p>
        )}
      </CardContent>
    </Card>
  );
}

