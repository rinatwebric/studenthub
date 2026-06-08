export type Chat = {
  id: string;
  title: string;
  members: string[];
  updatedAt?: Date;
  lastMessage?: string;
  avatar?: string;
  isGroup?: boolean;
};

export type Contact = {
  id: string;
  name: string;
  email: string;
  photoURL?: string;
};

export type Message = {
  id: string;
  senderId: string;
  text: string;
  voiceUrl?: string;
  voiceDuration?: number;
  imageUrl?: string;
  createdAt?: Date;
};

export type AccountResult = {
  id: string;
  name: string;
  email: string;
  photoURL?: string;
};
