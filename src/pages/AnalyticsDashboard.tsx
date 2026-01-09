import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { Trophy, TrendingUp, Users, Target, ArrowLeft } from 'lucide-react';
import { analyticsApi, examApi } from '@/services/api';
import { toast } from 'sonner';

interface LeaderboardEntry {
  rank: number;
  student: {
    _id: string;
    username: string;
    email: string;
  };
  totalAttempts: number;
  averageScore: number;
  highestScore: number;
  totalPassed: number;
}

interface Exam {
  _id: string;
  title: string;
  results?: Array<{ score: number }>;
}

const AnalyticsDashboard = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [exams, setExams] = useState<Exam[]>([]);
  const [selectedExam, setSelectedExam] = useState<string>('all');
  const [scoreDistribution, setScoreDistribution] = useState<any[]>([]);

  // Fetch data
  useEffect(() => {
    fetchData();
  }, [selectedExam]);

  const fetchData = async () => {
    try {
      setLoading(true);

      // Fetch leaderboard
      const leaderboardResponse = await analyticsApi.getLeaderboard(
        selectedExam === 'all' ? undefined : selectedExam,
        10
      );
      setLeaderboard(leaderboardResponse.data.leaderboard || []);

      // Fetch exams for dropdown
      const examsResponse = await examApi.getMyExams();
      setExams(examsResponse.data.exams || []);

      // Calculate score distribution
      calculateScoreDistribution(examsResponse.data.exams || []);
    } catch (error: any) {
      console.error('Failed to fetch analytics:', error);
      toast.error('Failed to load analytics data');
    } finally {
      setLoading(false);
    }
  };

  const calculateScoreDistribution = (examsList: Exam[]) => {
    const ranges = [
      { name: '0-20%', min: 0, max: 20, count: 0 },
      { name: '21-40%', min: 21, max: 40, count: 0 },
      { name: '41-60%', min: 41, max: 60, count: 0 },
      { name: '61-80%', min: 61, max: 80, count: 0 },
      { name: '81-100%', min: 81, max: 100, count: 0 },
    ];

    let filteredExams = examsList;
    if (selectedExam !== 'all') {
      filteredExams = examsList.filter(e => e._id === selectedExam);
    }

    filteredExams.forEach(exam => {
      exam.results?.forEach(result => {
        const score = result.score;
        const range = ranges.find(r => score >= r.min && score <= r.max);
        if (range) range.count++;
      });
    });

    setScoreDistribution(ranges);
  };

  const COLORS = ['#ef4444', '#f97316', '#eab308', '#22c55e', '#10b981'];

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold">Advanced Analytics</h1>
            <p className="text-muted-foreground">Detailed insights into student performance</p>
          </div>
        </div>

        {/* Exam Filter */}
        <Select value={selectedExam} onValueChange={setSelectedExam}>
          <SelectTrigger className="w-[250px]">
            <SelectValue placeholder="Select exam" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Exams</SelectItem>
            {exams.map(exam => (
              <SelectItem key={exam._id} value={exam._id}>
                {exam.title}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-4">
      </div>

      {/* Charts Row */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Score Distribution Histogram */}
        <Card>
          <CardHeader>
            <CardTitle>Score Distribution</CardTitle>
            <CardDescription>Student performance breakdown by score range</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={scoreDistribution}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="count" fill="#8b5cf6" name="Students" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Score Distribution Pie Chart - ✅ FIXED OVERLAP */}
        <Card>
          <CardHeader>
            <CardTitle>Performance Overview</CardTitle>
            <CardDescription>Visual breakdown of score ranges</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={scoreDistribution}
                  cx="50%"
                  cy="50%"
                  labelLine={true}
                  label={(entry) => {
                    const { name, percent } = entry;
                    return percent > 0 ? `${name}: ${(percent * 100).toFixed(0)}%` : '';
                  }}
                  outerRadius={70}
                  fill="#8884d8"
                  dataKey="count"
                >
                  {scoreDistribution.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>


    </div>
  );
};

export default AnalyticsDashboard;
