import { api } from './api';

export interface Lesson {
  _id: string;
  title: string;
  description: string;
  content: string;
  course: string;
  order: number;
  duration: number;
  videoUrl?: string;
  attachments?: Array<{
    _id: string;
    name: string;
    url: string;
    type: string;
  }>;
  completed?: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateLessonData {
  title: string;
  description: string;
  content: string;
  course: string;
  order?: number;
  duration?: number;
  videoUrl?: string;
}

class LessonService {
  /**
   * Get lessons for a course
   */
  async getLessonsByCourse(courseId: string): Promise<Lesson[]> {
    try {
      const response = await api.get(`/lessons/course/${courseId}`);
      return response.data.lessons;
    } catch (error: any) {
      throw new Error(error.response?.data?.error || error.message || 'Failed to fetch lessons');
    }
  }

  /**
   * Get single lesson
   */
  async getLessonById(lessonId: string): Promise<Lesson> {
    try {
      const response = await api.get(`/lessons/${lessonId}`);
      return response.data.lesson;
    } catch (error: any) {
      throw new Error(error.response?.data?.error || error.message || 'Failed to fetch lesson');
    }
  }

  /**
   * Create lesson (without files)
   */
  async createLesson(lessonData: CreateLessonData): Promise<Lesson> {
    try {
      const response = await api.post('/lessons', lessonData);
      return response.data.lesson;
    } catch (error: any) {
      throw new Error(error.response?.data?.error || error.message || 'Failed to create lesson');
    }
  }

  /**
   * Create lesson with attachments
   */
  async createLessonWithAttachments(
    lessonData: CreateLessonData,
    attachments: File[]
  ): Promise<Lesson> {
    try {
      const formData = new FormData();
      formData.append('title', lessonData.title);
      formData.append('description', lessonData.description);
      formData.append('content', lessonData.content);
      formData.append('course', lessonData.course);
      
      if (lessonData.order) formData.append('order', lessonData.order.toString());
      if (lessonData.duration) formData.append('duration', lessonData.duration.toString());
      if (lessonData.videoUrl) formData.append('videoUrl', lessonData.videoUrl);
      
      attachments.forEach(file => {
        formData.append('attachments', file);
      });

      const response = await api.post('/lessons', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      return response.data.lesson;
    } catch (error: any) {
      throw new Error(error.response?.data?.error || error.message || 'Failed to create lesson');
    }
  }

  /**
   * Update lesson
   */
  async updateLesson(
    lessonId: string,
    lessonData: Partial<CreateLessonData>,
    attachments?: File[]
  ): Promise<Lesson> {
    try {
      if (attachments && attachments.length > 0) {
        const formData = new FormData();
        Object.keys(lessonData).forEach(key => {
          formData.append(key, (lessonData as any)[key]);
        });
        attachments.forEach(file => {
          formData.append('attachments', file);
        });

        const response = await api.put(`/lessons/${lessonId}`, formData, {
          headers: { 'Content-Type': 'multipart/form-data' }
        });
        return response.data.lesson;
      } else {
        const response = await api.put(`/lessons/${lessonId}`, lessonData);
        return response.data.lesson;
      }
    } catch (error: any) {
      throw new Error(error.response?.data?.error || error.message || 'Failed to update lesson');
    }
  }

  /**
   * Delete lesson
   */
  async deleteLesson(lessonId: string): Promise<void> {
    try {
      await api.delete(`/lessons/${lessonId}`);
    } catch (error: any) {
      throw new Error(error.response?.data?.error || error.message || 'Failed to delete lesson');
    }
  }

  /**
   * Mark lesson as complete
   */
  async markLessonComplete(lessonId: string): Promise<any> {
    try {
      const response = await api.post(`/lessons/${lessonId}/complete`, {});
      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.error || error.message || 'Failed to mark lesson complete');
    }
  }

  /**
   * Delete attachment from lesson
   */
  async deleteAttachment(lessonId: string, attachmentId: string): Promise<void> {
    try {
      await api.delete(`/lessons/${lessonId}/attachments/${attachmentId}`);
    } catch (error: any) {
      throw new Error(error.response?.data?.error || error.message || 'Failed to delete attachment');
    }
  }
}

export default new LessonService();
