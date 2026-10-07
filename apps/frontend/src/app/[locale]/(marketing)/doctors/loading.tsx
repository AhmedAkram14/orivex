import { DoctorGridSkeleton } from '@/features/public-site/components/doctor-search/doctor-card-skeleton';
import { PageHeroSkeleton } from '@/features/public-site/components/skeleton-card';
import { Container } from '@/shared/ui/container';
import { Skeleton } from '@/shared/ui/skeleton';

export default function DoctorsLoading() {
  return (
    <main aria-busy="true">
      <PageHeroSkeleton />
      <Container size="xl" className="grid grid-cols-1 gap-8 py-(--section-y) lg:grid-cols-[17rem_minmax(0,1fr)]">
        <Skeleton className="hidden h-[32rem] w-full lg:block" />
        <div className="flex flex-col gap-4">
          <Skeleton className="h-10 w-full" />
          <DoctorGridSkeleton />
        </div>
      </Container>
    </main>
  );
}
