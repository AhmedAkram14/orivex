import { PageHeroSkeleton, SkeletonCard } from '@/features/public-site/components/skeleton-card';
import { Container } from '@/shared/ui/container';
import { Skeleton } from '@/shared/ui/skeleton';

export default function SpecialtiesLoading() {
  return (
    <main aria-busy="true">
      <PageHeroSkeleton />
      <Container size="lg" className="flex flex-col gap-6 py-(--section-y)">
        <Skeleton className="h-8 w-56" />
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, index) => (
            <SkeletonCard key={index} />
          ))}
        </div>
      </Container>
    </main>
  );
}
