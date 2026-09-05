import { useCallback, useEffect, useMemo, useState } from "react";
import { useSpeechFeedback } from "../hooks/useSpeechFeedback";
import { useApp } from "../context/AppContext";
import type {
  SafetyWarningTopic,
  SupportedLanguage,
} from "../types/ewaste";

const LANG_LABELS: Record<SupportedLanguage, string> = {
  en: "English",
  hi: "हिंदी",
  mr: "मराठी",
};

interface WarningCopy {
  title: Record<SupportedLanguage, string>;
  body: Record<SupportedLanguage, string>;
  icon: "flask" | "flame" | "battery" | "skull" | "lungs" | "glass";
}

const WARNING_LIBRARY: Record<SafetyWarningTopic, WarningCopy> = {
  acid_leaching: {
    icon: "flask",
    title: {
      en: "Never use acid to strip metal",
      hi: "धातु निकालने के लिए एसिड का उपयोग न करें",
      mr: "धातू काढण्यासाठी अ‍ॅसिड वापरू नका",
    },
    body: {
      en: "Acid leaching to recover gold or copper releases toxic fumes and contaminates soil and water. It is illegal without a licensed facility and causes lasting harm to your lungs and skin. Always hand PCBs to a registered recycler instead.",
      hi: "सोना या तांबा निकालने के लिए एसिड लीचिंग से ज़हरीले धुएं निकलते हैं और मिट्टी व पानी दूषित होते हैं। बिना लाइसेंस के यह गैरकानूनी है और आपके फेफड़ों व त्वचा को स्थायी नुकसान पहुंचाता है। हमेशा पीसीबी को पंजीकृत रीसाइकलर को सौंपें।",
      mr: "सोने किंवा तांबे काढण्यासाठी अ‍ॅसिड लीचिंगमुळे विषारी धूर बाहेर पडतो आणि माती व पाणी दूषित होते. परवान्याशिवाय हे बेकायदेशीर आहे आणि तुमच्या फुफ्फुसांना व त्वचेला कायमचे नुकसान करते. नेहमी पीसीबी नोंदणीकृत रिसायकलरला द्या.",
    },
  },

  open_cable_burning: {
    icon: "flame",
    title: {
      en: "Never burn cables to strip insulation",
      hi: "इन्सुलेशन हटाने के लिए तार न जलाएं",
      mr: "इन्सुलेशन काढण्यासाठी तारा जाळू नका",
    },
    body: {
      en: "Open burning of insulated cable releases dioxins and heavy-metal smoke that can damage your lungs and pollute the surrounding air. Use a mechanical stripper or sell the cable insulated — recyclers pay for it either way.",
      hi: "इंसुलेटेड तार को खुले में जलाने से डाइऑक्सिन और भारी-धातु का धुआं निकलता है जो आपके फेफड़ों को नुकसान पहुंचा सकता है और आसपास की हवा को प्रदूषित करता है। मैकेनिकल स्ट्रिपर का उपयोग करें या तार को बिना जलाए ही बेचें — रीसाइकलर दोनों तरह से भुगतान करते हैं।",
      mr: "इन्सुलेटेड तार उघड्यावर जाळल्याने डायऑक्सिन आणि जड-धातूचा धूर बाहेर पडतो जो फुफ्फुसांना हानी पोहोचवू शकतो आणि आसपासची हवा प्रदूषित करतो. मेकॅनिकल स्ट्रिपर वापरा किंवा तार न जाळता विका — रिसायकलर दोन्ही प्रकारे पैसे देतात.",
    },
  },

  battery_puncture: {
    icon: "battery",
    title: {
      en: "Never puncture or crush lithium batteries",
      hi: "लिथियम बैटरी को कभी छेदें या कुचलें नहीं",
      mr: "लिथियम बॅटरी कधीही टोचू किंवा चिरडू नका",
    },
    body: {
      en: "A punctured or crushed lithium-ion cell can catch fire suddenly and release toxic gas. Keep damaged cells separate, away from heat, and hand them to a recycler in a rigid container.",
      hi: "छेदी गई या कुचली गई लिथियम-आयन सेल अचानक आग पकड़ सकती है और ज़हरीली गैस छोड़ सकती है। क्षतिग्रस्त सेल को अलग रखें, गर्मी से दूर रखें और उन्हें एक सख्त डिब्बे में रीसाइकलर को सौंपें।",
      mr: "टोचलेली किंवा चिरडलेली लिथियम-आयन सेल अचानक पेट घेऊ शकते आणि विषारी वायू बाहेर पडू शकतो. खराब झालेल्या सेल वेगळ्या ठेवा, उष्णतेपासून दूर ठेवा आणि कडक डब्यात रिसायकलरला द्या.",
    },
  },

  mercury_lead_exposure: {
    icon: "skull",
    title: {
      en: "CRT and old LCD screens contain lead and mercury",
      hi: "सीआरटी और पुरानी एलसीडी स्क्रीन में लेड और मरकरी होता है",
      mr: "सीआरटी आणि जुन्या एलसीडी स्क्रीनमध्ये लेड आणि मरकरी असते",
    },
    body: {
      en: "Breaking a CRT tube or an LCD backlight can expose you to lead dust or mercury vapour. Handle these whole, wear gloves, and never break the glass yourself.",
      hi: "सीआरटी ट्यूब या एलसीडी बैकलाइट तोड़ने से आप लेड धूल या मरकरी वाष्प के संपर्क में आ सकते हैं। इन्हें पूरा संभालें, दस्ताने पहनें और कांच को खुद कभी न तोड़ें।",
      mr: "सीआरटी ट्यूब किंवा एलसीडी बॅकलाइट फोडल्याने लेड धूळ किंवा मरकरी वाफेचा संपर्क होऊ शकतो. हे संपूर्ण हाताळा, हातमोजे घाला आणि काच स्वतः कधीही फोडू नका.",
    },
  },

  fume_inhalation: {
    icon: "lungs",
    title: {
      en: "Desoldering and burning release harmful fumes",
      hi: "डीसोल्डरिंग और जलाने से हानिकारक धुआं निकलता है",
      mr: "डीसोल्डरिंग आणि जाळण्याने हानिकारक धूर निघतो",
    },
    body: {
      en: "Heating solder or burning boards can release fumes containing lead and other toxins. Work in open air, use appropriate respiratory protection, and prefer mechanical separation over heat wherever possible.",
      hi: "सोल्डर गर्म करने या बोर्ड जलाने से लेड और अन्य ज़हरीले तत्वों वाला धुआं निकल सकता है। खुली हवा में काम करें, उचित श्वसन सुरक्षा का उपयोग करें और जहां संभव हो गर्मी के बजाय मैकेनिकल तरीके से अलग करें।",
      mr: "सोल्डर गरम करणे किंवा बोर्ड जाळल्याने लेड आणि इतर विषारी घटक असलेला धूर निघू शकतो. मोकळ्या हवेत काम करा, योग्य श्वसन सुरक्षा वापरा आणि शक्य तिथे उष्णतेऐवजी यांत्रिक पद्धतीने वेगळे करा.",
    },
  },

  sharp_glass: {
    icon: "glass",
    title: {
      en: "CRT and LCD glass causes deep cuts",
      hi: "सीआरटी और एलसीडी कांच से गहरे कट लग सकते हैं",
      mr: "सीआरटी आणि एलसीडी काच खोल जखमा करू शकते",
    },
    body: {
      en: "Broken screen glass has sharp edges that can cause deep cuts. Always wear thick gloves and closed shoes when handling monitors and televisions, and keep broken glass away from bare skin.",
      hi: "टूटे हुए स्क्रीन के कांच के किनारे तेज़ होते हैं और गहरे कट लगा सकते हैं। मॉनिटर और टीवी संभालते समय हमेशा मोटे दस्ताने और बंद जूते पहनें और टूटे कांच को नंगी त्वचा से दूर रखें।",
      mr: "फुटलेल्या स्क्रीनच्या काचेच्या कडा तीक्ष्ण असतात आणि खोल जखम करू शकतात. मॉनिटर आणि टीव्ही हाताळताना नेहमी जाड हातमोजे आणि बंद बूट घाला आणि फुटलेली काच उघड्या त्वचेपासून दूर ठेवा.",
    },
  },
};

const ALL_TOPICS: SafetyWarningTopic[] = [
  "acid_leaching",
  "open_cable_burning",
  "battery_puncture",
  "mercury_lead_exposure",
  "fume_inhalation",
  "sharp_glass",
];

const UI_STRINGS: Record<
  | "safetyGuide"
  | "playAudio"
  | "pause"
  | "stop"
  | "notSupported"
  | "nowReading",
  Record<SupportedLanguage, string>
> = {
  safetyGuide: {
    en: "Safety guide",
    hi: "सुरक्षा गाइड",
    mr: "सुरक्षा मार्गदर्शक",
  },

  playAudio: {
    en: "Play audio guide",
    hi: "ऑडियो गाइड चलाएं",
    mr: "ऑडिओ मार्गदर्शक चालवा",
  },

  pause: {
    en: "Pause",
    hi: "रोकें",
    mr: "थांबवा",
  },

  stop: {
    en: "Stop",
    hi: "बंद करें",
    mr: "बंद करा",
  },

  notSupported: {
    en: "Voice playback isn't supported on this device. Please read the warnings below.",
    hi: "इस डिवाइस पर आवाज़ चलाना समर्थित नहीं है। कृपया नीचे दी गई चेतावनियां पढ़ें।",
    mr: "या डिव्हाइसवर आवाज ऐकवणे समर्थित नाही. कृपया खालील सूचना वाचा.",
  },

  nowReading: {
    en: "Now reading",
    hi: "अभी पढ़ा जा रहा है",
    mr: "आता वाचले जात आहे",
  },
};

function ICONS(icon: WarningCopy["icon"]): string {
  switch (icon) {
    case "flask":
      return "M9 3h6v4l4 9a2 2 0 0 1-2 3H7a2 2 0 0 1-2-3l4-9V3Zm-1 7h8";

    case "flame":
      return "M12 2c1 4-4 5-4 9a4 4 0 0 0 8 0c0-1.5-1-2-1-3.5 1 .5 2 2 2 4.5a5 5 0 0 1-10 0C7 7 10 6 12 2Z";

    case "battery":
      return "M4 9h13v6H4V9Zm13 2h2v2h-2M6 11h1v2H6Z";

    case "skull":
      return "M12 3a7 7 0 0 0-7 7v3l-1 3h4l1 3h6l1-3h4l-1-3v-3a7 7 0 0 0-7-7Zm-3 8h.01M15 11h.01";

    case "lungs":
      return "M12 3v7m-2 2c-2 0-4 2-4 5v3a2 2 0 0 0 2 2c1 0 2-1 2-2v-6m4 1c2 0 4 2 4 5v3a2 2 0 0 1-2 2c-1 0-2-1-2-2v-6";

    case "glass":
      return "M6 3h12l-2 12a4 4 0 0 1-8 0L6 3Zm2 12v6m4-6v6";

    default:
      return "M12 4 3 20h18L12 4Zm0 6v4m0 3h.01";
  }
}

export interface AudioAccessibilityPlayerProps {
  topics?: SafetyWarningTopic[];
  lang?: SupportedLanguage;
  onLangChange?: (lang: SupportedLanguage) => void;
  compact?: boolean;
}

export default function AudioAccessibilityPlayer({
  topics = ALL_TOPICS,
  lang: initialLang,
  onLangChange,
  compact = false,
}: AudioAccessibilityPlayerProps) {
  const app = useApp();
  const {
    isSupported: voiceSupported,
    isSpeaking,
    isPaused,
    speakQueue,
    pause,
    resume,
    stop,
  } = useSpeechFeedback();

  const lang: SupportedLanguage =
    initialLang || app?.lang || "hi";

  const [activeIndex, setActiveIndex] =
    useState<number | null>(null);

  const [expanded, setExpanded] =
    useState<Set<SafetyWarningTopic>>(new Set());

  useEffect(() => {
    return () => stop();
  }, [stop]);

  const changeLang = useCallback(
    (next: SupportedLanguage) => {
      stop();
      setActiveIndex(null);
      app?.setLang?.(next);
      onLangChange?.(next);
    },
    [app, onLangChange, stop]
  );

  /*
   * Expand / collapse a warning card.
   */
  const toggleExpanded = useCallback(
    (topic: SafetyWarningTopic) => {
      setExpanded((previous) => {
        const next = new Set(previous);

        if (next.has(topic)) {
          next.delete(topic);
        } else {
          next.add(topic);
        }

        return next;
      });
    },
    []
  );

  const handlePlay = useCallback(() => {
    if (!voiceSupported) {
      return;
    }

    if (isPaused) {
      resume();
      return;
    }

    speakQueue(
      topics.map((topic, index) => {
        const copy = WARNING_LIBRARY[topic];
        return {
          text: `${copy.title[lang]}. ${copy.body[lang]}`,
          onStart: () => setActiveIndex(index),
        };
      }),
      {
        lang,
        rate: 0.92,
        onEnd: () => setActiveIndex(null),
        onError: () => setActiveIndex(null),
      }
    );
  }, [isPaused, lang, resume, speakQueue, topics, voiceSupported]);

  const handlePause = useCallback(() => {
    if (!voiceSupported || !isSpeaking) {
      return;
    }
    pause();
  }, [isSpeaking, pause, voiceSupported]);

  const handleStop = useCallback(() => {
    stop();
    setActiveIndex(null);
  }, [stop]);

  /*
   * Caption for the currently active warning.
   */
  const activeCaption = useMemo(() => {
    if (activeIndex === null) {
      return "";
    }

    const topic = topics[activeIndex];

    if (!topic) {
      return "";
    }

    return WARNING_LIBRARY[topic].title[lang];
  }, [activeIndex, lang, topics]);

  return (
    <div
      className="card"
      style={{
        display: "flex",
        flexDirection: "column",
        gap: 12,
      }}
    >
      {/* Header */}
      <div className="row between">
        <div
          className="h2"
          style={{
            margin: 0,
          }}
        >
          {UI_STRINGS.safetyGuide[lang]}
        </div>

        {/* Language selector */}
        <div
          className="lang-toggle"
          role="group"
          aria-label="Language"
        >
          {(
            Object.keys(LANG_LABELS) as SupportedLanguage[]
          ).map((code) => (
            <button
              key={code}
              type="button"
              className={
                code === lang ? "active" : ""
              }
              aria-pressed={code === lang}
              onClick={() => changeLang(code)}
            >
              {LANG_LABELS[code]}
            </button>
          ))}
        </div>
      </div>

      {/* Audio controls */}
      {voiceSupported ? (
        <div
          className="row"
          style={{
            gap: 8,
          }}
        >
          {!isSpeaking ? (
            <button
              type="button"
              className="btn btn-primary"
              onClick={handlePlay}
              aria-label={
                isPaused
                  ? "Resume audio guide"
                  : "Play audio guide"
              }
            >
              <svg
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                aria-hidden="true"
              >
                <path
                  d="M8 5v14l11-7L8 5Z"
                  fill="currentColor"
                />
              </svg>

              {UI_STRINGS.playAudio[lang]}
            </button>
          ) : (
            <button
              type="button"
              className="btn btn-secondary"
              onClick={handlePause}
            >
              {UI_STRINGS.pause[lang]}
            </button>
          )}

          <button
            type="button"
            className="btn btn-secondary"
            onClick={handleStop}
            disabled={
              !isSpeaking && !isPaused
            }
          >
            {UI_STRINGS.stop[lang]}
          </button>
        </div>
      ) : (
        <p className="muted">
          {UI_STRINGS.notSupported[lang]}
        </p>
      )}

      {/* Currently reading */}
      <div
        aria-live="polite"
        className="muted"
        style={{
          minHeight: 18,
          fontSize: 13,
        }}
      >
        {isSpeaking && activeCaption
          ? `${UI_STRINGS.nowReading[lang]}: ${activeCaption}`
          : ""}
      </div>

      {/* Warning list */}
      <div
        className="stack"
        style={{
          gap: 10,
        }}
      >
        {topics.map((topic, index) => {
          const copy = WARNING_LIBRARY[topic];

          const isActive =
            activeIndex === index &&
            isSpeaking;

          const isExpanded = compact
            ? expanded.has(topic)
            : true;

          return (
            <div
              key={`${topic}-${index}`}
              className="card"
              style={{
                borderColor: isActive
                  ? "#0F6E56"
                  : "#f0c9c9",

                background: isActive
                  ? "#e1f5ee"
                  : "#fcebeb",

                cursor: compact
                  ? "pointer"
                  : "default",
              }}
              onClick={
                compact
                  ? () => toggleExpanded(topic)
                  : undefined
              }
              role={
                compact ? "button" : undefined
              }
              tabIndex={
                compact ? 0 : undefined
              }
              onKeyDown={
                compact
                  ? (event) => {
                      if (
                        event.key === "Enter" ||
                        event.key === " "
                      ) {
                        event.preventDefault();
                        toggleExpanded(topic);
                      }
                    }
                  : undefined
              }
            >
              <div
                className="row"
                style={{
                  gap: 8,
                  alignItems: "flex-start",
                }}
              >
                {/* Warning icon */}
                <svg
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="none"
                  aria-hidden="true"
                  style={{
                    flexShrink: 0,
                    marginTop: 2,
                  }}
                >
                  <path
                    d={ICONS(copy.icon)}
                    stroke={
                      isActive
                        ? "#0F6E56"
                        : "#a32d2d"
                    }
                    strokeWidth={1.8}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>

                {/* Warning content */}
                <div
                  style={{
                    flex: 1,
                  }}
                >
                  <strong
                    style={{
                      color: isActive
                        ? "#0F6E56"
                        : "#a32d2d",

                      fontSize: 14.5,
                    }}
                  >
                    {copy.title[lang]}
                  </strong>

                  {isExpanded && (
                    <p
                      className="muted"
                      style={{
                        color: isActive
                          ? "#0a4a3c"
                          : "#a32d2d",

                        margin: "6px 0 0",
                      }}
                    >
                      {copy.body[lang]}
                    </p>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}