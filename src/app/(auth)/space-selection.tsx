import React, { useEffect, useState } from 'react';
import {
  View,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  ScrollView,
  useWindowDimensions,
} from 'react-native';
import { Text } from '../../components/Text';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { apiClient, tokenService } from '../../services/apiClient';
import {
  ShieldCheck,
  Stethoscope,
  ClipboardList,
  ArrowRightLeft,
  Heart,
  ChevronRight,
  Sparkles,
  Building2,
  Users,
} from 'lucide-react-native';
import { DashboardOption } from './login';
import { useTheme } from '../../context/ThemeContext';

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

export default function SpaceSelectionScreen() {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const isTablet = width >= 768;
  const { colors, isDark } = useTheme();

  const [dashboards, setDashboards] = useState<DashboardOption[]>([]);
  const [userName, setUserName] = useState('Utilisateur');
  const [isAdmin, setIsAdmin] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isRedirecting, setIsRedirecting] = useState(false);

  useEffect(() => {
    const fetchContext = async () => {
      try {
        const data = await apiClient.get('/api/me/context');
        const userContext = data.user;
        const name = [userContext?.firstName, userContext?.lastName].filter(Boolean).join(' ');
        if (name) setUserName(name);

        const adminCheck = userContext?.roles?.some(
          (r: string) => r === 'ROLE_ADMIN' || r === 'ROLE_SUPER_ADMIN'
        );
        setIsAdmin(adminCheck);

        if (adminCheck) {
          setDashboards(ALL_ADMIN_DASHBOARDS);
        } else if (userContext?.spaces && Array.isArray(userContext.spaces)) {
          const mapped = userContext.spaces.map((space: any) => {
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
          setDashboards(mapped);
        } else {
          router.replace('/(specialist)/dashboard');
        }
      } catch (error) {
        console.error('Failed to fetch spaces:', error);
        router.replace('/(auth)/login');
      } finally {
        setIsLoading(false);
      }
    };
    fetchContext();
  }, []);

  const handleSelectDashboard = async (dash: DashboardOption) => {
    setIsRedirecting(true);
    try {
      await tokenService.setActiveContext(dash.type);
      router.replace(dash.route as any);
    } catch {
      router.replace(dash.route as any);
    } finally {
      setIsRedirecting(false);
    }
  };

  if (isLoading) {
    return (
      <View style={[styles.centered, { backgroundColor: colors.bgSecondary }]}>
        <ActivityIndicator size="large" color="#00A651" />
        <Text style={[styles.loadingText, { color: colors.textSecondary }]}>Chargement de vos espaces de travail...</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.bgSecondary }]}>
      <View style={[styles.innerContent, isTablet && styles.innerContentTablet]}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.badgeRow}>
            <View style={[styles.adminBadge, isDark && { backgroundColor: '#064e3b', borderColor: '#059669' }]}>
              <Sparkles size={13} color="#00A651" style={{ marginRight: 4 }} />
              <Text style={styles.adminBadgeText}>
                {isAdmin ? 'Accès Administrateur Global' : 'Portail Multi-Profils'}
              </Text>
            </View>
          </View>
          <Text style={[styles.title, { color: colors.text }]}>Sélectionnez votre Dashboard</Text>
          <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
            Bonjour <Text style={{ fontWeight: '700', color: colors.text }}>{userName}</Text>,
            choisissez le tableau de bord à ouvrir pour cette session :
          </Text>
        </View>

        {/* Liste des Dashboards */}
        <ScrollView contentContainerStyle={styles.list} showsVerticalScrollIndicator={false}>
          {dashboards.map((dash) => {
            const IconComponent = dash.icon;

            return (
              <TouchableOpacity
                key={dash.id}
                style={[
                  styles.dashCard,
                  {
                    backgroundColor: colors.card,
                    borderColor: colors.border,
                  },
                ]}
                onPress={() => handleSelectDashboard(dash)}
                disabled={isRedirecting}
                activeOpacity={0.8}
              >
                <View
                  style={[
                    styles.dashIconBox,
                    { backgroundColor: isDark ? colors.cardSecondary : dash.bgLight },
                  ]}
                >
                  <IconComponent size={24} color={dash.color} />
                </View>

                <View style={styles.dashContent}>
                  <View style={styles.dashTitleRow}>
                    <Text style={[styles.dashTitle, { color: colors.text }]}>{dash.title}</Text>
                    <View
                      style={[
                        styles.dashBadge,
                        {
                          backgroundColor: isDark ? colors.cardSecondary : dash.bgLight,
                          borderColor: dash.color,
                        },
                      ]}
                    >
                      <Text style={[styles.dashBadgeText, { color: dash.color }]}>
                        {dash.badge}
                      </Text>
                    </View>
                  </View>
                  <Text style={[styles.dashSubtitle, { color: colors.textSecondary }]} numberOfLines={2}>
                    {dash.subtitle}
                  </Text>
                </View>

                <ChevronRight size={20} color={colors.textSecondary} />
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    padding: 24,
  },
  loadingText: {
    fontSize: 13,
    color: '#64748b',
    marginTop: 10,
    fontFamily: 'Montserrat_500Medium',
  },
  innerContent: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 10,
  },
  innerContentTablet: {
    maxWidth: 640,
    alignSelf: 'center',
    width: '100%',
    paddingTop: 24,
  },
  header: {
    marginBottom: 20,
  },
  badgeRow: {
    flexDirection: 'row',
    marginBottom: 8,
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
  title: {
    fontSize: 22,
    fontWeight: '800',
    color: '#0f172a',
    marginBottom: 6,
    fontFamily: 'Montserrat_700Bold',
  },
  subtitle: {
    fontSize: 13,
    color: '#64748b',
    lineHeight: 18,
    fontFamily: 'Montserrat_400Regular',
  },
  list: {
    gap: 12,
    paddingBottom: 40,
  },
  dashCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },
  dashIconBox: {
    width: 48,
    height: 48,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  dashContent: {
    flex: 1,
    marginRight: 8,
  },
  dashTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  dashTitle: {
    fontSize: 14.5,
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
    fontSize: 12,
    color: '#64748b',
    lineHeight: 16,
    fontFamily: 'Montserrat_400Regular',
  },
});
