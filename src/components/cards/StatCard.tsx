import { ReactNode } from 'react';
import { TrendingUp, TrendingDown } from 'lucide-react';

interface StatCardProps {
  title: string;
  value: string | number;
  icon: ReactNode;
  trend?: number;
  subtitle?: string;
  variant?: 'default' | 'primary' | 'accent' | 'success';
}

export function StatCard({ title, value, icon, trend, subtitle, variant = 'default' }: StatCardProps) {
  const getVariantStyles = () => {
    switch (variant) {
      case 'primary':
        return 'bg-primary/5 border-primary/20';
      case 'accent':
        return 'bg-accent/5 border-accent/20';
      case 'success':
        return 'bg-success/5 border-success/20';
      default:
        return 'bg-card border-border';
    }
  };

  const getIconStyles = () => {
    switch (variant) {
      case 'primary':
        return 'bg-primary/10 text-primary';
      case 'accent':
        return 'bg-accent/10 text-accent';
      case 'success':
        return 'bg-success/10 text-success';
      default:
        return 'bg-secondary text-secondary-foreground';
    }
  };

  return (
    <div className={`rounded-xl border p-6 ${getVariantStyles()} transition-all hover:shadow-card`}>
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm text-muted-foreground">{title}</p>
          <p className="text-3xl font-bold text-foreground mt-1">{value}</p>
          {subtitle && (
            <p className="text-xs text-muted-foreground mt-1">{subtitle}</p>
          )}

        </div>
        <div className={`p-3 rounded-lg ${getIconStyles()}`}>
          {icon}
        </div>
      </div>
    </div>
  );
}
