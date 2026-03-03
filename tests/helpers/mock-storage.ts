import { vi } from "vitest";
import type { IStorage } from "../../server/storage";

/** Creates a fully-typed mock IStorage with all methods as vi.fn(). Tests configure return values per test. */
export function createMockStorage(): IStorage {
  const noop = vi.fn().mockResolvedValue(undefined);
  const noopList = vi.fn().mockResolvedValue([]);
  const noopFalse = vi.fn().mockResolvedValue(false);
  const noopZero = vi.fn().mockResolvedValue(0);
  const noopEmptySet = vi.fn().mockResolvedValue(new Set<string>());
  const noopStats = vi.fn().mockResolvedValue({
    reviews: 0,
    followers: 0,
    following: 0,
  });
  const noopMediaStats = vi.fn().mockResolvedValue({
    watched: 0,
    likes: 0,
    listed: 0,
    averageRating: null,
    reviewCount: 0,
  });
  const noopSubscription = vi.fn().mockResolvedValue({ status: "free" as const });
  const noopListStats = vi.fn().mockResolvedValue({
    listCount: 0,
    totalItems: 0,
    likesReceived: 0,
  });

  return {
    getUser: vi.fn().mockResolvedValue(undefined),
    getUserByUsername: vi.fn().mockResolvedValue(undefined),
    createUser: vi.fn(),
    updateUser: vi.fn(),

    getAllMedia: noopList,
    getMediaById: vi.fn().mockResolvedValue(undefined),
    getMediaByType: noopList,
    createMedia: vi.fn(),
    searchMedia: noopList,

    getReviewsForMedia: noopList,
    getReviewsByUser: noopList,
    getRecentReviews: noopList,
    createReview: vi.fn(),

    getWatchlist: noopList,
    addToWatchlist: noop,
    removeFromWatchlist: noop,
    isOnWatchlist: noopFalse,

    getFavorites: noopList,
    setFavorites: noop,

    isFollowing: noopFalse,
    follow: noop,
    unfollow: noop,
    getFollowerCount: noopZero,
    getFollowingCount: noopZero,

    likeReview: noop,
    unlikeReview: noop,
    hasLikedReview: noopFalse,

    getProfileStats: noopStats,
    getOrCreateAppUser: vi.fn(),

    getTopReviewers: noopList,
    getPopularReviews: noopList,

    getMediaByExternalId: vi.fn().mockResolvedValue(undefined),
    ensureMedia: vi.fn(),

    addWatched: noop,
    removeWatched: noop,
    isWatched: noopFalse,

    likeMedia: noop,
    unlikeMedia: noop,
    hasLikedMedia: noopFalse,

    getMediaStats: noopMediaStats,

    getProfileSettings: vi.fn().mockResolvedValue(undefined),
    updateProfileSettings: vi.fn(),
    getUserSubscription: noopSubscription,
    getBadges: noopList,
    getUserBadges: noopList,
    seedBadgesIfEmpty: noop,

    createList: vi.fn(),
    getList: vi.fn().mockResolvedValue(undefined),
    getUserLists: noopList,
    updateList: vi.fn(),
    deleteList: noop,

    addListItem: vi.fn(),
    removeListItem: noop,
    reorderListItems: noop,
    updateListItemNote: noop,
    getListItems: noopList,

    likeList: noop,
    unlikeList: noop,
    hasLikedList: noopFalse,
    getListLikeCount: noopZero,

    getListComments: noopList,
    createListComment: vi.fn(),
    deleteListComment: noop,
    getListCommentCount: noopZero,

    getPublicLists: noopList,
    getPublicListsPopularThisWeek: noopList,

    forkList: vi.fn(),

    generateShareToken: vi.fn().mockResolvedValue("token"),
    getListByShareToken: vi.fn().mockResolvedValue(undefined),

    getUserListStats: noopListStats,

    getListCollaborators: noopList,
    removeListCollaborator: noop,

    createInvitation: vi.fn(),
    getInvitationsForUser: noopList,
    getListInvitations: noopList,
    respondToInvitation: vi.fn(),
    getPendingInvitationCount: noopZero,

    createTierList: vi.fn(),
    getTierList: vi.fn().mockResolvedValue(undefined),
    getUserTierLists: noopList,
    updateTierList: vi.fn(),
    deleteTierList: noop,
    getTierListDetail: vi.fn().mockResolvedValue(undefined),
    createTierListFromTemplate: vi.fn(),
    getTierListCommunityAggregate: vi.fn().mockResolvedValue(null),

    createTier: vi.fn(),
    updateTier: vi.fn(),
    deleteTier: noop,
    reorderTiers: noop,
    ensureDefaultTiers: noop,

    addTierListItem: vi.fn(),
    removeTierListItem: noop,
    moveTierListItem: noop,
    updateTierListItemNote: noop,
    getTierListItems: noopList,

    likeTierList: noop,
    unlikeTierList: noop,
    hasLikedTierList: noopFalse,
    getTierListLikeCount: noopZero,

    getTierListComments: noopList,
    createTierListComment: vi.fn(),
    deleteTierListComment: noop,
    getTierListCommentCount: noopZero,

    getPublicTierLists: noopList,

    getTierListCollaborators: noopList,
    removeTierListCollaborator: noop,

    createTierListInvitation: vi.fn(),
    getTierListInvitationsForUser: noopList,
    getTierListInvitations: noopList,
    respondToTierListInvitation: vi.fn(),
    getPendingTierListInvitationCount: noopZero,

    forkTierList: vi.fn(),
    getTierListCompareData: vi.fn().mockResolvedValue(null),

    reactToTierListItem: noop,
    unreactToTierListItem: noop,
    getTierListItemReactions: noopList,

    seedPrebuiltTemplatesIfEmpty: noop,

    likePresetList: noop,
    unlikePresetList: noop,
    hasLikedPresetList: noopFalse,
    getPresetListLikeCount: noopZero,
    getPresetListComments: noopList,
    createPresetListComment: vi.fn(),
    deletePresetListComment: noop,
    getPresetListCommentCount: noopZero,
    markPresetProgress: noop,
    unmarkPresetProgress: noop,
    getUserPresetProgress: noopEmptySet,

    searchUsers: noopList,

    getConversationsForUser: noopList,
    getOrCreateConversation: vi.fn(),
    getConversationById: vi.fn().mockResolvedValue(undefined),
    getMessages: noopList,
    createMessage: vi.fn(),
    acceptConversation: vi.fn(),
    declineConversation: vi.fn(),
    markMessagesAsRead: noop,
    getUnreadCount: noopZero,
    getRequestMessageCount: noopZero,
  } as IStorage;
}
