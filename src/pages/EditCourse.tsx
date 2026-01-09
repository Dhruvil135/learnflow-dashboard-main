import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { courseApi } from '@/services/api';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { ArrowLeft, Loader2, Save, Upload, X, Image as ImageIcon, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
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


export default function EditCourse() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [currentThumbnail, setCurrentThumbnail] = useState<{ url: string; publicId: string } | null>(null);
  const [newThumbnail, setNewThumbnail] = useState<File | null>(null);
  const [thumbnailPreview, setThumbnailPreview] = useState<string | null>(null);
  const [removingThumbnail, setRemovingThumbnail] = useState(false);
  const [showRemoveDialog, setShowRemoveDialog] = useState(false);

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    category: '',
    level: '',
    price: 0,
    tags: '',
    estimatedDuration: {
      hours: 0,
      minutes: 0
    }
  });

  useEffect(() => {
    const fetchCourse = async () => {
      try {
        const response = await courseApi.getCourseById(id!);
        const courseData = response.data?.course || response.course || response;

        setFormData({
          title: courseData.title || '',
          description: courseData.description || '',
          category: courseData.category || '',
          level: courseData.level || '',
          price: courseData.price || 0,
          tags: courseData.tags?.join(', ') || '',
          estimatedDuration: courseData.estimatedDuration || { hours: 0, minutes: 0 }
        });

        // Set current thumbnail if exists
        if (courseData.thumbnail) {
          setCurrentThumbnail(courseData.thumbnail);
        }
      } catch (error) {
        console.error('Failed to load course:', error);
        toast.error('Failed to load course');
        navigate('/courses');
      } finally {
        setLoading(false);
      }
    };

    if (id) {
      fetchCourse();
    }
  }, [id, navigate]);

  const handleThumbnailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      
      // Validate file type
      if (!file.type.startsWith('image/')) {
        toast.error('Please select a valid image file');
        return;
      }

      // Validate file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        toast.error('Image size should be less than 5MB');
        return;
      }

      setNewThumbnail(file);
      
      // Create preview URL
      const reader = new FileReader();
      reader.onloadend = () => {
        setThumbnailPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const cancelNewThumbnail = () => {
    setNewThumbnail(null);
    setThumbnailPreview(null);
    const fileInput = document.getElementById('thumbnail') as HTMLInputElement;
    if (fileInput) fileInput.value = '';
  };

  const handleRemoveThumbnail = async () => {
    if (!currentThumbnail) return;
    
    setRemovingThumbnail(true);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`http://localhost:8080/api/courses/${id}/thumbnail`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        throw new Error('Failed to remove thumbnail');
      }

      setCurrentThumbnail(null);
      toast.success('Thumbnail removed successfully');
    } catch (error: any) {
      console.error('Failed to remove thumbnail:', error);
      toast.error(error.message || 'Failed to remove thumbnail');
    } finally {
      setRemovingThumbnail(false);
      setShowRemoveDialog(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!user) {
      toast.error('You must be logged in');
      return;
    }

    setSaving(true);
    try {
      const formDataToSend = new FormData();
      
      formDataToSend.append('title', formData.title);
      formDataToSend.append('description', formData.description);
      formDataToSend.append('category', formData.category);
      formDataToSend.append('level', formData.level);
      formDataToSend.append('price', formData.price.toString());
      formDataToSend.append('instructor', user.id || user._id);
      
      // Handle tags
      const tagsArray = formData.tags.split(',').map(tag => tag.trim()).filter(Boolean);
      formDataToSend.append('tags', tagsArray.join(','));
      
      // Handle duration
      formDataToSend.append('estimatedDuration[hours]', formData.estimatedDuration.hours.toString());
      formDataToSend.append('estimatedDuration[minutes]', formData.estimatedDuration.minutes.toString());

      // ✅ Add new thumbnail if selected
      if (newThumbnail) {
        formDataToSend.append('thumbnail', newThumbnail);
      }

      const token = localStorage.getItem('token');
      const response = await fetch(`http://localhost:8080/api/courses/${id}`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formDataToSend
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to update course');
      }

      const data = await response.json();
      console.log('✅ Course updated successfully:', data);
      
      toast.success('Course updated successfully!');
      navigate(`/courses/${id}`);
    } catch (error: any) {
      console.error('❌ Failed to update course:', error);
      toast.error(error.message || 'Failed to update course');
    } finally {
      setSaving(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    
    if (name === 'hours' || name === 'minutes') {
      setFormData(prev => ({
        ...prev,
        estimatedDuration: {
          ...prev.estimatedDuration,
          [name]: parseInt(value) || 0
        }
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        [name]: name === 'price' ? parseFloat(value) || 0 : value
      }));
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

  return (
    <DashboardLayout>
      <div className="max-w-3xl mx-auto space-y-6 animate-fade-in">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate(`/courses/${id}`)}
              className="gap-2"
            >
              <ArrowLeft className="h-4 w-4" />
              Back
            </Button>
            <h1 className="text-3xl font-bold">Edit Course</h1>
          </div>
        </div>

        {/* Form */}
        <Card className="p-6">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Title */}
            <div className="space-y-2">
              <Label htmlFor="title">Course Title *</Label>
              <Input
                id="title"
                name="title"
                value={formData.title}
                onChange={handleChange}
                placeholder="e.g., Complete JavaScript Course"
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
                placeholder="Describe what students will learn..."
                rows={5}
                required
              />
            </div>

            {/* Category & Level */}
            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="category">Category *</Label>
                <select
                  id="category"
                  name="category"
                  value={formData.category}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border rounded-md"
                  required
                >
                  <option value="">Select Category</option>
                  <option value="programming">Programming</option>
                  <option value="design">Design</option>
                  <option value="business">Business</option>
                  <option value="marketing">Marketing</option>
                  <option value="data-science">Data Science</option>
                  <option value="other">Other</option>
                </select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="level">Level *</Label>
                <select
                  id="level"
                  name="level"
                  value={formData.level}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border rounded-md"
                  required
                >
                  <option value="">Select Level</option>
                  <option value="beginner">Beginner</option>
                  <option value="intermediate">Intermediate</option>
                  <option value="advanced">Advanced</option>
                </select>
              </div>
            </div>

            {/* Price */}
            <div className="space-y-2">
              <Label htmlFor="price">Price (USD) *</Label>
              <Input
                id="price"
                name="price"
                type="number"
                min="0"
                step="0.01"
                value={formData.price}
                onChange={handleChange}
                placeholder="0 for free"
              />
            </div>

            {/* Duration */}
            <div className="space-y-2">
              <Label>Estimated Duration</Label>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="hours">Hours</Label>
                  <Input
                    id="hours"
                    name="hours"
                    type="number"
                    min="0"
                    value={formData.estimatedDuration.hours}
                    onChange={handleChange}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="minutes">Minutes</Label>
                  <Input
                    id="minutes"
                    name="minutes"
                    type="number"
                    min="0"
                    max="59"
                    value={formData.estimatedDuration.minutes}
                    onChange={handleChange}
                  />
                </div>
              </div>
            </div>

            {/* Tags */}
            <div className="space-y-2">
              <Label htmlFor="tags">Tags (comma-separated)</Label>
              <Input
                id="tags"
                name="tags"
                value={formData.tags}
                onChange={handleChange}
                placeholder="e.g., javascript, react, frontend"
              />
            </div>

            {/* ✅ NEW: Thumbnail Management Section */}
            <div className="space-y-3 pt-4 border-t">
              <div className="flex items-center justify-between">
                <Label>Course Thumbnail</Label>
                {currentThumbnail && !thumbnailPreview && (
                  <Button
                    type="button"
                    variant="destructive"
                    size="sm"
                    onClick={() => setShowRemoveDialog(true)}
                    className="gap-2"
                  >
                    <Trash2 className="h-4 w-4" />
                    Remove Current
                  </Button>
                )}
              </div>

              {/* Show new thumbnail preview if uploading */}
              {thumbnailPreview ? (
                <div className="relative w-full h-64 border-2 border-dashed border-primary/50 rounded-lg overflow-hidden bg-muted/30">
                  <img
                    src={thumbnailPreview}
                    alt="New thumbnail preview"
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute top-2 right-2 flex gap-2">
                    <Button
                      type="button"
                      variant="secondary"
                      size="sm"
                      onClick={() => document.getElementById('thumbnail')?.click()}
                      className="shadow-lg"
                    >
                      <Upload className="h-4 w-4 mr-2" />
                      Change
                    </Button>
                    <Button
                      type="button"
                      variant="destructive"
                      size="sm"
                      onClick={cancelNewThumbnail}
                      className="shadow-lg"
                    >
                      <X className="h-4 w-4 mr-2" />
                      Cancel
                    </Button>
                  </div>
                  <div className="absolute bottom-2 left-2 bg-green-600 text-white px-3 py-1 rounded text-sm font-medium">
                    ✓ New Thumbnail (will replace on save)
                  </div>
                </div>
              ) : currentThumbnail ? (
                // Show current thumbnail
                <div className="relative w-full h-64 border-2 border-muted rounded-lg overflow-hidden bg-muted/30">
                  <img
                    src={currentThumbnail.url}
                    alt="Current thumbnail"
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute top-2 right-2">
                    <Button
                      type="button"
                      variant="secondary"
                      size="sm"
                      onClick={() => document.getElementById('thumbnail')?.click()}
                      className="shadow-lg"
                    >
                      <Upload className="h-4 w-4 mr-2" />
                      Replace
                    </Button>
                  </div>
                  <div className="absolute bottom-2 left-2 bg-black/70 text-white px-3 py-1 rounded text-sm">
                    Current Thumbnail
                  </div>
                </div>
              ) : (
                // No thumbnail - show upload zone
                <div
                  onClick={() => document.getElementById('thumbnail')?.click()}
                  className="w-full h-64 border-2 border-dashed border-muted-foreground/25 rounded-lg flex flex-col items-center justify-center gap-3 cursor-pointer hover:border-primary/50 hover:bg-muted/50 transition-colors"
                >
                  <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center">
                    <ImageIcon className="h-8 w-8 text-muted-foreground" />
                  </div>
                  <div className="text-center">
                    <p className="text-sm font-medium">Click to upload course thumbnail</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      PNG, JPG or WEBP (max 5MB)
                    </p>
                  </div>
                  <Button type="button" variant="secondary" size="sm">
                    <Upload className="h-4 w-4 mr-2" />
                    Choose File
                  </Button>
                </div>
              )}

              <Input
                id="thumbnail"
                type="file"
                accept="image/*"
                onChange={handleThumbnailChange}
                className="hidden"
              />
              
              <p className="text-xs text-muted-foreground">
                Recommended size: 1280x720px (16:9 ratio) for best display
              </p>
            </div>

            {/* Submit Button */}
            <div className="flex gap-3 pt-4 border-t">
              <Button
                type="submit"
                disabled={saving}
                className="gap-2"
              >
                {saving ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4" />
                    Save Changes
                  </>
                )}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => navigate(`/courses/${id}`)}
              >
                Cancel
              </Button>
            </div>
          </form>
        </Card>

        {/* ✅ Remove Thumbnail Confirmation Dialog */}
        <AlertDialog open={showRemoveDialog} onOpenChange={setShowRemoveDialog}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Remove Thumbnail?</AlertDialogTitle>
              <AlertDialogDescription>
                This will permanently remove the current course thumbnail. You can always upload a new one later.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={removingThumbnail}>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleRemoveThumbnail}
                disabled={removingThumbnail}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                {removingThumbnail ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    Removing...
                  </>
                ) : (
                  'Remove'
                )}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </DashboardLayout>
  );
}
