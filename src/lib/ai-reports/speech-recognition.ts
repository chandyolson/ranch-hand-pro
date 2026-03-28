export type MicState = "idle" | "listening" | "processing";

interface SpeechCallbacks {
  onInterim: (text: string) => void;
  onFinal: (text: string) => void;
  onError: (msg: string) => void;
  onStateChange: (state: MicState) => void;
}

const SpeechRecognitionCtor =
  typeof window !== "undefined"
    ? (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
    : null;

export function isSpeechSupported(): boolean {
  return !!SpeechRecognitionCtor;
}

let activeRecognition: any = null;

export function startRecognition(cb: SpeechCallbacks) {
  if (!SpeechRecognitionCtor) {
    cb.onError("Voice input not supported on this browser");
    return;
  }

  stopRecognition();

  const recognition = new SpeechRecognitionCtor();
  recognition.continuous = false;
  recognition.interimResults = true;
  recognition.lang = "en-US";
  activeRecognition = recognition;

  recognition.onresult = (e: any) => {
    let interim = "";
    let final = "";
    for (let i = e.resultIndex; i < e.results.length; i++) {
      const transcript = e.results[i][0].transcript;
      if (e.results[i].isFinal) {
        final += transcript;
      } else {
        interim += transcript;
      }
    }
    if (final) {
      cb.onStateChange("processing");
      cb.onFinal(final);
      setTimeout(() => cb.onStateChange("idle"), 300);
    } else if (interim) {
      cb.onInterim(interim);
    }
  };

  recognition.onerror = (e: any) => {
    activeRecognition = null;
    cb.onStateChange("idle");
    if (e.error === "no-speech") {
      cb.onError("No speech detected. Try again.");
    } else if (e.error === "not-allowed") {
      cb.onError("Microphone access denied. Check your browser settings.");
    } else if (e.error !== "aborted") {
      cb.onError("Voice input error. Try again.");
    }
  };

  recognition.onend = () => {
    if (activeRecognition === recognition) {
      activeRecognition = null;
      cb.onStateChange("idle");
    }
  };

  recognition.start();
  cb.onStateChange("listening");
}

export function stopRecognition() {
  if (activeRecognition) {
    try {
      activeRecognition.stop();
    } catch {}
    activeRecognition = null;
  }
}
