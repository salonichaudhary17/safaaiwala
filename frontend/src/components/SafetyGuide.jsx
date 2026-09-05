import React from 'react';
import TextToSpeech from './TextToSpeech';

const SAFETY_RULES = [
  {
    id: 1,
    titleHi: "केबल/तार को जलाना सख्त मना है",
    titleMr: "केबल जाळण्यास सक्त मनाई आहे",
    descHi: "तार जलाने से जहरीला धुआं (Dioxins) निकलता है जो फेफड़ों को गंभीर नुकसान पहुंचाता है।",
    descMr: "तारा जाळल्याने विषारी धूर निघतो जो फुफ्फुसांना गंभीर इजा पोहोचवतो.",
    icon: "🚫🔥",
    bgColor: "bg-red-50 border-red-200"
  },
  {
    id: 2,
    titleHi: "बैटरी और सर्किट बोर्ड का सुरक्षित रख-रखाव",
    titleMr: "बॅटरी आणि सर्किट बोर्डची सुरक्षित हाताळणी",
    descHi: "एसिड लीचिंग (Acid Leaching) घर पर न करें। दस्ताने पहनें और टूटी बैटरी को अलग बैग में रखें।",
    descMr: "घरी ॲसिड वापरू नका. हातमोजे वापरा आणि तुटलेली बॅटरी वेगळ्या पिशवीत ठेवा.",
    icon: "🧤🔋",
    bgColor: "bg-amber-50 border-amber-200"
  }
];

export default function SafetyGuide({ lang = 'hi' }) {
  return (
    <div className="p-4 bg-white rounded-xl shadow-sm border border-slate-200 my-4">
      <h2 className="text-lg font-bold text-slate-800 mb-3 flex items-center gap-2">
        <span>🛡️</span> {lang === 'mr' ? 'सुरक्षा सूचना' : lang === 'hi' ? 'सुरक्षा निर्देश' : 'Safety Protocols'}
      </h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {SAFETY_RULES.map((rule) => {
          const title = lang === 'mr' ? rule.titleMr : rule.titleHi;
          const desc = lang === 'mr' ? rule.descMr : rule.descHi;
          return (
            <div key={rule.id} className={`p-4 rounded-lg border ${rule.bgColor}`}>
              <div className="text-3xl mb-2">{rule.icon}</div>
              <h3 className="font-bold text-slate-900 mb-1">{title}</h3>
              <p className="text-sm text-slate-700 mb-3">{desc}</p>
              <TextToSpeech text={`${title}. ${desc}`} lang={lang} />
            </div>
          );
        })}
      </div>
    </div>
  );
}