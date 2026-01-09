import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { 
  GraduationCap, 
  Sparkles, 
  Target, 
  ArrowRight,
  PlayCircle,
  CheckCircle,
  BarChart3
} from 'lucide-react';

export default function Index() {
  const features = [
    {
      icon: <Sparkles className="h-6 w-6" />,
      title: 'AI Exam Generation',
      description: 'Instantly create high-quality, comprehensive exams on any topic using our advanced AI engine.',
    },
    {
      icon: <Target className="h-6 w-6" />,
      title: 'Custom Practice Tests',
      description: 'Students can generate their own practice quizzes to master specific subjects at their own pace.',
    },
    {
      icon: <BarChart3 className="h-6 w-6" />,
      title: 'Real-Time Analytics',
      description: 'Track your learning journey with detailed performance reports and average score tracking.',
    },
  ];

  return (
    <div className="min-h-screen bg-background">
      {/* Navigation */}
      <nav className="fixed top-0 w-full z-50 bg-background/95 backdrop-blur border-b border-border">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2">
            <div className="p-2 rounded-lg gradient-primary">
              <GraduationCap className="h-5 w-5 text-primary-foreground" />
            </div>
            <span className="text-xl font-bold text-foreground">SkillForge</span>
          </Link>
          <Link to="/auth">
            <Button variant="hero">
              Get Started
              <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
          </Link>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="pt-32 pb-20 px-4 gradient-hero">
        <div className="container mx-auto text-center">
          <div className="max-w-3xl mx-auto animate-fade-in">
            <h1 className="text-4xl md:text-6xl font-bold text-primary-foreground leading-tight">
              Master New Skills,{' '}
              <span className="text-accent">Powered by AI</span>
            </h1>
            <p className="text-xl text-primary-foreground/80 mt-6 max-w-2xl mx-auto">
              The first platform that lets you generate custom exams instantly. 
              Learn faster, test smarter, and achieve your goals with SkillForge.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center mt-8">
              <Link to="/auth">
                <Button variant="accent" size="xl" className="gap-2">
                  <PlayCircle className="h-5 w-5" />
                  Start Learning 
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 px-4">
        <div className="container mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-foreground">Next-Gen Learning Tools</h2>
            <p className="text-muted-foreground mt-2">Leveraging AI to make education more interactive</p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {features.map((feature, i) => (
              <div 
                key={i}
                className="bg-card rounded-2xl border border-border p-8 hover:shadow-card-hover transition-all hover:-translate-y-1"
              >
                <div className="w-14 h-14 rounded-xl gradient-primary flex items-center justify-center text-primary-foreground mb-4">
                  {feature.icon}
                </div>
                <h3 className="text-xl font-semibold text-foreground mb-2">{feature.title}</h3>
                <p className="text-muted-foreground">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Roles Section */}
      <section className="py-20 px-4 bg-secondary/30">
        <div className="container mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-foreground">Tailored for Success</h2>
            <p className="text-muted-foreground mt-2">Specific tools built for every user role</p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {[
              {
                role: 'Student',
                features: [
                  'Generate AI practice quizzes',
                  'Track average exam scores',
                  'Real-time progress analytics',
                  'Achievement badges'
                ],
                gradient: 'from-[#2D6A64] to-[#2D6A64]/70',
              },
              {
                role: 'Instructor',
                features: [
                  'AI Exam Creator tool',
                  'Manage active assessments',
                  'Instant exam deletion',
                  'Monitor student performance'
                ],
                gradient: 'from-accent to-accent/70',
              },
              {
                role: 'Admin',
                features: [
                  'Global user management',
                  'System-wide analytics',
                  'Content moderation',
                  'Platform configuration'
                ],
                gradient: 'from-success to-success/70',
              },
            ].map((item, i) => (
              <div key={i} className="bg-card rounded-2xl border border-border overflow-hidden">
                <div className={`h-24 bg-gradient-to-r ${item.gradient} flex items-center justify-center`}>
                  <h3 className="text-2xl font-bold text-primary-foreground">{item.role}</h3>
                </div>
                <div className="p-6">
                  <ul className="space-y-3">
                    {item.features.map((feature, j) => (
                      <li key={j} className="flex items-center gap-2 text-foreground text-sm font-medium">
                        <CheckCircle className="h-5 w-5 text-success flex-shrink-0" />
                        {feature}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-4">
        <div className="container mx-auto">
          <div className="gradient-hero rounded-3xl p-12 text-center">
            <h2 className="text-3xl md:text-4xl font-bold text-primary-foreground mb-4">
              Ready to Build Your Future?
            </h2>
            <p className="text-primary-foreground/80 mb-8 max-w-xl mx-auto">
              Join SkillForge today. Generate your first AI exam in seconds and 
              start your personalized learning journey.
            </p>
            <Link to="/auth">
              <Button variant="accent" size="xl" className="gap-2">
                Create Your Account
                <ArrowRight className="h-5 w-5" />
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border py-8 px-4">
        <div className="container mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg gradient-primary">
              <GraduationCap className="h-4 w-4 text-primary-foreground" />
            </div>
            <span className="font-semibold text-foreground">SkillForge</span>
          </div>
          <p className="text-sm text-muted-foreground">
            © 2026 SkillForge. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
}