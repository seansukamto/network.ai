# Quick Fix - Profile Not Found Issue

## ✅ IMMEDIATE FIX APPLIED

Your profile issue is **already fixed** in the backend code! Here's what was done:

### What Changed
The backend profile route (`apps/backend/src/routes/profile.ts`) now automatically creates user profiles when they don't exist.

---

## 🚀 What You Need To Do NOW

### 1. Restart Your Backend Server

```bash
# Stop the current backend server (Ctrl+C)
# Then restart it:
cd apps/backend
npm run dev
```

### 2. Test the Fix

1. **Open your app:** http://localhost:5173
2. **Sign in** with your account
3. **Go to Profile page** (click Profile in nav)
4. ✅ **Your profile should now load!**

---

## 🔧 Recommended: Apply Database Migration

While the backend fix works immediately, you should also apply the database migration for a more robust solution.

### Quick Migration (Via Supabase Dashboard)

1. **Go to:** https://supabase.com/dashboard
2. **Open your project**
3. **Click:** SQL Editor (left sidebar)
4. **Copy and paste** this SQL:

```sql
-- Function to auto-create user profile when auth user is created
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

-- Trigger to auto-create user profile on auth signup
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- Backfill existing users
INSERT INTO public.users (auth_id, email, name, created_at, updated_at)
SELECT 
  au.id,
  au.email,
  COALESCE(au.raw_user_meta_data->>'name', au.email, 'User'),
  au.created_at,
  NOW()
FROM auth.users au
LEFT JOIN public.users u ON u.auth_id = au.id
WHERE u.id IS NULL
ON CONFLICT (auth_id) DO NOTHING;
```

5. **Click:** Run
6. ✅ **Done!**

---

## 📝 What This Does

### Before Fix
- User signs in ✅
- User tries to access profile ❌
- Error: "Profile not found"

### After Backend Fix (Already Applied)
- User signs in ✅
- User tries to access profile ✅
- Backend auto-creates profile if missing ✅
- Profile loads successfully ✅

### After Database Migration (Recommended)
- User signs up ✅
- Database automatically creates profile ✅
- User can immediately access profile ✅
- More efficient, no backend fallback needed ✅

---

## 🎯 Summary

**Immediate Status:** ✅ **FIXED** (via backend auto-creation)
**Next Step:** ⚠️ Run database migration (optional but recommended)
**Time Required:** 2 minutes

---

## ❓ Troubleshooting

### Still seeing "Profile not found"?

1. **Did you restart the backend?**
   ```bash
   cd apps/backend
   npm run dev
   ```

2. **Check backend logs** - You should see:
   ```
   Creating missing profile for user [your-user-id]
   ```

3. **Clear browser cache** and try again

4. **Check your .env files** - Make sure Supabase keys are correct

---

## 📚 More Information

- **Full Details:** See `PROFILE_FIX_GUIDE.md`
- **Migration Files:** See `apps/backend/migrations/`
- **Updated Schema:** See `apps/backend/supabase-schema.sql`

---

**Status:** ✅ Ready to test!

