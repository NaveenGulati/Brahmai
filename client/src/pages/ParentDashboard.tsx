import { useAuth } from "@/_core/hooks/useAuth";
import { encryptedRoutes } from "@shared/urlEncryption";
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
import { useLocation, Link } from "wouter";
import { toast } from "sonner";
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import ChallengeCreator from '@/components/ChallengeCreator';
// QuestionBankManager removed - now managed by QB Admin role

// Format date as "29th Oct 2025, 11:22 AM"
function formatCompletedDate(date: Date | string): string {
  const d = new Date(date);
  const day = d.getDate();
  const suffix = (day: number) => {
    if (day > 3 && day < 21) return 'th';
    switch (day % 10) {
      case 1: return 'st';
      case 2: return 'nd';
      case 3: return 'rd';
      default: return 'th';
    }
  };
  const month = d.toLocaleString('en-US', { month: 'short' });
  const year = d.getFullYear();
  const time = d.toLocaleString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
  return `${day}${suffix(day)} ${month} ${year}, ${time}`;
}

export default function ParentDashboard() {
  const { user, loading, isAuthenticated, logout } = useAuth();
  const [, setLocation] = useLocation();
  // Question bank management removed - now handled by QB Admin
  const [isCreateChildOpen, setIsCreateChildOpen] = useState(false);

  // Subject/module queries removed - question bank now managed by QB Admin
  const { data: children } = trpc.parent.getChildren.useQuery();

  const utils = trpc.useUtils();
  // Question mutations removed - question bank now managed by QB Admin

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

  const resetPasswordMutation = trpc.parent.resetChildPassword.useMutation({
    onSuccess: () => {
      toast.success("Password reset successfully!");
    },
    onError: (error) => {
      toast.error("Failed to reset password: " + error.message);
    },
  });

  useEffect(() => {
    if (!loading && (!isAuthenticated || user?.role !== 'parent')) {
      setLocation('/');
    }
  }, [loading, isAuthenticated, user, setLocation]);

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center">Loading...</div>;
  }

  // Old question form handlers removed - question bank now managed by QB Admin

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <h1 className="text-2xl font-bold text-gray-900">👨‍👩‍👧 Parent Dashboard</h1>
          <div className="flex items-center gap-4">
            <span className="text-sm text-gray-600">Welcome, {user?.name}</span>
            <Button variant="outline" size="sm" onClick={async () => {
              await logout();
              // Force navigation to home after logout completes
              window.location.href = '/';
            }}>
              Logout
            </Button>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8">
        <Tabs defaultValue="progress" className="space-y-6">
          <TabsList className="grid w-full max-w-md grid-cols-1">
            <TabsTrigger value="progress">Child Progress</TabsTrigger>
          </TabsList>

          {/* Question Bank tab removed - now managed by QB Admin role */}

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
                          <p className="text-sm text-gray-500">{child.username ? `@${child.username}` : 'No username'}</p>
                        </div>
                        <div className="flex gap-2">
                          <Button variant="outline" size="sm" onClick={() => {
                            // Scroll to progress section
                            document.getElementById(`child-progress-${child.id}`)?.scrollIntoView({ behavior: 'smooth' });
                          }}>
                            View Progress
                          </Button>
                          <Button 
                            variant="outline" 
                            size="sm" 
                            onClick={() => {
                              const newPassword = prompt(`Enter new password for ${child.name}:`);
                              if (newPassword && newPassword.length >= 4) {
                                resetPasswordMutation.mutate({ childId: child.id, newPassword });
                              } else if (newPassword) {
                                toast.error('Password must be at least 4 characters');
                              }
                            }}
                            disabled={resetPasswordMutation.isPending}
                          >
                            🔑 Reset Password
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
  const [isChallengeOpen, setIsChallengeOpen] = useState(false);
  const [challengeModule, setChallengeModule] = useState<number | null>(null);
  const [challengeSubject, setChallengeSubject] = useState<number | null>(null);
  const [isPasswordResetOpen, setIsPasswordResetOpen] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [isPointsLedgerOpen, setIsPointsLedgerOpen] = useState(false);
  
  const { data: stats } = trpc.parent.getChildProgress.useQuery({ childId });
  const { data: history } = trpc.parent.getChildQuizHistory.useQuery({ childId, limit: 5 });
  const { data: completedChallenges } = trpc.parent.getCompletedChallenges.useQuery({ childId });
  const { data: subjectStats } = trpc.parent.getChildSubjectStats.useQuery({ childId });
  const { data: subjects } = trpc.parent.getSubjects.useQuery();
  const { data: pointsHistory } = trpc.child.getPointsHistory.useQuery(
    { childId },
    { enabled: isPointsLedgerOpen }
  );
  const { data: modules } = trpc.parent.getModules.useQuery(
    { subjectId: challengeSubject! },
    { enabled: !!challengeSubject }
  );
  
  const utils = trpc.useUtils();
  const createChallengeMutation = trpc.parent.createChallenge.useMutation({
    onSuccess: () => {
      toast.success("Challenge created successfully!");
      setIsChallengeOpen(false);
      setChallengeModule(null);
      setChallengeSubject(null);
    },
    onError: (error) => {
      toast.error("Failed to create challenge: " + error.message);
    },
  });
  
  const dismissChallengeMutation = trpc.parent.dismissChallenge.useMutation({
    onSuccess: () => {
      toast.success("Challenge dismissed");
      utils.parent.getCompletedChallenges.invalidate({ childId });
    },
    onError: (error) => {
      toast.error("Failed to dismiss challenge: " + error.message);
    },
  });
  
  const resetPasswordMutation = trpc.parent.resetChildPassword.useMutation({
    onSuccess: () => {
      toast.success("Password reset successfully!");
      setIsPasswordResetOpen(false);
      setNewPassword('');
    },
    onError: (error) => {
      toast.error("Failed to reset password: " + error.message);
    },
  });

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle>{childName}</CardTitle>
        </div>
        <div className="flex gap-2">
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => {
              // Export quiz history to CSV
              if (!history || history.length === 0) {
                toast.error('No quiz history to export');
                return;
              }
              
              const csvContent = [
                ['Quiz ID', 'Subject', 'Module', 'Score %', 'Correct Answers', 'Total Questions', 'Completed At'].join(','),
                ...history.map(q => [
                  q.id,
                  q.subjectName || 'Unknown',
                  q.moduleName || 'Unknown',
                  q.scorePercentage,
                  q.correctAnswers,
                  q.totalQuestions,
                  q.completedAt ? new Date(q.completedAt).toLocaleString() : 'N/A'
                ].join(','))
              ].join('\n');
              
              const blob = new Blob([csvContent], { type: 'text/csv' });
              const url = URL.createObjectURL(blob);
              const a = document.createElement('a');
              a.href = url;
              a.download = `${childName.replace(/\s+/g, '_')}_quiz_history.csv`;
              a.click();
              URL.revokeObjectURL(url);
              toast.success('Quiz history exported!');
            }}
          >
            📥 Export CSV
          </Button>
          <Dialog open={isPasswordResetOpen} onOpenChange={setIsPasswordResetOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm">🔑 Reset Password</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Reset Password for {childName}</DialogTitle>
                <DialogDescription>
                  Enter a new password for this child account
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 mt-4">
                <div>
                  <Label>New Password</Label>
                  <Input
                    type="password"
                    placeholder="Enter new password (min 4 characters)"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                  />
                </div>
                <Button
                  onClick={() => {
                    if (newPassword.length >= 4) {
                      resetPasswordMutation.mutate({
                        childId,
                        newPassword,
                      });
                    } else {
                      toast.error("Password must be at least 4 characters");
                    }
                  }}
                  disabled={!newPassword || resetPasswordMutation.isPending}
                  className="w-full"
                >
                  Reset Password
                </Button>
              </div>
            </DialogContent>
          </Dialog>
          <Dialog open={isChallengeOpen} onOpenChange={setIsChallengeOpen}>
          <DialogTrigger asChild>
            <Button variant="outline" size="sm">🎯 Create Challenge</Button>
          </DialogTrigger>
          <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Create Adaptive Challenge for {childName}</DialogTitle>
              <DialogDescription>
                Configure a personalized quiz challenge based on performance and difficulty
              </DialogDescription>
            </DialogHeader>
            <div className="mt-4">
              <ChallengeCreator
                childId={childId}
                childName={childName}
                onSuccess={(challengeId) => {
                  toast.success('Challenge created successfully!');
                  setIsChallengeOpen(false);
                  refetch(); // Refresh challenges list
                }}
                onCancel={() => setIsChallengeOpen(false)}
                mode="parent"
              />
            </div>
          </DialogContent>
        </Dialog>
        </div>
      </CardHeader>
      <CardContent>
        {stats ? (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center p-3 bg-blue-50 rounded">
              <p className="text-2xl font-bold text-blue-600">{stats.totalQuizzes}</p>
              <p className="text-sm text-gray-600">Total Quizzes</p>
            </div>
            <div className="text-center p-3 bg-green-50 rounded">
              <p className="text-2xl font-bold text-green-600">{stats.avgScore}%</p>
              <p className="text-sm text-gray-600">Avg Score</p>
            </div>
            <div 
              className="text-center p-3 bg-purple-50 rounded cursor-pointer hover:bg-purple-100 transition-colors"
              onClick={() => setIsPointsLedgerOpen(true)}
            >
              <p className="text-2xl font-bold text-purple-600">{stats.totalPoints} 📊</p>
              <p className="text-sm text-gray-600">Total Points</p>
              <p className="text-xs text-gray-400 mt-1">Click for ledger</p>
            </div>
            <div className="text-center p-3 bg-orange-50 rounded">
              <p className="text-2xl font-bold text-orange-600">{stats.currentStreak} 🔥</p>
              <p className="text-sm text-gray-600">Current Streak</p>
            </div>
          </div>
        ) : (
          <p className="text-gray-500">No data available</p>
        )}

        {/* Subject-wise Performance Chart */}
        {subjectStats && subjectStats.length > 0 && (
          <div className="mt-6">
            <h4 className="font-semibold mb-3">📊 Subject-wise Performance</h4>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={subjectStats}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" />
                <XAxis dataKey="subject" stroke="#666" fontSize={12} />
                <YAxis stroke="#666" fontSize={12} label={{ value: 'Avg Score %', angle: -90, position: 'insideLeft' }} />
                <Tooltip 
                  formatter={(value: any, name: string) => {
                    if (name === 'avgScore') return [`${value}%`, 'Average Score'];
                    return [value, name];
                  }}
                />
                <Legend />
                <Bar dataKey="avgScore" fill="#3b82f6" name="Average Score %" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}

        {completedChallenges && completedChallenges.length > 0 && (
          <div className="mt-4">
            <h4 className="font-semibold mb-2 text-green-700">✅ Completed Challenges</h4>
            <div className="space-y-3">
              {completedChallenges.map((challenge) => (
                <Card key={challenge.id} className="p-3 bg-green-50 border-green-200 relative">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      dismissChallengeMutation.mutate({ challengeId: challenge.id });
                    }}
                    className="absolute top-2 right-2 text-gray-400 hover:text-gray-600 transition-colors"
                    title="Dismiss challenge"
                  >
                    ✕
                  </button>
                  <Link href={challenge.sessionId ? encryptedRoutes.quizReview(challenge.sessionId) : '#'}>
                    <div className="hover:bg-green-100 cursor-pointer transition-colors p-1 -m-1 rounded">
                      <div className="flex justify-between items-start mb-2 pr-6">
                        <div className="flex-1">
                          <p className="font-semibold text-sm text-gray-900">{challenge.subject?.name} - {challenge.module?.name}</p>
                          <p className="text-xs text-gray-600 mt-1">Completed: {formatCompletedDate(challenge.completedAt!)}</p>
                        </div>
                        <span className="text-lg font-bold text-green-600">{challenge.session?.scorePercentage}%</span>
                      </div>
                      {challenge.session && (
                        <div className="flex gap-4 text-xs text-gray-600">
                          <span>✓ {challenge.session.correctAnswers}/{challenge.session.totalQuestions} correct</span>
                          {challenge.session.timeTaken && (
                            <span>⏱️ {Math.floor(challenge.session.timeTaken / 60)}m {challenge.session.timeTaken % 60}s</span>
                          )}
                        </div>
                      )}
                    </div>
                  </Link>
                </Card>
              ))}
            </div>
          </div>
        )}

        {history && history.length > 0 && (
          <div className="mt-4">
            <h4 className="font-semibold mb-2">Recent Quizzes</h4>
            <div className="space-y-2">
              {history.map((quiz) => (
                <Link key={quiz.id} href={encryptedRoutes.quizReview(quiz.id)}>
                  <div className="flex justify-between items-center text-sm p-2 bg-gray-50 rounded hover:bg-gray-100 cursor-pointer transition-colors">
                    <span className="text-blue-600 hover:underline flex-1">
                      Quiz #{quiz.id} | {quiz.subjectName || 'Unknown'} | {quiz.moduleName || 'Unknown'} | {formatCompletedDate(quiz.completedAt!)}
                    </span>
                    <span className="font-semibold ml-2">{quiz.scorePercentage}%</span>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}
      </CardContent>

      {/* Points Ledger Modal */}
      <Dialog open={isPointsLedgerOpen} onOpenChange={setIsPointsLedgerOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>📊 Points Ledger - {childName}</DialogTitle>
            <DialogDescription>
              Complete history of points earned from quizzes
            </DialogDescription>
          </DialogHeader>
          
          {/* Points Chart */}
          {pointsHistory && pointsHistory.length > 0 && (
            <div className="mb-6">
              <h3 className="text-sm font-semibold mb-3 text-gray-700">Points Progress Over Time</h3>
              <ResponsiveContainer width="100%" height={200}>
                <LineChart data={pointsHistory.slice().reverse()}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" />
                  <XAxis 
                    dataKey="completedAt" 
                    tickFormatter={(value) => new Date(value).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
                    stroke="#666"
                    fontSize={12}
                  />
                  <YAxis stroke="#666" fontSize={12} label={{ value: 'Points', angle: -90, position: 'insideLeft' }} />
                  <Tooltip 
                    labelFormatter={(value) => new Date(value).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                    formatter={(value: any) => [`${value} points`, 'Earned']}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="totalPoints" 
                    stroke="#8b5cf6" 
                    strokeWidth={2}
                    dot={{ fill: '#8b5cf6', r: 4 }}
                    activeDot={{ r: 6 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}
          
          <div className="space-y-2">
            {pointsHistory && pointsHistory.length > 0 ? (
              pointsHistory.map((entry) => (
                <Link key={entry.id} href={encryptedRoutes.quizReview(entry.id)}>
                  <Card className="p-3 hover:bg-gray-50 cursor-pointer transition-colors">
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <p className="font-semibold text-sm">{entry.subjectName} - {entry.moduleName}</p>
                        <p className="text-xs text-gray-500 mt-1">
                          {entry.completedAt ? formatCompletedDate(entry.completedAt) : 'N/A'}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-lg font-bold text-purple-600">+{entry.totalPoints}</p>
                        <p className="text-xs text-gray-500">{entry.scorePercentage}%</p>
                      </div>
                    </div>
                  </Card>
                </Link>
              ))
            ) : (
              <p className="text-center text-gray-500 py-8">No points history yet. Complete quizzes to earn points!</p>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </Card>
  );
}

