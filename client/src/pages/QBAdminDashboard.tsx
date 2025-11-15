import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import QuestionBankManager from "@/components/QuestionBankManager";
import { trpc } from "@/lib/trpc";
import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { BookOpen, BarChart3, FileQuestion, Plus } from "lucide-react";

export default function QBAdminDashboard() {
  const { user, loading, isAuthenticated, logout } = useAuth();
  const [, setLocation] = useLocation();
  const [activeTab, setActiveTab] = useState("questions");

  // Redirect if not QB Admin
  useEffect(() => {
    if (!loading && (!isAuthenticated || user?.role !== 'qb_admin')) {
      setLocation('/');
    }
  }, [loading, isAuthenticated, user, setLocation]);

  // Get dashboard statistics
  const { data: dashboardStats, isLoading: statsLoading } = trpc.qbAdmin.getDashboardStats.useQuery();
  const { data: subjects } = trpc.qbAdmin.getSubjects.useQuery();

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center">Loading...</div>;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <BookOpen className="h-8 w-8 text-purple-600" />
            <h1 className="text-2xl font-bold text-gray-900">QB Admin Dashboard</h1>
          </div>
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
        <div className="grid md:grid-cols-4 gap-6">
          <Card>
            <CardHeader className="pb-3">
              <CardDescription>Total Questions</CardDescription>
              <CardTitle className="text-3xl">
                {statsLoading ? "..." : dashboardStats?.totalQuestions || 0}
              </CardTitle>
            </CardHeader>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardDescription>Total Subjects</CardDescription>
              <CardTitle className="text-3xl">{subjects?.length || 0}</CardTitle>
            </CardHeader>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardDescription>By Difficulty</CardDescription>
              <CardContent className="p-0 pt-2">
                <div className="text-sm space-y-1">
                  <div className="flex justify-between">
                    <span className="text-green-600">Easy:</span>
                    <span className="font-semibold">
                      {dashboardStats?.questionsByDifficulty?.easy || 0}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-yellow-600">Medium:</span>
                    <span className="font-semibold">
                      {dashboardStats?.questionsByDifficulty?.medium || 0}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-red-600">Hard:</span>
                    <span className="font-semibold">
                      {dashboardStats?.questionsByDifficulty?.hard || 0}
                    </span>
                  </div>
                </div>
              </CardContent>
            </CardHeader>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardDescription>Recent (7 days)</CardDescription>
              <CardTitle className="text-3xl text-purple-600">
                {statsLoading ? "..." : dashboardStats?.recentQuestions || 0}
              </CardTitle>
            </CardHeader>
          </Card>
        </div>

        {/* Main Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-3 lg:w-[600px]">
            <TabsTrigger value="questions" className="flex items-center gap-2">
              <FileQuestion className="h-4 w-4" />
              Questions
            </TabsTrigger>
            <TabsTrigger value="quizzes" className="flex items-center gap-2">
              <BookOpen className="h-4 w-4" />
              Quizzes
            </TabsTrigger>
            <TabsTrigger value="analytics" className="flex items-center gap-2">
              <BarChart3 className="h-4 w-4" />
              Analytics
            </TabsTrigger>
          </TabsList>

          {/* Questions Tab */}
          <TabsContent value="questions" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Question Bank Management</CardTitle>
                <CardDescription>
                  Add, edit, and manage questions for the entire platform
                </CardDescription>
              </CardHeader>
              <CardContent>
                <QuestionBankManager />
              </CardContent>
            </Card>
          </TabsContent>

          {/* Quizzes Tab */}
          <TabsContent value="quizzes" className="space-y-4">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Quiz Management</CardTitle>
                    <CardDescription>
                      Create and manage quizzes from your question bank
                    </CardDescription>
                  </div>
                  <Button>
                    <Plus className="h-4 w-4 mr-2" />
                    Create Quiz
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-center py-12 text-gray-500">
                  <BookOpen className="h-16 w-16 mx-auto mb-4 text-gray-400" />
                  <p className="text-lg font-medium">Quiz Management Coming Soon</p>
                  <p className="text-sm mt-2">Create and assign quizzes to modules</p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Analytics Tab */}
          <TabsContent value="analytics" className="space-y-4">
            <div className="grid md:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Question Performance</CardTitle>
                  <CardDescription>Top performing questions by accuracy</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="text-center py-8 text-gray-500">
                    <BarChart3 className="h-12 w-12 mx-auto mb-3 text-gray-400" />
                    <p className="text-sm">Analytics coming soon</p>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Subject Distribution</CardTitle>
                  <CardDescription>Questions by subject</CardDescription>
                </CardHeader>
                <CardContent>
                  {statsLoading ? (
                    <div className="text-center py-8">Loading...</div>
                  ) : (
                    <div className="space-y-3">
                      {dashboardStats?.questionsBySubject?.slice(0, 5).map((item: any) => (
                        <div key={item.subject} className="flex items-center justify-between">
                          <span className="text-sm font-medium">{item.subject}</span>
                          <div className="flex items-center gap-2">
                            <div className="w-32 h-2 bg-gray-200 rounded-full overflow-hidden">
                              <div 
                                className="h-full bg-purple-600 rounded-full"
                                style={{ 
                                  width: `${Math.min((item.count / (dashboardStats?.totalQuestions || 1)) * 100, 100)}%` 
                                }}
                              />
                            </div>
                            <span className="text-sm text-gray-600 w-12 text-right">{item.count}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card className="md:col-span-2">
                <CardHeader>
                  <CardTitle>Question Status Overview</CardTitle>
                  <CardDescription>Distribution of questions by status</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {Object.entries(dashboardStats?.questionsByStatus || {}).map(([status, count]) => (
                      <div key={status} className="text-center p-4 bg-gray-50 rounded-lg">
                        <div className="text-2xl font-bold text-purple-600">{count as number}</div>
                        <div className="text-sm text-gray-600 capitalize">{status}</div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
