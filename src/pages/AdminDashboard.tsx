import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { useAuth } from '@/contexts/AuthContext';
import { userApi } from '@/services/api';
import { useState, useEffect } from 'react';
import { StatCard } from '@/components/cards/StatCard';
import { Button } from '@/components/ui/button';
import {
  Users,
  GraduationCap,
  MoreHorizontal,
  Edit,
  Trash2,
  Loader2
} from 'lucide-react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { toast } from 'sonner';

export default function AdminDashboard() {
  const { user } = useAuth();

  const [loading, setLoading] = useState(true);
  const [users, setUsers] = useState<any[]>([]);
  const [stats, setStats] = useState({
    totalUsers: 0,
    activeStudents: 0,
    activeInstructors: 0,
    activeAdmins: 0,
    userGrowth: 0
  });

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);

        // Fetch users from API
        const res = await userApi.getUsers();

        // Handle common API response shapes safely
        let userList: any[] = [];

        if (Array.isArray(res)) {
          userList = res;
        } else if (Array.isArray(res?.data?.users)) {
          userList = res.data.users;
        } else if (Array.isArray(res?.data)) {
          userList = res.data;
        } else if (Array.isArray(res?.users)) {
          userList = res.users;
        }

        console.log('✅ Fetched users:', userList);

        // Calculate stats
        const students = userList.filter((u: any) => u.role === 'student').length;
        const instructors = userList.filter((u: any) => u.role === 'instructor').length;
        const admins = userList.filter((u: any) => u.role === 'admin').length;

        setUsers(userList);
        setStats({
          totalUsers: userList.length,
          activeStudents: students,
          activeInstructors: instructors,
          activeAdmins: admins,
          userGrowth: 12.5
        });

      } catch (error) {
        console.error('❌ Failed to load users:', error);
        toast.error("Failed to load dashboard data");
        setUsers([]);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);



  const handleDeleteUser = async (targetUser: any) => {
    // Prevent Self-Deletion
    if (targetUser._id === user?.id || targetUser.id === user?.id) {
      toast.error("You cannot delete your own admin account.");
      return;
    }

    // Prevent Deleting Other Admins
    if (targetUser.role === 'admin') {
      toast.error("You cannot delete other administrators.");
      return;
    }

    const userName = targetUser.name || targetUser.username || targetUser.email;
    const userId = targetUser._id || targetUser.id;

    if (!window.confirm(`Are you sure you want to delete ${userName}? This action cannot be undone.`)) return;

    try {
      await userApi.deleteUser(userId);

      // Remove user from local state
      setUsers(prev => prev.filter(u => (u._id || u.id) !== userId));

      // Update stats
      setStats(prev => ({
        ...prev,
        totalUsers: prev.totalUsers - 1,
        activeStudents: targetUser.role === 'student' ? prev.activeStudents - 1 : prev.activeStudents,
        activeInstructors: targetUser.role === 'instructor' ? prev.activeInstructors - 1 : prev.activeInstructors,
      }));

      toast.success(`User "${userName}" deleted successfully.`);
    } catch (error: any) {
      console.error('Delete user failed:', error);
      toast.error(error.message || "Failed to delete user. Please try again.");
    }
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-[60vh]">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-8 animate-fade-in">
        {/* Header */}
        <section className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Admin Dashboard</h1>
            <p className="text-muted-foreground mt-1">Real-time platform overview</p>
          </div>
        </section>

        {/* Stats Grid */}
        <section className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <StatCard
            title="Total Users"
            value={stats.totalUsers.toLocaleString()}
            icon={<Users className="h-5 w-5" />}
            variant="primary"
            trend={stats.userGrowth}
          />
          <StatCard
            title="Active Students"
            value={stats.activeStudents.toLocaleString()}
            icon={<GraduationCap className="h-5 w-5" />}
          />
        </section>

        {/* Analytics Overview */}
        <section className="grid lg:grid-cols-1 gap-6">
          <div className="bg-card rounded-xl border border-border p-6">
            <h2 className="text-lg font-semibold text-foreground mb-4">User Distribution</h2>
            <div className="space-y-4 max-w-2xl">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-3 h-3 rounded-full bg-primary" />
                  <span className="text-sm text-foreground">Students</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-32 md:w-64 h-2 bg-secondary rounded-full overflow-hidden">
                    <div
                      className="h-full bg-primary transition-all duration-1000"
                      style={{ width: `${stats.totalUsers > 0 ? (stats.activeStudents / stats.totalUsers) * 100 : 0}%` }}
                    />
                  </div>
                  <span className="text-sm text-muted-foreground">{stats.activeStudents}</span>
                </div>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-3 h-3 rounded-full bg-accent" />
                  <span className="text-sm text-foreground">Instructors</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-32 md:w-64 h-2 bg-secondary rounded-full overflow-hidden">
                    <div
                      className="h-full bg-accent transition-all duration-1000"
                      style={{ width: `${stats.totalUsers > 0 ? (stats.activeInstructors / stats.totalUsers) * 100 : 0}%` }}
                    />
                  </div>
                  <span className="text-sm text-muted-foreground">{stats.activeInstructors}</span>
                </div>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-3 h-3 rounded-full bg-success" />
                  <span className="text-sm text-foreground">Admins</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-32 md:w-64 h-2 bg-secondary rounded-full overflow-hidden">
                    <div
                      className="h-full bg-success transition-all duration-1000"
                      style={{ width: `${stats.totalUsers > 0 ? (stats.activeAdmins / stats.totalUsers) * 100 : 0}%` }}
                    />
                  </div>
                  <span className="text-sm text-muted-foreground">{stats.activeAdmins}</span>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* User Management Table */}
        <section className="bg-card rounded-xl border border-border overflow-hidden">
          <div className="p-6 border-b border-border">
            <h2 className="text-lg font-semibold text-foreground">User Management</h2>
            <p className="text-sm text-muted-foreground">All registered users from database</p>
          </div>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Joined</TableHead>
                <TableHead className="w-12">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {users.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                    No users found.
                  </TableCell>
                </TableRow>
              ) : (
                Array.isArray(users) && users.map((u) => (
                  <TableRow key={u._id || u.id}>
                    <TableCell className="font-medium">{u.name || u.username || 'Unknown'}</TableCell>
                    <TableCell className="text-muted-foreground">{u.email}</TableCell>
                    <TableCell>
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${u.role === 'instructor'
                        ? 'bg-accent/10 text-accent'
                        : u.role === 'admin'
                          ? 'bg-purple-100 text-purple-600'
                          : 'bg-primary/10 text-primary'
                        }`}>
                        {u.role || 'student'}
                      </span>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {u.createdAt ? new Date(u.createdAt).toLocaleDateString() : 'N/A'}
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">

                          <DropdownMenuItem
                            onClick={() => handleDeleteUser(u)}
                            className="text-destructive"
                          >
                            <Trash2 className="h-4 w-4 mr-2" />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </section>
      </div>
    </DashboardLayout>
  );
}
