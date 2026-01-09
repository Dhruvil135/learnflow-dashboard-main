import { useWebSocket } from '@/hooks/useWebSocket';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

export const WebSocketProvider = ({ children }: { children: React.ReactNode }) => {
  const { user } = useAuth();

  // Only initialize WebSocket for instructors and admins
  useWebSocket({
    onNewSubmission: (data: any) => {
      console.log('📨 Instructor/Admin received new submission:', data);
      toast.success(`New submission from ${data.studentName}: ${data.score}% on "${data.examTitle}"`, {
        duration: 5000,
      });
    },
    onExamCreated: (data: any) => {
      console.log('📨 Admin received new exam created:', data);
      toast.info(`New exam "${data.examTitle}" created by instructor`, {
        duration: 4000,
      });
    },
    onExamStatusChanged: (data: any) => {
      console.log('📨 Admin received exam status change:', data);
      toast.info(`Exam "${data.examTitle}" ${data.newStatus}`, {
        duration: 4000,
      });
    },
  });

  return <>{children}</>;
};
