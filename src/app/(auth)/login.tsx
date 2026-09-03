import React, { useState } from 'react';
import {
  View,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Modal,
  ScrollView,
  useWindowDimensions,
} from 'react-native';
import { Text } from '../../components/Text';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  ArrowLeft,
  ShieldCheck,
  Stethoscope,
  ClipboardList,
  ArrowRightLeft,
  Heart,
  ChevronRight,
  Sparkles,
  X,
  LogOut,
  Eye,
  EyeOff,
  Users,
  Building2,
} from 'lucide-react-native';
import { apiClient, tokenService } from '../../services/apiClient';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useQueryClient } from '@tanstack/react-query';
import { preloadService } from '../../services/preloadService';
import { useTheme } from '../../context/ThemeContext';

export interface DashboardOption {
  id: string;
  title: string;
  subtitle: string;
  badge: string;
  type: string;
  route: string;
  color: string;
  bgLight: string;
  icon: any;
}

const ALL_ADMIN_DASHBOARDS: DashboardOption[] = [
  {
    id: 'supervisor',
    title: 'Superviseur Clinique',
    subtitle: 'Revue clinique, alertes critiques & supervision d’équipe',
    badge: 'Supervision',
    type: 'SUPERVISOR',
    route: '/(supervisor)/dashboard',
    color: '#d97706',
    bgLight: '#fef3c7',
    icon: ShieldCheck,
  },
  {
    id: 'specialist',
    title: 'Spécialiste de Santé Mentale',
    subtitle: 'Consultations, réévaluations médicales & ordonnances',
    badge: 'Clinique',
    type: 'PRO',
    route: '/(specialist)/dashboard',
    color: '#00A651',
    bgLight: '#ecfdf5',
    icon: Stethoscope,
  },
  {
    id: 'health-agent',
    title: 'Agent de Santé Communautaire',
    subtitle: 'Dépistage communautaire, files actives & suivis',
    badge: 'Communautaire',
    type: 'HEALTH_AGENT',
    route: '/(health-agent)/dashboard',
    color: '#2563eb',
    bgLight: '#eff6ff',
    icon: ClipboardList,
  },
  {
    id: 'field-agent',
    title: 'Agent de Terrain Migrant',
    subtitle: 'Maraudes, populations mobiles & vulnérabilités',
    badge: 'Terrain',
    type: 'FIELD_AGENT',
    route: '/(field-agent)/dashboard',
    color: '#8b5cf6',
    bgLight: '#f5f3ff',
    icon: ArrowRightLeft,
  },
  {
    id: 'census-agent',
    title: 'Agent Sensibilisateur',
    subtitle: 'Recensement terrain, ménages & vulnérabilités',
    badge: 'Recensement',
    type: 'CENSUS_AGENT',
    route: '/(census-agent)/dashboard',
    color: '#00A651',
    bgLight: '#ecfdf5',
    icon: Users,
  },
  {
    id: 'ong-manager',
    title: 'Responsable ONG',
    subtitle: 'Supervision agents, validations & rapports d’activité',
    badge: 'ONG',
    type: 'ONG_MANAGER',
    route: '/(ong-manager)/dashboard',
    color: '#ea580c',
    bgLight: '#fff7ed',
    icon: Building2,
  },
  {
    id: 'program-agent',
    title: 'Agent Programme National (PNSM)',
    subtitle: 'Indicateurs macro, alertes prioritaires & parcours 360°',
    badge: 'Programme',
    type: 'PROGRAM_AGENT',
    route: '/(program-agent)/dashboard',
    color: '#4f46e5',
    bgLight: '#eef2ff',
    icon: ShieldCheck,
  },
  {
    id: 'patient',
    title: 'Espace Bénéficiaire / Patient',
    subtitle: 'Auto-évaluation, téléconsultation & ordonnances',
    badge: 'Patient',
    type: 'PATIENT',
    route: '/(patient)/dashboard',
    color: '#0d9488',
    bgLight: '#f0fdfa',
    icon: Heart,
  },
];

function mapUserSpacesToDashboards(spaces: any[]): DashboardOption[] {
  return spaces.map((space) => {
    const spacePath = space.path || '';
    const type = space.type || '';

    if (spacePath === '/espace-superviseur' || type === 'SUPERVISOR') {
      return {
        id: space.id || 'supervisor',
        title: space.label || space.name || 'Superviseur Clinique',
        subtitle: 'Revue clinique, alertes critiques & supervision',
        badge: 'Supervision',
        type: 'SUPERVISOR',
        route: '/(supervisor)/dashboard',
        color: '#d97706',
        bgLight: '#fef3c7',
        icon: ShieldCheck,
      };
    }
    if (spacePath === '/professionnels' || type === 'PRO') {
      return {
        id: space.id || 'specialist',
        title: space.label || space.name || 'Spécialiste de Santé',
        subtitle: 'Consultations, réévaluations & prescriptions',
        badge: 'Clinique',
        type: 'PRO',
        route: '/(specialist)/dashboard',
        color: '#00A651',
        bgLight: '#ecfdf5',
        icon: Stethoscope,
      };
    }
    if (spacePath === '/espace-agent' || type === 'HEALTH_AGENT') {
      return {
        id: space.id || 'health-agent',
        title: space.label || space.name || 'Agent de Santé',
        subtitle: 'Dépistage communautaire & suivis',
        badge: 'Communautaire',
        type: 'HEALTH_AGENT',
        route: '/(health-agent)/dashboard',
        color: '#2563eb',
        bgLight: '#eff6ff',
        icon: ClipboardList,
      };
    }
    if (spacePath === '/espace-agent-terrain-migrant' || type === 'FIELD_AGENT') {
      return {
        id: space.id || 'field-agent',
        title: space.label || space.name || 'Agent de Terrain',
        subtitle: 'Maraudes, populations mobiles & vulnérabilités',
        badge: 'Terrain',
        type: 'FIELD_AGENT',
        route: '/(field-agent)/dashboard',
        color: '#8b5cf6',
        bgLight: '#f5f3ff',
        icon: ArrowRightLeft,
      };
    }
    if (spacePath === '/recensement' || type === 'CENSUS_AGENT' || type === 'SENSIBILISATEUR') {
      return {
        id: space.id || 'census-agent',
        title: space.label || space.name || 'Agent Sensibilisateur',
        subtitle: 'Recensement terrain, ménages & vulnérabilités',
        badge: 'Recensement',
        type: 'CENSUS_AGENT',
        route: '/(census-agent)/dashboard',
        color: '#00A651',
        bgLight: '#ecfdf5',
        icon: Users,
      };
    }
    if (spacePath === '/ong' || type === 'ONG_MANAGER' || type === 'RESPONSABLE_ONG') {
      return {
        id: space.id || 'ong-manager',
        title: space.label || space.name || 'Responsable ONG',
        subtitle: 'Supervision agents, validations & rapports',
        badge: 'ONG',
        type: 'ONG_MANAGER',
        route: '/(ong-manager)/dashboard',
        color: '#ea580c',
        bgLight: '#fff7ed',
        icon: Building2,
      };
    }
    if (spacePath === '/agent-programme' || type === 'PROGRAM_AGENT') {
      return {
        id: space.id || 'program-agent',
        title: space.label || space.name || 'Agent Programme National',
        subtitle: 'Macro-surveillance & alertes sanitaires',
        badge: 'Programme',
        type: 'PROGRAM_AGENT',
        route: '/(program-agent)/dashboard',
        color: '#4f46e5',
        bgLight: '#eef2ff',
        icon: ShieldCheck,
      };
    }
    return {
      id: space.id || 'patient',
      title: space.label || space.name || 'Espace Bénéficiaire',
      subtitle: 'Auto-évaluation & téléconsultation',
      badge: 'Patient',
      type: 'PATIENT',
      route: '/(patient)/dashboard',
      color: '#0d9488',
      bgLight: '#f0fdfa',
      icon: Heart,
    };
  });
}

export default function LoginScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { width, height } = useWindowDimensions();
  const isTablet = width >= 768;
  const { isDark, colors } = useTheme();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  // États pour le Pop-up Modal de sélection de Dashboard
  const [showSpaceModal, setShowSpaceModal] = useState(false);
  const [availableDashboards, setAvailableDashboards] = useState<DashboardOption[]>([]);
  const [selectedUserContext, setSelectedUserContext] = useState<any>(null);
  const [isRedirecting, setIsRedirecting] = useState(false);
  const [targetLabel, setTargetLabel] = useState('');



  const handleLogin = async () => {
    if (!email || !password) {
      setErrorMessage('Veuillez remplir tous les champs.');
      return;
    }

    setIsLoading(true);
    setErrorMessage('');

    try {
      // 1. Authenticate and retrieve token
      const response = await apiClient.post('/api/auth/login', {
        username: email,
        password: password,
      });

      const { token, refresh_token } = response;
      if (!token) throw new Error("No token returned");

      // 2. Store tokens securely
      await tokenService.setTokens(token, refresh_token);

      // 3. Fetch user context to determine role
      const contextResponse = await apiClient.get('/api/me/context');
      const userContext = contextResponse.user;
      
      console.log('[Login] User Context:', JSON.stringify(userContext, null, 2));
      await AsyncStorage.setItem('tila_user_context', JSON.stringify(userContext));

      // Déclencher le préchargement silencieux en arrière-plan
      preloadService.preloadAllData(queryClient);

      // 4. Détection des Administrateurs & Multi-rôles
      const isAdmin = userContext?.roles?.some(
        (r: string) => r === 'ROLE_ADMIN' || r === 'ROLE_SUPER_ADMIN'
      );
      const isMultiRole = Array.isArray(userContext?.spaces) && userContext.spaces.length > 1;
      const isAdminOrMultiRole = isAdmin || isMultiRole;

      if (isAdminOrMultiRole) {
        if (isAdmin) {
          // L'administrateur a accès aux 5 dashboards TILA complets
          setAvailableDashboards(ALL_ADMIN_DASHBOARDS);
        } else {
          // L'utilisateur multi-rôles a accès à ses espaces assignés
          const mapped = mapUserSpacesToDashboards(userContext.spaces);
          setAvailableDashboards(mapped);
        }
        setSelectedUserContext(userContext);
        setShowSpaceModal(true);
        return;
      }

      // 5. Redirection standard pour utilisateur mono-rôle
      if (userContext?.spaces && Array.isArray(userContext.spaces) && userContext.spaces.length === 1) {
        const space = userContext.spaces[0];
        await tokenService.setActiveContext(space.type);
        
        const spacePath = space.path || '';
        if (space.type === 'PATIENT' || spacePath === '/mon-espace') {
          router.replace('/(patient)/dashboard');
        } else if (spacePath === '/professionnels') {
          router.replace('/(specialist)/dashboard');
        } else if (spacePath === '/espace-agent') {
          router.replace('/(health-agent)/dashboard');
        } else if (spacePath === '/espace-superviseur') {
          router.replace('/(supervisor)/dashboard');
        } else if (spacePath === '/espace-agent-terrain-migrant' || space.type === 'FIELD_AGENT') {
          router.replace('/(field-agent)/dashboard');
        } else if (spacePath === '/recensement' || space.type === 'CENSUS_AGENT' || space.type === 'SENSIBILISATEUR') {
          router.replace('/(census-agent)/dashboard');
        } else if (spacePath === '/ong' || space.type === 'ONG_MANAGER' || space.type === 'RESPONSABLE_ONG') {
          router.replace('/(ong-manager)/dashboard');
        } else if (spacePath === '/agent-programme' || space.type === 'PROGRAM_AGENT') {
          router.replace('/(program-agent)/dashboard');
        } else {
          router.replace('/(patient)/dashboard');
        }
      } else if (userContext?.roles && userContext.roles.some((r: string) => r.includes('ROLE_PRO'))) {
        router.replace('/(specialist)/dashboard');
      } else if (userContext?.roles && userContext.roles.some((r: string) => r.includes('ROLE_SENSIBILISATEUR') || r.includes('ROLE_CENSUS'))) {
        router.replace('/(census-agent)/dashboard');
      } else if (userContext?.roles && userContext.roles.some((r: string) => r.includes('ROLE_ONG'))) {
        router.replace('/(ong-manager)/dashboard');
      } else if (userContext?.roles && userContext.roles.some((r: string) => r.includes('ROLE_PROGRAM_AGENT') || r.includes('ROLE_PNSM'))) {
        router.replace('/(program-agent)/dashboard');
      } else {
        await tokenService.setActiveContext('PATIENT');
        router.replace('/(patient)/dashboard');
      }

    } catch (error: any) {
      console.log('Login error response:', error.response);
      if (error.response && error.response.status === 401) {
        setErrorMessage('Email ou mot de passe incorrect.');
      } else {
        setErrorMessage('Une erreur de connexion est survenue. Veuillez réessayer plus tard.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleSelectDashboard = async (dash: DashboardOption) => {
    setIsRedirecting(true);
    setTargetLabel(dash.title);
    try {
      await tokenService.setActiveContext(dash.type);
      setShowSpaceModal(false);
      router.replace(dash.route as any);
    } catch (e) {
      console.error('Erreur sélection espace:', e);
      router.replace(dash.route as any);
    } finally {
      setIsRedirecting(false);
    }
  };

  const handleCancelModal = async () => {
    setShowSpaceModal(false);
    await tokenService.clearTokens();
  };

  return (
    <SafeAreaView style={[styles.container, isDark && { backgroundColor: colors.bg }]}>
      <TouchableOpacity
        style={[styles.backButton, isDark && { backgroundColor: colors.card, borderColor: colors.border }]}
        onPress={() => router.back()}
      >
        <ArrowLeft size={24} color={isDark ? colors.text : '#334155'} />
      </TouchableOpacity>

      <Text style={[styles.title, isDark && { color: colors.text }]}>Bon retour</Text>
      <Text style={[styles.subtitle, isDark && { color: colors.textSecondary }]}>Connectez-vous pour accéder à votre espace</Text>

      <View style={styles.formContainer}>
        <View style={styles.inputGroup}>
          <Text style={[styles.label, isDark && { color: colors.text }]}>Email</Text>
          <TextInput
            style={[
              styles.input,
              isDark && {
                backgroundColor: colors.inputBg,
                borderColor: colors.border,
                color: colors.text,
              },
            ]}
            placeholder="votre@email.com"
            keyboardType="email-address"
            autoCapitalize="none"
            placeholderTextColor={isDark ? '#64748b' : '#94a3b8'}
            value={email}
            onChangeText={setEmail}
          />
        </View>
        
        <View style={styles.inputGroup}>
          <Text style={[styles.label, isDark && { color: colors.text }]}>Mot de passe</Text>
          <View
            style={[
              styles.passwordContainer,
              isDark && {
                backgroundColor: colors.inputBg,
                borderColor: colors.border,
              },
            ]}
          >
            <TextInput
              style={[
                styles.passwordInput,
                isDark && { color: colors.text },
              ]}
              placeholder="••••••••"
              secureTextEntry={!showPassword}
              placeholderTextColor={isDark ? '#64748b' : '#94a3b8'}
              value={password}
              onChangeText={setPassword}
            />
            <TouchableOpacity
              style={styles.eyeButton}
              onPress={() => setShowPassword(!showPassword)}
              activeOpacity={0.7}
              hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            >
              {showPassword ? (
                <EyeOff size={20} color={isDark ? colors.textSecondary : '#64748b'} />
              ) : (
                <Eye size={20} color={isDark ? colors.textSecondary : '#64748b'} />
              )}
            </TouchableOpacity>
          </View>
        </View>

        {errorMessage ? (
          <Text style={styles.errorText}>{errorMessage}</Text>
        ) : null}
      </View>

      <TouchableOpacity
        style={[styles.primaryButton, isLoading && { opacity: 0.7 }]}
        onPress={handleLogin}
        disabled={isLoading}
      >
        {isLoading ? (
          <ActivityIndicator color="#ffffff" />
        ) : (
          <Text style={styles.primaryButtonText}>Se connecter</Text>
        )}
      </TouchableOpacity>
      
      <TouchableOpacity
        style={styles.registerButton}
        onPress={() => router.push('/(auth)/register-choice')}
      >
        <Text style={styles.registerText}>Pas encore de compte ? S'inscrire</Text>
      </TouchableOpacity>

      {/* POP-UP MODAL UX/UI PRO SÉLECTION DE DASHBOARD */}
      <Modal
        visible={showSpaceModal}
        animationType="fade"
        transparent
        onRequestClose={handleCancelModal}
      >
        <View style={styles.modalBackdrop}>
          <View
            style={[
              styles.modalCard,
              isTablet ? styles.modalCardTablet : styles.modalCardMobile,
              { maxHeight: Math.min(height * 0.88, isTablet ? 720 : 640) },
            ]}
          >
            {/* Header du Modal */}
            <View style={styles.modalHeader}>
              <View style={styles.modalBadgeRow}>
                <View style={styles.adminBadge}>
                  <Sparkles size={13} color="#00A651" style={{ marginRight: 4 }} />
                  <Text style={styles.adminBadgeText}>
                    {selectedUserContext?.roles?.some((r: string) => r.includes('ADMIN'))
                      ? 'Accès Administrateur Global'
                      : 'Portail Multi-Profils'}
                  </Text>
                </View>
                <TouchableOpacity
                  onPress={handleCancelModal}
                  style={styles.modalCloseBtn}
                  activeOpacity={0.7}
                >
                  <X size={18} color="#64748b" />
                </TouchableOpacity>
              </View>

              <Text style={styles.modalMainTitle}>Sélectionnez votre Dashboard</Text>
              <Text style={styles.modalMainSubtitle}>
                Bonjour{' '}
                <Text style={{ fontWeight: '700', color: '#0f172a' }}>
                  {[selectedUserContext?.firstName, selectedUserContext?.lastName]
                    .filter(Boolean)
                    .join(' ') || 'Utilisateur'}
                </Text>
                , veuillez choisir l'espace de travail à ouvrir pour cette session :
              </Text>
            </View>

            {/* Indicateur de redirection si sélection en cours */}
            {isRedirecting && (
              <View style={styles.redirectingBanner}>
                <ActivityIndicator size="small" color="#00A651" style={{ marginRight: 8 }} />
                <Text style={styles.redirectingText}>
                  Ouverture de {targetLabel}...
                </Text>
              </View>
            )}

            {/* Liste des Dashboards Disponibles */}
            <ScrollView
              contentContainerStyle={styles.dashboardsList}
              showsVerticalScrollIndicator={false}
            >
              {availableDashboards.map((dash) => {
                const IconComponent = dash.icon;

                return (
                  <TouchableOpacity
                    key={dash.id}
                    style={styles.dashCard}
                    onPress={() => handleSelectDashboard(dash)}
                    disabled={isRedirecting}
                    activeOpacity={0.8}
                  >
                    <View style={[styles.dashIconBox, { backgroundColor: dash.bgLight }]}>
                      <IconComponent size={22} color={dash.color} />
                    </View>

                    <View style={styles.dashContent}>
                      <View style={styles.dashTitleRow}>
                        <Text style={styles.dashTitle}>{dash.title}</Text>
                        <View
                          style={[
                            styles.dashBadge,
                            { backgroundColor: dash.bgLight, borderColor: dash.color },
                          ]}
                        >
                          <Text style={[styles.dashBadgeText, { color: dash.color }]}>
                            {dash.badge}
                          </Text>
                        </View>
                      </View>
                      <Text style={styles.dashSubtitle} numberOfLines={2}>
                        {dash.subtitle}
                      </Text>
                    </View>

                    <ChevronRight size={18} color="#94a3b8" />
                  </TouchableOpacity>
                );
              })}
            </ScrollView>

            {/* Footer Modal */}
            <View style={styles.modalFooter}>
              <TouchableOpacity
                style={styles.cancelSessionBtn}
                onPress={handleCancelModal}
                activeOpacity={0.7}
              >
                <LogOut size={15} color="#64748b" style={{ marginRight: 6 }} />
                <Text style={styles.cancelSessionBtnText}>Changer de compte / Annuler</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
    paddingHorizontal: 24,
    justifyContent: 'center',
  },
  backButton: {
    position: 'absolute',
    top: 50,
    left: 24,
    zIndex: 10,
    padding: 8,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#0f172a',
    marginBottom: 8,
    fontFamily: 'Montserrat_700Bold',
  },
  subtitle: {
    fontSize: 15,
    color: '#64748b',
    marginBottom: 32,
    fontFamily: 'Montserrat_400Regular',
  },
  formContainer: {
    gap: 16,
    marginBottom: 24,
  },
  inputGroup: {
    gap: 8,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#334155',
    fontFamily: 'Montserrat_600SemiBold',
  },
  input: {
    height: 50,
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 12,
    paddingHorizontal: 16,
    fontSize: 16,
    color: '#0f172a',
    backgroundColor: '#f8fafc',
    fontFamily: 'Montserrat_400Regular',
  },
  passwordContainer: {
    height: 50,
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    paddingHorizontal: 16,
  },
  passwordInput: {
    flex: 1,
    fontSize: 16,
    color: '#0f172a',
    fontFamily: 'Montserrat_400Regular',
  },
  eyeButton: {
    padding: 6,
    marginLeft: 6,
  },
  primaryButton: {
    height: 50,
    backgroundColor: '#00A651',
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 8,
  },
  primaryButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
    fontFamily: 'Montserrat_600SemiBold',
  },
  errorText: {
    color: '#ef4444',
    fontSize: 14,
    marginTop: 4,
    fontFamily: 'Montserrat_400Regular',
  },
  registerButton: {
    marginTop: 20,
    alignItems: 'center',
    paddingVertical: 8,
  },
  registerText: {
    color: '#00A651',
    fontSize: 14,
    fontWeight: '600',
    fontFamily: 'Montserrat_600SemiBold',
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  modalCard: {
    backgroundColor: '#ffffff',
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 24,
    elevation: 8,
  },
  modalCardMobile: {
    width: '100%',
    maxWidth: 480,
    borderRadius: 20,
    padding: 20,
  },
  modalCardTablet: {
    width: '85%',
    maxWidth: 620,
    borderRadius: 24,
    padding: 26,
  },
  modalHeader: {
    marginBottom: 16,
  },
  modalBadgeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  adminBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ecfdf5',
    borderWidth: 1,
    borderColor: '#a7f3d0',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  adminBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#00A651',
    fontFamily: 'Montserrat_700Bold',
  },
  modalCloseBtn: {
    padding: 6,
    borderRadius: 20,
    backgroundColor: '#f1f5f9',
  },
  modalMainTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0f172a',
    marginBottom: 4,
    fontFamily: 'Montserrat_700Bold',
  },
  modalMainSubtitle: {
    fontSize: 12.5,
    color: '#64748b',
    lineHeight: 18,
    fontFamily: 'Montserrat_400Regular',
  },
  redirectingBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f0fdf4',
    borderWidth: 1,
    borderColor: '#a7f3d0',
    padding: 10,
    borderRadius: 10,
    marginBottom: 12,
  },
  redirectingText: {
    fontSize: 12.5,
    fontWeight: '600',
    color: '#15803d',
    fontFamily: 'Montserrat_600SemiBold',
  },
  dashboardsList: {
    gap: 10,
    paddingBottom: 8,
  },
  dashCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  dashIconBox: {
    width: 44,
    height: 44,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  dashContent: {
    flex: 1,
    marginRight: 8,
  },
  dashTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 3,
  },
  dashTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0f172a',
    fontFamily: 'Montserrat_700Bold',
    flex: 1,
    marginRight: 6,
  },
  dashBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    borderWidth: 0.5,
  },
  dashBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    fontFamily: 'Montserrat_700Bold',
  },
  dashSubtitle: {
    fontSize: 11.5,
    color: '#64748b',
    lineHeight: 16,
    fontFamily: 'Montserrat_400Regular',
  },
  modalFooter: {
    marginTop: 14,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
    alignItems: 'center',
  },
  cancelSessionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    paddingHorizontal: 12,
  },
  cancelSessionBtnText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748b',
    fontFamily: 'Montserrat_600SemiBold',
  },
});
