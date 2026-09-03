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
  Users,
  CheckCircle2,
  Mail,
  User,
  Lock,
  Phone,
  Building2,
  Eye,
  EyeOff,
} from 'lucide-react-native';
import { apiClient } from '../../services/apiClient';

export default function RegisterAgentScreen() {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const isTablet = width >= 768;

  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [ongName, setOngName] = useState('');
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
      setErrorMessage('Veuillez saisir une adresse email valide.');
      return;
    }
    if (!ongName.trim()) {
      setErrorMessage('Veuillez préciser le nom de votre ONG ou association de rattachement.');
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
        ongName: ongName.trim(),
      };

      await apiClient.post('/api/public/sensibilisateur/register', payload);

      Alert.alert(
        'Demande transmise avec succès !',
        'Votre compte d’agent sensibilisateur a bien été soumis. Il sera activé après validation par votre responsable d’ONG et l’équipe TILA.',
        [
          {
            text: 'Retour à la connexion',
            onPress: () => router.replace('/(auth)/login'),
          },
        ]
      );
    } catch (error: any) {
      if (error.response?.status === 409) {
        setErrorMessage('Cet email est déjà associé à un compte.');
      } else if (error.response?.data?.error) {
        setErrorMessage(error.response.data.error);
      } else {
        setErrorMessage(
          'Erreur lors de l’inscription. Veuillez vérifier vos données ou réessayer plus tard.'
        );
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <View style={styles.topBar}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.backButton}
          activeOpacity={0.7}
        >
          <ArrowLeft size={22} color="#0f172a" />
        </TouchableOpacity>
        <Text style={styles.topBarTitle}>Espace Sensibilisateur</Text>
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
          <View style={styles.roleBadge}>
            <Users size={14} color="#0284c7" style={{ marginRight: 5 }} />
            <Text style={styles.roleBadgeText}>Sensibilisation & Dépistage</Text>
          </View>
          <Text style={styles.title}>Inscription Sensibilisateur</Text>
          <Text style={styles.subtitle}>
            Agents rattachés à une ONG ou association partenaire pour les actions de terrain et de cohorte.
          </Text>
        </View>

        <View style={styles.formCard}>
          <View style={styles.nameRow}>
            <View style={[styles.inputGroup, { flex: 1 }]}>
              <Text style={styles.label}>Prénom *</Text>
              <View style={styles.inputWrapper}>
                <User size={18} color="#94a3b8" style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder="Ex: Aminata"
                  placeholderTextColor="#94a3b8"
                  value={firstName}
                  onChangeText={setFirstName}
                />
              </View>
            </View>

            <View style={[styles.inputGroup, { flex: 1 }]}>
              <Text style={styles.label}>Nom *</Text>
              <View style={styles.inputWrapper}>
                <User size={18} color="#94a3b8" style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder="Ex: Diallo"
                  placeholderTextColor="#94a3b8"
                  value={lastName}
                  onChangeText={setLastName}
                />
              </View>
            </View>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Email *</Text>
            <View style={styles.inputWrapper}>
              <Mail size={18} color="#94a3b8" style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="aminata.diallo@ong-partenaire.org"
                keyboardType="email-address"
                autoCapitalize="none"
                placeholderTextColor="#94a3b8"
                value={email}
                onChangeText={setEmail}
              />
            </View>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Téléphone</Text>
            <View style={styles.inputWrapper}>
              <Phone size={18} color="#94a3b8" style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="+225 05 00 00 00 00"
                keyboardType="phone-pad"
                placeholderTextColor="#94a3b8"
                value={phoneNumber}
                onChangeText={setPhoneNumber}
              />
            </View>
          </View>

          {/* Nom de l'ONG */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>ONG / Organisation de rattachement *</Text>
            <View style={styles.inputWrapper}>
              <Building2 size={18} color="#94a3b8" style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="Ex: Alliance Côte d’Ivoire / Croix-Rouge"
                placeholderTextColor="#94a3b8"
                value={ongName}
                onChangeText={setOngName}
              />
            </View>
          </View>

          {/* Mot de passe */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Mot de Passe * (min. 6 caractères)</Text>
            <View style={styles.inputWrapper}>
              <Lock size={18} color="#94a3b8" style={styles.inputIcon} />
              <TextInput
                style={[styles.input, { paddingRight: 44 }]}
                placeholder="••••••••"
                secureTextEntry={!showPassword}
                placeholderTextColor="#94a3b8"
                value={password}
                onChangeText={setPassword}
              />
              <TouchableOpacity
                style={styles.eyeBtn}
                onPress={() => setShowPassword(!showPassword)}
                activeOpacity={0.7}
              >
                {showPassword ? <EyeOff size={18} color="#64748b" /> : <Eye size={18} color="#64748b" />}
              </TouchableOpacity>
            </View>
          </View>

          {errorMessage ? (
            <View style={styles.errorBox}>
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
          <Text style={styles.loginLinkText}>
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
    backgroundColor: '#f0f9ff',
    borderWidth: 1,
    borderColor: '#bae6fd',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    alignSelf: 'flex-start',
    marginBottom: 8,
  },
  roleBadgeText: {
    fontSize: 11.5,
    fontWeight: '700',
    color: '#0284c7',
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
    backgroundColor: '#0284c7', // Bleu Sensibilisateur
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 6,
    shadowColor: '#0284c7',
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
