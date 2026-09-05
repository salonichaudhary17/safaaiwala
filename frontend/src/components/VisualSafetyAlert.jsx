import React from 'react';
import { useTranslation } from 'react-i18next';
import { useAudioGuidance } from '../hooks/useAudioGuidance';

const SAFETY_HAZARDS = [
  {
    id: 'acidLeaching',
    icon: '🧪',
    color: 'bg-red-600',
    borderColor: 'border-red-700',
    titleKey: 'acidLeaching',
    descKey: 'acidLeachingDesc',
  },
  {
    id: 'cableBurning',
    icon: '🔥',
    color: 'bg-orange-600',
    borderColor: 'border-orange-700',
    titleKey: 'cableBurning',
    descKey: 'cableBurningDesc',
  },
  {
    id: 'batteryHandling',
    icon: '🔋',
    color: 'bg-amber-600',
    borderColor: 'border-amber-700',
    titleKey: 'batteryHandling',
    descKey: 'batteryHandlingDesc',
  },
];

export const VisualSafetyAlert = () => {
  const { t } = useTranslation();
  const { speak, isSpeaking } = useAudioGuidance();

  const handleReadOut = (hazard) => {
    const title = t(hazard.titleKey);
    const description = t(hazard.descKey);
    speak(`${title}. ${description}`);
  };

  return (
    <div className="p-4 max-w-md mx-auto space-y-4">
      <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
        <span>⚠️</span> {t('safetyWarning')}
      </h2>

      <div className="grid gap-4">
        {SAFETY_HAZARDS.map((hazard) => {
          const title = t(hazard.titleKey);
          const desc = t(hazard.descKey);

          return (
            <div
              key={hazard.id}
              className={`p-4 rounded-xl text-white ${hazard.color} border-2 ${hazard.borderColor} shadow-md flex flex-col justify-between`}
            >
              <div className="flex items-center gap-3">
                <span className="text-4xl" role="img" aria-label={title}>
                  {hazard.icon}
                </span>
                <div className="flex-1">
                  <h3 className="text-lg font-black tracking-wide">{title}</h3>
                  <p className="text-sm font-medium leading-snug mt-1 opacity-95">{desc}</p>
                </div>
              </div>

              <button
                onClick={() => handleReadOut(hazard)}
                className="mt-3 self-end bg-white/20 hover:bg-white/30 text-white font-bold py-2 px-4 rounded-lg flex items-center gap-2 text-sm backdrop-blur-sm transition-all"
                aria-label={`Listen to ${title}`}
              >
                <span>🔊</span>
                <span>{isSpeaking ? '...' : 'सुनें / ऐका'}</span>
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
};