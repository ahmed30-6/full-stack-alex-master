# Migration Guide - Security Cleanup

## Overview

This guide helps you migrate from hardcoded Firebase service account files to secure environment variable configuration.

## What Changed

### Before (Insecure)

- Service account JSON file committed to repository
- Hardcoded file path in code
- Same credentials for all environments

### After (Secure)

- Service account credentials in environment variables
- No credentials in repository
- Different credentials per environment

## Migration Steps

### Step 1: Backup Current Credentials

```bash
# If you have the old service account file, back it up
cp adaptive-collaborative-learn-firebase-adminsdk-fbsvc-baa1399a32.json ~/backup/
```

### Step 2: Extract Credentials

Open your service account JSON file and extract:

- `project_id`
- `private_key`
- `client_email`

### Step 3: Set Environment Variables

#### Development (.env file)

Create `.env` file:

```env
MONGO_URI=mongodb://localhost:27017/adaptive-learning
PORT=5001
ADMIN_EMAIL=admin@example.com

FIREBASE_PROJECT_ID=your-project-id
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nYOUR_KEY_HERE\n-----END PRIVATE KEY-----\n"
FIREBASE_CLIENT_EMAIL=firebase-adminsdk-xxxxx@your-project.iam.gserviceaccount.com
```

**Important**: The private key must be in quotes and newlines must be `\n`

#### Production (Platform-specific)

**Heroku**:

```bash
heroku config:set FIREBASE_PROJECT_ID=your-project-id
heroku config:set FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
heroku config:set FIREBASE_CLIENT_EMAIL=firebase-adminsdk-xxxxx@your-project.iam.gserviceaccount.com
```

**AWS Elastic Beanstalk**:

```bash
eb setenv FIREBASE_PROJECT_ID=your-project-id \
  FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n" \
  FIREBASE_CLIENT_EMAIL=firebase-adminsdk-xxxxx@your-project.iam.gserviceaccount.com
```

**Docker**:

```yaml
# docker-compose.yml
environment:
  - FIREBASE_PROJECT_ID=your-project-id
  - FIREBASE_PRIVATE_KEY=-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n
  - FIREBASE_CLIENT_EMAIL=firebase-adminsdk-xxxxx@your-project.iam.gserviceaccount.com
```

**Kubernetes**:

```bash
kubectl create secret generic firebase-credentials \
  --from-literal=project-id=your-project-id \
  --from-literal=private-key="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n" \
  --from-literal=client-email=firebase-adminsdk-xxxxx@your-project.iam.gserviceaccount.com
```

### Step 4: Remove Old Service Account File

```bash
# Remove the old file
rm adaptive-collaborative-learn-firebase-adminsdk-fbsvc-baa1399a32.json

# Or rename it for local development
mv adaptive-collaborative-learn-firebase-adminsdk-fbsvc-baa1399a32.json firebase-service-account.json
```

### Step 5: Test the Configuration

```bash
# Start the server
npm run dev

# You should see:
# ✅ Firebase Admin initialized from environment variables.
# or
# ✅ Firebase Admin initialized from service account file.
```

### Step 6: Verify Functionality

Test key endpoints:

```bash
# Health check
curl http://localhost:5001/api/health

# Test authentication (with valid Firebase token)
curl -H "Authorization: Bearer YOUR_TOKEN" \
  http://localhost:5001/api/users
```

### Step 7: Clean Git History (If Credentials Were Committed)

**WARNING**: This rewrites git history. Coordinate with your team.

```bash
# Install BFG Repo-Cleaner
brew install bfg  # macOS
# or download from https://rtyley.github.io/bfg-repo-cleaner/

# Remove the file from history
bfg --delete-files adaptive-collaborative-learn-firebase-adminsdk-fbsvc-baa1399a32.json

# Clean up
git reflog expire --expire=now --all
git gc --prune=now --aggressive

# Force push (coordinate with team first!)
git push --force --all
```

### Step 8: Rotate Credentials

Since the old credentials may have been exposed:

1. Go to [Firebase Console](https://console.firebase.google.com)
2. Select your project
3. Go to Project Settings → Service Accounts
4. Click "Manage service account permissions"
5. Delete the old service account
6. Create a new service account
7. Download new credentials
8. Update environment variables with new credentials

## Troubleshooting

### Error: "Firebase Admin SDK not initialized"

**Cause**: Environment variables not set or service account file missing

**Solution**:

1. Check `.env` file exists and has correct values
2. Verify environment variables are loaded: `console.log(process.env.FIREBASE_PROJECT_ID)`
3. Check for typos in variable names
4. Ensure private key has proper newline escaping

### Error: "Invalid service account"

**Cause**: Malformed private key or incorrect credentials

**Solution**:

1. Verify private key is properly escaped: `\n` for newlines
2. Ensure private key is in quotes in `.env` file
3. Check that all three variables are set (project_id, private_key, client_email)
4. Download fresh credentials from Firebase Console

### Error: "Permission denied"

**Cause**: Service account lacks necessary permissions

**Solution**:

1. Go to Firebase Console → IAM & Admin
2. Find your service account
3. Add required roles:
   - Firebase Admin SDK Administrator Service Agent
   - Firebase Authentication Admin

## Rollback Plan

If you need to rollback:

1. Restore the old service account file from backup
2. Revert the code changes:

```bash
git revert <commit-hash>
```

3. Restart the server

## Verification Checklist

- [ ] Environment variables set correctly
- [ ] Server starts without errors
- [ ] Firebase authentication works
- [ ] Old service account file removed from repository
- [ ] `.gitignore` updated
- [ ] Team members notified of changes
- [ ] Production environment updated
- [ ] Credentials rotated (if exposed)
- [ ] Documentation updated

## Support

If you encounter issues:

1. Check the logs for specific error messages
2. Verify environment variables are set: `printenv | grep FIREBASE`
3. Test with a fresh service account
4. Review [SECURITY.md](./SECURITY.md) for best practices

## Next Steps

After successful migration:

1. Set up credential rotation schedule (every 90 days)
2. Enable Firebase audit logging
3. Implement monitoring for authentication failures
4. Document the process for your team
5. Consider using a secret management service for production
