import React from "react";
import TextToSpeech from "./TextToSpeech";
import { useSpeechFeedback } from "../hooks/useSpeechFeedback";

const SAFETY_RULES = [
  {
    id: "cable-burning",
    titleHi: "केबल/तार को जलाना सख्त मना है",
    titleMr: "केबल जाळण्यास सक्त मनाई आहे",
    titleEn: "Never burn cables",
    descHi: "तार जलाने से जहरीला धुआं (Dioxins) निकलता है जो फेफड़ों को गंभीर नुकसान पहुंचाता है।",
    descMr: "तारा जाळल्याने विषारी धूर निघतो जो फुफ्फुसांना गंभीर इजा पोहोचवतो.",
    descEn: "Burning wires releases toxic dioxin smoke that can seriously damage the lungs.",
    icon: "🚫🔥",
    bgColor: "#fcebeb",
    fallbackSrc: "/audio/safety/mr/cable-burning.mp3",
  },
  {
    id: "battery-pcb",
    titleHi: "बैटरी और सर्किट बोर्ड का सुरक्षित रख-रखाव",
    titleMr: "बॅटरी आणि सर्किट बोर्डची सुरक्षित हाताळणी",
    titleEn: "Handle batteries and circuit boards safely",
    descHi: "एसिड लीचिंग घर पर न करें। दस्ताने पहनें और टूटी बैटरी को अलग बैग में रखें।",
    descMr: "घरी ॲसिड वापरू नका. हातमोजे वापरा आणि तुटलेली बॅटरी वेगळ्या पिशवीत ठेवा.",
    descEn: "Do not do acid leaching at home. Wear gloves and keep damaged batteries in a separate bag.",
    icon: "🧤🔋",
    bgColor: "#fff6e8",
    fallbackSrc: "/audio/safety/mr/battery-pcb.mp3",
  },
];

export default function SafetyGuide({ lang: langProp }) {
  const { lang: appLang, hasMarathiVoice, isSupported } = useSpeechFeedback();
  const lang = langProp || appLang;
  const useMarathiFallback = lang === "mr" && (!isSupported || !hasMarathiVoice);

  const heading =
    lang === "mr" ? "सुरक्षा सूचना" : lang === "hi" ? "सुरक्षा निर्देश" : "Safety Protocols";

  return (
    <div className="card stack">
      <h2 className="h2" style={{ margin: 0, display: "flex", alignItems: "center", gap: 8 }}>
        <span>🛡️</span> {heading}
      </h2>
      {useMarathiFallback ? (
        <p className="muted">
          या फोनवर मराठी आवाज उपलब्ध नाही. आवश्यक सुरक्षा सूचना रेकॉर्ड केलेल्या ऑडिओने ऐकवल्या जातील.
        </p>
      ) : null}
      <div className="stack">
        {SAFETY_RULES.map((rule) => {
          const title =
            lang === "mr" ? rule.titleMr : lang === "en" ? rule.titleEn : rule.titleHi;
          const desc =
            lang === "mr" ? rule.descMr : lang === "en" ? rule.descEn : rule.descHi;
          return (
            <div
              key={rule.id}
              className="card"
              style={{ background: rule.bgColor, borderColor: "#f0c9c9" }}
            >
              <div style={{ fontSize: 28, marginBottom: 8 }}>{rule.icon}</div>
              <h3 className="h2" style={{ margin: "0 0 6px" }}>
                {title}
              </h3>
              <p className="muted" style={{ marginTop: 0 }}>
                {desc}
              </p>
              <TextToSpeech
                text={`${title}. ${desc}`}
                lang={lang}
                fallbackSrc={useMarathiFallback ? rule.fallbackSrc : undefined}
              />
            </div>
          );
        })}
      </div>
    </div>
  );
}
