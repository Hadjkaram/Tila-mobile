import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

// Configuration du comportement quand l'application est ouverte au premier plan
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

export const NOTIFICATION_CHANNELS = {
  URGENT: 'tila-urgent-alerts',
  APPOINTMENTS: 'tila-appointments',
  DEFAULT: 'tila-default',
};

class NotificationService {
  private isInitialized = false;

  /**
   * Initialise le gestionnaire de notifications et configure les canaux Android haute priorité (Heads-up / WhatsApp style)
   */
  async initialize(): Promise<boolean> {
    if (this.isInitialized) return true;

    try {
      if (Platform.OS === 'android') {
        // 1. Canal d'urgence / consultation : priorité MAX, son, vibreur et affichage par dessus les autres apps
        await Notifications.setNotificationChannelAsync(NOTIFICATION_CHANNELS.URGENT, {
          name: 'Alertes Urgentes & Consultations TILA',
          importance: Notifications.AndroidImportance.MAX,
          vibrationPattern: [0, 400, 200, 400],
          lightColor: '#00A651',
          sound: 'default',
          enableLights: true,
          enableVibrate: true,
          lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
          bypassDnd: false,
          showBadge: true,
        });

        // 2. Canal des rappels de rendez-vous
        await Notifications.setNotificationChannelAsync(NOTIFICATION_CHANNELS.APPOINTMENTS, {
          name: 'Rappels de Rendez-vous',
          importance: Notifications.AndroidImportance.HIGH,
          vibrationPattern: [0, 250, 250, 250],
          lightColor: '#00A651',
          sound: 'default',
          enableLights: true,
          enableVibrate: true,
          lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
          showBadge: true,
        });

        // 3. Canal par défaut
        await Notifications.setNotificationChannelAsync(NOTIFICATION_CHANNELS.DEFAULT, {
          name: 'Notifications Générales',
          importance: Notifications.AndroidImportance.DEFAULT,
          vibrationPattern: [0, 200, 200, 200],
          sound: 'default',
        });
      }

      // Demande de permission utilisateur
      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;

      if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync({
          ios: {
            allowAlert: true,
            allowBadge: true,
            allowSound: true,
          },
        });
        finalStatus = status;
      }

      this.isInitialized = finalStatus === 'granted';
      return this.isInitialized;
    } catch (error) {
      console.warn('[NotificationService] Erreur lors de l\'initialisation des notifications:', error);
      return false;
    }
  }

  /**
   * Envoie une notification immédiate avec son, vibreur et affichage en bannière (style WhatsApp)
   */
  async sendInstantNotification({
    title,
    body,
    channelId = NOTIFICATION_CHANNELS.URGENT,
    data = {},
  }: {
    title: string;
    body: string;
    channelId?: string;
    data?: Record<string, any>;
  }) {
    await this.initialize();

    try {
      return await Notifications.scheduleNotificationAsync({
        content: {
          title,
          body,
          sound: 'default',
          vibrate: [0, 400, 200, 400],
          data,
        },
        trigger: (Platform.OS === 'android'
          ? ({ channelId } as any)
          : null),
      });
    } catch (error) {
      console.warn('[NotificationService] Erreur lors de l\'envoi de la notification:', error);
      return null;
    }
  }

  /**
   * Programme un rappel de rendez-vous
   */
  async scheduleAppointmentReminder({
    appointmentId,
    doctorName,
    date,
  }: {
    appointmentId: string;
    doctorName: string;
    date: Date;
  }) {
    await this.initialize();

    try {
      // 1 heure avant le rendez-vous
      const triggerTime = new Date(date.getTime() - 60 * 60 * 1000);
      if (triggerTime <= new Date()) {
        return null; // Date passée
      }

      return await Notifications.scheduleNotificationAsync({
        content: {
          title: '🗓️ Rappel de Consultation TILA',
          body: `Votre consultation avec ${doctorName} débute dans 1 heure. Préparez vos documents médicaux.`,
          sound: 'default',
          vibrate: [0, 300, 150, 300],
          data: { appointmentId, type: 'APPOINTMENT_REMINDER' },
        },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.DATE,
          date: triggerTime,
          ...(Platform.OS === 'android' ? { channelId: NOTIFICATION_CHANNELS.APPOINTMENTS } : {}),
        } as any,
      });
    } catch (error) {
      console.warn('[NotificationService] Erreur programmation rappel:', error);
      return null;
    }
  }

  /**
   * Alerte de détresse / cas signalé urgent
   */
  async sendEmergencyAlert({
    patientName,
    alertTitle = 'Alerte Urgence Santé Mentale',
    location = 'Non précisée',
  }: {
    patientName: string;
    alertTitle?: string;
    location?: string;
  }) {
    return this.sendInstantNotification({
      title: `🚨 ${alertTitle}`,
      body: `Signalement prioritaire : ${patientName} (${location}). Prise en charge requise immédiatement.`,
      channelId: NOTIFICATION_CHANNELS.URGENT,
      data: { type: 'EMERGENCY_ALERT' },
    });
  }
}

export const notificationService = new NotificationService();
