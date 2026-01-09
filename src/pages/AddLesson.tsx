import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { lessonApi, courseApi } from '@/services/api';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { 
  ArrowLeft,
  Loader2,
  Upload,
  X,
  FileText,
  Video
} from 'lucide-react';
import { toast } from 'sonner';

interface Course {
  _id: string;
  title: string;
  lessons: any[];
}

export default function AddLesson() {
  const { id: courseId } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  
  const [course, setCourse] = useState<Course | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  
  // Form state
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    content: '',
    estimatedDuration: 15,
    order: 1
  });
  
  const [attachments, setAttachments] = useState<File[]>([]);

  // Fetch course data
  useEffect(() => {
    const fetchCourse = async () => {
      try {
        const response = await courseApi.getCourseById(courseId!);
        const courseData = response.data?.course || response.course || response;
        setCourse(courseData);
        
        // Set default order as next lesson number
        setFormData(prev => ({
          ...prev,
          order: (courseData.lessons?.length || 0) + 1
        }));
      } catch (error) {
        console.error('Failed to load course:', error);
        toast.error('Could not load course');
        navigate('/instructor');
      } finally {
        setLoading(false);
      }
    };

    if (courseId) {
      fetchCourse();
    }
  }, [courseId, navigate]);

  // Handle input changes
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: name === 'estimatedDuration' || name === 'order' ? Number(value) : value
    }));
  };

  // Handle file selection
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const files = Array.from(e.target.files);
      
      // ✅ Check file sizes
      const oversizedFiles = files.filter(f => f.size > 100 * 1024 * 1024); // 100MB
      if (oversizedFiles.length > 0) {
        toast.error(`Some files are too large. Max size: 100MB`);
        return;
      }
      
      setAttachments(prev => [...prev, ...files]);
      toast.success(`${files.length} file(s) selected`);
    }
  };

  // Remove file from attachments
  const removeFile = (index: number) => {
    setAttachments(prev => prev.filter((_, i) => i !== index));
  };

  // Get file icon
  const getFileIcon = (file: File) => {
    if (file.type.startsWith('video/')) return <Video className="h-5 w-5 text-blue-500" />;
    return <FileText className="h-5 w-5 text-orange-500" />;
  };

  // Format file size
  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validation
    if (!formData.title.trim()) {
      toast.error('Please enter a lesson title');
      return;
    }

    if (!formData.description.trim()) {
      toast.error('Please enter a lesson description');
      return;
    }

    setSubmitting(true);
    setUploadProgress(10);

    try {
      // ✅ Create FormData for file upload
      const submitData = new FormData();
      
      // Add text fields
      submitData.append('title', formData.title);
      submitData.append('description', formData.description);
      submitData.append('content', formData.content);
      submitData.append('estimatedDuration', formData.estimatedDuration.toString());
      submitData.append('order', formData.order.toString());
      submitData.append('course', courseId!); // ✅ Use 'course' not 'courseId'

      // Add files
      attachments.forEach((file) => {
        submitData.append('attachments', file);
      });

      console.log('📤 Creating lesson with data:');
      console.log('- Title:', formData.title);
      console.log('- Course ID:', courseId);
      console.log('- Attachments:', attachments.length);

      setUploadProgress(30);

      // ✅ Call API with FormData directly
      const response = await lessonApi.createLesson(submitData);
      
      setUploadProgress(100);
      console.log('✅ Lesson created:', response);
      
      toast.success('Lesson created successfully!');
      
      // Redirect back to course detail
      setTimeout(() => {
        navigate(`/courses/${courseId}`);
      }, 500);
      
    } catch (error: any) {
      console.error('❌ Failed to create lesson:', error);
      toast.error(error.response?.data?.message || error.message || 'Failed to create lesson');
    } finally {
      setSubmitting(false);
      setUploadProgress(0);
    }
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </DashboardLayout>
    );
  }

  if (!course) {
    return (
      <DashboardLayout>
        <div className="text-center py-12">
          <p className="text-muted-foreground">Course not found</p>
          <Button onClick={() => navigate('/instructor')} className="mt-4">
            Back to Dashboard
          </Button>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate(`/courses/${courseId}`)}
              className="gap-2 mb-2"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to Course
            </Button>
            <h1 className="text-3xl font-bold">Add New Lesson</h1>
            <p className="text-muted-foreground mt-1">
              Course: {course.title}
            </p>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit}>
          <Card className="p-6">
            <div className="space-y-6">
              {/* Title */}
              <div className="space-y-2">
                <Label htmlFor="title">Lesson Title *</Label>
                <Input
                  id="title"
                  name="title"
                  value={formData.title}
                  onChange={handleChange}
                  placeholder="e.g., Introduction to Variables"
                  required
                />
              </div>

              {/* Description */}
              <div className="space-y-2">
                <Label htmlFor="description">Description *</Label>
                <Textarea
                  id="description"
                  name="description"
                  value={formData.description}
                  onChange={handleChange}
                  placeholder="Brief description of what students will learn..."
                  rows={3}
                  required
                />
              </div>

              {/* Content */}
              <div className="space-y-2">
                <Label htmlFor="content">Lesson Content</Label>
                <Textarea
                  id="content"
                  name="content"
                  value={formData.content}
                  onChange={handleChange}
                  placeholder="Detailed lesson content, instructions, code examples, etc."
                  rows={8}
                />
                <p className="text-xs text-muted-foreground">
                  This will be displayed as the main lesson content
                </p>
              </div>

              {/* Duration and Order */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="estimatedDuration">Duration (minutes) *</Label>
                  <Input
                    id="estimatedDuration"
                    name="estimatedDuration"
                    type="number"
                    min="1"
                    value={formData.estimatedDuration}
                    onChange={handleChange}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="order">Lesson Order *</Label>
                  <Input
                    id="order"
                    name="order"
                    type="number"
                    min="1"
                    value={formData.order}
                    onChange={handleChange}
                    required
                  />
                  <p className="text-xs text-muted-foreground">
                    Current lessons: {course.lessons?.length || 0}
                  </p>
                </div>
              </div>

              {/* File Upload */}
              <div className="space-y-2">
                <Label htmlFor="attachments">Attachments (Videos, PDFs, Documents)</Label>
                <div className="border-2 border-dashed rounded-lg p-6 text-center hover:border-primary/50 transition-colors">
                  <input
                    id="attachments"
                    type="file"
                    multiple
                    onChange={handleFileChange}
                    className="hidden"
                    accept="video/*,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,.doc,.docx,.ppt,.pptx,.txt"
                  />
                  <label 
                    htmlFor="attachments" 
                    className="cursor-pointer flex flex-col items-center gap-2"
                  >
                    <Upload className="h-8 w-8 text-muted-foreground" />
                    <p className="text-sm font-medium">
                      Click to upload files
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Videos (MP4, WebM), PDFs, Documents • Max 100MB per file
                    </p>
                  </label>
                </div>

                {/* File List */}
                {attachments.length > 0 && (
                  <div className="space-y-2 mt-4">
                    <p className="text-sm font-medium">
                      Selected Files ({attachments.length})
                    </p>
                    {attachments.map((file, index) => (
                      <div
                        key={index}
                        className="flex items-center justify-between p-3 border rounded-lg bg-secondary/30"
                      >
                        <div className="flex items-center gap-3">
                          {getFileIcon(file)}
                          <div>
                            <p className="text-sm font-medium">{file.name}</p>
                            <p className="text-xs text-muted-foreground">
                              {formatFileSize(file.size)} • {file.type}
                            </p>
                          </div>
                        </div>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => removeFile(index)}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Upload Progress */}
              {submitting && uploadProgress > 0 && (
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="font-medium">Uploading...</span>
                    <span className="text-primary font-semibold">{uploadProgress}%</span>
                  </div>
                  <div className="w-full bg-secondary rounded-full h-2">
                    <div
                      className="bg-primary h-2 rounded-full transition-all duration-300"
                      style={{ width: `${uploadProgress}%` }}
                    />
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex gap-3 pt-4 border-t">
                <Button
                  type="submit"
                  disabled={submitting}
                  className="flex-1"
                >
                  {submitting ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      Creating Lesson...
                    </>
                  ) : (
                    'Create Lesson'
                  )}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => navigate(`/courses/${courseId}`)}
                  disabled={submitting}
                >
                  Cancel
                </Button>
              </div>
            </div>
          </Card>
        </form>
      </div>
    </DashboardLayout>
  );
}
