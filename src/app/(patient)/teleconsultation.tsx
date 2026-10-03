import React, { useState, useEffect } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Modal,
  StatusBar,
} from 'react-native';
import { Text } from '../../components/Text';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  Video,
  Calendar,
  Clock,
  ShieldCheck,
  Headphones,
  Wifi,
  Sparkles,
  CheckCircle2,
  ExternalLink,
  PhoneCall,
  PhoneOff,
  Shield,
  ArrowLeft,
} from 'lucide-react-native';
import { WebView } from 'react-native-webview';
import { patientService, TeleconsultationItem, AppointmentItem } from '../../services/patient';
import { useTheme } from '../../context/ThemeContext';

function extractDailyRoomUrl(item: any): string | null {
  if (!item) return null;

  if (typeof item.externalMeetingLink === 'string' && item.externalMeetingLink.includes('daily.co')) {
    return item.externalMeetingLink;
  }
  if (typeof item.meetLink === 'string' && item.meetLink.includes('daily.co')) {
    return item.meetLink;
  }
  if (typeof item.meetingLink === 'string' && item.meetingLink.includes('daily.co')) {
    return item.meetingLink;
  }

  const meetingId = item.meetingId || item.meeting_id;
  if (meetingId && typeof meetingId === 'string' && meetingId.trim()) {
    return `https://tila.daily.co/${meetingId.trim()}`;
  }

  const urlsToCheck = [item.meetLink, item.meetingLink, item.url];
  for (const u of urlsToCheck) {
    if (typeof u === 'string') {
      const match = u.match(/\/teleconsultation\/([a-zA-Z0-9_-]+)/);
      if (match && match[1]) {
        return `https://tila.daily.co/${match[1]}`;
      }
    }
  }

  if (item.id) {
    return `https://tila.daily.co/tila-rdv-${item.id}`;
  }

  return null;
}

export default function PatientTeleconsultation() {
  const { colors, isDark } = useTheme();
  const [nextTeleconsultation, setNextTeleconsultation] = useState<TeleconsultationItem | null>(null);
  const [upcomingAppointments, setUpcomingAppointments] = useState<AppointmentItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isInCall, setIsInCall] = useState(false);
  const [callUrl, setCallUrl] = useState<string | null>(null);

  useEffect(() => {
    const loadTeleconsultation = async () => {
      try {
        const [nextRes, upRes] = await Promise.allSettled([
          patientService.nextTeleconsultation(),
          patientService.upcomingAppointments(),
        ]);

        if (nextRes.status === 'fulfilled') setNextTeleconsultation(nextRes.value);
        if (upRes.status === 'fulfilled') {
          const videoAppts = (upRes.value || []).filter(a => a.type !== 'in-person');
          setUpcomingAppointments(videoAppts);
        }
      } catch (e) {
        console.warn('[PatientTeleconsultation] Erreur:', e);
      } finally {
        setIsLoading(false);
      }
    };
    loadTeleconsultation();
  }, []);

  const handleJoinCall = (appointment?: AppointmentItem | null) => {
    if (!appointment && !nextTeleconsultation) {
      Alert.alert(
        'Salle d’attente',
        'Votre praticien n’a pas encore démarré la session. Vous serez notifié dès qu’il sera connecté.'
      );
      return;
    }

    const target = appointment || nextTeleconsultation;
    const directUrl = extractDailyRoomUrl(target);

    if (directUrl) {
      setCallUrl(directUrl);
      setIsInCall(true);
    } else {
      Alert.alert(
        'Salle d’attente',
        'La salle de consultation est en cours de préparation par votre praticien.'
      );
    }
  };

  const handleLeaveCall = () => {
    Alert.alert(
      'Quitter la consultation',
      'Êtes-vous sûr de vouloir quitter la téléconsultation ?',
      [
        { text: 'Rester', style: 'cancel' },
        { 
          text: 'Quitter', 
          style: 'destructive', 
          onPress: () => {
            setIsInCall(false);
            setCallUrl(null);
          } 
        }
      ]
    );
  };

  const activeMeeting = upcomingAppointments.length > 0 ? upcomingAppointments[0] : null;

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.bgSecondary }]} edges={['bottom']}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* 1. Carte Salle de Téléconsultation */}
        <View style={[styles.mainCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={[styles.iconCircle, { backgroundColor: isDark ? 'rgba(37, 99, 235, 0.15)' : '#eff6ff' }]}>
            <Video size={28} color="#2563eb" />
          </View>
          <Text style={[styles.mainTitle, { color: colors.text }]}>Salle de Consultation Virtuelle</Text>
          <Text style={[styles.mainSubtitle, { color: colors.textSecondary }]}>
            Échangez en direct et en toute confidentialité avec votre médecin ou psychologue.
          </Text>

          {activeMeeting ? (
            <View style={[styles.meetingCard, { backgroundColor: colors.cardSecondary, borderColor: isDark ? colors.border : '#bfdbfe' }]}>
              <View style={styles.meetingHeader}>
                <View style={[styles.liveIndicator, { backgroundColor: isDark ? 'rgba(37, 99, 235, 0.2)' : '#eff6ff' }]}>
                  <View style={styles.liveDot} />
                  <Text style={styles.liveText}>Séance programmée</Text>
                </View>
                <Text style={[styles.meetingDate, { color: colors.textSecondary }]}>{activeMeeting.date || "Aujourd'hui"}</Text>
              </View>

              <Text style={[styles.doctorName, { color: colors.text }]}>{activeMeeting.professional || 'Médecin Référent'}</Text>
              <Text style={[styles.doctorSpecialty, { color: colors.textSecondary }]}>{activeMeeting.specialty || 'Santé mentale'}</Text>

              <View style={styles.timeRow}>
                <Clock size={15} color="#2563eb" style={{ marginRight: 6 }} />
                <Text style={[styles.timeText, { color: isDark ? '#60a5fa' : '#2563eb' }]}>Horaire : {activeMeeting.time || '10:00'} (45 min)</Text>
              </View>

              <TouchableOpacity
                style={styles.startBtn}
                onPress={() => handleJoinCall(activeMeeting)}
                activeOpacity={0.85}
              >
                <Video size={18} color="#ffffff" style={{ marginRight: 8 }} />
                <Text style={styles.startBtnText}>Entrer dans la consultation</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.noMeetingBox}>
              <CheckCircle2 size={32} color="#00A651" style={{ marginBottom: 8 }} />
              <Text style={[styles.noMeetingTitle, { color: colors.text }]}>Aucune séance immédiate</Text>
              <Text style={[styles.noMeetingSub, { color: colors.textSecondary }]}>
                Votre prochain créneau de téléconsultation s'affichera ici dès validation par votre praticien.
              </Text>
            </View>
          )}
        </View>

        {/* 2. Conseils pour une consultation réussie */}
        <View style={[styles.sectionCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={styles.sectionHeaderRow}>
            <Sparkles size={18} color="#00A651" />
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Recommandations pour la séance</Text>
          </View>

          <View style={styles.tipItem}>
            <View style={[styles.tipIcon, { backgroundColor: colors.inputBg }]}>
              <Headphones size={18} color="#2563eb" />
            </View>
            <View style={styles.tipContent}>
              <Text style={[styles.tipTitle, { color: colors.text }]}>Lieu calme & écouteurs</Text>
              <Text style={[styles.tipSub, { color: colors.textSecondary }]}>
                Installez-vous dans un endroit discret où vous êtes libre de vous exprimer sereinement.
              </Text>
            </View>
          </View>

          <View style={styles.tipItem}>
            <View style={[styles.tipIcon, { backgroundColor: colors.inputBg }]}>
              <Wifi size={18} color="#00A651" />
            </View>
            <View style={styles.tipContent}>
              <Text style={[styles.tipTitle, { color: colors.text }]}>Connexion Internet stable</Text>
              <Text style={[styles.tipSub, { color: colors.textSecondary }]}>
                Privilégiez une connexion Wi-Fi ou une couverture 4G/5G pour une bonne fluidité audio et vidéo.
              </Text>
            </View>
          </View>

          <View style={styles.tipItem}>
            <View style={[styles.tipIcon, { backgroundColor: colors.inputBg }]}>
              <ShieldCheck size={18} color="#7c3aed" />
            </View>
            <View style={styles.tipContent}>
              <Text style={[styles.tipTitle, { color: colors.text }]}>Confidentialité médicale garantie</Text>
              <Text style={[styles.tipSub, { color: colors.textSecondary }]}>
                Toutes les téléconsultations sont chiffrées de bout en bout et conformes au secret médical.
              </Text>
            </View>
          </View>
        </View>
      </ScrollView>

      {/* Modal Consultation Vidéo Intégrée (100% In-App) */}
      <Modal visible={isInCall} animationType="slide" onRequestClose={handleLeaveCall}>
        <SafeAreaView style={styles.callModalContainer} edges={['top', 'bottom']}>
          <StatusBar barStyle="light-content" backgroundColor="#000000" />
          
          <View style={styles.callTopBar}>
            <TouchableOpacity
              onPress={handleLeaveCall}
              style={styles.callCircleBtn}
              activeOpacity={0.7}
            >
              <ArrowLeft size={20} color="#ffffff" />
            </TouchableOpacity>

            <View style={styles.callBadgeContainer}>
              <View style={styles.callOnlineDot} />
              <Shield size={14} color="#00A651" style={{ marginRight: 5 }} />
              <Text style={styles.callBadgeText}>Téléconsultation Sécurisée</Text>
            </View>

            <TouchableOpacity
              onPress={handleLeaveCall}
              style={styles.callHangupBtn}
              activeOpacity={0.8}
            >
              <PhoneOff size={18} color="#ffffff" />
            </TouchableOpacity>
          </View>

          {callUrl ? (
            <WebView
              source={{ uri: callUrl }}
              style={styles.callWebview}
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
                  setIsInCall(false);
                  setCallUrl(null);
                }
              }}
            />
          ) : (
            <View style={styles.centerBox}>
              <ActivityIndicator size="large" color="#00A651" />
            </View>
          )}
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  callModalContainer: {
    flex: 1,
    backgroundColor: '#000000',
  },
  callTopBar: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.95)',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
  },
  callCircleBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  callBadgeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  callOnlineDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#00A651',
    marginRight: 6,
  },
  callBadgeText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '700',
    fontFamily: 'Montserrat_700Bold',
  },
  callHangupBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#ef4444',
    justifyContent: 'center',
    alignItems: 'center',
  },
  callWebview: {
    flex: 1,
    backgroundColor: '#000000',
  },
  centerBox: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 36,
  },
  mainCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 18,
    alignItems: 'center',
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  iconCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#eff6ff',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  mainTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#0f172a',
    marginBottom: 4,
    fontFamily: 'Montserrat_700Bold',
    textAlign: 'center',
  },
  mainSubtitle: {
    fontSize: 12.5,
    color: '#64748b',
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: 16,
    fontFamily: 'Montserrat_400Regular',
  },
  meetingCard: {
    width: '100%',
    backgroundColor: '#f8fafc',
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: '#bfdbfe',
  },
  meetingHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  liveIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#eff6ff',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  liveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#2563eb',
    marginRight: 6,
  },
  liveText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#2563eb',
    fontFamily: 'Montserrat_700Bold',
  },
  meetingDate: {
    fontSize: 12,
    color: '#64748b',
    fontFamily: 'Montserrat_500Medium',
  },
  doctorName: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0f172a',
    fontFamily: 'Montserrat_700Bold',
  },
  doctorSpecialty: {
    fontSize: 12,
    color: '#64748b',
    marginBottom: 10,
    fontFamily: 'Montserrat_400Regular',
  },
  timeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 14,
  },
  timeText: {
    fontSize: 12.5,
    color: '#2563eb',
    fontWeight: '600',
    fontFamily: 'Montserrat_600SemiBold',
  },
  startBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#2563eb',
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 14,
  },
  startBtnText: {
    color: '#ffffff',
    fontSize: 13.5,
    fontWeight: '700',
    fontFamily: 'Montserrat_700Bold',
  },
  noMeetingBox: {
    alignItems: 'center',
    paddingVertical: 12,
    width: '100%',
  },
  noMeetingTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0f172a',
    marginBottom: 4,
    fontFamily: 'Montserrat_700Bold',
  },
  noMeetingSub: {
    fontSize: 12,
    color: '#64748b',
    textAlign: 'center',
    fontFamily: 'Montserrat_400Regular',
  },
  sectionCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 14,
  },
  sectionTitle: {
    fontSize: 14.5,
    fontWeight: '700',
    color: '#0f172a',
    fontFamily: 'Montserrat_700Bold',
  },
  tipItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 14,
  },
  tipIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: '#f8fafc',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  tipContent: {
    flex: 1,
  },
  tipTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0f172a',
    marginBottom: 2,
    fontFamily: 'Montserrat_700Bold',
  },
  tipSub: {
    fontSize: 11.5,
    color: '#64748b',
    lineHeight: 16,
    fontFamily: 'Montserrat_400Regular',
  },
});
