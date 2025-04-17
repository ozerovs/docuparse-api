import { Injectable, Logger } from '@nestjs/common';
import { createWorker } from 'tesseract.js';
import francModule from 'franc';

@Injectable()
export class OcrService {
    private readonly logger = new Logger(OcrService.name);
    private francModule: any;

    constructor() {
        // We'll load franc dynamically
        this.loadFranc().catch(err => {
            this.logger.error(`Failed to load franc module: ${err.message}`);
        });
    }

    private async loadFranc() {
        try {
            // Dynamically import franc
            this.francModule = francModule;
        } catch (error) {
            this.logger.error(`Error loading franc module: ${error.message}`);
            throw error;
        }
    }

    async detectLanguage(text: string): Promise<string> {
        try {
            // Get the most likely language
            if (!text || text.trim().length < 20) {
                return 'eng'; // Default to English for very short text
            }

            // Make sure franc is loaded
            if (!this.francModule) {
                await this.loadFranc();
            }

            const langCode = this.francModule.franc(text, { minLength: 20 });

            if (langCode && langCode !== 'und') {
                return this.convertToTesseractLanguage(langCode);
            }

            return 'eng'; // Default to English if detection fails
        } catch (error) {
            this.logger.error(`Error detecting language: ${error.message}`);
            return 'eng'; // Default to English
        }
    }

    // Convert language codes that franc returns to Tesseract language codes when needed
    private convertToTesseractLanguage(langCode: string): string {
        const langMap = {
            'cmn': 'chi_sim', // Mandarin Chinese to Simplified Chinese
            'jpn': 'jpn',     // Japanese
            'kor': 'kor',     // Korean
            'eng': 'eng',     // English
            'deu': 'deu',     // German
            'fra': 'fra',     // French
            'spa': 'spa',     // Spanish
            'ita': 'ita',     // Italian
            'rus': 'rus',     // Russian
            'ara': 'ara',     // Arabic
            'hin': 'hin',     // Hindi
            'ben': 'ben',     // Bengali
            'por': 'por',     // Portuguese
            'urd': 'urd',     // Urdu
            // Add more mappings as needed
        };

        return langMap[langCode] || langCode; // Return mapped code or original if no mapping exists
    }

    async performOcr(imagePath: string, languageHint?: string): Promise<{ text: string; detectedLanguage: string }> {
        try {
            // If no language hint is provided, we'll use English as default
            const language = languageHint || 'eng';

            // Create a worker with the specified language
            const worker = await createWorker(language);

            // Recognize text from the image
            const result = await worker.recognize(imagePath);

            // Get the text from the result
            const extractedText = result.data.text;

            // Detect language using franc
            const detectedLanguage = await this.detectLanguage(extractedText);

            // Terminate the worker
            await worker.terminate();

            return {
                text: extractedText,
                detectedLanguage,
            };
        } catch (error) {
            this.logger.error(`Error performing OCR: ${error.message}`);
            throw new Error(`Failed to perform OCR: ${error.message}`);
        }
    }

    // Additional method for document classification
    classifyDocument(text: string): string {
        const lowerText = text.toLowerCase();

        // Simple keyword matching for document classification
        if (lowerText.includes('invoice') || lowerText.includes('bill to') || lowerText.includes('invoice number')) {
            return 'invoice';
        } else if (lowerText.includes('receipt') || lowerText.includes('payment received') || lowerText.includes('amount paid')) {
            return 'receipt';
        } else if (lowerText.includes('contract') || lowerText.includes('agreement') || lowerText.includes('terms and conditions')) {
            return 'contract';
        } else if (lowerText.includes('id') || lowerText.includes('identification') || lowerText.includes('passport') || lowerText.includes('driver')) {
            return 'identification';
        } else {
            return 'unknown';
        }
    }

    // Extract structured fields based on document type
    extractFields(text: string, documentType: string): Record<string, any> {
        const lowerText = text.toLowerCase();
        const fields: Record<string, any> = {};

        switch (documentType) {
            case 'invoice':
                // Extract invoice number
                const invoiceNumberMatch = text.match(/invoice\s*(?:no|number|#)[:.\s]*([A-Za-z0-9-]+)/i);
                if (invoiceNumberMatch && invoiceNumberMatch[1]) {
                    fields.invoiceNumber = invoiceNumberMatch[1].trim();
                }

                // Extract date
                const dateMatch = text.match(/date[:.\s]*([\d\/\-\.]+)/i);
                if (dateMatch && dateMatch[1]) {
                    fields.date = dateMatch[1].trim();
                }

                // Extract total amount
                const totalMatch = text.match(/total[:.\s]*[$€£]?[\s]*([\d,.]+)/i);
                if (totalMatch && totalMatch[1]) {
                    fields.totalAmount = totalMatch[1].trim();
                }
                break;

            case 'receipt':
                // Extract receipt number
                const receiptNumberMatch = text.match(/receipt\s*(?:no|number|#)[:.\s]*([A-Za-z0-9-]+)/i);
                if (receiptNumberMatch && receiptNumberMatch[1]) {
                    fields.receiptNumber = receiptNumberMatch[1].trim();
                }

                // Extract date
                const receiptDateMatch = text.match(/date[:.\s]*([\d\/\-\.]+)/i);
                if (receiptDateMatch && receiptDateMatch[1]) {
                    fields.date = receiptDateMatch[1].trim();
                }

                // Extract total amount
                const receiptTotalMatch = text.match(/total[:.\s]*[$€£]?[\s]*([\d,.]+)/i);
                if (receiptTotalMatch && receiptTotalMatch[1]) {
                    fields.totalAmount = receiptTotalMatch[1].trim();
                }
                break;

            // Add more document types as needed

            default:
                // For unknown document types, don't extract specific fields
                break;
        }

        return fields;
    }
}
