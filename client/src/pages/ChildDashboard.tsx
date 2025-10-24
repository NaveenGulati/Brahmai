import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { trpc } from "@/lib/trpc";
import { useEffect, useState } from "react";
import { useLocation } from "wouter";

export default function ChildDashboard() {
  const { user, loading, isAuthenticated, logout } = useAuth();
  const [, setLocation] = useLocation();
  const [childUser, setChildUser] = useState<any>(null);

  useEffect(() => {
    // Check for local child login
    const storedUser = localStorage.getItem('childUser');
    if (storedUser) {
      setChildUser(JSON.parse(storedUser));
    } else if (!loading && !isAuthenticated) {
      // Only redirect if not authenticated AND no local user
      setLocation('/child-login');
    }
  }, [loading, isAuthenticated, setLocation]);

  const { data: subjects } = trpc.child.getSubjects.useQuery();
  
  const { data: stats } = trpc.child.getMyStats.useQuery(
    { childId: childUser?.id },
    { enabled: !!childUser || (isAuthenticated && user?.role === 'child') }
  );
  
  const { data: achievements } = trpc.child.getMyAchievements.useQuery(
    { childId: childUser?.id },
    { enabled: !!childUser || (isAuthenticated && user?.role === 'child') }
  );
  
  const { data: allAchievements } = trpc.child.getAllAchievements.useQuery();

  if (loading || (!childUser && !isAuthenticated)) {
    return <div className="min-h-screen flex items-center justify-center">Loading...</div>;
  }

  const handleLogout = () => {
    localStorage.removeItem('childUser');
    if (isAuthenticated) {
      logout();
    } else {
      setLocation('/child-login');
    }
  };

  const earnedAchievementIds = new Set(achievements?.map(a => a.achievement.id));

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-pink-50 to-blue-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <h1 className="text-2xl font-bold text-gray-900">🎓 My Learning Dashboard</h1>
          <div className="flex items-center gap-4">
            <div className="text-right">
              <p className="text-sm font-semibold text-gray-900">{childUser?.name || user?.name}</p>
              <p className="text-xs text-gray-500">{childUser?.totalPoints || stats?.totalPoints || 0} points</p>
            </div>
            <Button variant="outline" size="sm" onClick={handleLogout}>
              Logout
            </Button>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8 space-y-8">
        {/* Stats Overview */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card className="bg-gradient-to-br from-blue-500 to-blue-600 text-white">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium opacity-90">Total Points</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold">{stats?.totalPoints || 0}</p>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-green-500 to-green-600 text-white">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium opacity-90">Quizzes Taken</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold">{stats?.totalQuizzes || 0}</p>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-purple-500 to-purple-600 text-white">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium opacity-90">Average Score</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold">{stats?.averageScore || 0}%</p>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-orange-500 to-orange-600 text-white">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium opacity-90">Current Streak</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold">{stats?.currentStreak || 0} 🔥</p>
            </CardContent>
          </Card>
        </div>

        {/* Subjects Grid */}
        <div>
          <h2 className="text-2xl font-bold mb-4 text-gray-900">Choose Your Subject</h2>
          <div className="grid md:grid-cols-3 lg:grid-cols-4 gap-4">
            {subjects?.map((subject) => (
              <Card 
                key={subject.id} 
                className="hover:shadow-lg transition-all cursor-pointer border-2 hover:border-indigo-300"
                onClick={() => setLocation(`/subject/${subject.id}`)}
              >
                <CardHeader className="text-center">
                  <div className="text-5xl mb-2">{subject.icon}</div>
                  <CardTitle className="text-lg">{subject.name}</CardTitle>
                  <CardDescription className="text-xs">{subject.description}</CardDescription>
                </CardHeader>
              </Card>
            ))}
          </div>
        </div>

        {/* Achievements Section */}
        <div>
          <h2 className="text-2xl font-bold mb-4 text-gray-900">🏆 Achievements</h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {allAchievements?.map((achievement) => {
              const isEarned = earnedAchievementIds.has(achievement.id);
              return (
                <Card 
                  key={achievement.id} 
                  className={`${isEarned ? 'bg-gradient-to-br from-yellow-50 to-yellow-100 border-yellow-300' : 'bg-gray-50 opacity-60'}`}
                >
                  <CardHeader>
                    <div className="flex items-center gap-3">
                      <div className="text-4xl">{achievement.icon}</div>
                      <div>
                        <CardTitle className="text-base">{achievement.name}</CardTitle>
                        <CardDescription className="text-xs">{achievement.description}</CardDescription>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-semibold text-indigo-600">{achievement.points} points</span>
                      {isEarned && <span className="text-green-600 font-bold">✓ Earned</span>}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>

        {/* Progress Indicator */}
        {stats && stats.totalQuizzes > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Your Progress</CardTitle>
              <CardDescription>Keep going! You're doing great!</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <div className="flex justify-between mb-2">
                  <span className="text-sm font-medium">Overall Performance</span>
                  <span className="text-sm font-bold text-indigo-600">{stats.averageScore}%</span>
                </div>
                <Progress value={stats.averageScore} className="h-3" />
              </div>
              
              <div className="grid grid-cols-2 gap-4 text-center">
                <div className="p-3 bg-blue-50 rounded">
                  <p className="text-sm text-gray-600">Longest Streak</p>
                  <p className="text-2xl font-bold text-blue-600">{stats.longestStreak} days</p>
                </div>
                <div className="p-3 bg-green-50 rounded">
                  <p className="text-sm text-gray-600">Total Quizzes</p>
                  <p className="text-2xl font-bold text-green-600">{stats.totalQuizzes}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}

