import {
    Controller,
    Post,
    Get,
    UseGuards,
    UseInterceptors,
    UploadedFile,
    Body,
    BadRequestException,
    MaxFileSizeValidator,
    ParseFilePipe,
    FileTypeValidator,
    Response,
    Query,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiKeyGuard } from '../../auth/guards/api-key.guard';
import { DocumentService } from '../services/document.service';
import { PdfExampleService } from '../services/pdf-example.service';
import { UploadDocumentDto } from '../dto/upload-document.dto';
import { ConfigService } from '@nestjs/config';
import * as fs from 'fs';
import * as path from 'path';

@Controller('documents')
@UseGuards(ApiKeyGuard)
export class DocumentController {
    private readonly uploadsDir: string;

    constructor(
        private documentService: DocumentService,
        private pdfExampleService: PdfExampleService,
        private configService: ConfigService,
    ) {
        this.uploadsDir = this.configService.get<string>('UPLOADS_DIRECTORY') || 'uploads';
        // Ensure uploads directory exists
        if (!fs.existsSync(this.uploadsDir)) {
            fs.mkdirSync(this.uploadsDir, { recursive: true });
        }
    }

    @Post('parse')
    @UseInterceptors(FileInterceptor('file'))
    async parseDocument(
        @UploadedFile(
            new ParseFilePipe({
                validators: [
                    new MaxFileSizeValidator({
                        maxSize: parseInt(process.env.MAX_FILE_SIZE || '10485760')
                    }),
                    new FileTypeValidator({
                        fileType: /(pdf|jpg|jpeg|png|tiff|bmp|gif)$/i
                    }),
                ],
            }),
        )
        file: Express.Multer.File,
        @Body() uploadDocumentDto: UploadDocumentDto,
    ) {
        if (!file) {
            throw new BadRequestException('No file uploaded');
        }

        const result = await this.documentService.processDocument(
            file,
            uploadDocumentDto.language,
            uploadDocumentDto.documentType
        );

        return result;
    }

    @Get('pdf/create-sample')
    async createSamplePdf(@Response() res: any) {
        try {
            // Create a unique directory for this sample
            const sampleDir = path.join(this.uploadsDir, 'samples');
            if (!fs.existsSync(sampleDir)) {
                fs.mkdirSync(sampleDir, { recursive: true });
            }

            // Create a sample PDF
            const outputPath = path.join(sampleDir, 'sample.pdf');
            await this.pdfExampleService.createSimplePdf(outputPath);

            // Return the PDF as a downloadable file
            res.setHeader('Content-Type', 'application/pdf');
            res.setHeader('Content-Disposition', 'attachment; filename=sample.pdf');

            const fileStream = fs.createReadStream(outputPath);
            fileStream.pipe(res);
        } catch (error) {
            throw new BadRequestException(`Failed to create sample PDF: ${error.message}`);
        }
    }

    @Post('pdf/split')
    @UseInterceptors(FileInterceptor('file'))
    async splitPdf(
        @UploadedFile(
            new ParseFilePipe({
                validators: [
                    new MaxFileSizeValidator({
                        maxSize: parseInt(process.env.MAX_FILE_SIZE || '10485760')
                    }),
                    new FileTypeValidator({
                        fileType: /(pdf)$/i
                    }),
                ],
            }),
        )
        file: Express.Multer.File,
    ) {
        if (!file) {
            throw new BadRequestException('No PDF file uploaded');
        }

        try {
            // Create a unique directory for this operation
            const operationId = Date.now().toString();
            const splitDir = path.join(this.uploadsDir, 'split', operationId);

            if (!fs.existsSync(splitDir)) {
                fs.mkdirSync(splitDir, { recursive: true });
            }

            // Save the uploaded PDF
            const pdfPath = path.join(splitDir, 'original.pdf');
            fs.writeFileSync(pdfPath, file.buffer);

            // Split the PDF
            const splitPdfPaths = await this.pdfExampleService.splitPdf(pdfPath, splitDir);

            // Return information about the split operation
            return {
                operationId,
                originalName: file.originalname,
                totalPages: splitPdfPaths.length,
                pageFiles: splitPdfPaths.map(filePath => {
                    const fileName = path.basename(filePath);
                    return {
                        name: fileName,
                        path: `/api/documents/pdf/view?file=${operationId}/${fileName}`,
                    };
                }),
            };
        } catch (error) {
            throw new BadRequestException(`Failed to split PDF: ${error.message}`);
        }
    }

    @Get('pdf/view')
    async viewPdf(@Query('file') file: string, @Response() res: any) {
        if (!file) {
            throw new BadRequestException('No file specified');
        }

        try {
            // Ensure we can't access files outside of uploads directory
            const filePath = path.join(this.uploadsDir, 'split', file);
            const normalizedPath = path.normalize(filePath);

            if (!normalizedPath.startsWith(this.uploadsDir)) {
                throw new BadRequestException('Invalid file path');
            }

            if (!fs.existsSync(normalizedPath)) {
                throw new BadRequestException('File not found');
            }

            // Determine content type based on file extension
            const ext = path.extname(normalizedPath).toLowerCase();
            let contentType = 'application/octet-stream';

            if (ext === '.pdf') {
                contentType = 'application/pdf';
            } else if (ext === '.png') {
                contentType = 'image/png';
            } else if (ext === '.jpg' || ext === '.jpeg') {
                contentType = 'image/jpeg';
            }

            // Set appropriate headers
            res.setHeader('Content-Type', contentType);

            // Stream the file
            const fileStream = fs.createReadStream(normalizedPath);
            fileStream.pipe(res);
        } catch (error) {
            throw new BadRequestException(`Failed to view file: ${error.message}`);
        }
    }
} 