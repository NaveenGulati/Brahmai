import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { trpc } from "@/lib/trpc";
import { useState } from "react";
import { useLocation } from "wouter";
import { toast } from "sonner";

export default function ChildLogin() {
  const [, setLocation] = useLocation();
  const [username, setUsername] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!username.trim()) {
      toast.error("Please enter your username");
      return;
    }

    setIsLoading(true);
    
    // In a real implementation, this would validate against the database
    // For now, we'll simulate a login by storing the username in localStorage
    // and redirecting to the child dashboard
    
    try {
      // Store username temporarily
      localStorage.setItem('childUsername', username);
      toast.success("Login successful!");
      setLocation('/child');
    } catch (error) {
      toast.error("Login failed. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-100 via-pink-100 to-blue-100 flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="text-6xl mb-4">🎓</div>
          <CardTitle className="text-2xl">Student Login</CardTitle>
          <CardDescription>
            Enter your username to start learning
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <Label htmlFor="username">Username</Label>
              <Input
                id="username"
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Enter your username"
                required
                className="text-lg"
              />
              <p className="text-xs text-gray-500 mt-1">
                Ask your parent if you don't know your username
              </p>
            </div>

            <Button 
              type="submit" 
              className="w-full py-6 text-lg bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700"
              disabled={isLoading}
            >
              {isLoading ? "Logging in..." : "Start Learning →"}
            </Button>
          </form>

          <div className="mt-6 text-center">
            <Button 
              variant="link" 
              onClick={() => setLocation('/')}
              className="text-sm text-gray-600"
            >
              ← Back to Home
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

