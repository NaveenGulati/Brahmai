import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { trpc } from "@/lib/trpc";
import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { toast } from "sonner";

export default function SuperAdminDashboard() {
  const { user, loading, isAuthenticated, logout } = useAuth();
  const [, setLocation] = useLocation();
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('all');

  // Redirect if not superadmin
  useEffect(() => {
    if (!loading && (!isAuthenticated || user?.role !== 'superadmin')) {
      setLocation('/');
    }
  }, [loading, isAuthenticated, user, setLocation]);

  const { data: stats, isLoading: statsLoading } = trpc.superadmin.getPlatformStats.useQuery();
  const { data: users, isLoading: usersLoading } = trpc.superadmin.getAllUsers.useQuery({
    role: roleFilter === 'all' ? undefined : roleFilter as any,
    search: searchQuery || undefined,
  });
  const utils = trpc.useUtils();

  const updateRoleMutation = trpc.superadmin.updateUserRole.useMutation({
    onSuccess: () => {
      toast.success("User role updated successfully!");
      utils.superadmin.getAllUsers.invalidate();
      utils.superadmin.getPlatformStats.invalidate();
    },
    onError: (error) => {
      toast.error("Failed to update role: " + error.message);
    },
  });

  if (loading || statsLoading) {
    return <div className="min-h-screen flex items-center justify-center">Loading...</div>;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <h1 className="text-2xl font-bold text-gray-900">🛡️ Super Admin Dashboard</h1>
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
        {/* Platform Statistics */}
        <div>
          <h2 className="text-xl font-semibold mb-4">Platform Overview</h2>
          <div className="grid md:grid-cols-5 gap-4">
            <Card>
              <CardHeader className="pb-3">
                <CardDescription>Total Users</CardDescription>
                <CardTitle className="text-3xl">{stats?.totalUsers || 0}</CardTitle>
              </CardHeader>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardDescription>Total Quizzes</CardDescription>
                <CardTitle className="text-3xl">{stats?.totalQuizzes || 0}</CardTitle>
              </CardHeader>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardDescription>Questions Bank</CardDescription>
                <CardTitle className="text-3xl">{stats?.totalQuestions || 0}</CardTitle>
              </CardHeader>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardDescription>Active (7 days)</CardDescription>
                <CardTitle className="text-3xl">{stats?.activeUsers7Days || 0}</CardTitle>
              </CardHeader>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardDescription>Engagement Rate</CardDescription>
                <CardTitle className="text-3xl">
                  {stats?.totalUsers ? Math.round((stats.activeUsers7Days / stats.totalUsers) * 100) : 0}%
                </CardTitle>
              </CardHeader>
            </Card>
          </div>
        </div>

        {/* Users by Role */}
        <div>
          <h2 className="text-xl font-semibold mb-4">Users by Role</h2>
          <div className="grid md:grid-cols-5 gap-4">
            <Card>
              <CardHeader className="pb-3">
                <CardDescription>Parents</CardDescription>
                <CardTitle className="text-2xl">{stats?.usersByRole?.parent || 0}</CardTitle>
              </CardHeader>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardDescription>Children</CardDescription>
                <CardTitle className="text-2xl">{stats?.usersByRole?.child || 0}</CardTitle>
              </CardHeader>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardDescription>Teachers</CardDescription>
                <CardTitle className="text-2xl">{stats?.usersByRole?.teacher || 0}</CardTitle>
              </CardHeader>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardDescription>QB Admins</CardDescription>
                <CardTitle className="text-2xl">{stats?.usersByRole?.qb_admin || 0}</CardTitle>
              </CardHeader>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardDescription>Super Admins</CardDescription>
                <CardTitle className="text-2xl">{stats?.usersByRole?.superadmin || 0}</CardTitle>
              </CardHeader>
            </Card>
          </div>
        </div>

        {/* User Management */}
        <Card>
          <CardHeader>
            <CardTitle>User Management</CardTitle>
            <CardDescription>View and manage all users, change roles</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Filters */}
            <div className="flex gap-4">
              <Input
                placeholder="Search by name, email, or username..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="flex-1"
              />
              <Select value={roleFilter} onValueChange={setRoleFilter}>
                <SelectTrigger className="w-48">
                  <SelectValue placeholder="Filter by role" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Roles</SelectItem>
                  <SelectItem value="parent">Parents</SelectItem>
                  <SelectItem value="child">Children</SelectItem>
                  <SelectItem value="teacher">Teachers</SelectItem>
                  <SelectItem value="qb_admin">QB Admins</SelectItem>
                  <SelectItem value="superadmin">Super Admins</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* User List */}
            {usersLoading ? (
              <p className="text-center text-gray-500 py-8">Loading users...</p>
            ) : users && users.length > 0 ? (
              <div className="space-y-2">
                {users.map((u) => (
                  <Card key={u.id} className="p-4">
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <div className="flex items-center gap-3">
                          <h3 className="font-semibold">{u.name || 'No name'}</h3>
                          <span className="px-2 py-1 text-xs rounded-full bg-blue-100 text-blue-700">
                            {u.role}
                          </span>
                        </div>
                        <div className="flex gap-4 mt-1 text-sm text-gray-600">
                          {u.email && <span>📧 {u.email}</span>}
                          {u.username && <span>👤 @{u.username}</span>}
                          <span>🔑 {u.loginMethod || 'Unknown'}</span>
                        </div>
                        <div className="flex gap-4 mt-1 text-xs text-gray-500">
                          <span>Joined: {new Date(u.createdAt).toLocaleDateString()}</span>
                          <span>Last active: {new Date(u.lastSignedIn).toLocaleDateString()}</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Select
                          value={u.role}
                          onValueChange={(newRole) => {
                            if (confirm(`Change ${u.name}'s role to ${newRole}?`)) {
                              updateRoleMutation.mutate({
                                userId: u.id,
                                newRole: newRole as any,
                              });
                            }
                          }}
                        >
                          <SelectTrigger className="w-36">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="parent">Parent</SelectItem>
                            <SelectItem value="child">Child</SelectItem>
                            <SelectItem value="teacher">Teacher</SelectItem>
                            <SelectItem value="qb_admin">QB Admin</SelectItem>
                            <SelectItem value="superadmin">Super Admin</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            ) : (
              <p className="text-center text-gray-500 py-8">No users found</p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

