import { api } from './api';

export interface UserProfile {
  _id: string;
  name: string;
  email: string;
  role: string;
  avatar?: string;
  bio?: string;
  enrolledCourses?: string[];
  createdAt: string;
  updatedAt: string;
}

export interface UpdateProfileData {
  name?: string;
  bio?: string;
  avatar?: string;
}

export interface ActivityLog {
  _id: string;
  user: string;
  action: string;
  details: any;
  timestamp: string;
}

class UserService {
  /**
   * Get current user profile
   */
  async getProfile(): Promise<UserProfile> {
    try {
      const response = await api.get('/users/profile');
      return response.data.user;
    } catch (error: any) {
      throw new Error(error.response?.data?.error || error.message || 'Failed to fetch profile');
    }
  }

  /**
   * Update profile
   */
  async updateProfile(data: UpdateProfileData): Promise<UserProfile> {
    try {
      const response = await api.put('/users/profile', data);
      return response.data.user;
    } catch (error: any) {
      throw new Error(error.response?.data?.error || error.message || 'Failed to update profile');
    }
  }

  /**
   * Upload profile avatar
   */
  async uploadAvatar(file: File): Promise<string> {
    try {
      const formData = new FormData();
      formData.append('image', file);
      const response = await api.post('/upload/image', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      return response.data.url; // Cloudinary URL
    } catch (error: any) {
      throw new Error(error.response?.data?.error || error.message || 'Failed to upload avatar');
    }
  }

  /**
   * Get user activity logs
   */
  async getActivityLogs(): Promise<ActivityLog[]> {
    try {
      const response = await api.get('/users/activity');
      return response.data.logs;
    } catch (error: any) {
      throw new Error(error.response?.data?.error || error.message || 'Failed to fetch activity logs');
    }
  }

  /**
   * Get all users (admin only)
   */
  async getAllUsers(): Promise<UserProfile[]> {
    try {
      const response = await api.get('/users');
      return response.data.users;
    } catch (error: any) {
      throw new Error(error.response?.data?.error || error.message || 'Failed to fetch users');
    }
  }

  /**
   * Get user by ID
   */
  async getUserById(userId: string): Promise<UserProfile> {
    try {
      const response = await api.get(`/users/${userId}`);
      return response.data.user;
    } catch (error: any) {
      throw new Error(error.response?.data?.error || error.message || 'Failed to fetch user');
    }
  }
}

export default new UserService();
