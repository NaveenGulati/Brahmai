import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { APP_LOGO, APP_TITLE, getLoginUrl } from "@/const";
import { useEffect } from "react";
import { useLocation } from "wouter";

export default function Home() {
  const { user, loading, isAuthenticated } = useAuth();
  const [, setLocation] = useLocation();

  useEffect(() => {
    if (isAuthenticated && user) {
      // Redirect based on role
      if (user.role === 'parent' || user.role === 'admin') {
        setLocation('/parent');
      } else if (user.role === 'child') {
        setLocation('/child');
      }
    }
  }, [isAuthenticated, user, setLocation]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50">
      {/* Hero Section */}
      <div className="container mx-auto px-4 py-16">
        <div className="text-center mb-12">
          <h1 className="text-5xl font-bold text-gray-900 mb-4">
            🎓 ICSE Grade 7 Quiz Master
          </h1>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            Master your subjects, ace your exams, and prepare for Olympiads with engaging quizzes and gamified learning
          </p>
        </div>

        {/* Features Grid */}
        <div className="grid md:grid-cols-3 gap-6 mb-12">
          <Card className="border-2 border-blue-200 hover:shadow-lg transition-shadow">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <span className="text-3xl">📚</span>
                All ICSE Subjects
              </CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription>
                Mathematics, Science, English, Social Studies, Hindi, Spanish, and Computer Science - all covered comprehensively
              </CardDescription>
            </CardContent>
          </Card>

          <Card className="border-2 border-green-200 hover:shadow-lg transition-shadow">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <span className="text-3xl">🎮</span>
                Gamified Learning
              </CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription>
                Earn points, unlock achievements, maintain streaks, and climb leaderboards while learning
              </CardDescription>
            </CardContent>
          </Card>

          <Card className="border-2 border-purple-200 hover:shadow-lg transition-shadow">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <span className="text-3xl">👨‍👩‍👧</span>
                Parent Monitoring
              </CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription>
                Track progress, manage question banks, upload custom quizzes, and monitor performance in real-time
              </CardDescription>
            </CardContent>
          </Card>
        </div>

        {/* CTA Section */}
        <div className="text-center">
          <Card className="max-w-md mx-auto bg-white/80 backdrop-blur">
            <CardHeader>
              <CardTitle>Ready to Start Learning?</CardTitle>
              <CardDescription>
                Sign in to access your personalized dashboard
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button 
                size="lg" 
                className="w-full bg-indigo-600 hover:bg-indigo-700"
                onClick={() => window.location.href = getLoginUrl()}
              >
                Sign In to Continue
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Features List */}
        <div className="mt-16 max-w-3xl mx-auto">
          <h2 className="text-2xl font-bold text-center mb-8 text-gray-900">
            What Makes This Special?
          </h2>
          <div className="grid md:grid-cols-2 gap-4">
            {[
              { icon: "✅", text: "Multiple question formats (MCQ, True/False, Fill blanks, Match, Image-based)" },
              { icon: "⏱️", text: "Timed quizzes (10-15 minutes) to improve focus" },
              { icon: "🏆", text: "Achievements and badges for milestones" },
              { icon: "📊", text: "Detailed progress analytics and reports" },
              { icon: "🔥", text: "Daily streak tracking for consistency" },
              { icon: "🎯", text: "Olympiad-level questions for advanced preparation" },
              { icon: "📤", text: "JSON upload for bulk question import" },
              { icon: "💡", text: "Detailed explanations for every answer" },
            ].map((feature, idx) => (
              <div key={idx} className="flex items-start gap-3 p-3 bg-white rounded-lg shadow-sm">
                <span className="text-2xl">{feature.icon}</span>
                <p className="text-gray-700">{feature.text}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

