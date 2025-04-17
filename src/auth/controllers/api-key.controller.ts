import { Controller, Post, Get, Delete, Body, Param, Req, UseGuards } from '@nestjs/common';
import { AuthService } from '../services/auth.service';
import { ApiKey } from '../entities/api-key.entity';

// This will be used for Supabase Auth in the dashboard
@Controller('api-keys')
export class ApiKeyController {
    constructor(private authService: AuthService) { }

    @Post()
    async generateApiKey(
        @Req() req: any,
        @Body() body: { name: string; expiresAt?: string },
    ): Promise<{ apiKey: ApiKey }> {
        // req.user comes from Supabase Auth
        const userId = req.user.id;

        let expiresAt: Date | undefined;
        if (body.expiresAt) {
            expiresAt = new Date(body.expiresAt);
        }

        const apiKey = await this.authService.generateApiKey(
            userId,
            body.name,
            expiresAt,
        );

        return { apiKey };
    }

    @Get()
    async listApiKeys(@Req() req: any): Promise<{ apiKeys: ApiKey[] }> {
        // req.user comes from Supabase Auth
        const userId = req.user.id;
        const apiKeys = await this.authService.listApiKeys(userId);
        return { apiKeys };
    }

    @Delete(':id')
    async revokeApiKey(
        @Req() req: any,
        @Param('id') apiKeyId: string,
    ): Promise<{ success: boolean }> {
        // req.user comes from Supabase Auth
        const userId = req.user.id;
        await this.authService.revokeApiKey(userId, apiKeyId);
        return { success: true };
    }
} 