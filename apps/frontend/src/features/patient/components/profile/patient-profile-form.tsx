'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { Plus, Trash2 } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useFieldArray, useForm } from 'react-hook-form';
import type { PatientProfile } from '@/features/patient/api/types';
import { useUpdatePatientProfile } from '@/features/patient/hooks/use-update-patient-profile';
import {
  createPatientProfileSchema,
  type PatientProfileFormValues,
} from '@/features/patient/schemas/profile.schema';
import { ApiError } from '@/shared/lib/api/client';
import { Icon } from '@/shared/icons/icon';
import { Alert } from '@/shared/ui/alert';
import { Button } from '@/shared/ui/button';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/shared/ui/form';
import { Input } from '@/shared/ui/input';
import { Section } from '@/shared/ui/layout/section';

const MAX_EMERGENCY_CONTACTS = 5;

export interface PatientProfileFormProps {
  profile: PatientProfile;
  onSaved: () => void;
  onCancel: () => void;
}

/**
 * The Patient Profile's edit architecture — only the fields
 * `PatientProfileUpdateRequest` actually allows (`dateOfBirth`, emergency
 * contacts), matching PatientProfileController's real PATCH endpoint
 * exactly. `fullName`/`email`/`phoneNumber` are Account-owned (Identity has
 * no update-profile endpoint yet) and clinical fields don't exist on the
 * backend at all — both deliberately excluded, mirroring
 * `DoctorProfileForm`'s identity/verification-backed exclusion.
 */
export function PatientProfileForm({ profile, onSaved, onCancel }: PatientProfileFormProps) {
  const t = useTranslations('patient.profile');
  const tValidation = useTranslations('patient.profile.validation');
  const updateProfile = useUpdatePatientProfile();

  const form = useForm<PatientProfileFormValues>({
    resolver: zodResolver(createPatientProfileSchema(tValidation)),
    defaultValues: {
      dateOfBirth: profile.dateOfBirth ? profile.dateOfBirth.slice(0, 10) : undefined,
      emergencyContacts: profile.emergencyContacts,
    },
  });

  const contacts = useFieldArray({ control: form.control, name: 'emergencyContacts' });

  async function onSubmit(values: PatientProfileFormValues) {
    try {
      await updateProfile.mutateAsync(values);
      onSaved();
    } catch {
      // Inline error rendered below from `updateProfile.error`.
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col gap-6" noValidate>
        {updateProfile.error instanceof ApiError && (
          <Alert variant="danger" role="alert">
            {updateProfile.error.message}
          </Alert>
        )}

        <Section title={t('personalInformation')}>
          <div className="flex flex-col gap-4">
            <FormField
              control={form.control}
              name="dateOfBirth"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('dateOfBirth')}</FormLabel>
                  <FormControl>
                    <Input type="date" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        </Section>

        <Section
          title={t('emergencyContacts')}
          actions={
            contacts.fields.length < MAX_EMERGENCY_CONTACTS ? (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => contacts.append({ name: '', relationship: '', phoneNumber: '' })}
              >
                <Icon icon={Plus} size="sm" className="me-2" />
                {t('addContact')}
              </Button>
            ) : undefined
          }
        >
          {contacts.fields.length === 0 ? (
            <p className="text-sm text-text-secondary">{t('emergencyContactsEmptyTitle')}</p>
          ) : (
            <div className="flex flex-col gap-4">
              {contacts.fields.map((contactField, index) => (
                <div key={contactField.id} className="flex flex-col gap-3 rounded-lg border border-border-default p-4">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex flex-1 flex-col gap-3">
                      <FormField
                        control={form.control}
                        name={`emergencyContacts.${index}.name`}
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>{t('contactName')}</FormLabel>
                            <FormControl>
                              <Input {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name={`emergencyContacts.${index}.relationship`}
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>{t('contactRelationship')}</FormLabel>
                            <FormControl>
                              <Input {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name={`emergencyContacts.${index}.phoneNumber`}
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>{t('contactPhone')}</FormLabel>
                            <FormControl>
                              <Input type="tel" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      aria-label={t('removeContact')}
                      onClick={() => contacts.remove(index)}
                    >
                      <Icon icon={Trash2} size="sm" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Section>

        <div className="flex items-center gap-2">
          <Button type="submit" loading={updateProfile.isPending}>
            {t('save')}
          </Button>
          <Button type="button" variant="outline" onClick={onCancel}>
            {t('cancel')}
          </Button>
        </div>
      </form>
    </Form>
  );
}
