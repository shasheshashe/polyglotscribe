const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf8');

// 1. Add new refs
const newRefs = `  const hasWebSpeechAPIRef = useRef<boolean>(true);
  const universalRecorderRef = useRef<MediaRecorder | null>(null);
  const universalAudioChunksRef = useRef<Blob[]>([]);`;

code = code.replace(
  "const silenceStartRef = useRef<number | null>(null);",
  "const silenceStartRef = useRef<number | null>(null);\n" + newRefs
);

// 2. Modify Web Speech API initialization
const webSpeechInitOld = `  useEffect(() => {
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      setError(
        'Your browser does not support the Web Speech API. You can still type directly or use the "Record with Mic" and "Transcribe Audio File" tabs powered by Gemini AI!'
      );
      return;
    }`;

const webSpeechInitNew = `  useEffect(() => {
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      hasWebSpeechAPIRef.current = false;
      return;
    }
    
    hasWebSpeechAPIRef.current = true;`;

code = code.replace(webSpeechInitOld, webSpeechInitNew);

// 3. Modify startVAD and stopVAD
const startVADOld = `  const startVAD = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      vadStreamRef.current = stream;`;

const processChunkFunction = `
      // Setup Universal Recorder for fallback
      if (!hasWebSpeechAPIRef.current) {
        const mediaRecorder = new MediaRecorder(stream);
        universalRecorderRef.current = mediaRecorder;
        
        mediaRecorder.ondataavailable = async (event) => {
          if (event.data.size > 0) {
            universalAudioChunksRef.current.push(event.data);
          }
        };

        mediaRecorder.onstop = async () => {
          if (universalAudioChunksRef.current.length === 0) return;
          
          const mimeType = mediaRecorder.mimeType || 'audio/webm';
          const audioBlob = new Blob(universalAudioChunksRef.current, { type: mimeType });
          universalAudioChunksRef.current = []; // reset for next chunk
          
          // Send to Gemini
          try {
            const reader = new FileReader();
            reader.readAsDataURL(audioBlob);
            reader.onloadend = async () => {
              const base64Data = (reader.result as string).split(',')[1];
              const response = await fetch('/api/transcribe-audio', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ audioBase64: base64Data, mimeType, sourceLang }),
              });
              const data = await response.json();
              if (data.transcription) {
                setTranscript((prev) => (prev ? prev + ' ' + data.transcription : data.transcription));
              }
            };
          } catch (err) {
            console.error("Universal dictation chunk failed:", err);
          }
        };
      }`;

code = code.replace(startVADOld, startVADOld + "\n" + processChunkFunction);

const checkVolumeOld = `        if (averageVolume < SILENCE_THRESHOLD) {
          if (silenceStartRef.current === null) {
            silenceStartRef.current = Date.now();
          } else if (Date.now() - silenceStartRef.current > SILENCE_DURATION_MS) {
            // Pause recognition if active
            if (isRecognizingRef.current) {
              isVadPausedRef.current = true;
              try { recognitionRef.current?.stop(); } catch {}
            }
          }
        } else {
          silenceStartRef.current = null;
          // Resume recognition
          if (!isRecognizingRef.current && isVadPausedRef.current) {
            isVadPausedRef.current = false;
            try { recognitionRef.current?.start(); } catch {}
          }
        }`;

const checkVolumeNew = `        if (averageVolume < SILENCE_THRESHOLD) {
          if (silenceStartRef.current === null) {
            silenceStartRef.current = Date.now();
          } else if (Date.now() - silenceStartRef.current > SILENCE_DURATION_MS) {
            // Pause recognition if active
            if (!isVadPausedRef.current) {
              isVadPausedRef.current = true;
              if (hasWebSpeechAPIRef.current) {
                if (isRecognizingRef.current) {
                  try { recognitionRef.current?.stop(); } catch {}
                }
              } else {
                if (universalRecorderRef.current?.state === 'recording') {
                  universalRecorderRef.current.stop();
                }
              }
            }
          }
        } else {
          silenceStartRef.current = null;
          // Resume recognition
          if (isVadPausedRef.current) {
            isVadPausedRef.current = false;
            if (hasWebSpeechAPIRef.current) {
              if (!isRecognizingRef.current) {
                try { recognitionRef.current?.start(); } catch {}
              }
            } else {
               if (universalRecorderRef.current?.state === 'inactive') {
                  universalRecorderRef.current.start();
               }
            }
          }
        }`;

code = code.replace(checkVolumeOld, checkVolumeNew);

const stopVADOld = `    if (vadStreamRef.current) {
      vadStreamRef.current.getTracks().forEach(track => track.stop());
      vadStreamRef.current = null;
    }
    isVadPausedRef.current = false;
    silenceStartRef.current = null;
  };`;

const stopVADNew = `    if (universalRecorderRef.current && universalRecorderRef.current.state !== 'inactive') {
      universalRecorderRef.current.stop();
    }
    if (vadStreamRef.current) {
      vadStreamRef.current.getTracks().forEach(track => track.stop());
      vadStreamRef.current = null;
    }
    isVadPausedRef.current = false;
    silenceStartRef.current = null;
  };`;

code = code.replace(stopVADOld, stopVADNew);

// 4. Modify toggleListening
const toggleListeningOld = `  const toggleListening = () => {
    if (isListening) {
      setIsListening(false);
      isListeningRef.current = false;
      stopVAD();
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch {}
      }
      showToast('Live dictation paused', 'info');
    } else {
      setInterimTranscript('');
      setIsListening(true);
      isListeningRef.current = true;
      startVAD();
      try {
        recognitionRef.current?.start();
        showToast('Listening live... speak in ' + getLanguageLabel(sourceLang), 'success');
      } catch {
        // Handle start exception
      }
    }
  };`;

const toggleListeningNew = `  const toggleListening = async () => {
    if (isListening) {
      setIsListening(false);
      isListeningRef.current = false;
      stopVAD();
      if (hasWebSpeechAPIRef.current && recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch {}
      }
      showToast('Live dictation paused', 'info');
    } else {
      setInterimTranscript('');
      setIsListening(true);
      isListeningRef.current = true;
      await startVAD();
      if (hasWebSpeechAPIRef.current) {
        try {
          recognitionRef.current?.start();
          showToast('Listening live... speak in ' + getLanguageLabel(sourceLang), 'success');
        } catch {
          // Handle start exception
        }
      } else {
        if (universalRecorderRef.current && universalRecorderRef.current.state === 'inactive') {
          universalRecorderRef.current.start();
          isVadPausedRef.current = false;
        }
        showToast('Universal dictation active... speak in ' + getLanguageLabel(sourceLang), 'success');
      }
    }
  };`;

code = code.replace(toggleListeningOld, toggleListeningNew);

fs.writeFileSync('src/App.tsx', code);
