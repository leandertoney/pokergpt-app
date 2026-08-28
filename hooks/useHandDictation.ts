/**
 * One-shot voice capture for the onboarding try-it step.
 *
 * Deliberately NOT useVoiceInput. That hook runs a conversation: it transcribes,
 * calls the coach, and speaks the reply back. Onboarding wants none of that —
 * the player says one hand, we transcribe it, and the verdict is rendered on
 * screen. Reusing the conversational hook here would start the coach talking
 * out loud during onboarding.
 *
 * Permission is requested rather than merely checked, and a denial resolves to
 * a state the caller can route past. Nothing in onboarding may dead-end.
 */

import { useState, useCallback, useRef, useEffect } from 'react';
import {
  useAudioRecorder,
  RecordingPresets,
  AudioModule,
  setAudioModeAsync,
} from 'expo-audio';
import { withTimeout } from '@/utils/withTimeout';

const OPENAI_API_KEY = process.env.EXPO_PUBLIC_OPENAI_API_KEY || '';

export type DictationState =
  | 'idle'
  | 'denied'
  | 'recording'
  | 'transcribing'
  | 'done'
  | 'error';

export function useHandDictation() {
  const [state, setState] = useState<DictationState>('idle');
  const [transcript, setTranscript] = useState('');
  const recorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY);
  const activeRef = useRef(false);
  /** Why the last attempt produced nothing, for telemetry. */
  const lastErrorRef = useRef<string | null>(null);

  useEffect(() => {
    return () => {
      if (activeRef.current) {
        recorder.stop().catch(() => {});
        activeRef.current = false;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /**
   * Ask for the mic and start recording.
   *
   * @returns true if recording began. False means the caller should move on —
   *   it is never an error the user has to resolve.
   */
  const start = useCallback(async (): Promise<boolean> => {
    try {
      const permission = await AudioModule.requestRecordingPermissionsAsync();
      if (permission.status !== 'granted') {
        setState('denied');
        return false;
      }

      await setAudioModeAsync({ allowsRecording: true, playsInSilentMode: true });
      await recorder.record();

      activeRef.current = true;
      setTranscript('');
      setState('recording');
      return true;
    } catch (e: any) {
      console.warn('[dictation] start failed:', e?.message);
      setState('error');
      return false;
    }
  }, [recorder]);

  /**
   * Stop recording and transcribe. Resolves to the transcript, or '' when
   * nothing usable came back.
   */
  const stopAndTranscribe = useCallback(async (): Promise<string> => {
    if (!activeRef.current) return '';

    try {
      setState('transcribing');
      await recorder.stop();
      activeRef.current = false;

      const uri = recorder.uri;
      if (!uri) {
        setState('error');
        return '';
      }

      const text = await transcribe(uri);
      setTranscript(text);
      setState(text ? 'done' : 'error');
      lastErrorRef.current = text ? null : 'silent_recording';
      return text;
    } catch (e: any) {
      console.warn('[dictation] transcribe failed:', e?.message);
      activeRef.current = false;
      lastErrorRef.current = e?.message ?? 'transcribe_failed';
      setState('error');
      return '';
    }
  }, [recorder]);

  const cancel = useCallback(async () => {
    if (activeRef.current) {
      await recorder.stop().catch(() => {});
      activeRef.current = false;
    }
    setState('idle');
    setTranscript('');
  }, [recorder]);

  return { state, transcript, start, stopAndTranscribe, cancel, lastError: lastErrorRef };
}

async function transcribe(audioUri: string): Promise<string> {
  if (!OPENAI_API_KEY) {
    console.warn('[dictation] no OpenAI key');
    return '';
  }

  const formData = new FormData();
  formData.append('file', {
    uri: audioUri,
    type: 'audio/m4a',
    name: 'audio.m4a',
  } as any);
  formData.append('model', 'gpt-4o-mini-transcribe');

  const response = await withTimeout(
    fetch('https://api.openai.com/v1/audio/transcriptions', {
      method: 'POST',
      headers: { Authorization: `Bearer ${OPENAI_API_KEY}` },
      body: formData,
    }),
    20000,
    'Onboarding transcription'
  );

  // Previously this returned '' on any non-OK response, so a failed
  // transcription was indistinguishable from a silent recording and the flow
  // fell through to the generic questions with no way to tell why.
  if (!response.ok) {
    const detail = await response.text().catch(() => '');
    console.warn('[dictation] transcribe HTTP', response.status, detail.slice(0, 200));
    throw new Error(`transcribe_http_${response.status}`);
  }

  const data = await response.json();
  return data.text || '';
}
