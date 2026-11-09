export interface CompanyPost {
  id: string;
  companyId: string;
  companyName?: string;
  title: string;
  content: string;
  authorName: string;
  createdAt: string;
  timestamp: number;
  pinned?: boolean;
  likesCount: number;
  commentsCount: number;
  category?: string;
  metrics?: Array<{ label: string; value: string }>;
  attachment?: {
    name: string;
    size: string;
    type: string;
  };
  media?: { url: string; name: string; type: string };
  poll?: { question: string; options: string[]; votes: number[] };
}

const STORAGE_KEY = "mansa_company_newsfeed_posts";

export function getAllStoredPosts(): CompanyPost[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) return parsed;
    return [];
  } catch {
    return [];
  }
}

export function saveAllPosts(posts: CompanyPost[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(posts));
    window.dispatchEvent(new CustomEvent("mansa_company_posts_updated"));
  } catch (err) {
    console.error("Erreur sauvegarde actualités :", err);
  }
}

export function getPostsForCompany(companyId: string, companyName?: string): CompanyPost[] {
  const all = getAllStoredPosts();
  const normalizedId = (companyId || "").trim().toLowerCase();
  const normalizedName = (companyName || "").trim().toLowerCase();

  const filtered = all.filter((p) => {
    const pId = (p.companyId || "").trim().toLowerCase();
    const pName = (p.companyName || "").trim().toLowerCase();
    return pId === normalizedId || (normalizedName && pName && pName === normalizedName);
  });

  return filtered.sort((a, b) => {
    if (a.pinned && !b.pinned) return -1;
    if (!a.pinned && b.pinned) return 1;
    return b.timestamp - a.timestamp;
  });
}

export function createCompanyPost(
  companyId: string,
  companyName: string,
  data: {
    title: string;
    content: string;
    authorName: string;
    pinned?: boolean;
    category?: string;
    media?: { url: string; name: string; type: string };
    poll?: { question: string; options: string[]; votes: number[] };
  },
): CompanyPost {
  const all = getAllStoredPosts();
  const pollItems = data.poll?.options
    .map((option, index) => ({
      option: option.trim(),
      votes: Number(data.poll?.votes?.[index] || 0),
    }))
    .filter((item) => item.option);
  const newPost: CompanyPost = {
    id: `post-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
    companyId,
    companyName,
    title: data.title.trim(),
    content: data.content.trim(),
    authorName: data.authorName || companyName,
    createdAt: "À l'instant",
    timestamp: Date.now(),
    pinned: Boolean(data.pinned),
    likesCount: 0,
    commentsCount: 0,
    category: data.category || "Annonce",
    ...(data.media ? { media: data.media } : {}),
    ...(data.poll && pollItems
      ? {
          poll: {
            question: data.poll.question.trim(),
            options: pollItems.map((item) => item.option),
            votes: pollItems.map((item) => item.votes),
          },
        }
      : {}),
  };

  const updated = [newPost, ...all];
  saveAllPosts(updated);
  return newPost;
}

export function recordCompanyPollVote(
  postId: string,
  companyId: string,
  optionIndex: number,
): boolean {
  const normalizedId = (companyId || "").trim().toLowerCase();
  const all = getAllStoredPosts();
  const post = all.find(
    (item) => item.id === postId && (item.companyId || "").trim().toLowerCase() === normalizedId,
  );
  if (
    !post?.poll ||
    !Number.isInteger(optionIndex) ||
    optionIndex < 0 ||
    optionIndex >= post.poll.options.length
  ) {
    return false;
  }
  const votes = post.poll.options.map((_, index) => Number(post.poll?.votes?.[index] || 0));
  votes[optionIndex] += 1;
  post.poll = { ...post.poll, votes };
  saveAllPosts(all);
  return true;
}

export function deleteCompanyPost(postId: string, companyId: string): void {
  const all = getAllStoredPosts();
  const normalizedId = (companyId || "").trim().toLowerCase();
  const updated = all.filter(
    (p) => !(p.id === postId && p.companyId.trim().toLowerCase() === normalizedId),
  );
  saveAllPosts(updated);
}
