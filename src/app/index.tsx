import React, { useState, useEffect } from 'react';
import {
  View,
  StyleSheet,
  TouchableOpacity,
  Image,
  useWindowDimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  Heart,
  FileText,
  Stethoscope,
  ShieldCheck,
  ArrowRight,
  Sparkles,
} from 'lucide-react-native';
import { Text } from '../components/Text';
import { tokenService } from '../services/apiClient';

export interface OnboardingStep {
  tag: string;
  title: string;
  description: string;
  icon: any;
  color: string;
  bgLight: string;
  borderColor: string;
}

const ONBOARDING_STEPS: OnboardingStep[] = [
  {
    tag: 'Plateforme Nationale',
    title: 'La santé mentale pour tous',
    description:
      'TILA est la plateforme officielle de santé mentale en Côte d’Ivoire, déployée sous l’égide du Ministère de la Santé et du PNSM.',
    icon: Heart,
    color: '#00A651',
    bgLight: '#ecfdf5',
    borderColor: '#a7f3d0',
  },
  {
    tag: 'Outils Scientifiques',
    title: 'Auto-évaluation & Dépistage',
    description:
      'Mesurez votre bien-être émotionnel grâce aux questionnaires certifiés : ODS (troubles courants), Berger (VIH), SDQ (jeunes) et PCL-5 (trauma).',
    icon: FileText,
    color: '#F58220',
    bgLight: '#fff7ed',
    borderColor: '#fed7aa',
  },
  {
    tag: 'Téléconsultation Sécurisée',
    title: 'Spécialistes & Prise de RDV',
    description:
      'Consultez un réseau certifié de psychologues, psychiatres et cliniciens pour un accompagnement personnalisé en visio ou cabinet.',
    icon: Stethoscope,
    color: '#00A651',
    bgLight: '#ecfdf5',
    borderColor: '#a7f3d0',
  },
  {
    tag: 'Protection des Données',
    title: '100% Confidentiel & Sécurisé',
    description:
      'Vos évaluations et échanges médicaux sont protégés par le secret professionnel et partagés uniquement avec les praticiens de votre choix.',
    icon: ShieldCheck,
    color: '#0d9488',
    bgLight: '#f0fdfa',
    borderColor: '#99f6e4',
  },
];

export default function OnboardingScreen() {
  const [step, setStep] = useState(0);
  const [isReady, setIsReady] = useState(false);
  const { width } = useWindowDimensions();
  const isTablet = width >= 768;

  useEffect(() => {
    checkInitialState();
  }, []);

  const checkInitialState = async () => {
    try {
      // 1. Vérification session persistante (l'utilisateur reste connecté même si l'app se ferme)
      const authRoute = await tokenService.getInitialAuthRoute();
      if (authRoute) {
        router.replace(authRoute as any);
        return;
      }

      // 2. Si pas de session, vérifier si l'onboarding a déjà été complété
      const value = await AsyncStorage.getItem('@onboarding_complete');
      if (value !== null) {
        router.replace('/welcome');
      } else {
        setIsReady(true);
      }
    } catch {
      setIsReady(true);
    }
  };

  const handleNext = () => {
    if (step < ONBOARDING_STEPS.length - 1) {
      setStep(step + 1);
    } else {
      finishOnboarding();
    }
  };

  const finishOnboarding = async () => {
    try {
      await AsyncStorage.setItem('@onboarding_complete', 'true');
      router.replace('/welcome');
    } catch {
      router.replace('/welcome');
    }
  };

  if (!isReady) return null;

  const currentStep = ONBOARDING_STEPS[step];
  const IconComponent = currentStep.icon;
  const isLastStep = step === ONBOARDING_STEPS.length - 1;

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <View style={[styles.innerContainer, isTablet && styles.innerContainerTablet]}>
        {/* Barre supérieure : Logos officiels libres & Bouton Passer */}
        <View style={styles.topBar}>
          <View style={styles.partnerLogosRow}>
            <Image
              source={require('../../assets/images/ministere.jpg')}
              style={styles.ministereLogo}
              resizeMode="contain"
            />
            <Image
              source={require('../../assets/images/logo.png')}
              style={styles.tilaLogo}
              resizeMode="contain"
            />
            <Image
              source={require('../../assets/images/pnsm.png')}
              style={styles.pnsmLogo}
              resizeMode="contain"
            />
          </View>

          {!isLastStep && (
            <TouchableOpacity
              style={styles.skipButton}
              onPress={finishOnboarding}
              activeOpacity={0.7}
            >
              <Text style={styles.skipButtonText}>Passer</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Corps central animé */}
        <View style={styles.content}>
          {/* Cercle d'icône avec double halo doux */}
          <View
            style={[
              styles.iconHaloOuter,
              { backgroundColor: currentStep.bgLight, borderColor: currentStep.borderColor },
            ]}
          >
            <View
              style={[
                styles.iconHaloInner,
                { backgroundColor: '#ffffff', borderColor: currentStep.borderColor },
              ]}
            >
              <IconComponent size={44} color={currentStep.color} />
            </View>
          </View>

          {/* Pastille / Tag */}
          <View
            style={[
              styles.tagPill,
              { backgroundColor: currentStep.bgLight, borderColor: currentStep.borderColor },
            ]}
          >
            <Sparkles size={11} color={currentStep.color} style={{ marginRight: 4 }} />
            <Text style={[styles.tagText, { color: currentStep.color }]}>
              {currentStep.tag}
            </Text>
          </View>

          {/* Titre & Description */}
          <Text style={styles.title}>{currentStep.title}</Text>
          <Text style={styles.description}>{currentStep.description}</Text>
        </View>

        {/* Pied de page avec pagination et bouton d'action */}
        <View style={styles.footer}>
          {/* Indicateurs de progression (Dots) */}
          <View style={styles.pagination}>
            {ONBOARDING_STEPS.map((_, index) => {
              const isActive = index === step;
              return (
                <View
                  key={index}
                  style={[
                    styles.dot,
                    isActive && styles.dotActive,
                    isActive && { backgroundColor: currentStep.color },
                  ]}
                />
              );
            })}
          </View>

          {/* Bouton Suivant / Commencer */}
          <TouchableOpacity
            style={[
              styles.actionButton,
              isLastStep ? styles.actionButtonFinal : styles.actionButtonNext,
            ]}
            onPress={handleNext}
            activeOpacity={0.85}
          >
            <Text style={styles.actionButtonText}>
              {isLastStep ? 'Commencer' : 'Suivant'}
            </Text>
            <ArrowRight size={18} color="#ffffff" style={{ marginLeft: 6 }} />
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  innerContainer: {
    flex: 1,
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingVertical: 14,
  },
  innerContainerTablet: {
    maxWidth: 600,
    alignSelf: 'center',
    width: '100%',
    paddingVertical: 36,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 4,
  },
  partnerLogosRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  ministereLogo: {
    height: 38,
    width: 68,
  },
  tilaLogo: {
    height: 44,
    width: 82,
  },
  pnsmLogo: {
    height: 38,
    width: 68,
  },
  skipButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: '#f1f5f9',
  },
  skipButtonText: {
    fontSize: 12.5,
    fontWeight: '600',
    color: '#64748b',
    fontFamily: 'Montserrat_600SemiBold',
  },
  content: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 12,
    marginVertical: 20,
  },
  iconHaloOuter: {
    width: 116,
    height: 116,
    borderRadius: 58,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },
  iconHaloInner: {
    width: 90,
    height: 90,
    borderRadius: 45,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 10,
    elevation: 2,
  },
  tagPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
    borderWidth: 1,
    marginBottom: 12,
  },
  tagText: {
    fontSize: 11,
    fontWeight: '700',
    fontFamily: 'Montserrat_700Bold',
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  title: {
    fontSize: 23,
    fontWeight: '800',
    color: '#0f172a',
    textAlign: 'center',
    marginBottom: 12,
    fontFamily: 'Montserrat_700Bold',
    lineHeight: 30,
  },
  description: {
    fontSize: 14,
    color: '#64748b',
    textAlign: 'center',
    lineHeight: 22,
    fontFamily: 'Montserrat_400Regular',
    paddingHorizontal: 8,
  },
  footer: {
    alignItems: 'center',
    gap: 20,
    paddingBottom: 10,
  },
  pagination: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  dot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
    backgroundColor: '#cbd5e1',
  },
  dotActive: {
    width: 24,
    borderRadius: 4,
  },
  actionButton: {
    width: '100%',
    maxWidth: 380,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 15,
    borderRadius: 14,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 8,
    elevation: 4,
  },
  actionButtonNext: {
    backgroundColor: '#00A651', // Vert TILA
    shadowColor: '#00A651',
    shadowOpacity: 0.25,
  },
  actionButtonFinal: {
    backgroundColor: '#F58220', // Orange TILA
    shadowColor: '#F58220',
    shadowOpacity: 0.25,
  },
  actionButtonText: {
    color: '#ffffff',
    fontSize: 15.5,
    fontWeight: '700',
    fontFamily: 'Montserrat_700Bold',
  },
});
