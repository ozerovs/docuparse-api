# DocuParse API

A RESTful API service that performs OCR on documents (PDFs and images), detects language, classifies document types, and extracts structured information.

## Features

- File upload endpoint for PDFs and images
- Automatic detection of whether a PDF is text-based or scanned
- Text extraction from PDFs using pdf-parse
- OCR processing using Tesseract.js
- Language detection using franc-min
- Document type classification (invoice, receipt, contract, ID)
- Field extraction using regex patterns
- Supabase authentication for API key management
- API key protection for all endpoints

## Tech Stack

- **Backend**: NestJS with TypeScript
- **OCR**: Tesseract.js
- **PDF Processing**: pdf-parse, node-poppler (for scanned PDFs)
- **Authentication & Database**: Supabase (Auth + PostgreSQL)

## Prerequisites

- Node.js (v14+)
- Poppler (for PDF to image conversion)
- Supabase account and project

## Installation

1. Clone the repository:

```bash
git clone https://github.com/yourusername/docuparse-api.git
cd docuparse-api
```

2. Install dependencies:

```bash
npm install
```

3. Create a `.env` file in the root directory with your configuration:

```
PORT=3000
NODE_ENV=development

# Supabase
SUPABASE_URL=your_supabase_url
SUPABASE_KEY=your_supabase_anon_key
SUPABASE_JWT_SECRET=your_supabase_jwt_secret

# File Upload
MAX_FILE_SIZE=10485760 # 10MB
UPLOADS_DIRECTORY=uploads
```

4. Start the development server:

```bash
npm run start:dev
```

## Setting Up Supabase 

1. Create a new Supabase project
2. Set up the following tables:

```sql
-- API Keys Table
CREATE TABLE api_keys (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  key TEXT UNIQUE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  last_used_at TIMESTAMP WITH TIME ZONE,
  expires_at TIMESTAMP WITH TIME ZONE,
  is_active BOOLEAN DEFAULT true
);

-- Enable RLS
ALTER TABLE api_keys ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Users can view their own API keys" 
  ON api_keys FOR SELECT 
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own API keys" 
  ON api_keys FOR INSERT 
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own API keys" 
  ON api_keys FOR UPDATE 
  USING (auth.uid() = user_id);
```

## API Endpoints

### Authentication

API keys are managed through Supabase Authentication. The API endpoints for managing API keys are available for authenticated Supabase users:

- `POST /api/api-keys` - Generate a new API key
- `GET /api/api-keys` - List all API keys for the authenticated user
- `DELETE /api/api-keys/:id` - Revoke an API key

### Document Processing

All document processing endpoints require an API key in the `x-api-key` header.

- `POST /api/documents/parse` - Upload and process a document

  Request:
  ```
  Content-Type: multipart/form-data
  x-api-key: your_api_key

  file: [PDF or image file]
  language: (optional) ISO language code
  documentType: (optional) Invoice, Receipt, Contract, etc.
  ```

  Response:
  ```json
  {
    "documentType": "invoice",
    "language": "eng",
    "text": "...",
    "fields": {
      "invoiceNumber": "INV-12345",
      "date": "2023-05-15",
      "totalAmount": "1250.00"
    },
    "metadata": {
      "originalFilename": "invoice.pdf",
      "fileSize": 125000,
      "fileType": "application/pdf",
      "documentId": "abc123xyz"
    }
  }
  ```

## License

This project is licensed under the MIT License.
