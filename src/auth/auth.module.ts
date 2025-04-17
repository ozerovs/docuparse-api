import { Module } from '@nestjs/common';
import { CommonModule } from '../common/common.module';
import { AuthService } from './services/auth.service';
import { ApiKeyController } from './controllers/api-key.controller';

@Module({
    imports: [CommonModule],
    controllers: [ApiKeyController],
    providers: [AuthService],
    exports: [AuthService],
})
export class AuthModule { } 