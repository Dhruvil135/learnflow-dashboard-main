import { api } from './api';


export interface Course {
  _id: string;
  title: string;
  description: string;
  instructor: {
    _id: string;
    username: string;
    email: string;
    profile?: {
      firstName?: string;
      lastName?: string;
      avatar?: string;
      bio?: string;
    };
  };
  thumbnail?: {
    url: string;
    publicId: string;
  };
  category: string;
  level: string;
  tags: string[];
  price: number;
  
  // ✅ FIXED: Updated to match backend structure
  enrolledStudents: Array<{
    studentId: string | {
      _id: string;
      username: string;
      email: string;
      profile?: {
        firstName?: string;
        lastName?: string;
        avatar?: string;
      };
    };
    enrolledAt: string;
  }>;
  
  status: string;
  analytics: {
    totalEnrollments: number;
    averageRating: number;
    totalReviews: number;
    completionRate: number;
  };
  estimatedDuration: {
    hours: number;
    minutes: number;
  };
  lessons: any[];
  
  // ✅ NEW: Progress field for enrolled courses
  progress?: {
    completedLessons: string[];
    progressPercentage: number;
    lastAccessedAt: string | null;
    enrolledAt: string | null;
  };
  
  createdAt: string;
  updatedAt: string;
  publishedAt?: string;
}


export interface CreateCourseData {
  title: string;
  description: string;
  category: string;
  level: string;
  tags: string;
  estimatedDuration?: {
    hours: number;
    minutes: number;
  };
}


class CourseService {
  /**
   * Get all courses with optional filters
   */
  async getAllCourses(filters?: {
    status?: string;
    category?: string;
    level?: string;
    published?: boolean;
  }): Promise<Course[]> {
    try {
      const params = new URLSearchParams();
      if (filters?.status) params.append('status', filters.status);
      if (filters?.category) params.append('category', filters.category);
      if (filters?.level) params.append('level', filters.level);
      if (filters?.published) params.append('published', 'true');

      const response = await api.get(`/courses?${params.toString()}`);
      return response.data.courses;
    } catch (error: any) {
      throw new Error(error.response?.data?.error || error.message || 'Failed to fetch courses');
    }
  }


  /**
   * Get single course by ID
   */
  async getCourseById(courseId: string): Promise<Course> {
    try {
      const response = await api.get(`/courses/${courseId}`);
      return response.data.course;
    } catch (error: any) {
      throw new Error(error.response?.data?.error || error.message || 'Failed to fetch course');
    }
  }


  /**
   * Create new course (without thumbnail)
   */
  async createCourse(courseData: CreateCourseData): Promise<Course> {
    try {
      const response = await api.post('/courses', courseData);
      return response.data.course;
    } catch (error: any) {
      throw new Error(error.response?.data?.error || error.message || 'Failed to create course');
    }
  }


  /**
   * Create course with thumbnail
   */
  async createCourseWithThumbnail(
    courseData: CreateCourseData,
    thumbnailFile: File
  ): Promise<Course> {
    try {
      const formData = new FormData();
      formData.append('title', courseData.title);
      formData.append('description', courseData.description);
      formData.append('category', courseData.category);
      formData.append('level', courseData.level);
      formData.append('tags', courseData.tags);
      
      if (courseData.estimatedDuration) {
        formData.append('estimatedDuration[hours]', courseData.estimatedDuration.hours.toString());
        formData.append('estimatedDuration[minutes]', courseData.estimatedDuration.minutes.toString());
      }
      
      formData.append('thumbnail', thumbnailFile);

      const response = await api.post('/courses', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      return response.data.course;
    } catch (error: any) {
      throw new Error(error.response?.data?.error || error.message || 'Failed to create course');
    }
  }


  /**
   * Update course
   */
  async updateCourse(
    courseId: string,
    courseData: Partial<CreateCourseData>,
    thumbnailFile?: File
  ): Promise<Course> {
    try {
      if (thumbnailFile) {
        const formData = new FormData();
        Object.keys(courseData).forEach(key => {
          formData.append(key, (courseData as any)[key]);
        });
        formData.append('thumbnail', thumbnailFile);

        const response = await api.patch(`/courses/${courseId}`, formData, {
          headers: { 'Content-Type': 'multipart/form-data' }
        });
        return response.data.course;
      } else {
        const response = await api.patch(`/courses/${courseId}`, courseData);
        return response.data.course;
      }
    } catch (error: any) {
      throw new Error(error.response?.data?.error || error.message || 'Failed to update course');
    }
  }


  /**
   * Delete course
   */
  async deleteCourse(courseId: string): Promise<void> {
    try {
      await api.delete(`/courses/${courseId}`);
    } catch (error: any) {
      throw new Error(error.response?.data?.error || error.message || 'Failed to delete course');
    }
  }


  /**
   * Enroll student in course
   */
  async enrollInCourse(courseId: string): Promise<any> {
    try {
      const response = await api.post(`/courses/${courseId}/enroll`, {});
      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.error || error.message || 'Failed to enroll in course');
    }
  }
  
  /**
   * Unenroll from course
   */
  async unenrollFromCourse(courseId: string): Promise<any> {
    try {
      const response = await api.delete(`/courses/${courseId}/enroll`);
      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.error || error.message || 'Failed to unenroll from course');
    }
  }
  
  /**
   * Check enrollment status
   */
  async checkEnrollmentStatus(courseId: string): Promise<{ isEnrolled: boolean }> {
    try {
      const response = await api.get(`/courses/${courseId}/enrollment-status`);
      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.error || error.message || 'Failed to check enrollment status');
    }
  }

  /**
   * Publish course
   */
  async publishCourse(courseId: string): Promise<Course> {
    try {
      const response = await api.patch(`/courses/${courseId}/publish`, {});
      return response.data.course;
    } catch (error: any) {
      throw new Error(error.response?.data?.error || error.message || 'Failed to publish course');
    }
  }
  
  /**
   * Unpublish course
   */
  async unpublishCourse(courseId: string): Promise<Course> {
    try {
      const response = await api.patch(`/courses/${courseId}/unpublish`, {});
      return response.data.course;
    } catch (error: any) {
      throw new Error(error.response?.data?.error || error.message || 'Failed to unpublish course');
    }
  }

  /**
   * Get enrolled courses for current user
   */
  async getEnrolledCourses(): Promise<Course[]> {
    try {
      const response = await api.get('/courses/enrolled');
      return response.data.courses;
    } catch (error: any) {
      throw new Error(error.response?.data?.error || error.message || 'Failed to fetch enrolled courses');
    }
  }
  
  /**
   * Get instructor's courses
   */
  async getMyCourses(): Promise<Course[]> {
    try {
      const response = await api.get('/courses/my-courses');
      return response.data.courses;
    } catch (error: any) {
      throw new Error(error.response?.data?.error || error.message || 'Failed to fetch your courses');
    }
  }

  /**
   * Get course progress
   */
  async getCourseProgress(courseId: string): Promise<any> {
    try {
      const response = await api.get(`/courses/${courseId}/progress`);
      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.error || error.message || 'Failed to fetch progress');
    }
  }
  
  /**
   * Get course statistics (instructor only)
   */
  async getCourseStats(courseId: string): Promise<any> {
    try {
      const response = await api.get(`/courses/${courseId}/stats`);
      return response.data.stats;
    } catch (error: any) {
      throw new Error(error.response?.data?.error || error.message || 'Failed to fetch course stats');
    }
  }
  
  /**
   * Delete course thumbnail
   */
  async deleteThumbnail(courseId: string): Promise<Course> {
    try {
      const response = await api.delete(`/courses/${courseId}/thumbnail`);
      return response.data.course;
    } catch (error: any) {
      throw new Error(error.response?.data?.error || error.message || 'Failed to delete thumbnail');
    }
  }

  /**
   * Mark lesson as completed
   */
  async markLessonComplete(lessonId: string): Promise<any> {
    try {
      const response = await api.post(`/lessons/${lessonId}/complete`);
      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.error || error.message || 'Failed to mark lesson complete');
    }
  }
}


export default new CourseService();
