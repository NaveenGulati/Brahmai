import { useAuth } from "@/_core/hooks/useAuth";
import { encryptedRoutes } from "@shared/urlEncryption";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { trpc } from "@/lib/trpc";
import { useEffect, useState } from "react";
import { useLocation, Link } from "wouter";
import { toast } from "sonner";

export default function ChildDashboard() {
  const { user, loading, logout } = useAuth({ redirectOnUnauthenticated: false });
  const [, setLocation] = useLocation();
  const [childUser, setChildUser] = useState<any>(null);
  const [isReady, setIsReady] = useState(false);
  const [isPointsLedgerOpen, setIsPointsLedgerOpen] = useState(false);

  useEffect(() => {
    // Check for local child login first
    const storedUser = localStorage.getItem('childUser');
    if (storedUser) {
      try {
        const parsed = JSON.parse(storedUser);
        setChildUser(parsed);
        setIsReady(true);
      } catch (e) {
        // Invalid stored data, redirect to login
        setLocation('/child-login');
      }
    } else if (!loading && !user) {
      // No local user and no OAuth user, redirect to login
      setLocation('/child-login');
    } else if (!loading && user?.role === 'child') {
      // OAuth child user
      setIsReady(true);
    }
  }, [loading, user, setLocation]);

  const { data: subjects } = trpc.child.getSubjects.useQuery();
  
  const { data: stats } = trpc.child.getMyStats.useQuery(
    { childId: childUser?.id },
    { enabled: isReady }
  );
  
  const { data: achievements } = trpc.child.getMyAchievements.useQuery(
    { childId: childUser?.id },
    { enabled: isReady }
  );
  
  const { data: allAchievements } = trpc.child.getAllAchievements.useQuery();
  
  const { data: challenges } = trpc.child.getChallenges.useQuery(
    { childId: childUser?.id },
    { enabled: isReady }
  );
  
  const { data: pointsHistory } = trpc.child.getPointsHistory.useQuery(
    { childId: childUser?.id },
    { enabled: isReady && isPointsLedgerOpen }
  );
  
  const { data: quizHistory } = trpc.child.getQuizHistory.useQuery(
    { childId: childUser?.id, limit: 5 },
    { enabled: isReady }
  );
  
  const utils = trpc.useUtils();
  const completeChallengeM = trpc.child.completeChallenge.useMutation({
    onSuccess: () => {
      utils.child.getChallenges.invalidate();
    },
  });

  if (!isReady) {
    return <div className="min-h-screen flex items-center justify-center">Loading...</div>;
  }
  
  const pendingChallenges = challenges?.filter(c => c.status === 'pending') || [];
  
  // Debug: Log challenge data
  console.log('All challenges:', challenges);
  console.log('Pending challenges:', pendingChallenges);

  const handleLogout = () => {
    localStorage.removeItem('childUser');
    if (user) {
      logout();
    }
    setLocation('/child-login');
  };

  const earnedAchievementIds = new Set(achievements?.map(a => a.achievementId));

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-pink-50 to-blue-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <h1 className="text-2xl font-bold text-gray-900">🎓 My Learning Dashboard</h1>
          <div className="flex items-center gap-4">
            <div className="text-right">
              <p className="text-sm font-semibold text-gray-900">{childUser?.name || user?.name}</p>
              <p className="text-xs text-gray-500">{stats?.totalPoints || 0} points</p>
            </div>
            <Button variant="outline" size="sm" onClick={handleLogout}>
              Logout
            </Button>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8 space-y-8">
        {/* Challenges Section */}
        {pendingChallenges.length > 0 && (
          <div className="bg-gradient-to-r from-yellow-100 to-orange-100 border-2 border-yellow-400 rounded-lg p-6">
            <h2 className="text-2xl font-bold mb-4 text-gray-900 flex items-center gap-2">
              🎯 New Challenges from Your Parent!
            </h2>
            <div className="space-y-3">
              {pendingChallenges.map((challenge) => (
                <Card key={challenge.id} className="bg-white">
                  <CardHeader>
                    <CardTitle className="text-lg">{challenge.title}</CardTitle>
                    {challenge.message && (
                      <CardDescription className="text-base">
                        {challenge.message.split(/\*\*(.+?)\*\*/).map((part, i) => 
                          i % 2 === 1 ? <strong key={i} className="font-bold text-gray-900">{part}</strong> : part
                        )}
                      </CardDescription>
                    )}
                  </CardHeader>
                  <CardContent className="flex justify-between items-center">
                    <div className="text-sm text-gray-600">
                      {challenge.expiresAt && (
                        <p>Due: {new Date(challenge.expiresAt).toLocaleDateString()}</p>
                      )}
                    </div>
                    <Button
                      onClick={() => {
                        // Store challenge ID in localStorage for the quiz page to access
                        localStorage.setItem('currentChallengeId', challenge.id.toString());
                        // Navigate to quiz with path parameter
                        setLocation(encryptedRoutes.quiz(challenge.moduleId));
                      }}
                      className="bg-gradient-to-r from-green-500 to-blue-500 hover:from-green-600 hover:to-blue-600"
                    >
                      Start Challenge 🚀
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}

        {/* Stats Overview */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card 
            className="bg-gradient-to-br from-blue-500 to-blue-600 text-white cursor-pointer hover:shadow-lg transition-shadow"
            onClick={() => setIsPointsLedgerOpen(true)}
          >
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium opacity-90">Total Points 📊</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold">{stats?.totalPoints || 0}</p>
              <p className="text-xs opacity-75 mt-1">Click to view ledger</p>
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
              <p className="text-3xl font-bold">{stats?.avgScore || 0}%</p>
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
                onClick={() => setLocation(encryptedRoutes.subject(subject.id))}
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
                  <span className="text-sm font-bold text-indigo-600">{stats.avgScore}%</span>
                </div>
                <Progress value={stats.avgScore} className="h-3" />
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

        {/* Recent Quizzes */}
        {quizHistory && quizHistory.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Recent Quizzes</CardTitle>
              <CardDescription>Your latest quiz attempts</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {quizHistory.map((quiz) => (
                  <Link key={quiz.id} href={encryptedRoutes.quizReview(quiz.id)}>
                    <div className="flex justify-between items-center text-sm p-3 bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg hover:from-blue-100 hover:to-purple-100 cursor-pointer transition-all border border-blue-200">
                      <div className="flex-1">
                        <p className="font-semibold text-gray-900">Quiz #{quiz.id}</p>
                        <p className="text-xs text-gray-600">{quiz.subjectName || 'Unknown'} • {quiz.moduleName || 'Unknown'}</p>
                        <p className="text-xs text-gray-500 mt-1">{new Date(quiz.completedAt!).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-2xl font-bold text-indigo-600">{quiz.scorePercentage}%</p>
                        <p className="text-xs text-gray-500">{quiz.correctAnswers}/{quiz.totalQuestions}</p>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Points Ledger Modal */}
      <Dialog open={isPointsLedgerOpen} onOpenChange={setIsPointsLedgerOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>📊 Points Ledger</DialogTitle>
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
              pointsHistory.map((entry, index) => (
                <Link key={entry.id} href={encryptedRoutes.quizReview(entry.id)}>
                  <Card className="p-3 hover:bg-gray-50 cursor-pointer transition-colors">
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <p className="font-semibold text-sm">{entry.subjectName} - {entry.moduleName}</p>
                        <p className="text-xs text-gray-500 mt-1">
                          {entry.completedAt ? new Date(entry.completedAt).toLocaleString('en-US', {
                            day: 'numeric',
                            month: 'short',
                            year: 'numeric',
                            hour: 'numeric',
                            minute: '2-digit',
                            hour12: true
                          }) : 'N/A'}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-lg font-bold text-blue-600">+{entry.totalPoints}</p>
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
    </div>
  );
}

