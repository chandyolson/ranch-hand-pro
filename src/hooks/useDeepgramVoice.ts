import { useState, useRef, useCallback } from "react";

export type VoiceState = "idle" | "listening" | "processing" | "error";

interface UseDeepgramVoiceOptions {
  onResult: (text: string) => void;
  onError?: (msg: string) => void;
}

const SUPABASE_URL = "https://irsztvspkjfyzhhfbdet.supabase.co";
const FUNCTION_URL = `${SUPABASE_URL}/functions/v1/deepgram-transcribe`;

// MediaRecorder mime type — webm/opus is best supported on Android Chrome + iOS Safari 17+
// Falls back to audio/mp4 on iOS < 17
function getSupportedMimeType(): string {
  const types = [
    "audio/webm;codecs=opus",
    "audio/webm",
    "audio/ogg;codecs=opus",
    "audio/mp4",
  ];
  for (const t of types) {
    if (MediaRecorder.isTypeSupported(t)) return t;
  }
  return "";
}

export function useDeepgramVoice({ onResult, onError }: UseDeepgramVoiceOptions) {
  const [voiceState, setVoiceState] = useState<VoiceState>("idle");
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);

  const startListening = useCallback(async () => {
    if (voiceState !== "idle") return;

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      const mimeType = getSupportedMimeType();
      const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
      mediaRecorderRef.current = recorder;
      chunksRef.current = [];

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      recorder.onstop = async () => {
        // Stop all tracks
        streamRef.current?.getTracks().forEach((t) => t.stop());
        streamRef.current = null;

        if (chunksRef.current.length === 0) {
          setVoiceState("idle");
          onError?.("No audio recorded. Try again.");
          return;
        }

        setVoiceState("processing");

        const blob = new Blob(chunksRef.current, {
          type: mimeType || "audio/webm",
        });

        try {
          const formData = new FormData();
          formData.append("audio", blob, "recording.webm");

          const response = await fetch(FUNCTION_URL, {
            method: "POST",
            body: formData,
          });

          if (!response.ok) {
            const err = await response.json().catch(() => ({ error: "Unknown error" }));
            throw new Error(err.error || "Transcription failed");
          }

          const { transcript, confidence } = await response.json();

          if (!transcript || transcript.trim() === "") {
            onError?.("Nothing heard. Try again.");
          } else {
            onResult(transcript.trim());
            if (navigator.vibrate) navigator.vibrate([15, 10, 15]);
          }
        } catch (err: any) {
          console.error("Deepgram transcription error:", err);
          onError?.(err.message || "Transcription failed. Try again.");
        } finally {
          setVoiceState("idle");
        }
      };

      recorder.onerror = () => {
        streamRef.current?.getTracks().forEach((t) => t.stop());
        setVoiceState("error");
        onError?.("Recording error. Try again.");
        setTimeout(() => setVoiceState("idle"), 1500);
      };

      recorder.start();
      setVoiceState("listening");
      if (navigator.vibrate) navigator.vibrate(20);

    } catch (err: any) {
      if (err.name === "NotAllowedError") {
        onError?.("Microphone access denied. Check your browser settings.");
      } else if (err.name === "NotFoundError") {
        onError?.("No microphone found on this device.");
      } else {
        onError?.(err.message || "Could not start recording.");
      }
      setVoiceState("idle");
    }
  }, [voiceState, onResult, onError]);

  const stopListening = useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === "recording") {
      mediaRecorderRef.current.stop();
      // State transitions to "processing" inside onstop handler
    }
  }, []);

  const cancelListening = useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === "recording") {
      // Clear chunks before stopping so onstop doesn't send anything
      chunksRef.current = [];
      mediaRecorderRef.current.stop();
    }
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    setVoiceState("idle");
  }, []);

  return { voiceState, startListening, stopListening, cancelListening };
}
