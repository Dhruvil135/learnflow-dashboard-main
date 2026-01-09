import { Lesson } from '@/data/mockData';
import { PlayCircle, FileText, HelpCircle, Clock, User } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Progress } from '@/components/ui/progress';

interface LessonCardProps {
  lesson: Lesson;
}

export function LessonCard({ lesson }: LessonCardProps) {
  const getTypeIcon = () => {
    switch (lesson.type) {
      case 'video': return <PlayCircle className="h-5 w-5" />;
      case 'pdf': return <FileText className="h-5 w-5" />;
      case 'quiz': return <HelpCircle className="h-5 w-5" />;
    }
  };

  const getTypeColor = () => {
    switch (lesson.type) {
      case 'video': return 'bg-primary/10 text-primary';
      case 'pdf': return 'bg-accent/10 text-accent';
      case 'quiz': return 'bg-success/10 text-success';
    }
  };

  return (
    <Link 
      to={`/lesson/${lesson.id}`}
      className="group block"
    >
      <div className="bg-card rounded-xl border border-border overflow-hidden shadow-card hover:shadow-card-hover transition-all duration-300 hover:-translate-y-1">
        {/* Thumbnail */}
        <div className="relative h-40 bg-gradient-to-br from-primary/5 to-primary/10 flex items-center justify-center">
          <div className={`p-4 rounded-full ${getTypeColor()} group-hover:scale-110 transition-transform`}>
            {getTypeIcon()}
          </div>
          <div className="absolute top-3 right-3">
            <span className={`px-2 py-1 rounded-full text-xs font-medium ${getTypeColor()}`}>
              {lesson.type.toUpperCase()}
            </span>
          </div>
        </div>

        {/* Content */}
        <div className="p-4">
          <h3 className="font-semibold text-foreground group-hover:text-primary transition-colors line-clamp-1">
            {lesson.title}
          </h3>
          <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
            {lesson.description}
          </p>

          <div className="flex items-center gap-4 mt-3 text-xs text-muted-foreground">
            <span className="flex items-center gap-1">
              <Clock className="h-3 w-3" />
              {lesson.duration}
            </span>
            <span className="flex items-center gap-1">
              <User className="h-3 w-3" />
              {lesson.instructor}
            </span>
          </div>

          {/* Progress */}
          {lesson.progress !== undefined && lesson.progress > 0 && (
            <div className="mt-3">
              <div className="flex justify-between text-xs mb-1">
                <span className="text-muted-foreground">Progress</span>
                <span className="text-primary font-medium">{lesson.progress}%</span>
              </div>
              <Progress value={lesson.progress} className="h-1.5" />
            </div>
          )}
        </div>
      </div>
    </Link>
  );
}
