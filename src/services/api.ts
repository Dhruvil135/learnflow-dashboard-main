import axios from 'axios';


// Base URL - Change this when deploying
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';


// Create axios instance with default settings
export const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});


// Automatically attach JWT token to every request
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token') || localStorage.getItem('skillforge_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});


// Handle errors globally
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Token expired or invalid - redirect to login
      localStorage.removeItem('token');
      localStorage.removeItem('skillforge_token');
      window.location.href = '/auth';
    }
    return Promise.reject(error);
  }
);


// ===========================
// TYPES
// ===========================
interface ExamData extends Record<string, unknown> {
  title: string;
  description: string;
  questions: Array<{
    question: string;
    options: string[];
    correctAnswer: number;
  }>;
  duration: number;
  scheduledAt?: Date;
  status?: string;
  quizType?: 'ai-generated' | 'manual';
}


interface UserUpdateData extends Record<string, unknown> {
  profile?: {
    firstName?: string;
    lastName?: string;
    avatar?: string;
  };
}


// ===========================
// LEGACY FETCH-BASED API SERVICE (for backward compatibility)
// ===========================
class ApiService {
  private getAuthHeaders() {
    const token = localStorage.getItem('token') || localStorage.getItem('skillforge_token');

    if (!token) {
      console.warn('⚠️ No token found');
    }

    return {
      'Content-Type': 'application/json',
      ...(token && { Authorization: `Bearer ${token}` }),
    };
  }


  async get(endpoint: string) {
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      headers: this.getAuthHeaders(),
      credentials: 'include',
    });
    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error(err.message || 'API request failed');
    }
    return response.json();
  }


  async post(endpoint: string, data: Record<string, unknown>) {
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      method: 'POST',
      headers: this.getAuthHeaders(),
      credentials: 'include',
      body: JSON.stringify(data),
    });
    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error(err.message || 'API request failed');
    }
    return response.json();
  }


  async put(endpoint: string, data: Record<string, unknown>) {
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      method: 'PUT',
      headers: this.getAuthHeaders(),
      credentials: 'include',
      body: JSON.stringify(data),
    });
    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error(err.message || 'API request failed');
    }
    return response.json();
  }


  async patch(endpoint: string, data: Record<string, unknown>) {
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      method: 'PATCH',
      headers: this.getAuthHeaders(),
      credentials: 'include',
      body: JSON.stringify(data),
    });
    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error(err.message || 'API request failed');
    }
    return response.json();
  }


  async delete(endpoint: string) {
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      method: 'DELETE',
      headers: this.getAuthHeaders(),
      credentials: 'include',
    });
    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error(err.message || 'API request failed');
    }
    // ✅ Handle 204 No Content responses (no body to parse)
    if (response.status === 204) {
      return { status: 'success', data: null };
    }
    return response.json();
  }


  async uploadFile(endpoint: string, formData: FormData) {
    const token = localStorage.getItem('token') || localStorage.getItem('skillforge_token');
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      method: 'POST',
      headers: {
        ...(token && { Authorization: `Bearer ${token}` }),
      },
      credentials: 'include',
      body: formData,
    });
    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error(err.message || 'Upload failed');
    }
    return response.json();
  }


  async deleteFile(endpoint: string) {
    const token = localStorage.getItem('token') || localStorage.getItem('skillforge_token');
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      method: 'DELETE',
      headers: {
        ...(token && { Authorization: `Bearer ${token}` }),
      },
      credentials: 'include',
    });
    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error(err.message || 'Delete failed');
    }
    return response.json();
  }
}


export const apiService = new ApiService();


// ===========================
// AUTH API
// ===========================
export const authApi = {
  register: (data: { username: string; email: string; password: string; role?: string }) =>
    apiService.post('/auth/register', data),

  login: (data: { email: string; password: string }) =>
    apiService.post('/auth/login', data),

  getCurrentUser: () => apiService.get('/users/profile'),

  changePassword: (data: {
    currentPassword: string;
    newPassword: string;
    confirmPassword: string;
  }) => apiService.post('/auth/change-password', data),

  // ✅ NEW: Forgot Password
  forgotPassword: (email: string) =>
    apiService.post('/auth/forgot-password', { email }),

  // ✅ NEW: Reset Password
  resetPassword: (token: string, password: string, confirmPassword: string) =>
    apiService.post('/auth/reset-password', { token, password, confirmPassword }),
};


// ===========================
// EXAM API
// ===========================
export const examApi = {
  getExams: () => apiService.get('/exams'),
  getMyExams: () => apiService.get('/exams/my-exams'),
  getMyQuizzes: () => apiService.get('/exams/my-quizzes'),
  getExam: (id: string) => apiService.get(`/exams/${id}`),
  createExam: (exam: ExamData) => apiService.post('/exams', exam),
  updateExam: (id: string, exam: Partial<ExamData>) => apiService.patch(`/exams/${id}`, exam),
  deleteExam: (id: string) => apiService.delete(`/exams/${id}`),
  publishExam: (id: string) => apiService.patch(`/exams/${id}/publish`, {}),
  getSubmissions: (id: string) => apiService.get(`/exams/${id}/submissions`),
  submitExam: (id: string, answers: number[], timeSpent?: number) =>
    apiService.post(`/exams/${id}/submit`, { answers, timeSpent }),
};


// ===========================
// AI API
// ===========================
export const aiApi = {
  generateQuiz: (topic: string) =>
    apiService.post('/ai/generate', { topic }),

  getRecommendations: (userId: string) =>
    apiService.get(`/ai/recommendations/${userId}`),

  getTrending: () =>
    apiService.get('/ai/trending'),

  getSimilar: (courseId: string) =>
    apiService.get(`/ai/similar/${courseId}`),

  // ✅ NEW: AI Chat
  chat: (message: string, conversationHistory?: Array<{ role: string; content: string }>) =>
    apiService.post('/ai/chat', { message, conversationHistory }),
};


// ===========================
// USER API
// ===========================
export const userApi = {
  getProfile: () => apiService.get('/users/profile'),
  updateProfile: (updates: UserUpdateData) => apiService.put('/users/profile', updates),
  uploadAvatar: (file: File) => {
    const formData = new FormData();
    formData.append('avatar', file);
    return apiService.uploadFile('/users/profile/avatar', formData);
  },
  removeAvatar: () => apiService.deleteFile('/users/profile/avatar'),
  getActivity: () => apiService.get('/users/activity'),
  getUsers: () => apiService.get('/users'),
  getUserById: (id: string) => apiService.get(`/users/${id}`),
  deleteUser: (id: string) => apiService.delete(`/users/${id}`),  // ✅ NEW: Admin can delete users
};


// ===========================
// COURSE API
// ===========================
export const courseApi = {
  getAllCourses: (filters?: { status?: string; category?: string; level?: string }) => {
    const params = new URLSearchParams();
    params.append('published', 'true');
    if (filters?.category) params.append('category', filters.category);
    if (filters?.level) params.append('level', filters.level);
    return apiService.get(`/courses?${params.toString()}`);
  },

  getMyCourses: () => apiService.get('/courses/my-courses'),
  getEnrolledCourses: () => apiService.get('/courses/enrolled'),
  getCourseById: (id: string) => apiService.get(`/courses/${id}`),
  createCourse: (data: Record<string, unknown>) => apiService.post('/courses', data),

  createCourseWithThumbnail: (data: Record<string, unknown>, thumbnail: File) => {
    const formData = new FormData();
    Object.keys(data).forEach(key => {
      if (key === 'estimatedDuration' && typeof data[key] === 'object') {
        const duration = data[key] as { hours: number; minutes: number };
        formData.append('estimatedDuration[hours]', duration.hours.toString());
        formData.append('estimatedDuration[minutes]', duration.minutes.toString());
      } else {
        formData.append(key, data[key] as string);
      }
    });
    formData.append('thumbnail', thumbnail);
    return apiService.uploadFile('/courses', formData);
  },

  updateCourse: (id: string, data: Record<string, unknown>, thumbnail?: File) => {
    if (thumbnail) {
      const formData = new FormData();
      Object.keys(data).forEach(key => {
        formData.append(key, data[key] as string);
      });
      formData.append('thumbnail', thumbnail);
      return apiService.uploadFile(`/courses/${id}`, formData);
    }
    return apiService.patch(`/courses/${id}`, data);
  },

  deleteCourse: (id: string) => apiService.delete(`/courses/${id}`),
  enrollInCourse: (courseId: string) =>
    apiService.post(`/courses/${courseId}/enroll`, {}),
  unenrollFromCourse: (courseId: string) =>
    apiService.delete(`/courses/${courseId}/enroll`),
  publishCourse: (id: string) => apiService.patch(`/courses/${id}/publish`, {}),
};


// ===========================
// LESSON API
// ===========================
export const lessonApi = {
  getAllLessons: (courseId?: string) => {
    const params = courseId ? `?courseId=${courseId}` : '';
    return apiService.get(`/lessons${params}`);
  },

  getLessonById: (id: string) => apiService.get(`/lessons/${id}`),

  createLesson: (data: FormData | Record<string, unknown>, attachments?: File[]) => {
    if (data instanceof FormData) {
      return apiService.uploadFile('/lessons', data);
    }

    if (attachments && attachments.length > 0) {
      const formData = new FormData();
      Object.keys(data).forEach(key => {
        formData.append(key, data[key] as string);
      });
      attachments.forEach(file => {
        formData.append('attachments', file);
      });
      return apiService.uploadFile('/lessons', formData);
    }

    return apiService.post('/lessons', data);
  },

  updateLesson: (id: string, data: FormData | Record<string, unknown>, attachments?: File[]) => {
    if (data instanceof FormData) {
      return apiService.uploadFile(`/lessons/${id}`, data);
    }

    if (attachments && attachments.length > 0) {
      const formData = new FormData();
      Object.keys(data).forEach(key => {
        formData.append(key, data[key] as string);
      });
      attachments.forEach(file => {
        formData.append('attachments', file);
      });
      return apiService.uploadFile(`/lessons/${id}`, formData);
    }

    return apiService.patch(`/lessons/${id}`, data);
  },

  deleteLesson: (id: string) => apiService.delete(`/lessons/${id}`),
  deleteAttachment: (lessonId: string, attachmentId: string) =>
    apiService.delete(`/lessons/${lessonId}/attachments/${attachmentId}`),
};


// ===========================
// ANALYTICS API
// ===========================
export const analyticsApi = {
  getExamAnalytics: () => apiService.get('/analytics/exams'),
  getUserAnalytics: () => apiService.get('/analytics/user'),
  getPlatformOverview: () => apiService.get('/analytics/platform'),
  getInstructorStats: () => apiService.get('/analytics/my-stats'),
  getQuestionAnalytics: (examId: string) => apiService.get(`/analytics/exam/${examId}/questions`),

  getLeaderboard: (examId?: string, limit: number = 10) => {
    const params = new URLSearchParams();
    if (examId) params.append('examId', examId);
    params.append('limit', limit.toString());
    return apiService.get(`/analytics/leaderboard?${params.toString()}`);
  },
};


// ===========================
// ✅ CERTIFICATE API (NEW)
// ===========================
export const certificateApi = {
  generateCertificate: (courseId: string) =>
    apiService.post('/certificates/generate', { courseId }),

  getMyCertificates: () =>
    apiService.get('/certificates/my-certificates'),

  verifyCertificate: (certificateId: string) =>
    apiService.get(`/certificates/verify/${certificateId}`),
};


// Backward compatibility
export async function getCurrentUser() {
  return authApi.getCurrentUser();
}
