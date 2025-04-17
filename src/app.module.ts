import { Module } from '@nestjs/common';
import { ConfigModule } from './config/config.module';
import { CommonModule } from './common/common.module';
import { AuthModule } from './auth/auth.module';
import { OcrModule } from './ocr/ocr.module';
import { DocumentModule } from './document/document.module';
import { MulterModule } from '@nestjs/platform-express';
import { ServeStaticModule } from '@nestjs/serve-static';
import { join } from 'path';

@Module({
  imports: [
    ConfigModule,
    CommonModule,
    AuthModule,
    OcrModule,
    DocumentModule,
    MulterModule.register({
      dest: join(process.cwd(), process.env.UPLOADS_DIRECTORY || 'uploads'),
    }),
    ServeStaticModule.forRoot({
      rootPath: join(__dirname, '..', 'public'),
      serveRoot: '/',
    }),
  ],
  controllers: [],
  providers: [],
})
export class AppModule { }
