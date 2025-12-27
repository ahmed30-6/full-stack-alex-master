# Security Guidelines

## 🔐 Credential Management

### Firebase Service Account

**CRITICAL**: Firebase service account credentials provide full access to your Firebase project. Treat them like passwords.

#### What NOT to Do ❌

- ❌ Never commit service account JSON files to git
- ❌ Never share credentials in Slack, email, or chat
- ❌ Never hardcode credentials in source code
- ❌ Never use production credentials in development
- ❌ Never store credentials in public repositories

#### What to Do ✅

- ✅ Use environment variables for credentials
- ✅ Store credentials in secure secret management systems
- ✅ Use different credentials for dev/staging/production
- ✅ Rotate credentials every 90 days
- ✅ Limit service account permissions to minimum required
- ✅ Enable audit logging
- ✅ Review access logs regularly

### Environment Variables

Store sensitive configuration in `.env` file (never commit this file):

```env
# MongoDB
MONGO_URI=mongodb://localhost:27017/adaptive-learning

# Firebase Admin SDK
FIREBASE_PROJECT_ID=your-project-id
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
FIREBASE_CLIENT_EMAIL=firebase-adminsdk-xxxxx@your-project.iam.gserviceaccount.com

# Admin Access
ADMIN_EMAIL=admin@example.com

# Server
PORT=5001
NODE_ENV=production
```

### Secret Management Services

For production deployments, use:

- **AWS**: AWS Secrets Manager or AWS Systems Manager Parameter Store
- **Google Cloud**: Google Secret Manager
- **Azure**: Azure Key Vault
- **Kubernetes**: Kubernetes Secrets
- **Docker**: Docker Secrets
- **Heroku**: Heroku Config Vars

## 🚨 If Credentials Are Compromised

### Immediate Actions

1. **Revoke the compromised service account** in Firebase Console
2. **Create a new service account** with fresh credentials
3. **Update all environments** with new credentials
4. **Review audit logs** for unauthorized access
5. **Notify your security team** immediately

### Firebase Console Steps

1. Go to Firebase Console → Project Settings → Service Accounts
2. Click "Manage service account permissions"
3. Find the compromised account
4. Click "Delete" or "Disable"
5. Create a new service account
6. Download new credentials
7. Update all deployments

### Git History Cleanup

If credentials were committed to git:

```bash
# Install BFG Repo-Cleaner
brew install bfg  # macOS
# or download from https://rtyley.github.io/bfg-repo-cleaner/

# Remove the file from history
bfg --delete-files firebase-service-account.json
bfg --delete-files '*firebase*adminsdk*.json'

# Clean up
git reflog expire --expire=now --all
git gc --prune=now --aggressive

# Force push (WARNING: This rewrites history)
git push --force --all
```

**Note**: Force pushing affects all collaborators. Coordinate with your team.

## 🔒 API Security

### Authentication

All protected endpoints require Firebase ID token:

```
Authorization: Bearer <firebase-id-token>
```

### Rate Limiting

Implement rate limiting to prevent abuse:

```typescript
import rateLimit from "express-rate-limit";

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
});

app.use("/api/", limiter);
```

### Input Validation

Always validate user input:

```typescript
import Joi from "joi";

const userSchema = Joi.object({
  email: Joi.string().email().required(),
  username: Joi.string().min(3).max(30).required(),
  role: Joi.string().valid("admin", "student", "teacher"),
});
```

### CORS Configuration

Restrict CORS to known origins:

```typescript
app.use(
  cors({
    origin: process.env.ALLOWED_ORIGINS?.split(",") || [
      "http://localhost:3000",
    ],
    credentials: true,
  })
);
```

## 🛡️ MongoDB Security

### Connection String

Use authentication in production:

```
mongodb://username:password@host:port/database?authSource=admin
```

### Best Practices

- Enable authentication
- Use strong passwords
- Limit network access (firewall rules)
- Enable audit logging
- Regular backups
- Use MongoDB Atlas for managed security

## 📋 Security Checklist

### Development

- [ ] `.env` file in `.gitignore`
- [ ] No hardcoded credentials
- [ ] Service account file in `.gitignore`
- [ ] Different credentials for dev/prod

### Deployment

- [ ] Environment variables configured
- [ ] Secrets stored in secret management service
- [ ] HTTPS enabled
- [ ] CORS properly configured
- [ ] Rate limiting enabled
- [ ] Input validation implemented
- [ ] Error messages don't leak sensitive info
- [ ] Audit logging enabled

### Maintenance

- [ ] Rotate credentials every 90 days
- [ ] Review access logs monthly
- [ ] Update dependencies regularly
- [ ] Security patches applied promptly
- [ ] Backup and disaster recovery tested

## 🔍 Monitoring & Auditing

### Firebase Audit Logs

Enable and monitor:

- Authentication events
- Database access
- Service account usage
- API calls

### Application Logs

Log security-relevant events:

- Failed authentication attempts
- Admin actions
- Unusual access patterns
- Error rates

### Alerts

Set up alerts for:

- Multiple failed login attempts
- Unusual API usage patterns
- Service account usage from unexpected IPs
- Database connection failures

## 📚 Resources

- [Firebase Security Rules](https://firebase.google.com/docs/rules)
- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [Node.js Security Best Practices](https://nodejs.org/en/docs/guides/security/)
- [Express Security Best Practices](https://expressjs.com/en/advanced/best-practice-security.html)

## 📞 Reporting Security Issues

If you discover a security vulnerability, please email: security@example.com

**Do not** create public GitHub issues for security vulnerabilities.
