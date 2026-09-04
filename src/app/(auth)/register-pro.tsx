import React, { useState } from 'react';
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
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  ArrowLeft,
  Stethoscope,
  CheckCircle2,
  Mail,
  User,
  Lock,
  Phone,
  Briefcase,
  Eye,
  EyeOff,
  Building,
} from 'lucide-react-native';
import { apiClient } from '../../services/apiClient';
import { useTheme } from '../../context/ThemeContext';

const SPECIALTY_OPTIONS = [
  'Psychologue Clinicien',
  'Psychiatre',
  'Psychothérapeute',
  'Pédopsychiatre',
  'Travailleur Social',
  'Infirmier Psychiatrique',
  'Conseiller en Santé Mentale',
];

export default function RegisterProScreen() {
  const router = useRouter();
  const { colors, isDark } = useTheme();
  const { width } = useWindowDimensions();
  const isTablet = width >= 768;

  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [specialty, setSpecialty] = useState(SPECIALTY_OPTIONS[0]);
  const [structure, setStructure] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const handleRegister = async () => {
    setErrorMessage('');

    if (!firstName.trim() || !lastName.trim()) {
      setErrorMessage('Veuillez renseigner votre nom et prénom.');
      return;
    }
    if (!email.trim() || !email.includes('@')) {
      setErrorMessage('Veuillez saisir une adresse email professionnelle valide.');
      return;
    }
    if (!password || password.length < 6) {
      setErrorMessage('Le mot de passe doit contenir au moins 6 caractères.');
      return;
    }

    setIsLoading(true);

    try {
      const payload = {
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        email: email.trim().toLowerCase(),
        password,
        phoneNumber: phoneNumber.trim() || '0102030405',
        specialty,
        organizationName: structure.trim() || undefined,
      };

      await apiClient.post('/api/professionals/register', payload);

      Alert.alert(
        'Demande transmise avec succès !',
        'Votre inscription professionnelle a bien été enregistrée. Elle sera validée par l’équipe administrative avant activation.',
        [
          {
            text: 'Retour à la connexion',
            onPress: () => router.replace('/(auth)/login'),
          },
        ]
      );
    } catch (error: any) {
      if (error.response?.status === 409) {
        setErrorMessage('Cet email est déjà associé à un compte praticien.');
      } else if (error.response?.data?.error) {
        setErrorMessage(error.response.data.error);
      } else {
        setErrorMessage(
          'Erreur lors de l’inscription. Veuillez vérifier vos informations ou réessayer plus tard.'
        );
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.bgSecondary }]} edges={['top', 'bottom']}>
      <View style={[styles.topBar, { backgroundColor: colors.card, borderBottomColor: colors.border }]}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={[styles.backButton, { backgroundColor: colors.cardSecondary }]}
          activeOpacity={0.7}
        >
          <ArrowLeft size={22} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.topBarTitle, { color: colors.text }]}>Espace Professionnel</Text>
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
        <View style={styles.header}>
          <View style={[styles.roleBadge, isDark && { backgroundColor: 'rgba(0,166,81,0.15)', borderColor: '#00A651' }]}>
            <Stethoscope size={14} color="#00A651" style={{ marginRight: 5 }} />
            <Text style={styles.roleBadgeText}>Praticien & Spécialiste</Text>
          </View>
          <Text style={[styles.title, { color: colors.text }]}>Inscription Praticien</Text>
          <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
            Rejoignez l'annuaire national TILA pour proposer vos consultations et accompagner les patients.
          </Text>
        </View>

        <View style={[styles.formCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={styles.nameRow}>
            <View style={[styles.inputGroup, { flex: 1 }]}>
              <Text style={[styles.label, { color: colors.text }]}>Prénom *</Text>
              <View style={[styles.inputWrapper, { backgroundColor: colors.inputBg, borderColor: colors.border }]}>
                <User size={18} color={colors.textMuted} style={styles.inputIcon} />
                <TextInput
                  style={[styles.input, { color: colors.text }]}
                  placeholder="Ex: Dr. Jean"
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
                  placeholder="Ex: Koffi"
                  placeholderTextColor={colors.textMuted}
                  value={lastName}
                  onChangeText={setLastName}
                />
              </View>
            </View>
          </View>

          <View style={styles.inputGroup}>
            <Text style={[styles.label, { color: colors.text }]}>Email Professionnel *</Text>
            <View style={[styles.inputWrapper, { backgroundColor: colors.inputBg, borderColor: colors.border }]}>
              <Mail size={18} color={colors.textMuted} style={styles.inputIcon} />
              <TextInput
                style={[styles.input, { color: colors.text }]}
                placeholder="docteur.koffi@hopital.ci"
                keyboardType="email-address"
                autoCapitalize="none"
                placeholderTextColor={colors.textMuted}
                value={email}
                onChangeText={setEmail}
              />
            </View>
          </View>

          <View style={styles.inputGroup}>
            <Text style={[styles.label, { color: colors.text }]}>Téléphone Professionnel</Text>
            <View style={[styles.inputWrapper, { backgroundColor: colors.inputBg, borderColor: colors.border }]}>
              <Phone size={18} color={colors.textMuted} style={styles.inputIcon} />
              <TextInput
                style={[styles.input, { color: colors.text }]}
                placeholder="+225 07 00 00 00 00"
                keyboardType="phone-pad"
                placeholderTextColor={colors.textMuted}
                value={phoneNumber}
                onChangeText={setPhoneNumber}
              />
            </View>
          </View>

          {/* Spécialité */}
          <View style={styles.inputGroup}>
            <Text style={[styles.label, { color: colors.text }]}>Spécialité Principale</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.specialtyScroll}>
              {SPECIALTY_OPTIONS.map((spec) => {
                const isSelected = specialty === spec;
                return (
                  <TouchableOpacity
                    key={spec}
                    style={[
                      styles.specialtyPill,
                      { backgroundColor: colors.cardSecondary, borderColor: colors.border },
                      isSelected && (isDark ? { backgroundColor: 'rgba(0,166,81,0.2)', borderColor: '#00A651' } : styles.specialtyPillSelected),
                    ]}
                    onPress={() => setSpecialty(spec)}
                    activeOpacity={0.7}
                  >
                    <Text
                      style={[
                        styles.specialtyText,
                        { color: colors.textSecondary },
                        isSelected && styles.specialtyTextSelected,
                      ]}
                    >
                      {spec}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>

          {/* Structure / Cabinet */}
          <View style={styles.inputGroup}>
            <Text style={[styles.label, { color: colors.text }]}>Établissement ou Cabinet d'exercice</Text>
            <View style={[styles.inputWrapper, { backgroundColor: colors.inputBg, borderColor: colors.border }]}>
              <Building size={18} color={colors.textMuted} style={styles.inputIcon} />
              <TextInput
                style={[styles.input, { color: colors.text }]}
                placeholder="Ex: CHU de Treichville / Cabinet Privé"
                placeholderTextColor={colors.textMuted}
                value={structure}
                onChangeText={setStructure}
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
                {showPassword ? <EyeOff size={18} color={colors.textSecondary} /> : <Eye size={18} color={colors.textSecondary} />}
              </TouchableOpacity>
            </View>
          </View>

          {errorMessage ? (
            <View style={[styles.errorBox, isDark && { backgroundColor: 'rgba(239,68,68,0.15)', borderColor: '#ef4444' }]}>
              <Text style={styles.errorText}>{errorMessage}</Text>
            </View>
          ) : null}

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
                <Text style={styles.primaryButtonText}>Soumettre mon inscription</Text>
                <CheckCircle2 size={18} color="#ffffff" style={{ marginLeft: 8 }} />
              </>
            )}
          </TouchableOpacity>
        </View>

        <TouchableOpacity
          style={styles.loginLink}
          onPress={() => router.push('/(auth)/login')}
          activeOpacity={0.7}
        >
          <Text style={[styles.loginLinkText, { color: colors.textSecondary }]}>
            Déjà inscrit ? <Text style={styles.loginLinkHighlight}>Se connecter</Text>
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
  roleBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ecfdf5',
    borderWidth: 1,
    borderColor: '#a7f3d0',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    alignSelf: 'flex-start',
    marginBottom: 8,
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
  specialtyScroll: {
    flexDirection: 'row',
    paddingVertical: 4,
  },
  specialtyPill: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 20,
    backgroundColor: '#f1f5f9',
    marginRight: 8,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  specialtyPillSelected: {
    backgroundColor: '#ecfdf5',
    borderColor: '#00A651',
  },
  specialtyText: {
    fontSize: 12,
    color: '#64748b',
    fontFamily: 'Montserrat_500Medium',
  },
  specialtyTextSelected: {
    color: '#00A651',
    fontWeight: '700',
    fontFamily: 'Montserrat_700Bold',
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
    backgroundColor: '#00A651',
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
