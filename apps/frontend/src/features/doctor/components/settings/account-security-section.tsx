'use client';

import { ArrowRight } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useEffect, useState } from 'react';
import { ChangePasswordForm } from '@/features/auth/components/change-password-form';
import { useMyAccount } from '@/features/identity/hooks/use-my-account';
import { useUpdatePersonalProfile } from '@/features/identity/hooks/use-update-personal-profile';
import { Link } from '@/shared/i18n/navigation';
import { Icon } from '@/shared/icons/icon';
import { env } from '@/shared/lib/env';
import { toUserMessage } from '@/shared/lib/api/error';
import { Badge } from '@/shared/ui/badge';
import { Button } from '@/shared/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/shared/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/shared/ui/dialog';
import { Input } from '@/shared/ui/input';
import { Skeleton } from '@/shared/ui/skeleton';
import { Switch } from '@/shared/ui/switch';
import { toast } from '@/shared/ui/use-toast';

/**
 * Doctor Settings Rebuild, Phase 5: change-password + the phone-number gap
 * fix + the deliberately-honest stubs (Confirmed decisions 2, 6, 8) --
 * change-password and the deletion stub live together here rather than a
 * second "Data & Privacy" card, to avoid a card holding only one stub row.
 * Not wired into `doctor-settings-form.tsx` yet -- that's Phase 6.
 */
export function AccountSecuritySection() {
  const t = useTranslations('doctor.settingsPage.accountSecurity');
  const { data: account, isLoading } = useMyAccount();
  const updateProfile = useUpdatePersonalProfile();
  const [phoneNumber, setPhoneNumber] = useState('');
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

  // Seeds the local draft from the loaded account exactly once per load --
  // not derived inline on every render, which would make the input
  // uncontrollable (every keystroke would get overwritten back to the
  // account's own value on the next render).
  useEffect(() => {
    if (account) {
      setPhoneNumber(account.phoneNumber ?? '');
    }
  }, [account]);

  const phoneDirty = !!account && phoneNumber !== (account.phoneNumber ?? '');

  async function handleSavePhone() {
    try {
      await updateProfile.mutateAsync({ phoneNumber });
      toast({ description: t('phoneSaveSuccess'), variant: 'success' });
    } catch (error) {
      toast({ description: toUserMessage(error), variant: 'danger' });
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t('title')}</CardTitle>
        <CardDescription>{t('description')}</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-6">
        <div className="flex flex-col gap-3">
          <p className="text-sm font-medium text-text-primary">{t('changePasswordHeading')}</p>
          <ChangePasswordForm />
        </div>

        <div className="flex flex-col gap-2 border-t border-border-default pt-6">
          <label htmlFor="account-security-phone" className="text-sm font-medium text-text-primary">
            {t('phoneHeading')}
          </label>
          {isLoading ? (
            <Skeleton className="h-10 w-full" />
          ) : (
            <div className="flex gap-2">
              <Input
                id="account-security-phone"
                type="tel"
                autoComplete="tel"
                value={phoneNumber}
                onChange={(event) => setPhoneNumber(event.target.value)}
                placeholder={t('phonePlaceholder')}
              />
              <Button type="button" onClick={handleSavePhone} loading={updateProfile.isPending} disabled={!phoneDirty}>
                {t('save')}
              </Button>
            </div>
          )}
        </div>

        {/* Sessions/Login History/Logout-All (Confirmed decision 7): already
            fully built on `/security` -- a cross-link, not a duplicate UI,
            same `Link` + `ArrowRight` idiom `DoctorEarningsSummary`'s own
            `seeReports` link established. */}
        <Link href="/security" className="flex items-center gap-1 self-end text-sm font-medium text-primary hover:underline">
          {t('seeSecurity')}
          <Icon icon={ArrowRight} size="sm" flipRtl />
        </Link>

        {/* 2FA / email-change (Confirmed decision 2): honest "coming soon"
            stubs, not real implementations -- both substantial from-scratch
            security features. `disabled` on the real control (not just a
            visual dimming) so they genuinely don't respond to interaction. */}
        <div className="flex flex-col gap-4 border-t border-border-default pt-6">
          <div className="flex items-center justify-between gap-4">
            <div className="flex flex-col gap-0.5">
              <div className="flex items-center gap-2">
                <p className="text-sm font-medium text-text-primary">{t('twoFactor.title')}</p>
                <Badge variant="neutral">{t('comingSoon')}</Badge>
              </div>
              <p className="text-xs text-text-secondary">{t('twoFactor.description')}</p>
            </div>
            <Switch checked={false} disabled aria-label={t('twoFactor.title')} />
          </div>

          <div className="flex items-center justify-between gap-4">
            <div className="flex flex-col gap-0.5">
              <div className="flex items-center gap-2">
                <p className="text-sm font-medium text-text-primary">{t('emailChange.title')}</p>
                <Badge variant="neutral">{t('comingSoon')}</Badge>
              </div>
              <p className="text-xs text-text-secondary">{t('emailChange.description')}</p>
            </div>
            <Button type="button" variant="outline" size="sm" disabled>
              {t('emailChange.action')}
            </Button>
          </div>
        </div>

        {/* Data export/account deletion (Confirmed decision 6): a stub row
            pointing at support, not a real self-service flow -- the org's
            own docs flag anonymize-vs-delete as legally unresolved. Reuses
            the same real support mailto `HelpCenterCard` already falls back
            to -- no fabricated address. Purely informational: no mutation,
            no network call. */}
        <div className="flex items-center justify-between gap-4 border-t border-border-default pt-6">
          <div className="flex flex-col gap-0.5">
            <p className="text-sm font-medium text-text-primary">{t('deletion.title')}</p>
            <p className="text-xs text-text-secondary">{t('deletion.description')}</p>
          </div>
          <Button type="button" variant="outline" onClick={() => setDeleteDialogOpen(true)}>
            {t('deletion.action')}
          </Button>
        </div>
      </CardContent>

      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('deletion.dialogTitle')}</DialogTitle>
            <DialogDescription>{t('deletion.dialogDescription')}</DialogDescription>
          </DialogHeader>
          <a href={`mailto:${env.supportEmail}`} className="text-sm font-medium text-primary hover:underline">
            {env.supportEmail}
          </a>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setDeleteDialogOpen(false)}>
              {t('deletion.close')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
