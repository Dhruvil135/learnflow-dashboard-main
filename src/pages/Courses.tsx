import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { courseApi } from '@/services/api';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  BookOpen, 
  Clock, 
  Users,
  Loader2,
  Search
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';

export default function Courses() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [courses, setCourses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterLevel, setFilterLevel] = useState<string>('all');

  useEffect(() => {
    console.log('🔥🔥🔥 COURSES PAGE LOADED - VERSION 2.0 🔥🔥🔥');
    
    const fetchCourses = async () => {
      try {
        let res;
        
        console.log('👤 Current user:', user);
        console.log('👤 User role:', user?.role);
        
        if (user?.role === 'instructor') {
          console.log('🧑‍🏫 Instructor detected - calling getMyCourses()');
          res = await courseApi.getMyCourses();
          console.log('📦 getMyCourses() response:', res);
        } else {
          console.log('👨‍🎓 Student/Guest - calling getAllCourses()');
          res = await courseApi.getAllCourses();
          console.log('📦 getAllCourses() response:', res);
        }
        
        // Handle API response
        let courseList: any[] = [];
        if (Array.isArray(res)) {
          courseList = res;
        } else if (Array.isArray(res?.data?.courses)) {
          courseList = res.data.courses;
        } else if (Array.isArray(res?.data)) {
          courseList = res.data;
        } else if (Array.isArray(res?.courses)) {
          courseList = res.courses;
        }

        console.log('✅ Parsed course list:', courseList);
        console.log('📊 Course count:', courseList.length);
        
        // ✅ FIXED: Role-based filtering
        let visibleCourses: any[] = [];

        if (user?.role === 'admin') {
          visibleCourses = courseList;
          console.log('👨‍💼 Admin - showing all courses');
        } else if (user?.role === 'instructor') {
          visibleCourses = courseList;
          console.log('🧑‍🏫 Instructor - showing MY courses only');
        } else if (user?.role === 'student') {
          visibleCourses = courseList.filter(c => c.status === 'published');
          console.log('👨‍🎓 Student - showing published courses only');
        } else {
          visibleCourses = courseList.filter(c => c.status === 'published');
          console.log('🌐 Guest - showing published courses only');
        }

        console.log('📚 Total courses from API:', courseList.length);
        console.log('✅ Visible courses after filter:', visibleCourses.length);
        console.log('🎯 Final courses to display:', visibleCourses);
        
        setCourses(visibleCourses);
      } catch (error) {
        console.error('❌ Failed to load courses:', error);
        toast.error('Could not load courses');
        setCourses([]);
      } finally {
        setLoading(false);
      }
    };

    fetchCourses();
  }, [user]);

  // ✅ Case-insensitive filtering
  const filteredCourses = courses.filter(course => {
    const matchesSearch = course.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         course.description?.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesLevel = filterLevel === 'all' || 
                        course.level?.toLowerCase() === filterLevel.toLowerCase();
    
    return matchesSearch && matchesLevel;
  });

  return (
    <DashboardLayout>
      <div className="space-y-8 animate-fade-in">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold text-foreground mb-2">
            {user?.role === 'instructor' ? 'My Courses' : 'Explore Courses'}
          </h1>
          <p className="text-muted-foreground">
            {user?.role === 'instructor' 
              ? `Manage your ${courses.length} courses`
              : `Discover ${courses.length} courses to enhance your skills`
            }
          </p>
        </div>

        {/* Search & Filters */}
        <div className="flex flex-col md:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search courses..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          
          <div className="flex gap-2 flex-wrap">
            <Button
              variant={filterLevel === 'all' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setFilterLevel('all')}
            >
              All Levels
            </Button>
            <Button
              variant={filterLevel === 'beginner' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setFilterLevel('beginner')}
            >
              Beginner
            </Button>
            <Button
              variant={filterLevel === 'intermediate' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setFilterLevel('intermediate')}
            >
              Intermediate
            </Button>
            <Button
              variant={filterLevel === 'advanced' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setFilterLevel('advanced')}
            >
              Advanced
            </Button>
          </div>
        </div>

        {/* Course Grid */}
        {loading ? (
          <div className="flex flex-col items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary mb-2" />
            <p className="text-sm text-muted-foreground">Loading courses...</p>
          </div>
        ) : filteredCourses.length === 0 ? (
          <div className="text-center py-16 border-2 border-dashed rounded-xl bg-muted/5">
            <div className="mx-auto h-16 w-16 bg-muted rounded-full flex items-center justify-center mb-4">
              <BookOpen className="h-8 w-8 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-semibold mb-2">No courses found</h3>
            <p className="text-muted-foreground text-sm">
              {searchQuery || filterLevel !== 'all' 
                ? 'Try adjusting your filters or search query' 
                : user?.role === 'instructor'
                  ? 'Create your first course to get started'
                  : 'No courses available yet'}
            </p>
            {user?.role === 'instructor' && (
              <Button 
                onClick={() => navigate('/courses/create')}
                className="mt-4"
              >
                Create Course
              </Button>
            )}
          </div>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredCourses.map((course) => (
              <Card
                key={course._id}
                className="group overflow-hidden hover:shadow-lg hover:border-primary/50 transition-all cursor-pointer"
                onClick={() => navigate(`/courses/${course._id}`)}
              >
                {/* Course Thumbnail */}
                <div className="relative h-48 bg-gradient-to-br from-primary/10 to-primary/5 overflow-hidden">
                  {course.thumbnail?.url ? (
                    <img
                      src={course.thumbnail.url}
                      alt={course.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      onError={(e) => {
                        e.currentTarget.style.display = 'none';
                      }}
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <BookOpen className="h-16 w-16 text-primary/40" />
                    </div>
                  )}
                  
                  {/* Level Badge */}
                  <Badge className="absolute top-3 right-3 bg-white/95 backdrop-blur-sm text-foreground shadow-sm capitalize">
                    {course.level || 'beginner'}
                  </Badge>

                  {/* Status Badge (for instructors) */}
                  {user?.role === 'instructor' && (
                    <Badge 
                      className={`absolute top-3 left-3 backdrop-blur-sm shadow-sm ${
                        course.status === 'published' 
                          ? 'bg-green-500/90 text-white'
                          : 'bg-yellow-500/90 text-white'
                      }`}
                    >
                      {course.status}
                    </Badge>
                  )}
                </div>

                {/* Course Info */}
                <div className="p-5 space-y-3">
                  {/* Category Badge */}
                  <Badge variant="secondary" className="text-xs capitalize">
                    {course.category || 'other'}
                  </Badge>

                  {/* Title */}
                  <h3 className="font-bold text-lg line-clamp-1 group-hover:text-primary transition-colors">
                    {course.title}
                  </h3>

                  {/* Description */}
                  <p className="text-sm text-muted-foreground line-clamp-2 min-h-[40px]">
                    {course.description || 'No description available'}
                  </p>

                  {/* Course Meta */}
                  <div className="flex items-center justify-between pt-3 border-t text-xs text-muted-foreground">
                    <div className="flex items-center gap-1">
                      <BookOpen className="h-3.5 w-3.5" />
                      <span>{course.lessons?.length || 0} Lessons</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Clock className="h-3.5 w-3.5" />
                      <span>
                        {course.estimatedDuration?.hours || 0}h {course.estimatedDuration?.minutes || 0}m
                      </span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Users className="h-3.5 w-3.5" />
                      <span>{course.enrolledStudents?.length || 0} Students</span>
                    </div>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
