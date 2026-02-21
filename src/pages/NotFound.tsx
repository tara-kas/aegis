import { useLocation } from 'react-router-dom';
import { useEffect } from 'react';
import { ThemeToggle } from '@/components/ThemeToggle';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { signOut } from '@/lib/supabase-helpers';
import { LogOut } from 'lucide-react';

export default function NotFound() {
  const location = useLocation();
  const { user } = useAuth();

  useEffect(() => {
    console.error('404 Error: User attempted to access non-existent route:', location.pathname);
  }, [location.pathname]);

  return (
    <div className="relative flex min-h-screen items-center justify-center bg-background">
      <div className="absolute right-4 top-4 flex items-center gap-2">
        <ThemeToggle />
        {user && (
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => signOut()}>
            <LogOut className="h-4 w-4" />
          </Button>
        )}
      </div>
      <div className="text-center">
        <h1 className="mb-4 text-4xl font-bold">404</h1>
        <p className="mb-4 text-xl text-muted-foreground">Page not found</p>
        <a href="/" className="text-primary underline hover:text-primary/90">
          Return to Home
        </a>
      </div>
    </div>
  );
}
