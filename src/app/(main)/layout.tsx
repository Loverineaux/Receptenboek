import dynamic from 'next/dynamic';
import Header from '@/components/layout/Header';

const FabButton = dynamic(() => import('@/components/layout/FabButton'));

export default function MainLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <Header />
      <main className="mx-auto min-h-[calc(100vh-8rem)] max-w-7xl px-4 py-6 pb-24 sm:px-6 md:pb-6">
        {children}
      </main>
      <FabButton />
    </>
  );
}
