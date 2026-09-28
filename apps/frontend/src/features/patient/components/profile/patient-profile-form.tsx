'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { Plus, Trash2 } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useState } from 'react';
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
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/shared/ui/accordion';
import { Alert } from '@/shared/ui/alert';
import { Button } from '@/shared/ui/button';
import { ConfirmDialog } from '@/shared/ui/confirm-dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/shared/ui/form';
import { Input } from '@/shared/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/shared/ui/select';
import { Section } from '@/shared/ui/layout/section';
import { Switch } from '@/shared/ui/switch';
import { TagInput } from '@/shared/ui/tag-input';
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
    // Validate on blur (then on change), never before the field has been touched.
    mode: 'onTouched',
    resolver: zodResolver(createPatientProfileSchema(tValidation)),
    defaultValues: {
      bloodType: profile.bloodType,
      allergies: profile.allergies ?? '',
      chronicDiseases: profile.chronicDiseases ?? '',
      insuranceProviderId: profile.insuranceProviderId,
      lifestyleNotes: profile.lifestyleNotes ?? '',
      nutritionNotes: profile.nutritionNotes ?? '',
      exerciseNotes: profile.exerciseNotes ?? '',
      mentalHealthNotes: profile.mentalHealthNotes ?? '',
      emergencyContacts: profile.emergencyContacts,
    },
  });

  const contacts = useFieldArray({ control: form.control, name: 'emergencyContacts' });
  const [removeIndex, setRemoveIndex] = useState<number | null>(null);
  // The patient's own "no known allergies" answer -- separate from the doctor's confirmation, never sent alongside allergy text.
  const [noAllergies, setNoAllergies] = useState(profile.allergiesStatus === 'none_reported');

  async function onSubmit(values: PatientProfileFormValues) {
    // Naming allergies saves the text (the server derives `has_allergies`); the toggle saves `none_reported`
    // with the text cleared. Only sent when it would change something, so an unchanged answer keeps its timestamp.
    const allergyFields =
      noAllergies && profile.allergiesStatus !== 'none_reported'
        ? { allergies: '', allergiesStatus: 'none_reported' as const }
        : noAllergies
          ? {}
          : { allergies: values.allergies ?? '' };
    try {
      await updateProfile.mutateAsync({
        ...values,
        ...allergyFields,
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

            <div className="flex flex-col gap-2">
              <label htmlFor="no-known-allergies" className="flex items-center justify-between gap-3 text-small font-medium text-text-primary">
                {t('noKnownAllergiesToggle')}
                <Switch
                  id="no-known-allergies"
                  checked={noAllergies}
                  onCheckedChange={(checked) => {
                    setNoAllergies(checked);
                    if (checked) form.setValue('allergies', '', { shouldDirty: true });
                  }}
                />
              </label>
              {!noAllergies && (
                <FormField
                  control={form.control}
                  name="allergies"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t('allergies')}</FormLabel>
                      <FormControl>
                        <TagInput
                          name={field.name}
                          ref={field.ref}
                          onBlur={field.onBlur}
                          value={field.value ?? ''}
                          onValueChange={field.onChange}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}
            </div>

            <FormField
              control={form.control}
              name="chronicDiseases"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('chronicConditions')}</FormLabel>
                  <FormControl>
                    <TagInput
                      name={field.name}
                      ref={field.ref}
                      onBlur={field.onBlur}
                      value={field.value ?? ''}
                      onValueChange={field.onChange}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        </Section>

        {/* Optional: closed by default so the required medical fields stay the focus. */}
        <Accordion type="single" collapsible className="rounded-(--r-card) border border-border-default bg-surface px-4">
          <AccordionItem value="health-passport" className="border-0">
            <AccordionTrigger>
              <span className="flex flex-col items-start gap-0.5 text-start">
                <span className="text-h3">{t('healthPassport')}</span>
                <span className="text-small font-normal text-text-tertiary">{t('healthPassportDescription')}</span>
              </span>
            </AccordionTrigger>
            <AccordionContent>
          <div className="flex flex-col gap-4">
            <FormField
              control={form.control}
              name="lifestyleNotes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('lifestyleNotes')}</FormLabel>
                  <FormControl>
                    <Textarea {...field} value={field.value ?? ''} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="nutritionNotes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('nutritionNotes')}</FormLabel>
                  <FormControl>
                    <Textarea {...field} value={field.value ?? ''} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="exerciseNotes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('exerciseNotes')}</FormLabel>
                  <FormControl>
                    <Textarea {...field} value={field.value ?? ''} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="mentalHealthNotes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('mentalHealthNotes')}</FormLabel>
                  <p className="text-xs text-text-tertiary">{t('mentalHealthNotesHint')}</p>
                  <FormControl>
                    <Textarea {...field} value={field.value ?? ''} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
            </AccordionContent>
          </AccordionItem>
        </Accordion>

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
                variant="secondary"
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
                      onClick={() => setRemoveIndex(index)}
                    >
                      <Icon icon={Trash2} size="sm" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Section>

        <ConfirmDialog
          open={removeIndex !== null}
          onOpenChange={(next) => !next && setRemoveIndex(null)}
          title={t('removeContactTitle')}
          description={t('removeContactBody')}
          confirmLabel={t('removeContactConfirm')}
          onConfirm={() => {
            if (removeIndex !== null) contacts.remove(removeIndex);
            setRemoveIndex(null);
          }}
        />

        <div className="flex items-center gap-2">
          <Button type="submit" loading={updateProfile.isPending}>
            {t('save')}
          </Button>
          <Button type="button" variant="secondary" onClick={onCancel}>
            {t('cancel')}
          </Button>
        </div>
      </form>
    </Form>
  );
}
