import { StatsigUserProperty } from './statsig-user.dto';

export enum ExperimentName {
  NcandoRecommendationExperiment = 'ncanto_recommendation_experiment',
  OnboardingHomeScreenExperiment = 'onboarding_home_screen_on_app_open',
  PaymentOptionsExperiment = 'payment_options_experiment',
  TrailerOnPlatterExperiment = 'trailer_on_platter_experiment',
  TvAdoptionTrialUserExperiment = 'tv_adoption_trial_user_experiment',
}

export enum FeatureGateName {
  NcandoRecommendationFeature = 'ncanto_recommendation_feature',
}

export enum ExperimentGroupName {
  Control = 'Control',
  Test = 'Test',
}

export enum PaymentOptionsGroupName {
  Control = 'control',
  PaytmPriority = 'paytm_priority',
  UpiIdDisplay = 'upiid_display',
}

export enum TvAdoptionExtensionType {
  SUBSCRIPTION_EXTENSION = 'subscription_extension',
  TRIAL_EXTENSION = 'trial_extension',
}

export interface TrailerOnPlatterExperimentValue {
  show_trailer: boolean;
}
export interface NcantoTestExperimentValue {
  show_recommendation: boolean;
}

export interface TvAdoptionTrialUserExperimentValue {
  extensionType: TvAdoptionExtensionType;
}

export interface OnboardingHomeScreenExperimentValue {
  showLandingScreenOnAppOpen: boolean;
}

export type ExperimentValue =
  | NcantoTestExperimentValue
  | TrailerOnPlatterExperimentValue
  | TvAdoptionTrialUserExperimentValue
  | OnboardingHomeScreenExperimentValue
  | Record<string, never>;

export interface ExperimentResponseDto {
  groupName: ExperimentGroupName | null;
  idType: string;
  name: ExperimentName;
  ruleID: string;
  statsigUserProperty: StatsigUserProperty;
  value: ExperimentValue;
}
