import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useLocation } from 'wouter';
import { trpc } from '@/lib/trpc';
import { toast } from 'sonner';

/**
 * Developer Login Panel
 * Quick access for testing different user roles
 */
export function DevLogin() {
  const [, setLocation] = useLocation();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const childLoginMutation = trpc.localAuth.childLogin.useMutation({
    onSuccess: (data) => {
      setIsLoading(false);
      if (data.success) {
        toast.success('Login successful!');
        // Use redirectTo from server response, or default to /child
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

  const handleQuickLogin = (role: 'student' | 'parent' | 'teacher' | 'qbadmin') => {
    setIsLoading(true);
    
    // Quick login credentials for testing
    const credentials: Record<string, { username: string; password: string }> = {
      student: { username: 'demo_student', password: 'demo123' },
      parent: { username: 'demo_parent', password: 'demo123' },
      teacher: { username: 'demo_teacher', password: 'demo123' },
      qbadmin: { username: 'qbadmin', password: 'admin123' },
    };

    const cred = credentials[role];
    
    // All roles now use local authentication
    childLoginMutation.mutate(cred);
  };

  const handleManualLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (!username || !password) {
      toast.error('Please enter username and password');
      return;
    }
    
    setIsLoading(true);
    childLoginMutation.mutate({ username, password });
  };

  return (
    <Card className="bg-gradient-to-br from-yellow-50 to-orange-50 border-2 border-yellow-300">
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <span className="text-2xl">🔧</span>
          Developer Quick Login
        </CardTitle>
        <CardDescription className="text-sm">
          Quick access for testing (Development Only)
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Quick Login Buttons */}
        <div className="grid grid-cols-2 gap-2">
          <Button
            size="sm"
            variant="outline"
            className="border-blue-300 hover:bg-blue-50"
            onClick={() => handleQuickLogin('student')}
            disabled={isLoading}
          >
            🎓 Student
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="border-green-300 hover:bg-green-50"
            onClick={() => handleQuickLogin('qbadmin')}
            disabled={isLoading}
          >
            📚 QB Admin
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="border-purple-300 hover:bg-purple-50"
            onClick={() => handleQuickLogin('parent')}
            disabled={isLoading}
          >
            👨‍👩‍👧 Parent
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="border-cyan-300 hover:bg-cyan-50"
            onClick={() => handleQuickLogin('teacher')}
            disabled={isLoading}
          >
            👨‍🏫 Teacher
          </Button>
        </div>

        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <span className="w-full border-t border-yellow-300" />
          </div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="bg-yellow-50 px-2 text-yellow-700">Or manual login</span>
          </div>
        </div>

        {/* Manual Login Form */}
        <form onSubmit={handleManualLogin} className="space-y-3">
          <div>
            <Label htmlFor="dev-username" className="text-sm">Username</Label>
            <Input
              id="dev-username"
              type="text"
              placeholder="Enter username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="border-yellow-300"
            />
          </div>
          <div>
            <Label htmlFor="dev-password" className="text-sm">Password</Label>
            <Input
              id="dev-password"
              type="password"
              placeholder="Enter password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="border-yellow-300"
            />
          </div>
          <Button
            type="submit"
            size="sm"
            className="w-full bg-yellow-500 hover:bg-yellow-600 text-white"
            disabled={isLoading}
          >
            {isLoading ? 'Logging in...' : 'Login'}
          </Button>
        </form>

        <div className="text-xs text-yellow-700 bg-yellow-100 p-2 rounded">
          <strong>Demo Accounts:</strong><br />
          Student: demo_student / demo123<br />
          Parent: demo_parent / demo123<br />
          Teacher: demo_teacher / demo123<br />
          QB Admin: qbadmin / admin123
        </div>
      </CardContent>
    </Card>
  );
}

