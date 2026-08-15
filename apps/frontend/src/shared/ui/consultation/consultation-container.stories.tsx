import type { Meta, StoryObj } from '@storybook/react';
import { User } from 'lucide-react';
import { EmptyWorkspace } from '@/shared/ui/layout/empty-workspace';
import { ConsultationContainer } from './consultation-container';

const meta: Meta = { title: 'UI/Consultation/ConsultationContainer' };
export default meta;

export const Default: StoryObj = {
  render: () => (
    <ConsultationContainer
      leftNav={
        <nav aria-label="Consultation sections" className="flex flex-col gap-1 text-sm text-text-secondary">
          <span className="rounded-md bg-primary-subtle px-2 py-1.5 font-medium text-primary-emphasis">Overview</span>
          <span className="px-2 py-1.5">Vitals</span>
          <span className="px-2 py-1.5">Notes</span>
          <span className="px-2 py-1.5">History</span>
        </nav>
      }
      rightPanel={<EmptyWorkspace icon={User} title="Patient information" />}
    >
      <EmptyWorkspace icon={User} title="Overview" description="This section will be available once the Consultation module is built." />
    </ConsultationContainer>
  ),
};
