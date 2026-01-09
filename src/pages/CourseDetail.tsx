import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { courseApi, certificateApi } from '@/services/api';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { formatDateTime } from '@/lib/utils';

import {
  ArrowLeft,
  BookOpen,
  Clock,
  Users,
  CheckCircle2,
  PlayCircle,
  Loader2,
  FileText,
  Award,
  Target,
  Edit,
  Trash2,
  Plus,
  Upload,
  Settings,
  Mail,
  Calendar,
  Lock,
  LogOut
} from 'lucide-react';
import { toast } from 'sonner';
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

interface Lesson {
  _id: string;
  title: string;
  description: string;
  content: string;
  order: number;
  duration: number;
  estimatedDuration?: number;
  attachments?: Array<{
    url: string;
    filename: string;
    name?: string;
    type: string;
  }>;
}

interface Course {
  _id: string;
  title: string;
  description: string;
  thumbnail?: {
    url: string;
    publicId: string;
  };
  instructor: any;
  category: string;
  level: string;
  tags: string[];
  price: number;
  enrolledStudents: any[];
  status: string;
  estimatedDuration: {
    hours: number;
    minutes: number;
  };
  lessons: Lesson[];
  analytics: {
    totalEnrollments: number;
    averageRating: number;
    totalReviews: number;
    completionRate: number;
  };
  createdAt: string;
  updatedAt: string;
}

export default function CourseDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user, refreshUser } = useAuth();
  const [course, setCourse] = useState<Course | null>(null);
  const [loading, setLoading] = useState(true);
  const [enrolling, setEnrolling] = useState(false);
  const [unenrolling, setUnenrolling] = useState(false);
  const [publishLoading, setPublishLoading] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [generatingCert, setGeneratingCert] = useState(false);

  const [deleteLessonId, setDeleteLessonId] = useState<string | null>(null);
  const [deletingLesson, setDeletingLesson] = useState(false);
  const [unenrollDialogOpen, setUnenrollDialogOpen] = useState(false);

  const [courseProgress, setCourseProgress] = useState(0);

  useEffect(() => {
    const fetchCourse = async () => {
      try {
        const response = await courseApi.getCourseById(id!);

        let courseData: Course;
        if (response.data?.course) {
          courseData = response.data.course;
        } else if (response.course) {
          courseData = response.course;
        } else {
          courseData = response;
        }

        console.log('✅ Course loaded:', courseData);
        setCourse(courseData);

        // Get course progress from user's progress array
        if (user?.progress) {
          const progressData = user.progress.find((p: any) =>
            (p.course === courseData._id || p.course?._id === courseData._id)
          );
          if (progressData) {
            setCourseProgress(progressData.progressPercentage || 0);
          }
        }
      } catch (error) {
        console.error('Failed to load course:', error);
        toast.error('Could not load course details');
        navigate('/courses');
      } finally {
        setLoading(false);
      }
    };

    if (id) {
      fetchCourse();
    }
  }, [id, navigate, user]);

  const isEnrolled = course?.enrolledStudents?.some((student: any) => {
    if (typeof student === 'string') {
      return student === user?.id || student === user?._id;
    }
    const studentId = student.studentId?._id || student.studentId || student._id;
    return studentId === user?.id || studentId === user?._id;
  });

  const isInstructor = user?.role === 'instructor' || user?.role === 'admin';

  const isOwner = !!(
    course && user && (
      course?.instructor?._id === user?.id ||
      course?.instructor?._id === user?._id ||
      course?.instructor === user?.id ||
      course?.instructor === user?._id
    )
  );

  const canManage = isOwner || user?.role === 'admin';

  const getInstructorName = () => {
    if (!course?.instructor) {
      return 'Course Instructor';
    }

    if (typeof course.instructor === 'string') {
      return 'Course Instructor';
    }

    if (course.instructor.profile?.firstName) {
      const lastName = course.instructor.profile.lastName || '';
      return `${course.instructor.profile.firstName} ${lastName}`.trim();
    }

    if (course.instructor.username) {
      return course.instructor.username;
    }

    return 'Unknown Instructor';
  };

  const instructorName = getInstructorName();

  useEffect(() => {
    if (course && user) {
      console.log('🔍 CourseDetail Debug:', {
        courseName: course.title,
        instructor: course.instructor,
        instructorId: typeof course.instructor === 'string' ? course.instructor : course.instructor?._id,
        userId: user?.id,
        userIdAlt: user?._id,
        isOwner,
        canManage,
        instructorName,
        userRole: user?.role,
        enrolledStudents: course.enrolledStudents,
        isEnrolled,
        courseProgress
      });
    }
  }, [course, user, isOwner, canManage, instructorName, isEnrolled, courseProgress]);

  const handleEnroll = async () => {
    if (!user) {
      toast.error('Please login to enroll');
      return;
    }

    setEnrolling(true);
    try {
      await courseApi.enrollInCourse(course!._id);
      toast.success('Successfully enrolled in course!');

      const response = await courseApi.getCourseById(id!);
      const updatedCourse = response.data?.course || response.course || response;
      setCourse(updatedCourse);

      // Refresh user data
      await refreshUser();
    } catch (error: any) {
      console.error('Enrollment failed:', error);
      toast.error(error.message || 'Failed to enroll in course');
    } finally {
      setEnrolling(false);
    }
  };

  const handleUnenroll = async () => {
    setUnenrolling(true);
    try {
      await courseApi.unenrollFromCourse(course!._id);
      toast.success('Successfully unenrolled from course');

      const response = await courseApi.getCourseById(id!);
      const updatedCourse = response.data?.course || response.course || response;
      setCourse(updatedCourse);
      setCourseProgress(0);

      // Refresh user data
      await refreshUser();
    } catch (error: any) {
      console.error('Unenroll failed:', error);
      toast.error(error.message || 'Failed to unenroll from course');
    } finally {
      setUnenrolling(false);
      setUnenrollDialogOpen(false);
    }
  };

  // ✅ UPDATED: Certificate generation handler with page reload
  const handleGenerateCertificate = async () => {
    if (!course) return;

    // ✅ Check progress before generating
    if (courseProgress < 100) {
      toast.error(`Complete all lessons first! Current progress: ${courseProgress}%`);
      return;
    }

    setGeneratingCert(true);
    try {
      const response = await certificateApi.generateCertificate(course._id);

      toast.success('Certificate generated successfully! Check your Profile.');

      // Open certificate in new tab
      const cert = response.data?.certificate || response.certificate;
      if (cert?.pdfUrl) {
        window.open(cert.pdfUrl, '_blank');
      }

      // ✅ Reload page after 2 seconds to show certificate in Profile
      setTimeout(() => {
        window.location.reload();
      }, 2000);

    } catch (error: any) {
      console.error('Certificate generation failed:', error);
      const errorMessage = error.response?.data?.message || error.message || 'Failed to generate certificate';
      toast.error(errorMessage);
    } finally {
      setGeneratingCert(false);
    }
  };

  const handleTogglePublish = async () => {
    if (!course) return;

    setPublishLoading(true);
    try {
      const newStatus = course.status === 'published' ? 'draft' : 'published';

      const token = localStorage.getItem('token');
      const response = await fetch(`http://localhost:5000/api/courses/${course._id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ status: newStatus })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || 'Failed to update course status');
      }

      const result = await response.json();
      console.log('✅ Publish response:', result);

      setCourse({ ...course, status: newStatus });
      toast.success(`Course ${newStatus === 'published' ? 'published' : 'unpublished'} successfully!`);
    } catch (error: any) {
      console.error('Failed to update status:', error);
      toast.error(error.message || 'Failed to update course status');
    } finally {
      setPublishLoading(false);
    }
  };

  const handleDeleteCourse = async () => {
    if (!course) return;

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`http://localhost:5000/api/courses/${course._id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        const errorData = await response.text();
        try {
          const jsonError = JSON.parse(errorData);
          throw new Error(jsonError.message || 'Failed to delete course');
        } catch {
          throw new Error('Failed to delete course');
        }
      }

      const contentType = response.headers.get('content-type');
      const text = await response.text();

      if (text && contentType?.includes('application/json')) {
        try {
          JSON.parse(text);
        } catch (e) {
          console.log('Response was not JSON, but delete succeeded');
        }
      }

      toast.success('Course deleted successfully');
      navigate('/instructor');
    } catch (error: any) {
      console.error('Failed to delete course:', error);
      toast.error(error.message || 'Failed to delete course');
    } finally {
      setDeleteDialogOpen(false);
    }
  };

  const handleDeleteLesson = async () => {
    if (!deleteLessonId) return;

    setDeletingLesson(true);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`http://localhost:5000/api/lessons/${deleteLessonId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        throw new Error('Failed to delete lesson');
      }

      toast.success('Lesson deleted successfully');

      const courseResponse = await courseApi.getCourseById(id!);
      const updatedCourse = courseResponse.data?.course || courseResponse.course || courseResponse;
      setCourse(updatedCourse);
    } catch (error: any) {
      console.error('Failed to delete lesson:', error);
      toast.error(error.message || 'Failed to delete lesson');
    } finally {
      setDeletingLesson(false);
      setDeleteLessonId(null);
    }
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </DashboardLayout>
    );
  }

  if (!course) {
    return (
      <DashboardLayout>
        <div className="text-center py-12">
          <p className="text-muted-foreground">Course not found</p>
          <Button onClick={() => navigate('/courses')} className="mt-4">
            Back to Courses
          </Button>
        </div>
      </DashboardLayout>
    );
  }

  const canAccessContent = isEnrolled || canManage;

  return (
    <DashboardLayout>
      <div className="space-y-6 animate-fade-in">
        <div className="flex items-center justify-between">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate('/courses')}
            className="gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Courses
          </Button>

          {canManage && (
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => navigate(`/courses/${course._id}/edit`)}
                className="gap-2"
              >
                <Edit className="h-4 w-4" />
                Edit
              </Button>

              <Button
                variant="outline"
                size="sm"
                onClick={() => navigate(`/courses/${course._id}/lessons/add`)}
                className="gap-2"
              >
                <Plus className="h-4 w-4" />
                Add Lesson
              </Button>

              <Button
                variant={course.status === 'published' ? 'outline' : 'default'}
                size="sm"
                onClick={handleTogglePublish}
                disabled={publishLoading}
                className="gap-2"
              >
                {publishLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Upload className="h-4 w-4" />
                )}
                {course.status === 'published' ? 'Unpublish' : 'Publish'}
              </Button>

              <Button
                variant="destructive"
                size="sm"
                onClick={() => setDeleteDialogOpen(true)}
                className="gap-2"
              >
                <Trash2 className="h-4 w-4" />
                Delete
              </Button>
            </div>
          )}
        </div>

        {canManage && (
          <Card className="p-4 border-l-4 border-l-primary">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Badge
                  variant={course.status === 'published' ? 'default' : 'secondary'}
                  className="capitalize"
                >
                  {course.status}
                </Badge>
                <span className="text-sm text-muted-foreground">
                  {course.status === 'published'
                    ? '✅ This course is visible to all students'
                    : '⚠️ This course is only visible to you (Draft)'}
                </span>
              </div>
              <div className="flex items-center gap-4 text-sm text-muted-foreground">
                <div className="flex items-center gap-1">
                  <Users className="h-4 w-4" />
                  <span>{course.analytics.totalEnrollments} enrolled</span>
                </div>
                <div className="flex items-center gap-1">
                  <BookOpen className="h-4 w-4" />
                  <span>{course.lessons?.length || 0} lessons</span>
                </div>
              </div>
            </div>
          </Card>
        )}

        <div className="grid lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <div className="relative h-64 md:h-80 bg-gradient-to-br from-primary/10 to-primary/5 rounded-xl overflow-hidden">
              {course.thumbnail?.url ? (
                <img
                  src={course.thumbnail.url}
                  alt={course.title}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <BookOpen className="h-24 w-24 text-primary/40" />
                </div>
              )}

              <div className="absolute top-4 left-4 flex gap-2">
                <Badge className="bg-white/90 text-foreground capitalize">
                  {course.level}
                </Badge>
                <Badge variant="secondary" className="bg-white/90 capitalize">
                  {course.category}
                </Badge>
              </div>
            </div>

            <div>
              <h1 className="text-3xl font-bold mb-3">{course.title}</h1>
              <p className="text-muted-foreground text-lg leading-relaxed">
                {course.description}
              </p>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <Card className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-primary/10 rounded-lg">
                    <BookOpen className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{course.lessons?.length || 0}</p>
                    <p className="text-xs text-muted-foreground">Lessons</p>
                  </div>
                </div>
              </Card>

              <Card className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-blue-500/10 rounded-lg">
                    <Clock className="h-5 w-5 text-blue-500" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">
                      {course.estimatedDuration.hours}h {course.estimatedDuration.minutes}m
                    </p>
                    <p className="text-xs text-muted-foreground">Duration</p>
                  </div>
                </div>
              </Card>

              <Card className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-green-500/10 rounded-lg">
                    <Users className="h-5 w-5 text-green-500" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{course.analytics.totalEnrollments}</p>
                    <p className="text-xs text-muted-foreground">Students</p>
                  </div>
                </div>
              </Card>

              <Card className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-purple-500/10 rounded-lg">
                    <Award className="h-5 w-5 text-purple-500" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold capitalize">{course.level}</p>
                    <p className="text-xs text-muted-foreground">Level</p>
                  </div>
                </div>
              </Card>
            </div>

            <Card className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold flex items-center gap-2">
                  <Target className="h-5 w-5 text-primary" />
                  Course Content
                </h2>

                {canManage && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => navigate(`/courses/${course._id}/lessons/add`)}
                    className="gap-2"
                  >
                    <Plus className="h-4 w-4" />
                    Add Lesson
                  </Button>
                )}
              </div>

              {!canAccessContent && (
                <div className="text-center py-12 border-2 border-dashed rounded-lg bg-muted/30">
                  <Lock className="h-12 w-12 mx-auto mb-3 text-muted-foreground/50" />
                  <p className="text-lg font-semibold mb-2">Course Content Locked</p>
                  <p className="text-muted-foreground mb-4">
                    Please enroll in this course to access the lessons
                  </p>
                  <Button onClick={handleEnroll} disabled={enrolling}>
                    {enrolling ? 'Enrolling...' : 'Enroll Now'}
                  </Button>
                </div>
              )}

              {canAccessContent && (
                <>
                  {course.lessons && course.lessons.length > 0 ? (
                    <div className="space-y-3">
                      {course.lessons.map((lesson, index) => (
                        <div
                          key={lesson._id}
                          className="flex items-center justify-between p-4 border rounded-lg hover:bg-accent/50 transition-colors group"
                        >
                          <div
                            className="flex items-center gap-4 flex-1 cursor-pointer"
                            onClick={() => navigate(`/lesson/${lesson._id}`)}
                          >
                            <div className="flex items-center justify-center w-8 h-8 bg-primary/10 text-primary rounded-full text-sm font-semibold group-hover:bg-primary group-hover:text-white transition-colors">
                              {index + 1}
                            </div>
                            <div>
                              <h3 className="font-semibold">{lesson.title}</h3>
                              <p className="text-sm text-muted-foreground line-clamp-1">
                                {lesson.description}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-4 text-sm text-muted-foreground">
                            {lesson.attachments && lesson.attachments.length > 0 && (
                              <div className="flex items-center gap-1">
                                <FileText className="h-4 w-4" />
                                <span>{lesson.attachments.length}</span>
                              </div>
                            )}
                            <div className="flex items-center gap-1">
                              <Clock className="h-4 w-4" />
                              <span>{lesson.estimatedDuration || lesson.duration || 0}min</span>
                            </div>
                            {canManage && (
                              <>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    navigate(`/courses/${course._id}/lessons/${lesson._id}/edit`);
                                  }}
                                >
                                  <Edit className="h-4 w-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setDeleteLessonId(lesson._id);
                                  }}
                                  className="text-destructive hover:text-destructive hover:bg-destructive/10"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-12 border-2 border-dashed rounded-lg">
                      <BookOpen className="h-12 w-12 mx-auto mb-3 text-muted-foreground/50" />
                      <p className="text-muted-foreground mb-4">No lessons available yet</p>
                      {canManage && (
                        <Button
                          variant="outline"
                          onClick={() => navigate(`/courses/${course._id}/lessons/add`)}
                          className="gap-2"
                        >
                          <Plus className="h-4 w-4" />
                          Add Your First Lesson
                        </Button>
                      )}
                    </div>
                  )}
                </>
              )}
            </Card>

            {canManage && course.enrolledStudents && course.enrolledStudents.length > 0 && (
              <Card className="p-6">
                <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
                  <Users className="h-5 w-5 text-primary" />
                  Enrolled Students ({course.enrolledStudents.length})
                </h2>

                <div className="space-y-3">
                  {course.enrolledStudents.map((student: any, index: number) => {
                    const isPopulated = typeof student !== 'string';
                    const studentName = isPopulated
                      ? (student.profile?.firstName
                        ? `${student.profile.firstName} ${student.profile.lastName || ''}`.trim()
                        : student.username || 'Anonymous Student'
                      )
                      : `Student ${index + 1}`;
                    const studentEmail = isPopulated ? (student.email || 'No email') : '';
                    const enrolledDate = isPopulated && student.createdAt
                      ? formatDateTime(student.createdAt)
                      : '';

                    return (
                      <div
                        key={typeof student === 'string' ? student : student._id}
                        className="flex items-center justify-between p-4 border rounded-lg hover:bg-accent/30 transition-colors"
                      >
                        <div className="flex items-center gap-4">
                          <div className="w-10 h-10 bg-gradient-to-br from-blue-500/20 to-blue-500/10 rounded-full flex items-center justify-center text-sm font-bold text-blue-600">
                            {studentName.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <h3 className="font-semibold">{studentName}</h3>
                            {studentEmail && (
                              <div className="flex items-center gap-1 text-sm text-muted-foreground">
                                <Mail className="h-3 w-3" />
                                <span>{studentEmail}</span>
                              </div>
                            )}
                            {enrolledDate && (
                              <div className="flex items-center gap-1 text-xs text-muted-foreground mt-1">
                                <Calendar className="h-3 w-3" />
                                <span>Enrolled: {enrolledDate}</span>
                              </div>
                            )}
                          </div>
                        </div>
                        <Badge variant="secondary" className="bg-green-50 text-green-700 dark:bg-green-900/20">
                          Active
                        </Badge>
                      </div>
                    );
                  })}
                </div>
              </Card>
            )}

            <Card className="p-6">
              <h2 className="text-xl font-bold mb-4">About the Instructor</h2>
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 bg-gradient-to-br from-primary/20 to-primary/10 rounded-full flex items-center justify-center text-2xl font-bold text-primary">
                  {instructorName.charAt(0).toUpperCase()}
                </div>
                <div>
                  <h3 className="font-semibold text-lg">{instructorName}</h3>
                  <p className="text-sm text-muted-foreground">
                    {typeof course.instructor === 'string' ? '' : course.instructor?.email || ''}
                  </p>
                </div>
              </div>
            </Card>
          </div>

          <div className="lg:col-span-1">
            <Card className="p-6 sticky top-6 space-y-4">
              <div>
                <div className="text-3xl font-bold mb-2">
                  {course.price === 0 ? 'Free' : `$${course.price}`}
                </div>
                <p className="text-sm text-muted-foreground">One-time payment</p>
              </div>

              <Separator />

              {isEnrolled ? (
                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-green-600 bg-green-50 dark:bg-green-900/20 p-3 rounded-lg">
                    <CheckCircle2 className="h-5 w-5" />
                    <span className="font-semibold">You're enrolled!</span>
                  </div>

                  {courseProgress > 0 && (
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Progress</span>
                        <span className="font-semibold">{courseProgress}%</span>
                      </div>
                      <div className="w-full bg-secondary rounded-full h-2">
                        <div
                          className="bg-primary h-2 rounded-full transition-all"
                          style={{ width: `${courseProgress}%` }}
                        />
                      </div>
                    </div>
                  )}

                  <Button
                    className="w-full gap-2"
                    size="lg"
                    onClick={() => {
                      if (course.lessons && course.lessons.length > 0) {
                        navigate(`/lesson/${course.lessons[0]._id}`);
                      } else {
                        toast.info('No lessons available yet');
                      }
                    }}
                  >
                    <PlayCircle className="h-5 w-5" />
                    Continue Learning
                  </Button>

                  {/* ✅ Certificate Button - ONLY shows when progress is 100% */}
                  {courseProgress === 100 && (
                    <Button
                      variant="outline"
                      className="w-full gap-2"
                      onClick={handleGenerateCertificate}
                      disabled={generatingCert}
                    >
                      {generatingCert ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin" />
                          Generating...
                        </>
                      ) : (
                        <>
                          <Award className="h-4 w-4" />
                          Get Certificate
                        </>
                      )}
                    </Button>
                  )}

                  <Button
                    variant="ghost"
                    className="w-full text-destructive hover:text-destructive hover:bg-destructive/10"
                    size="sm"
                    onClick={() => setUnenrollDialogOpen(true)}
                  >
                    <LogOut className="h-4 w-4 mr-2" />
                    Unenroll from Course
                  </Button>
                </div>
              ) : user?.role === 'student' ? (
                <Button
                  className="w-full"
                  size="lg"
                  onClick={handleEnroll}
                  disabled={enrolling || course.status !== 'published'}
                >
                  {enrolling ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      Enrolling...
                    </>
                  ) : course.status !== 'published' ? (
                    'Course Not Available'
                  ) : (
                    'Enroll Now'
                  )}
                </Button>
              ) : canManage ? (
                <Button
                  className="w-full gap-2"
                  size="lg"
                  variant="outline"
                  onClick={() => navigate(`/courses/${course._id}/edit`)}
                >
                  <Settings className="h-4 w-4" />
                  Manage Course
                </Button>
              ) : (
                <div className="text-center text-sm text-muted-foreground p-3 bg-accent/50 rounded-lg">
                  Login as a student to enroll
                </div>
              )}

              <Separator />

              <div className="space-y-3">
                <h3 className="font-semibold">This course includes:</h3>
                <ul className="space-y-2 text-sm">
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-green-500" />
                    <span>{course.lessons?.length || 0} video lessons</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-green-500" />
                    <span>Lifetime access</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-green-500" />
                    <span>Certificate of completion</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-green-500" />
                    <span>Mobile access</span>
                  </li>
                </ul>
              </div>

              {course.tags && course.tags.length > 0 && (
                <>
                  <Separator />
                  <div>
                    <h3 className="font-semibold mb-2 text-sm">Tags</h3>
                    <div className="flex flex-wrap gap-2">
                      {course.tags.map((tag, index) => (
                        <Badge key={index} variant="secondary" className="text-xs">
                          {tag}
                        </Badge>
                      ))}
                    </div>
                  </div>
                </>
              )}
            </Card>
          </div>
        </div>

        <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete Course?</AlertDialogTitle>
              <AlertDialogDescription>
                This action cannot be undone. This will permanently delete the course
                "{course.title}" and remove all associated lessons and student enrollments.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleDeleteCourse}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        <AlertDialog open={!!deleteLessonId} onOpenChange={() => setDeleteLessonId(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete Lesson?</AlertDialogTitle>
              <AlertDialogDescription>
                This action cannot be undone. This will permanently delete this lesson
                and all associated attachments.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={deletingLesson}>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleDeleteLesson}
                disabled={deletingLesson}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                {deletingLesson ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    Deleting...
                  </>
                ) : (
                  'Delete'
                )}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* ✅ NEW: Unenroll Confirmation Dialog */}
        <AlertDialog open={unenrollDialogOpen} onOpenChange={setUnenrollDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Unenroll from Course?</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to unenroll from <strong>"{course.title}"</strong>?
                <br /><br />
                Your progress will be saved and you can re-enroll later.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={unenrolling}>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleUnenroll}
                disabled={unenrolling}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                {unenrolling ? (
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
