export interface VoiceCharacter {
  id: string;
  name: string;
  lang: 'en-US' | 'am-ET' | 'om-ET';
  gender: 'Female' | 'Male';
  desc: string;
  voiceName: string;
  prompt: string;
}

export type SupportedLanguage = 'om-ET' | 'am-ET' | 'en-US';

export type DictationMode = 'paragraph' | 'poem';

export interface ToastNotification {
  message: string;
  type: 'success' | 'error' | 'loading' | 'info';
}
