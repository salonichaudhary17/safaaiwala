import React, { useState, useEffect, useRef } from 'react';
import { Mic, MicOff, Volume2, Globe, Sparkles } from 'lucide-react';
import { translations } from '../i18n/translations';

export default function VoiceAssistant({ lang = 'hi', setLang, onNavigate, onTriggerScan }) {
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [spokenText, setSpokenText] = useState('');
  const recognitionRef = useRef(null);

  const t = translations[lang] || translations.hi;

  const langCodeMap = {
    hi: 'hi-IN',
    mr: 'mr-IN',
    en: 'en-IN'
  };

  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SpeechRecognition) {
      const rec = new SpeechRecognition();
      rec.continuous = false;
      rec.interimResults = true;
      rec.lang = langCodeMap[lang] || 'hi-IN';

      rec.onresult = (event) => {
        let currentTranscript = '';
        for (let i = event.resultIndex; i < event.results.length; i++) {
          currentTranscript += event.results[i][0].transcript;
        }
        setTranscript(currentTranscript);
        if (event.results[0]?.isFinal) {
          parseVoiceCommand(currentTranscript);
        }
      };

      rec.onerror = (e) => {
        console.warn('Speech recognition status:', e.error);
        setIsListening(false);
      };

      rec.onend = () => {
        setIsListening(false);
      };

      recognitionRef.current = rec;
    }

    return () => {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.abort();
        } catch (e) {}
      }
    };
  }, [lang]);

  const speak = (text) => {
    setSpokenText(text);
    if ('speechSynthesis' in window) {
      try {
        window.speechSynthesis.cancel();
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = langCodeMap[lang] || 'hi-IN';
        utterance.rate = 0.92;
        
        // Pick appropriate vernacular voice if available in browser
        const voices = window.speechSynthesis.getVoices();
        const matchingVoice = voices.find(v => v.lang.startsWith(lang) || v.lang.includes(langCodeMap[lang]));
        if (matchingVoice) utterance.voice = matchingVoice;
        
        window.speechSynthesis.speak(utterance);
      } catch (err) {
        console.warn('Speech synthesis error:', err);
      }
    }
  };

  const parseVoiceCommand = (rawCmd) => {
    const cmd = rawCmd.toLowerCase();

    // Language switch by voice
    if (cmd.includes('मराठी') || cmd.includes('marathi')) {
      if (setLang) setLang('mr');
      speak('मराठी भाषा निवडली आहे.');
      return;
    }
    if (cmd.includes('हिंदी') || cmd.includes('hindi') || cmd.includes('हिन्दी')) {
      if (setLang) setLang('hi');
      speak('हिंदी भाषा चुनी गई है।');
      return;
    }
    if (cmd.includes('english') || cmd.includes('अंग्रेजी') || cmd.includes('इंग्रजी')) {
      if (setLang) setLang('en');
      speak('Switched to English language.');
      return;
    }

    // Rate / Price check
    if (
      cmd.includes('bhaav') || cmd.includes('bhav') || cmd.includes('price') || 
      cmd.includes('rate') || cmd.includes('भाव') || cmd.includes('दाम') || 
      cmd.includes('रेट') || cmd.includes('कीमत') || cmd.includes('दर') || cmd.includes('किंमत')
    ) {
      const response = lang === 'mr' 
        ? 'थेट बाजार भाव उघडत आहे. तांब्याची तार ₹440 आणि सर्किट बोर्ड ₹180 प्रति किलो आहे.'
        : lang === 'en'
        ? 'Showing live scrap prices. Copper wires are ₹440 and Circuit Boards are ₹180 per kg.'
        : 'आज का लाइव भाव दिखाया जा रहा है। तांबा ₹440 और सर्किट बोर्ड ₹180 प्रति किलो है।';
      speak(response);
      if (onNavigate) onNavigate('prices');
      return;
    }

    // Scanner / Camera
    if (
      cmd.includes('scan') || cmd.includes('camera') || cmd.includes('photo') ||
      cmd.includes('कैमरा') || cmd.includes('स्कैन') || cmd.includes('फोटो') ||
      cmd.includes('कॅमेरा') || cmd.includes('स्कॅन') || cmd.includes('तपासा')
    ) {
      const response = lang === 'mr'
        ? 'कॅमेरा सुरू करत आहे. ई-कचरा कॅमेऱ्यासमोर ठेवा.'
        : lang === 'en'
        ? 'Opening waste classifier camera. Show your scrap item to the lens.'
        : 'कैमरा स्कैनर खोला जा रहा है। सामग्री को कैमरे के सामने रखें।';
      speak(response);
      if (onNavigate) onNavigate('scanner');
      if (onTriggerScan) onTriggerScan();
      return;
    }

    // Recycler Portal
    if (
      cmd.includes('recycler') || cmd.includes('portal') || cmd.includes('center') ||
      cmd.includes('रीसायकलर') || cmd.includes('कबाड़ी') || cmd.includes('सेंटर') ||
      cmd.includes('हब') || cmd.includes('हस्तांतरण')
    ) {
      const response = lang === 'mr'
        ? 'CPCB अधिकृत रीसायकलर पोर्टल उघडत आहे.'
        : lang === 'en'
        ? 'Navigating to CPCB EPR Recycler Management Portal.'
        : 'CPCB अधिकृत रीसायकलर पोर्टल खोला जा रहा है।';
      speak(response);
      if (onNavigate) onNavigate('recycler');
      return;
    }

    // Fallback general prompt
    const defaultReply = lang === 'mr'
      ? `तुम्ही म्हटले: "${rawCmd}". कृपया "भाव", "स्कॅनर" किंवा "रीसायकलर" बोला.`
      : lang === 'en'
      ? `You said: "${rawCmd}". Say "Price", "Scanner", or "Recycler Portal".`
      : `आपने कहा: "${rawCmd}". कृपया "भाव", "स्कैनर", या "रीसायकलर" कहें।`;
    speak(defaultReply);
  };

  const toggleListening = () => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert(t.micUnsupported);
      return;
    }

    if (isListening) {
      try {
        recognitionRef.current?.stop();
      } catch (e) {}
      setIsListening(false);
    } else {
      setTranscript('');
      try {
        if (!recognitionRef.current) {
          const rec = new SpeechRecognition();
          rec.lang = langCodeMap[lang] || 'hi-IN';
          rec.onresult = (e) => setTranscript(e.results[0][0].transcript);
          recognitionRef.current = rec;
        }
        recognitionRef.current.lang = langCodeMap[lang] || 'hi-IN';
        recognitionRef.current.start();
        setIsListening(true);
      } catch (err) {
        console.warn('Speech start error:', err);
        setIsListening(false);
      }
    }
  };

  return (
    <div className="bg-gradient-to-r from-emerald-950 via-emerald-900 to-teal-950 text-white p-4 sm:p-5 rounded-2xl shadow-xl mb-6 border border-emerald-700/40">
      <div className="flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-4 w-full md:w-auto">
          <button
            onClick={toggleListening}
            aria-label="Voice Assistant Mic"
            className={`p-4 rounded-2xl transition-all flex items-center justify-center shrink-0 shadow-lg ${
              isListening
                ? 'bg-red-500 text-white ring-4 ring-red-400/50 animate-pulse scale-105'
                : 'bg-emerald-500 hover:bg-emerald-400 text-slate-950 hover:scale-105 active:scale-95'
            }`}
          >
            {isListening ? <MicOff className="w-7 h-7" /> : <Mic className="w-7 h-7" />}
          </button>
          
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <h3 className="font-extrabold text-lg tracking-tight text-white flex items-center gap-1.5">
                <Sparkles className="w-4 h-4 text-emerald-400" />
                {t.voiceTitle} ({lang.toUpperCase()})
              </h3>
              <span className="text-[11px] bg-emerald-800/80 text-emerald-200 px-2 py-0.5 rounded-full font-bold border border-emerald-600/50">
                {lang === 'hi' ? 'हिंदी' : lang === 'mr' ? 'मराठी' : 'English'}
              </span>
            </div>
            <p className="text-emerald-200/90 text-xs sm:text-sm mt-0.5">
              {isListening ? (
                <span className="text-amber-300 font-semibold animate-pulse">
                  🎙️ {transcript || t.listening}
                </span>
              ) : (
                t.speakPrompt
              )}
            </p>
          </div>
        </div>

        {spokenText && (
          <div className="w-full md:w-auto max-w-md bg-emerald-800/60 backdrop-blur px-3.5 py-2 rounded-xl text-xs flex items-center gap-2 text-emerald-100 border border-emerald-600/40">
            <Volume2 className="w-4 h-4 text-emerald-300 shrink-0" />
            <span className="truncate">{spokenText}</span>
          </div>
        )}
      </div>
    </div>
  );
}
