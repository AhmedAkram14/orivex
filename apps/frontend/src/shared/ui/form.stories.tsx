import { zodResolver } from '@hookform/resolvers/zod';
import type { Meta, StoryObj } from '@storybook/react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { Button } from './button';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from './form';
import { Input } from './input';

const meta: Meta = { title: 'UI/Form' };
export default meta;

/**
 * Structural validation only (required/format) — per Phase 2's rule, this
 * schema must never encode a business-critical rule (e.g. "doctor fee must
 * match the backend's recorded rate"), which stays server-side.
 */
const patientContactSchema = z.object({
  fullName: z.string().min(2, 'Full name is required.'),
  email: z.string().email('Enter a valid email address.'),
});

type PatientContactValues = z.infer<typeof patientContactSchema>;

export const Default: StoryObj = {
  render: function Render() {
    const form = useForm<PatientContactValues>({
      resolver: zodResolver(patientContactSchema),
      defaultValues: { fullName: '', email: '' },
    });

    return (
      <Form {...form}>
        <form
          onSubmit={form.handleSubmit(() => {
            /* Storybook demo only — no submission target. */
          })}
          className="flex w-full max-w-sm flex-col gap-4"
        >
          <FormField
            control={form.control}
            name="fullName"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Full name</FormLabel>
                <FormControl>
                  <Input placeholder="Ahmed Hassan" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="email"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Email</FormLabel>
                <FormControl>
                  <Input placeholder="you@example.com" {...field} />
                </FormControl>
                <FormDescription>Used only for appointment confirmations.</FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
          <Button type="submit">Save</Button>
        </form>
      </Form>
    );
  },
};
