import React, { useEffect, useState } from 'react';
import {
  View,
  StyleSheet,
  TouchableOpacity,
  Alert,
  Image,
  ActivityIndicator,
  Modal,
  Pressable,
  LayoutAnimation,
  Platform,
  UIManager,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { 
  DrawerContentScrollView, 
  DrawerItemList, 
  DrawerContentComponentProps 
} from 'expo-router/drawer';
import { Text } from '../Text';
import { useRouter } from 'expo-router';
import { useGetContext } from '../../hooks/useProfessionalApi';
import { tokenService } from '../../services/apiClient';
import { 
  User, 
  LogOut, 
  ChevronRight, 
  ChevronDown,
  RefreshCw, 
  Sun, 
  Moon, 
  Monitor,
  Home,
  UserCircle2,
  Route as RouteIcon,
  ClipboardList,
  Stethoscope,
  Video,
  Calendar,
  HeartPulse,
  FileText,
  FileCheck,
  Sparkles,
  BookOpen,
  MessagesSquare,
  LifeBuoy,
  ShieldCheck,
  Users,
  LayoutDashboard,
} from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { syncService, SyncStatus } from '../../services/syncService';
import { useTheme } from '../../context/ThemeContext';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

interface PatientMenuGroup {
  id: string;
  title: string;
  headerIcon: any;
  items: {
    name: string;
    label: string;
    icon: any;
  }[];
}

const PATIENT_GROUPS: PatientMenuGroup[] = [
  {
    id: 'mon-espace',
    title: 'Mon Espace',
    headerIcon: LayoutDashboard,
    items: [
      { name: 'dashboard', label: 'Accueil', icon: Home },
      { name: 'parcours', label: 'Mon parcours', icon: RouteIcon },
      { name: 'evaluations', label: 'Mes évaluations', icon: ClipboardList },
    ],
  },
  {
    id: 'mes-soins',
    title: 'Mes Soins',
    headerIcon: HeartPulse,
    items: [
      { name: 'dossier', label: 'Mes consultations', icon: Stethoscope },
      { name: 'teleconsultation', label: 'Mes téléconsultations', icon: Video },
      { name: 'appointments', label: 'Mes rendez-vous', icon: Calendar },
      { name: 'soins', label: 'Mes soins & santé', icon: HeartPulse },
      { name: 'documents', label: 'Documents', icon: FileText },
      { name: 'prescriptions', label: 'Ordonnances', icon: FileCheck },
    ],
  },
  {
    id: 'bien-etre',
    title: 'Bien-être & Soutien',
    headerIcon: Sparkles,
    items: [
      { name: 'bien-etre', label: 'Mon bien-être', icon: Sparkles },
      { name: 'ressources', label: 'Ressources', icon: BookOpen },
      { name: 'forum', label: 'Forum & Entraide', icon: MessagesSquare },
      { name: 'aide', label: 'Aide & urgence (143)', icon: LifeBuoy },
    ],
  },
  {
    id: 'confidentialite',
    title: 'Confidentialité',
    headerIcon: ShieldCheck,
    items: [
      { name: 'autorisations', label: 'Mes autorisations', icon: ShieldCheck },
      { name: 'famille', label: 'Ma famille', icon: Users },
    ],
  },
];

interface CustomDrawerContentProps extends DrawerContentComponentProps {
  profileRoute: string;
}

export function CustomDrawerContent(props: CustomDrawerContentProps) {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { data: contextData } = useGetContext();
  const { mode, isDark, colors, setThemeMode } = useTheme();

  const [syncStatus, setSyncStatus] = useState<SyncStatus>({
    isOnline: true,
    isSyncing: false,
    queueCount: 0,
    lastSyncSuccess: null,
    lastSyncTime: null,
  });

  useEffect(() => {
    // Initial fetch of sync state
    syncService.getStatus().then(setSyncStatus);

    // Subscribe to ongoing sync mutations & network connectivity
    const unsubscribe = syncService.subscribe((status) => {
      setSyncStatus(status);
    });

    return () => {
      unsubscribe();
    };
  }, []);

  const user = contextData?.user;
  const fullName = user?.firstName && user?.lastName 
    ? `${user.firstName} ${user.lastName}` 
    : user?.name || 'Utilisateur';

  const initials = user?.firstName && user?.lastName 
    ? `${user.firstName[0]}${user.lastName[0]}`.toUpperCase() 
    : user?.name 
      ? user.name.slice(0, 2).toUpperCase() 
      : 'U';

  const getSubtitle = () => {
    if (user?.profession?.name) return user.profession.name;
    if (user?.professionalDefaultCentre?.name) return user.professionalDefaultCentre.name;
    if (user?.roles?.includes('ROLE_COMMUNITY_ACTOR')) return 'Acteur Communautaire';
    if (user?.roles?.includes('ROLE_HEALTH_AGENT')) return 'Agent de Santé';
    if (user?.roles?.includes('ROLE_PROFESSIONAL')) return 'Professionnel de Santé';
    return 'TILA';
  };

  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  // État accordéon pour les menus du profil patient
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({
    'mon-espace': true,
  });

  const currentRouteName = props.state.routes[props.state.index]?.name;

  useEffect(() => {
    if (!currentRouteName) return;
    const activeGroup = PATIENT_GROUPS.find((group) =>
      group.items.some((item) => item.name === currentRouteName)
    );
    if (activeGroup) {
      setExpandedGroups((prev) => ({
        ...prev,
        [activeGroup.id]: true,
      }));
    }
  }, [currentRouteName]);

  const toggleGroup = (groupId: string) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setExpandedGroups((prev) => ({
      ...prev,
      [groupId]: !prev[groupId],
    }));
  };

  const handleLogout = () => {
    setShowLogoutModal(true);
  };

  const handleConfirmLogout = async () => {
    try {
      setIsLoggingOut(true);
      await tokenService.clearTokens();
      await AsyncStorage.removeItem('user');
      setShowLogoutModal(false);
      props.navigation.closeDrawer();
      router.replace('/(auth)/login');
    } catch (err) {
      console.error('Logout error:', err);
      setShowLogoutModal(false);
      router.replace('/(auth)/login');
    } finally {
      setIsLoggingOut(false);
    }
  };

  const handleProfilePress = () => {
    props.navigation.closeDrawer();
    router.push(props.profileRoute as any);
  };

  const handleManualSync = async () => {
    if (!syncStatus.isOnline) {
      Alert.alert(
        "Mode Hors-Ligne",
        "Impossible de synchroniser sans connexion Internet. Les données seront automatiquement envoyées dès le retour du réseau."
      );
      return;
    }

    if (syncStatus.queueCount === 0) {
      Alert.alert("Synchronisation", "Toutes vos données sont déjà à jour !");
      return;
    }

    try {
      const result = await syncService.syncPendingData();
      if (result.syncedCount > 0) {
        Alert.alert("Succès", `${result.syncedCount} élément(s) synchronisé(s) avec succès.`);
      }
    } catch (err) {
      Alert.alert("Erreur", "Une erreur est survenue lors de la synchronisation.");
    }
  };

  const topPadding = Math.max(insets.top, 36) + 16;
  const bottomPadding = Math.max(insets.bottom, 16) + 6;

  return (
    <View style={[styles.container, { backgroundColor: colors.bg }]}>
      <DrawerContentScrollView 
        {...props} 
        contentContainerStyle={[styles.scrollContent, { paddingTop: topPadding }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Profile Header Card */}
        <TouchableOpacity 
          style={[
            styles.profileHeader,
            { backgroundColor: isDark ? colors.card : '#f8fafc', borderColor: colors.border }
          ]}
          onPress={handleProfilePress}
          activeOpacity={0.7}
        >
          <View style={[styles.avatar, { backgroundColor: colors.primaryLight, borderColor: colors.primary }]}>
            {initials ? (
              <Text style={[styles.avatarInitials, { color: colors.primary }]}>{initials}</Text>
            ) : (
              <User size={22} color={colors.primary} />
            )}
          </View>

          <View style={styles.userInfo}>
            <Text style={[styles.userName, { color: colors.text }]} numberOfLines={1}>
              {fullName}
            </Text>
            <Text style={[styles.userSubtitle, { color: colors.textSecondary }]} numberOfLines={1}>
              {getSubtitle()}
            </Text>
          </View>

          <ChevronRight size={18} color={colors.textMuted} />
        </TouchableOpacity>

        {/* Sync & Network Status Badge */}
        <View style={[
          styles.networkStatusCard, 
          { backgroundColor: isDark ? colors.card : '#f8fafc', borderColor: colors.border }
        ]}>
          <View style={styles.networkStatusLeft}>
            <View 
              style={[
                styles.statusDot, 
                { backgroundColor: syncStatus.isOnline ? '#22c55e' : '#ef4444' }
              ]} 
            />
            {syncStatus.isOnline ? (
              <Text style={[styles.networkStatusText, { color: colors.textSecondary }]}>En ligne</Text>
            ) : (
              <Text style={[styles.networkStatusText, { color: '#ef4444' }]}>Hors-ligne</Text>
            )}
          </View>

          <TouchableOpacity
            style={[
              styles.syncButton,
              { backgroundColor: isDark ? colors.cardSecondary : '#ffffff', borderColor: colors.border },
              syncStatus.queueCount > 0 && styles.syncButtonActive
            ]}
            onPress={handleManualSync}
            disabled={syncStatus.isSyncing}
            activeOpacity={0.7}
          >
            {syncStatus.isSyncing ? (
              <ActivityIndicator size="small" color="#00A651" style={{ marginRight: 6 }} />
            ) : (
              <RefreshCw size={14} color={syncStatus.queueCount > 0 ? '#00A651' : colors.textMuted} style={{ marginRight: 6 }} />
            )}
            <Text style={[styles.syncButtonText, { color: colors.textSecondary }, syncStatus.queueCount > 0 && styles.syncButtonTextActive]}>
              {syncStatus.queueCount > 0 ? `Sync (${syncStatus.queueCount})` : 'Sync'}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Divider */}
        <View style={[styles.divider, { backgroundColor: colors.borderSubtle }]} />

        {/* Navigation Items */}
        <View style={styles.drawerItemsContainer}>
          {props.profileRoute?.includes('(patient)') ? (
            <View style={styles.patientGroupsWrapper}>
              {PATIENT_GROUPS.map((group) => {
                const isExpanded = !!expandedGroups[group.id];
                const hasActiveChild = group.items.some((item) => item.name === currentRouteName);
                const GroupHeaderIcon = group.headerIcon;

                return (
                  <View key={group.id} style={styles.patientGroupContainer}>
                    {/* En-tête principal accordéon */}
                    <TouchableOpacity
                      style={[
                        styles.patientAccordionHeader,
                        {
                          backgroundColor: isDark
                            ? hasActiveChild
                              ? 'rgba(0,166,81,0.12)'
                              : '#1e293b'
                            : hasActiveChild
                            ? '#f0fdf4'
                            : '#f8fafc',
                          borderColor: hasActiveChild
                            ? (isDark ? '#00A651' : '#86efac')
                            : (isDark ? '#334155' : '#e2e8f0'),
                        },
                      ]}
                      onPress={() => toggleGroup(group.id)}
                      activeOpacity={0.7}
                    >
                      <View style={styles.patientAccordionHeaderLeft}>
                        <View
                          style={[
                            styles.accordionIconCircle,
                            {
                              backgroundColor: hasActiveChild
                                ? (isDark ? 'rgba(0,166,81,0.25)' : '#dcfce7')
                                : (isDark ? '#334155' : '#e2e8f0'),
                            },
                          ]}
                        >
                          <GroupHeaderIcon
                            size={18}
                            color={hasActiveChild ? '#00A651' : (isDark ? '#cbd5e1' : '#475569')}
                          />
                        </View>
                        <Text
                          style={[
                            styles.patientAccordionTitle,
                            {
                              color: hasActiveChild ? (isDark ? '#4ade80' : '#15803d') : colors.text,
                              fontWeight: hasActiveChild ? '700' : '600',
                              fontFamily: hasActiveChild ? 'Montserrat_700Bold' : 'Montserrat_600SemiBold',
                            },
                          ]}
                        >
                          {group.title}
                        </Text>
                      </View>

                      <View style={styles.patientAccordionHeaderRight}>
                        {hasActiveChild && (
                          <View style={styles.activePillDot} />
                        )}
                        <ChevronDown
                          size={18}
                          color={hasActiveChild ? '#00A651' : colors.textMuted}
                          style={{
                            transform: [{ rotate: isExpanded ? '180deg' : '0deg' }],
                          }}
                        />
                      </View>
                    </TouchableOpacity>

                    {/* Sous-menus déroulants */}
                    {isExpanded && (
                      <View style={[styles.patientSubItemsContainer, { borderLeftColor: isDark ? 'rgba(0,166,81,0.3)' : '#bbf7d0' }]}>
                        {group.items.map((item) => {
                          const isActive = currentRouteName === item.name;
                          const ItemIcon = item.icon;

                          return (
                            <TouchableOpacity
                              key={item.name}
                              style={[
                                styles.patientSubItem,
                                isActive && [
                                  styles.patientSubItemActive,
                                  {
                                    backgroundColor: isDark
                                      ? 'rgba(0,166,81,0.18)'
                                      : '#ecfdf5',
                                  },
                                ],
                              ]}
                              onPress={() => {
                                props.navigation.navigate(item.name);
                                props.navigation.closeDrawer();
                              }}
                              activeOpacity={0.7}
                            >
                              <View style={styles.patientSubItemLeft}>
                                <View
                                  style={[
                                    styles.subItemBranchDot,
                                    {
                                      backgroundColor: isActive
                                        ? '#00A651'
                                        : (isDark ? '#64748b' : '#94a3b8'),
                                    },
                                  ]}
                                />
                                <ItemIcon
                                  size={16}
                                  color={isActive ? '#00A651' : colors.textSecondary}
                                  style={{ marginRight: 10 }}
                                />
                                <Text
                                  style={[
                                    styles.patientSubItemText,
                                    {
                                      color: isActive ? '#00A651' : colors.text,
                                      fontWeight: isActive ? '700' : '500',
                                      fontFamily: isActive ? 'Montserrat_700Bold' : 'Montserrat_500Medium',
                                    },
                                  ]}
                                >
                                  {item.label}
                                </Text>
                              </View>

                              {isActive && (
                                <View style={styles.activeSubItemIndicator} />
                              )}
                            </TouchableOpacity>
                          );
                        })}
                      </View>
                    )}
                  </View>
                );
              })}
            </View>
          ) : (
            <DrawerItemList {...props} />
          )}
        </View>
      </DrawerContentScrollView>

      {/* Footer Area: Theme Switcher + Logos + Logout */}
      <View style={[
        styles.footer, 
        { paddingBottom: bottomPadding, backgroundColor: colors.bg, borderTopColor: colors.borderSubtle }
      ]}>
        
        {/* Sélecteur de Thème UX/UI Pro : Système / Clair / Sombre */}
        <View style={[
          styles.themeBar, 
          { backgroundColor: isDark ? colors.card : '#f1f5f9', borderColor: colors.border }
        ]}>
          <TouchableOpacity
            style={[
              styles.themeOption,
              mode === 'system' && [styles.themeOptionActive, { backgroundColor: isDark ? '#334155' : '#ffffff' }],
            ]}
            onPress={() => setThemeMode('system')}
            activeOpacity={0.7}
          >
            <Monitor size={15} color={mode === 'system' ? '#2563eb' : colors.textMuted} />
            <Text style={[
              styles.themeOptionText, 
              { color: mode === 'system' ? (isDark ? '#ffffff' : '#0f172a') : colors.textMuted }
            ]}>
              Système
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.themeOption,
              mode === 'light' && [styles.themeOptionActive, { backgroundColor: isDark ? '#334155' : '#ffffff' }],
            ]}
            onPress={() => setThemeMode('light')}
            activeOpacity={0.7}
          >
            <Sun size={15} color={mode === 'light' ? '#F58220' : colors.textMuted} />
            <Text style={[
              styles.themeOptionText, 
              { color: mode === 'light' ? (isDark ? '#ffffff' : '#0f172a') : colors.textMuted }
            ]}>
              Clair
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.themeOption,
              mode === 'dark' && [styles.themeOptionActive, { backgroundColor: isDark ? '#334155' : '#ffffff' }],
            ]}
            onPress={() => setThemeMode('dark')}
            activeOpacity={0.7}
          >
            <Moon size={15} color={mode === 'dark' ? '#00A651' : colors.textMuted} />
            <Text style={[
              styles.themeOptionText, 
              { color: mode === 'dark' ? (isDark ? '#ffffff' : '#0f172a') : colors.textMuted }
            ]}>
              Sombre
            </Text>
          </TouchableOpacity>
        </View>

        {/* Logos officiels partenaires libres */}
        <View style={styles.logosRow}>
          <Image 
            source={require('../../../assets/images/ministere.jpg')} 
            style={styles.partnerLogo}
            resizeMode="contain"
          />
          <Image 
            source={require('../../../assets/images/logo.png')} 
            style={styles.partnerLogoTila}
            resizeMode="contain"
          />
          <Image 
            source={require('../../../assets/images/pnsm.png')} 
            style={styles.partnerLogo}
            resizeMode="contain"
          />
        </View>

        {/* Mention Avec l'appui de : et logos partenaires techniques */}
        <View style={styles.drawerSupportSection}>
          <Text style={[styles.drawerSupportText, { color: colors.textSecondary }]}>Avec l'appui de :</Text>
          <View style={styles.drawerSupportLogosRow}>
            <Image 
              source={require('../../../assets/images/ue.jpeg')} 
              style={styles.drawerUeLogo}
              resizeMode="contain"
            />
            <Image 
              source={require('../../../assets/images/expertise_france.jpeg')} 
              style={styles.drawerExpertiseLogo}
              resizeMode="contain"
            />
          </View>
        </View>

        <TouchableOpacity 
          style={[styles.logoutButton, { backgroundColor: isDark ? '#3f1212' : '#fef2f2' }]}
          onPress={handleLogout}
          activeOpacity={0.7}
        >
          <LogOut size={18} color="#ef4444" style={{ marginRight: 10 }} />
          <Text style={styles.logoutText}>Se déconnecter</Text>
        </TouchableOpacity>
      </View>

      {/* Pop-up UX/UI Pro Élégant de Confirmation de Déconnexion */}
      <Modal
        visible={showLogoutModal}
        transparent={true}
        animationType="fade"
        statusBarTranslucent={true}
        onRequestClose={() => !isLoggingOut && setShowLogoutModal(false)}
      >
        <View style={styles.modalOverlay}>
          <Pressable 
            style={styles.modalBackdrop} 
            onPress={() => !isLoggingOut && setShowLogoutModal(false)} 
          />
          <View style={[
            styles.modalCard,
            { backgroundColor: isDark ? '#1e293b' : '#ffffff', borderColor: isDark ? '#334155' : '#e2e8f0' }
          ]}>
            {/* Badge circulaire rouge déconnexion */}
            <View style={[
              styles.modalIconCircle,
              { backgroundColor: isDark ? 'rgba(239, 68, 68, 0.15)' : '#fee2e2' }
            ]}>
              <LogOut size={28} color="#ef4444" />
            </View>

            <Text style={[styles.modalTitle, { color: isDark ? '#f8fafc' : '#0f172a' }]}>
              Confirmer la déconnexion
            </Text>

            <Text style={[styles.modalSubtitle, { color: isDark ? '#94a3b8' : '#64748b' }]}>
              Êtes-vous sûr de vouloir vous déconnecter de TILA ? Vos données synchronisées resteront enregistrées en toute sécurité sur votre compte.
            </Text>

            {/* Boutons d'action modernes */}
            <View style={styles.modalActionsRow}>
              <TouchableOpacity
                style={[
                  styles.modalCancelBtn,
                  { backgroundColor: isDark ? '#334155' : '#f1f5f9' }
                ]}
                onPress={() => setShowLogoutModal(false)}
                disabled={isLoggingOut}
                activeOpacity={0.7}
              >
                <Text style={[styles.modalCancelText, { color: isDark ? '#cbd5e1' : '#475569' }]}>
                  Annuler
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.modalConfirmBtn}
                onPress={handleConfirmLogout}
                disabled={isLoggingOut}
                activeOpacity={0.8}
              >
                {isLoggingOut ? (
                  <ActivityIndicator size="small" color="#ffffff" />
                ) : (
                  <>
                    <LogOut size={16} color="#ffffff" style={{ marginRight: 6 }} />
                    <Text style={styles.modalConfirmText}>Se déconnecter</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  scrollContent: {
    paddingTop: 0,
    paddingBottom: 20,
  },
  profileHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginHorizontal: 12,
    borderRadius: 14,
    borderWidth: 1,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  avatarInitials: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  userInfo: {
    flex: 1,
    marginRight: 4,
  },
  userName: {
    fontSize: 15,
    fontWeight: 'bold',
    marginBottom: 2,
  },
  userSubtitle: {
    fontSize: 12,
    fontWeight: '500',
  },
  networkStatusCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginHorizontal: 12,
    marginTop: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
  },
  networkStatusLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 6,
  },
  networkStatusText: {
    fontSize: 12,
    fontWeight: '600',
  },
  syncButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
  },
  syncButtonActive: {
    borderColor: '#86efac',
    backgroundColor: '#f0fdf4',
  },
  syncButtonText: {
    fontSize: 11,
    fontWeight: '600',
  },
  syncButtonTextActive: {
    color: '#00A651',
  },
  divider: {
    height: 1,
    marginVertical: 10,
    marginHorizontal: 16,
  },
  drawerItemsContainer: {
    flex: 1,
  },
  footer: {
    paddingHorizontal: 14,
    paddingTop: 12,
    borderTopWidth: 1,
  },
  themeBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 3,
    borderRadius: 10,
    borderWidth: 1,
    marginBottom: 12,
  },
  themeOption: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 6,
    borderRadius: 8,
    gap: 4,
  },
  themeOptionActive: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  themeOptionText: {
    fontSize: 12,
    fontWeight: '600',
    fontFamily: 'Montserrat_600SemiBold',
  },
  logosRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    width: '100%',
    paddingVertical: 6,
    marginBottom: 10,
  },
  partnerLogo: {
    height: 34,
    width: 62,
  },
  partnerLogoTila: {
    height: 30,
    width: 58,
  },
  drawerSupportSection: {
    alignItems: 'center',
    width: '100%',
    marginBottom: 8,
  },
  drawerSupportText: {
    fontSize: 10,
    fontFamily: 'Montserrat_500Medium',
    marginBottom: 4,
    letterSpacing: 0.3,
  },
  drawerSupportLogosRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 14,
  },
  drawerExpertiseLogo: {
    height: 24,
    width: 72,
  },
  drawerUeLogo: {
    height: 28,
    width: 48,
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
  },
  logoutText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#ef4444',
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  modalBackdrop: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
  },
  modalCard: {
    width: '100%',
    maxWidth: 340,
    borderRadius: 22,
    borderWidth: 1,
    paddingVertical: 24,
    paddingHorizontal: 20,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.35,
    shadowRadius: 16,
    elevation: 10,
  },
  modalIconCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    fontFamily: 'Montserrat_700Bold',
    textAlign: 'center',
    marginBottom: 8,
  },
  modalSubtitle: {
    fontSize: 13.5,
    lineHeight: 20,
    textAlign: 'center',
    fontFamily: 'Montserrat_400Regular',
    marginBottom: 22,
  },
  modalActionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
    gap: 12,
  },
  modalCancelBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalCancelText: {
    fontSize: 14.5,
    fontWeight: '600',
    fontFamily: 'Montserrat_600SemiBold',
  },
  modalConfirmBtn: {
    flex: 1,
    flexDirection: 'row',
    backgroundColor: '#dc2626',
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#dc2626',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3,
  },
  modalConfirmText: {
    color: '#ffffff',
    fontSize: 14.5,
    fontWeight: '700',
    fontFamily: 'Montserrat_700Bold',
  },
  patientGroupsWrapper: {
    paddingHorizontal: 10,
    gap: 8,
  },
  patientGroupContainer: {
    marginBottom: 4,
  },
  patientAccordionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 9,
    paddingHorizontal: 12,
    borderRadius: 12,
    borderWidth: 1,
  },
  patientAccordionHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  accordionIconCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  patientAccordionTitle: {
    fontSize: 14,
    letterSpacing: 0.2,
  },
  patientAccordionHeaderRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  activePillDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
    backgroundColor: '#00A651',
  },
  patientSubItemsContainer: {
    marginTop: 4,
    marginLeft: 16,
    paddingLeft: 10,
    borderLeftWidth: 2,
    paddingVertical: 2,
    gap: 2,
  },
  patientSubItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: 10,
  },
  patientSubItemActive: {
    backgroundColor: '#ecfdf5',
  },
  patientSubItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  subItemBranchDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    marginRight: 10,
  },
  patientSubItemText: {
    fontSize: 13,
  },
  activeSubItemIndicator: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#00A651',
  },
});
