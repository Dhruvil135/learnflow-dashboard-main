import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { examApi } from '@/services/api';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { 
  CheckCircle, 
  XCircle,
  ArrowRight, 
  ArrowLeft,
  Loader2,
  Clock,
  FileText,
  Award,
  RotateCcw,
  Home,
  AlertTriangle
} from 'lucide-react';
import { toast } from 'sonner';

interface Question {
  question: string;
  options: string[];
  correctAnswer: number;
  points?: number;
  explanation?: string;
}

interface Exam {
  _id: string;
  title: string;
  description?: string;
  questions: Question[];
  duration?: number;
  settings: {
    passingScore: number;
    attemptsAllowed: number;
    shuffleQuestions: boolean;
    showResultsImmediately: boolean;
  };
  status: string;
}

export default function TakeExam() {
  const { examId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  
  const [exam, setExam] = useState<Exam | null>(null);
  const [loading, setLoading] = useState(true);
  
  // Quiz State
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [answers, setAnswers] = useState<(number | null)[]>([]);
  const [isFinished, setIsFinished] = useState(false);
  const [score, setScore] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [actualTimeSpent, setActualTimeSpent] = useState(0); // ✅ NEW
  
  // Timer State
  const [timeRemaining, setTimeRemaining] = useState<number | null>(null);
  const [showTimeWarning, setShowTimeWarning] = useState(false);
  const [startTime] = useState(Date.now());

  useEffect(() => {
    const fetchExam = async () => {
      try {
        if (!examId) return;
        
        const response = await examApi.getExam(examId);
        let examData: Exam;
        
        if (response.data?.exam) {
          examData = response.data.exam;
        } else if (response.exam) {
          examData = response.exam;
        } else {
          examData = response;
        }

        console.log('✅ Exam loaded:', examData);
        setExam(examData);
        
        // Initialize answers array
        setAnswers(new Array(examData.questions.length).fill(null));
        
        // Initialize countdown timer (duration in minutes -> convert to seconds)
        if (examData.duration && examData.duration > 0) {
          setTimeRemaining(examData.duration * 60);
        }
      } catch (error) {
        console.error('Failed to load exam:', error);
        toast.error("Failed to load exam");
        navigate('/student');
      } finally {
        setLoading(false);
      }
    };
    fetchExam();
  }, [examId, navigate]);

  // Countdown Timer Logic
  useEffect(() => {
    if (timeRemaining === null || timeRemaining <= 0 || isFinished) return;

    const timer = setInterval(() => {
      setTimeRemaining((prev) => {
        if (prev === null || prev <= 1) {
          clearInterval(timer);
          handleTimeUp();
          return 0;
        }
        
        // Show warning at 2 minutes remaining
        if (prev === 120) {
          setShowTimeWarning(true);
          toast.warning('⏰ 2 minutes remaining!', { duration: 5000 });
        }
        
        // Show warning at 30 seconds
        if (prev === 30) {
          toast.error('⚠️ 30 seconds left!', { duration: 5000 });
        }
        
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [timeRemaining, isFinished]);

  // Format time as MM:SS
  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Handle time up (auto-submit)
  const handleTimeUp = async () => {
    toast.error('⏰ Time is up! Exam submitted automatically.');
    await finishQuiz(true);
  };

  const handleAnswerSelect = (answerIndex: number) => {
    setSelectedAnswer(answerIndex);
    
    const newAnswers = [...answers];
    newAnswers[currentQuestionIndex] = answerIndex;
    setAnswers(newAnswers);
  };

  const handleNext = () => {
    if (currentQuestionIndex < exam!.questions.length - 1) {
      setCurrentQuestionIndex(prev => prev + 1);
      setSelectedAnswer(answers[currentQuestionIndex + 1]);
    }
  };

  const handlePrevious = () => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex(prev => prev - 1);
      setSelectedAnswer(answers[currentQuestionIndex - 1]);
    }
  };

  // ✅ UPDATED: finishQuiz with correct time calculation
  const finishQuiz = async (autoSubmit: boolean = false) => {
    // Only check for unanswered if not auto-submit
    if (!autoSubmit) {
      const unanswered = answers.filter(a => a === null).length;
      if (unanswered > 0) {
        toast.error(`Please answer all questions (${unanswered} remaining)`);
        return;
      }
    }

    setSubmitting(true);
    try {
      // ✅ Calculate actual time spent FIRST
      const timeSpentSeconds = Math.floor((Date.now() - startTime) / 1000);
      const timeSpentMinutes = Math.floor(timeSpentSeconds / 60);
      setActualTimeSpent(timeSpentMinutes);

      // Calculate score
      let calculatedScore = 0;
      let totalPoints = 0;

      exam!.questions.forEach((q, idx) => {
        const points = q.points || 1;
        totalPoints += points;
        if (answers[idx] === q.correctAnswer) {
          calculatedScore += points;
        }
      });

      const percentage = Math.round((calculatedScore / totalPoints) * 100);
      setScore(percentage);

      // Submit to backend
      const submittedAnswers = answers.map(a => a === null ? -1 : a);
      await examApi.submitExam(examId!, submittedAnswers);
      
      toast.success("Exam submitted successfully!");
      setIsFinished(true);
    } catch (error) {
      console.error('Submit error:', error);
      toast.error("Failed to submit exam");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!exam) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Card className="p-8 text-center">
          <p className="text-muted-foreground mb-4">Exam not found</p>
          <Button onClick={() => navigate('/student')}>Return to Dashboard</Button>
        </Card>
      </div>
    );
  }

  // Results Screen
  if (isFinished) {
    const isPassed = score >= exam.settings.passingScore;
    
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background to-secondary/20 p-4">
        <Card className="max-w-2xl w-full p-8 space-y-6 animate-fade-in">
          <div className="text-center space-y-4">
            <div className={`inline-flex p-4 rounded-full mb-2 ${
              isPassed ? 'bg-green-500/10' : 'bg-red-500/10'
            }`}>
              {isPassed ? (
                <CheckCircle className="h-16 w-16 text-green-500" />
              ) : (
                <XCircle className="h-16 w-16 text-red-500" />
              )}
            </div>
            
            <h1 className="text-3xl font-bold">
              {isPassed ? 'Congratulations!' : 'Keep Practicing!'}
            </h1>
            
            <p className="text-muted-foreground">
              {isPassed 
                ? 'You passed the exam!' 
                : `You need ${exam.settings.passingScore}% to pass`}
            </p>
          </div>

          <Separator />

          {/* ✅ UPDATED: Use actualTimeSpent */}
          <div className="grid md:grid-cols-3 gap-4">
            <Card className="p-6 text-center">
              <Award className="h-8 w-8 text-primary mx-auto mb-2" />
              <p className="text-sm text-muted-foreground mb-1">Your Score</p>
              <p className="text-3xl font-bold text-primary">{score}%</p>
            </Card>

            <Card className="p-6 text-center">
              <FileText className="h-8 w-8 text-blue-500 mx-auto mb-2" />
              <p className="text-sm text-muted-foreground mb-1">Questions</p>
              <p className="text-3xl font-bold">
                {answers.filter((a, i) => a === exam.questions[i].correctAnswer).length}/{exam.questions.length}
              </p>
            </Card>

            <Card className="p-6 text-center">
              <Clock className="h-8 w-8 text-purple-500 mx-auto mb-2" />
              <p className="text-sm text-muted-foreground mb-1">Time Spent</p>
              <p className="text-3xl font-bold">{actualTimeSpent}m</p>
            </Card>
          </div>

          <Card className={`p-4 ${isPassed ? 'bg-green-500/10' : 'bg-red-500/10'}`}>
            <div className="flex items-center justify-between">
              <div>
                <p className="font-semibold">
                  {isPassed ? '✓ Passed' : '✗ Not Passed'}
                </p>
                <p className="text-sm text-muted-foreground">
                  Passing score: {exam.settings.passingScore}%
                </p>
              </div>
              <Badge variant={isPassed ? 'default' : 'destructive'} className="text-lg px-4 py-2">
                {isPassed ? 'PASS' : 'FAIL'}
              </Badge>
            </div>
          </Card>

          {exam.settings.showResultsImmediately && (
            <div className="space-y-3">
              <h3 className="font-semibold text-lg">Answer Review</h3>
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {exam.questions.map((q, idx) => {
                  const isCorrect = answers[idx] === q.correctAnswer;
                  return (
                    <div 
                      key={idx}
                      className={`p-3 rounded-lg border ${
                        isCorrect ? 'bg-green-500/10 border-green-500/20' : 'bg-red-500/10 border-red-500/20'
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        {isCorrect ? (
                          <CheckCircle className="h-5 w-5 text-green-500 mt-0.5" />
                        ) : (
                          <XCircle className="h-5 w-5 text-red-500 mt-0.5" />
                        )}
                        <div className="flex-1">
                          <p className="font-medium text-sm">Q{idx + 1}: {q.question}</p>
                          <div className="mt-1 text-xs space-y-1">
                            <p className="text-muted-foreground">
                              Your answer: <span className={!isCorrect ? 'text-red-500' : 'text-green-500'}>
                                {q.options[answers[idx] as number] || 'Not answered'}
                              </span>
                            </p>
                            {!isCorrect && (
                              <p className="text-muted-foreground">
                                Correct answer: <span className="text-green-500">
                                  {q.options[q.correctAnswer]}
                                </span>
                              </p>
                            )}
                            {q.explanation && !isCorrect && (
                              <p className="text-blue-600 dark:text-blue-400 mt-1">
                                💡 {q.explanation}
                              </p>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          <div className="flex gap-3">
            <Button 
              onClick={() => navigate('/student')} 
              className="flex-1 gap-2"
              size="lg"
            >
              <Home className="h-4 w-4" />
              Return to Dashboard
            </Button>
            
            {!isPassed && exam.settings.attemptsAllowed > 1 && (
              <Button 
                onClick={() => window.location.reload()} 
                variant="outline"
                className="gap-2"
                size="lg"
              >
                <RotateCcw className="h-4 w-4" />
                Retake
              </Button>
            )}
          </div>
        </Card>
      </div>
    );
  }

  // Exam Taking Screen
  const question = exam.questions[currentQuestionIndex];
  const progress = ((currentQuestionIndex + 1) / exam.questions.length) * 100;
  const answeredCount = answers.filter(a => a !== null).length;

  // Timer color based on remaining time
  const getTimerColor = () => {
    if (!timeRemaining) return 'text-muted-foreground';
    if (timeRemaining <= 30) return 'text-red-500';
    if (timeRemaining <= 120) return 'text-orange-500';
    return 'text-foreground';
  };

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-3xl space-y-6 animate-fade-in">
        {/* Header */}
        <Card className="p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-2xl font-bold">{exam.title}</h1>
              {exam.description && (
                <p className="text-sm text-muted-foreground mt-1">{exam.description}</p>
              )}
            </div>
            
            {/* Countdown Timer Display */}
            {timeRemaining !== null && (
              <Badge 
                variant={timeRemaining <= 120 ? 'destructive' : 'secondary'} 
                className={`gap-2 px-4 py-2 text-lg font-mono ${getTimerColor()}`}
              >
                <Clock className={`h-5 w-5 ${timeRemaining <= 30 ? 'animate-pulse' : ''}`} />
                {formatTime(timeRemaining)}
              </Badge>
            )}
          </div>

          <div className="space-y-2">
            <div className="flex justify-between text-sm text-muted-foreground">
              <span>Question {currentQuestionIndex + 1} of {exam.questions.length}</span>
              <span className="font-medium text-foreground">
                {answeredCount} answered
              </span>
            </div>
            <Progress value={progress} className="h-2" />
          </div>
        </Card>

        {/* Time Warning Banner */}
        {showTimeWarning && timeRemaining && timeRemaining <= 120 && (
          <Card className="p-4 bg-orange-500/10 border-orange-500/20">
            <div className="flex items-center gap-3">
              <AlertTriangle className="h-5 w-5 text-orange-500" />
              <p className="text-sm font-medium text-orange-700 dark:text-orange-400">
                ⚠️ Less than 2 minutes remaining! Please review your answers.
              </p>
            </div>
          </Card>
        )}

        {/* Question Card */}
        <Card className="p-8">
          <div className="flex items-start gap-4 mb-6">
            <div className="flex items-center justify-center w-10 h-10 rounded-full bg-primary/10 text-primary font-bold shrink-0">
              {currentQuestionIndex + 1}
            </div>
            <div className="flex-1">
              <h2 className="text-xl font-semibold">{question.question}</h2>
              {question.points && question.points > 1 && (
                <Badge variant="outline" className="mt-2">
                  {question.points} points
                </Badge>
              )}
            </div>
          </div>

          <div className="space-y-3">
            {question.options.map((option: string, index: number) => (
              <div 
                key={index}
                onClick={() => handleAnswerSelect(index)}
                className={`p-4 rounded-xl border-2 cursor-pointer transition-all flex items-center gap-4 ${
                  selectedAnswer === index 
                    ? 'border-primary bg-primary/5 shadow-sm' 
                    : 'border-border hover:border-primary/50 hover:bg-accent/50'
                }`}
              >
                <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center shrink-0 ${
                  selectedAnswer === index ? 'border-primary bg-primary' : 'border-muted-foreground'
                }`}>
                  {selectedAnswer === index && (
                    <div className="w-3 h-3 rounded-full bg-primary-foreground" />
                  )}
                </div>
                <span className={`text-sm ${selectedAnswer === index ? 'font-medium text-primary' : ''}`}>
                  {option}
                </span>
              </div>
            ))}
          </div>
        </Card>

        {/* Navigation */}
        <Card className="p-4">
          <div className="flex justify-between items-center">
            <Button 
              onClick={handlePrevious}
              disabled={currentQuestionIndex === 0}
              variant="outline"
              className="gap-2"
            >
              <ArrowLeft className="h-4 w-4" />
              Previous
            </Button>

            {currentQuestionIndex === exam.questions.length - 1 ? (
              <Button 
                onClick={() => finishQuiz(false)}
                disabled={submitting}
                size="lg"
                className="gap-2"
              >
                {submitting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Submitting...
                  </>
                ) : (
                  <>
                    Submit Exam
                    <CheckCircle className="h-4 w-4" />
                  </>
                )}
              </Button>
            ) : (
              <Button 
                onClick={handleNext}
                className="gap-2"
              >
                Next
                <ArrowRight className="h-4 w-4" />
              </Button>
            )}
          </div>
        </Card>

        {/* Question Navigator */}
        <Card className="p-4">
          <p className="text-sm font-medium mb-3">Quick Navigation</p>
          <div className="grid grid-cols-10 gap-2">
            {exam.questions.map((_, idx) => (
              <button
                key={idx}
                onClick={() => {
                  setCurrentQuestionIndex(idx);
                  setSelectedAnswer(answers[idx]);
                }}
                className={`aspect-square rounded-lg text-sm font-medium transition-all ${
                  idx === currentQuestionIndex
                    ? 'bg-primary text-primary-foreground'
                    : answers[idx] !== null
                    ? 'bg-green-500/20 text-green-700 dark:text-green-400 hover:bg-green-500/30'
                    : 'bg-secondary hover:bg-secondary/80'
                }`}
              >
                {idx + 1}
              </button>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}
