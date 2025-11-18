import { useState } from 'react';
import { useLocation } from 'wouter';
import { trpc } from '@/lib/trpc';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { DevLogin } from '@/components/DevLogin';

export default function Home() {
  const [, setLocation] = useLocation();
  const [isLoading, setIsLoading] = useState(false);
  
  // Form states for each user type
  const [studentForm, setStudentForm] = useState({ username: '', password: '' });
  const [parentForm, setParentForm] = useState({ username: '', password: '' });
  const [teacherForm, setTeacherForm] = useState({ username: '', password: '' });
  const [qbAdminForm, setQbAdminForm] = useState({ username: '', password: '' });

  const loginMutation = trpc.localAuth.childLogin.useMutation({
    onSuccess: (data) => {
      setIsLoading(false);
      if (data.success) {
        // Store child user data in localStorage for child role
        if (data.user?.role === 'child') {
          localStorage.setItem('childUser', JSON.stringify(data.user));
        }
        toast.success('Login successful!');
        setLocation(data.redirectTo || '/child');
      } else {
        toast.error('Login failed');
      }
    },
    onError: (error) => {
      setIsLoading(false);
      toast.error(error.message || 'Login failed');
    },
  });

  const handleLogin = (e: React.FormEvent, role: 'student' | 'parent' | 'teacher' | 'qbadmin') => {
    e.preventDefault();
    
    let credentials;
    switch (role) {
      case 'student':
        credentials = studentForm;
        break;
      case 'parent':
        credentials = parentForm;
        break;
      case 'teacher':
        credentials = teacherForm;
        break;
      case 'qbadmin':
        credentials = qbAdminForm;
        break;
    }

    if (!credentials.username || !credentials.password) {
      toast.error('Please enter username and password');
      return;
    }

    setIsLoading(true);
    loginMutation.mutate(credentials);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50">
      {/* Header */}
      <div className="container mx-auto px-4 py-8">
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-3 mb-4">
            <span className="text-5xl">🎓</span>
            <h1 className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
              ICSE Grade 7 Quiz Master
            </h1>
          </div>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            Master your subjects, ace your exams, and prepare for Olympiads with engaging quizzes and gamified learning
          </p>
        </div>

        {/* Feature Cards */}
        <div className="grid md:grid-cols-3 gap-6 mb-12">
          <Card className="bg-gradient-to-br from-green-50 to-emerald-50 border-2 border-green-200">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <span className="text-2xl">🎮</span>
                Gamified Learning
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-gray-600">
                Earn points, unlock achievements, maintain streaks, and climb leaderboards while learning
              </p>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-purple-50 to-pink-50 border-2 border-purple-200">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <span className="text-2xl">👨‍👩‍👧</span>
                Parent Monitoring
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-gray-600">
                Track your children's progress, assign challenges, and monitor performance with detailed analytics
              </p>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-cyan-50 to-blue-50 border-2 border-cyan-200">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <span className="text-2xl">👨‍🏫</span>
                Teacher Tools
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-gray-600">
                Manage classes, track student performance, and assign quizzes to entire groups
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Login Section */}
        <div className="max-w-2xl mx-auto">
          <Card className="bg-white/80 backdrop-blur">
            <CardHeader>
              <CardTitle>Ready to Start Learning?</CardTitle>
              <CardDescription>
                Choose your role and sign in below
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Tabs defaultValue="student" className="w-full">
                <TabsList className="grid w-full grid-cols-4">
                  <TabsTrigger value="student">🎓 Student</TabsTrigger>
                  <TabsTrigger value="parent">👨‍👩‍👧 Parent</TabsTrigger>
                  <TabsTrigger value="teacher">👨‍🏫 Teacher</TabsTrigger>
                  <TabsTrigger value="qbadmin">📚 QB Admin</TabsTrigger>
                </TabsList>

                {/* Student Login */}
                <TabsContent value="student">
                  <form onSubmit={(e) => handleLogin(e, 'student')} className="space-y-4">
                    <div>
                      <Label htmlFor="student-username">Username</Label>
                      <Input
                        id="student-username"
                        type="text"
                        placeholder="Enter your username"
                        value={studentForm.username}
                        onChange={(e) => setStudentForm({ ...studentForm, username: e.target.value })}
                      />
                    </div>
                    <div>
                      <Label htmlFor="student-password">Password</Label>
                      <Input
                        id="student-password"
                        type="password"
                        placeholder="Enter your password"
                        value={studentForm.password}
                        onChange={(e) => setStudentForm({ ...studentForm, password: e.target.value })}
                      />
                    </div>
                    <Button type="submit" className="w-full" disabled={isLoading}>
                      {isLoading ? 'Signing in...' : 'Sign In as Student'}
                    </Button>
                  </form>
                </TabsContent>

                {/* Parent Login */}
                <TabsContent value="parent">
                  <form onSubmit={(e) => handleLogin(e, 'parent')} className="space-y-4">
                    <div>
                      <Label htmlFor="parent-username">Username</Label>
                      <Input
                        id="parent-username"
                        type="text"
                        placeholder="Enter your username"
                        value={parentForm.username}
                        onChange={(e) => setParentForm({ ...parentForm, username: e.target.value })}
                      />
                    </div>
                    <div>
                      <Label htmlFor="parent-password">Password</Label>
                      <Input
                        id="parent-password"
                        type="password"
                        placeholder="Enter your password"
                        value={parentForm.password}
                        onChange={(e) => setParentForm({ ...parentForm, password: e.target.value })}
                      />
                    </div>
                    <Button type="submit" className="w-full" disabled={isLoading}>
                      {isLoading ? 'Signing in...' : 'Sign In as Parent'}
                    </Button>
                  </form>
                </TabsContent>

                {/* Teacher Login */}
                <TabsContent value="teacher">
                  <form onSubmit={(e) => handleLogin(e, 'teacher')} className="space-y-4">
                    <div>
                      <Label htmlFor="teacher-username">Username</Label>
                      <Input
                        id="teacher-username"
                        type="text"
                        placeholder="Enter your username"
                        value={teacherForm.username}
                        onChange={(e) => setTeacherForm({ ...teacherForm, username: e.target.value })}
                      />
                    </div>
                    <div>
                      <Label htmlFor="teacher-password">Password</Label>
                      <Input
                        id="teacher-password"
                        type="password"
                        placeholder="Enter your password"
                        value={teacherForm.password}
                        onChange={(e) => setTeacherForm({ ...teacherForm, password: e.target.value })}
                      />
                    </div>
                    <Button type="submit" className="w-full" disabled={isLoading}>
                      {isLoading ? 'Signing in...' : 'Sign In as Teacher'}
                    </Button>
                  </form>
                </TabsContent>

                {/* QB Admin Login */}
                <TabsContent value="qbadmin">
                  <form onSubmit={(e) => handleLogin(e, 'qbadmin')} className="space-y-4">
                    <div>
                      <Label htmlFor="qbadmin-username">Username</Label>
                      <Input
                        id="qbadmin-username"
                        type="text"
                        placeholder="Enter your username"
                        value={qbAdminForm.username}
                        onChange={(e) => setQbAdminForm({ ...qbAdminForm, username: e.target.value })}
                      />
                    </div>
                    <div>
                      <Label htmlFor="qbadmin-password">Password</Label>
                      <Input
                        id="qbadmin-password"
                        type="password"
                        placeholder="Enter your password"
                        value={qbAdminForm.password}
                        onChange={(e) => setQbAdminForm({ ...qbAdminForm, password: e.target.value })}
                      />
                    </div>
                    <Button type="submit" className="w-full" disabled={isLoading}>
                      {isLoading ? 'Signing in...' : 'Sign In as QB Admin'}
                    </Button>
                  </form>
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>

          {/* Developer Login Panel */}
          {process.env.NODE_ENV === 'development' && (
            <div className="mt-6">
              <DevLogin />
            </div>
          )}
        </div>

        {/* Features Section */}
        <div className="mt-12 max-w-4xl mx-auto">
          <h2 className="text-2xl font-bold text-center mb-6">What Makes This Special?</h2>
          <div className="grid md:grid-cols-2 gap-4">
            {[
              { icon: '✅', text: 'Multiple question formats (MCQ, True/False, Fill blanks, Match, Image-based)' },
              { icon: '⏱️', text: 'Timed quizzes (10-15 minutes) to improve focus' },
              { icon: '🏆', text: 'Achievements and badges for milestones' },
              { icon: '📊', text: 'Detailed progress analytics and reports' },
              { icon: '🔥', text: 'Daily streak tracking for consistency' },
              { icon: '🎯', text: 'Olympiad-level questions for advanced preparation' },
              { icon: '📤', text: 'JSON upload for bulk question import' },
              { icon: '💡', text: 'Detailed explanations for every answer' },
            ].map((feature, index) => (
              <div key={index} className="flex items-start gap-3 p-3 bg-white rounded-lg shadow-sm">
                <span className="text-2xl">{feature.icon}</span>
                <p className="text-sm text-gray-700">{feature.text}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
