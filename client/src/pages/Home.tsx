import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { APP_LOGO, APP_TITLE, getLoginUrl, getGoogleLoginUrl } from "@/const";
import { useEffect } from "react";
import { useLocation } from "wouter";

export default function Home() {
  const { user, loading, isAuthenticated } = useAuth();
  const [, setLocation] = useLocation();

  useEffect(() => {
    if (isAuthenticated && user) {
      // Redirect based on role
      if (user.role === 'parent') {
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
        <div className="grid md:grid-cols-2 gap-6 mb-12">
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
          <Card className="max-w-2xl mx-auto bg-white/80 backdrop-blur">
            <CardHeader>
              <CardTitle>Ready to Start Learning?</CardTitle>
              <CardDescription>
                Choose your login option below
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Card className="border-2 border-indigo-200 hover:border-indigo-400 transition-colors">
                <CardHeader>
                  <CardTitle className="text-lg">👨‍👩‍👧 Parent Login</CardTitle>
                  <CardDescription className="text-sm">
                    Manage questions and monitor progress
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  {/* Google Sign-In - Primary Option */}
                  <Button 
                    size="lg" 
                    className="w-full bg-white hover:bg-gray-50 text-gray-700 border-2 border-gray-300 font-medium"
                    onClick={() => window.location.href = getGoogleLoginUrl()}
                  >
                    <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24">
                      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                    </svg>
                    Sign in with Google
                  </Button>
                  
                  {/* Divider */}
                  <div className="relative">
                    <div className="absolute inset-0 flex items-center">
                      <span className="w-full border-t border-gray-300" />
                    </div>
                    <div className="relative flex justify-center text-xs uppercase">
                      <span className="bg-white px-2 text-gray-500">Or</span>
                    </div>
                  </div>
                  
                  {/* Manus OAuth - Secondary Option */}
                  <Button 
                    size="lg" 
                    variant="outline"
                    className="w-full"
                    onClick={() => window.location.href = getLoginUrl()}
                  >
                    Sign in with Manus
                  </Button>
                </CardContent>
              </Card>

              <Card className="border-2 border-purple-200 hover:border-purple-400 transition-colors">
                <CardHeader>
                  <CardTitle className="text-lg">🎓 Student Login</CardTitle>
                  <CardDescription className="text-sm">
                    Take quizzes and earn achievements
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Button 
                    size="lg" 
                    className="w-full bg-purple-600 hover:bg-purple-700"
                    onClick={() => setLocation('/child-login')}
                  >
                    Student Sign In
                  </Button>
                </CardContent>
              </Card>
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

