import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import QuestionBankManager from "@/components/QuestionBankManager";
import { trpc } from "@/lib/trpc";
import { useEffect } from "react";
import { useLocation } from "wouter";

export default function QBAdminDashboard() {
  const { user, loading, isAuthenticated, logout } = useAuth();
  const [, setLocation] = useLocation();

  // Redirect if not QB Admin
  useEffect(() => {
    if (!loading && (!isAuthenticated || user?.role !== 'qb_admin')) {
      setLocation('/');
    }
  }, [loading, isAuthenticated, user, setLocation]);

  // Get statistics
  const { data: subjects } = trpc.qbAdmin.getSubjects.useQuery();
  const { data: allQuestions } = trpc.qbAdmin.getAllQuestions.useQuery();

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center">Loading...</div>;
  }

  // Calculate statistics
  const totalQuestions = allQuestions?.length || 0;
  const totalSubjects = subjects?.length || 0;
  
  const questionsByDifficulty = allQuestions?.reduce((acc: any, q: any) => {
    acc[q.difficulty] = (acc[q.difficulty] || 0) + 1;
    return acc;
  }, {}) || {};

  const questionsByScope = allQuestions?.reduce((acc: any, q: any) => {
    acc[q.scope] = (acc[q.scope] || 0) + 1;
    return acc;
  }, {}) || {};

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <h1 className="text-2xl font-bold text-gray-900">📚 QB Admin Dashboard</h1>
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
              <CardTitle className="text-3xl">{totalQuestions}</CardTitle>
            </CardHeader>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardDescription>Total Subjects</CardDescription>
              <CardTitle className="text-3xl">{totalSubjects}</CardTitle>
            </CardHeader>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardDescription>By Difficulty</CardDescription>
              <CardContent className="p-0">
                <div className="text-sm space-y-1">
                  <div className="flex justify-between">
                    <span className="text-green-600">Easy:</span>
                    <span className="font-semibold">{questionsByDifficulty.easy || 0}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-yellow-600">Medium:</span>
                    <span className="font-semibold">{questionsByDifficulty.medium || 0}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-red-600">Hard:</span>
                    <span className="font-semibold">{questionsByDifficulty.hard || 0}</span>
                  </div>
                </div>
              </CardContent>
            </CardHeader>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardDescription>By Scope</CardDescription>
              <CardContent className="p-0">
                <div className="text-sm space-y-1">
                  <div className="flex justify-between">
                    <span>School:</span>
                    <span className="font-semibold">{questionsByScope.School || 0}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Olympiad:</span>
                    <span className="font-semibold">{questionsByScope.Olympiad || 0}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Competitive:</span>
                    <span className="font-semibold">{questionsByScope.Competitive || 0}</span>
                  </div>
                </div>
              </CardContent>
            </CardHeader>
          </Card>
        </div>

        {/* Question Bank Manager */}
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
      </div>
    </div>
  );
}

