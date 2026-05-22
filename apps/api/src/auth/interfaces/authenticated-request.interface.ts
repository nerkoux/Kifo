import { Request } from 'express';

export interface AuthenticatedUser {
  userId: string;
  discordId: string;
  username: string;
  avatar?: string;
  email?: string;
}

export interface AuthenticatedRequest extends Request {
  user: AuthenticatedUser;
}
