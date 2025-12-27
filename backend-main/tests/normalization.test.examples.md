# Username Normalization Test Examples

## Overview

This document provides test examples for username normalization functionality. These can be used for manual testing or as a basis for automated tests.

## Test Suite 1: Username Normalization

### Test 1.1: Uppercase to Lowercase

**Input**:

```json
{
  "firebaseUid": "test-001",
  "username": "JOHNDOE",
  "email": "john@example.com"
}
```

**Expected Output**:

```json
{
  "user": {
    "username": "johndoe",
    "email": "john@example.com"
  }
}
```

**cURL Command**:

```bash
curl -X POST http://localhost:5001/api/sync/user \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "firebaseUid": "test-001",
    "username": "JOHNDOE",
    "email": "john@example.com"
  }'
```

### Test 1.2: Mixed Case to Lowercase

**Input**:

```json
{
  "firebaseUid": "test-002",
  "username": "JohnDoe",
  "email": "john@example.com"
}
```

**Expected Output**:

```json
{
  "user": {
    "username": "johndoe"
  }
}
```

### Test 1.3: Whitespace Trimming

**Input**:

```json
{
  "firebaseUid": "test-003",
  "username": "  johndoe  ",
  "email": "john@example.com"
}
```

**Expected Output**:

```json
{
  "user": {
    "username": "johndoe"
  }
}
```

### Test 1.4: Combined Whitespace and Case

**Input**:

```json
{
  "firebaseUid": "test-004",
  "username": "  JohnDoe  ",
  "email": "john@example.com"
}
```

**Expected Output**:

```json
{
  "user": {
    "username": "johndoe"
  }
}
```

## Test Suite 2: Email Normalization

### Test 2.1: Email Uppercase to Lowercase

**Input**:

```json
{
  "firebaseUid": "test-005",
  "username": "johndoe",
  "email": "JOHN@EXAMPLE.COM"
}
```

**Expected Output**:

```json
{
  "user": {
    "email": "john@example.com"
  }
}
```

### Test 2.2: Email with Whitespace

**Input**:

```json
{
  "firebaseUid": "test-006",
  "username": "johndoe",
  "email": "  john@example.com  "
}
```

**Expected Output**:

```json
{
  "user": {
    "email": "john@example.com"
  }
}
```

### Test 2.3: Email Mixed Case

**Input**:

```json
{
  "firebaseUid": "test-007",
  "username": "johndoe",
  "email": "John.Doe@Example.COM"
}
```

**Expected Output**:

```json
{
  "user": {
    "email": "john.doe@example.com"
  }
}
```

## Test Suite 3: Name Normalization (Display Name)

### Test 3.1: Name with Whitespace (Case Preserved)

**Input**:

```json
{
  "name": "  John Doe  ",
  "email": "john@example.com"
}
```

**Expected Output**:

```json
{
  "user": {
    "name": "John Doe"
  }
}
```

**cURL Command**:

```bash
curl -X POST http://localhost:5001/api/users \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "  John Doe  ",
    "email": "john@example.com"
  }'
```

### Test 3.2: Name Case Preservation

**Input**:

```json
{
  "name": "JOHN DOE",
  "email": "john@example.com"
}
```

**Expected Output**:

```json
{
  "user": {
    "name": "JOHN DOE"
  }
}
```

**Note**: Name case is preserved (not converted to lowercase)

### Test 3.3: Name with Special Characters

**Input**:

```json
{
  "name": "  John O'Brien  ",
  "email": "john@example.com"
}
```

**Expected Output**:

```json
{
  "user": {
    "name": "John O'Brien"
  }
}
```

## Test Suite 4: Combined Normalization

### Test 4.1: All Fields with Issues

**Input**:

```json
{
  "firebaseUid": "test-008",
  "username": "  JohnDoe  ",
  "email": "  John@Example.COM  "
}
```

**Expected Output**:

```json
{
  "user": {
    "username": "johndoe",
    "email": "john@example.com"
  }
}
```

### Test 4.2: POST /api/users with All Fields

**Input**:

```json
{
  "name": "  John Doe  ",
  "email": "  JOHN@EXAMPLE.COM  "
}
```

**Expected Output**:

```json
{
  "user": {
    "name": "John Doe",
    "email": "john@example.com"
  }
}
```

## Test Suite 5: Edge Cases

### Test 5.1: Empty String Username

**Input**:

```json
{
  "firebaseUid": "test-009",
  "username": "",
  "email": "john@example.com"
}
```

**Expected**: Validation error (username required)

### Test 5.2: Only Whitespace Username

**Input**:

```json
{
  "firebaseUid": "test-010",
  "username": "   ",
  "email": "john@example.com"
}
```

**Expected**: Validation error (username too short after trimming)

### Test 5.3: Special Characters in Username

**Input**:

```json
{
  "firebaseUid": "test-011",
  "username": "John.Doe",
  "email": "john@example.com"
}
```

**Expected Output**:

```json
{
  "user": {
    "username": "john.doe"
  }
}
```

### Test 5.4: Unicode Characters

**Input**:

```json
{
  "firebaseUid": "test-012",
  "username": "José",
  "email": "jose@example.com"
}
```

**Expected Output**:

```json
{
  "user": {
    "username": "josé"
  }
}
```

## Test Suite 6: Case-Insensitive Queries

### Test 6.1: Profile Lookup with Different Case

**Step 1**: Create user

```bash
curl -X POST http://localhost:5001/api/sync/user \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "firebaseUid": "test-013",
    "username": "johndoe",
    "email": "john@example.com"
  }'
```

**Step 2**: Query with uppercase email

```bash
curl -X POST http://localhost:5001/api/profile \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "JOHN@EXAMPLE.COM"
  }'
```

**Expected**: User found (email normalized before query)

### Test 6.2: Duplicate Prevention

**Step 1**: Create user with lowercase

```bash
curl -X POST http://localhost:5001/api/sync/user \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "firebaseUid": "test-014",
    "username": "johndoe",
    "email": "john@example.com"
  }'
```

**Step 2**: Try to create with uppercase

```bash
curl -X POST http://localhost:5001/api/sync/user \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "firebaseUid": "test-015",
    "username": "JOHNDOE",
    "email": "john2@example.com"
  }'
```

**Expected**: Error (duplicate username after normalization)

## Test Suite 7: Integration Tests

### Test 7.1: Full User Registration Flow

```bash
# 1. Register user
curl -X POST http://localhost:5001/api/sync/user \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "firebaseUid": "test-016",
    "username": "  JaneDoe  ",
    "email": "  Jane@Example.COM  "
  }'

# 2. Verify normalization in database
mongo adaptive-learning --eval 'db.users.findOne({firebaseUid: "test-016"})'

# Expected: username = "janedoe", email = "jane@example.com"
```

### Test 7.2: Login Event with Normalization

```bash
curl -X POST http://localhost:5001/api/loginEvent \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "  Jane Doe  ",
    "email": "  JANE@EXAMPLE.COM  "
  }'

# Expected: name = "Jane Doe", email = "jane@example.com"
```

## Automated Test Template

```javascript
describe("Username Normalization", () => {
  it("should normalize username to lowercase", async () => {
    const response = await request(app)
      .post("/api/sync/user")
      .set("Authorization", "Bearer TOKEN")
      .send({
        firebaseUid: "test-001",
        username: "JohnDoe",
        email: "john@example.com",
      });

    expect(response.status).toBe(200);
    expect(response.body.user.username).toBe("johndoe");
  });

  it("should trim whitespace from username", async () => {
    const response = await request(app)
      .post("/api/sync/user")
      .set("Authorization", "Bearer TOKEN")
      .send({
        firebaseUid: "test-002",
        username: "  johndoe  ",
        email: "john@example.com",
      });

    expect(response.status).toBe(200);
    expect(response.body.user.username).toBe("johndoe");
  });

  it("should normalize email to lowercase", async () => {
    const response = await request(app)
      .post("/api/sync/user")
      .set("Authorization", "Bearer TOKEN")
      .send({
        firebaseUid: "test-003",
        username: "johndoe",
        email: "JOHN@EXAMPLE.COM",
      });

    expect(response.status).toBe(200);
    expect(response.body.user.email).toBe("john@example.com");
  });

  it("should preserve name case but trim whitespace", async () => {
    const response = await request(app)
      .post("/api/users")
      .set("Authorization", "Bearer TOKEN")
      .send({
        name: "  John Doe  ",
        email: "john@example.com",
      });

    expect(response.status).toBe(200);
    expect(response.body.user.name).toBe("John Doe");
  });
});
```

## Verification Checklist

After running tests, verify:

- [ ] All usernames stored in lowercase
- [ ] All emails stored in lowercase
- [ ] Display names preserve case
- [ ] Whitespace trimmed from all fields
- [ ] No duplicate usernames with different cases
- [ ] Case-insensitive queries work
- [ ] Validation still works after normalization
- [ ] Database queries are consistent

## Common Issues and Solutions

### Issue: Validation Fails After Normalization

**Solution**: Ensure normalization happens before validation in middleware chain

### Issue: Duplicate Usernames Not Detected

**Solution**: Check that normalization is applied consistently

### Issue: Case-Sensitive Queries Still Failing

**Solution**: Normalize query parameters before database lookup

## Performance Testing

### Load Test: Normalization Overhead

```bash
# Test without normalization
ab -n 1000 -c 10 http://localhost:5001/api/health

# Test with normalization
ab -n 1000 -c 10 -p user.json -T application/json \
  -H "Authorization: Bearer TOKEN" \
  http://localhost:5001/api/sync/user
```

**Expected**: < 1ms overhead per request
