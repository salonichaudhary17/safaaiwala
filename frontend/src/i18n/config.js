import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

/**
 * i18next configuration for Safaaiwala.
 * Optimized for informal waste collectors and recyclers.
 */
const resources = {
  en: {
    translation: {
      appName: 'Safaaiwala',
      safetyWarning: 'Safety Alert',
      acidLeaching: 'Acid Leaching Hazard',
      cableBurning: 'Cable Burning Hazard',
      batteryHandling: 'Battery Handling Hazard',
      acidLeachingDesc: 'Corrosive acid causes severe chemical burns. Wear rubber gloves and eye protection.',
      cableBurningDesc: 'Toxic toxic fumes cause respiratory damage. Do not burn wire coatings!',
      batteryHandlingDesc: 'Risk of explosion and acid leakage. Do not puncture heavy batteries.',
      confirm: 'Confirm Handover',
      cancel: 'Cancel',
      totalEarnings: 'Total Earnings',
      cashPay: 'Cash Received',
      digitalPay: 'Digital Payment',
      weightKg: 'Weight (kg)',
      estimatedEarnings: 'Estimated Value',
    },
  },
  hi: {
    translation: {
      appName: 'सफ़ाईवाला',
      safetyWarning: 'सुरक्षा चेतावनी',
      acidLeaching: 'एसिड का खतरा',
      cableBurning: 'केबल जलाने का खतरा',
      batteryHandling: 'बैटरी संभालने की चेतावनी',
      acidLeachingDesc: 'तेज़ाब से त्वचा जल सकती है। हमेशा रबर के दस्ताने और चश्मा पहनें।',
      cableBurningDesc: 'तार जलाने से जहरीला धुआं निकलता है जो फेफड़ों को नुकसान पहुंचाता है।',
      batteryHandlingDesc: 'बैटरी फटने और एसिड रिसने का जोखिम। बैटरी में छेद न करें।',
      confirm: 'लेन-देन पक्का करें',
      cancel: 'रद्द करें',
      totalEarnings: 'कुल कमाई',
      cashPay: 'नकद भुगतान',
      digitalPay: 'डिजिटल भुगतान',
      weightKg: 'वजन (किलो)',
      estimatedEarnings: 'अनुमानित मूल्य',
    },
  },
  mr: {
    translation: {
      appName: 'सफाईवाला',
      safetyWarning: 'सुरक्षा इशारा',
      acidLeaching: 'ॲसिडचा धोका',
      cableBurning: 'केबल जाळण्याचा धोका',
      batteryHandling: 'बॅटरी हाताळणीची काळजी',
      acidLeachingDesc: 'ॲसिडमुळे त्वचा भाजण्याची शक्यता. रबरी हातमोजे आणि चष्मा वापरा.',
      cableBurningDesc: 'केबल जाळल्याने विषारी धूर निघतो. धुरामुळे फुफ्फुसांना हानी पोहोचते.',
      batteryHandlingDesc: 'बॅटरी फुटण्याचा आणि ॲसिड गळतीचा धोका. बॅटरी फोडू नका.',
      confirm: 'व्यवहार निश्चित करा',
      cancel: 'रद्द करा',
      totalEarnings: 'एकूण कमाई',
      cashPay: 'रोख रक्कम',
      digitalPay: 'डिजिटल जमा',
      weightKg: 'वजन (किलो)',
      estimatedEarnings: 'अंदाजे मूल्य',
    },
  },
};

i18n
  .use(initReactI18next)
  .init({
    resources,
    lng: 'hi', // Default to Hindi for high accessibility
    fallbackLng: 'en',
    interpolation: {
      escapeValue: false, // React already safeguards against XSS
    },
  });

export default i18n;