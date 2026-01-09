import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  User,
  Mail,
  Shield,
  Save,
  Lock,
  BookOpen,
  Award,
  Clock,
  TrendingUp,
  Camera,
  Loader2,
  Upload,
  X,
  Download,
  LogOut
} from 'lucide-react';
import { toast } from 'sonner';
import { userApi, courseApi, examApi, authApi, certificateApi } from '@/services/api';
import { formatDateTime, formatDate } from '@/lib/utils';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface EnrolledCourse {
  _id: string;
  title: string;
  thumbnail?: { url: string };
  level: string;
  category: string;
  lessons?: any[];
}

interface ExamResult {
  _id: string;
  exam: {
    _id: string;
    title: string;
  };
  score: number;
  isPassed: boolean;
  completedAt: string;
  attemptNumber: number;
}

interface Activity {
  _id: string;
  action: string;
  entityType: string;
  details: any;
  timestamp: string;
}

interface Certificate {
  _id: string;
  course: {
    _id: string;
    title: string;
    category: string;
  } | null;
  certificateId: string;
  issueDate: string;
  pdfUrl: string;
}

export default function Profile() {
  const { user, logout, setUser, refreshUser } = useAuth();
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: user?.email || '',
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });

  const [loading, setLoading] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [removingPhoto, setRemovingPhoto] = useState(false);
  const [showRemovePhotoDialog, setShowRemovePhotoDialog] = useState(false);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [newPhoto, setNewPhoto] = useState<File | null>(null);

  // ✅ NEW: Unenroll state
  const [showUnenrollDialog, setShowUnenrollDialog] = useState(false);
  const [unenrollingCourse, setUnenrollingCourse] = useState<EnrolledCourse | null>(null);
  const [isUnenrolling, setIsUnenrolling] = useState(false);

  const [enrolledCourses, setEnrolledCourses] = useState<EnrolledCourse[]>([]);
  const [examResults, setExamResults] = useState<ExamResult[]>([]);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [certificates, setCertificates] = useState<Certificate[]>([]);
  const [stats, setStats] = useState({
    coursesEnrolled: 0,
    examsTaken: 0,
    averageScore: 0,
    coursesCreated: 0
  });

  useEffect(() => {
    if (user) {
      setFormData(prev => ({
        ...prev,
        firstName: user.profile?.firstName || user.username || '',
        lastName: user.profile?.lastName || '',
        email: user.email || ''
      }));

      if (user.profile?.avatar) {
        setPhotoPreview(user.profile.avatar);
      }

      loadUserData();
    }
  }, [user]);

  const loadUserData = async () => {
    try {
      if (user?.role === 'student') {
        const coursesResponse = await courseApi.getAllCourses({ status: 'published' });
        const allCourses = coursesResponse.data?.courses || coursesResponse.courses || coursesResponse;

        const enrolled = allCourses.filter((course: any) =>
          course.enrolledStudents?.includes(user.id)
        );
        setEnrolledCourses(enrolled);

        try {
          const examsResponse = await examApi.getExams();
          const allExams = examsResponse.data?.exams || examsResponse.exams || examsResponse;

          const userResults: ExamResult[] = [];
          allExams.forEach((exam: any) => {
            exam.results?.forEach((result: any) => {
              if (result.student === user.id || result.student?._id === user.id) {
                userResults.push({
                  _id: result._id || `${exam._id}-${Date.now()}`,
                  exam: {
                    _id: exam._id,
                    title: exam.title
                  },
                  score: result.score,
                  isPassed: result.isPassed,
                  completedAt: result.completedAt,
                  attemptNumber: result.attemptNumber || 1
                });
              }
            });
          });
          setExamResults(userResults);

          const avgScore = userResults.length > 0
            ? userResults.reduce((sum, r) => sum + r.score, 0) / userResults.length
            : 0;

          setStats({
            coursesEnrolled: enrolled.length,
            examsTaken: userResults.length,
            averageScore: Math.round(avgScore),
            coursesCreated: 0
          });
        } catch (error) {
          console.error('Failed to load exam results:', error);
        }

        // Fetch certificates
        try {
          const certResponse = await certificateApi.getMyCertificates();
          const certs = certResponse.data?.certificates || certResponse.certificates || [];
          setCertificates(certs);
          console.log('✅ Loaded certificates:', certs);
        } catch (error) {
          console.error('Failed to load certificates:', error);
        }
      }

      if (user?.role === 'instructor' || user?.role === 'admin') {
        const coursesResponse = await courseApi.getAllCourses();
        const allCourses = coursesResponse.data?.courses || coursesResponse.courses || coursesResponse;

        const created = allCourses.filter((course: any) =>
          course.instructor?._id === user.id || course.instructor === user.id
        );

        setStats(prev => ({
          ...prev,
          coursesCreated: created.length
        }));
      }

      try {
        const activityResponse = await userApi.getActivity();
        const activityData = activityResponse.data?.activities || activityResponse.activities || [];
        setActivities(activityData);
      } catch (error) {
        console.error('Failed to load activities:', error);
      }
    } catch (error) {
      console.error('Failed to load user data:', error);
    }
  };

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];

      if (!file.type.startsWith('image/')) {
        toast.error('Please select a valid image file');
        return;
      }

      if (file.size > 5 * 1024 * 1024) {
        toast.error('Image size should be less than 5MB');
        return;
      }

      setNewPhoto(file);

      const reader = new FileReader();
      reader.onloadend = () => {
        setPhotoPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleUploadPhoto = async () => {
    if (!newPhoto) {
      toast.error('Please select a photo first');
      return;
    }

    setUploadingPhoto(true);
    try {
      await userApi.uploadAvatar(newPhoto);
      await refreshUser();

      toast.success('Profile photo updated successfully');
      setNewPhoto(null);
    } catch (error: any) {
      console.error('Photo upload failed:', error);
      toast.error(error.message || 'Failed to upload photo');
    } finally {
      setUploadingPhoto(false);
    }
  };

  const handleRemovePhoto = async () => {
    setRemovingPhoto(true);
    try {
      await userApi.removeAvatar();
      await refreshUser();

      setPhotoPreview(null);
      setNewPhoto(null);
      toast.success('Profile photo removed successfully');
    } catch (error: any) {
      console.error('Photo removal failed:', error);
      toast.error(error.message || 'Failed to remove photo');
    } finally {
      setRemovingPhoto(false);
      setShowRemovePhotoDialog(false);
    }
  };

  const handleSaveProfile = async () => {
    setLoading(true);
    try {
      await userApi.updateProfile({
        profile: {
          firstName: formData.firstName,
          lastName: formData.lastName
        }
      });

      await refreshUser();

      toast.success('Profile updated successfully!');

    } catch (error: any) {
      console.error('❌ Profile update failed:', error);
      const errorMessage = error.message || 'Failed to update profile';
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleChangePassword = async () => {
    if (!formData.currentPassword || !formData.newPassword || !formData.confirmPassword) {
      toast.error('Please fill all password fields');
      return;
    }

    if (formData.newPassword !== formData.confirmPassword) {
      toast.error('New passwords do not match');
      return;
    }

    if (formData.newPassword.length < 6) {
      toast.error('Password must be at least 6 characters');
      return;
    }

    if (formData.currentPassword === formData.newPassword) {
      toast.error('New password must be different from current password');
      return;
    }

    setLoading(true);
    try {
      await authApi.changePassword({
        currentPassword: formData.currentPassword,
        newPassword: formData.newPassword,
        confirmPassword: formData.confirmPassword
      });

      toast.success('Password changed successfully! Please login again.');

      setFormData(prev => ({
        ...prev,
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
      }));

      setTimeout(() => {
        logout();
        navigate('/auth');
      }, 2000);
    } catch (error: any) {
      console.error('Password change failed:', error);
      const errorMessage = error.message || 'Failed to change password';
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  // ✅ NEW: Unenroll from course handler
  const handleUnenroll = async () => {
    if (!unenrollingCourse) return;

    setIsUnenrolling(true);
    try {
      await courseApi.unenrollFromCourse(unenrollingCourse._id);

      // Remove from local state
      setEnrolledCourses(prev => prev.filter(c => c._id !== unenrollingCourse._id));
      setStats(prev => ({
        ...prev,
        coursesEnrolled: prev.coursesEnrolled - 1
      }));

      toast.success(`Successfully unenrolled from "${unenrollingCourse.title}"`);
    } catch (error: any) {
      console.error('Unenroll failed:', error);
      toast.error(error.message || 'Failed to unenroll from course');
    } finally {
      setIsUnenrolling(false);
      setShowUnenrollDialog(false);
      setUnenrollingCourse(null);
    }
  };

  const displayName = formData.firstName || user?.username || 'User';
  const userInitial = displayName.charAt(0).toUpperCase();

  return (
    <DashboardLayout>
      <div className="max-w-6xl mx-auto space-y-6 animate-fade-in">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-foreground">My Profile</h1>
          <p className="text-muted-foreground mt-1">Manage your account and view your progress</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {/* ✅ Show Courses stat for students and instructors only, NOT admins */}
          {user?.role !== 'admin' && (
            <Card className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-blue-500/10 rounded-lg">
                  <BookOpen className="h-6 w-6 text-blue-500" />
                </div>
                <div>
                  <p className="text-2xl font-bold">
                    {user?.role === 'student' ? stats.coursesEnrolled : stats.coursesCreated}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {user?.role === 'student' ? 'Courses Enrolled' : 'Courses Created'}
                  </p>
                </div>
              </div>
            </Card>
          )}

          {user?.role === 'student' && (
            <>
              <Card className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-3 bg-purple-500/10 rounded-lg">
                    <Award className="h-6 w-6 text-purple-500" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{stats.examsTaken}</p>
                    <p className="text-xs text-muted-foreground">Exams Taken</p>
                  </div>
                </div>
              </Card>

              <Card className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-3 bg-green-500/10 rounded-lg">
                    <TrendingUp className="h-6 w-6 text-green-500" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{stats.averageScore}%</p>
                    <p className="text-xs text-muted-foreground">Average Score</p>
                  </div>
                </div>
              </Card>

              {/* ✅ Only show Certificates stat for students */}
              {user?.role === 'student' && (
                <Card className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="p-3 bg-orange-500/10 rounded-lg">
                      <Clock className="h-6 w-6 text-orange-500" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold">{certificates.length}</p>
                      <p className="text-xs text-muted-foreground">Certificates</p>
                    </div>
                  </div>
                </Card>
              )}
            </>
          )}
        </div>

        <div className="grid lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <Tabs defaultValue="profile" className="space-y-6">
              {/* ✅ Show 4 tabs for students, 3 tabs for instructors/admins */}
              <TabsList className={`grid w-full ${user?.role === 'student' ? 'grid-cols-4' : 'grid-cols-3'}`}>
                <TabsTrigger value="profile">Profile</TabsTrigger>
                <TabsTrigger value="security">Security</TabsTrigger>
                {user?.role === 'student' && (
                  <TabsTrigger value="certificates">Certificates</TabsTrigger>
                )}
                <TabsTrigger value="activity">Activity</TabsTrigger>
              </TabsList>

              <TabsContent value="profile">
                <Card className="p-6">
                  <h2 className="text-xl font-semibold mb-6">Personal Information</h2>

                  <div className="space-y-5">
                    <div className="grid md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="firstName">First Name</Label>
                        <div className="relative">
                          <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                          <Input
                            id="firstName"
                            value={formData.firstName}
                            onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                            className="pl-10"
                            placeholder="Enter first name"
                          />
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="lastName">Last Name</Label>
                        <div className="relative">
                          <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                          <Input
                            id="lastName"
                            value={formData.lastName}
                            onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                            className="pl-10"
                            placeholder="Enter last name"
                          />
                        </div>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="email">Email Address</Label>
                      <div className="relative">
                        <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                          id="email"
                          type="email"
                          value={formData.email}
                          readOnly
                          className="pl-10 bg-secondary/50 cursor-not-allowed"
                        />
                      </div>
                      <p className="text-xs text-muted-foreground">Email cannot be changed</p>
                    </div>

                    <div className="space-y-2">
                      <Label>Role</Label>
                      <div className="relative">
                        <Shield className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                          value={user?.role || ''}
                          readOnly
                          className="pl-10 bg-secondary/50 cursor-not-allowed capitalize"
                        />
                      </div>
                    </div>

                    <Button
                      onClick={handleSaveProfile}
                      disabled={loading}
                      className="w-full gap-2"
                    >
                      {loading ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin" />
                          Saving...
                        </>
                      ) : (
                        <>
                          <Save className="h-4 w-4" />
                          Save Changes
                        </>
                      )}
                    </Button>
                  </div>
                </Card>
              </TabsContent>

              <TabsContent value="security">
                <Card className="p-6">
                  <h2 className="text-xl font-semibold mb-6">Change Password</h2>

                  <div className="space-y-5">
                    <div className="space-y-2">
                      <Label htmlFor="currentPassword">Current Password</Label>
                      <div className="relative">
                        <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                          id="currentPassword"
                          type="password"
                          value={formData.currentPassword}
                          onChange={(e) => setFormData({ ...formData, currentPassword: e.target.value })}
                          className="pl-10"
                          placeholder="Enter current password"
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="newPassword">New Password</Label>
                      <div className="relative">
                        <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                          id="newPassword"
                          type="password"
                          value={formData.newPassword}
                          onChange={(e) => setFormData({ ...formData, newPassword: e.target.value })}
                          className="pl-10"
                          placeholder="Enter new password"
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="confirmPassword">Confirm New Password</Label>
                      <div className="relative">
                        <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                          id="confirmPassword"
                          type="password"
                          value={formData.confirmPassword}
                          onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                          className="pl-10"
                          placeholder="Confirm new password"
                        />
                      </div>
                    </div>

                    <Button
                      onClick={handleChangePassword}
                      disabled={loading}
                      className="w-full gap-2"
                      variant="destructive"
                    >
                      {loading ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin" />
                          Changing...
                        </>
                      ) : (
                        <>
                          <Lock className="h-4 w-4" />
                          Change Password
                        </>
                      )}
                    </Button>
                  </div>
                </Card>
              </TabsContent>

              {/* ✅ CERTIFICATES TAB - Only for students */}
              {user?.role === 'student' && (
                <TabsContent value="certificates">
                  <Card className="p-6">
                    <h2 className="text-xl font-semibold mb-6">My Certificates</h2>

                    {certificates.length === 0 ? (
                      <div className="text-center py-12">
                        <Award className="h-16 w-16 mx-auto mb-4 text-muted-foreground/50" />
                        <p className="text-muted-foreground font-medium mb-2">
                          No certificates yet
                        </p>
                        <p className="text-sm text-muted-foreground">
                          Complete courses to earn certificates!
                        </p>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        {certificates.map((cert) => (
                          <Card key={cert._id}>
                            <CardContent className="p-6 flex flex-col md:flex-row md:justify-between md:items-center gap-4">
                              <div className="flex items-start gap-4">
                                <div className="p-3 bg-primary/10 rounded-lg shrink-0">
                                  <Award className="h-6 w-6 text-primary" />
                                </div>
                                <div>
                                  <h4 className="font-semibold text-lg">
                                    {cert.course?.title || 'Course Certificate'}
                                  </h4>
                                  <p className="text-sm text-muted-foreground mt-1">
                                    Issued: {new Date(cert.issueDate).toLocaleDateString('en-US', {
                                      year: 'numeric',
                                      month: 'long',
                                      day: 'numeric'
                                    })}
                                  </p>
                                  <div className="flex items-center gap-2 mt-2">
                                    {cert.course?.category && (
                                      <Badge variant="secondary">{cert.course.category}</Badge>
                                    )}
                                    <p className="text-xs text-muted-foreground">
                                      ID: {cert.certificateId}
                                    </p>
                                  </div>
                                </div>
                              </div>
                              <Button
                                variant="default"
                                className="gap-2 shrink-0"
                                onClick={() => {
                                  if (cert.pdfUrl) {
                                    window.open(cert.pdfUrl, '_blank');
                                  } else {
                                    toast.error('Certificate PDF not available');
                                  }
                                }}
                              >
                                <Download className="h-4 w-4" />
                                Download PDF
                              </Button>
                            </CardContent>
                          </Card>
                        ))}
                      </div>
                    )}
                  </Card>
                </TabsContent>
              )}

              <TabsContent value="activity">
                <Card className="p-6">
                  <h2 className="text-xl font-semibold mb-6">Recent Activity</h2>

                  {activities.length > 0 ? (
                    <div className="space-y-3">
                      {activities.map((activity) => (
                        <div
                          key={activity._id}
                          className="flex items-start gap-3 p-4 border rounded-lg"
                        >
                          <div className="p-2 bg-primary/10 rounded-lg">
                            <Clock className="h-4 w-4 text-primary" />
                          </div>
                          <div className="flex-1">
                            <p className="font-medium capitalize">
                              {activity.action.replace('_', ' ')}
                            </p>
                            <p className="text-sm text-muted-foreground">
                              {formatDateTime(activity.timestamp)}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8 text-muted-foreground">
                      <Clock className="h-12 w-12 mx-auto mb-3 opacity-50" />
                      <p>No recent activity</p>
                    </div>
                  )}

                  {user?.role === 'student' && enrolledCourses.length > 0 && (
                    <div className="mt-8">
                      <h3 className="text-lg font-semibold mb-4">My Courses</h3>
                      <div className="space-y-3">
                        {enrolledCourses.map((course) => (
                          <div
                            key={course._id}
                            className="flex items-center gap-4 p-4 border rounded-lg hover:bg-accent/50 transition-colors"
                          >
                            <div
                              className="w-16 h-16 bg-primary/10 rounded-lg flex items-center justify-center shrink-0 cursor-pointer"
                              onClick={() => navigate(`/courses/${course._id}`)}
                            >
                              {course.thumbnail?.url ? (
                                <img
                                  src={course.thumbnail.url}
                                  alt={course.title}
                                  className="w-full h-full object-cover rounded-lg"
                                />
                              ) : (
                                <BookOpen className="h-8 w-8 text-primary" />
                              )}
                            </div>
                            <div
                              className="flex-1 min-w-0 cursor-pointer"
                              onClick={() => navigate(`/courses/${course._id}`)}
                            >
                              <h3 className="font-semibold truncate">{course.title}</h3>
                              <div className="flex items-center gap-2 mt-1">
                                <Badge variant="secondary" className="text-xs capitalize">
                                  {course.level}
                                </Badge>
                                <span className="text-xs text-muted-foreground">
                                  {course.lessons?.length || 0} lessons
                                </span>
                              </div>
                            </div>
                            {/* ✅ NEW: Unenroll Button */}
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-destructive hover:text-destructive hover:bg-destructive/10 shrink-0"
                              onClick={(e) => {
                                e.stopPropagation();
                                setUnenrollingCourse(course);
                                setShowUnenrollDialog(true);
                              }}
                            >
                              <LogOut className="h-4 w-4 mr-1" />
                              Unenroll
                            </Button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </Card>

                {user?.role === 'student' && examResults.length > 0 && (
                  <Card className="p-6 mt-6">
                    <h2 className="text-xl font-semibold mb-6">Recent Exam Results</h2>
                    <div className="space-y-3">
                      {examResults.slice(0, 5).map((result) => (
                        <div
                          key={result._id}
                          className="flex items-center justify-between p-4 border rounded-lg"
                        >
                          <div className="flex items-center gap-3">
                            <div className={`p-2 rounded-lg ${result.isPassed ? 'bg-green-500/10' : 'bg-red-500/10'
                              }`}>
                              <Award className={`h-5 w-5 ${result.isPassed ? 'text-green-500' : 'text-red-500'
                                }`} />
                            </div>
                            <div>
                              <p className="font-medium">{result.exam.title}</p>
                              <p className="text-xs text-muted-foreground">
                                {formatDate(result.completedAt)}
                              </p>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="text-lg font-bold">{result.score}%</p>
                            <Badge variant={result.isPassed ? 'default' : 'destructive'} className="text-xs">
                              {result.isPassed ? 'PASS' : 'FAIL'}
                            </Badge>
                          </div>
                        </div>
                      ))}
                    </div>
                  </Card>
                )}
              </TabsContent>
            </Tabs>
          </div>

          <div className="lg:col-span-1">
            <Card className="p-6 sticky top-6">
              <div className="text-center space-y-4">
                <div className="relative inline-block">
                  {photoPreview ? (
                    <img
                      src={photoPreview}
                      alt="Profile"
                      className="w-24 h-24 rounded-full object-cover shadow-lg mx-auto border-4 border-background"
                    />
                  ) : (
                    <div className="w-24 h-24 rounded-full bg-gradient-to-br from-primary to-primary/60 flex items-center justify-center text-primary-foreground text-3xl font-bold shadow-lg mx-auto">
                      {userInitial}
                    </div>
                  )}

                  <label
                    htmlFor="avatar-upload"
                    className="absolute bottom-0 right-0 p-2 bg-primary text-primary-foreground rounded-full shadow-lg hover:bg-primary/90 transition-colors cursor-pointer"
                  >
                    <Camera className="h-4 w-4" />
                  </label>
                  <input
                    id="avatar-upload"
                    type="file"
                    accept="image/*"
                    onChange={handlePhotoChange}
                    className="hidden"
                  />
                </div>

                {newPhoto && (
                  <div className="flex gap-2 justify-center">
                    <Button
                      size="sm"
                      onClick={handleUploadPhoto}
                      disabled={uploadingPhoto}
                      className="gap-2"
                    >
                      {uploadingPhoto ? (
                        <>
                          <Loader2 className="h-3 w-3 animate-spin" />
                          Uploading...
                        </>
                      ) : (
                        <>
                          <Upload className="h-3 w-3" />
                          Upload
                        </>
                      )}
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setNewPhoto(null);
                        setPhotoPreview(user?.profile?.avatar || null);
                      }}
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </div>
                )}

                {photoPreview && !newPhoto && (
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => setShowRemovePhotoDialog(true)}
                    className="text-destructive hover:text-destructive hover:bg-destructive/10"
                  >
                    Remove Photo
                  </Button>
                )}

                <div>
                  <h3 className="text-xl font-bold">
                    {displayName} {formData.lastName}
                  </h3>
                  <p className="text-sm text-muted-foreground">{formData.email}</p>
                </div>

                <Badge className="capitalize">
                  {user?.role || 'Student'}
                </Badge>

                <Separator />

                <div className="text-left space-y-3">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Member Since</span>
                    <span className="font-medium">
                      {user?.createdAt ? formatDate(user.createdAt) : 'Recently'}
                    </span>
                  </div>

                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Status</span>
                    <Badge variant="outline" className="text-xs">Active</Badge>
                  </div>
                </div>

                <Separator />

                <Button
                  variant="outline"
                  className="w-full"
                  onClick={() => {
                    logout();
                  }}
                >
                  Logout
                </Button>
              </div>
            </Card>
          </div>
        </div>

        <AlertDialog open={showRemovePhotoDialog} onOpenChange={setShowRemovePhotoDialog}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Remove Profile Photo?</AlertDialogTitle>
              <AlertDialogDescription>
                This will remove your current profile photo. You can always upload a new one later.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={removingPhoto}>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleRemovePhoto}
                disabled={removingPhoto}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                {removingPhoto ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    Removing...
                  </>
                ) : (
                  'Remove'
                )}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* ✅ NEW: Unenroll Confirmation Dialog */}
        <AlertDialog open={showUnenrollDialog} onOpenChange={setShowUnenrollDialog}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Unenroll from Course?</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to unenroll from <strong>"{unenrollingCourse?.title}"</strong>?
                <br /><br />
                Your progress will be saved and you can re-enroll later.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={isUnenrolling}>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleUnenroll}
                disabled={isUnenrolling}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                {isUnenrolling ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    Unenrolling...
                  </>
                ) : (
                  <>
                    <LogOut className="h-4 w-4 mr-2" />
                    Unenroll
                  </>
                )}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </DashboardLayout>
  );
}
