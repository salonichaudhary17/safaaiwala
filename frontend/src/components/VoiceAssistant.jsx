import React, { useState, useEffect } from 'react';
import { Mic, MicOff, Volume2 } from 'lucide-react';

export default function VoiceAssistant({ onNavigate, onTriggerScan }) {
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [spokenText, setSpokenText] = useState('');
  const [recognition, setRecognition] = useState(null);

  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SpeechRecognition) {
      const rec = new SpeechRecognition();
      rec.continuous = true;
      rec.interimResults = true;
      rec.lang = 'en-IN';

      rec.onresult = (event) => {
        let currentTranscript = '';
        for (let i = event.resultIndex; i < event.results.length; i++) {
          currentTranscript += event.results[i][0].transcript;
        }
        setTranscript(currentTranscript);
        parseVoiceCommand(currentTranscript.toLowerCase());
      };

      rec.onerror = (e) => console.error('Speech error:', e);
      setRecognition(rec);
    }
  }, []);

  const parseVoiceCommand = (cmd) => {
    if (cmd.includes('bhaav') || cmd.includes('price') || cmd.includes('rate')) {
      speak('Showing current market rates for scrap and e-waste.');
      onNavigate('prices');
    } else if (cmd.includes('scan') || cmd.includes('camera') || cmd.includes('identify')) {
      speak('Opening e-waste scanner camera.');
      onNavigate('scanner');
      if (onTriggerScan) onTriggerScan();
    } else if (cmd.includes('recycler') || cmd.includes('dashboard') || cmd.includes('portal')) {
      speak('Navigating to Recycler Management Portal.');
      onNavigate('recycler');
    }
  };

  const speak = (text) => {
    setSpokenText(text);
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = 0.95;
      window.speechSynthesis.speak(utterance);
    }
  };

  const toggleListening = () => {
    if (!recognition) return alert('Speech Recognition is not supported in this browser.');
    if (isListening) {
      recognition.stop();
      setIsListening(false);
    } else {
      setTranscript('');
      recognition.start();
      setIsListening(true);
      speak('Safaaiwala Voice Assistant active. Say price, scan, or dashboard.');
    }
  };

  return (
    <div className="bg-emerald-900 text-white p-4 rounded-xl shadow-lg mb-6 flex flex-col md:flex-row items-center justify-between gap-4">
      <div className="flex items-center gap-3">
        <button
          onClick={toggleListening}
          className={`p-4 rounded-full transition-all ${
            isListening ? 'bg-red-500 animate-pulse' : 'bg-emerald-600 hover:bg-emerald-500'
          }`}
        >
          {isListening ? <MicOff className="w-6 h-6" /> : <Mic className="w-6 h-6" />}
        </button>
        <div>
          <h3 className="font-bold text-lg flex items-center gap-2">
            Awaaz Assistant (English / Hindi)
          </h3>
          <p className="text-emerald-200 text-sm">
            {isListening ? transcript || 'Listening...' : 'Click mic to speak commands like "Check Bhaav" or "Open Scanner"'}
          </p>
        </div>
      </div>
      {spokenText && (
        <div className="bg-emerald-800/80 px-4 py-2 rounded-lg text-sm flex items-center gap-2 text-emerald-100 border border-emerald-700">
          <Volume2 className="w-4 h-4 text-emerald-400" />
          <span>{spokenText}</span>
        </div>
      )}
    </div>
  );
}