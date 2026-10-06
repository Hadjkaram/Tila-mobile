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
import { Send, ArrowLeft, Shield, User, Users, HeartHandshake } from 'lucide-react-native';
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

export default function HealthAgentForumChatScreen() {
  const router = useRouter();
  const { colors, isDark } = useTheme();
  const { groupId } = useLocalSearchParams();
  const queryClient = useQueryClient();
  const parsedGroupId = parseInt(groupId as string, 10);

  const [message, setMessage] = useState('');
  const [isAnonymous, setIsAnonymous] = useState(false);

  // Informations sur le groupe
  const { data: group } = useQuery({
    queryKey: ['health_agent_forum_group', parsedGroupId],
    queryFn: () => forumService.getGroup(parsedGroupId),
    enabled: !isNaN(parsedGroupId),
  });

  // Discussions du groupe
  const { data: discussionsData, isLoading } = useQuery({
    queryKey: ['health_agent_forum_discussions', parsedGroupId],
    queryFn: () => forumService.listDiscussions(parsedGroupId, 1, 50),
    enabled: !isNaN(parsedGroupId),
    refetchInterval: 10000,
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
      queryClient.invalidateQueries({ queryKey: ['health_agent_forum_discussions', parsedGroupId] });
      queryClient.invalidateQueries({ queryKey: ['health_agent_forum_groups'] });
      notificationService.notifyDataReceived({
        title: '💬 Message envoyé',
        body: 'Votre retour communautaire a été partagé sur le forum.',
        data: { groupId: parsedGroupId },
      });
    },
  });

  const handleSend = () => {
    if (!message.trim() || postMutation.isPending) return;
    postMutation.mutate(message.trim());
  };

  const discussions = discussionsData?.items || [];

  const renderItem = ({ item }: { item: ForumDiscussion }) => {
    const isMine = item.isMine;
    const authorName = item.isAnonymous
      ? 'Anonyme'
      : item.author || 'Acteur communautaire';

    const formattedDate = (() => {
      if (!item.createdAt) return '';
      try {
        return format(parseISO(item.createdAt), 'dd MMM à HH:mm', { locale: fr });
      } catch {
        return item.createdAt;
      }
    })();

    return (
      <View
        style={[
          styles.messageRow,
          isMine ? styles.myMessageRow : styles.otherMessageRow,
        ]}
      >
        {!isMine && (
          <View
            style={[
              styles.avatarWrap,
              { backgroundColor: item.isAnonymous ? '#94a3b8' : '#2563eb' },
            ]}
          >
            {item.isAnonymous ? (
              <Shield size={14} color="#ffffff" />
            ) : (
              <HeartHandshake size={14} color="#ffffff" />
            )}
          </View>
        )}

        <View
          style={[
            styles.bubble,
            isMine
              ? styles.myBubble
              : [
                  styles.otherBubble,
                  {
                    backgroundColor: colors.card,
                    borderColor: colors.border,
                  },
                ],
          ]}
        >
          {!isMine && (
            <View style={styles.authorRow}>
              <Text style={[styles.authorName, { color: colors.textSecondary }]}>
                {authorName}
              </Text>
              {!item.isAnonymous && (
                <View style={styles.badgeAgentTag}>
                  <Text style={styles.badgeAgentTagText}>Communautaire</Text>
                </View>
              )}
            </View>
          )}

          <Text
            style={[
              styles.messageText,
              isMine
                ? styles.myMessageText
                : { color: colors.text },
            ]}
          >
            {cleanHtmlText(item.content)}
          </Text>

          {!!formattedDate && (
            <Text
              style={[
                styles.dateText,
                isMine ? styles.myDateText : { color: colors.textSecondary },
              ]}
            >
              {formattedDate}
            </Text>
          )}
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: colors.bg }]}
      edges={['top', 'bottom']}
    >
      {/* En-tête personnalisé avec retour */}
      <View
        style={[
          styles.header,
          {
            backgroundColor: colors.card,
            borderBottomColor: colors.border,
          },
        ]}
      >
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.backButton}
          activeOpacity={0.7}
        >
          <ArrowLeft size={22} color="#00A651" />
        </TouchableOpacity>

        <View style={styles.headerTitleGroup}>
          <Text style={[styles.headerTitle, { color: colors.text }]} numberOfLines={1}>
            {group?.name || 'Groupe de discussion'}
          </Text>
          <Text style={[styles.headerSubtitle, { color: colors.textSecondary }]} numberOfLines={1}>
            {group?.membersCount ?? 0} participants • Échanges terrain
          </Text>
        </View>
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        {/* Liste des discussions */}
        {isLoading ? (
          <View style={styles.loadingCenter}>
            <ActivityIndicator size="large" color="#00A651" />
          </View>
        ) : (
          <FlatList
            data={discussions}
            keyExtractor={(item) => String(item.id)}
            renderItem={renderItem}
            inverted={false}
            contentContainerStyle={styles.chatListContent}
            showsVerticalScrollIndicator={false}
            ListEmptyComponent={
              <View style={styles.emptyContainer}>
                <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
                  Aucun message pour l'instant dans ce groupe.
                </Text>
                <Text style={[styles.emptySub, { color: colors.textSecondary }]}>
                  Partagez une situation de terrain ou posez une question.
                </Text>
              </View>
            }
          />
        )}

        {/* Barre de saisie */}
        <View
          style={[
            styles.inputContainer,
            {
              backgroundColor: colors.card,
              borderTopColor: colors.border,
            },
          ]}
        >
          {/* Option Anonymat */}
          <View style={styles.optionsRow}>
            <View style={styles.anonymousOption}>
              <Text style={[styles.anonymousLabel, { color: colors.textSecondary }]}>
                Publier sous pseudonyme :
              </Text>
              <Switch
                value={isAnonymous}
                onValueChange={setIsAnonymous}
                trackColor={{ false: '#cbd5e1', true: '#86efac' }}
                thumbColor={isAnonymous ? '#00A651' : '#f8fafc'}
                style={{ transform: [{ scaleX: 0.8 }, { scaleY: 0.8 }] }}
              />
            </View>
          </View>

          <View style={styles.inputRow}>
            <TextInput
              style={[
                styles.textInput,
                {
                  backgroundColor: isDark ? '#1e293b' : '#f8fafc',
                  color: colors.text,
                  borderColor: colors.border,
                },
              ]}
              placeholder="Écrivez votre message..."
              placeholderTextColor={isDark ? '#64748b' : '#94a3b8'}
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
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  backButton: {
    padding: 6,
    marginRight: 8,
  },
  headerTitleGroup: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '700',
    fontFamily: 'Montserrat_700Bold',
  },
  headerSubtitle: {
    fontSize: 12,
    fontFamily: 'Montserrat_500Medium',
    marginTop: 1,
  },
  chatListContent: {
    padding: 16,
    paddingBottom: 24,
  },
  loadingCenter: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  messageRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    marginBottom: 12,
  },
  myMessageRow: {
    justifyContent: 'flex-end',
  },
  otherMessageRow: {
    justifyContent: 'flex-start',
  },
  avatarWrap: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
    marginBottom: 2,
  },
  bubble: {
    maxWidth: '78%',
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  myBubble: {
    backgroundColor: '#00A651',
    borderBottomRightRadius: 4,
  },
  otherBubble: {
    borderWidth: 1,
    borderBottomLeftRadius: 4,
  },
  authorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  authorName: {
    fontSize: 11,
    fontFamily: 'Montserrat_600SemiBold',
    marginRight: 6,
  },
  badgeAgentTag: {
    backgroundColor: 'rgba(37,99,235,0.12)',
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 4,
  },
  badgeAgentTagText: {
    fontSize: 9.5,
    color: '#2563eb',
    fontWeight: '700',
    fontFamily: 'Montserrat_700Bold',
  },
  messageText: {
    fontSize: 14,
    lineHeight: 20,
    fontFamily: 'Montserrat_400Regular',
  },
  myMessageText: {
    color: '#ffffff',
  },
  dateText: {
    fontSize: 10,
    marginTop: 4,
    alignSelf: 'flex-end',
    fontFamily: 'Montserrat_400Regular',
  },
  myDateText: {
    color: 'rgba(255,255,255,0.75)',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    paddingHorizontal: 24,
  },
  emptyText: {
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
    fontFamily: 'Montserrat_600SemiBold',
    marginBottom: 4,
  },
  emptySub: {
    fontSize: 12.5,
    textAlign: 'center',
    fontFamily: 'Montserrat_400Regular',
  },
  inputContainer: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: Platform.OS === 'ios' ? 12 : 8,
    borderTopWidth: 1,
  },
  optionsRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginBottom: 6,
  },
  anonymousOption: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  anonymousLabel: {
    fontSize: 11.5,
    fontFamily: 'Montserrat_500Medium',
    marginRight: 4,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  textInput: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 8,
    fontSize: 14,
    maxHeight: 100,
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
    opacity: 0.5,
  },
});
