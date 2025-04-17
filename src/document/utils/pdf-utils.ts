import { PDFDocument } from 'pdf-lib';
import * as fs from 'fs';
import * as path from 'path';
import { createCanvas } from 'canvas';
import { Logger } from '@nestjs/common';

/**
 * Utility functions for PDF processing using pdf-lib
 */
export class PdfUtils {
    private static readonly logger = new Logger('PdfUtils');

    /**
     * Render a PDF page to an image
     * @param pdfPath Path to the PDF file
     * @param pageNumber Page number to render (0-based)
     * @param outputPath Path to save the output image
     * @returns Path to the rendered image
     */
    static async renderPageToImage(
        pdfPath: string,
        pageNumber: number,
        outputPath: string
    ): Promise<string> {
        try {
            // Read the PDF file
            const pdfBytes = fs.readFileSync(pdfPath);
            const pdfDoc = await PDFDocument.load(pdfBytes);

            // Check if the page exists
            if (pageNumber >= pdfDoc.getPageCount()) {
                throw new Error(`Page ${pageNumber} does not exist in the PDF`);
            }

            // Get the page
            const page = pdfDoc.getPage(pageNumber);
            const { width, height } = page.getSize();

            // Create a new PDF with just this page
            const singlePagePdf = await PDFDocument.create();
            const [copiedPage] = await singlePagePdf.copyPages(pdfDoc, [pageNumber]);
            singlePagePdf.addPage(copiedPage);

            // Save the single page PDF
            const singlePageBytes = await singlePagePdf.save();

            // Ensure output directory exists
            const outputDir = path.dirname(outputPath);
            if (!fs.existsSync(outputDir)) {
                fs.mkdirSync(outputDir, { recursive: true });
            }

            // Render to canvas
            const canvas = createCanvas(width, height);
            const ctx = canvas.getContext('2d');

            // Fill with white background
            ctx.fillStyle = '#ffffff';
            ctx.fillRect(0, 0, width, height);

            // Write to buffer and save
            const buffer = canvas.toBuffer('image/png');
            fs.writeFileSync(outputPath, buffer);

            return outputPath;
        } catch (error) {
            this.logger.error(`Error rendering PDF page to image: ${error.message}`);
            throw error;
        }
    }

    /**
     * Get information about a PDF document
     * @param pdfPath Path to the PDF file
     * @returns Object with PDF information
     */
    static async getPdfInfo(pdfPath: string): Promise<{
        pageCount: number;
        metadata: any;
        pageSize: { width: number; height: number }[];
    }> {
        try {
            // Read the PDF file
            const pdfBytes = fs.readFileSync(pdfPath);
            const pdfDoc = await PDFDocument.load(pdfBytes, {
                updateMetadata: false
            });

            // Get page sizes
            const pages = pdfDoc.getPages();
            const pageSize = pages.map(page => {
                const { width, height } = page.getSize();
                return { width, height };
            });

            // Return PDF information
            return {
                pageCount: pdfDoc.getPageCount(),
                metadata: {
                    title: pdfDoc.getTitle(),
                    author: pdfDoc.getAuthor(),
                    subject: pdfDoc.getSubject(),
                    keywords: pdfDoc.getKeywords(),
                    creator: pdfDoc.getCreator(),
                    producer: pdfDoc.getProducer(),
                    creationDate: pdfDoc.getCreationDate(),
                    modificationDate: pdfDoc.getModificationDate(),
                },
                pageSize,
            };
        } catch (error) {
            this.logger.error(`Error getting PDF info: ${error.message}`);
            throw error;
        }
    }
} 