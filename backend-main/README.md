# Adaptive Collaborative Learning - Backend

## Overview

Backend API for the Adaptive Collaborative Learning platform built with Express.js, TypeScript, MongoDB, and Firebase Admin SDK.

## Tech Stack

- **Runtime**: Node.js 25.x
- **Language**: TypeScript 5.9.3
- **Framework**: Express.js 4.21.2
- **Database**: MongoDB (Mongoose 9.0.0)
- **Authentication**: Firebase Admin SDK 12.0.0

## Setup Instructions

### 1. Install Dependencies

```bash
npm install
```

### 2. Configure Environment Variables

Create a `.env` file in the root directory:

```env
# MongoDB Connection
MONGO_URI=mongodb://localhost:27017/adaptive-learning

# Server Configuration
PORT=5001
NODE_ENV=development

# Admin Access
ADMIN_EMAIL=admin@example.com
```

### 3. Configure Firebase Admin SDK (IMPORTANT)

**⚠️ SECURITY NOTICE**: Never commit Firebase service account credentials to version control.

#### Option A: Using Environment Variables (Recommended for Production)

Set the following environment variables:

```env
FIREBASE_PROJECT_ID=your-project-id
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
FIREBASE_CLIENT_EMAIL=firebase-adminsdk-xxxxx@your-project.iam.gserviceaccount.com
```

Then update `server.ts` to use environment variables:

```typescript
admin.initializeApp({
  credential: admin.credential.cert({
    projectId: process.env.FIREBASE_PROJECT_ID,
    privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n"),
    clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
  }),
});
```

#### Option B: Using Service Account File (Development Only)

1. Download your Firebase service account JSON from Firebase Console
2. Rename it to `firebase-service-account.json`
3. Place it in the project root (it's already in .gitignore)
4. The server will automatically load it

**Never commit this file to git!**

### 4. Seed Initial Data

```bash
npm run seed:users
```

This creates:

- Admin user: `admin@example.com` (role: admin)
- Student user: `student@example.com` (role: student)

### 5. Run the Server

Development mode (with auto-reload):

```bash
npm run dev
```

Production mode:

```bash
npm run build
npm start
```

## API Documentation

### Authentication

All protected endpoints require a Firebase ID token in the Authorization header:

```
Authorization: Bearer <firebase-id-token>
```

### Endpoints

#### Public

- `GET /api/health` - Health check

#### User Management

- `POST /api/sync/user` - Create/update user
- `POST /api/sync/login-time` - Record login timestamp
- `GET /api/users` - Get all users (admin only)
- `POST /api/profile` - Get user profile

#### Scores & Learning

- `POST /api/scores` - Save exam score
- `POST /api/appdata` - Save app state
- `GET /api/appdata` - Get app state

#### Activities & Collaboration

- `POST /api/activity/file` - Save file metadata
- `POST /api/activity/message` - Save message

#### Admin

- `POST /api/loginEvent` - Record login event
- `GET /api/loginEvents` - Get login events (admin only)

See [API_SYNC_ENDPOINTS.md](./API_SYNC_ENDPOINTS.md) for detailed API documentation.

## Security Best Practices

### Credential Management

1. **Never commit credentials** to version control
2. **Use environment variables** for sensitive data
3. **Rotate credentials** regularly
4. **Use different credentials** for development and production
5. **Limit service account permissions** to minimum required

### Firebase Service Account Security

- Store service account JSON outside the repository
- Use secret management services (AWS Secrets Manager, Google Secret Manager, etc.)
- Set appropriate IAM permissions
- Enable audit logging
- Rotate keys every 90 days

### If Credentials Are Compromised

1. Immediately revoke the compromised service account
2. Create a new service account with fresh credentials
3. Update all environments with new credentials
4. Review audit logs for unauthorized access
5. Notify your security team

## Project Structure

```
backend/
├── models/              # Mongoose models
│   ├── User.ts         # User model with firebaseUid
│   ├── Score.ts        # Exam scores
│   ├── Activity.ts     # File metadata
│   ├── Message.ts      # Chat messages
│   └── index.ts        # Barrel exports
├── routes/             # Express routes
│   └── sync.ts         # Sync endpoints
├── scripts/            # Utility scripts
│   └── seedUsers.ts    # Seed initial users
├── server.ts           # Main entry point
├── package.json        # Dependencies
├── tsconfig.json       # TypeScript config
└── .env               # Environment variables (not in git)
```

## Development

### Running Tests

```bash
npm test
```

### Building for Production

```bash
npm run build
```

### Linting

```bash
npm run lint
```

## Environment Variables Reference

| Variable              | Required | Default     | Description                         |
| --------------------- | -------- | ----------- | ----------------------------------- |
| MONGO_URI             | Yes      | -           | MongoDB connection string           |
| PORT                  | No       | 5001        | Server port                         |
| ADMIN_EMAIL           | Yes      | -           | Admin user email for access control |
| NODE_ENV              | No       | development | Environment mode                    |
| FIREBASE_PROJECT_ID   | Yes\*    | -           | Firebase project ID                 |
| FIREBASE_PRIVATE_KEY  | Yes\*    | -           | Firebase private key                |
| FIREBASE_CLIENT_EMAIL | Yes\*    | -           | Firebase client email               |

\*Required if not using service account JSON file

## Troubleshooting

### MongoDB Connection Issues

- Ensure MongoDB is running: `mongod --version`
- Check connection string in `.env`
- Verify network access to MongoDB server

### Firebase Authentication Issues

- Verify service account credentials are correct
- Check Firebase project settings
- Ensure service account has necessary permissions

### Port Already in Use

```bash
# Find process using port 5001
lsof -i :5001

# Kill the process
kill -9 <PID>
```

## Contributing

1. Create a feature branch
2. Make your changes
3. Write tests
4. Submit a pull request

## License

ISC
