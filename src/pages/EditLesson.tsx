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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { 
  ArrowLeft,
  Loader2,
  Upload,
  FileText,
  Trash2,
  Video,
  FileIcon
} from 'lucide-react';
import { toast } from 'sonner';

interface Attachment {
  _id?: string;
  name: string;
  url: string;
  publicId?: string;
  fileType: string;
  size?: number;
}

interface Lesson {
  _id: string;
  title: string;
  description: string;
  course: string;
  contentType: 'video' | 'text' | 'pdf' | 'quiz' | 'assignment' | 'mixed';
  content?: string;
  attachments: Attachment[];
  order: number;
  estimatedDuration: number;
  isFree: boolean;
  isPublished: boolean;
}

export default function EditLesson() {
  const { courseId, id } = useParams<{ courseId: string; id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [lesson, setLesson] = useState<Lesson | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleteAttachmentId, setDeleteAttachmentId] = useState<string | null>(null);
  
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    content: '',
    contentType: 'mixed' as 'video' | 'text' | 'pdf' | 'quiz' | 'assignment' | 'mixed',
    estimatedDuration: 0,
    isFree: false,
    isPublished: true,
  });

  useEffect(() => {
    const fetchLesson = async () => {
      try {
        const response = await lessonApi.getLessonById(id!);
        const lessonData = response.data?.lesson || response.lesson || response;
        
        setLesson(lessonData);
        setFormData({
          title: lessonData.title || '',
          description: lessonData.description || '',
          content: lessonData.content || '',
          contentType: lessonData.contentType || 'mixed',
          estimatedDuration: lessonData.estimatedDuration || 0,
          isFree: lessonData.isFree || false,
          isPublished: lessonData.isPublished !== false,
        });
      } catch (error) {
        console.error('Failed to load lesson:', error);
        toast.error('Could not load lesson');
        navigate(`/courses/${courseId}`);
      } finally {
        setLoading(false);
      }
    };

    if (id) {
      fetchLesson();
    }
  }, [id, courseId, navigate]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? (e.target as HTMLInputElement).checked : value
    }));
  };

  const handleSelectChange = (name: string, value: string) => {
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  // ✅ FIXED: Upload multiple files to Cloudinary
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setUploading(true);

    try {
      // ✅ Create FormData with multiple files
      const uploadFormData = new FormData();
      
      // Append all files with 'files' field name (for multiple uploads)
      for (let i = 0; i < files.length; i++) {
        uploadFormData.append('files', files[i]);
      }

      const token = localStorage.getItem('token');
      const response = await fetch('http://localhost:8080/api/upload/files', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: uploadFormData
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || 'Failed to upload files');
      }

      const result = await response.json();
      
      // ✅ Handle response - should contain array of files
      const uploadedFiles = Array.isArray(result.files) ? result.files : [result];
      
      // ✅ Map to our Attachment interface
      const newAttachments: Attachment[] = uploadedFiles.map((file: any) => ({
        name: file.originalName || file.name,
        url: file.url,
        publicId: file.publicId,
        fileType: file.fileType || file.type,
        size: file.size
      }));

      // ✅ Update lesson with new attachments
      const updatedAttachments = [...(lesson?.attachments || []), ...newAttachments];
      
      const updateResponse = await lessonApi.updateLesson(id!, {
        attachments: updatedAttachments
      });

      const updatedLesson = updateResponse.data?.lesson || updateResponse.lesson || updateResponse;
      setLesson(updatedLesson);
      
      toast.success(`${newAttachments.length} file(s) uploaded successfully!`);
    } catch (error: any) {
      console.error('Upload error:', error);
      toast.error(error.message || 'Failed to upload files');
    } finally {
      setUploading(false);
      e.target.value = ''; // Reset input
    }
  };

  const handleDeleteAttachment = async (attachmentId: string) => {
    if (!lesson) return;

    try {
      const updatedAttachments = lesson.attachments.filter(
        att => att._id !== attachmentId
      );

      const response = await lessonApi.updateLesson(id!, {
        attachments: updatedAttachments
      });

      const updatedLesson = response.data?.lesson || response.lesson || response;
      setLesson(updatedLesson);
      
      toast.success('Attachment deleted successfully');
    } catch (error) {
      console.error('Failed to delete attachment:', error);
      toast.error('Failed to delete attachment');
    } finally {
      setDeleteAttachmentId(null);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.title.trim()) {
      toast.error('Please enter a lesson title');
      return;
    }

    setSaving(true);
    try {
      await lessonApi.updateLesson(id!, formData);
      
      toast.success('Lesson updated successfully!');
      navigate(`/courses/${courseId}`);
    } catch (error: any) {
      console.error('Failed to update lesson:', error);
      toast.error(error.message || 'Failed to update lesson');
    } finally {
      setSaving(false);
    }
  };

  const getFileIcon = (fileType: string) => {
    if (fileType.startsWith('video/')) {
      return <Video className="h-5 w-5 text-blue-500" />;
    }
    if (fileType.includes('pdf')) {
      return <FileText className="h-5 w-5 text-red-500" />;
    }
    return <FileIcon className="h-5 w-5 text-orange-500" />;
  };

  const formatFileSize = (bytes?: number) => {
    if (!bytes) return 'Unknown size';
    const mb = bytes / (1024 * 1024);
    return mb > 1 ? `${mb.toFixed(2)} MB` : `${(bytes / 1024).toFixed(2)} KB`;
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

  if (!lesson) {
    return (
      <DashboardLayout>
        <div className="text-center py-12">
          <p className="text-muted-foreground">Lesson not found</p>
          <Button onClick={() => navigate(`/courses/${courseId}`)} className="mt-4">
            Back to Course
          </Button>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="max-w-4xl mx-auto space-y-6 animate-fade-in">
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
            <h1 className="text-3xl font-bold">Edit Lesson</h1>
            <p className="text-muted-foreground mt-1">Update lesson details and manage attachments</p>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-6">
          <Card className="p-6">
            <h2 className="text-xl font-semibold mb-4">Lesson Information</h2>
            
            <div className="space-y-4">
              {/* Title */}
              <div>
                <Label htmlFor="title">Lesson Title *</Label>
                <Input
                  id="title"
                  name="title"
                  value={formData.title}
                  onChange={handleInputChange}
                  placeholder="Enter lesson title"
                  required
                />
              </div>

              {/* Description */}
              <div>
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  name="description"
                  value={formData.description}
                  onChange={handleInputChange}
                  placeholder="Brief description of the lesson"
                  rows={3}
                />
              </div>

              {/* Content Type */}
              <div>
                <Label htmlFor="contentType">Content Type</Label>
                <Select
                  value={formData.contentType}
                  onValueChange={(value) => handleSelectChange('contentType', value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select content type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="video">Video</SelectItem>
                    <SelectItem value="text">Text</SelectItem>
                    <SelectItem value="pdf">PDF</SelectItem>
                    <SelectItem value="mixed">Mixed (Video + Text)</SelectItem>
                    <SelectItem value="quiz">Quiz</SelectItem>
                    <SelectItem value="assignment">Assignment</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Text Content */}
              <div>
                <Label htmlFor="content">Text Content</Label>
                <Textarea
                  id="content"
                  name="content"
                  value={formData.content}
                  onChange={handleInputChange}
                  placeholder="Enter lesson content (text, notes, instructions, etc.)"
                  rows={10}
                  className="font-mono text-sm"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Add text content, notes, or instructions for this lesson
                </p>
              </div>

              {/* Estimated Duration */}
              <div>
                <Label htmlFor="estimatedDuration">Estimated Duration (minutes)</Label>
                <Input
                  id="estimatedDuration"
                  name="estimatedDuration"
                  type="number"
                  value={formData.estimatedDuration}
                  onChange={handleInputChange}
                  min="0"
                  placeholder="30"
                />
              </div>

              {/* Checkboxes */}
              <div className="flex gap-6">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    name="isFree"
                    checked={formData.isFree}
                    onChange={handleInputChange}
                    className="rounded"
                  />
                  <span className="text-sm">Free Preview</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    name="isPublished"
                    checked={formData.isPublished}
                    onChange={handleInputChange}
                    className="rounded"
                  />
                  <span className="text-sm">Published</span>
                </label>
              </div>
            </div>
          </Card>

          {/* Attachments Section */}
          <Card className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold">Attachments & Resources</h2>
              <label htmlFor="file-upload">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={uploading}
                  onClick={() => document.getElementById('file-upload')?.click()}
                  className="gap-2"
                >
                  {uploading ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Uploading...
                    </>
                  ) : (
                    <>
                      <Upload className="h-4 w-4" />
                      Upload Files
                    </>
                  )}
                </Button>
                <input
                  id="file-upload"
                  type="file"
                  multiple
                  onChange={handleFileUpload}
                  className="hidden"
                  accept="video/*,application/pdf,.doc,.docx,.ppt,.pptx"
                />
              </label>
            </div>

            {lesson.attachments && lesson.attachments.length > 0 ? (
              <div className="space-y-3">
                {lesson.attachments.map((attachment, index) => (
                  <div
                    key={attachment._id || index}
                    className="flex items-center justify-between p-4 border rounded-lg hover:bg-accent/50 transition-colors"
                  >
                    <div className="flex items-center gap-3 flex-1">
                      <div className="p-2 bg-primary/10 rounded-lg">
                        {getFileIcon(attachment.fileType)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate">{attachment.name}</p>
                        <p className="text-sm text-muted-foreground">
                          {attachment.fileType?.split('/')[1]?.toUpperCase() || 'FILE'} • {formatFileSize(attachment.size)}
                        </p>
                      </div>
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => setDeleteAttachmentId(attachment._id || null)}
                      className="text-destructive hover:text-destructive hover:bg-destructive/10"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-12 border-2 border-dashed rounded-lg">
                <Upload className="h-12 w-12 mx-auto mb-3 text-muted-foreground/50" />
                <p className="text-muted-foreground mb-4">No attachments yet</p>
                <p className="text-sm text-muted-foreground">
                  Upload videos, PDFs, or documents for this lesson
                </p>
              </div>
            )}
          </Card>

          {/* Action Buttons */}
          <div className="flex justify-end gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={() => navigate(`/courses/${courseId}`)}
              disabled={saving}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Saving...
                </>
              ) : (
                'Save Changes'
              )}
            </Button>
          </div>
        </form>

        {/* Delete Attachment Confirmation */}
        <AlertDialog open={!!deleteAttachmentId} onOpenChange={() => setDeleteAttachmentId(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete Attachment?</AlertDialogTitle>
              <AlertDialogDescription>
                This action cannot be undone. This will permanently delete the attachment from this lesson.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={() => deleteAttachmentId && handleDeleteAttachment(deleteAttachmentId)}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </DashboardLayout>
  );
}
