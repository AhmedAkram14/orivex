import { DoctorGridSkeleton } from '@/features/public-site/components/doctor-search/doctor-card-skeleton';
import { PageHeroSkeleton } from '@/features/public-site/components/skeleton-card';
import { Container } from '@/shared/ui/container';
import { Skeleton } from '@/shared/ui/skeleton';

export default function SpecialtyLoading() {
  return (
    <main aria-busy="true">
      <PageHeroSkeleton />
      <Container size="lg" className="grid grid-cols-1 gap-4 py-(--section-y) lg:grid-cols-2">
        <Skeleton className="h-48 w-full" />
        <Skeleton className="h-48 w-full" />
      </Container>
      <Container size="xl" className="flex flex-col gap-6 pb-(--section-y)">
        <Skeleton className="h-8 w-64" />
        <DoctorGridSkeleton />
      </Container>
    </main>
  );
}
