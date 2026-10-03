import React, { useEffect, useState } from 'react';
import { View, StyleSheet, ActivityIndicator, TouchableOpacity, Linking } from 'react-native';
import { Text } from '../../../components/Text';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { WebView } from 'react-native-webview';
import { useGenerateDailyRoom, useStartSession } from '../../../hooks/useProfessionalApi';
import { professionalService } from '../../../services/professionals';
import { useCameraPermissions, useMicrophonePermissions } from 'expo-camera';
import { Camera, Mic, ArrowLeft, ExternalLink } from 'lucide-react-native';
import { useTheme } from '../../../context/ThemeContext';

export default function VideoRoom() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { colors, isDark } = useTheme();
  
  const [roomUrl, setRoomUrl] = useState<string | null>(null);
  const [cameraPermission, requestCameraPermission] = useCameraPermissions();
  const [micPermission, requestMicPermission] = useMicrophonePermissions();
  
  const generateRoom = useGenerateDailyRoom();
  const startSession = useStartSession();

  const bgColor = isDark ? '#0f172a' : '#000000'; // Usually black for video rooms

  // Initialize room only when permissions are granted
  useEffect(() => {
    if (cameraPermission?.granted && micPermission?.granted) {
      initRoom();
    }
  }, [cameraPermission, micPermission]);

  const initRoom = async () => {
    if (roomUrl) return; // Prevent double init
    try {
      // 1. Tell backend session has started (non-blocking)
      await startSession.mutateAsync(id).catch((err) => {
        console.warn('startSession non-blocking warning:', err?.message);
      });

      // 2. Request Room URL from Backend
      let resolvedUrl: string | null = null;
      try {
        const response: any = await generateRoom.mutateAsync(id);
        const item = response?.item || response;
        resolvedUrl =
          item?.meetLink ||
          item?.meetingLink ||
          item?.externalMeetingLink ||
          item?.url ||
          response?.url ||
          null;
      } catch (genErr: any) {
        console.warn('generateRoom caught, checking for existing room:', genErr?.message);
        const errItem = genErr?.response?.data?.item;
        resolvedUrl =
          errItem?.meetLink ||
          errItem?.meetingLink ||
          errItem?.externalMeetingLink ||
          errItem?.url ||
          null;
      }

      // 3. If still not resolved, query appointment details
      if (!resolvedUrl) {
        try {
          const appts = await professionalService.listAppointmentsRange({
            from: new Date().toISOString().slice(0, 10),
            to: new Date(Date.now() + 86400000 * 30).toISOString().slice(0, 10),
            limit: 50,
          });
          const match = appts?.items?.find((a: any) => String(a.id) === String(id));
          if (match?.meetLink) {
            resolvedUrl = match.meetLink;
          }
        } catch (findErr) {
          console.warn('Appointments lookup failed:', findErr);
        }
      }

      if (resolvedUrl) {
        setRoomUrl(resolvedUrl);
      } else {
        setRoomUrl('https://tila.daily.co/test-room');
      }
    } catch (error) {
      console.warn('API Error, using fallback Daily URL', error);
      setRoomUrl('https://tila.daily.co/test-room');
    }
  };

  const requestAllPermissions = async () => {
    if (!cameraPermission?.granted) {
      await requestCameraPermission();
    }
    if (!micPermission?.granted) {
      await requestMicPermission();
    }
  };

  // 1. Checking permissions state
  if (!cameraPermission || !micPermission) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: bgColor }]}>
        <Stack.Screen options={{ headerShown: false }} />
        <ActivityIndicator size="large" color="#00A651" />
      </View>
    );
  }

  // 2. Permissions not granted yet
  if (!cameraPermission.granted || !micPermission.granted) {
    return (
      <View style={[styles.permissionContainer, { backgroundColor: colors.bgSecondary }]}>
        <Stack.Screen options={{ headerShown: false }} />
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <ArrowLeft size={24} color={colors.text} />
        </TouchableOpacity>
        
        <View style={styles.permissionContent}>
          <View style={styles.iconRow}>
            <Camera size={48} color={colors.text} style={{ marginRight: 16 }} />
            <Mic size={48} color={colors.text} />
          </View>
          <Text style={[styles.permissionTitle, { color: colors.text }]}>Autorisations requises</Text>
          <Text style={[styles.permissionText, { color: colors.textSecondary }]}>
            Pour rejoindre la téléconsultation, l'application a besoin d'accéder à votre caméra et à votre microphone.
          </Text>
          <TouchableOpacity style={styles.primaryButton} onPress={requestAllPermissions}>
            <Text style={styles.primaryButtonText}>Autoriser l'accès</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  // 3. Waiting for Room URL
  if (!roomUrl) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: bgColor }]}>
        <Stack.Screen options={{ headerShown: false }} />
        <ActivityIndicator size="large" color="#00A651" />
        <Text style={styles.loadingText}>Initialisation de la salle...</Text>
      </View>
    );
  }

  // 4. Room Ready
  return (
    <View style={styles.container}>
      <Stack.Screen options={{ headerShown: false }} />
      <View style={styles.roomHeader}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.roomHeaderBtn}
          activeOpacity={0.7}
        >
          <ArrowLeft size={20} color="#ffffff" />
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => roomUrl && Linking.openURL(roomUrl)}
          style={styles.openExternalBtn}
          activeOpacity={0.8}
        >
          <ExternalLink size={14} color="#ffffff" style={{ marginRight: 6 }} />
          <Text style={styles.openExternalText}>Ouvrir dans le navigateur</Text>
        </TouchableOpacity>
      </View>
      <WebView
        source={{ uri: roomUrl }}
        style={styles.webview}
        allowsInlineMediaPlayback={true}
        mediaCapturePermissionGrantType="grant"
        javaScriptEnabled={true}
        domStorageEnabled={true}
        userAgent="Mozilla/5.0 (Linux; Android 10; Mobile) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Mobile Safari/537.36"
        onPermissionRequest={(event: any) => {
          event.grant();
        }}
        onNavigationStateChange={(navState) => {
          if (navState.url && navState.url.includes('/leave')) {
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
  roomHeader: {
    position: 'absolute',
    top: 50,
    left: 16,
    right: 16,
    zIndex: 50,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  roomHeaderBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  openExternalBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 166, 81, 0.9)',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
  },
  openExternalText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '600',
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    color: '#ffffff',
    marginTop: 16,
    fontSize: 16,
  },
  webview: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  permissionContainer: {
    flex: 1,
    backgroundColor: '#ffffff',
    padding: 24,
  },
  backButton: {
    position: 'absolute',
    top: 60,
    left: 24,
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
    marginBottom: 32,
  },
  permissionTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#0f172a',
    marginBottom: 16,
    textAlign: 'center',
  },
  permissionText: {
    fontSize: 16,
    color: '#64748b',
    textAlign: 'center',
    marginBottom: 32,
    lineHeight: 24,
    paddingHorizontal: 20,
  },
  primaryButton: {
    backgroundColor: '#00A651',
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 12,
    width: '100%',
    alignItems: 'center',
  },
  primaryButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: 'bold',
  },
});
