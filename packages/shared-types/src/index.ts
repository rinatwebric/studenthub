export type UserRole = 'student' | 'moderator' | 'admin';

export type UserProfile = {
  uid: string;
  email: string;
  role: UserRole;
  displayName: string;
  avatarUrl?: string;
  faculty?: string;
  group?: string;
  about?: string;
};

export type Post = {
  id: string;
  authorId: string;
  text: string;
  createdAt: string;
  visibility: 'group' | 'university';
};
