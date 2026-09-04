import React, { useState, useEffect } from 'react';
import {
  View,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  ScrollView,
  useWindowDimensions,
  Alert,
} from 'react-native';
import { Text } from '../../components/Text';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  ArrowLeft,
  Eye,
  EyeOff,
  ShieldCheck,
  Heart,
  CheckCircle2,
  Calendar,
  Phone,
  Mail,
  User,
  Lock,
} from 'lucide-react-native';
import { apiClient, tokenService } from '../../services/apiClient';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useQueryClient } from '@tanstack/react-query';
import { preloadService } from '../../services/preloadService';
import { useTheme } from '../../context/ThemeContext';

export default function RegisterPatientScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { colors, isDark } = useTheme();
  const params = useLocalSearchParams<{ evaluationToken?: string }>();
  const { width } = useWindowDimensions();
  const isTablet = width >= 768;

  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [birthdate, setBirthdate] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const [evaluationToken, setEvaluationToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    const checkEvaluationToken = async () => {
      // 1. Paramètres de route
      if (params.evaluationToken) {
        setEvaluationToken(params.evaluationToken);
        return;
      }
      // 2. Storage local
      try {
        const stored = await AsyncStorage.getItem('evaluation_attach_token');
        if (stored) {
          setEvaluationToken(stored);
        }
      } catch {}
    };
    checkEvaluationToken();
  }, [params.evaluationToken]);

  const handleRegister = async () => {
    setErrorMessage('');

    if (!firstName.trim() || !lastName.trim()) {
      setErrorMessage('Veuillez saisir votre nom et votre prénom.');
      return;
    }
    if (!email.trim() || !email.includes('@')) {
      setErrorMessage('Veuillez saisir une adresse email valide.');
      return;
    }
    if (!password || password.length < 6) {
      setErrorMessage('Le mot de passe doit contenir au moins 6 caractères.');
      return;
    }

    setIsLoading(true);

    try {
      const payload: Record<string, any> = {
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        email: email.trim().toLowerCase(),
        password,
        phoneNumber: phoneNumber.trim() || '0102030405',
        birthdate: birthdate.trim() || undefined,
      };

      if (evaluationToken) {
        payload.evaluationToken = evaluationToken;
      }

      console.log('[RegisterPatient] Payload:', payload);

      const response = await apiClient.post('/api/auth/patient/register', payload);

      const { token, refresh_token } = response;
      if (token) {
        // Enregistrer tokens et session
        await tokenService.setTokens(token, refresh_token);
        await tokenService.setActiveContext('PATIENT');

        // Nettoyer le token d'évaluation rattaché
        await AsyncStorage.removeItem('evaluation_attach_token');
        await AsyncStorage.removeItem('evaluation_token');

        // Précharger silencieusement les données
        preloadService.preloadAllData(queryClient);

        Alert.alert(
          'Compte créé avec succès !',
          'Bienvenue sur votre espace patient TILA. Votre profil est prêt.',
          [
            {
              text: 'Accéder à mon espace',
              onPress: () => router.replace('/(patient)/dashboard'),
            },
          ]
        );
      } else {
        router.replace('/(auth)/login');
      }
    } catch (error: any) {
      console.log('Register error:', error);
      if (error.response?.status === 409) {
        setErrorMessage('Cet email est déjà utilisé par un autre compte.');
      } else if (error.response?.data?.error) {
        setErrorMessage(error.response.data.error);
      } else {
        setErrorMessage(
          'Une erreur est survenue lors de l’inscription. Veuillez vérifier vos données ou réessayer plus tard.'
        );
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.bgSecondary }]} edges={['top', 'bottom']}>
      {/* Barre supérieure */}
      <View style={[styles.topBar, { backgroundColor: colors.card, borderBottomColor: colors.border }]}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={[styles.backButton, { backgroundColor: colors.cardSecondary }]}
          activeOpacity={0.7}
        >
          <ArrowLeft size={22} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.topBarTitle, { color: colors.text }]}>Espace Bénéficiaire</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        contentContainerStyle={[
          styles.scrollContent,
          isTablet && styles.scrollContentTablet,
        ]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Titre & Accroche */}
        <View style={styles.header}>
          <View style={styles.badgeRow}>
            <View style={[styles.roleBadge, isDark && { backgroundColor: 'rgba(0,166,81,0.15)', borderColor: '#00A651' }]}>
              <Heart size={14} color="#00A651" style={{ marginRight: 5 }} />
              <Text style={styles.roleBadgeText}>Accompagnement Patient</Text>
            </View>
          </View>
          <Text style={[styles.title, { color: colors.text }]}>Créer mon compte</Text>
          <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
            Rejoignez TILA pour suivre votre santé mentale en toute confidentialité.
          </Text>
        </View>

        {/* Bannière de liaison de l'auto-évaluation */}
        {evaluationToken ? (
          <View style={[styles.attachedEvaluationBanner, isDark && { backgroundColor: 'rgba(0,166,81,0.15)', borderColor: '#00A651' }]}>
            <ShieldCheck size={20} color="#00A651" style={{ marginTop: 2 }} />
            <View style={{ flex: 1 }}>
              <Text style={[styles.attachedTitle, isDark && { color: '#4ade80' }]}>Auto-évaluation rattachée !</Text>
              <Text style={[styles.attachedDesc, isDark && { color: '#86efac' }]}>
                Vos résultats d'évaluation récents seront automatiquement conservés dans votre nouvel espace personnel.
              </Text>
            </View>
          </View>
        ) : null}

        {/* Formulaire complet */}
        <View style={[styles.formCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          {/* Prénom & Nom */}
          <View style={styles.nameRow}>
            <View style={[styles.inputGroup, { flex: 1 }]}>
              <Text style={[styles.label, { color: colors.text }]}>Prénom *</Text>
              <View style={[styles.inputWrapper, { backgroundColor: colors.inputBg, borderColor: colors.border }]}>
                <User size={18} color={colors.textMuted} style={styles.inputIcon} />
                <TextInput
                  style={[styles.input, { color: colors.text }]}
                  placeholder="Ex: Sarah"
                  placeholderTextColor={colors.textMuted}
                  value={firstName}
                  onChangeText={setFirstName}
                />
              </View>
            </View>

            <View style={[styles.inputGroup, { flex: 1 }]}>
              <Text style={[styles.label, { color: colors.text }]}>Nom *</Text>
              <View style={[styles.inputWrapper, { backgroundColor: colors.inputBg, borderColor: colors.border }]}>
                <User size={18} color={colors.textMuted} style={styles.inputIcon} />
                <TextInput
                  style={[styles.input, { color: colors.text }]}
                  placeholder="Ex: Kouamé"
                  placeholderTextColor={colors.textMuted}
                  value={lastName}
                  onChangeText={setLastName}
                />
              </View>
            </View>
          </View>

          {/* Email */}
          <View style={styles.inputGroup}>
            <Text style={[styles.label, { color: colors.text }]}>Adresse Email *</Text>
            <View style={[styles.inputWrapper, { backgroundColor: colors.inputBg, borderColor: colors.border }]}>
              <Mail size={18} color={colors.textMuted} style={styles.inputIcon} />
              <TextInput
                style={[styles.input, { color: colors.text }]}
                placeholder="votre.email@exemple.com"
                keyboardType="email-address"
                autoCapitalize="none"
                placeholderTextColor={colors.textMuted}
                value={email}
                onChangeText={setEmail}
              />
            </View>
          </View>

          {/* Téléphone (Format Côte d'Ivoire) */}
          <View style={styles.inputGroup}>
            <Text style={[styles.label, { color: colors.text }]}>Numéro de Téléphone (Optionnel)</Text>
            <View style={[styles.inputWrapper, { backgroundColor: colors.inputBg, borderColor: colors.border }]}>
              <Phone size={18} color={colors.textMuted} style={styles.inputIcon} />
              <TextInput
                style={[styles.input, { color: colors.text }]}
                placeholder="Ex: +225 07 00 00 00 00"
                keyboardType="phone-pad"
                placeholderTextColor={colors.textMuted}
                value={phoneNumber}
                onChangeText={setPhoneNumber}
              />
            </View>
          </View>

          {/* Date de naissance */}
          <View style={styles.inputGroup}>
            <Text style={[styles.label, { color: colors.text }]}>Date de Naissance (AAAA-MM-JJ)</Text>
            <View style={[styles.inputWrapper, { backgroundColor: colors.inputBg, borderColor: colors.border }]}>
              <Calendar size={18} color={colors.textMuted} style={styles.inputIcon} />
              <TextInput
                style={[styles.input, { color: colors.text }]}
                placeholder="Ex: 1995-06-15"
                placeholderTextColor={colors.textMuted}
                value={birthdate}
                onChangeText={setBirthdate}
              />
            </View>
          </View>

          {/* Mot de passe */}
          <View style={styles.inputGroup}>
            <Text style={[styles.label, { color: colors.text }]}>Mot de Passe * (min. 6 caractères)</Text>
            <View style={[styles.inputWrapper, { backgroundColor: colors.inputBg, borderColor: colors.border }]}>
              <Lock size={18} color={colors.textMuted} style={styles.inputIcon} />
              <TextInput
                style={[styles.input, { color: colors.text, paddingRight: 44 }]}
                placeholder="••••••••"
                secureTextEntry={!showPassword}
                placeholderTextColor={colors.textMuted}
                value={password}
                onChangeText={setPassword}
              />
              <TouchableOpacity
                style={styles.eyeBtn}
                onPress={() => setShowPassword(!showPassword)}
                activeOpacity={0.7}
              >
                {showPassword ? (
                  <EyeOff size={18} color={colors.textSecondary} />
                ) : (
                  <Eye size={18} color={colors.textSecondary} />
                )}
              </TouchableOpacity>
            </View>
          </View>

          {/* Message d'erreur */}
          {errorMessage ? (
            <View style={[styles.errorBox, isDark && { backgroundColor: 'rgba(239,68,68,0.15)', borderColor: '#ef4444' }]}>
              <Text style={styles.errorText}>{errorMessage}</Text>
            </View>
          ) : null}

          {/* Bouton de soumission */}
          <TouchableOpacity
            style={[styles.primaryButton, isLoading && { opacity: 0.7 }]}
            onPress={handleRegister}
            disabled={isLoading}
            activeOpacity={0.85}
          >
            {isLoading ? (
              <ActivityIndicator color="#ffffff" />
            ) : (
              <>
                <Text style={styles.primaryButtonText}>S'inscrire</Text>
                <CheckCircle2 size={18} color="#ffffff" style={{ marginLeft: 8 }} />
              </>
            )}
          </TouchableOpacity>
        </View>

        {/* Pied de page */}
        <TouchableOpacity
          style={styles.loginLink}
          onPress={() => router.push('/(auth)/login')}
          activeOpacity={0.7}
        >
          <Text style={[styles.loginLinkText, { color: colors.textSecondary }]}>
            Vous avez déjà un compte ?{' '}
            <Text style={styles.loginLinkHighlight}>Se connecter</Text>
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  backButton: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: '#f1f5f9',
  },
  topBarTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0f172a',
    fontFamily: 'Montserrat_700Bold',
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 40,
  },
  scrollContentTablet: {
    maxWidth: 580,
    alignSelf: 'center',
    width: '100%',
    paddingVertical: 30,
  },
  header: {
    marginBottom: 18,
  },
  badgeRow: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  roleBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ecfdf5',
    borderWidth: 1,
    borderColor: '#a7f3d0',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  roleBadgeText: {
    fontSize: 11.5,
    fontWeight: '700',
    color: '#00A651',
    fontFamily: 'Montserrat_700Bold',
  },
  title: {
    fontSize: 24,
    fontWeight: '800',
    color: '#0f172a',
    fontFamily: 'Montserrat_700Bold',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 13.5,
    color: '#64748b',
    fontFamily: 'Montserrat_400Regular',
    lineHeight: 19,
  },
  attachedEvaluationBanner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#f0fdf4',
    borderWidth: 1,
    borderColor: '#86efac',
    borderRadius: 14,
    padding: 14,
    marginBottom: 18,
    gap: 10,
  },
  attachedTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#15803d',
    fontFamily: 'Montserrat_700Bold',
    marginBottom: 2,
  },
  attachedDesc: {
    fontSize: 11.5,
    color: '#166534',
    lineHeight: 16,
    fontFamily: 'Montserrat_400Regular',
  },
  formCard: {
    backgroundColor: '#ffffff',
    borderRadius: 18,
    padding: 20,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
    gap: 14,
  },
  nameRow: {
    flexDirection: 'row',
    gap: 12,
  },
  inputGroup: {
    gap: 6,
  },
  label: {
    fontSize: 12.5,
    fontWeight: '600',
    color: '#334155',
    fontFamily: 'Montserrat_600SemiBold',
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 48,
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 12,
    backgroundColor: '#f8fafc',
    paddingHorizontal: 12,
  },
  inputIcon: {
    marginRight: 8,
  },
  input: {
    flex: 1,
    fontSize: 14,
    color: '#0f172a',
    fontFamily: 'Montserrat_400Regular',
  },
  eyeBtn: {
    padding: 6,
  },
  errorBox: {
    backgroundColor: '#fef2f2',
    borderWidth: 1,
    borderColor: '#fecaca',
    padding: 10,
    borderRadius: 10,
  },
  errorText: {
    color: '#ef4444',
    fontSize: 12.5,
    fontFamily: 'Montserrat_500Medium',
    lineHeight: 17,
  },
  primaryButton: {
    flexDirection: 'row',
    height: 50,
    backgroundColor: '#00A651', // Vert TILA
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 6,
    shadowColor: '#00A651',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 3,
  },
  primaryButtonText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '700',
    fontFamily: 'Montserrat_700Bold',
  },
  loginLink: {
    alignItems: 'center',
    marginTop: 20,
    paddingVertical: 8,
  },
  loginLinkText: {
    fontSize: 13.5,
    color: '#64748b',
    fontFamily: 'Montserrat_500Medium',
  },
  loginLinkHighlight: {
    color: '#00A651',
    fontWeight: '700',
    fontFamily: 'Montserrat_700Bold',
  },
});
