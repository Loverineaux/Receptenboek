import Header from '@/components/layout/Header';
import FabButton from '@/components/layout/FabButton';
import TourProvider from '@/components/tour/TourProvider';

export default function MainLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <TourProvider>
      <Header />
      <main className="mx-auto min-h-[calc(100vh-8rem)] max-w-7xl px-4 py-6 pb-24 sm:px-6 md:pb-6">
        {children}
      </main>
      <FabButton />
    </TourProvider>
  );
}
