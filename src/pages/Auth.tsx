import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth, UserRole } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  GraduationCap,
  Mail,
  Lock,
  User,
  ArrowRight,
  Eye,
  EyeOff
} from 'lucide-react';
import { toast } from 'sonner';
import { authApi } from '@/services/api';

export default function Auth() {
  const [isLogin, setIsLogin] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: '',
    role: 'student' as UserRole,
  });

  const { login: contextLogin } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      if (isLogin) {
        // LOGIN with real API
        const response = await authApi.login({
          email: formData.email,
          password: formData.password
        });

        console.log('✅ Login Response:', response);

        if (response?.data?.token && response?.data?.user) {
          // Store token
          localStorage.setItem('token', response.data.token);
          localStorage.setItem('skillforge_token', response.data.token);

          // ✅ UPDATED: await the login function to fetch fresh user data
          await contextLogin(response.data.user);

          toast.success('Welcome back!');

          // Navigate based on role
          const role = response.data.user.role;
          if (role === 'admin') {
            navigate('/admin');
          } else if (role === 'instructor') {
            navigate('/instructor');
          } else {
            navigate('/student');
          }
        } else {
          toast.error('Invalid response from server');
        }
      } else {
        // REGISTER with real API
        const response = await authApi.register({
          username: formData.username,
          email: formData.email,
          password: formData.password,
          role: formData.role
        });

        console.log('✅ Register Response:', response);

        if (response?.data?.token && response?.data?.user) {
          // Store token
          localStorage.setItem('token', response.data.token);
          localStorage.setItem('skillforge_token', response.data.token);

          // ✅ UPDATED: await the login function to fetch fresh user data
          await contextLogin(response.data.user);

          toast.success('Account created successfully!');

          // Navigate based on role
          const role = response.data.user.role;
          if (role === 'admin') {
            navigate('/admin');
          } else if (role === 'instructor') {
            navigate('/instructor');
          } else {
            navigate('/student');
          }
        } else {
          toast.error('Invalid response from server');
        }
      }
    } catch (error: any) {
      console.error('❌ Auth Error:', error);
      toast.error(error.message || 'Authentication failed');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen gradient-hero flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8 animate-fade-in">
          <div className="inline-flex items-center justify-center p-4 rounded-2xl bg-primary-foreground/10 backdrop-blur-sm mb-4">
            <GraduationCap className="h-10 w-10 text-primary-foreground" />
          </div>
          <h1 className="text-3xl font-bold text-primary-foreground">SkillForge</h1>
          <p className="text-primary-foreground/80 mt-2">Your journey to mastery starts here</p>
        </div>

        {/* Auth Card */}
        <div className="bg-card rounded-2xl shadow-xl p-8 animate-slide-up" style={{ animationDelay: '0.1s' }}>
          {/* Toggle */}
          <div className="flex rounded-lg bg-secondary p-1 mb-6">
            <button
              className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-all ${isLogin
                ? 'bg-card text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
                }`}
              onClick={() => setIsLogin(true)}
            >
              Log In
            </button>
            <button
              className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-all ${!isLogin
                ? 'bg-card text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
                }`}
              onClick={() => setIsLogin(false)}
            >
              Sign Up
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {!isLogin && (
              <div className="space-y-2">
                <Label htmlFor="username" className="text-foreground">Username</Label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="username"
                    type="text"
                    placeholder="johndoe"
                    className="pl-10"
                    value={formData.username}
                    onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                    required={!isLogin}
                  />
                </div>
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="email" className="text-foreground">Email</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="email"
                  type="email"
                  placeholder="you@example.com"
                  className="pl-10"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="password" className="text-foreground">Password</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="••••••••"
                  className="pl-10 pr-10"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  required
                  minLength={6}
                />
                <button
                  type="button"
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>

              {/* ✅ NEW: Forgot Password Link (Login only) */}
              {isLogin && (
                <div className="text-right">
                  <Link
                    to="/forgot-password"
                    className="text-sm text-primary hover:underline"
                  >
                    Forgot Password?
                  </Link>
                </div>
              )}
            </div>

            {!isLogin && (
              <div className="space-y-2">
                <Label className="text-foreground">Role</Label>
                <div className="grid grid-cols-3 gap-2">
                  {(['student', 'instructor', 'admin'] as UserRole[]).map((role) => (
                    <button
                      key={role}
                      type="button"
                      className={`py-2 px-3 rounded-lg text-sm font-medium transition-all ${formData.role === role
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-secondary text-secondary-foreground hover:bg-secondary/80'
                        }`}
                      onClick={() => setFormData({ ...formData, role })}
                    >
                      {role.charAt(0).toUpperCase() + role.slice(1)}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <Button
              type="submit"
              variant="default"
              size="lg"
              className="w-full mt-6"
              disabled={isLoading}
            >
              {isLoading ? 'Please wait...' : (isLogin ? 'Log In' : 'Create Account')}
              <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}
