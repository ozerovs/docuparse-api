import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as fs from 'fs';
import * as path from 'path';
import { PdfService } from './pdf.service';
import { OcrService } from '../../ocr/services/ocr.service';
import { randomBytes } from 'crypto';

interface LanguageCount {
    [key: string]: number;
}

type DocumentResult = {
    documentType: string;
    language: string;
    text: string;
    fields: Record<string, any>;
    pages?: number;
    metadata?: Record<string, any>;
    warnings?: string[];
};

@Injectable()
export class DocumentService {
    private readonly logger = new Logger(DocumentService.name);
    private readonly uploadsDir: string;

    constructor(
        private configService: ConfigService,
        private pdfService: PdfService,
        private ocrService: OcrService,
    ) {
        this.uploadsDir = this.configService.get<string>('UPLOADS_DIRECTORY') || 'uploads';
        // Ensure uploads directory exists
        if (!fs.existsSync(this.uploadsDir)) {
            fs.mkdirSync(this.uploadsDir, { recursive: true });
        }
    }

    // Generate a unique ID using Node.js built-in crypto module
    private generateId(): string {
        return randomBytes(16).toString('hex');
    }

    /**
     * Process a file (PDF or image) and extract relevant information
     * @param file The uploaded file to process
     * @param languageHint Optional language hint
     * @param documentTypeHint Optional document type hint
     * @returns Processed document information
     */
    async processDocument(
        file: Express.Multer.File,
        languageHint?: string,
        documentTypeHint?: string,
    ): Promise<DocumentResult> {
        try {
            const fileExt = path.extname(file.originalname).toLowerCase();
            const warnings: string[] = [];

            // Create a unique folder for this document using built-in crypto
            const documentId = this.generateId();
            const documentDir = path.join(this.uploadsDir, documentId);
            fs.mkdirSync(documentDir, { recursive: true });

            // Save the original file
            const originalFilePath = path.join(documentDir, `original${fileExt}`);
            fs.writeFileSync(originalFilePath, file.buffer);

            let text: string;
            let detectedLanguage: string;

            // Process based on file type
            if (fileExt === '.pdf') {
                // Determine if PDF is text-based or scanned
                const isTextBased = await this.pdfService.isTextBasedPdf(file.buffer);

                if (isTextBased) {
                    // For text-based PDFs, extract text directly
                    text = await this.pdfService.extractTextFromPdf(file.buffer);
                    detectedLanguage = await this.ocrService.detectLanguage(text);
                } else {
                    try {
                        // For scanned PDFs, convert to images and perform OCR
                        const imagesPaths = await this.pdfService.convertPdfToImages(originalFilePath, path.join(documentDir, 'pages'));

                        // Process each page
                        const results = await Promise.all(
                            imagesPaths.map(imagePath => this.ocrService.performOcr(imagePath, languageHint))
                        );

                        // Combine text from all pages
                        text = results.map(r => r.text).join('\n\n');

                        // Use the most common language across pages
                        const languageCounts: LanguageCount = {};
                        results.forEach(r => {
                            languageCounts[r.detectedLanguage] = (languageCounts[r.detectedLanguage] || 0) + 1;
                        });

                        detectedLanguage = Object.entries(languageCounts)
                            .sort((a, b) => b[1] - a[1])
                            .map(entry => entry[0])[0];
                    } catch (error) {
                        this.logger.warn(`Failed to convert PDF to images: ${error.message}`);
                        warnings.push('Could not process scanned PDF completely. Using best-effort text extraction instead.');

                        // Fallback: extract text directly from the PDF as a best-effort approach
                        text = await this.pdfService.extractTextFromPdf(file.buffer);
                        detectedLanguage = await this.ocrService.detectLanguage(text);
                    }
                }
            } else if (['.jpg', '.jpeg', '.png', '.tiff', '.bmp', '.gif'].includes(fileExt)) {
                // For images, perform OCR directly
                const result = await this.ocrService.performOcr(originalFilePath, languageHint);
                text = result.text;
                detectedLanguage = result.detectedLanguage;
            } else {
                throw new Error(`Unsupported file type: ${fileExt}`);
            }

            // Determine document type (use hint if provided)
            const documentType = documentTypeHint || this.ocrService.classifyDocument(text);

            // Extract fields based on document type
            const fields = this.ocrService.extractFields(text, documentType);

            // Clean up temporary files (optional)
            // fs.rmSync(documentDir, { recursive: true, force: true });

            return {
                documentType,
                language: detectedLanguage,
                text,
                fields,
                warnings: warnings.length > 0 ? warnings : undefined,
                metadata: {
                    originalFilename: file.originalname,
                    fileSize: file.size,
                    fileType: file.mimetype,
                    documentId,
                },
            };
        } catch (error) {
            this.logger.error(`Error processing document: ${error.message}`);
            throw new Error(`Failed to process document: ${error.message}`);
        }
    }
} 