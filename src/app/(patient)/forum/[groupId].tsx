import React, { useState } from 'react';
import {
  View,
  StyleSheet,
  FlatList,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Switch,
} from 'react-native';
import { Text } from '../../../components/Text';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Send, ArrowLeft, Shield, User, Users } from 'lucide-react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { forumService, ForumDiscussion } from '../../../services/forum';
import { format, parseISO } from 'date-fns';
import { fr } from 'date-fns/locale';
import { useTheme } from '../../../context/ThemeContext';
import { notificationService } from '../../../services/notificationService';

function cleanHtmlText(raw: string = ''): string {
  if (!raw) return '';
  return raw
    .replace(/<[^>]*>/g, '')
    .replace(/&#039;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&nbsp;/g, ' ')
    .trim();
}

export default function PatientForumChatScreen() {
  const router = useRouter();
  const { colors, isDark } = useTheme();
  const { groupId } = useLocalSearchParams();
  const queryClient = useQueryClient();
  const parsedGroupId = parseInt(groupId as string, 10);

  const [message, setMessage] = useState('');
  const [isAnonymous, setIsAnonymous] = useState(false);

  // Informations sur le groupe
  const { data: group } = useQuery({
    queryKey: ['patient_forum_group', parsedGroupId],
    queryFn: () => forumService.getGroup(parsedGroupId),
    enabled: !isNaN(parsedGroupId),
  });

  // Discussions du groupe
  const { data: discussionsData, isLoading } = useQuery({
    queryKey: ['patient_forum_discussions', parsedGroupId],
    queryFn: () => forumService.listDiscussions(parsedGroupId, 1, 50),
    enabled: !isNaN(parsedGroupId),
    refetchInterval: 10000, // rafraîchissement périodique
  });

  // Mutation d'envoi
  const postMutation = useMutation({
    mutationFn: (content: string) =>
      forumService.createDiscussion(parsedGroupId, {
        title: 'Message',
        content,
        isAnonymous,
      }),
    onSuccess: () => {
      setMessage('');
      queryClient.invalidateQueries({ queryKey: ['patient_forum_discussions', parsedGroupId] });
      queryClient.invalidateQueries({ queryKey: ['patient_forum_groups'] });
      notificationService.notifyDataReceived({
        title: '💬 Message publié',
        body: 'Votre message a été partagé sur le forum communautaire.',
        data: { groupId: parsedGroupId },
      });
    },
  });

  const handleSend = () => {
    if (!message.trim() || postMutation.isPending) return;
    postMutation.mutate(message.trim());
  };

  const discussions = discussionsData?.items || [];

  const renderMessage = ({ item }: { item: ForumDiscussion }) => {
    const isMe = item.isMine;

    return (
      <View
        style={[
          styles.messageWrapper,
          isMe ? styles.messageWrapperRight : styles.messageWrapperLeft,
        ]}
      >
        {!isMe && (
          <View style={styles.authorRow}>
            <View
              style={[
                styles.authorAvatar,
                { backgroundColor: item.isAnonymous ? '#f1f5f9' : '#ecfdf5' },
              ]}
            >
              {item.isAnonymous ? (
                <Shield size={12} color="#64748b" />
              ) : (
                <User size={12} color="#00A651" />
              )}
            </View>
            <Text style={[styles.authorName, { color: colors.textSecondary }]}>
              {item.isAnonymous ? 'Membre anonyme' : item.author || 'Participant'}
            </Text>
          </View>
        )}

        <View
          style={[
            styles.messageBubble,
            isMe
              ? styles.messageBubbleRight
              : [
                  styles.messageBubbleLeft,
                  { backgroundColor: colors.card, borderColor: colors.border },
                ],
          ]}
        >
          <Text
            style={[
              styles.messageText,
              isMe
                ? styles.messageTextRight
                : [styles.messageTextLeft, { color: colors.text }],
            ]}
          >
            {cleanHtmlText(item.content)}
          </Text>
        </View>

        <Text
          style={[
            styles.timeText,
            { color: colors.textMuted },
            isMe ? styles.timeTextRight : styles.timeTextLeft,
          ]}
        >
          {item.createdAt
            ? format(parseISO(item.createdAt), 'HH:mm', { locale: fr })
            : ''}
        </Text>
      </View>
    );
  };

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: colors.bgSecondary }]}
      edges={['top', 'bottom']}
    >
      {/* En-tête */}
      <View
        style={[
          styles.header,
          { backgroundColor: colors.card, borderBottomColor: colors.border },
        ]}
      >
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.backButton}
          activeOpacity={0.7}
        >
          <ArrowLeft size={22} color={colors.text} />
        </TouchableOpacity>
        <View style={styles.headerTitleContainer}>
          <Text
            style={[styles.headerTitle, { color: colors.text }]}
            numberOfLines={1}
          >
            {group?.name || 'Discussion de groupe'}
          </Text>
          <View style={styles.headerSubtitleRow}>
            <Users size={12} color={colors.textSecondary} style={{ marginRight: 4 }} />
            <Text
              style={[styles.headerSubtitle, { color: colors.textSecondary }]}
            >
              {group?.membersCount ? `${group.membersCount} membres` : 'Espace d’entraide'}
            </Text>
          </View>
        </View>
      </View>

      {/* Messages */}
      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#00A651" />
          <Text style={[styles.loadingText, { color: colors.textSecondary }]}>
            Chargement des messages...
          </Text>
        </View>
      ) : (
        <FlatList
          data={discussions}
          keyExtractor={(item) => String(item.id)}
          renderItem={renderMessage}
          contentContainerStyle={styles.messagesList}
          showsVerticalScrollIndicator={false}
          inverted={false}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <View
                style={[
                  styles.emptyIconWrap,
                  { backgroundColor: isDark ? 'rgba(0,166,81,0.15)' : '#ecfdf5' },
                ]}
              >
                <Shield size={32} color="#00A651" />
              </View>
              <Text style={[styles.emptyTitle, { color: colors.text }]}>
                Démarrez la conversation
              </Text>
              <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
                Soyez le premier à poser une question, partager un ressenti ou encourager un membre.
              </Text>
            </View>
          }
        />
      )}

      {/* Barre de saisie */}
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 10 : 0}
      >
        {/* Option d'anonymat */}
        <View
          style={[
            styles.anonymousToggleBar,
            { backgroundColor: isDark ? '#1e293b' : '#f1f5f9', borderTopColor: colors.border },
          ]}
        >
          <View style={styles.anonymousLeft}>
            <Shield size={14} color={isAnonymous ? '#00A651' : colors.textSecondary} style={{ marginRight: 6 }} />
            <Text style={[styles.anonymousLabel, { color: isAnonymous ? '#00A651' : colors.textSecondary }]}>
              {isAnonymous ? 'Publication anonyme activée' : 'Publier avec votre prénom'}
            </Text>
          </View>
          <Switch
            value={isAnonymous}
            onValueChange={setIsAnonymous}
            trackColor={{ false: '#cbd5e1', true: '#86efac' }}
            thumbColor={isAnonymous ? '#00A651' : '#f8fafc'}
            ios_backgroundColor="#cbd5e1"
            style={{ transform: [{ scaleX: 0.8 }, { scaleY: 0.8 }] }}
          />
        </View>

        <View
          style={[
            styles.inputContainer,
            { backgroundColor: colors.card, borderTopColor: colors.border },
          ]}
        >
          <TextInput
            style={[
              styles.input,
              {
                backgroundColor: isDark ? '#1e293b' : '#f8fafc',
                color: colors.text,
                borderColor: colors.border,
              },
            ]}
            placeholder={isAnonymous ? "Écrire anonymement..." : "Partager un message..."}
            placeholderTextColor={colors.textMuted}
            value={message}
            onChangeText={setMessage}
            multiline
            maxLength={1000}
          />
          <TouchableOpacity
            style={[
              styles.sendButton,
              (!message.trim() || postMutation.isPending) && styles.sendButtonDisabled,
            ]}
            onPress={handleSend}
            disabled={!message.trim() || postMutation.isPending}
            activeOpacity={0.8}
          >
            {postMutation.isPending ? (
              <ActivityIndicator size="small" color="#ffffff" />
            ) : (
              <Send size={18} color="#ffffff" />
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  backButton: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
  },
  headerTitleContainer: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '700',
    fontFamily: 'Montserrat_700Bold',
  },
  headerSubtitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
  },
  headerSubtitle: {
    fontSize: 12,
    fontFamily: 'Montserrat_400Regular',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 13,
    marginTop: 10,
    fontFamily: 'Montserrat_500Medium',
  },
  messagesList: {
    padding: 16,
    paddingBottom: 20,
  },
  messageWrapper: {
    marginBottom: 14,
    maxWidth: '82%',
  },
  messageWrapperLeft: {
    alignSelf: 'flex-start',
  },
  messageWrapperRight: {
    alignSelf: 'flex-end',
  },
  authorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
    marginLeft: 4,
  },
  authorAvatar: {
    width: 18,
    height: 18,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 6,
  },
  authorName: {
    fontSize: 11,
    fontWeight: '600',
    fontFamily: 'Montserrat_600SemiBold',
  },
  messageBubble: {
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  messageBubbleLeft: {
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderTopLeftRadius: 4,
  },
  messageBubbleRight: {
    backgroundColor: '#00A651',
    borderTopRightRadius: 4,
  },
  messageText: {
    fontSize: 14,
    lineHeight: 20,
    fontFamily: 'Montserrat_400Regular',
  },
  messageTextLeft: {
    color: '#0f172a',
  },
  messageTextRight: {
    color: '#ffffff',
  },
  timeText: {
    fontSize: 10,
    marginTop: 4,
    fontFamily: 'Montserrat_400Regular',
  },
  timeTextLeft: {
    marginLeft: 6,
  },
  timeTextRight: {
    alignSelf: 'flex-end',
    marginRight: 6,
  },
  emptyContainer: {
    paddingVertical: 60,
    paddingHorizontal: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyIconWrap: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '700',
    fontFamily: 'Montserrat_700Bold',
    marginBottom: 6,
  },
  emptyText: {
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 18,
    fontFamily: 'Montserrat_400Regular',
  },
  anonymousToggleBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderTopWidth: 1,
  },
  anonymousLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  anonymousLabel: {
    fontSize: 11.5,
    fontFamily: 'Montserrat_500Medium',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderTopWidth: 1,
    gap: 8,
  },
  input: {
    flex: 1,
    minHeight: 40,
    maxHeight: 100,
    borderRadius: 20,
    borderWidth: 1,
    paddingHorizontal: 16,
    paddingVertical: 8,
    fontSize: 14,
    fontFamily: 'Montserrat_400Regular',
  },
  sendButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#00A651',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendButtonDisabled: {
    backgroundColor: '#94a3b8',
    opacity: 0.7,
  },
});
