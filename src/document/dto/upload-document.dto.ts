import { IsOptional, IsString } from 'class-validator';

export class UploadDocumentDto {
    @IsOptional()
    @IsString()
    documentType?: string;

    @IsOptional()
    @IsString()
    language?: string;
} 