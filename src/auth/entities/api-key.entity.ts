export class ApiKey {
    id: string;
    name: string;
    key: string;
    userId: string;
    createdAt: Date;
    lastUsedAt: Date | null;
    expiresAt: Date | null;
    isActive: boolean;
} 