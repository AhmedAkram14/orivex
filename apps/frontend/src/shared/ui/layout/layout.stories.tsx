import type { Meta, StoryObj } from '@storybook/react';
import { LayoutDashboard, Stethoscope, Users } from 'lucide-react';
import { Icon } from '@/shared/icons/icon';
import { Content } from './content';
import { Footer } from './footer';
import { MetricStat } from '../metric-stat';
import { PageContainer } from './page-container';
import { PageHeader } from './page-header';
import { Section } from './section';
import { Sidebar, SidebarSection, SidebarSectionLabel } from './sidebar';
import { Topbar } from './topbar';

const meta: Meta = { title: 'UI/Layout' };
export default meta;

export const AppShellSkeleton: StoryObj = {
  render: () => (
    <div className="flex h-[560px] flex-col border border-border-default">
      <Topbar>
        <span className="font-semibold text-text-primary">Orivex</span>
      </Topbar>
      <div className="flex flex-1 overflow-hidden">
        <Sidebar>
          <SidebarSection>
            <SidebarSectionLabel>Main</SidebarSectionLabel>
            <div className="flex items-center gap-2 rounded-sm px-2 py-1.5 text-sm text-text-primary">
              <Icon icon={LayoutDashboard} size="sm" /> Dashboard
            </div>
            <div className="flex items-center gap-2 rounded-sm px-2 py-1.5 text-sm text-text-secondary">
              <Icon icon={Users} size="sm" /> Patients
            </div>
          </SidebarSection>
        </Sidebar>
        <Content>
          <PageContainer size="full">
            <PageHeader title="Dashboard" description="Today's overview" />
            <Section title="Key metrics">
              <div className="grid grid-cols-3 gap-4">
                <MetricStat label="Today's appointments" value="24" delta={{ label: '+12.4%', direction: 'up', tone: 'success' }} />
                <MetricStat icon={Stethoscope} label="Active doctors" value="8" />
                <MetricStat icon={Users} label="Active patients" value="312" />
              </div>
            </Section>
          </PageContainer>
        </Content>
      </div>
      <Footer>© Orivex</Footer>
    </div>
  ),
};
