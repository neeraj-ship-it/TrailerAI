/* eslint-disable */
import { Lang } from '../enums/app.enum';

interface OnboardingStrings {
  viewCount1: string;
  viewCount2: string;
  urgencyText: string;
  motivatorText: string;
  metaCategory: string;
}

export class StringConstants {
  // Payment Gateway
  static recommendedPaymentOptionText = '(Recommended)';
  static paymentOptions = 'paymentOptions';
  static customPaymentOptions = 'customPaymentOptions';
  static paywallPaymentOptions = 'paywallPaymentOptions';
  static webPaymentOptions = 'webPaymentOptions';
  static notAvailableText = 'not_available';
  static undefinedText = 'undefined';
  static MO_NewReleases_Placeholder = 'MO_NewReleases_Placeholder';
  static MO_RandeepHooda_Favorite_Placeholder =
    'MO_RandeepHooda_Favorite_Placeholder';
  static MO_NeerajChopraKiPasand_Placeholder =
    'MO_NeerajChopraKiPasand_Placeholder';

  static RANDEEP_HOODA_FAVORITE_SLUGS = [
    'vidshi-bahu',
    'mahapunarjanam-har',
    'jholachhap-har',
    'saanwari-har',
    'rohtak-kabza-har',
    'punarjanam',
    'kaand-2010_',
    'dada-lakhmi',
    '12vi-aala-pyar',
    'mewat',
    'saanwari-raj',
    'mokhan-vahini',
    'videshibahurj',
    'loan-raj',
    'jholachhap-raj',
    'chakka-jaam-raj',
    'punarjanam-rj',
    'bhawani',
    'reet',
    'crime-rajasthan',
    'jaan-legi-sonam-bho',
    'jholachhap-bho',
    'saanwari-bho',
    'baklols-bho',
    'laadli-chhathi-mai-ke-bho',
    'samaaj-mein-parivartan-bh',
    'rang-de-basanti-bh',
    'sabka-baap-angutha-chaap-bho',
    'bhagyawan',
    'paali-ka-pilla',
  ];

  static NEERAJ_CHOPRA_KI_PASAND_SLUGS = [
    'akhada',
    'dhaakad-chhoriyan-microdrama-har',
    'muaavja-har',
    'mokhan-vahini-2-har',
    'vanvas-har',
    'operation-mewat-har',
    'anda-gang-har',
    'rohtak-kabza-har',
    'bahu-faraar',
    'dc-rate_hr',
    'minzar-raj',
    'agniveer-rj',
    'mokhan-vahini-2-raj',
    'ranki-ko-molibe',
    'hami-raj',
    'fatta-raj',
    'gauvari-raj',
    'awakara-raj',
    'reet',
    'nuchwana',
    'chalava-bho',
    'saas-gari-deve-bh',
    'bhagyawan',
    'jaan-legi-sonam-bho',
    'pinky-bhabhi-ke-kirayedar-bh',
    'laadli-chhathi-mai-ke-bho',
    'punarjanam-janam-ke-phera-bho',
    'chana-jor-garam-bho',
    'lagal-raha-batasha-bho',
    'bandhan-tute-na-bho',
  ];

  static getStrings(lang: Lang): OnboardingStrings {
    switch (lang) {
      case Lang.EN:
        return {
          viewCount1: '1.5L+',
          viewCount2: '50k+',
          urgencyText: 'Leaving Soon!',
          motivatorText: 'Loved by 2.1L+ people',
          metaCategory: 'Trending in %s',
        };
      case Lang.HIN:
        return {
          viewCount1: '1.5L+',
          viewCount2: '50k+',
          urgencyText: 'मूवी हटने वाली है!',
          motivatorText: '2.1 लाख+ लोगों की पसंद',
          metaCategory: '%s में ट्रेंडिंग',
        };
      default:
        return this.getStrings(Lang.EN); // fallback to English
    }
  }
}
