# Profile Not Found - Fix Guide

## Issue Summary

**Problem:** After signing in, users get a "Profile not found" error when accessing their profile page.

**Root Cause:** The app authenticates users via Supabase Auth, but was not automatically creating corresponding profile records in the `users` table. This meant:
- ✅ User successfully signs in with Supabase Auth
- ❌ No profile exists in the `users` table
- ❌ Profile page fails with 404 error

---

## Solutions Implemented

### 1. **Immediate Fix: Auto-Create Profiles** ✅ 
**File:** `apps/backend/src/routes/profile.ts`

The profile GET endpoint now automatically creates a user profile if one doesn't exist. This provides an immediate fallback for existing users.

**How it works:**
- User signs in → Auth succeeds
- User visits profile page → Backend checks for profile
- If profile doesn't exist → Auto-creates one with user's email and name
- Profile is returned successfully

**Status:** ✅ Already deployed in code

---

### 2. **Long-term Fix: Database Trigger** ⚠️ Requires Migration

**Files:** 
- `apps/backend/supabase-schema.sql` (updated)
- `apps/backend/migrations/001_add_user_creation_trigger.sql` (new)

A database trigger that automatically creates user profiles when someone signs up.

**How it works:**
- User signs up → Supabase Auth creates auth user
- Database trigger fires automatically
- Profile record is created in `users` table
- User can immediately access their profile

**Status:** ⚠️ **NEEDS TO BE APPLIED TO DATABASE**

---

## How to Apply the Database Migration

### Quick Start (Supabase Dashboard)

1. **Open Supabase Dashboard**
   - Go to https://supabase.com/dashboard
   - Select your project

2. **Navigate to SQL Editor**
   - Click on "SQL Editor" in the sidebar

3. **Run Migration**
   - Copy the contents of `apps/backend/migrations/001_add_user_creation_trigger.sql`
   - Paste into the SQL editor
   - Click "Run"

4. **Verify**
   - Check that the function and trigger were created
   - Any existing auth users without profiles should now have profiles

### Alternative: Using Supabase CLI

```bash
# Navigate to project root
cd network.ai

# Login to Supabase
npx supabase login

# Link to your project
npx supabase link --project-ref YOUR_PROJECT_REF

# Apply migration
psql YOUR_DATABASE_URL < apps/backend/migrations/001_add_user_creation_trigger.sql
```

---

## Testing the Fix

### Test 1: Existing Users
1. Sign in with an existing account
2. Navigate to `/profile`
3. ✅ Profile should load (auto-created by backend fallback)

### Test 2: New Users (After Migration)
1. Sign up with a new account
2. Navigate to `/profile`
3. ✅ Profile should load (auto-created by database trigger)

### Test 3: Profile Updates
1. Edit your profile information
2. Save changes
3. ✅ Changes should persist

---

## Technical Details

### Changes Made

#### 1. Backend Profile Route
**File:** `apps/backend/src/routes/profile.ts`

```typescript
// Before: Would return 404 if profile doesn't exist
if (!profile) {
  return res.status(404).json({ error: 'Profile not found' });
}

// After: Auto-creates profile if missing
if (!profile) {
  console.log(`Creating missing profile for user ${user.id}`);
  const { data, error } = await supabaseAdmin
    .from('users')
    .insert({
      auth_id: user.id,
      email: user.email,
      name: user.user_metadata?.name || user.email?.split('@')[0] || 'User',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .select()
    .single();
  profile = data;
}
```

#### 2. Database Trigger
**Function:** `handle_new_user()`

Automatically runs when a new user is inserted into `auth.users`:
```sql
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users (auth_id, email, name, created_at, updated_at)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'name', NEW.email, 'User'),
    NOW(),
    NOW()
  )
  ON CONFLICT (auth_id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

---

## Impact

### Before Fix
- ❌ Users could sign in but couldn't access profile
- ❌ Manual database intervention needed for each user
- ❌ Poor user experience

### After Fix
- ✅ Seamless sign-in → profile access
- ✅ Automatic profile creation
- ✅ No manual intervention needed
- ✅ Backfills existing users

---

## Monitoring

After applying the migration, monitor your logs for:

```bash
# Backend should no longer show these errors
Creating missing profile for user [uuid]

# This indicates the trigger is working properly
```

If you still see "Creating missing profile" messages after the migration, it means:
- The trigger might not be applied correctly
- Check that the trigger exists in your Supabase dashboard

---

## Rollback (If Needed)

If you need to remove the trigger:

```sql
-- Remove trigger
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- Remove function
DROP FUNCTION IF EXISTS handle_new_user();
```

**Note:** This won't break anything, as the backend fallback will still create profiles when needed.

---

## Questions?

If you encounter issues:

1. Check Supabase logs for errors
2. Verify the trigger exists: `SELECT * FROM pg_trigger WHERE tgname = 'on_auth_user_created';`
3. Check for existing profiles: `SELECT count(*) FROM users WHERE auth_id IS NOT NULL;`
4. Test with a fresh sign-up to verify trigger is working

---

**Status:** ✅ Backend fix deployed | ⚠️ Migration pending
**Priority:** High - Apply migration as soon as possible
**Risk:** Low - Includes conflict handling and backfill logic

