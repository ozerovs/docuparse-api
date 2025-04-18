import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { DocumentService } from './services/document.service';
import { PdfService } from './services/pdf.service';
import { PdfExampleService } from './services/pdf-example.service';
import { OcrModule } from '../ocr/ocr.module';
import { DocumentController } from './controllers/document.controller';
import { AuthModule } from '../auth/auth.module';
import { CommonModule } from '../common/common.module';

@Module({
    imports: [ConfigModule, OcrModule, AuthModule, CommonModule],
    controllers: [DocumentController],
    providers: [DocumentService, PdfService, PdfExampleService],
    exports: [DocumentService, PdfService, PdfExampleService],
})
export class DocumentModule { } 