import React, { useEffect, useState } from 'react';
import { View, StyleSheet, TouchableOpacity, Alert, Image, ActivityIndicator } from 'react-native';
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
  RefreshCw, 
  Sun, 
  Moon, 
  Monitor,
} from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { syncService, SyncStatus } from '../../services/syncService';
import { useTheme } from '../../context/ThemeContext';

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
    return 'MindWell Connect';
  };

  const handleLogout = () => {
    Alert.alert(
      "Déconnexion",
      "Êtes-vous sûr de vouloir vous déconnecter ?",
      [
        { text: "Annuler", style: "cancel" },
        { 
          text: "Se déconnecter", 
          style: "destructive",
          onPress: async () => {
            try {
              await tokenService.clearTokens();
              router.replace('/(auth)/login');
            } catch (err) {
              console.error('Logout error:', err);
              router.replace('/(auth)/login');
            }
          }
        }
      ]
    );
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
          <DrawerItemList {...props} />
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

        {/* Logos officiels partenaires libres (sans bloc, sans texte) */}
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

        <TouchableOpacity 
          style={[styles.logoutButton, { backgroundColor: isDark ? '#3f1212' : '#fef2f2' }]}
          onPress={handleLogout}
          activeOpacity={0.7}
        >
          <LogOut size={18} color="#ef4444" style={{ marginRight: 10 }} />
          <Text style={styles.logoutText}>Se déconnecter</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
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
});
