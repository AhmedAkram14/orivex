import type { Meta, StoryObj } from '@storybook/react';
import { Badge } from './badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './table';

const meta: Meta = { title: 'UI/Table' };
export default meta;

export const Default: StoryObj = {
  render: () => (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Patient</TableHead>
          <TableHead>Doctor</TableHead>
          <TableHead>Status</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        <TableRow>
          <TableCell>Ahmed Hassan</TableCell>
          <TableCell>Dr. Sarah Ahmed</TableCell>
          <TableCell><Badge variant="success">Confirmed</Badge></TableCell>
        </TableRow>
        <TableRow>
          <TableCell>Mona Youssef</TableCell>
          <TableCell>Dr. Karim Adel</TableCell>
          <TableCell><Badge variant="warning">Pending</Badge></TableCell>
        </TableRow>
      </TableBody>
    </Table>
  ),
};
