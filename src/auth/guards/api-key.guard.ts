import { Injectable, CanActivate, ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { SupabaseService } from '../../common/services/supabase.service';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class ApiKeyGuard implements CanActivate {
    constructor(
        private supabaseService: SupabaseService,
        private configService: ConfigService
    ) { }

    async canActivate(context: ExecutionContext): Promise<boolean> {
        const request = context.switchToHttp().getRequest();
        const apiKey = this.extractApiKeyFromHeader(request);

        if (!apiKey) {
            throw new UnauthorizedException('API key is missing');
        }

        // In development mode, allow any API key
        const nodeEnv = this.configService.get<string>('NODE_ENV');
        if (nodeEnv === 'development') {
            request.userId = 'dev-user';
            return true;
        }

        try {
            // Query the api_keys table in Supabase
            const { data, error } = await this.supabaseService.getClient()
                .from('api_keys')
                .select('*')
                .eq('key', apiKey)
                .eq('is_active', true)
                .single();

            if (error || !data) {
                throw new UnauthorizedException('Invalid API key');
            }

            // Update last used timestamp
            await this.supabaseService.getClient()
                .from('api_keys')
                .update({ last_used_at: new Date().toISOString() })
                .eq('id', data.id);

            // Attach the user ID to the request for later use
            request.userId = data.user_id;

            return true;
        } catch (error) {
            throw new UnauthorizedException('Invalid API key');
        }
    }

    private extractApiKeyFromHeader(request: any): string | undefined {
        const apiKey = request.headers['x-api-key'];
        return apiKey;
    }
} 