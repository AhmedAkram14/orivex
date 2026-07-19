'use client';

import '@livekit/components-styles';
import { LiveKitRoom, RoomAudioRenderer, VideoConference } from '@livekit/components-react';
import { useTranslations } from 'next-intl';
import { useRoomToken } from '@/features/telemedicine/hooks/use-room-token';
import { Alert } from '@/shared/ui/alert';

export interface CallRoomProps {
  consultationSessionId: string;
  displayName?: string;
  /** Called when the local participant leaves the call (LiveKitRoom's own onDisconnected). */
  onLeave?: () => void;
}

/**
 * The reachable entry point into a telemedicine video call (ORIVEX Roadmap
 * 2.0 Stage 2). Mints its own room-access token on mount
 * (useRoomToken -> POST /consultations/:id/room-token), then hands off to
 * LiveKit's own pre-built `<VideoConference>` UI (grid layout, screen
 * share, chat, mic/camera controls) rather than hand-rolling a second copy
 * of call-room UI LiveKit already ships and maintains.
 */
export function CallRoom({ consultationSessionId, displayName, onLeave }: CallRoomProps) {
  const t = useTranslations('telemedicine');
  const { data, isLoading, isError } = useRoomToken(consultationSessionId, displayName);

  if (isLoading) {
    return <p className="text-sm text-text-secondary">{t('connecting')}</p>;
  }

  if (isError || !data) {
    return <Alert variant="danger">{t('connectFailed')}</Alert>;
  }

  return (
    <LiveKitRoom
      token={data.token}
      serverUrl={data.url}
      connect
      video
      audio
      data-lk-theme="default"
      style={{ height: '100%', minHeight: '480px' }}
      onDisconnected={onLeave}
    >
      <VideoConference />
      <RoomAudioRenderer />
    </LiveKitRoom>
  );
}
