# ProctorAI - Student Exam Proctoring System

A React-based proctoring application that uses webcam analysis to detect student confusion and anomalies during exams. Features a real-time teacher dashboard with analytics.

## Features
- **Student Exam Interface**: Timed physics exam with question navigation.
- **Webcam Monitoring**: Captures periodic snapshots (tagged with exam concept).
- **Confusion Detection**: Uses AWS Rekognition to analyze facial expressions.
- **Teacher Dashboard**: Real-time alerts for anomalies (multiple faces) and confusion hot-spots by concept.
- **Dark Glassmorphism UI**: Premium sci-fi aesthetic.

> **Note**: This project utilizes a **Manual Snapping** feature for capturing exam snapshots. Automatic snapping is disabled to optimize for free-tier cloud service usage.

## Setup & Installation

### 1. Prerequisites
- Node.js (v18+)
- AWS Account with S3 and DynamoDB access.

### 2. Environment Variables
**CRITICAL**: You must set up your AWS credentials securely. 
Create a `.env` file in the root directory:

```bash
# .env
VITE_AWS_ACCESS_KEY_ID=your_access_key
VITE_AWS_SECRET_ACCESS_KEY=your_secret_key
VITE_AWS_REGION=ap-south-1
VITE_DYNAMODB_TABLE=ProctorResults
VITE_S3_BUCKET=proctor-snapshots-vbg1
```

### 3. Install Dependencies
```bash
npm install
```

### 4. Run Development Server
```bash
npm run dev
```

## Security Note
This project uses AWS keys on the client-side for prototype demonstration purposes. 
**DO NOT use this architecture in production.** 
For a production app, use AWS Cognito or a backend proxy to handle credential signing.

## Tech Stack
- React + Vite
- Chart.js
- AWS SDK (S3, DynamoDB)
- Lucide React Icons
