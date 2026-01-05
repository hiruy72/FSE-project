# File Upload Features for Chat Sessions

## Overview
The chat system now supports uploading and sharing images and files during mentoring sessions.

## Features Added

### Backend Changes
- **Database Schema**: Updated `messages` table with new columns:
  - `message_type`: 'text', 'image', or 'file'
  - `file_url`: Path to uploaded file
  - `file_name`: Original filename
  - `file_size`: File size in bytes
  - `file_type`: MIME type

- **File Upload Handling**:
  - Uses `multer` for multipart form handling
  - 10MB file size limit
  - Secure file storage in `/backend/uploads/`
  - UUID-based filename generation to prevent conflicts

- **Supported File Types**:
  - Images: JPEG, PNG, GIF, WebP
  - Documents: PDF, Word, Excel, PowerPoint, TXT, CSV
  - Archives: ZIP, RAR
  - Code files: JS, HTML, CSS, JSON

- **New API Endpoints**:
  - `POST /api/chat/messages/upload` - Upload file with optional message
  - `GET /uploads/:filename` - Serve uploaded files

### Frontend Changes
- **File Selection**: Paperclip icon in message input for file selection
- **File Preview**: Shows selected file with name, size, and type before sending
- **Message Rendering**:
  - Images display as clickable thumbnails
  - Files show as download cards with file info
  - Both support optional text messages
- **File Download**: Direct download links for all file types

## Usage

### For Users
1. Click the paperclip icon in the chat input
2. Select a file (images, documents, etc.)
3. Optionally add a text message
4. Click "Send File" to upload and share

### For Developers
```javascript
// Upload a file
const formData = new FormData();
formData.append('file', fileObject);
formData.append('sessionId', sessionId);
formData.append('text', 'Optional message');

await chatAPI.uploadFile(formData, token);
```

## Security Features
- File type validation on both frontend and backend
- File size limits (10MB)
- Secure filename generation
- Session-based access control
- CORS protection

## File Storage
- Files stored in `/backend/uploads/` directory
- Unique UUID-based filenames prevent conflicts
- Files served through authenticated endpoints
- Automatic directory creation on first upload

## Message Types
- **Text**: Traditional text-only messages
- **Image**: Image files with optional text
- **File**: Document/archive files with optional text

All message types include timestamp and sender information for proper chat flow.