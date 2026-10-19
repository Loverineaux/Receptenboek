import Header from '@/components/layout/Header';
import BottomNav from '@/components/layout/BottomNav';
import TourProvider from '@/components/tour/TourProvider';

/**
 * Design v2: op mobiel geen globale kopbalk (elk scherm heeft zijn eigen kop),
 * 20px schermpadding en ruimte onderaan voor de tabbalk. Desktop: bovenbalk,
 * gecentreerde content. Full-bleed schermen (detailfoto's) gebruiken
 * `-mx-gutter -mt-3 md:mx-0 md:mt-0` om tegen de randen aan te lopen.
 */
export default function MainLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <TourProvider>
      <Header />
      <main className="mx-auto min-h-screen w-full max-w-6xl px-gutter pb-32 pt-3 md:px-8 md:pb-16 md:pt-8">
        {children}
      </main>
      <BottomNav />
    </TourProvider>
  );
}
