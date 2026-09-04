import React, { useState, useEffect } from 'react';
import { View, StyleSheet, FlatList, TextInput, TouchableOpacity, KeyboardAvoidingView, Platform, ActivityIndicator } from 'react-native';
import { Text } from '../../../components/Text';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Send, ArrowLeft } from 'lucide-react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { forumService, ForumDiscussion } from '../../../services/forum';
import { format, parseISO } from 'date-fns';
import { fr } from 'date-fns/locale';
import { useTheme } from '../../../context/ThemeContext';

export default function ForumChatScreen() {
  const router = useRouter();
  const { colors, isDark } = useTheme();
  const { groupId } = useLocalSearchParams();
  const queryClient = useQueryClient();
  const parsedGroupId = parseInt(groupId as string, 10);

  const [message, setMessage] = useState('');

  // Fetch Group Info (Optional: just to get the group name)
  const { data: group } = useQuery({
    queryKey: ['forum_group', parsedGroupId],
    queryFn: () => forumService.getGroup(parsedGroupId),
    enabled: !isNaN(parsedGroupId),
  });

  // Fetch Discussions
  const { data: discussionsData, isLoading } = useQuery({
    queryKey: ['forum_discussions', parsedGroupId],
    queryFn: () => forumService.listDiscussions(parsedGroupId, 1, 50),
    enabled: !isNaN(parsedGroupId),
  });

  // Post Discussion Mutation
  const postMutation = useMutation({
    mutationFn: (content: string) => forumService.createDiscussion(parsedGroupId, {
      title: 'Message',
      content,
      isAnonymous: false,
    }),
    onSuccess: () => {
      setMessage('');
      queryClient.invalidateQueries({ queryKey: ['forum_discussions', parsedGroupId] });
      queryClient.invalidateQueries({ queryKey: ['forum_groups'] });
    }
  });

  const handleSend = () => {
    if (!message.trim()) return;
    postMutation.mutate(message.trim());
  };

  const discussions = discussionsData?.items || [];
  
  // Note: If the API returns them newest first, we don't need to reverse.
  // Assuming they come oldest first, or newest first depending on the web API.
  // Usually, in a chat, you pass `inverted={true}` to FlatList and feed it newest-first data.
  // For safety, let's reverse them so the oldest is at the top if we use normal rendering,
  // or pass inverted if we want chat-like behavior. We'll use inverted for real native chat UX.

  const renderMessage = ({ item }: { item: ForumDiscussion }) => {
    const isMe = item.isMine;
    
    return (
      <View style={[styles.messageWrapper, isMe ? styles.messageWrapperRight : styles.messageWrapperLeft]}>
        {!isMe && (
          <Text style={[styles.authorName, { color: colors.textSecondary }]}>{item.isAnonymous ? 'Anonyme' : (item.author || 'Inconnu')}</Text>
        )}
        <View style={[
          styles.messageBubble, 
          isMe ? styles.messageBubbleRight : [styles.messageBubbleLeft, { backgroundColor: colors.card, borderColor: colors.border }]
        ]}>
          <Text style={[styles.messageText, isMe ? styles.messageTextRight : [styles.messageTextLeft, { color: colors.text }]]}>
            {item.content}
          </Text>
        </View>
        <Text style={[styles.timeText, { color: colors.textMuted }, isMe ? styles.timeTextRight : styles.timeTextLeft]}>
          {item.createdAt ? format(parseISO(item.createdAt), 'HH:mm', { locale: fr }) : ''}
        </Text>
      </View>
    );
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.bgSecondary }]} edges={['top', 'bottom']}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: colors.headerBg, borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <ArrowLeft size={24} color={colors.text} />
        </TouchableOpacity>
        <View style={styles.headerTitleContainer}>
          <Text style={[styles.headerTitle, { color: colors.headerText }]} numberOfLines={1}>
            {group?.name || 'Discussion'}
          </Text>
          {group?.membersCount && (
            <Text style={[styles.headerSubtitle, { color: colors.textSecondary }]}>{group.membersCount} membres</Text>
          )}
        </View>
      </View>

      {/* Chat Area */}
      <KeyboardAvoidingView 
        style={styles.chatContainer} 
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        {isLoading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#00A651" />
          </View>
        ) : (
          <FlatList
            data={discussions}
            keyExtractor={(item) => item.id.toString()}
            renderItem={renderMessage}
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
            inverted={true}
          />
        )}

        {/* Input Area */}
        <View style={[styles.inputContainer, { backgroundColor: colors.card, borderTopColor: colors.border }]}>
          <TextInput
            style={[styles.textInput, { backgroundColor: colors.inputBg, borderColor: colors.border, borderWidth: 1, color: colors.text }]}
            placeholder="Écrivez un message..."
            placeholderTextColor={colors.textMuted}
            value={message}
            onChangeText={setMessage}
            multiline
            maxLength={1000}
          />
          <TouchableOpacity 
            style={[styles.sendButton, (!message.trim() || postMutation.isPending) && styles.sendButtonDisabled]}
            onPress={handleSend}
            disabled={!message.trim() || postMutation.isPending}
          >
            {postMutation.isPending ? (
              <ActivityIndicator size="small" color="#ffffff" />
            ) : (
              <Send size={20} color="#ffffff" style={{ marginLeft: 2 }} />
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
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  backButton: {
    padding: 8,
    marginRight: 8,
  },
  headerTitleContainer: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#0f172a',
  },
  headerSubtitle: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 2,
  },
  chatContainer: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  listContent: {
    padding: 16,
    paddingBottom: 24,
  },
  messageWrapper: {
    marginBottom: 16,
    maxWidth: '80%',
  },
  messageWrapperLeft: {
    alignSelf: 'flex-start',
  },
  messageWrapperRight: {
    alignSelf: 'flex-end',
  },
  authorName: {
    fontSize: 12,
    color: '#64748b',
    marginBottom: 4,
    marginLeft: 4,
  },
  messageBubble: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 20,
  },
  messageBubbleLeft: {
    backgroundColor: '#ffffff',
    borderBottomLeftRadius: 4,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  messageBubbleRight: {
    backgroundColor: '#00A651',
    borderBottomRightRadius: 4,
  },
  messageText: {
    fontSize: 15,
    lineHeight: 22,
  },
  messageTextLeft: {
    color: '#1e293b',
  },
  messageTextRight: {
    color: '#ffffff',
  },
  timeText: {
    fontSize: 11,
    color: '#94a3b8',
    marginTop: 4,
  },
  timeTextLeft: {
    alignSelf: 'flex-start',
    marginLeft: 4,
  },
  timeTextRight: {
    alignSelf: 'flex-end',
    marginRight: 4,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#ffffff',
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
  },
  textInput: {
    flex: 1,
    backgroundColor: '#f1f5f9',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 12,
    fontSize: 15,
    color: '#1e293b',
    minHeight: 44,
    maxHeight: 120,
  },
  sendButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#00A651',
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 12,
  },
  sendButtonDisabled: {
    backgroundColor: '#cbd5e1',
  }
});
