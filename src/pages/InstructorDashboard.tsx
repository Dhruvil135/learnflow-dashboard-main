import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { StatCard } from '@/components/cards/StatCard';
import { Sparkles, Loader2, BookOpen, Plus, Trash2, Clock, Trophy, Edit, Eye, BarChart, TrendingUp, Users, Target, LineChart as LineChartIcon } from 'lucide-react';
import { useState, useEffect } from 'react';
import { examApi, aiApi, courseApi, analyticsApi } from '@/services/api';
import { toast } from 'sonner';
import { useWebSocket } from '@/hooks/useWebSocket';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogDescription,
} from "@/components/ui/dialog";
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

// ✅ Exam Card Component (unchanged)
const ExamCard = ({
  exam,
  isAdmin,
  onDelete,
  onPublish,
  onViewSubmissions
}: {
  exam: any,
  isAdmin?: boolean,
  onDelete?: () => void,
  onPublish?: () => void,
  onViewSubmissions?: () => void
}) => {
  const isPublished = exam.status === 'published';

  return (
    <div className="group relative overflow-hidden rounded-xl border bg-card text-card-foreground shadow-sm transition-all hover:shadow-md hover:border-emerald-500/50">
      <div className="absolute top-2 right-2 z-10">
        <Badge variant={isPublished ? 'default' : 'secondary'} className="text-xs">
          {isPublished ? 'Published' : 'Draft'}
        </Badge>
      </div>

      <div className="h-24 w-full bg-gradient-to-r from-emerald-500/10 to-emerald-500/5 flex items-center justify-center">
        <Trophy className="h-10 w-10 text-emerald-600/50 group-hover:scale-110 transition-transform duration-300" />
      </div>

      <div className="p-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-medium text-emerald-600 bg-emerald-50 px-2 py-1 rounded-full border border-emerald-100">
            {exam.questions?.length || 5} Questions
          </span>
          <div className="flex items-center text-xs text-muted-foreground">
            <Clock className="h-3 w-3 mr-1" /> {exam.duration || 15} min
          </div>
        </div>

        <h3 className="font-semibold mb-2 line-clamp-1 text-foreground">{exam.title}</h3>
        <p className="text-xs text-muted-foreground line-clamp-2 mb-3 h-8">
          {exam.description || "No description provided."}
        </p>

        {exam.analytics && (
          <div className="flex items-center gap-3 text-xs text-muted-foreground mb-3 pb-3 border-b">
            <div className="flex items-center gap-1">
              <Trophy className="h-3 w-3" />
              {exam.analytics.totalAttempts || 0} attempts
            </div>
            <div className="flex items-center gap-1">
              <BarChart className="h-3 w-3" />
              {exam.analytics.averageScore?.toFixed(0) || 0}% avg
            </div>
          </div>
        )}

        {isAdmin && (
          <div className="flex gap-2 pt-2 border-t mt-2">
            <Button
              variant="ghost"
              size="sm"
              className={`flex-1 h-8 text-xs ${isPublished ? 'text-orange-600 hover:bg-orange-50' : 'text-green-600 hover:bg-green-50'}`}
              onClick={(e) => {
                e.stopPropagation();
                onPublish && onPublish();
              }}
            >
              {isPublished ? 'Unpublish' : 'Publish'}
            </Button>

            <Button
              variant="ghost"
              size="sm"
              className="flex-1 h-8 text-xs text-blue-600 hover:bg-blue-50"
              onClick={(e) => {
                e.stopPropagation();
                onViewSubmissions && onViewSubmissions();
              }}
            >
              <Eye className="h-3 w-3 mr-1" /> Submissions
            </Button>

            <Button
              variant="ghost"
              size="sm"
              className="h-8 px-2 text-red-500 hover:text-red-600 hover:bg-red-50"
              onClick={(e) => {
                e.stopPropagation();
                onDelete && onDelete();
              }}
            >
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </div>
        )}
      </div>
    </div>
  );
};

// ✅ Manual Quiz Dialog (unchanged)
const ManualQuizDialog = ({
  open,
  onOpenChange,
  onSubmit
}: {
  open: boolean,
  onOpenChange: (open: boolean) => void,
  onSubmit: (data: any) => void
}) => {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [duration, setDuration] = useState('30');
  const [questions, setQuestions] = useState([
    { question: '', options: ['', '', '', ''], correctAnswer: 0 }
  ]);

  const addQuestion = () => {
    setQuestions([...questions, { question: '', options: ['', '', '', ''], correctAnswer: 0 }]);
  };

  const updateQuestion = (index: number, field: string, value: any) => {
    const updated = [...questions];
    (updated[index] as any)[field] = value;
    setQuestions(updated);
  };

  const updateOption = (qIndex: number, oIndex: number, value: string) => {
    const updated = [...questions];
    updated[qIndex].options[oIndex] = value;
    setQuestions(updated);
  };

  const removeQuestion = (index: number) => {
    setQuestions(questions.filter((_, i) => i !== index));
  };

  const handleSubmit = () => {
    if (!title.trim()) {
      toast.error('Please enter a title');
      return;
    }

    const validQuestions = questions.filter(q =>
      q.question.trim() && q.options.every(o => o.trim())
    );

    if (validQuestions.length === 0) {
      toast.error('Please add at least one complete question');
      return;
    }

    onSubmit({
      title,
      description,
      duration: parseInt(duration),
      questions: validQuestions,
      quizType: 'manual'
    });

    setTitle('');
    setDescription('');
    setDuration('30');
    setQuestions([{ question: '', options: ['', '', '', ''], correctAnswer: 0 }]);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold flex items-center gap-2">
            <Edit className="h-5 w-5 text-[#2D6A64]" />
            Create Manual Quiz
          </DialogTitle>
          <DialogDescription>
            Build your quiz from scratch with custom questions.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="title">Quiz Title</Label>
              <Input
                id="title"
                placeholder="e.g. React Fundamentals Quiz"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description (Optional)</Label>
              <Input
                id="description"
                placeholder="Brief description of the quiz"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="duration">Duration (minutes)</Label>
              <Input
                id="duration"
                type="number"
                value={duration}
                onChange={(e) => setDuration(e.target.value)}
                min="5"
                max="180"
              />
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <Label className="text-base font-semibold">Questions</Label>
              <Button variant="outline" size="sm" onClick={addQuestion}>
                <Plus className="h-4 w-4 mr-1" /> Add Question
              </Button>
            </div>

            {questions.map((q, qIndex) => (
              <div key={qIndex} className="border rounded-lg p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <Label className="text-sm font-semibold">Question {qIndex + 1}</Label>
                  {questions.length > 1 && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-red-500 hover:text-red-600"
                      onClick={() => removeQuestion(qIndex)}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  )}
                </div>

                <Input
                  placeholder="Enter your question"
                  value={q.question}
                  onChange={(e) => updateQuestion(qIndex, 'question', e.target.value)}
                />

                <div className="space-y-2">
                  <Label className="text-xs text-muted-foreground">Options</Label>
                  {q.options.map((opt, oIndex) => (
                    <div key={oIndex} className="flex items-center gap-2">
                      <input
                        type="radio"
                        name={`correct-${qIndex}`}
                        checked={q.correctAnswer === oIndex}
                        onChange={() => updateQuestion(qIndex, 'correctAnswer', oIndex)}
                        className="mt-1"
                      />
                      <Input
                        placeholder={`Option ${oIndex + 1}`}
                        value={opt}
                        onChange={(e) => updateOption(qIndex, oIndex, e.target.value)}
                        className="flex-1"
                      />
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>

          <Button
            onClick={handleSubmit}
            className="w-full bg-[#2D6A64] hover:bg-[#24534e]"
          >
            Create Quiz
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

// ✅ NEW: Analytics Overview Section
const AnalyticsOverview = ({ stats, onRefresh }: { stats: any, onRefresh?: () => void }) => {
  if (!stats) return null;

  const chartData = stats.recentActivity?.map((day: any) => ({
    date: new Date(day._id).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
    submissions: day.submissions,
    avgScore: day.averageScore?.toFixed(0) || 0
  })) || [];

  return (
    <div className="space-y-4">
      {/* Header with Refresh Button */}
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold flex items-center gap-2">
          <BarChart className="h-5 w-5 text-emerald-600" />
          Analytics Overview
        </h2>
        {onRefresh && (
          <Button
            variant="outline"
            size="sm"
            onClick={onRefresh}
            className="gap-2"
          >
            <TrendingUp className="h-4 w-4" />
            Refresh
          </Button>
        )}
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Total Exams</CardDescription>
            <CardTitle className="text-3xl">{stats.exams?.total || 0}</CardTitle>
          </CardHeader>

        </Card>




      </div>

      {/* Activity Chart */}
      {chartData.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-emerald-600" />
              Recent Activity (Last 7 Days)
            </CardTitle>
            <CardDescription>Student submission trends</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" style={{ fontSize: '12px' }} />
                <YAxis style={{ fontSize: '12px' }} />
                <Tooltip />
                <Line
                  type="monotone"
                  dataKey="submissions"
                  stroke="#10b981"
                  strokeWidth={2}
                  name="Submissions"
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

// --- Main Dashboard Component ---
export default function InstructorDashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [exams, setExams] = useState<any[]>([]);
  const [courses, setCourses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [examCount, setExamCount] = useState("0");
  const [courseCount, setCourseCount] = useState("0");

  // ✅ NEW: Analytics State
  const [stats, setStats] = useState<any>(null);
  const [statsLoading, setStatsLoading] = useState(true);

  const [aiOpen, setAiOpen] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const [topic, setTopic] = useState('');
  const [manualOpen, setManualOpen] = useState(false);

  const displayName = user?.profile?.firstName
    ? `${user.profile.firstName} ${user.profile.lastName || ''}`.trim()
    : user?.username || "Instructor";

  // ✅ WebSocket for real-time updates
  useWebSocket({
    onNewSubmission: async (data) => {
      console.log('📩 New submission:', data);
      toast.success(`New submission: ${data.studentName} scored ${data.score}%`);

      // Refresh analytics
      await fetchAnalytics();
    }
  });

  // ✅ NEW: Fetch Analytics
  const fetchAnalytics = async () => {
    try {
      setStatsLoading(true);
      const response = await analyticsApi.getInstructorStats();
      setStats(response.data?.stats || response.stats || null);
    } catch (error) {
      console.error("Failed to load analytics", error);
    } finally {
      setStatsLoading(false);
    }
  };

  useEffect(() => {
    fetchAnalytics();
  }, []);

  // Fetch Data (Exams + Courses)
  useEffect(() => {
    const fetchData = async () => {
      try {
        const examRes = await examApi.getMyExams();
        let examList: any[] = [];

        if (Array.isArray(examRes)) {
          examList = examRes;
        } else if (Array.isArray(examRes?.data?.exams)) {
          examList = examRes.data.exams;
        } else if (Array.isArray(examRes?.data)) {
          examList = examRes.data;
        } else if (Array.isArray(examRes?.exams)) {
          examList = examRes.exams;
        }

        setExams(examList);
        setExamCount(examList.length.toString());

        const courseRes = await courseApi.getMyCourses();
        let courseList: any[] = [];

        if (Array.isArray(courseRes)) {
          courseList = courseRes;
        } else if (Array.isArray(courseRes?.data?.courses)) {
          courseList = courseRes.data.courses;
        } else if (Array.isArray(courseRes?.courses)) {
          courseList = courseRes.courses;
        }

        setCourses(courseList);
        setCourseCount(courseList.length.toString());

      } catch (error) {
        console.error("Failed to load dashboard", error);
        toast.error("Could not load your data.");
        setExams([]);
        setCourses([]);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const handleGenerateAI = async () => {
    if (!topic) {
      toast.error("Please enter a topic");
      return;
    }
    setAiLoading(true);

    try {
      // ✅ FIXED: The backend aiController.generateQuiz() now creates the exam automatically
      // We just need to call it and refresh the list - NO need to call examApi.createExam() again
      const response = await aiApi.generateQuiz(topic);

      console.log('✅ AI Response:', response);

      toast.success("Exam generated successfully!");

      setAiOpen(false);
      setTopic('');

      // Refresh the exam list
      const res = await examApi.getMyExams();
      let list: any[] = [];
      if (Array.isArray(res)) list = res;
      else if (Array.isArray(res?.data?.exams)) list = res.data.exams;
      else if (Array.isArray(res?.data)) list = res.data;
      else if (Array.isArray(res?.exams)) list = res.exams;

      setExams(list);
      setExamCount(list.length.toString());

      // Refresh analytics
      const analyticsRes = await analyticsApi.getInstructorStats();
      setStats(analyticsRes.data?.stats || analyticsRes.stats || null);

    } catch (error) {
      console.error(error);
      toast.error("Failed to generate exam. AI might be busy.");
    } finally {
      setAiLoading(false);
    }
  };

  const handleCreateManual = async (data: any) => {
    try {
      await examApi.createExam(data);
      toast.success("Quiz created successfully!");

      setManualOpen(false);

      const res = await examApi.getMyExams();
      let list: any[] = [];
      if (Array.isArray(res)) list = res;
      else if (Array.isArray(res?.data?.exams)) list = res.data.exams;
      else if (Array.isArray(res?.data)) list = res.data;

      setExams(list);
      setExamCount(list.length.toString());

      // Refresh analytics
      const analyticsRes = await analyticsApi.getInstructorStats();
      setStats(analyticsRes.data?.stats || analyticsRes.stats || null);
    } catch (error) {
      console.error(error);
      toast.error("Check Your Title and Description Should be at least 5 characters");
    }
  };

  const handlePublish = async (examId: string) => {
    try {
      await examApi.publishExam(examId);

      const res = await examApi.getMyExams();
      let list: any[] = [];
      if (Array.isArray(res)) list = res;
      else if (Array.isArray(res?.data?.exams)) list = res.data.exams;
      else if (Array.isArray(res?.data)) list = res.data;

      setExams(list);

      const exam = list.find(e => e._id === examId);
      toast.success(exam?.status === 'published' ? 'Quiz published!' : 'Quiz unpublished');
    } catch (error) {
      console.error(error);
      toast.error("Failed to update quiz status");
    }
  };

  const handleViewSubmissions = async (examId: string) => {
    navigate(`/exams/${examId}/submissions`);
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm("Are you sure? This cannot be undone.")) return;

    try {
      const response = await examApi.deleteExam(id);

      if (response?.status === 'success' || response?.message?.includes('deleted')) {
        const updatedList = exams.filter(e => e._id !== id);
        setExams(updatedList);
        setExamCount(updatedList.length.toString());

        toast.success("Exam deleted successfully");

        // Refresh analytics
        const analyticsRes = await analyticsApi.getInstructorStats();
        setStats(analyticsRes.data?.stats || analyticsRes.stats || null);
      } else {
        throw new Error('Delete operation failed');
      }
    } catch (error: any) {
      console.error('Delete error:', error);
      toast.error(error.message || "Failed to delete exam");
    }
  };

  const handleCreateCourse = () => {
    navigate('/courses/create');
  };

  return (
    <DashboardLayout>
      <div className="space-y-8 animate-in fade-in duration-500">

        {/* Header Section */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Welcome back, {displayName}</h1>
            <p className="text-muted-foreground mt-1">Here is what is happening with your courses today.</p>
          </div>

          <div className="flex gap-3">
            {/* ✅ NEW: Analytics Button */}
            <Button
              variant="outline"
              className="gap-2 border-purple-600/20 text-purple-700 hover:bg-purple-50"
              onClick={() => navigate('/analytics')}
            >
              <LineChartIcon className="h-4 w-4" />
              Advanced Analytics
            </Button>

            <Button
              variant="outline"
              className="gap-2 border-blue-600/20 text-blue-700 hover:bg-blue-50"
              onClick={() => setManualOpen(true)}
            >
              <Edit className="h-4 w-4" />
              Manual Quiz
            </Button>

            <Dialog open={aiOpen} onOpenChange={setAiOpen}>
              <DialogTrigger asChild>
                <Button variant="outline" className="gap-2 border-emerald-600/20 text-emerald-700 hover:bg-emerald-50 hover:text-emerald-800">
                  <Sparkles className="h-4 w-4" />
                  Generate with AI
                </Button>
              </DialogTrigger>

              <DialogContent className="sm:max-w-[440px] rounded-2xl p-0 overflow-hidden border-none shadow-2xl">
                <div className="p-8 space-y-4 bg-white">
                  <DialogHeader className="space-y-3">
                    <DialogTitle className="text-xl font-bold text-slate-900 flex items-center gap-2">
                      <Sparkles className="h-5 w-5 text-emerald-600" /> AI Exam Generator
                    </DialogTitle>
                    <DialogDescription className="text-[15px] text-slate-500 leading-relaxed">
                      Describe a topic (e.g., "Python Basics", "History of Rome"), and our AI will instantly structure a quiz for you.
                    </DialogDescription>
                  </DialogHeader>

                  <div className="space-y-6 pt-2">
                    <div className="space-y-3">
                      <Label htmlFor="topic" className="text-sm font-bold text-slate-700">Topic or Subject</Label>
                      <Input
                        id="topic"
                        placeholder="e.g. React Hooks, Thermodynamics..."
                        value={topic}
                        onChange={(e) => setTopic(e.target.value)}
                        className="h-12 border-slate-200 focus-visible:ring-emerald-600 rounded-xl"
                      />
                    </div>

                    <Button
                      onClick={handleGenerateAI}
                      className="w-full h-12 bg-[#2D6A64] hover:bg-[#24534e] text-white font-bold rounded-xl transition-all shadow-md gap-2"
                      disabled={aiLoading}
                    >
                      {aiLoading ? (
                        <><Loader2 className="h-5 w-5 animate-spin" /> Generating Logic...</>
                      ) : (
                        <><Sparkles className="h-4 w-4" /> Generate Exam</>
                      )}
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>

            <Button
              className="gap-2 bg-slate-900 text-white hover:bg-slate-800"
              onClick={handleCreateCourse}
            >
              <Plus className="h-4 w-4" />
              Create Course
            </Button>
          </div>
        </div>

        {/* ✅ NEW: Analytics Overview Section */}
        {statsLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <AnalyticsOverview stats={stats} />
        )}

        {/* Exam Grid Section */}
        <section>
          <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
            <BookOpen className="h-5 w-5 text-muted-foreground" /> Your Library
          </h2>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {loading ? (
              <div className="col-span-full flex flex-col items-center justify-center py-12 text-muted-foreground">
                <Loader2 className="h-8 w-8 animate-spin mb-2" />
                <p>Fetching your data...</p>
              </div>
            ) : exams.length === 0 ? (
              <div className="col-span-full text-center py-16 border-2 border-dashed border-slate-200 rounded-xl bg-slate-50/50">
                <div className="mx-auto h-12 w-12 bg-white rounded-full flex items-center justify-center mb-3 shadow-sm">
                  <BookOpen className="h-6 w-6 text-slate-300" />
                </div>
                <h3 className="font-semibold text-slate-900">No exams yet</h3>
                <p className="text-muted-foreground text-sm mt-1 max-w-sm mx-auto">
                  Get started by using the AI Generator or creating a manual quiz.
                </p>
              </div>
            ) : (
              exams.map((exam) => (
                <ExamCard
                  key={exam._id}
                  exam={exam}
                  isAdmin
                  onDelete={() => handleDelete(exam._id)}
                  onPublish={() => handlePublish(exam._id)}
                  onViewSubmissions={() => handleViewSubmissions(exam._id)}
                />
              ))
            )}
          </div>
        </section>
      </div>

      <ManualQuizDialog
        open={manualOpen}
        onOpenChange={setManualOpen}
        onSubmit={handleCreateManual}
      />
    </DashboardLayout>
  );
}
