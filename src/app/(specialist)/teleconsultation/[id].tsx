import React, { useEffect, useState } from 'react';
import { 
  View, 
  StyleSheet, 
  ActivityIndicator, 
  TouchableOpacity, 
  Alert,
  StatusBar
} from 'react-native';
import { Text } from '../../../components/Text';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { WebView } from 'react-native-webview';
import { useGenerateDailyRoom, useStartSession } from '../../../hooks/useProfessionalApi';
import { professionalService } from '../../../services/professionals';
import { apiClient } from '../../../services/apiClient';
import { useCameraPermissions, useMicrophonePermissions } from 'expo-camera';
import { Camera, Mic, ArrowLeft, PhoneOff, Shield, RefreshCw } from 'lucide-react-native';
import { useTheme } from '../../../context/ThemeContext';

/**
 * Extrait l'URL de salle Daily.co directe pour éviter toute redirection
 * ou affichage de l'interface web (app.tila.ci) nécessitant une authentification navigateur.
 */
function extractDailyRoomUrl(data: any): string | null {
  if (!data) return null;

  // 1. Si externalMeetingLink contient déjà daily.co
  if (typeof data.externalMeetingLink === 'string' && data.externalMeetingLink.includes('daily.co')) {
    return data.externalMeetingLink;
  }

  // 2. Si meeting.link existe (ex: renvoyé par /api/appointments/{id}/meeting)
  if (data.meeting?.link && typeof data.meeting.link === 'string' && data.meeting.link.includes('daily.co')) {
    return data.meeting.link;
  }
  if (data.meetingInfo?.meetLink && typeof data.meetingInfo.meetLink === 'string' && data.meetingInfo.meetLink.includes('daily.co')) {
    return data.meetingInfo.meetLink;
  }

  // 3. Si meetLink ou meetingLink contient directement daily.co
  if (typeof data.meetLink === 'string' && data.meetLink.includes('daily.co')) {
    return data.meetLink;
  }
  if (typeof data.meetingLink === 'string' && data.meetingLink.includes('daily.co')) {
    return data.meetingLink;
  }

  // 4. Si un meetingId est présent
  const meetingId = data.meetingId || data.meeting_id || data.meeting?.meetingId;
  if (meetingId && typeof meetingId === 'string' && meetingId.trim()) {
    return `https://tila.daily.co/${meetingId.trim()}`;
  }

  // 5. Si l'URL est sous la forme https://app.tila.ci/teleconsultation/{roomCode}
  const urlsToCheck = [data.meetLink, data.meetingLink, data.externalMeetingLink, data.url];
  for (const u of urlsToCheck) {
    if (typeof u === 'string') {
      const match = u.match(/\/teleconsultation\/([a-zA-Z0-9_-]+)/);
      if (match && match[1]) {
        return `https://tila.daily.co/${match[1]}`;
      }
    }
  }

  // 6. Si externalMeetingLink est défini et ne cible pas le web
  if (typeof data.externalMeetingLink === 'string' && !data.externalMeetingLink.includes('tila.ci/teleconsultation')) {
    return data.externalMeetingLink;
  }

  return null;
}

export default function VideoRoom() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { colors, isDark } = useTheme();
  
  const [roomUrl, setRoomUrl] = useState<string | null>(null);
  const [isResolving, setIsResolving] = useState<boolean>(true);
  const [cameraPermission, requestCameraPermission] = useCameraPermissions();
  const [micPermission, requestMicPermission] = useMicrophonePermissions();
  
  const generateRoom = useGenerateDailyRoom();
  const startSession = useStartSession();

  // Initialisation dès que les autorisations sont accordées
  useEffect(() => {
    if (cameraPermission?.granted && micPermission?.granted) {
      initRoom();
    }
  }, [cameraPermission, micPermission]);

  const initRoom = async () => {
    if (roomUrl) return;
    setIsResolving(true);

    try {
      // 1. Notifier le backend que la session commence (non-bloquant)
      await startSession.mutateAsync(id).catch((err) => {
        console.warn('startSession non-bloquant:', err?.message);
      });

      let resolvedUrl: string | null = null;

      // 2. Tenter de récupérer les informations de réunion via l'endpoint dédié
      try {
        const meetingRes: any = await apiClient.get(`/api/appointments/${id}/meeting`);
        resolvedUrl = extractDailyRoomUrl(meetingRes);
      } catch (meetErr) {
        console.warn('Info réunion directe non disponible, tentative génération:', meetErr);
      }

      // 3. Si non trouvé, appeler la génération de salle
      if (!resolvedUrl) {
        try {
          const genRes: any = await generateRoom.mutateAsync(id);
          const item = genRes?.item || genRes;
          resolvedUrl = extractDailyRoomUrl(item);
        } catch (genErr: any) {
          const errItem = genErr?.response?.data?.item;
          resolvedUrl = extractDailyRoomUrl(errItem);
        }
      }

      // 4. Si toujours non résolu, vérifier dans la liste des RDV du praticien
      if (!resolvedUrl) {
        try {
          const appts = await professionalService.listAppointmentsRange({
            from: new Date(Date.now() - 86400000 * 2).toISOString().slice(0, 10),
            to: new Date(Date.now() + 86400000 * 30).toISOString().slice(0, 10),
            limit: 50,
          });
          const match = appts?.items?.find((a: any) => String(a.id) === String(id));
          if (match) {
            resolvedUrl = extractDailyRoomUrl(match);
          }
        } catch (findErr) {
          console.warn('Recherche RDV échouée:', findErr);
        }
      }

      // 5. Fallback sécurisé : salle Daily basée sur l'identifiant du RDV
      if (resolvedUrl) {
        setRoomUrl(resolvedUrl);
      } else {
        setRoomUrl(`https://tila.daily.co/tila-rdv-${id}`);
      }
    } catch (error) {
      console.warn('Erreur résolution salle vidéo, fallback utilisé:', error);
      setRoomUrl(`https://tila.daily.co/tila-rdv-${id}`);
    } finally {
      setIsResolving(false);
    }
  };

  const handleLeaveCall = () => {
    Alert.alert(
      'Quitter la consultation',
      'Souhaitez-vous vraiment mettre fin à la téléconsultation ?',
      [
        { text: 'Rester', style: 'cancel' },
        { 
          text: 'Quitter', 
          style: 'destructive', 
          onPress: () => router.back() 
        }
      ]
    );
  };

  const requestAllPermissions = async () => {
    if (!cameraPermission?.granted) {
      await requestCameraPermission();
    }
    if (!micPermission?.granted) {
      await requestMicPermission();
    }
  };

  // 1. En attente de l'état des permissions
  if (!cameraPermission || !micPermission) {
    return (
      <View style={styles.centerContainer}>
        <StatusBar barStyle="light-content" backgroundColor="#000000" />
        <Stack.Screen options={{ headerShown: false }} />
        <ActivityIndicator size="large" color="#00A651" />
      </View>
    );
  }

  // 2. Permissions non accordées
  if (!cameraPermission.granted || !micPermission.granted) {
    return (
      <View style={[styles.permissionContainer, { backgroundColor: colors.bgSecondary }]}>
        <StatusBar barStyle={isDark ? "light-content" : "dark-content"} />
        <Stack.Screen options={{ headerShown: false }} />
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <ArrowLeft size={24} color={colors.text} />
        </TouchableOpacity>
        
        <View style={styles.permissionContent}>
          <View style={styles.iconRow}>
            <View style={[styles.iconCircle, { backgroundColor: isDark ? '#1e293b' : '#eff6ff' }]}>
              <Camera size={36} color="#00A651" />
            </View>
            <View style={[styles.iconCircle, { backgroundColor: isDark ? '#1e293b' : '#eff6ff' }]}>
              <Mic size={36} color="#00A651" />
            </View>
          </View>
          <Text style={[styles.permissionTitle, { color: colors.text }]}>Autorisations requises</Text>
          <Text style={[styles.permissionText, { color: colors.textSecondary }]}>
            Pour participer à la téléconsultation directement dans l'application, l'accès à la caméra et au microphone est nécessaire.
          </Text>
          <TouchableOpacity style={styles.primaryButton} onPress={requestAllPermissions}>
            <Text style={styles.primaryButtonText}>Autoriser la caméra & le micro</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  // 3. En attente de la résolution de la salle
  if (isResolving || !roomUrl) {
    return (
      <View style={styles.centerContainer}>
        <StatusBar barStyle="light-content" backgroundColor="#000000" />
        <Stack.Screen options={{ headerShown: false }} />
        <ActivityIndicator size="large" color="#00A651" />
        <Text style={styles.loadingText}>Connexion à la salle sécurisée...</Text>
      </View>
    );
  }

  // 4. Consultation vidéo en direct (100% In-App)
  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#000000" />
      <Stack.Screen options={{ headerShown: false }} />

      {/* Barre de contrôle supérieure native */}
      <View style={styles.topBar}>
        <TouchableOpacity
          onPress={handleLeaveCall}
          style={styles.circleBtn}
          activeOpacity={0.7}
        >
          <ArrowLeft size={20} color="#ffffff" />
        </TouchableOpacity>

        <View style={styles.badgeContainer}>
          <View style={styles.onlineDot} />
          <Shield size={14} color="#00A651" style={{ marginRight: 5 }} />
          <Text style={styles.badgeText}>Téléconsultation Sécurisée</Text>
        </View>

        <TouchableOpacity
          onPress={handleLeaveCall}
          style={styles.hangupBtn}
          activeOpacity={0.8}
        >
          <PhoneOff size={18} color="#ffffff" />
        </TouchableOpacity>
      </View>

      {/* WebView Daily.co intégrée */}
      <WebView
        source={{ uri: roomUrl }}
        style={styles.webview}
        allowsInlineMediaPlayback={true}
        mediaPlaybackRequiresUserAction={false}
        mediaCapturePermissionGrantType="grant"
        javaScriptEnabled={true}
        domStorageEnabled={true}
        cacheEnabled={true}
        originWhitelist={['*']}
        userAgent="Mozilla/5.0 (Linux; Android 10; Mobile) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Mobile Safari/537.36"
        onPermissionRequest={(event: any) => {
          event.grant();
        }}
        onNavigationStateChange={(navState) => {
          if (navState.url && (navState.url.includes('/leave') || navState.url.includes('/logout'))) {
            router.back();
          }
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
  },
  centerContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#000000',
    padding: 24,
  },
  loadingText: {
    color: '#ffffff',
    marginTop: 16,
    fontSize: 15,
    fontFamily: 'Montserrat_500Medium',
  },
  topBar: {
    position: 'absolute',
    top: 50,
    left: 16,
    right: 16,
    zIndex: 50,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  circleBtn: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
  },
  badgeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(0, 166, 81, 0.4)',
  },
  onlineDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: '#00A651',
    marginRight: 6,
  },
  badgeText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '700',
    fontFamily: 'Montserrat_700Bold',
  },
  hangupBtn: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: '#ef4444',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#ef4444',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.4,
    shadowRadius: 4,
    elevation: 4,
  },
  webview: {
    flex: 1,
    backgroundColor: '#000000',
  },
  permissionContainer: {
    flex: 1,
    padding: 24,
  },
  backButton: {
    position: 'absolute',
    top: 56,
    left: 20,
    zIndex: 10,
    padding: 8,
  },
  permissionContent: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconRow: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 28,
  },
  iconCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  permissionTitle: {
    fontSize: 22,
    fontWeight: '700',
    fontFamily: 'Montserrat_700Bold',
    marginBottom: 12,
    textAlign: 'center',
  },
  permissionText: {
    fontSize: 15,
    textAlign: 'center',
    marginBottom: 32,
    lineHeight: 22,
    paddingHorizontal: 16,
    fontFamily: 'Montserrat_400Regular',
  },
  primaryButton: {
    backgroundColor: '#00A651',
    paddingVertical: 15,
    paddingHorizontal: 28,
    borderRadius: 12,
    width: '100%',
    alignItems: 'center',
  },
  primaryButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '700',
    fontFamily: 'Montserrat_700Bold',
  },
});
