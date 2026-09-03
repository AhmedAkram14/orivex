'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { Plus, Trash2 } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useFieldArray, useForm } from 'react-hook-form';
import type { EmergencyRelationship, PatientProfile } from '@/features/patient/api/types';
import { useUpdatePatientProfile } from '@/features/patient/hooks/use-update-patient-profile';
import {
  createPatientProfileSchema,
  type PatientProfileFormValues,
} from '@/features/patient/schemas/profile.schema';
import { useInsuranceProvidersList } from '@/features/reference/hooks/use-insurance-providers-list';
import { ApiError } from '@/shared/lib/api/client';
import { Icon } from '@/shared/icons/icon';
import { Alert } from '@/shared/ui/alert';
import { Button } from '@/shared/ui/button';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/shared/ui/form';
import { Input } from '@/shared/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/shared/ui/select';
import { Section } from '@/shared/ui/layout/section';
import { Textarea } from '@/shared/ui/textarea';

const MAX_EMERGENCY_CONTACTS = 5;
const BLOOD_TYPES = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'] as const;
const RELATIONSHIPS: EmergencyRelationship[] = ['parent', 'spouse', 'sibling', 'child', 'guardian', 'other'];

export interface PatientProfileFormProps {
  profile: PatientProfile;
  onSaved: () => void;
  onCancel: () => void;
}

/**
 * Onboarding Redesign (2026-07-21 proposal, Stage O.7): the Patient Medical
 * Profile editor -- only the fields `PatientProfileUpdateRequest` actually
 * allows (blood type, allergies, chronic diseases, insurance provider,
 * emergency contacts), matching PatientProfileController's real PATCH
 * endpoint exactly. `fullName`/`email`/`phoneNumber`/`dateOfBirth`/`gender`/
 * `nationality`/`address` are Account-owned and edited separately via the
 * shared `PersonalInfoStep` (§0a) -- deliberately excluded here, mirroring
 * `DoctorProfileForm`'s identity-field exclusion.
 */
export function PatientProfileForm({ profile, onSaved, onCancel }: PatientProfileFormProps) {
  const t = useTranslations('patient.profile');
  const tValidation = useTranslations('patient.profile.validation');
  const { data: insuranceProviders, isLoading: insuranceProvidersLoading } = useInsuranceProvidersList();
  const updateProfile = useUpdatePatientProfile();

  const form = useForm<PatientProfileFormValues>({
    resolver: zodResolver(createPatientProfileSchema(tValidation)),
    defaultValues: {
      bloodType: profile.bloodType,
      allergies: profile.allergies ?? '',
      chronicDiseases: profile.chronicDiseases ?? '',
      insuranceProviderId: profile.insuranceProviderId,
      emergencyContacts: profile.emergencyContacts,
    },
  });

  const contacts = useFieldArray({ control: form.control, name: 'emergencyContacts' });

  async function onSubmit(values: PatientProfileFormValues) {
    try {
      await updateProfile.mutateAsync({
        ...values,
        emergencyContacts: values.emergencyContacts.map(({ id: _id, ...contact }) => contact),
      });
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

        <Section title={t('medicalInformation')} description={t('medicalInformationDescription')}>
          <div className="flex flex-col gap-4">
            <FormField
              control={form.control}
              name="bloodType"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('bloodType')}</FormLabel>
                  <Select value={field.value ?? ''} onValueChange={field.onChange}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder={t('bloodTypePlaceholder')} />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {BLOOD_TYPES.map((bloodType) => (
                        <SelectItem key={bloodType} value={bloodType}>
                          {bloodType}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="allergies"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('allergies')}</FormLabel>
                  <FormControl>
                    <Textarea {...field} value={field.value ?? ''} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="chronicDiseases"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('chronicConditions')}</FormLabel>
                  <FormControl>
                    <Textarea {...field} value={field.value ?? ''} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        </Section>

        <Section title={t('insurance')}>
          <FormField
            control={form.control}
            name="insuranceProviderId"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t('insuranceProvider')}</FormLabel>
                <Select value={field.value ?? ''} onValueChange={field.onChange} disabled={insuranceProvidersLoading}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder={t('insuranceProviderPlaceholder')} />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {(insuranceProviders ?? []).map((provider) => (
                      <SelectItem key={provider.id} value={provider.id}>
                        {provider.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        </Section>

        <Section
          title={t('emergencyContacts')}
          actions={
            contacts.fields.length < MAX_EMERGENCY_CONTACTS ? (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => contacts.append({ name: '', relationship: 'other', phoneNumber: '' })}
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
                            <Select value={field.value} onValueChange={field.onChange}>
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                {RELATIONSHIPS.map((relationship) => (
                                  <SelectItem key={relationship} value={relationship}>
                                    {t(`relationshipOptions.${relationship}`)}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
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
