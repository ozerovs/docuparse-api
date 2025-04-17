import { Injectable } from '@nestjs/common';
import { randomBytes } from 'crypto';
import { SupabaseService } from '../../common/services/supabase.service';
import { ApiKey } from '../entities/api-key.entity';

@Injectable()
export class AuthService {
    constructor(private supabaseService: SupabaseService) { }

    async generateApiKey(userId: string, name: string, expiresAt?: Date): Promise<ApiKey> {
        // Generate a secure random API key
        const apiKey = `dk_${randomBytes(24).toString('hex')}`;

        // Store the API key in the database
        const { data, error } = await this.supabaseService.getClient()
            .from('api_keys')
            .insert({
                user_id: userId,
                name,
                key: apiKey,
                created_at: new Date().toISOString(),
                expires_at: expiresAt ? expiresAt.toISOString() : null,
                is_active: true,
            })
            .select()
            .single();

        if (error) {
            throw new Error(`Failed to generate API key: ${error.message}`);
        }

        // Map the response to our ApiKey entity
        return {
            id: data.id,
            userId: data.user_id,
            name: data.name,
            key: data.key,
            createdAt: new Date(data.created_at),
            lastUsedAt: data.last_used_at ? new Date(data.last_used_at) : null,
            expiresAt: data.expires_at ? new Date(data.expires_at) : null,
            isActive: data.is_active,
        };
    }

    async listApiKeys(userId: string): Promise<ApiKey[]> {
        const { data, error } = await this.supabaseService.getClient()
            .from('api_keys')
            .select('*')
            .eq('user_id', userId)
            .order('created_at', { ascending: false });

        if (error) {
            throw new Error(`Failed to list API keys: ${error.message}`);
        }

        return data.map(item => ({
            id: item.id,
            userId: item.user_id,
            name: item.name,
            key: item.key,
            createdAt: new Date(item.created_at),
            lastUsedAt: item.last_used_at ? new Date(item.last_used_at) : null,
            expiresAt: item.expires_at ? new Date(item.expires_at) : null,
            isActive: item.is_active,
        }));
    }

    async revokeApiKey(userId: string, apiKeyId: string): Promise<void> {
        const { error } = await this.supabaseService.getClient()
            .from('api_keys')
            .update({ is_active: false })
            .eq('id', apiKeyId)
            .eq('user_id', userId);

        if (error) {
            throw new Error(`Failed to revoke API key: ${error.message}`);
        }
    }
} 