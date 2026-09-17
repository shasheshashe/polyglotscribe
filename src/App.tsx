import { useState, useEffect, useRef } from 'react';
import {
  Mic,
  MicOff,
  Copy,
  FileText,
  Download,
  Languages,
  CheckCircle2,
  AlertCircle,
  Activity,
  ArrowRightLeft,
  RefreshCw,
  Upload,
  Sparkles,
  Volume2,
  VolumeX,
  User,
  Square,
  Radio,
  FileAudio,
  BookOpen,
  LogOut,
  LogIn,
  Share2,
} from 'lucide-react';
import { VOICE_CHARACTERS } from './data/voices';
import { SupportedLanguage, DictationMode, ToastNotification } from './types';
import { pcmToWavBlob, exportToWord, exportToPDF } from './utils/audio';

import { auth, db } from './lib/firebase';
import { onAuthStateChanged, signOut, createUserWithEmailAndPassword, signInWithEmailAndPassword } from 'firebase/auth';
import { doc, setDoc, serverTimestamp, getDoc } from 'firebase/firestore';
import Auth from './components/Auth';
import AdminDashboard from './components/AdminDashboard';

const SAMPLE_PHRASES: Record<SupportedLanguage, { title: string; text: string }[]> = {

  'om-ET': [
    {
      title: 'Afaan Oromoo Gadaa Wisdom',
      text: 'Nagaan Oromiyaa fi addunyaa maraaf haa ta\'u.\nTokkummaan keenya humna keenya.\nHeera fi seera Gadaa kabajuun duudhaa keenya.\nBaga gammaddan, baga nagaan dhuftan.',
    },
    {
      title: 'Afaan Oromoo Poem (Walaloo)',
      text: 'Biqilaan biyyaa yoomuu hin badu\nDacheen Oromiyaa badhaatuu\nMargi lalisaan mukti gabbatu\nDhaloonni haaraan boruuf mul\'atu.',
    },
  ],
  'am-ET': [
    {
      title: 'የሰላምና የአንድነት ቅኝት (Amharic Peace)',
      text: 'ሰላም ለኢትዮጵያችንና ለመላው ዓለም ይሁን።\nአንድነታችን የጥንካሬአችን መሠረት ነው።\nመልካም ሥራ ለትውልድ የሚተላለፍ ቅርስ ነው።\nእንኳን በደህና መጡ!',
    },
    {
      title: 'የግጥም ስንኝ (Amharic Poetry)',
      text: 'በተራራው ላይ ጎህ ሲቀድ\nየተስፋ ጮራ ሲፈነጥቅ\nየፍቅር መንገድ ሲሰፋ\nየልብ ደስታ ሲሞላ።',
    },
  ],
  'en-US': [
    {
      title: 'Horn of Africa Cultural Heritage',
      text: 'The Horn of Africa is a cradle of ancient civilization, rich in diverse linguistic traditions, poetry, and enduring cultural wisdom that connects generations across centuries.',
    },
    {
      title: 'Universal Poetic Stanza',
      text: 'The morning dawn begins to glow\nAcross the hills the gentle breeze\nA thousand rivers softly flow\nAnd bring the tired world its peace.',
    },
  ],
};

export default function App() {
  const [activeTab, setActiveTab] = useState<'live' | 'audio' | 'admin'>('live');
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [interimTranscript, setInterimTranscript] = useState('');
  const [formatMode, setFormatMode] = useState<DictationMode>('paragraph');

  // Auth State
  const [user, setUser] = useState<any>(null);
  const [showAuth, setShowAuth] = useState(false);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [isAuthChecking, setIsAuthChecking] = useState(true);

  // Language States

  const [sourceLang, setSourceLang] = useState<SupportedLanguage>('om-ET');
  const [targetLang, setTargetLang] = useState<SupportedLanguage>('en-US');

  // Voice Character States
  const [selectedVoiceId, setSelectedVoiceId] = useState('om-f-1');
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);
  const [currentlySpeakingText, setCurrentlySpeakingText] = useState<string | null>(null);
  const [playbackSpeed, setPlaybackSpeed] = useState<number>(1.0);
  const playbackSpeedRef = useRef(1.0);

  // Translation States
  const [translatedText, setTranslatedText] = useState('');
  const [isTranslating, setIsTranslating] = useState(false);

  // Audio File Transcriber States
  const [audioFile, setAudioFile] = useState<File | null>(null);
  const [isTranscribingAudio, setIsTranscribingAudio] = useState(false);
  const [isDetectingLang, setIsDetectingLang] = useState(false);
  const [audioTranscript, setAudioTranscript] = useState('');

  // Live Audio Recording (Direct mic buffer for Gemini)
  const [isRecordingGemini, setIsRecordingGemini] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  // Toast / Status Alerts
  const [toast, setToast] = useState<ToastNotification | null>(null);
  const [error, setError] = useState('');

  // Audio elements tracker
  const activeAudioRef = useRef<HTMLAudioElement | null>(null);

  // Refs to handle Web Speech continuous lifecycle
  const recognitionRef = useRef<any>(null);
  const isListeningRef = useRef(isListening);
  const formatModeRef = useRef(formatMode);
  // Refs for VAD
  const vadStreamRef = useRef<MediaStream | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const vadLoopRef = useRef<number | null>(null);
  const isRecognizingRef = useRef(false);
  const isVadPausedRef = useRef(false);
  const silenceStartRef = useRef<number | null>(null);
  const hasWebSpeechAPIRef = useRef<boolean>(true);
  const universalRecorderRef = useRef<MediaRecorder | null>(null);
  const universalAudioChunksRef = useRef<Blob[]>([]);


  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        const userDoc = await getDoc(doc(db, 'users', currentUser.uid));
        if (userDoc.exists()) {
          const fetchedRole = userDoc.data().role;
          setUserRole(currentUser.email === 'negeseshambel@gmail.com' ? 'admin' : fetchedRole);
        } else if (currentUser.email === 'negeseshambel@gmail.com') {
          setUserRole('admin');
        } else {
          setUserRole('user');
        }
      } else {
        setUserRole(null);
      }
      setIsAuthChecking(false);
    });

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    isListeningRef.current = isListening;

  }, [isListening]);

  useEffect(() => {
    formatModeRef.current = formatMode;
  }, [formatMode]);

  useEffect(() => {
    playbackSpeedRef.current = playbackSpeed;
    if (activeAudioRef.current) {
      activeAudioRef.current.playbackRate = playbackSpeed;
    }
  }, [playbackSpeed]);

  // Adjust default voice character when target or source changes
  useEffect(() => {
    const matchingVoice = VOICE_CHARACTERS.find((v) => v.lang === targetLang);
    if (matchingVoice && !VOICE_CHARACTERS.find((v) => v.id === selectedVoiceId && v.lang === targetLang)) {
      setSelectedVoiceId(matchingVoice.id);
    }
  }, [targetLang]);

  // Auto-scroll the source textarea to bottom when transcript changes
  useEffect(() => {
    if (isListening) {
      const textarea = document.getElementById('source-transcript-input') as HTMLTextAreaElement;
      if (textarea) {
        textarea.scrollTop = textarea.scrollHeight;
      }
    }
  }, [transcript, interimTranscript, isListening]);

  // Web Speech API Initialization
  useEffect(() => {
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      hasWebSpeechAPIRef.current = false;
      return;
    }
    
    hasWebSpeechAPIRef.current = true;

    let isActive = true;
    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = sourceLang;

    recognition.onstart = () => {
      setError('');
      isRecognizingRef.current = true;
    };

    recognition.onresult = (event: any) => {
      let finalStr = '';
      let interimStr = '';

      for (let i = event.resultIndex; i < event.results.length; ++i) {
        if (event.results[i].isFinal) {
          finalStr += event.results[i][0].transcript + ' ';
        } else {
          interimStr += event.results[i][0].transcript;
        }
      }

      if (finalStr) {
        const mode = formatModeRef.current;
        let cleanStr = finalStr.trim();

        if (mode === 'poem') {
          cleanStr = cleanStr.charAt(0).toUpperCase() + cleanStr.slice(1);
          setTranscript((prev) => {
            if (!prev) return cleanStr + '\n';
            const lines = prev.split('\n');
            let linesInCurrentStanza = 0;
            for (let i = lines.length - 1; i >= 0; i--) {
              if (lines[i].trim() === '') break;
              linesInCurrentStanza++;
            }

            let prefix = '';
            if (linesInCurrentStanza >= 4) {
              prefix = prev.endsWith('\n\n') ? '' : prev.endsWith('\n') ? '\n' : '\n\n';
            } else {
              prefix = prev.endsWith('\n') ? '' : '\n';
            }
            return prev + prefix + cleanStr + '\n';
          });
        } else {
          setTranscript((prev) => {
            if (!prev) return cleanStr;
            const endsWithSpace = prev.endsWith(' ');
            return prev + (endsWithSpace ? '' : ' ') + cleanStr;
          });
        }
      }
      setInterimTranscript(interimStr);
    };

    recognition.onerror = (event: any) => {
      if (event.error !== 'aborted' && event.error !== 'no-speech') {
        console.warn('Speech recognition notice:', event.error);
      }

      if (event.error === 'not-allowed') {
        setError('Microphone access was denied. Please allow microphone access in your browser.');
        setIsListening(false);
        isListeningRef.current = false;
      }
    };

    recognition.onend = () => {
      isRecognizingRef.current = false;
      if (isActive && isListeningRef.current && !isVadPausedRef.current) {
        try {
          recognition.start();
        } catch {
          // ignore already starting
        }
      } else if (!isListeningRef.current) {
        setInterimTranscript('');
      }
    };

    recognitionRef.current = recognition;

    if (isActive && isListeningRef.current) {
      try {
        recognition.start();
      } catch {}
    }

    return () => {
      isActive = false;
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch {}
      }
    };
  }, [sourceLang]);


  const stopVAD = () => {
    if (vadLoopRef.current) {
      cancelAnimationFrame(vadLoopRef.current);
      vadLoopRef.current = null;
    }
    if (audioContextRef.current) {
      audioContextRef.current.close().catch(() => {});
      audioContextRef.current = null;
    }
    if (universalRecorderRef.current && universalRecorderRef.current.state !== 'inactive') {
      universalRecorderRef.current.stop();
    }
    if (vadStreamRef.current) {
      vadStreamRef.current.getTracks().forEach(track => track.stop());
      vadStreamRef.current = null;
    }
    isVadPausedRef.current = false;
    silenceStartRef.current = null;
  };

  const startVAD = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      vadStreamRef.current = stream;

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
      }
      
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      audioContextRef.current = audioCtx;
      
      const analyser = audioCtx.createAnalyser();
      analyser.fftSize = 256;
      analyserRef.current = analyser;
      
      const source = audioCtx.createMediaStreamSource(stream);
      source.connect(analyser);
      
      const dataArray = new Uint8Array(analyser.frequencyBinCount);
      const SILENCE_THRESHOLD = 5; 
      const SILENCE_DURATION_MS = 1500; // Wait 1.5 seconds before pausing
      
      const checkVolume = () => {
        if (!isListeningRef.current) return;
        
        analyser.getByteFrequencyData(dataArray);
        let sum = 0;
        for (let i = 0; i < dataArray.length; i++) {
          sum += dataArray[i];
        }
        const averageVolume = sum / dataArray.length;
        
        if (averageVolume < SILENCE_THRESHOLD) {
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
        }
        
        vadLoopRef.current = requestAnimationFrame(checkVolume);
      };
      
      checkVolume();
    } catch (err) {
      console.warn("VAD Initialization failed:", err);
    }
  };

  const toggleListening = async () => {
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
  };

  // Direct Audio Recording for Gemini Transcription
  const startRecordingGemini = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      audioChunksRef.current = [];
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        const mimeType = mediaRecorder.mimeType || 'audio/webm';
        const audioBlob = new Blob(audioChunksRef.current, { type: mimeType });
        stream.getTracks().forEach((track) => track.stop());

        // Process directly with Gemini transcription
        showToast('Processing audio with AI...', 'loading');
        setIsTranscribingAudio(true);

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
            if (!response.ok) throw new Error(data.error || 'Transcription failed');

            if (data.transcription) {
              setTranscript((prev) => (prev ? prev + '\n\n' + data.transcription : data.transcription));
              showToast('Microphone recording transcribed!', 'success');
            }
          };
        } catch (err: any) {
          console.error(err);
          showToast(err.message || 'Transcription error', 'error');
        } finally {
          setIsTranscribingAudio(false);
        }
      };

      mediaRecorder.start();
      setIsRecordingGemini(true);
      showToast('Recording high-definition audio for AI...', 'loading');
    } catch (err) {
      console.error(err);
      setError('Unable to access microphone for recording. Please verify permissions.');
    }
  };

  const stopRecordingGemini = () => {
    if (mediaRecorderRef.current && isRecordingGemini) {
      mediaRecorderRef.current.stop();
      setIsRecordingGemini(false);
    }
  };

  
  const copyPublicLink = () => {
    const publicLink = 'https://ais-pre-llrc2cqk2snjfwztipirfq-825295273549.europe-west2.run.app';
    navigator.clipboard.writeText(publicLink).then(() => {
      showToast('Public link copied to clipboard!', 'success');
    }).catch(() => {
      showToast('Failed to copy link', 'error');
    });
  };




  const handleSourceLanguageChange = (lang: SupportedLanguage) => {
    setSourceLang(lang);
    showToast(`Source language: ${getLanguageLabel(lang)}`, 'info');
  };

  const translateTranscript = async () => {
    if (!transcript.trim()) {
      showToast('Please speak or type some text first to translate.', 'error');
      return;
    }

    setIsTranslating(true);
    showToast('Translating with AI...', 'loading');

    try {
      const response = await fetch('/api/translate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: transcript,
          sourceLang: getLanguageLabel(sourceLang),
          targetLang: getLanguageLabel(targetLang),
        }),
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Translation request failed');

      if (data.translatedText) {
        setTranslatedText(data.translatedText);
        showToast('Translation completed!', 'success');
      } else {
        throw new Error('Received empty translation response');
      }
    } catch (err: any) {
      console.error(err);
      showToast(err.message || 'Translation failed. Please check network.', 'error');
    } finally {
      setIsTranslating(false);
    }
  };

  // Text-To-Speech (TTS) Execution
  const handleSpeakText = async (textToSpeak: string) => {
    if (!textToSpeak.trim()) {
      showToast('No text available to speak.', 'error');
      return;
    }

    if (isPlayingAudio) {
      stopSpeaking();
      return;
    }

    const selectedVoice = VOICE_CHARACTERS.find((v) => v.id === selectedVoiceId) || VOICE_CHARACTERS[0];

    setIsPlayingAudio(true);
    setCurrentlySpeakingText(textToSpeak);
    showToast(`Generating speech with ${selectedVoice.name} (${selectedVoice.desc})...`, 'loading');

    try {
      const response = await fetch('/api/tts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: textToSpeak,
          voiceName: selectedVoice.voiceName,
          prompt: selectedVoice.prompt,
        }),
      });

      const data = await response.json();

      if (response.ok && data.audioBase64) {
        const wavBlob = pcmToWavBlob(data.audioBase64, data.sampleRate || 24000);
        const audioUrl = URL.createObjectURL(wavBlob);
        const audio = new Audio(audioUrl);
        activeAudioRef.current = audio;
        audio.playbackRate = playbackSpeedRef.current;

        audio.onended = () => {
          setIsPlayingAudio(false);
          setCurrentlySpeakingText(null);
          URL.revokeObjectURL(audioUrl);
        };

        audio.onerror = () => {
          setIsPlayingAudio(false);
          setCurrentlySpeakingText(null);
          fallbackWebSpeech(textToSpeak, selectedVoice.lang);
        };

        await audio.play();
        showToast(`Playing speech with ${selectedVoice.name}...`, 'success');
      } else {
        throw new Error(data.error || 'TTS audio generation failed');
      }
    } catch (err: any) {
      console.warn('Backend TTS failed, falling back to browser speech synthesis:', err);
      fallbackWebSpeech(textToSpeak, selectedVoice.lang);
    }
  };

  // Fallback browser speech synthesis
  const fallbackWebSpeech = (text: string, langCode: string) => {
    if ('speechSynthesis' in window) {
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = langCode;
      utterance.rate = playbackSpeedRef.current;
      utterance.onend = () => {
        setIsPlayingAudio(false);
        setCurrentlySpeakingText(null);
      };
      utterance.onerror = () => {
        setIsPlayingAudio(false);
        setCurrentlySpeakingText(null);
        showToast('Speech playback could not be completed on this device.', 'error');
      };
      window.speechSynthesis.speak(utterance);
      showToast('Speaking via browser speech synthesizer...', 'info');
    } else {
      setIsPlayingAudio(false);
      setCurrentlySpeakingText(null);
      showToast('Audio playback not supported on this browser.', 'error');
    }
  };

  const stopSpeaking = () => {
    if (activeAudioRef.current) {
      activeAudioRef.current.pause();
      activeAudioRef.current = null;
    }
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
    setIsPlayingAudio(false);
    setCurrentlySpeakingText(null);
    showToast('Speech playback stopped', 'info');
  };

  const transcribeAudioFile = async () => {
    if (!audioFile) {
      showToast('Please select an audio file first.', 'error');
      return;
    }

    setIsTranscribingAudio(true);
    showToast('Uploading and transcribing audio with AI...', 'loading');

    const fileToBase64 = (file: File): Promise<string> => {
      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => resolve((reader.result as string).split(',')[1]);
        reader.onerror = (error) => reject(error);
      });
    };

    try {
      const base64Data = await fileToBase64(audioFile);
      const response = await fetch('/api/transcribe-audio', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          audioBase64: base64Data,
          mimeType: audioFile.type || 'audio/mp3',
          sourceLang,
        }),
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Audio transcription failed');

      if (data.transcription) {
        setAudioTranscript(data.transcription.trim());
        showToast('Audio file transcribed successfully!', 'success');
      } else {
        throw new Error('Transcription response was empty');
      }
    } catch (err: any) {
      console.error(err);
      showToast(err.message || 'Failed to transcribe audio.', 'error');
    } finally {
      setIsTranscribingAudio(false);
    }
  };

  const getLanguageLabel = (code: SupportedLanguage) => {
    switch (code) {
      case 'en-US':
        return 'English';
      case 'am-ET':
        return 'Amharic (አማርኛ)';
      case 'om-ET':
        return 'Afaan Oromoo';
      default:
        return 'English';
    }
  };

  const swapLanguages = () => {
    const prevSource = sourceLang;
    setSourceLang(targetLang);
    setTargetLang(prevSource);

    const prevTranscript = transcript;
    setTranscript(translatedText);
    setTranslatedText(prevTranscript);

    showToast('Languages and text contents swapped', 'info');
  };

  const handleReset = () => {
    if (isListening) {
      setIsListening(false);
      isListeningRef.current = false;
      try {
        recognitionRef.current?.stop();
      } catch {}
    }
    stopSpeaking();
    if (isRecordingGemini) {
      stopRecordingGemini();
    }
    setTranscript('');
    setInterimTranscript('');
    setTranslatedText('');
    setAudioFile(null);
    setAudioTranscript('');
    showToast('Workspace reset successfully', 'info');
  };

  const copyToClipboard = async (textToCopy: string) => {
    if (!textToCopy) return;
    try {
      await navigator.clipboard.writeText(textToCopy);
      showToast('Copied to clipboard!', 'success');
    } catch {
      const textArea = document.createElement('textarea');
      textArea.value = textToCopy;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      showToast('Copied to clipboard!', 'success');
    }
  };


  const detectLanguage = async () => {
    if (!transcript.trim()) {
      showToast('Please dictate or type some text first to detect language', 'error');
      return;
    }
    
    setIsDetectingLang(true);
    showToast('Detecting language...', 'loading');
    
    try {
      const response = await fetch('/api/detect-language', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: transcript }),
      });
      
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Failed to detect language');
      
      const detected = data.language;
      if (detected !== sourceLang) {
        setSourceLang(detected);
        showToast(`Detected language: ${getLanguageLabel(detected)}`, 'success');
      } else {
        showToast(`Current language (${getLanguageLabel(detected)}) is correct`, 'success');
      }
    } catch (err: any) {
      console.error(err);
      showToast(err.message || 'Detection failed', 'error');
    } finally {
      setIsDetectingLang(false);
    }
  };

  const showToast = (message: string, type: ToastNotification['type'] = 'success') => {
    setToast({ message, type });
    if (type !== 'loading') {
      setTimeout(() => setToast(null), 3200);
    }
  };

  const countStats = (text: string) => {
    const chars = text.length;
    const words = text.trim() ? text.trim().split(/\s+/).length : 0;
    const lines = text.trim() ? text.split('\n').length : 0;
    return { chars, words, lines };
  };

  const sourceStats = countStats(transcript);
  const targetStats = countStats(translatedText);

  if (isAuthChecking) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center text-slate-400 gap-4">
        <Activity className="w-8 h-8 text-indigo-500 animate-spin" />
        <p className="text-sm font-medium">Verifying session...</p>
      </div>
    );
  }

  if (!user) {
    return <Auth onAuthSuccess={() => {}} />;
  }

  return (
    <div id="polyglot-root" className="min-h-screen bg-slate-950 text-slate-100 font-sans flex flex-col">
      {/* Top Banner Navigation */}
      <header id="main-header" className="border-b border-slate-800 bg-slate-900/90 backdrop-blur sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3.5 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-4">
            <div className="bg-slate-800 p-1.5 rounded-xl shadow-md border border-slate-700/50 flex items-center justify-center shrink-0">
              <img 
                src="/logo.jpg" 
                alt="Salale University Logo" 
                className="h-7 w-auto object-contain bg-white rounded-md p-0.5"
                onError={(e) => {
                  e.currentTarget.src = 'https://placehold.co/100x100/1e293b/ffffff?text=SLU';
                }}
              />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-base font-black tracking-tight text-white">Multilingual Scribe</h1>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                  {userRole === 'admin' ? 'Admin Mode' : 'Horn of Africa AI'}
                </span>
              </div>
              <p className="text-slate-400 text-[10px] font-medium">
                {user?.email?.split('@')[0] || 'Guest Mode'} • Afaan Oromoo • Amharic • English
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              id="tab-btn-live"
              onClick={() => setActiveTab('live')}
              className={`px-2.5 py-1.5 rounded-lg text-[11px] font-semibold transition-all flex items-center gap-1.5 ${
                activeTab === 'live'
                  ? 'bg-indigo-600 text-white shadow-sm shadow-indigo-600/30'
                  : 'bg-slate-800 text-slate-300 hover:bg-slate-750 hover:text-white'
              }`}
            >
              <Mic className="w-3 h-3" />
              Live Dictation & Translation
            </button>
            <button
              id="tab-btn-audio"
              onClick={() => setActiveTab('audio')}
              className={`px-2.5 py-1.5 rounded-lg text-[11px] font-semibold transition-all flex items-center gap-1.5 ${
                activeTab === 'audio'
                  ? 'bg-indigo-600 text-white shadow-sm shadow-indigo-600/30'
                  : 'bg-slate-800 text-slate-300 hover:bg-slate-750 hover:text-white'
              }`}
            >
              <FileAudio className="w-3 h-3" />
              Transcribe Audio File
            </button>

            {userRole === 'admin' && (
              <button
                id="tab-btn-admin"
                onClick={() => setActiveTab('admin')}
                className={`px-2.5 py-1.5 rounded-lg text-[11px] font-semibold transition-all flex items-center gap-1.5 ${
                  activeTab === 'admin'
                    ? 'bg-indigo-600 text-white shadow-sm shadow-indigo-600/30'
                    : 'bg-slate-800 text-slate-300 hover:bg-slate-750 hover:text-white'
                }`}
              >
                <Activity className="w-3 h-3" />
                Admin Dashboard
              </button>
            )}
            <button
              id="btn-reset-all"
              onClick={handleReset}
              className="px-2.5 py-1.5 rounded-lg text-[11px] font-semibold bg-slate-800 text-slate-400 hover:text-rose-300 hover:bg-rose-500/10 border border-slate-700/60 transition-all flex items-center gap-1.5"
              title="Reset all fields"
            >
              <RefreshCw className="w-3 h-3" />
              <span className="hidden md:inline">Reset</span>
            </button>
            <button
              id="btn-share-link"
              onClick={copyPublicLink}
              className="px-2.5 py-1.5 rounded-lg text-[11px] font-semibold bg-emerald-600/20 text-emerald-400 hover:text-emerald-300 hover:bg-emerald-600/30 border border-emerald-500/30 transition-all flex items-center gap-1.5 ml-2"
              title="Share Public Link"
            >
              <Share2 className="w-3 h-3" />
              <span className="hidden md:inline">Share App</span>
            </button>
            <button
              id="btn-logout"
              onClick={() => signOut(auth)}
              className="px-2.5 py-1.5 rounded-lg text-[11px] font-semibold bg-slate-800 text-slate-400 hover:text-white hover:bg-slate-700 border border-slate-700/60 transition-all flex items-center gap-1.5 ml-2"
              title="Sign Out"
            >
              <LogOut className="w-3 h-3" />
              <span className="hidden md:inline">Sign Out</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-grow max-w-7xl mx-auto w-full p-4 sm:p-6 lg:p-8 space-y-6">
        {error && (
          <div id="error-alert" className="bg-amber-500/10 border border-amber-500/30 text-amber-200 p-4 rounded-xl flex items-start gap-3 text-xs leading-relaxed">
            <AlertCircle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
            <div className="flex-grow">
              <span className="font-bold">System Notice: </span>
              {error}
            </div>
            <button onClick={() => setError('')} className="text-amber-400 hover:text-amber-200 text-xs font-bold">
              Dismiss
            </button>
          </div>
        )}

        {/* TAB 1: LIVE SPEECH & TRANSLATION */}
        {activeTab === 'live' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            {/* Control Sidebar Panel */}
            <aside id="sidebar-controls" className="lg:col-span-3 space-y-4">
              <div className="bg-slate-900 rounded-2xl border border-slate-800 p-5 shadow-lg space-y-5">
                {/* Voice Dictation Hub */}
                <div className="text-center">
                  <div className="flex justify-center mb-3">
                    <button
                      id="btn-toggle-mic"
                      onClick={toggleListening}
                      className={`relative w-20 h-20 rounded-full flex items-center justify-center transition-all duration-300 shadow-xl cursor-pointer ${
                        isListening
                          ? 'bg-rose-500/20 border-2 border-rose-500 text-rose-400 shadow-rose-500/20 hover:bg-rose-500/30'
                          : 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-indigo-600/30 hover:scale-105 active:scale-95'
                      }`}
                      title={isListening ? 'Click to stop listening' : 'Click to start continuous live speech recognition'}
                    >
                      {isListening ? (
                        <>
                          <div className="absolute inset-0 rounded-full animate-ping bg-rose-500/30"></div>
                          <MicOff className="w-8 h-8 relative z-10" />
                        </>
                      ) : (
                        <Mic className="w-8 h-8" />
                      )}
                    </button>
                  </div>

                  <h2 className="text-sm font-bold text-slate-100">
                    {isListening ? 'Listening Continuously...' : 'Live Speech Recognition'}
                  </h2>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    {isListening ? 'Speak naturally in ' + getLanguageLabel(sourceLang) : 'Click microphone to dictate live'}
                  </p>
                </div>

                {/* Gemini Direct Record Option (Alternative for browsers with limited speech dictation) */}
                <div className="pt-2 border-t border-slate-800/80">
                  <button
                    id="btn-gemini-record"
                    onClick={isRecordingGemini ? stopRecordingGemini : startRecordingGemini}
                    className={`w-full py-2 px-3 rounded-xl text-xs font-semibold flex items-center justify-center gap-2 transition-all cursor-pointer ${
                      isRecordingGemini
                        ? 'bg-rose-600 text-white animate-pulse'
                        : 'bg-slate-800 hover:bg-slate-750 text-indigo-300 border border-indigo-500/30'
                    }`}
                  >
                    {isRecordingGemini ? (
                      <>
                        <Square className="w-3.5 h-3.5" />
                        Stop & Transcribe with AI
                      </>
                    ) : (
                      <>
                        <Radio className="w-3.5 h-3.5 text-indigo-400" />
                        Record Audio via AI
                      </>
                    )}
                  </button>
                  <p className="text-[10px] text-slate-400 text-center mt-1">
                    Direct AI audio processing for highest dialect accuracy
                  </p>
                </div>

                {/* Dictation Mode: Paragraph vs Poem */}
                <div className="pt-2 border-t border-slate-800/80 space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="text-[10px] font-bold text-indigo-400 tracking-wider uppercase">
                      Dictation Formatting
                    </label>
                    <span className="text-[10px] text-slate-400">
                      {formatMode === 'poem' ? '4-line stanzas' : 'Fluid'}
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-1.5 bg-slate-950 p-1 rounded-xl border border-slate-800">
                    <button
                      id="mode-paragraph"
                      onClick={() => setFormatMode('paragraph')}
                      className={`py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                        formatMode === 'paragraph'
                          ? 'bg-indigo-600 text-white shadow-xs'
                          : 'text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      Paragraph
                    </button>
                    <button
                      id="mode-poem"
                      onClick={() => setFormatMode('poem')}
                      className={`py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                        formatMode === 'poem'
                          ? 'bg-indigo-600 text-white shadow-xs'
                          : 'text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      Poem Mode
                    </button>
                  </div>
                </div>

                {/* 12 Character Voices Selector */}
                <div className="pt-2 border-t border-slate-800/80 space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-[10px] font-bold text-indigo-400 tracking-wider uppercase flex items-center gap-1">
                      <User className="w-3 h-3" />
                      12 Character Voices (TTS)
                    </label>
                    {isPlayingAudio && (
                      <span className="flex items-center gap-1 text-[10px] text-emerald-400 font-semibold animate-pulse">
                        <Activity className="w-3 h-3" /> Playing
                      </span>
                    )}
                  </div>

                  <select
                    id="select-voice-character"
                    value={selectedVoiceId}
                    onChange={(e) => {
                      setSelectedVoiceId(e.target.value);
                      const character = VOICE_CHARACTERS.find((v) => v.id === e.target.value);
                      if (character) {
                        showToast(`Voice set to: ${character.name} (${character.gender})`, 'info');
                      }
                    }}
                    className="w-full bg-slate-950 border border-slate-800 text-slate-200 text-xs rounded-xl py-2 px-3 outline-none focus:border-indigo-500 cursor-pointer"
                  >
                    <optgroup label="Afaan Oromoo Voices (4 Characters)">
                      {VOICE_CHARACTERS.filter((v) => v.lang === 'om-ET').map((voice) => (
                        <option key={voice.id} value={voice.id}>
                          {voice.name} ({voice.gender}) • {voice.desc.split('(')[0]}
                        </option>
                      ))}
                    </optgroup>
                    <optgroup label="Amharic Voices - አማርኛ (4 Characters)">
                      {VOICE_CHARACTERS.filter((v) => v.lang === 'am-ET').map((voice) => (
                        <option key={voice.id} value={voice.id}>
                          {voice.name} ({voice.gender}) • {voice.desc.split('(')[0]}
                        </option>
                      ))}
                    </optgroup>
                    <optgroup label="English Voices (4 Characters)">
                      {VOICE_CHARACTERS.filter((v) => v.lang === 'en-US').map((voice) => (
                        <option key={voice.id} value={voice.id}>
                          {voice.name} ({voice.gender}) • {voice.desc.split('(')[0]}
                        </option>
                      ))}
                    </optgroup>
                  </select>

                  {/* Character Description Badge */}
                  <div className="bg-slate-950/70 p-2.5 rounded-xl border border-slate-800/80 text-[11px] text-slate-400 leading-snug">
                    <div className="flex items-center justify-between text-slate-300 font-semibold mb-0.5">
                      <span>{VOICE_CHARACTERS.find((v) => v.id === selectedVoiceId)?.name}</span>
                      <span className="text-[10px] text-indigo-400">
                        {VOICE_CHARACTERS.find((v) => v.id === selectedVoiceId)?.gender}
                      </span>
                    </div>
                    {VOICE_CHARACTERS.find((v) => v.id === selectedVoiceId)?.desc}
                  </div>

                  {/* Playback Speed Slider */}
                  <div className="pt-3 pb-1">
                    <div className="flex items-center justify-between mb-2">
                      <label className="text-[10px] font-bold text-slate-400 uppercase">
                        Speed: {playbackSpeed.toFixed(1)}x
                      </label>
                    </div>
                    <input
                      type="range"
                      min="0.5"
                      max="2.0"
                      step="0.1"
                      value={playbackSpeed}
                      onChange={(e) => setPlaybackSpeed(parseFloat(e.target.value))}
                      className="w-full accent-indigo-500 h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer"
                    />
                    <div className="flex justify-between text-[9px] text-slate-500 font-medium mt-1">
                      <span>0.5x</span>
                      <span>1.0x</span>
                      <span>2.0x</span>
                    </div>
                  </div>

                  {isPlayingAudio && (
                    <button
                      id="btn-stop-audio"
                      onClick={stopSpeaking}
                      className="w-full py-1.5 px-3 rounded-lg text-xs font-semibold bg-rose-500/20 text-rose-300 border border-rose-500/40 hover:bg-rose-500/30 flex items-center justify-center gap-1.5 transition-all"
                    >
                      <VolumeX className="w-3.5 h-3.5" />
                      Stop Audio Playback
                    </button>
                  )}
                </div>
              </div>

              {/* Sample Starters */}
              <div className="bg-slate-900/60 rounded-2xl border border-slate-800/80 p-4 space-y-2">
                <div className="flex items-center gap-1.5 text-xs font-bold text-slate-300">
                  <BookOpen className="w-3.5 h-3.5 text-indigo-400" />
                  Quick Sample Texts
                </div>
                <p className="text-[11px] text-slate-400 leading-relaxed">
                  Click to populate the editor for testing:
                </p>
                <div className="space-y-1.5 pt-1">
                  {SAMPLE_PHRASES[sourceLang]?.map((sample, idx) => (
                    <button
                      key={idx}
                      onClick={() => {
                        setTranscript(sample.text);
                        showToast(`Loaded: ${sample.title}`, 'info');
                      }}
                      className="w-full text-left p-2 rounded-lg bg-slate-950/80 hover:bg-slate-800 border border-slate-800 text-[11px] text-slate-300 transition-colors block cursor-pointer truncate"
                    >
                      • {sample.title}
                    </button>
                  ))}
                </div>
              </div>
            </aside>

            {/* Dual Pane Translation and Dictation Canvas */}
            <div className="lg:col-span-9 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Source Speech / Text Pane */}
                <div id="pane-source" className="bg-slate-900 rounded-2xl border border-slate-800 flex flex-col h-[520px] shadow-xl overflow-hidden">
                  {/* Pane Header */}
                  <div className="bg-slate-900/90 border-b border-slate-800 p-3.5 flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className={`w-2.5 h-2.5 rounded-full ${isListening ? 'bg-rose-500 animate-ping' : 'bg-indigo-500'}`} />
                      <span className="text-xs font-bold text-slate-200 tracking-wide uppercase">Source Text</span>
                    </div>


                    <div className="flex items-center gap-2">
                      <button
                        onClick={detectLanguage}
                        disabled={isDetectingLang || !transcript}
                        className="bg-slate-800 hover:bg-slate-700 text-slate-300 disabled:opacity-30 border border-slate-700 rounded-lg text-xs font-bold py-1 px-2.5 outline-none transition-colors flex items-center gap-1 cursor-pointer"
                        title="Auto-detect language from text"
                      >
                        {isDetectingLang ? (
                          <Activity className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <Sparkles className="w-3.5 h-3.5" />
                        )}
                        Detect
                      </button>
                      <select
                        id="select-source-lang"
                        value={sourceLang}
                        onChange={(e) => handleSourceLanguageChange(e.target.value as SupportedLanguage)}
                        className="bg-slate-950 border border-slate-800 text-indigo-400 rounded-lg text-xs font-bold py-1 px-2.5 outline-none focus:ring-1 focus:ring-indigo-500 cursor-pointer"
                      >
                        <option value="om-ET">Afaan Oromoo</option>
                        <option value="am-ET">Amharic (አማርኛ)</option>
                        <option value="en-US">English</option>
                      </select>
                    </div>
                  </div>

                  {/* Textarea Area */}
                  <div className="relative flex-grow p-4 flex flex-col">
                    <textarea
                      id="source-transcript-input"
                      value={transcript + (interimTranscript ? (transcript && !transcript.endsWith(' ') && !transcript.endsWith('\n') ? ' ' : '') + interimTranscript : '')}
                      onChange={(e) => setTranscript(e.target.value)}
                      readOnly={isListening}
                      placeholder="Transcription will stream here automatically as you dictate, or you can write/paste your text directly..."
                      className={`flex-grow w-full bg-transparent resize-none border-none focus:ring-0 text-sm sm:text-base leading-relaxed placeholder-slate-500 outline-none ${isListening ? 'text-indigo-200' : 'text-slate-100'}`}
                      spellCheck="false"
                    />

                    {isListening && interimTranscript && (
                      <div className="absolute bottom-3 right-4 flex items-center gap-2">
                        <Activity className="w-4 h-4 text-indigo-400 animate-pulse" />
                        <span className="text-xs font-medium text-indigo-400/80 animate-pulse">Live streaming...</span>
                      </div>
                    )}
                  </div>

                  {/* Stats Bar */}
                  <div className="px-4 py-1.5 bg-slate-950/60 border-t border-slate-850 flex items-center justify-between text-[11px] text-slate-400">
                    <span>
                      {sourceStats.words} words • {sourceStats.chars} chars • {sourceStats.lines} lines
                    </span>
                    {transcript && (
                      <button
                        onClick={() => setTranscript('')}
                        className="hover:text-rose-400 transition-colors"
                        title="Clear source"
                      >
                        Clear
                      </button>
                    )}
                  </div>

                  {/* Pane Actions Footer */}
                  <div className="border-t border-slate-800 p-3 bg-slate-900/90 flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <button
                        id="btn-copy-source"
                        onClick={() => copyToClipboard(transcript)}
                        disabled={!transcript}
                        className="p-2 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-all disabled:opacity-30 cursor-pointer"
                        title="Copy Source Text"
                      >
                        <Copy className="w-4 h-4" />
                      </button>
                      <button
                        id="btn-speak-source"
                        onClick={() => handleSpeakText(transcript)}
                        disabled={!transcript}
                        className={`p-2 rounded-lg transition-all disabled:opacity-30 cursor-pointer ${
                          isPlayingAudio && currentlySpeakingText === transcript
                            ? 'text-rose-400 bg-rose-500/10'
                            : 'text-indigo-400 hover:text-indigo-300 hover:bg-slate-800'
                        }`}
                        title={isPlayingAudio ? 'Stop audio' : 'Speak with selected voice character'}
                      >
                        {isPlayingAudio && currentlySpeakingText === transcript ? (
                          <VolumeX className="w-4 h-4" />
                        ) : (
                          <Volume2 className="w-4 h-4" />
                        )}
                      </button>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <button
                        id="btn-export-source-word"
                        onClick={() => exportToWord(transcript, 'SourceTranscript.doc')}
                        disabled={!transcript}
                        className="px-2.5 py-1.5 rounded-lg text-xs bg-slate-800 hover:bg-slate-750 text-slate-300 transition-colors disabled:opacity-30 flex items-center gap-1 cursor-pointer"
                        title="Export to Microsoft Word"
                      >
                        <FileText className="w-3.5 h-3.5" />
                        Word
                      </button>
                      <button
                        id="btn-export-source-pdf"
                        onClick={() => exportToPDF(transcript, 'SourceTranscript.pdf')}
                        disabled={!transcript}
                        className="px-2.5 py-1.5 rounded-lg text-xs bg-slate-800 hover:bg-slate-750 text-slate-300 transition-colors disabled:opacity-30 flex items-center gap-1 cursor-pointer"
                        title="Export to PDF"
                      >
                        <Download className="w-3.5 h-3.5" />
                        PDF
                      </button>
                    </div>
                  </div>
                </div>

                {/* Target Translation Pane */}
                <div id="pane-target" className="bg-slate-900 rounded-2xl border border-slate-800 flex flex-col h-[520px] shadow-xl overflow-hidden">
                  {/* Pane Header */}
                  <div className="bg-slate-900/90 border-b border-slate-800 p-3.5 flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full bg-purple-500" />
                      <span className="text-xs font-bold text-slate-200 tracking-wide uppercase">Translation Result</span>
                    </div>

                    <div className="flex items-center gap-2">
                      <select
                        id="select-target-lang"
                        value={targetLang}
                        onChange={(e) => {
                          setTargetLang(e.target.value as SupportedLanguage);
                          showToast(`Target language: ${getLanguageLabel(e.target.value as SupportedLanguage)}`, 'info');
                        }}
                        className="bg-slate-950 border border-slate-800 text-purple-400 rounded-lg text-xs font-bold py-1 px-2.5 outline-none focus:ring-1 focus:ring-purple-500 cursor-pointer"
                      >
                        <option value="en-US">English</option>
                        <option value="om-ET">Afaan Oromoo</option>
                        <option value="am-ET">Amharic (አማርኛ)</option>
                      </select>
                    </div>
                  </div>

                  {/* Textarea Area */}
                  <div className="relative flex-grow p-4 flex flex-col">
                    <textarea
                      id="target-translation-output"
                      value={translatedText}
                      onChange={(e) => setTranslatedText(e.target.value)}
                      placeholder="Your translated output will appear here. Press 'Translate with AI' below to begin."
                      className="flex-grow w-full bg-transparent resize-none border-none focus:ring-0 text-sm sm:text-base text-slate-100 leading-relaxed placeholder-slate-500 outline-none"
                      spellCheck="false"
                    />

                    {isTranslating && (
                      <div className="absolute inset-0 bg-slate-900/80 backdrop-blur-xs flex flex-col items-center justify-center gap-3">
                        <Activity className="w-8 h-8 text-purple-400 animate-spin" />
                        <p className="text-xs font-medium text-purple-300">
                          Translating {getLanguageLabel(sourceLang)} → {getLanguageLabel(targetLang)}...
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Stats Bar */}
                  <div className="px-4 py-1.5 bg-slate-950/60 border-t border-slate-850 flex items-center justify-between text-[11px] text-slate-400">
                    <span>
                      {targetStats.words} words • {targetStats.chars} chars • {targetStats.lines} lines
                    </span>
                    {translatedText && (
                      <button
                        onClick={() => setTranslatedText('')}
                        className="hover:text-rose-400 transition-colors"
                        title="Clear target"
                      >
                        Clear
                      </button>
                    )}
                  </div>

                  {/* Pane Actions Footer */}
                  <div className="border-t border-slate-800 p-3 bg-slate-900/90 flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <button
                        id="btn-copy-target"
                        onClick={() => copyToClipboard(translatedText)}
                        disabled={!translatedText}
                        className="p-2 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-all disabled:opacity-30 cursor-pointer"
                        title="Copy Translation"
                      >
                        <Copy className="w-4 h-4" />
                      </button>
                      <button
                        id="btn-speak-target"
                        onClick={() => handleSpeakText(translatedText)}
                        disabled={!translatedText}
                        className={`p-2 rounded-lg transition-all disabled:opacity-30 cursor-pointer ${
                          isPlayingAudio && currentlySpeakingText === translatedText
                            ? 'text-rose-400 bg-rose-500/10'
                            : 'text-purple-400 hover:text-purple-300 hover:bg-slate-800'
                        }`}
                        title={isPlayingAudio ? 'Stop audio' : 'Speak translation with voice character'}
                      >
                        {isPlayingAudio && currentlySpeakingText === translatedText ? (
                          <VolumeX className="w-4 h-4" />
                        ) : (
                          <Volume2 className="w-4 h-4" />
                        )}
                      </button>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <button
                        id="btn-export-target-word"
                        onClick={() => exportToWord(translatedText, 'TranslatedText.doc')}
                        disabled={!translatedText}
                        className="px-2.5 py-1.5 rounded-lg text-xs bg-slate-800 hover:bg-slate-750 text-slate-300 transition-colors disabled:opacity-30 flex items-center gap-1 cursor-pointer"
                        title="Export to Microsoft Word"
                      >
                        <FileText className="w-3.5 h-3.5" />
                        Word
                      </button>
                      <button
                        id="btn-export-target-pdf"
                        onClick={() => exportToPDF(translatedText, 'TranslatedText.pdf')}
                        disabled={!translatedText}
                        className="px-2.5 py-1.5 rounded-lg text-xs bg-slate-800 hover:bg-slate-750 text-slate-300 transition-colors disabled:opacity-30 flex items-center gap-1 cursor-pointer"
                        title="Export to PDF"
                      >
                        <Download className="w-3.5 h-3.5" />
                        PDF
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Translation Operations Bridge */}
              <div id="bridge-controls" className="bg-slate-900 rounded-2xl border border-slate-800 p-4 flex flex-col sm:flex-row items-center justify-between gap-4 shadow-md">
                <button
                  id="btn-swap-languages"
                  onClick={swapLanguages}
                  className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-750 border border-slate-700 text-slate-200 transition-all text-xs font-semibold flex items-center gap-2 shadow-xs active:scale-95 cursor-pointer"
                >
                  <ArrowRightLeft className="w-4 h-4 text-indigo-400" />
                  Swap Languages & Text
                </button>

                <div className="flex items-center gap-3">
                  <span className="text-xs text-slate-400 hidden sm:inline">
                    {getLanguageLabel(sourceLang)} → {getLanguageLabel(targetLang)}
                  </span>

                  <button
                    id="btn-translate-gemini"
                    onClick={translateTranscript}
                    disabled={!transcript || isTranslating}
                    className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 hover:from-indigo-500 hover:to-pink-500 text-white font-bold text-xs transition-all shadow-lg shadow-indigo-600/20 disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-2 cursor-pointer active:scale-95"
                  >
                    <Sparkles className="w-4 h-4" />
                    {isTranslating ? 'Translating with AI...' : 'Translate with AI'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: AUDIO FILE TRANSCRIBER */}
        {activeTab === 'audio' && (
          <div className="max-w-4xl mx-auto space-y-6">
            <div id="audio-upload-card" className="bg-slate-900 rounded-2xl border border-slate-800 p-6 shadow-xl space-y-5">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-indigo-600/20 text-indigo-400 rounded-xl border border-indigo-500/30">
                  <Upload className="w-6 h-6" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-slate-100">
                    Audio File Transcription via AI
                  </h2>
                  <p className="text-slate-400 text-xs mt-0.5">
                    Upload voice recordings, interviews, speeches, or poetry audio (MP3, WAV, M4A, OGG, WebM)
                  </p>
                </div>
              </div>

              {/* Drag and Drop Box */}
              <div
                id="dropzone-audio"
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => {
                  e.preventDefault();
                  if (e.dataTransfer.files?.[0]) {
                    setAudioFile(e.dataTransfer.files[0]);
                    showToast(`Loaded: ${e.dataTransfer.files[0].name}`, 'success');
                  }
                }}
                className="border-2 border-dashed border-slate-700 hover:border-indigo-500 rounded-2xl p-8 text-center bg-slate-950/60 transition-all flex flex-col items-center justify-center cursor-pointer group"
              >
                <input
                  type="file"
                  accept="audio/*"
                  id="audio-file-upload-input"
                  className="hidden"
                  onChange={(e) => {
                    if (e.target.files?.[0]) {
                      setAudioFile(e.target.files[0]);
                      showToast(`Loaded: ${e.target.files[0].name}`, 'success');
                    }
                  }}
                />
                <label htmlFor="audio-file-upload-input" className="cursor-pointer flex flex-col items-center gap-3">
                  <div className="p-4 bg-slate-800 group-hover:bg-indigo-600/20 rounded-full text-indigo-400 transition-colors">
                    <FileAudio className="w-8 h-8" />
                  </div>
                  <div>
                    <span className="font-semibold text-sm text-slate-200 block">
                      {audioFile ? audioFile.name : 'Click to select or drag & drop an audio file'}
                    </span>
                    <span className="text-xs text-slate-400 mt-1 block">
                      Supports MP3, WAV, AAC, M4A, WebM up to 100MB
                    </span>
                  </div>
                </label>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
                {audioFile ? (
                  <div className="text-xs text-slate-400 flex items-center gap-2">
                    <span className="font-medium text-slate-200">{audioFile.name}</span>
                    <span>({(audioFile.size / (1024 * 1024)).toFixed(2)} MB)</span>
                    <button
                      onClick={() => setAudioFile(null)}
                      className="text-rose-400 hover:underline text-[11px] cursor-pointer"
                    >
                      Remove
                    </button>
                  </div>
                ) : (
                  <div className="text-xs text-slate-400">No file chosen yet</div>
                )}

                <div className="flex items-center gap-2">
                  <button
                    id="btn-transcribe-file"
                    onClick={transcribeAudioFile}
                    disabled={!audioFile || isTranscribingAudio}
                    className="px-5 py-2.5 rounded-xl text-xs font-bold bg-indigo-600 hover:bg-indigo-500 text-white transition-all disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-2 shadow-lg shadow-indigo-600/20 cursor-pointer"
                  >
                    <Sparkles className="w-4 h-4" />
                    {isTranscribingAudio ? 'Transcribing with AI...' : 'Start Audio Transcription'}
                  </button>
                </div>
              </div>
            </div>

            {/* Transcription Outcome display */}
            {(audioTranscript || isTranscribingAudio) && (
              <div id="file-transcription-result" className="bg-slate-900 rounded-2xl border border-slate-800 p-6 shadow-xl flex flex-col h-[460px]">
                <div className="flex justify-between items-center pb-4 border-b border-slate-800">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                    <span className="text-xs font-bold text-slate-200 tracking-wide uppercase">
                      Audio Transcription Result
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => copyToClipboard(audioTranscript)}
                      disabled={!audioTranscript}
                      className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-750 text-slate-300 disabled:opacity-35 cursor-pointer"
                      title="Copy"
                    >
                      <Copy className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => handleSpeakText(audioTranscript)}
                      disabled={!audioTranscript}
                      className={`p-1.5 rounded-lg transition-colors disabled:opacity-35 cursor-pointer ${
                        isPlayingAudio && currentlySpeakingText === audioTranscript
                          ? 'bg-rose-500/20 text-rose-300'
                          : 'bg-slate-800 text-indigo-300'
                      }`}
                      title={isPlayingAudio ? 'Stop speaking' : 'Speak with selected voice'}
                    >
                      {isPlayingAudio && currentlySpeakingText === audioTranscript ? (
                        <VolumeX className="w-3.5 h-3.5" />
                      ) : (
                        <Volume2 className="w-3.5 h-3.5" />
                      )}
                    </button>
                    <button
                      onClick={() => {
                        setTranscript(audioTranscript);
                        setActiveTab('live');
                        showToast('Sent to Live Editor for translation & formatting', 'success');
                      }}
                      disabled={!audioTranscript}
                      className="px-2.5 py-1.5 rounded-lg text-xs bg-indigo-600 hover:bg-indigo-500 text-white font-medium disabled:opacity-35 flex items-center gap-1 cursor-pointer"
                      title="Send to Live Editor to translate"
                    >
                      <Sparkles className="w-3 h-3" />
                      Send to Live Editor
                    </button>
                    <button
                      onClick={() => exportToWord(audioTranscript, 'AudioTranscript.doc')}
                      disabled={!audioTranscript}
                      className="px-2.5 py-1.5 rounded-lg text-xs bg-slate-800 hover:bg-slate-750 text-slate-300 disabled:opacity-35 cursor-pointer"
                    >
                      Word
                    </button>
                    <button
                      onClick={() => exportToPDF(audioTranscript, 'AudioTranscript.pdf')}
                      disabled={!audioTranscript}
                      className="px-2.5 py-1.5 rounded-lg text-xs bg-slate-800 hover:bg-slate-750 text-slate-300 disabled:opacity-35 cursor-pointer"
                    >
                      PDF
                    </button>
                  </div>
                </div>

                <div className="flex-grow p-4 overflow-y-auto mt-2">
                  {isTranscribingAudio ? (
                    <div className="flex flex-col items-center justify-center h-full text-slate-400 gap-3">
                      <Activity className="w-8 h-8 text-indigo-500 animate-spin" />
                      <p className="text-xs font-medium">Transcribing speech with AI...</p>
                    </div>
                  ) : (
                    <textarea
                      value={audioTranscript}
                      onChange={(e) => setAudioTranscript(e.target.value)}
                      className="w-full h-full bg-transparent resize-none border-none focus:ring-0 text-sm sm:text-base text-slate-100 leading-relaxed outline-none"
                    />
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {/* TAB 3: ADMIN DASHBOARD */}
        {activeTab === 'admin' && userRole === 'admin' && (
          <AdminDashboard />
        )}
      </main>

      
      {/* Footer */}
      <footer className="w-full text-center py-6 mt-auto border-t border-slate-800/60 flex flex-col gap-1 items-center justify-center relative z-10 bg-slate-950/50 backdrop-blur-sm">
        <p className="text-sm font-semibold text-slate-300 tracking-wide">
          Developed by Salale University Instructors &copy; 2026
        </p>
        <p className="text-xs text-slate-500 font-medium tracking-wider uppercase">
          Address: Fiche
        </p>
      </footer>

      {/* Floating Status Toast Notification */}

      {toast && (
        <div
          id="toast-notification"
          className="fixed bottom-6 right-6 bg-slate-900 shadow-2xl border border-slate-700/80 rounded-xl px-5 py-3.5 flex items-center gap-3 animate-fade-in-up z-50 max-w-md"
        >
          {toast.type === 'loading' ? (
            <Activity className="w-4 h-4 text-indigo-400 animate-spin shrink-0" />
          ) : toast.type === 'error' ? (
            <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
          ) : toast.type === 'info' ? (
            <div className="w-2 h-2 rounded-full bg-indigo-400 shrink-0" />
          ) : (
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          )}
          <span className="font-medium text-slate-200 text-xs sm:text-sm">{toast.message}</span>
        </div>
      )}

      {/* Keyframe animations */}
      <style>{`
        @keyframes fade-in-up {
          0% { opacity: 0; transform: translateY(10px); }
          100% { opacity: 1; transform: translateY(0); }
        }
        .animate-fade-in-up {
          animation: fade-in-up 0.2s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }
      `}</style>
    </div>
  );
}
