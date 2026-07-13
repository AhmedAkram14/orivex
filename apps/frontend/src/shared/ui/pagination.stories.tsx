import type { Meta, StoryObj } from '@storybook/react';
import { useState } from 'react';
import { Pagination } from './pagination';

const meta: Meta = { title: 'UI/Pagination' };
export default meta;

export const Default: StoryObj = {
  render: function Render() {
    const [page, setPage] = useState(1);
    return <Pagination page={page} pageCount={5} onPageChange={setPage} className="max-w-sm" />;
  },
};
