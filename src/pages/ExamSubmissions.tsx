import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { examApi, analyticsApi } from '@/services/api';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { 
  ArrowLeft,
  Loader2,
  Users,
  Trophy,
  TrendingUp,
  CheckCircle2,
  XCircle,
  BarChart3,
  Target,
  AlertCircle,
  Search,
  X,
  Filter
} from 'lucide-react';
import { toast } from 'sonner';
import { formatDateTime } from '@/lib/utils';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export default function ExamSubmissions() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<any>(null);
  const [questionAnalytics, setQuestionAnalytics] = useState<any>(null);

  // ✅ NEW: Filter States
  const [searchQuery, setSearchQuery] = useState('');
  const [scoreFilter, setScoreFilter] = useState('all');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [showFilters, setShowFilters] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Fetch submissions
        const submissionsResponse = await examApi.getSubmissions(id!);
        console.log('✅ Submissions:', submissionsResponse);
        
        const submissionsData = submissionsResponse.data || submissionsResponse;
        setData(submissionsData);

        // ✅ Fetch question-level analytics
        try {
          const analyticsResponse = await analyticsApi.getQuestionAnalytics(id!);
          console.log('✅ Question Analytics:', analyticsResponse);
          
          const analyticsData = analyticsResponse.data || analyticsResponse;
          setQuestionAnalytics(analyticsData);
        } catch (error) {
          console.warn('Question analytics not available:', error);
        }
      } catch (error: any) {
        console.error('Failed to load submissions:', error);
        toast.error('Could not load submissions');
      } finally {
        setLoading(false);
      }
    };

    if (id) {
      fetchData();
    }
  }, [id]);

  // ✅ NEW: Filter Logic
  const getFilteredSubmissions = () => {
    if (!data?.submissions) return [];
    
    let filtered = [...data.submissions];

    // Search by student name/email
    if (searchQuery) {
      filtered = filtered.filter((submission: any) => {
        const username = submission.student?.username?.toLowerCase() || '';
        const email = submission.student?.email?.toLowerCase() || '';
        const query = searchQuery.toLowerCase();
        return username.includes(query) || email.includes(query);
      });
    }

    // Filter by score range
    if (scoreFilter !== 'all') {
      filtered = filtered.filter((submission: any) => {
        const score = submission.score;
        switch (scoreFilter) {
          case 'fail': return score < 60;
          case 'pass': return score >= 60 && score < 80;
          case 'good': return score >= 80 && score < 90;
          case 'excellent': return score >= 90;
          default: return true;
        }
      });
    }

    // Filter by date range
    if (dateFrom) {
      filtered = filtered.filter((submission: any) => {
        const submissionDate = new Date(submission.completedAt);
        return submissionDate >= new Date(dateFrom);
      });
    }

    if (dateTo) {
      filtered = filtered.filter((submission: any) => {
        const submissionDate = new Date(submission.completedAt);
        return submissionDate <= new Date(dateTo + 'T23:59:59');
      });
    }

    return filtered;
  };

  // ✅ NEW: Clear all filters
  const clearFilters = () => {
    setSearchQuery('');
    setScoreFilter('all');
    setDateFrom('');
    setDateTo('');
  };

  // ✅ NEW: Check if any filters are active
  const hasActiveFilters = searchQuery || scoreFilter !== 'all' || dateFrom || dateTo;

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </DashboardLayout>
    );
  }

  if (!data) {
    return (
      <DashboardLayout>
        <div className="text-center py-12">
          <p className="text-muted-foreground">No data found</p>
          <Button onClick={() => navigate(-1)} className="mt-4">
            Go Back
          </Button>
        </div>
      </DashboardLayout>
    );
  }

  const submissions = getFilteredSubmissions();
  const analytics = data.analytics || {};

  // ✅ Prepare chart data
  const chartData = questionAnalytics?.questionAnalytics?.map((q: any) => ({
    question: `Q${q.questionNumber}`,
    successRate: q.successRate,
    difficulty: q.difficulty,
    correctCount: q.correctCount,
    totalAttempts: q.totalAttempts
  })) || [];

  // ✅ Get color based on difficulty
  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'Easy': return '#10b981'; // green
      case 'Medium': return '#f59e0b'; // orange
      case 'Hard': return '#ef4444'; // red
      default: return '#6b7280'; // gray
    }
  };

  // ✅ Difficulty breakdown
  const difficultyBreakdown = questionAnalytics?.questionAnalytics?.reduce((acc: any, q: any) => {
    acc[q.difficulty] = (acc[q.difficulty] || 0) + 1;
    return acc;
  }, {}) || {};

  return (
    <DashboardLayout>
      <div className="space-y-6 animate-fade-in">
        <div className="flex items-center justify-between">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate(-1)}
            className="gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Back
          </Button>
        </div>

        <div>
          <h1 className="text-3xl font-bold mb-2">
            {questionAnalytics?.examTitle || 'Exam Submissions'}
          </h1>
          <p className="text-muted-foreground">
            View all student submissions and question-level analytics
          </p>
        </div>

        {/* Analytics Cards */}
        <div className="grid md:grid-cols-4 gap-4">
          <Card className="p-6">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-blue-500/10 rounded-lg">
                <Users className="h-6 w-6 text-blue-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{analytics.totalAttempts || 0}</p>
                <p className="text-sm text-muted-foreground">Total Attempts</p>
              </div>
            </div>
          </Card>

          <Card className="p-6">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-green-500/10 rounded-lg">
                <Trophy className="h-6 w-6 text-green-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">
                  {analytics.averageScore?.toFixed(1) || 0}%
                </p>
                <p className="text-sm text-muted-foreground">Average Score</p>
              </div>
            </div>
          </Card>

          <Card className="p-6">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-purple-500/10 rounded-lg">
                <TrendingUp className="h-6 w-6 text-purple-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">
                  {analytics.passRate?.toFixed(1) || 0}%
                </p>
                <p className="text-sm text-muted-foreground">Pass Rate</p>
              </div>
            </div>
          </Card>

        </div>

        {/* ✅ Question-Level Analytics */}
        {questionAnalytics && chartData.length > 0 && (
          <div className="grid md:grid-cols-2 gap-6">
            {/* Success Rate Chart */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Target className="h-5 w-5 text-emerald-600" />
                  Question Success Rates
                </CardTitle>
                <CardDescription>
                  Percentage of students who answered each question correctly
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="question" style={{ fontSize: '12px' }} />
                    <YAxis style={{ fontSize: '12px' }} />
                    <Tooltip 
                      content={({ active, payload }) => {
                        if (active && payload && payload[0]) {
                          const data = payload[0].payload;
                          return (
                            <div className="bg-white p-3 border rounded-lg shadow-lg">
                              <p className="font-semibold">{data.question}</p>
                              <p className="text-sm text-muted-foreground">
                                Success Rate: {data.successRate.toFixed(1)}%
                              </p>
                              <p className="text-sm text-muted-foreground">
                                Correct: {data.correctCount}/{data.totalAttempts}
                              </p>
                              <Badge className="mt-1" style={{ backgroundColor: getDifficultyColor(data.difficulty) }}>
                                {data.difficulty}
                              </Badge>
                            </div>
                          );
                        }
                        return null;
                      }}
                    />
                    <Bar dataKey="successRate" radius={[8, 8, 0, 0]}>
                      {chartData.map((entry: any, index: number) => (
                        <Cell key={`cell-${index}`} fill={getDifficultyColor(entry.difficulty)} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Difficulty Breakdown */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <AlertCircle className="h-5 w-5 text-orange-600" />
                  Question Difficulty Breakdown
                </CardTitle>
                <CardDescription>
                  Distribution of question difficulty levels
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3">
                  {Object.entries(difficultyBreakdown).map(([difficulty, count]) => (
                    <div key={difficulty} className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div 
                          className="w-3 h-3 rounded-full" 
                          style={{ backgroundColor: getDifficultyColor(difficulty) }}
                        />
                        <span className="font-medium">{difficulty}</span>
                      </div>
                      <Badge variant="outline">{count as number} questions</Badge>
                    </div>
                  ))}
                </div>

                <div className="pt-4 border-t space-y-2">
                  <h4 className="font-semibold text-sm">Hardest Questions:</h4>
                  {questionAnalytics.questionAnalytics
                    ?.filter((q: any) => q.successRate < 50)
                    ?.slice(0, 3)
                    ?.map((q: any) => (
                      <div key={q.questionNumber} className="text-sm text-muted-foreground">
                        • Q{q.questionNumber}: {q.successRate.toFixed(1)}% success
                      </div>
                    )) || <p className="text-sm text-muted-foreground">No difficult questions found</p>}
                </div>

                <div className="pt-2 space-y-2">
                  <h4 className="font-semibold text-sm">Easiest Questions:</h4>
                  {questionAnalytics.questionAnalytics
                    ?.filter((q: any) => q.successRate >= 70)
                    ?.slice(0, 3)
                    ?.map((q: any) => (
                      <div key={q.questionNumber} className="text-sm text-muted-foreground">
                        • Q{q.questionNumber}: {q.successRate.toFixed(1)}% success
                      </div>
                    )) || <p className="text-sm text-muted-foreground">No easy questions found</p>}
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* ✅ NEW: Filters Section */}
        <Card className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold flex items-center gap-2">
              Student Submissions
              {hasActiveFilters && (
                <Badge variant="secondary" className="ml-2">
                  {submissions.length} filtered
                </Badge>
              )}
            </h2>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowFilters(!showFilters)}
              className="gap-2"
            >
              <Filter className="h-4 w-4" />
              {showFilters ? 'Hide Filters' : 'Show Filters'}
            </Button>
          </div>

          {/* Filter Controls */}
          {showFilters && (
            <div className="grid md:grid-cols-4 gap-4 mb-6 p-4 bg-muted/50 rounded-lg">
              {/* Search Filter */}
              <div className="space-y-2">
                <Label htmlFor="search" className="text-sm font-medium">Search Student</Label>
                <div className="relative">
                  <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="search"
                    placeholder="Name or email..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-8"
                  />
                  {searchQuery && (
                    <button
                      onClick={() => setSearchQuery('')}
                      className="absolute right-2 top-2.5 text-muted-foreground hover:text-foreground"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  )}
                </div>
              </div>

              {/* Score Range Filter */}
              <div className="space-y-2">
                <Label htmlFor="score-filter" className="text-sm font-medium">Score Range</Label>
                <Select value={scoreFilter} onValueChange={setScoreFilter}>
                  <SelectTrigger id="score-filter">
                    <SelectValue placeholder="All scores" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectGroup>
                      <SelectLabel>Filter by Score</SelectLabel>
                      <SelectItem value="all">All Scores</SelectItem>
                      <SelectItem value="fail">
                        <span className="flex items-center gap-2">
                          <div className="w-2 h-2 rounded-full bg-red-500" />
                          Fail (0-59%)
                        </span>
                      </SelectItem>
                      <SelectItem value="pass">
                        <span className="flex items-center gap-2">
                          <div className="w-2 h-2 rounded-full bg-orange-500" />
                          Pass (60-79%)
                        </span>
                      </SelectItem>
                      <SelectItem value="good">
                        <span className="flex items-center gap-2">
                          <div className="w-2 h-2 rounded-full bg-blue-500" />
                          Good (80-89%)
                        </span>
                      </SelectItem>
                      <SelectItem value="excellent">
                        <span className="flex items-center gap-2">
                          <div className="w-2 h-2 rounded-full bg-green-500" />
                          Excellent (90-100%)
                        </span>
                      </SelectItem>
                    </SelectGroup>
                  </SelectContent>
                </Select>
              </div>

              {/* Date From Filter */}
              <div className="space-y-2">
                <Label htmlFor="date-from" className="text-sm font-medium">From Date</Label>
                <Input
                  id="date-from"
                  type="date"
                  value={dateFrom}
                  onChange={(e) => setDateFrom(e.target.value)}
                  max={dateTo || undefined}
                />
              </div>

              {/* Date To Filter */}
              <div className="space-y-2">
                <Label htmlFor="date-to" className="text-sm font-medium">To Date</Label>
                <Input
                  id="date-to"
                  type="date"
                  value={dateTo}
                  onChange={(e) => setDateTo(e.target.value)}
                  min={dateFrom || undefined}
                />
              </div>

              {/* Clear Filters Button */}
              {hasActiveFilters && (
                <div className="md:col-span-4 flex justify-end">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={clearFilters}
                    className="gap-2 text-muted-foreground hover:text-foreground"
                  >
                    <X className="h-4 w-4" />
                    Clear All Filters
                  </Button>
                </div>
              )}
            </div>
          )}
          
          {/* Submissions List */}
          {submissions.length === 0 ? (
            <div className="text-center py-12 border-2 border-dashed rounded-lg">
              <Users className="h-12 w-12 mx-auto mb-3 text-muted-foreground/50" />
              <p className="text-muted-foreground">
                {hasActiveFilters ? 'No submissions match your filters' : 'No submissions yet'}
              </p>
              {hasActiveFilters && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={clearFilters}
                  className="mt-3"
                >
                  Clear Filters
                </Button>
              )}
            </div>
          ) : (
            <div className="space-y-3">
              {submissions.map((submission: any, index: number) => (
                <div
                  key={submission._id || index}
                  className="flex items-center justify-between p-4 border rounded-lg hover:bg-accent/50 transition-colors"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 bg-gradient-to-br from-primary/20 to-primary/10 rounded-full flex items-center justify-center text-sm font-bold text-primary">
                      {submission.student?.username?.charAt(0).toUpperCase() || 'S'}
                    </div>
                    <div>
                      <h3 className="font-semibold">
                        {submission.student?.username || 'Anonymous Student'}
                      </h3>
                      <p className="text-sm text-muted-foreground">
                        {submission.student?.email || ''}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        Submitted: {formatDateTime(submission.completedAt)}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <p className="text-2xl font-bold">{submission.score.toFixed(0)}%</p>
                      <p className="text-xs text-muted-foreground">
                        Time: {submission.timeSpent || 0}min
                      </p>
                    </div>

                    {submission.isPassed ? (
                      <Badge className="bg-green-50 text-green-700 dark:bg-green-900/20 gap-1">
                        <CheckCircle2 className="h-3 w-3" />
                        Passed
                      </Badge>
                    ) : (
                      <Badge variant="destructive" className="gap-1">
                        <XCircle className="h-3 w-3" />
                        Failed
                      </Badge>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>
    </DashboardLayout>
  );
}
