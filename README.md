# QuestGage - Student Exam Proctoring System

A React-based proctoring application that uses webcam analysis to detect student confusion and anomalies during exams. Features a real-time teacher dashboard with analytics and per-question timing insights.

## Features

### Core
- **Student Exam Interface**: Timed physics exam with question navigation
- **Student Identification**: Student ID input before exam for tracking
- **Per-Question Timers**: Track time spent on each question (pause/resume on navigation)
- **Webcam Monitoring**: Periodic snapshots tagged with student ID and concept
- **Confusion Detection**: AWS Rekognition analyzes facial expressions

### Teacher Dashboard
- **Quick Stats**: Total students, average exam time, confusion events, average confusion %
- **Time per Question Chart**: Color-coded bar chart (green < 1min, orange 1-1.5min, red > 1.5min)
- **Confusion by Topic Chart**: Horizontal bar chart showing confusion rate by concept
- **Student Performance Table**: Per-student time breakdown with highlighting
- **Real-time Alerts**: Anomaly detection (multiple faces) and confusion hot-spots

### Security & Performance
- **Rate Limiting**: 
  - Manual webcam captures: 3 per minute
  - Dashboard refresh: 5 per minute
  - Login attempts: 3 before 30s lockout
- **Double-Submit Prevention**: Exam submission protected against duplicate clicks
- **Optimized Rendering**: Question timers use refs to prevent re-renders
- **Image Optimization**: Webcam captures at 80% quality for smaller uploads

### UI/UX
- **Dark Glassmorphism UI**: Premium sci-fi aesthetic
- **Aurora Background Effect**: Dynamic, animated background
- **Responsive Design**: Works on various screen sizes

## Tech Stack
- React 18 + Vite
- Tailwind CSS
- Framer Motion
- Chart.js / react-chartjs-2
- AWS SDK (S3, DynamoDB)
- Lucide React Icons

## Setup & Installation

### 1. Prerequisites
- Node.js (v18+)
- AWS Account with S3 and DynamoDB access

### 2. AWS Setup

#### DynamoDB Tables
Create two tables in DynamoDB (region: `ap-south-1`):

1. **ProctorResults** (for emotion data)
   - Partition Key: `SnapshotID` (String)

2. **ProctorTimingData** (for question timing)
   - Partition Key: `StudentID` (String)
   - Sort Key: `SessionID` (String)

#### IAM Policy
Your IAM user needs the following policy:
```json
{
    "Version": "2012-10-17",
    "Statement": [
        {
            "Effect": "Allow",
            "Action": [
                "dynamodb:PutItem",
                "dynamodb:Scan",
                "dynamodb:GetItem",
                "dynamodb:Query"
            ],
            "Resource": "arn:aws:dynamodb:ap-south-1:YOUR_ACCOUNT_ID:table/*"
        },
        {
            "Effect": "Allow",
            "Action": ["s3:PutObject", "s3:GetObject"],
            "Resource": "arn:aws:s3:::YOUR_BUCKET_NAME/*"
        }
    ]
}
```

### 3. Environment Variables
Create a `.env` file in the root directory:

```bash
VITE_AWS_ACCESS_KEY_ID=your_access_key
VITE_AWS_SECRET_ACCESS_KEY=your_secret_key
VITE_AWS_REGION=ap-south-1
VITE_DYNAMODB_TABLE=ProctorResults
VITE_DYNAMODB_TIMING_TABLE=ProctorTimingData
VITE_S3_BUCKET=your-bucket-name
```

### 4. Install & Run
```bash
npm install
npm run dev
```

## Usage

### Student Flow
1. Navigate to http://localhost:5173/
2. Enter your Student ID
3. Read instructions and start the exam
4. Answer questions (timer tracks time per question)
5. Submit exam when complete

### Teacher Flow
1. Navigate to http://localhost:5173/teacher
2. Login with password: `admin123`
3. View analytics, charts, and alerts
4. Use Refresh button to update data

## Project Structure
```
src/
├── components/
│   ├── Dashboard.jsx      # Teacher analytics dashboard
│   ├── Exam.jsx           # Student exam interface
│   └── WebcamCapture.jsx  # Webcam monitoring component
├── lib/
│   └── useQuestionTimers.js  # Custom hook for question timing
├── utils/
│   ├── aws-config.js      # AWS SDK configuration
│   └── rateLimit.js       # Rate limiting utilities
├── data/
│   └── questions.js       # Exam questions
└── index.css              # Global styles
```

## Security Note
> ⚠️ This project uses AWS keys on the client-side for prototype demonstration purposes. **DO NOT use this architecture in production.** For a production app, use AWS Cognito or a backend proxy to handle credential signing.

## License
MIT
