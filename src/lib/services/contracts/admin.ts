import type { User, UserRole } from "@/lib/types";

export interface AdminService {
  listUsers(): Promise<User[]>;
  createUser(input: {
    role: UserRole;
    displayName: string;
    email: string;
    mobile: string;
  }): Promise<User>;
  updateUserStatus(userId: string, status: User["status"]): Promise<User>;
}
