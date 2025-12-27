# Data Migration Guide

## Overview

This guide provides instructions for migrating existing data to support the new group-based features. Two migration scripts are provided to ensure backward compatibility with existing data.

## Migration Scripts

### 1. Migrate GroupId to Messages and Files

**Script:** `scripts/migrateGroupIdToMessagesAndFiles.ts`

**Purpose:** Adds `groupId` field to existing messages and activity files that don't have one.

**What it does:**

- Finds all messages without `groupId`
- Finds all activity files without `groupId`
- Assigns a default `groupId` to these records
- Verifies the migration was successful

**Usage:**

```bash
# Dry run (preview changes without applying)
npm run migrate:groupid -- --dry-run

# Live migration with default group ID
npm run migrate:groupid

# Live migration with custom group ID
npm run migrate:groupid -- --default-group-id=my-default-group
```

**Options:**

- `--dry-run` - Preview changes without applying them
- `--default-group-id=<id>` - Specify custom default group ID (default: "default-group")

**Example Output:**

```
🚀 Starting GroupId Migration
Mode: LIVE
Default Group ID: default-group

📡 Connecting to MongoDB...
✅ Connected to MongoDB

📧 Migrating Messages...
Found 150 messages without groupId
✅ Updated 150 messages

📁 Migrating Activity Files...
Found 45 activity files without groupId
✅ Updated 45 activity files

🔍 Verifying Migration...
✅ Verification passed: All records have groupId

📊 Migration Summary:
Messages migrated: 150
Activity files migrated: 45
Total records migrated: 195

✅ Migration completed successfully!
```

### 2. Create Single-Member Groups for Existing Users

**Script:** `scripts/createSingleMemberGroups.ts`

**Purpose:** Creates single-member groups for all existing students who don't have a group.

**What it does:**

- Finds all students without groups
- Creates a single-member group for each student
- Names groups based on student username
- Verifies all students have groups

**Usage:**

```bash
# Dry run (preview changes without applying)
npm run migrate:groups -- --dry-run

# Live migration (requires admin UID)
npm run migrate:groups -- --admin-uid=ADMIN_FIREBASE_UID

# Live migration with custom level
npm run migrate:groups -- --admin-uid=ADMIN_FIREBASE_UID --level=2
```

**Options:**

- `--dry-run` - Preview changes without applying them
- `--admin-uid=<uid>` - **Required in live mode** - Firebase UID of admin creating groups
- `--level=<number>` - Default level for groups (default: 1)

**Example Output:**

```
🚀 Starting Single-Member Group Creation
Mode: LIVE
Admin UID: admin-firebase-uid-123
Default Level: 1

📡 Connecting to MongoDB...
✅ Connected to MongoDB

👥 Finding users without groups...
Found 50 total students
Found 30 students without groups

🏗️  Creating single-member groups...
✅ Created group for john_doe (uid-123)
✅ Created group for jane_smith (uid-456)
...
✅ Created group for bob_jones (uid-789)

🔍 Verifying groups...
✅ Verification passed: All students have groups

📊 Group Statistics:
Total groups: 50
Single-member groups: 50
Multi-member groups: 0
Total students: 50
Students in groups: 50
Students without groups: 0

📊 Migration Summary:
Groups created: 30
Users processed: 30

✅ Migration completed successfully!
```

## Migration Order

**Important:** Run migrations in this order:

1. **First:** Migrate GroupId to Messages and Files

   ```bash
   npm run migrate:groupid
   ```

2. **Second:** Create Single-Member Groups
   ```bash
   npm run migrate:groups -- --admin-uid=YOUR_ADMIN_UID
   ```

## Pre-Migration Checklist

Before running migrations:

- [ ] Backup your database
- [ ] Verify `MONGO_URI` is set in `.env`
- [ ] Test with `--dry-run` first
- [ ] Have admin Firebase UID ready for group creation
- [ ] Ensure no active users during migration (recommended)
- [ ] Review migration output carefully

## Backup Instructions

### MongoDB Backup

```bash
# Backup entire database
mongodump --uri="mongodb://your-connection-string" --out=backup-$(date +%Y%m%d)

# Backup specific collections
mongodump --uri="mongodb://your-connection-string" --collection=messages --out=backup-messages
mongodump --uri="mongodb://your-connection-string" --collection=activityfiles --out=backup-files
mongodump --uri="mongodb://your-connection-string" --collection=groups --out=backup-groups
```

### Restore from Backup (if needed)

```bash
# Restore entire database
mongorestore --uri="mongodb://your-connection-string" backup-20241213/

# Restore specific collection
mongorestore --uri="mongodb://your-connection-string" --collection=messages backup-messages/
```

## Rollback Procedures

### Rollback GroupId Migration

If you need to remove the added `groupId` fields:

```javascript
// Connect to MongoDB and run:
db.messages.updateMany(
  { groupId: "default-group" },
  { $unset: { groupId: "" } }
);

db.activityfiles.updateMany(
  { groupId: "default-group" },
  { $unset: { groupId: "" } }
);
```

### Rollback Group Creation

If you need to remove created groups:

```javascript
// Connect to MongoDB and run:
// WARNING: This will delete ALL single-member groups
db.groups.deleteMany({ type: "single" });
```

## Verification

### Verify GroupId Migration

```javascript
// Check messages without groupId
db.messages.countDocuments({ groupId: { $exists: false } });
// Should return: 0

// Check files without groupId
db.activityfiles.countDocuments({ groupId: { $exists: false } });
// Should return: 0
```

### Verify Group Creation

```javascript
// Check students without groups
const students = db.users.find({ role: "student" }).toArray();
const groups = db.groups.find().toArray();
const usersInGroups = new Set();
groups.forEach((g) => g.members.forEach((m) => usersInGroups.add(m)));
const studentsWithoutGroups = students.filter(
  (s) => !usersInGroups.has(s.firebaseUid)
);
console.log(`Students without groups: ${studentsWithoutGroups.length}`);
// Should return: 0
```

## Troubleshooting

### Issue: "MONGO_URI not found"

**Solution:** Ensure `.env` file exists with `MONGO_URI` set:

```bash
MONGO_URI=mongodb://localhost:27017/your-database
```

### Issue: "Admin UID is required"

**Solution:** Provide admin UID when running group creation:

```bash
npm run migrate:groups -- --admin-uid=your-admin-firebase-uid
```

### Issue: Migration fails partway through

**Solution:**

1. Check error messages in console
2. Restore from backup if needed
3. Fix the issue
4. Run migration again (script is idempotent)

### Issue: Some records still missing groupId

**Solution:**

1. Run verification queries (see Verification section)
2. Identify problematic records
3. Manually update or re-run migration

## Production Deployment

### Recommended Approach

1. **Schedule Maintenance Window**

   - Notify users of brief downtime
   - Choose low-traffic time

2. **Backup Database**

   ```bash
   mongodump --uri="$MONGO_URI" --out=backup-pre-migration
   ```

3. **Run Dry Runs**

   ```bash
   npm run migrate:groupid -- --dry-run
   npm run migrate:groups -- --dry-run --admin-uid=ADMIN_UID
   ```

4. **Review Dry Run Output**

   - Verify expected number of records
   - Check for any errors

5. **Run Live Migrations**

   ```bash
   npm run migrate:groupid
   npm run migrate:groups -- --admin-uid=ADMIN_UID
   ```

6. **Verify Migrations**

   - Run verification queries
   - Check application functionality
   - Test group features

7. **Monitor Application**
   - Watch logs for errors
   - Test key features
   - Monitor database performance

## Post-Migration

After successful migration:

- [ ] Verify all tests pass: `npm test`
- [ ] Test group features in application
- [ ] Monitor error logs
- [ ] Keep backup for 7-30 days
- [ ] Document migration completion date
- [ ] Update team on completion

## Migration Logs

Keep a record of migrations:

```
Migration Date: 2024-12-13
Migrated By: Admin Name
Database: production
Results:
  - Messages migrated: 150
  - Files migrated: 45
  - Groups created: 30
Status: Success
Backup Location: backup-20241213/
```

## Support

If you encounter issues:

1. Check this guide's Troubleshooting section
2. Review migration script output
3. Check database logs
4. Restore from backup if needed
5. Contact development team

## Additional Resources

- [User Model Migration Guide](./USER_MODEL_MIGRATION.md)
- [API Documentation](./SCORES_LEARNING_PATH_API.md)
- [Group Model Documentation](./PR_TASK_06_GROUP_MODEL_ENDPOINTS.md)
