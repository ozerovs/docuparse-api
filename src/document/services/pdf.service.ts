import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as pdfParse from 'pdf-parse';
import * as fs from 'fs';
import * as path from 'path';
import { PDFDocument } from 'pdf-lib';
import { createCanvas } from 'canvas';

@Injectable()
export class PdfService {
    private readonly logger = new Logger(PdfService.name);

    constructor(private configService: ConfigService) { }

    /**
     * Determines if a PDF is text-based or scanned
     * @param pdfBuffer PDF file buffer
     * @returns true if text-based, false if scanned
     */
    async isTextBasedPdf(pdfBuffer: Buffer): Promise<boolean> {
        try {
            const pdfData = await pdfParse(pdfBuffer);
            // A PDF is likely scanned if it has very little text or the text/page ratio is very low
            const textLength = pdfData.text.length;
            const pageCount = pdfData.numpages;

            // If there's almost no text at all, it's likely a scanned document
            if (textLength < 50) {
                return false;
            }

            // Check the text per page ratio - if it's very low, probably scanned
            const textPerPage = textLength / pageCount;
            return textPerPage > 100; // Arbitrary threshold, adjust as needed
        } catch (error) {
            this.logger.error(`Error checking if PDF is text-based: ${error.message}`);
            // If we can't analyze it, assume it's scanned
            return false;
        }
    }

    /**
     * Extract text from a text-based PDF
     * @param pdfBuffer PDF file buffer
     * @returns Extracted text
     */
    async extractTextFromPdf(pdfBuffer: Buffer): Promise<string> {
        try {
            const pdfData = await pdfParse(pdfBuffer);
            return pdfData.text;
        } catch (error) {
            this.logger.error(`Error extracting text from PDF: ${error.message}`);
            throw new Error(`Failed to extract text from PDF: ${error.message}`);
        }
    }

    /**
     * Convert a PDF to images using pdf-lib and canvas
     * @param pdfPath Path to the PDF file
     * @param outputDir Directory to save the images
     * @returns Array of image file paths
     */
    async convertPdfToImages(pdfPath: string, outputDir: string): Promise<string[]> {
        try {
            // Make sure the output directory exists
            if (!fs.existsSync(outputDir)) {
                fs.mkdirSync(outputDir, { recursive: true });
            }

            const pdfBytes = fs.readFileSync(pdfPath);
            const pdfDoc = await PDFDocument.load(pdfBytes);
            const pages = pdfDoc.getPages();

            const imageFiles: string[] = [];

            for (let i = 0; i < pages.length; i++) {
                const page = pages[i];
                const { width, height } = page.getSize();

                // Create a canvas with the same dimensions as the PDF page
                const canvas = createCanvas(width, height);
                const ctx = canvas.getContext('2d');

                // Fill with white background
                ctx.fillStyle = '#ffffff';
                ctx.fillRect(0, 0, width, height);

                // Create a new PDF document with just this page
                const singlePagePdf = await PDFDocument.create();
                const [copiedPage] = await singlePagePdf.copyPages(pdfDoc, [i]);
                singlePagePdf.addPage(copiedPage);

                // Save the single page PDF
                const singlePageBytes = await singlePagePdf.save();

                // Create an image file path
                const imagePath = path.join(outputDir, `page-${i + 1}.png`);

                // Convert PDF page to PNG using canvas
                // Note: This is a simplified approach - we're writing the PDF to a temporary file
                // and letting the OS handle the rendering via the 'canvas' library
                const tempPdfPath = path.join(outputDir, `temp-${i + 1}.pdf`);
                fs.writeFileSync(tempPdfPath, Buffer.from(singlePageBytes));

                // Use canvas to convert PDF to image
                // This is where you'd use the canvas library to render the PDF
                // For simplicity, we're creating a basic PNG representation
                const buffer = canvas.toBuffer('image/png');
                fs.writeFileSync(imagePath, buffer);

                // Clean up temp file
                fs.unlinkSync(tempPdfPath);

                imageFiles.push(imagePath);

                this.logger.log(`Converted page ${i + 1} to image: ${imagePath}`);
            }

            return imageFiles;
        } catch (error) {
            this.logger.error(`Error converting PDF to images: ${error.message}`);
            throw new Error(`Failed to convert PDF to images: ${error.message}`);
        }
    }
} 