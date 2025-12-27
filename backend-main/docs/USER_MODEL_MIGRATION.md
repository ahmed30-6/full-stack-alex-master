# User Model Unification - Migration Guide

## Overview

This migration consolidates three separate user-related models into a single unified `User` model, eliminating duplication and improving data consistency.

## What Changed

### Before (3 Separate Models)

1. **UserModel** (server.ts inline)

   - Fields: name, email, avatar, role
   - Collection: `users`

2. **StudentModel** (server.ts inline)

   - Fields: email, name, avatar, registeredAt, lastActivityAt, status
   - Collection: `students`

3. **User** (models/User.ts)
   - Fields: firebaseUid, username, email, profile, role, loginTimes
   - Collection: `users`

### After (1 Unified Model)

**User** (models/User.ts)

- Combines all fields from previous models
- Single source of truth
- Collection: `users`

## New User Model Schema

```typescript
{
  firebaseUid: string (unique, indexed)
  username: string (normalized: trim+lowercase)
  name: string (display name)
  email: string (unique, indexed)
  avatar: string | null
  profile: object
  role: 'admin' | 'student' | 'teacher'
  loginTimes: Date[]
  registeredAt: Date
  lastActivityAt: Date
  status: 'active' | 'inactive' | 'suspended'
  createdAt: Date (auto)
  updatedAt: Date (auto)
}
```

## Migration Steps

### Step 1: Backup Your Database

```bash
# MongoDB backup
mongodump --uri="mongodb://localhost:27017/adaptive-learning" --out=./backup

# Or use MongoDB Atlas backup if using cloud
```

### Step 2: Run Migration Script

```bash
npm run migrate:users
```

The script will:

1. Read all records from `students` collection
2. Read all records from old `users` collection
3. Create new unified User records
4. Skip duplicates (based on email)
5. Generate placeholder `firebaseUid` for migrated users
6. Preserve all existing data

### Step 3: Verify Migration

```bash
# Connect to MongoDB
mongo mongodb://localhost:27017/adaptive-learning

# Check new users collection
db.users.find().pretty()

# Count records
db.users.countDocuments()

# Verify specific user
db.users.findOne({ email: "admin@example.com" })
```

### Step 4: Test Application

```bash
# Start server
npm run dev

# Test endpoints
curl http://localhost:5001/api/health

# Test user retrieval (with admin token)
curl -H "Authorization: Bearer YOUR_TOKEN" \
  http://localhost:5001/api/users
```

### Step 5: Clean Up Old Collections (Optional)

**⚠️ Only after verifying migration is successful!**

```bash
# Connect to MongoDB
mongo mongodb://localhost:27017/adaptive-learning

# Drop old collections
db.students.drop()

# Note: Don't drop 'users' if it's the new unified collection
# Only drop if you had a separate old 'users' collection
```

## Migration Script Details

### What It Does

- ✅ Migrates all students from `students` collection
- ✅ Migrates all users from old `users` collection
- ✅ Generates placeholder `firebaseUid` for migrated users
- ✅ Preserves all existing data (name, email, avatar, etc.)
- ✅ Skips duplicates (won't overwrite existing users)
- ✅ Updates admin roles if found
- ✅ Provides detailed migration report

### What It Doesn't Do

- ❌ Doesn't delete old collections (you must do this manually)
- ❌ Doesn't update firebaseUid (updated on first login)
- ❌ Doesn't migrate if user already exists

### Placeholder firebaseUid

Migrated users get a placeholder firebaseUid:

```
migrated-<mongodb-object-id>
```

This will be automatically updated when the user logs in with Firebase Auth.

## API Changes

### POST /api/users

**Before**: Created records in both UserModel and StudentModel

**After**: Creates/updates unified User model

**Request** (unchanged):

```json
{
  "name": "John Doe",
  "email": "john@example.com",
  "avatar": "https://...",
  "updateName": true
}
```

**Response** (updated):

```json
{
  "user": {
    "_id": "...",
    "firebaseUid": "abc123",
    "username": "john",
    "name": "John Doe",
    "email": "john@example.com",
    "avatar": "https://...",
    "role": "student",
    "status": "active",
    "registeredAt": "2024-01-01T00:00:00.000Z",
    "lastActivityAt": "2024-01-01T00:00:00.000Z",
    "createdAt": "2024-01-01T00:00:00.000Z",
    "updatedAt": "2024-01-01T00:00:00.000Z"
  }
}
```

### GET /api/users (Admin Only)

**Before**: Returned students from StudentModel

**After**: Returns users from unified User model with pagination

**New Query Parameters**:

- `role`: Filter by role (admin, student, teacher)
- `status`: Filter by status (active, inactive, suspended)
- `limit`: Number of results (default: 1000)
- `skip`: Number to skip for pagination (default: 0)

**Request**:

```bash
GET /api/users?role=student&status=active&limit=50&skip=0
```

**Response** (updated):

```json
{
  "users": [...],
  "pagination": {
    "total": 150,
    "limit": 50,
    "skip": 0,
    "hasMore": true
  }
}
```

### POST /api/profile

**Before**: Returned student from StudentModel

**After**: Returns user from unified User model

**Request** (updated - now supports firebaseUid):

```json
{
  "email": "john@example.com"
}
// OR
{
  "firebaseUid": "abc123"
}
```

**Response** (updated):

```json
{
  "user": {
    "_id": "...",
    "firebaseUid": "abc123",
    "username": "john",
    "name": "John Doe",
    "email": "john@example.com",
    "avatar": "https://...",
    "role": "student",
    "status": "active",
    "registeredAt": "2024-01-01T00:00:00.000Z",
    "lastActivityAt": "2024-01-01T00:00:00.000Z"
  }
}
```

## Backward Compatibility

### Existing Data

- All existing data is preserved during migration
- Old collections remain intact (not deleted automatically)
- You can rollback by reverting code changes

### API Compatibility

- Request formats remain the same
- Response formats include additional fields
- Frontend should handle new fields gracefully

## Troubleshooting

### Migration Fails with "Duplicate Key Error"

**Cause**: User with same email already exists

**Solution**: This is expected. The script skips duplicates. Check the migration summary.

### Users Have Placeholder firebaseUid

**Cause**: Users were migrated from old collections

**Solution**: This is normal. The firebaseUid will be updated when users log in with Firebase Auth.

### Old Collections Still Exist

**Cause**: Migration script doesn't delete old collections

**Solution**: This is intentional for safety. Delete manually after verification:

```bash
db.students.drop()
```

### Can't Find User After Migration

**Cause**: User might be in old collection

**Solution**:

1. Check if migration ran successfully
2. Verify user exists: `db.users.findOne({ email: "user@example.com" })`
3. Re-run migration if needed

### Role Not Migrated Correctly

**Cause**: Old UserModel had role, StudentModel didn't

**Solution**: Migration script checks both collections and preserves admin roles. Verify:

```bash
db.users.findOne({ email: "admin@example.com" })
```

## Rollback Plan

If you need to rollback:

### Step 1: Restore Database

```bash
# Restore from backup
mongorestore --uri="mongodb://localhost:27017/adaptive-learning" ./backup
```

### Step 2: Revert Code

```bash
git revert <commit-hash>
```

### Step 3: Restart Server

```bash
npm run dev
```

## Testing Checklist

After migration, verify:

- [ ] All users visible in admin dashboard
- [ ] User login works correctly
- [ ] User profiles load correctly
- [ ] Admin users have admin role
- [ ] Student users have student role
- [ ] Avatar images display correctly
- [ ] Login times are tracked
- [ ] New user registration works
- [ ] User update works
- [ ] Pagination works in GET /api/users

## Benefits of Unified Model

### Before (Problems)

- ❌ Data duplication across 3 models
- ❌ Inconsistent field names (name vs username)
- ❌ Difficult to maintain
- ❌ Risk of data inconsistency
- ❌ Complex queries across multiple collections

### After (Benefits)

- ✅ Single source of truth
- ✅ Consistent field names
- ✅ Easier to maintain
- ✅ No data duplication
- ✅ Simple queries
- ✅ Better performance
- ✅ Clearer code structure

## Support

If you encounter issues:

1. Check migration script output for errors
2. Verify database backup exists
3. Check MongoDB logs
4. Review [BACKEND_ANALYSIS_REPORT.md](./BACKEND_ANALYSIS_REPORT.md)
5. Contact development team

## Next Steps

After successful migration:

1. Monitor application for any issues
2. Update frontend to use new response format
3. Delete old collections after 1 week of stable operation
4. Update API documentation
5. Train team on new model structure
