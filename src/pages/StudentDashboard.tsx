import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Trophy, Clock, ArrowRight, Sparkles, Loader2, X, BookOpen, GraduationCap, Target } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { examApi, aiApi, courseApi } from '@/services/api';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';


const ExamCard = ({ exam, onDelete }: { exam: any, onDelete: () => void }) => {
  const navigate = useNavigate();
  return (
    <Card
      className="group relative hover:shadow-lg transition-all cursor-pointer border-border overflow-hidden flex flex-col"
      onClick={() => navigate(`/take-exam/${exam._id}`)}
    >
      <Button
        variant="ghost"
        size="icon"
        className="absolute top-2 right-2 h-8 w-8 bg-white/40 hover:bg-red-500 hover:text-white text-slate-700 rounded-full backdrop-blur-sm transition-all z-20 opacity-0 group-hover:opacity-100"
        onClick={(e) => { e.stopPropagation(); onDelete(); }}
      >
        <X className="h-4 w-4" />
      </Button>

      <div className="h-32 bg-gradient-to-br from-[#2D6A64]/20 to-[#2D6A64]/5 flex items-center justify-center">
        <Trophy className="h-10 w-10 text-[#2D6A64]/60 group-hover:scale-110 transition-transform" />
      </div>

      <div className="p-5 flex flex-col flex-1">
        <div className="flex items-center gap-2 mb-3">
          <span className="px-2.5 py-0.5 rounded-full bg-secondary text-secondary-foreground text-xs font-medium">
            {exam.questions?.length || 5} Questions
          </span>
        </div>
        <h3 className="font-semibold text-lg mb-2 line-clamp-1">{exam.title}</h3>
        <p className="text-muted-foreground text-sm line-clamp-2 mb-4 flex-1">
          {exam.description || "Student-generated practice quiz."}
        </p>
        <div className="flex items-center justify-end mt-auto pt-4 border-t">
          <div className="flex items-center text-xs text-muted-foreground">
            <Clock className="h-3.5 w-3.5 mr-1" />
            {exam.duration || 30}m
          </div>
        </div>
      </div>
    </Card>
  );
};


const CourseCard = ({ course }: { course: any }) => {
  const navigate = useNavigate();

  return (
    <Card
      className="group hover:shadow-lg transition-all cursor-pointer border-border overflow-hidden"
      onClick={() => navigate(`/courses/${course._id}`)}
    >
      {course.thumbnail?.url ? (
        <div className="h-40 overflow-hidden">
          <img
            src={course.thumbnail.url}
            alt={course.title}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform"
          />
        </div>
      ) : (
        <div className="h-40 bg-gradient-to-br from-[#2D6A64]/20 to-[#2D6A64]/5 flex items-center justify-center">
          <BookOpen className="h-12 w-12 text-[#2D6A64]/60" />
        </div>
      )}

      <div className="p-5">
        <div className="flex items-center gap-2 mb-3">
          <span className="px-2.5 py-0.5 rounded-full bg-secondary text-secondary-foreground text-xs font-medium">
            {course.category}
          </span>
          {course.progress?.progressPercentage !== undefined && (
            <span className="px-2.5 py-0.5 rounded-full bg-primary/10 text-primary text-xs font-medium">
              {course.progress.progressPercentage}% Complete
            </span>
          )}
        </div>

        <h3 className="font-semibold text-lg mb-2 line-clamp-1">{course.title}</h3>

        <p className="text-muted-foreground text-sm line-clamp-2 mb-4">
          {course.description}
        </p>

        {course.progress?.progressPercentage !== undefined && (
          <div className="w-full bg-secondary rounded-full h-2 mb-3">
            <div
              className="bg-[#2D6A64] h-2 rounded-full transition-all"
              style={{ width: `${course.progress.progressPercentage}%` }}
            />
          </div>
        )}

        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>{course.lessons?.length || 0} Lessons</span>
          <span>By {course.instructor?.username}</span>
        </div>
      </div>
    </Card>
  );
};


export default function StudentDashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [myQuizzes, setMyQuizzes] = useState<any[]>([]);
  const [courseQuizzes, setCourseQuizzes] = useState<any[]>([]);
  const [enrolledCourses, setEnrolledCourses] = useState<any[]>([]);
  const [recommendedCourses, setRecommendedCourses] = useState<any[]>([]); // ✅ NEW
  const [loading, setLoading] = useState(true);

  const [aiOpen, setAiOpen] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiTopic, setAiTopic] = useState('');

  const displayName = user?.profile?.firstName && user?.profile?.lastName ? `${user.profile.firstName} ${user.profile.lastName}` : user?.username || "Student";

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Fetch student's AI quizzes
        const quizRes = await examApi.getMyQuizzes();
        let myQuizList: any[] = [];
        if (Array.isArray(quizRes)) {
          myQuizList = quizRes;
        } else if (Array.isArray(quizRes?.data?.quizzes)) {
          myQuizList = quizRes.data.quizzes;
        } else if (Array.isArray(quizRes?.data)) {
          myQuizList = quizRes.data;
        }
        setMyQuizzes(myQuizList);

        // Fetch all published exams (instructor-created)
        const examRes = await examApi.getExams();
        let examList: any[] = [];
        if (Array.isArray(examRes)) {
          examList = examRes;
        } else if (Array.isArray(examRes?.data?.exams)) {
          examList = examRes.data.exams;
        } else if (Array.isArray(examRes?.data)) {
          examList = examRes.data;
        }
        const instructorExams = examList.filter(e =>
          e.status === 'published' && e.instructor && e.instructor !== user.id
        );
        setCourseQuizzes(instructorExams);

        // Fetch enrolled courses
        const coursesRes = await courseApi.getEnrolledCourses();
        let coursesList: any[] = [];
        if (Array.isArray(coursesRes)) {
          coursesList = coursesRes;
        } else if (Array.isArray(coursesRes?.data?.courses)) {
          coursesList = coursesRes.data.courses;
        } else if (Array.isArray(coursesRes?.data)) {
          coursesList = coursesRes.data;
        }
        setEnrolledCourses(coursesList);

        // ✅ FIXED: Fetch recommendations (popular courses not enrolled)
        try {
          const allCoursesRes = await courseApi.getAllCourses({ status: 'published' });
          let allCourses: any[] = [];

          if (Array.isArray(allCoursesRes)) {
            allCourses = allCoursesRes;
          } else if (Array.isArray(allCoursesRes?.data?.courses)) {
            allCourses = allCoursesRes.data.courses;
          } else if (Array.isArray(allCoursesRes?.data)) {
            allCourses = allCoursesRes.data;
          } else if (allCoursesRes?.courses) {
            allCourses = allCoursesRes.courses;
          }

          console.log('📚 All courses:', allCourses);
          console.log('✅ Enrolled courses:', coursesList);

          // Get enrolled course IDs
          const enrolledIds = coursesList.map(c => c._id);

          // Filter out enrolled courses
          const notEnrolled = allCourses.filter((course: any) =>
            !enrolledIds.includes(course._id)
          );

          console.log('🎯 Not enrolled courses:', notEnrolled);

          // Sort by enrollment count (most popular first)
          const sorted = notEnrolled.sort((a: any, b: any) => {
            const aEnrolled = a.enrolledStudents?.length || 0;
            const bEnrolled = b.enrolledStudents?.length || 0;
            return bEnrolled - aEnrolled;
          });

          // Take top 6 recommendations
          const recommendations = sorted.slice(0, 6);

          console.log('⭐ Recommendations:', recommendations);
          setRecommendedCourses(recommendations);
        } catch (error) {
          console.error('Failed to fetch recommendations:', error);
          // If recommendations fail, just show empty
          setRecommendedCourses([]);
        }

      } catch (error) {
        console.error("Failed to load dashboard data", error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [user]);

  const handleGenerateAI = async () => {
    if (!aiTopic.trim()) {
      toast.error("Please enter a topic");
      return;
    }

    setAiLoading(true);

    try {
      console.log('🤖 Generating AI quiz for topic:', aiTopic);

      // ✅ FIXED: The backend aiController.generateQuiz() now creates the exam automatically
      // We just need to call it and refresh the list - NO need to call examApi.createExam() again
      const aiResponse = await aiApi.generateQuiz(aiTopic);

      console.log('✅ AI Response:', aiResponse);

      toast.success(`Practice quiz for "${aiTopic}" created successfully!`);

      setAiOpen(false);
      setAiTopic("");

      // Refresh the quiz list
      const quizRes = await examApi.getMyQuizzes();
      let myQuizList: any[] = [];
      if (Array.isArray(quizRes)) {
        myQuizList = quizRes;
      } else if (Array.isArray(quizRes?.data?.quizzes)) {
        myQuizList = quizRes.data.quizzes;
      } else if (Array.isArray(quizRes?.data)) {
        myQuizList = quizRes.data;
      }
      setMyQuizzes(myQuizList);

    } catch (error: any) {
      console.error('❌ Failed to create quiz:', error);
      const errorMessage = error.response?.data?.message || error.message || "Failed to create quiz";
      toast.error(errorMessage);
    } finally {
      setAiLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm("Are you sure you want to delete this quiz?")) return;

    try {
      await examApi.deleteExam(id);
      setMyQuizzes((prev) => prev.filter((e) => e._id !== id));
      toast.success("Quiz deleted successfully");
    } catch (error) {
      console.error("Delete failed:", error);
      toast.error("Failed to delete quiz");
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-8 animate-fade-in">
        <div className="relative overflow-hidden rounded-3xl bg-[#2D6A64] text-white p-8 md:p-12 shadow-xl">
          <div className="relative z-10 max-w-2xl">
            <h1 className="text-3xl md:text-4xl font-bold mb-4">
              Welcome back, {displayName}!
            </h1>
            <p className="text-emerald-100 text-lg mb-8">
              You're enrolled in {enrolledCourses.length} courses with {myQuizzes.length} practice quizzes.
            </p>

            <Dialog open={aiOpen} onOpenChange={setAiOpen}>
              <DialogTrigger asChild>
                <Button
                  variant="secondary"
                  size="lg"
                  className="text-[#2D6A64] font-bold shadow-lg hover:scale-105 transition-transform bg-white hover:bg-white/90"
                >
                  <Sparkles className="h-5 w-5 mr-2" /> Generate AI Quiz
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[425px] rounded-2xl">
                <DialogHeader>
                  <DialogTitle className="text-xl font-bold flex items-center gap-2">
                    <Sparkles className="h-5 w-5 text-[#2D6A64]" />
                    AI Exam Generator
                  </DialogTitle>
                  <DialogDescription className="text-base text-muted-foreground pt-2">
                    Enter a topic (e.g., "Python", "History"), and AI will create a quiz.
                  </DialogDescription>
                </DialogHeader>

                <div className="space-y-6 py-6">
                  <div className="space-y-3">
                    <Label htmlFor="topic" className="text-sm font-semibold text-foreground">
                      Topic
                    </Label>
                    <Input
                      id="topic"
                      placeholder="e.g. React Hooks"
                      value={aiTopic}
                      onChange={(e) => setAiTopic(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && !aiLoading) {
                          handleGenerateAI();
                        }
                      }}
                      className="h-12 border-2 border-emerald-800/20 focus-visible:ring-emerald-600 rounded-xl"
                      disabled={aiLoading}
                    />
                  </div>

                  <Button
                    onClick={handleGenerateAI}
                    className="w-full h-12 bg-[#2D6A64] hover:bg-[#24534e] text-white font-bold rounded-xl transition-all shadow-md gap-2"
                    disabled={aiLoading || !aiTopic.trim()}
                  >
                    {aiLoading ? (
                      <>
                        <Loader2 className="h-5 w-5 animate-spin" /> Generating Quiz...
                      </>
                    ) : (
                      <>
                        <Sparkles className="h-5 w-5" /> Generate Exam
                      </>
                    )}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {/* Enrolled Courses Section */}
        <section>
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold text-foreground flex items-center gap-2">
              <GraduationCap className="h-6 w-6 text-[#2D6A64]" />
              My Enrolled Courses
            </h2>
            <Button
              variant="ghost"
              className="text-muted-foreground hover:text-foreground"
              onClick={() => navigate("/courses")}
            >
              Browse All <ArrowRight className="h-4 w-4 ml-1" />
            </Button>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {loading ? (
              <div className="col-span-full text-center py-12 text-muted-foreground">
                <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
                Loading courses...
              </div>
            ) : enrolledCourses.length === 0 ? (
              <div className="col-span-full text-center py-12 border-2 border-dashed rounded-xl">
                <BookOpen className="h-12 w-12 mx-auto mb-4 text-muted-foreground/50" />
                <p className="text-muted-foreground font-medium mb-2">
                  No enrolled courses yet
                </p>
                <Button
                  variant="outline"
                  onClick={() => navigate('/courses')}
                  className="mt-4"
                >
                  Browse Courses
                </Button>
              </div>
            ) : (
              enrolledCourses.map((course) => (
                <CourseCard key={course._id} course={course} />
              ))
            )}
          </div>
        </section>

        {/* ✅ NEW: AI Recommended Courses */}
        <section>
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold text-foreground flex items-center gap-2">
              <Target className="h-6 w-6 text-[#2D6A64]" />
              Recommended For You
            </h2>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {loading ? (
              <div className="col-span-full text-center py-12 text-muted-foreground">
                <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
                Loading recommendations...
              </div>
            ) : recommendedCourses.length === 0 ? (
              <div className="col-span-full text-center py-12 border-2 border-dashed rounded-xl">
                <Target className="h-12 w-12 mx-auto mb-4 text-muted-foreground/50" />
                <p className="text-muted-foreground font-medium mb-2">
                  No recommendations available
                </p>
                <p className="text-sm text-muted-foreground">
                  Enroll in courses to get personalized recommendations!
                </p>
              </div>
            ) : (
              recommendedCourses.map((course) => (
                <CourseCard key={course._id} course={course} />
              ))
            )}
          </div>
        </section>

        {/* My AI Practice Quizzes */}
        <section>
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold text-foreground flex items-center gap-2">
              <Sparkles className="h-6 w-6 text-[#2D6A64]" />
              My AI Practice Quizzes
            </h2>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {loading ? (
              <div className="col-span-full text-center py-12 text-muted-foreground">
                <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
                Loading quizzes...
              </div>
            ) : myQuizzes.length === 0 ? (
              <div className="col-span-full text-center py-12 border-2 border-dashed rounded-xl">
                <Trophy className="h-12 w-12 mx-auto mb-4 text-muted-foreground/50" />
                <p className="text-muted-foreground font-medium mb-2">
                  No practice quizzes yet
                </p>
                <p className="text-sm text-muted-foreground">
                  Generate your first AI quiz to get started!
                </p>
              </div>
            ) : (
              myQuizzes.map((exam) => (
                <ExamCard
                  key={exam._id}
                  exam={exam}
                  onDelete={() => handleDelete(exam._id)}
                />
              ))
            )}
          </div>
        </section>

        {/* Course Quizzes (Instructor-created) */}
        <section>
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold text-foreground flex items-center gap-2">
              <Trophy className="h-6 w-6 text-[#2D6A64]" />
              Course Quizzes
            </h2>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {loading ? (
              <div className="col-span-full text-center py-12 text-muted-foreground">
                <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
                Loading quizzes...
              </div>
            ) : courseQuizzes.length === 0 ? (
              <div className="col-span-full text-center py-12 border-2 border-dashed rounded-xl">
                <Trophy className="h-12 w-12 mx-auto mb-4 text-muted-foreground/50" />
                <p className="text-muted-foreground font-medium mb-2">
                  No course quizzes available
                </p>
                <p className="text-sm text-muted-foreground">
                  Check back later for new quizzes!
                </p>
              </div>
            ) : (
              courseQuizzes.map((exam) => (
                <Card
                  key={exam._id}
                  className="group hover:shadow-lg transition-all cursor-pointer border-border overflow-hidden"
                  onClick={() => navigate(`/take-exam/${exam._id}`)}
                >
                  <div className="h-32 bg-gradient-to-br from-blue-500/20 to-blue-500/5 flex items-center justify-center">
                    <GraduationCap className="h-10 w-10 text-blue-500/60 group-hover:scale-110 transition-transform" />
                  </div>
                  <div className="p-5">
                    <div className="flex items-center gap-2 mb-3">
                      <span className="px-2.5 py-0.5 rounded-full bg-blue-100 text-blue-700 text-xs font-medium">
                        Instructor Quiz
                      </span>
                      <span className="px-2.5 py-0.5 rounded-full bg-secondary text-secondary-foreground text-xs font-medium">
                        {exam.questions?.length || 0} Questions
                      </span>
                    </div>
                    <h3 className="font-semibold text-lg mb-2 line-clamp-1">{exam.title}</h3>
                    <p className="text-muted-foreground text-sm line-clamp-2 mb-4">
                      {exam.description || "No description"}
                    </p>
                    <div className="flex items-center justify-between text-xs text-muted-foreground pt-4 border-t">
                      <span>By {exam.instructor?.username}</span>
                      <div className="flex items-center">
                        <Clock className="h-3.5 w-3.5 mr-1" />
                        {exam.duration || 30}m
                      </div>
                    </div>
                  </div>
                </Card>
              ))
            )}
          </div>
        </section>
      </div>
    </DashboardLayout>
  );
}
