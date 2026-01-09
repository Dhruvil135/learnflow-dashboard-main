export interface Lesson {
  id: string;
  title: string;
  description: string;
  type: 'video' | 'pdf' | 'quiz';
  duration: string;
  thumbnail?: string;
  category: string;
  instructor: string;
  progress?: number;
  videoUrl?: string;
}

export interface Quiz {
  id: string;
  lessonId: string;
  title: string;
  questions: Question[];
}

export interface Question {
  id: string;
  text: string;
  options: string[];
  correctAnswer: number;
}

export interface StudentProgress {
  lessonId: string;
  completed: boolean;
  score?: number;
  lastAccessed: string;
}

export const lessons: Lesson[] = [
  {
    id: '1',
    title: 'Introduction to Algebra',
    description: 'Learn the fundamentals of algebraic expressions and equations',
    type: 'video',
    duration: '45 min',
    category: 'Mathematics',
    instructor: 'Dr. Sarah Chen',
    progress: 100,
    videoUrl: 'https://www.youtube.com/embed/NybHckSEQBI',
  },
  {
    id: '2',
    title: 'Quadratic Equations',
    description: 'Master solving quadratic equations using multiple methods',
    type: 'video',
    duration: '60 min',
    category: 'Mathematics',
    instructor: 'Dr. Sarah Chen',
    progress: 75,
    videoUrl: 'https://www.youtube.com/embed/IlNAJl36-10',
  },
  {
    id: '3',
    title: 'Data Structures Basics',
    description: 'Understanding arrays, linked lists, and basic data structures',
    type: 'pdf',
    duration: '30 min',
    category: 'Computer Science',
    instructor: 'Prof. Mike Johnson',
    progress: 50,
  },
  {
    id: '4',
    title: 'Web Development Fundamentals',
    description: 'HTML, CSS, and JavaScript basics for beginners',
    type: 'video',
    duration: '90 min',
    category: 'Web Development',
    instructor: 'Emily Davis',
    progress: 0,
    videoUrl: 'https://www.youtube.com/embed/G3e-cpL7ofc',
  },
  {
    id: '5',
    title: 'Physics Mechanics Quiz',
    description: 'Test your knowledge of Newtonian mechanics',
    type: 'quiz',
    duration: '20 min',
    category: 'Physics',
    instructor: 'Dr. Robert Wilson',
    progress: 0,
  },
  {
    id: '6',
    title: 'Creative Writing Essentials',
    description: 'Develop your creative writing skills and storytelling techniques',
    type: 'video',
    duration: '55 min',
    category: 'Language Arts',
    instructor: 'Jessica Miller',
    progress: 25,
    videoUrl: 'https://www.youtube.com/embed/hqBa-VKdJYI',
  },
];

export const quizzes: Record<string, Quiz> = {
  '5': {
    id: 'quiz-1',
    lessonId: '5',
    title: 'Physics Mechanics Quiz',
    questions: [
      {
        id: 'q1',
        text: 'What is Newton\'s First Law of Motion?',
        options: [
          'Objects in motion stay in motion unless acted upon by an external force',
          'Force equals mass times acceleration',
          'For every action, there is an equal and opposite reaction',
          'Energy cannot be created or destroyed',
        ],
        correctAnswer: 0,
      },
      {
        id: 'q2',
        text: 'What is the SI unit of force?',
        options: ['Joule', 'Watt', 'Newton', 'Pascal'],
        correctAnswer: 2,
      },
      {
        id: 'q3',
        text: 'What is the acceleration due to gravity on Earth?',
        options: ['8.9 m/s²', '9.8 m/s²', '10.8 m/s²', '11.8 m/s²'],
        correctAnswer: 1,
      },
      {
        id: 'q4',
        text: 'Which formula represents kinetic energy?',
        options: ['KE = mgh', 'KE = ½mv²', 'KE = Fd', 'KE = mv'],
        correctAnswer: 1,
      },
      {
        id: 'q5',
        text: 'What happens to momentum in a closed system?',
        options: [
          'It increases',
          'It decreases',
          'It remains constant',
          'It becomes zero',
        ],
        correctAnswer: 2,
      },
    ],
  },
};

export const studentStats = {
  totalLessons: lessons.length,
  completedLessons: 2,
  averageScore: 85,
  hoursSpent: 12.5,
  currentStreak: 5,
};

export const instructorStats = {
  totalStudents: 156,
  activeCourses: 4,
  averageRating: 4.8,
  totalRevenue: 12450,
};

export const adminStats = {
  totalUsers: 1250,
  activeStudents: 890,
  activeInstructors: 45,
  coursesPublished: 78,
  monthlyRevenue: 45600,
  userGrowth: 12.5,
};

export const recentUsers = [
  { id: '1', name: 'John Smith', email: 'john@example.com', role: 'student', joinDate: '2024-01-15' },
  { id: '2', name: 'Emily Brown', email: 'emily@example.com', role: 'student', joinDate: '2024-01-14' },
  { id: '3', name: 'Michael Lee', email: 'michael@example.com', role: 'instructor', joinDate: '2024-01-13' },
  { id: '4', name: 'Sarah Wilson', email: 'sarah@example.com', role: 'student', joinDate: '2024-01-12' },
  { id: '5', name: 'David Chen', email: 'david@example.com', role: 'student', joinDate: '2024-01-11' },
];
