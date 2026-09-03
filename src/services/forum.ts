import { apiClient } from './apiClient';

// --- Types ---
export interface ForumGroup {
  id: number;
  name: string;
  description: string;
  isPrivate: boolean;
  isActive?: boolean;
  membersCount: number;
  postsCount: number;
  lastActivityAt?: string | null;
  createdAt?: string;
  isMember: boolean;
  notificationsEnabled: boolean;
  role?: string | null;
}

export interface ForumDiscussion {
  id: number;
  title: string;
  content: string;
  groupId: number;
  group: string;
  author?: string | null;
  isAnonymous: boolean;
  isMine?: boolean;
  likesCount: number;
  repliesCount: number;
  liked: boolean;
  createdAt?: string;
}

export interface ForumDiscussionsResponse {
  items: ForumDiscussion[];
  total: number;
  page: number;
  limit: number;
  hasMore: boolean;
}

// --- Service ---
class ForumService {
  /**
   * Récupère la liste des groupes de discussion du forum
   */
  async listGroups(query?: string): Promise<ForumGroup[]> {
    if (query) {
      return apiClient.get('/api/forum/groups', { q: query });
    }
    return apiClient.get('/api/forum/groups');
  }

  /**
   * Récupère les détails d'un groupe spécifique
   */
  async getGroup(id: number): Promise<ForumGroup> {
    return apiClient.get(`/api/forum/groups/${id}`);
  }

  /**
   * Récupère la liste des discussions (messages) dans un groupe
   */
  async listDiscussions(groupId: number, page?: number, limit?: number): Promise<ForumDiscussionsResponse> {
    return apiClient.get(`/api/forum/groups/${groupId}/discussions`, { page, limit });
  }

  /**
   * Crée une nouvelle discussion (message principal) dans un groupe
   */
  async createDiscussion(groupId: number, data: {
    title: string;
    content: string;
    isAnonymous: boolean;
  }): Promise<ForumDiscussion> {
    return apiClient.post(`/api/forum/groups/${groupId}/discussions`, data);
  }
}

export const forumService = new ForumService();
