import { ChefHat } from 'lucide-react';

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="w-full max-w-md">
        <div className="mb-8 flex flex-col items-center gap-2">
          <ChefHat className="h-10 w-10 text-primary" />
          <span className="text-2xl font-bold text-primary">Receptenboek</span>
        </div>
        <div className="rounded-xl bg-surface p-6 shadow-sm">
          {children}
        </div>
      </div>
    </div>
  );
}
