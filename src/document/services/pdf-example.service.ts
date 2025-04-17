import { Injectable, Logger } from '@nestjs/common';
import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';
import * as fs from 'fs';
import * as path from 'path';
import { PdfUtils } from '../utils/pdf-utils';

/**
 * Example service demonstrating how to use pdf-lib for PDF operations
 */
@Injectable()
export class PdfExampleService {
    private readonly logger = new Logger(PdfExampleService.name);

    /**
     * Create a simple PDF document
     * @param outputPath Path to save the PDF
     * @returns Path to the created PDF
     */
    async createSimplePdf(outputPath: string): Promise<string> {
        try {
            // Create a new PDF document
            const pdfDoc = await PDFDocument.create();

            // Add a page
            const page = pdfDoc.addPage([600, 800]);

            // Embed a standard font
            const font = await pdfDoc.embedFont(StandardFonts.TimesRoman);

            // Draw some text
            page.drawText('PDF created with pdf-lib', {
                x: 50,
                y: 750,
                size: 24,
                font,
                color: rgb(0, 0.53, 0.71),
            });

            // Add information about pdf-lib
            page.drawText('This PDF was created using pdf-lib, a JavaScript', {
                x: 50,
                y: 700,
                size: 14,
                font,
            });

            page.drawText('library for creating and modifying PDF documents.', {
                x: 50,
                y: 680,
                size: 14,
                font,
            });

            // Save the PDF
            const pdfBytes = await pdfDoc.save();

            // Ensure output directory exists
            const outputDir = path.dirname(outputPath);
            if (!fs.existsSync(outputDir)) {
                fs.mkdirSync(outputDir, { recursive: true });
            }

            // Write to file
            fs.writeFileSync(outputPath, Buffer.from(pdfBytes));

            this.logger.log(`Created PDF at ${outputPath}`);
            return outputPath;
        } catch (error) {
            this.logger.error(`Error creating PDF: ${error.message}`);
            throw error;
        }
    }

    /**
     * Split a PDF into separate pages
     * @param inputPath Path to the input PDF
     * @param outputDir Directory to save the individual pages
     * @returns Array of paths to the individual page PDFs
     */
    async splitPdf(inputPath: string, outputDir: string): Promise<string[]> {
        try {
            // Read the PDF file
            const pdfBytes = fs.readFileSync(inputPath);
            const pdfDoc = await PDFDocument.load(pdfBytes);

            // Ensure output directory exists
            if (!fs.existsSync(outputDir)) {
                fs.mkdirSync(outputDir, { recursive: true });
            }

            const pageCount = pdfDoc.getPageCount();
            const outputPaths: string[] = [];

            // Extract each page into its own PDF
            for (let i = 0; i < pageCount; i++) {
                // Create a new PDF with just this page
                const newPdf = await PDFDocument.create();
                const [copiedPage] = await newPdf.copyPages(pdfDoc, [i]);
                newPdf.addPage(copiedPage);

                // Save the PDF
                const newPdfBytes = await newPdf.save();
                const outputPath = path.join(outputDir, `page-${i + 1}.pdf`);
                fs.writeFileSync(outputPath, Buffer.from(newPdfBytes));

                outputPaths.push(outputPath);

                // Also convert to image using our utility
                const imagePath = path.join(outputDir, `page-${i + 1}.png`);
                await PdfUtils.renderPageToImage(outputPath, 0, imagePath);
            }

            this.logger.log(`Split PDF into ${pageCount} pages`);
            return outputPaths;
        } catch (error) {
            this.logger.error(`Error splitting PDF: ${error.message}`);
            throw error;
        }
    }

    /**
     * Merge multiple PDFs into a single PDF
     * @param inputPaths Array of paths to the input PDFs
     * @param outputPath Path to save the merged PDF
     * @returns Path to the merged PDF
     */
    async mergePdfs(inputPaths: string[], outputPath: string): Promise<string> {
        try {
            // Create a new PDF document
            const mergedPdf = await PDFDocument.create();

            // Process each input PDF
            for (const inputPath of inputPaths) {
                // Read the PDF file
                const pdfBytes = fs.readFileSync(inputPath);
                const pdfDoc = await PDFDocument.load(pdfBytes);

                // Copy all pages
                const pages = await mergedPdf.copyPages(pdfDoc, pdfDoc.getPageIndices());

                // Add each page to the merged PDF
                for (const page of pages) {
                    mergedPdf.addPage(page);
                }
            }

            // Save the merged PDF
            const mergedPdfBytes = await mergedPdf.save();

            // Ensure output directory exists
            const outputDir = path.dirname(outputPath);
            if (!fs.existsSync(outputDir)) {
                fs.mkdirSync(outputDir, { recursive: true });
            }

            // Write to file
            fs.writeFileSync(outputPath, Buffer.from(mergedPdfBytes));

            this.logger.log(`Merged ${inputPaths.length} PDFs into ${outputPath}`);
            return outputPath;
        } catch (error) {
            this.logger.error(`Error merging PDFs: ${error.message}`);
            throw error;
        }
    }
} 