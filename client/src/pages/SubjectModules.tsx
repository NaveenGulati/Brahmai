import { useAuth } from "@/_core/hooks/useAuth";
import { encryptedRoutes, decryptId } from "@shared/urlEncryption";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { trpc } from "@/lib/trpc";
import { useEffect, useState } from "react";
import { useLocation, useParams } from "wouter";

export default function SubjectModules() {
  const { subjectId: encryptedSubjectId } = useParams<{ subjectId: string }>();
  const [, setLocation] = useLocation();
  
  // Decrypt the subject ID from URL
  let subjectId: number;
  try {
    subjectId = decryptId(encryptedSubjectId!);
  } catch (error) {
    console.error('Failed to decrypt subject ID:', error);
    setLocation('/child');
    return null;
  }
  const { user, loading } = useAuth({ redirectOnUnauthenticated: false });
  const [childUser, setChildUser] = useState<any>(null);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    // Check for local child login first
    const storedUser = localStorage.getItem('childUser');
    if (storedUser) {
      try {
        const parsed = JSON.parse(storedUser);
        setChildUser(parsed);
        setIsReady(true);
      } catch (e) {
        setLocation('/child-login');
      }
    } else if (!loading && !user) {
      setLocation('/child-login');
    } else if (!loading && user?.role === 'child') {
      setIsReady(true);
    }
  }, [loading, user, setLocation]);

  const { data: modules } = trpc.child.getModules.useQuery(
    { subjectId },
    { enabled: !!subjectId && isReady }
  );

  if (!isReady) {
    return <div className="min-h-screen flex items-center justify-center">Loading...</div>;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50">
      <header className="bg-white shadow-sm border-b">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <Button variant="ghost" onClick={() => setLocation('/child')}>
            ← Back to Dashboard
          </Button>
          <h1 className="text-xl font-bold text-gray-900">Choose a Module</h1>
          <div className="w-20"></div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8">
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {modules?.map((module) => (
            <Card 
              key={module.id}
              className="hover:shadow-lg transition-all cursor-pointer border-2 hover:border-indigo-400"
              onClick={() => setLocation(encryptedRoutes.quiz(module.id))}
            >
              <CardHeader>
                <CardTitle className="text-lg">{module.name}</CardTitle>
                <CardDescription>{module.description}</CardDescription>
              </CardHeader>
              <CardContent>
                <Button className="w-full">Start Quiz</Button>
              </CardContent>
            </Card>
          ))}
        </div>

        {(!modules || modules.length === 0) && (
          <div className="text-center py-12">
            <p className="text-gray-500 text-lg">No modules available yet.</p>
            <p className="text-gray-400 text-sm mt-2">Ask your parent to add some questions!</p>
          </div>
        )}
      </div>
    </div>
  );
}

