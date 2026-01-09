import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { lessonApi, courseApi } from '@/services/api';
import courseService from '@/services/courseService'; // ✅ NEW
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
  ArrowLeft,
  BookOpen,
  Clock,
  Download,
  FileText,
  CheckCircle2,
  Loader2,
  ChevronLeft,
  ChevronRight,
  Video,
  FileIcon
} from 'lucide-react';
import { toast } from 'sonner';


interface Attachment {
  _id?: string;
  name: string;
  url: string;
  publicId?: string;
  fileType: string;
  size?: number;
}


interface Lesson {
  _id: string;
  title: string;
  description: string;
  course: {
    _id: string;
    title: string;
  } | string;
  contentType: 'video' | 'text' | 'pdf' | 'quiz' | 'assignment' | 'mixed';
  videoUrl?: string;
  videoDuration?: number;
  content?: string;
  attachments: Attachment[];
  order: number;
  estimatedDuration: number;
  isFree: boolean;
  isPublished: boolean;
  createdAt: string;
  updatedAt: string;
}


interface CourseLesson {
  _id: string;
  title: string;
  estimatedDuration: number;
}


interface Course {
  _id: string;
  title: string;
  lessons: CourseLesson[];
}


export default function LessonDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [lesson, setLesson] = useState<Lesson | null>(null);
  const [course, setCourse] = useState<Course | null>(null);
  const [loading, setLoading] = useState(true);
  const [completed, setCompleted] = useState(false);
  const [markingComplete, setMarkingComplete] = useState(false); // ✅ NEW
  const [downloadingFiles, setDownloadingFiles] = useState<Set<string>>(new Set());


  useEffect(() => {
    const fetchLesson = async () => {
      try {
        // Fetch lesson details
        const lessonResponse = await lessonApi.getLessonById(id!);

        let lessonData: Lesson;
        if (lessonResponse.data?.lesson) {
          lessonData = lessonResponse.data.lesson;
        } else if (lessonResponse.lesson) {
          lessonData = lessonResponse.lesson;
        } else {
          lessonData = lessonResponse;
        }


        console.log('✅ Lesson loaded:', lessonData);


        // Fetch course to get all lessons for navigation
        const courseId = typeof lessonData.course === 'string'
          ? lessonData.course
          : lessonData.course._id;


        if (courseId) {
          const courseResponse = await courseApi.getCourseById(courseId);
          const courseData = courseResponse.data?.course || courseResponse.course || courseResponse;
          setCourse(courseData);
          console.log('✅ Course loaded:', courseData);

          // ✅ ENROLLMENT CHECK: Verify user can access this lesson
          const isInstructorOrAdmin = user?.role === 'instructor' || user?.role === 'admin';
          const isOwner = courseData.instructor?._id === user?.id ||
            courseData.instructor?._id === user?._id ||
            courseData.instructor === user?.id ||
            courseData.instructor === user?._id;

          const isEnrolled = courseData.enrolledStudents?.some((student: any) => {
            if (typeof student === 'string') {
              return student === user?.id || student === user?._id;
            }
            const studentId = student.studentId?._id || student.studentId || student._id;
            return studentId === user?.id || studentId === user?._id;
          });

          const canAccess = isEnrolled || isOwner || isInstructorOrAdmin;

          if (!canAccess) {
            toast.error('Please enroll in this course to access lessons');
            navigate(`/courses/${courseId}`);
            return;
          }
        }

        setLesson(lessonData);
      } catch (error) {
        console.error('Failed to load lesson:', error);
        toast.error('Could not load lesson');
      } finally {
        setLoading(false);
      }
    };


    if (id) {
      fetchLesson();
    }
  }, [id, user, navigate]);


  // ✅ IMPROVED: Proper file download with fetch and blob
  const handleDownload = async (attachment: Attachment) => {
    const fileId = attachment._id || attachment.name;

    if (downloadingFiles.has(fileId)) {
      return; // Already downloading
    }


    try {
      setDownloadingFiles(prev => new Set(prev).add(fileId));
      toast.info(`Downloading ${attachment.name}...`);


      // Fetch the file from Cloudinary
      const response = await fetch(attachment.url);

      if (!response.ok) {
        throw new Error('Download failed');
      }


      // Get the blob
      const blob = await response.blob();

      // Create a download link
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = attachment.name;
      document.body.appendChild(a);
      a.click();

      // Cleanup
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      toast.success(`Downloaded ${attachment.name} successfully! 🎉`);
    } catch (error) {
      console.error('Download error:', error);
      toast.error(`Failed to download ${attachment.name}`);
    } finally {
      setDownloadingFiles(prev => {
        const newSet = new Set(prev);
        newSet.delete(fileId);
        return newSet;
      });
    }
  };


  // ✅ UPDATED: Mark lesson as complete
  const handleMarkComplete = async () => {
    if (!lesson) return;

    setMarkingComplete(true);

    try {
      if (!completed) {
        // Mark as complete
        await courseService.markLessonComplete(lesson._id);
        setCompleted(true);
        toast.success('Lesson completed! 🎉');

        // Reload after 1 second to refresh progress
        setTimeout(() => {
          window.location.reload();
        }, 1000);
      } else {
        // Just toggle UI (no uncomplete endpoint yet)
        setCompleted(false);
        toast.info('Marked as incomplete');
      }
    } catch (error: any) {
      console.error('Failed to mark complete:', error);
      toast.error(error.message || 'Failed to mark lesson complete');
    } finally {
      setMarkingComplete(false);
    }
  };


  // Find current lesson index and get prev/next
  const currentLessonIndex = course?.lessons?.findIndex(l => l._id === lesson?._id) ?? -1;
  const prevLesson = currentLessonIndex > 0 ? course?.lessons[currentLessonIndex - 1] : null;
  const nextLesson = currentLessonIndex < (course?.lessons?.length ?? 0) - 1
    ? course?.lessons[currentLessonIndex + 1]
    : null;


  const navigateToLesson = (lessonId: string) => {
    navigate(`/lesson/${lessonId}`);
  };


  const formatFileSize = (bytes?: number) => {
    if (!bytes) return 'Unknown size';
    const mb = bytes / (1024 * 1024);
    return mb > 1 ? `${mb.toFixed(2)} MB` : `${(bytes / 1024).toFixed(2)} KB`;
  };


  // ✅ Get file icon based on type
  const getFileIcon = (fileType: string) => {
    if (fileType.startsWith('video/')) {
      return <Video className="h-5 w-5 text-blue-500" />;
    }
    if (fileType.includes('pdf')) {
      return <FileText className="h-5 w-5 text-red-500" />;
    }
    return <FileIcon className="h-5 w-5 text-orange-500" />;
  };


  // Get course ID for back navigation
  const courseId = lesson?.course
    ? (typeof lesson.course === 'string' ? lesson.course : lesson.course._id)
    : null;


  // Get course title
  const courseTitle = lesson?.course
    ? (typeof lesson.course === 'string' ? 'Course' : lesson.course.title)
    : 'Course';


  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </DashboardLayout>
    );
  }


  if (!lesson) {
    return (
      <DashboardLayout>
        <div className="text-center py-12">
          <BookOpen className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
          <p className="text-muted-foreground mb-4">Lesson not found</p>
          <Button onClick={() => navigate('/courses')}>
            Back to Courses
          </Button>
        </div>
      </DashboardLayout>
    );
  }


  return (
    <DashboardLayout>
      <div className="space-y-6 animate-fade-in">
        {/* Header with Navigation */}
        <div className="flex items-center justify-between">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => courseId ? navigate(`/courses/${courseId}`) : navigate('/courses')}
            className="gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Course
          </Button>


          {user?.role === 'student' && (
            <Button
              variant={completed ? 'outline' : 'default'}
              size="sm"
              onClick={handleMarkComplete}
              disabled={markingComplete}
              className="gap-2"
            >
              {markingComplete ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <CheckCircle2 className={`h-4 w-4 ${completed ? 'text-green-500' : ''}`} />
                  {completed ? 'Completed' : 'Mark as Complete'}
                </>
              )}
            </Button>
          )}
        </div>


        {/* Lesson Header */}
        <div className="space-y-3">
          <div className="flex items-center gap-3 flex-wrap">
            <Badge variant="secondary" className="capitalize">
              {lesson.contentType}
            </Badge>
            <div className="flex items-center gap-1 text-sm text-muted-foreground">
              <Clock className="h-4 w-4" />
              <span>{lesson.estimatedDuration || 0} min</span>
            </div>
            {lesson.isFree && (
              <Badge variant="outline" className="text-green-600 border-green-600">
                Free Preview
              </Badge>
            )}
          </div>


          <h1 className="text-3xl font-bold">{lesson.title}</h1>

          {lesson.description && (
            <p className="text-lg text-muted-foreground">{lesson.description}</p>
          )}


          <div className="text-sm text-muted-foreground">
            Part of: <span className="font-medium text-foreground">{courseTitle}</span>
          </div>
        </div>


        <Separator />


        {/* Main Content Area */}
        <div className="grid lg:grid-cols-3 gap-6">
          {/* Left Column - Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Video Content - Check attachments for videos */}
            {lesson.attachments && lesson.attachments.some(a => a.fileType.startsWith('video/')) && (
              <Card className="overflow-hidden">
                <div className="aspect-video bg-black flex items-center justify-center">
                  {(() => {
                    const videoAttachment = lesson.attachments.find(a => a.fileType.startsWith('video/'));
                    if (!videoAttachment) return null;

                    return (
                      <video
                        src={videoAttachment.url}
                        controls
                        className="w-full h-full"
                        controlsList="nodownload"
                      >
                        Your browser does not support video playback.
                      </video>
                    );
                  })()}
                </div>
              </Card>
            )}


            {/* Text Content */}
            {lesson.content && (
              <Card className="p-6">
                <div className="prose prose-slate dark:prose-invert max-w-none">
                  <pre className="whitespace-pre-wrap font-sans text-sm leading-relaxed">
                    {lesson.content}
                  </pre>
                </div>
              </Card>
            )}


            {/* No Content Placeholder */}
            {!lesson.content && !lesson.attachments?.some(a => a.fileType.startsWith('video/')) && (
              <Card className="p-12 text-center">
                <BookOpen className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">No content available for this lesson yet.</p>
              </Card>
            )}


            {/* Attachments Section */}
            {lesson.attachments && lesson.attachments.length > 0 && (
              <Card className="p-6">
                <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
                  <FileText className="h-5 w-5 text-primary" />
                  Attachments & Resources
                </h2>
                <div className="space-y-3">
                  {lesson.attachments.map((attachment, index) => {
                    const fileId = attachment._id || attachment.name;
                    const isDownloading = downloadingFiles.has(fileId);

                    return (
                      <div
                        key={index}
                        className="flex items-center justify-between p-4 border rounded-lg hover:bg-accent/50 transition-colors"
                      >
                        <div className="flex items-center gap-3">
                          <div className="p-2 bg-primary/10 rounded-lg">
                            {getFileIcon(attachment.fileType)}
                          </div>
                          <div>
                            <p className="font-medium">{attachment.name}</p>
                            <p className="text-sm text-muted-foreground">
                              {attachment.fileType?.split('/')[1]?.toUpperCase() || 'FILE'} • {formatFileSize(attachment.size)}
                            </p>
                          </div>
                        </div>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleDownload(attachment)}
                          disabled={isDownloading}
                          className="gap-2"
                        >
                          {isDownloading ? (
                            <>
                              <Loader2 className="h-4 w-4 animate-spin" />
                              Downloading...
                            </>
                          ) : (
                            <>
                              <Download className="h-4 w-4" />
                              Download
                            </>
                          )}
                        </Button>
                      </div>
                    );
                  })}
                </div>
              </Card>
            )}
          </div>


          {/* Right Column - Lesson List */}
          <div className="lg:col-span-1">
            <Card className="p-6 sticky top-6">
              <h3 className="font-bold mb-4">Course Lessons</h3>

              {course?.lessons && course.lessons.length > 0 ? (
                <div className="space-y-2 max-h-[600px] overflow-y-auto">
                  {course.lessons.map((courseLesson, index) => (
                    <button
                      key={courseLesson._id}
                      onClick={() => navigateToLesson(courseLesson._id)}
                      className={`w-full text-left p-3 rounded-lg border transition-all ${courseLesson._id === lesson._id
                        ? 'bg-primary text-primary-foreground border-primary'
                        : 'hover:bg-accent border-transparent'
                        }`}
                    >
                      <div className="flex items-start gap-3">
                        <div className={`flex items-center justify-center w-6 h-6 rounded-full text-xs font-semibold ${courseLesson._id === lesson._id
                          ? 'bg-primary-foreground/20 text-primary-foreground'
                          : 'bg-primary/10 text-primary'
                          }`}>
                          {index + 1}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className={`font-medium text-sm truncate ${courseLesson._id === lesson._id ? 'text-primary-foreground' : ''
                            }`}>
                            {courseLesson.title}
                          </p>
                          <p className={`text-xs ${courseLesson._id === lesson._id
                            ? 'text-primary-foreground/70'
                            : 'text-muted-foreground'
                            }`}>
                            {courseLesson.estimatedDuration || 0} min
                          </p>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground text-center py-4">
                  No lessons available
                </p>
              )}
            </Card>
          </div>
        </div>


        {/* Bottom Navigation */}
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <Button
              variant="outline"
              onClick={() => prevLesson && navigateToLesson(prevLesson._id)}
              disabled={!prevLesson}
              className="gap-2"
            >
              <ChevronLeft className="h-4 w-4" />
              <span className="hidden sm:inline">Previous Lesson</span>
              <span className="sm:hidden">Previous</span>
            </Button>


            <div className="text-sm text-muted-foreground">
              Lesson {currentLessonIndex + 1} of {course?.lessons?.length || 0}
            </div>


            <Button
              onClick={() => nextLesson && navigateToLesson(nextLesson._id)}
              disabled={!nextLesson}
              className="gap-2"
            >
              <span className="hidden sm:inline">Next Lesson</span>
              <span className="sm:hidden">Next</span>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </Card>
      </div>
    </DashboardLayout>
  );
}
