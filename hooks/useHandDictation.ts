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
import * as FileSystem from 'expo-file-system/legacy';
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

      // expo-audio's contract is prepare-then-record. Skipping prepare can
      // produce a missing or unfinalised file, which surfaces later as an empty
      // transcript or an upload that never completes.
      await recorder.prepareToRecordAsync();
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

/**
 * Upload the recording and return what was said.
 *
 * Uses FileSystem.uploadAsync rather than fetch with a multipart FormData.
 * React Native's fetch does not stream file bodies reliably on device -- the
 * first live run of this flow timed out after 20s uploading a clip of a few
 * seconds, while the same file and key transcribed in under two seconds from a
 * laptop. uploadAsync hands the file to the platform's native upload task
 * instead, which is the supported path for this in Expo.
 */
async function transcribe(audioUri: string): Promise<string> {
  if (!OPENAI_API_KEY) {
    console.warn('[dictation] no OpenAI key');
    throw new Error('no_api_key');
  }

  // Recorded file facts go into telemetry on failure: a zero-byte or
  // unexpected-extension file convicts the recorder, a healthy file that still
  // fails convicts the transport.
  const info = await FileSystem.getInfoAsync(audioUri).catch(() => null);
  const size = info && 'size' in info ? (info.size as number) : -1;
  if (!info?.exists || size <= 0) {
    throw new Error(`empty_file_${size}`);
  }

  const result = await withTimeout(
    FileSystem.uploadAsync(
      'https://api.openai.com/v1/audio/transcriptions',
      audioUri,
      {
        httpMethod: 'POST',
        uploadType: FileSystem.FileSystemUploadType.MULTIPART,
        fieldName: 'file',
        mimeType: 'audio/m4a',
        parameters: { model: 'gpt-4o-mini-transcribe' },
        headers: { Authorization: `Bearer ${OPENAI_API_KEY}` },
      }
    ),
    30000,
    'Onboarding transcription'
  );

  if (result.status !== 200) {
    console.warn('[dictation] transcribe HTTP', result.status, String(result.body).slice(0, 200));
    throw new Error(`transcribe_http_${result.status}_size${size}`);
  }

  try {
    return JSON.parse(result.body)?.text || '';
  } catch {
    throw new Error('transcribe_bad_json');
  }
}
