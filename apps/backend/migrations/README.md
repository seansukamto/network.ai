# Database Migrations

This directory contains database migration scripts for network.ai.

## How to Apply Migrations

### Option 1: Via Supabase Dashboard (Recommended)

1. Go to your Supabase project dashboard
2. Navigate to **SQL Editor**
3. Copy the contents of the migration file
4. Paste and run the SQL

### Option 2: Via Supabase CLI

```bash
# Login to Supabase CLI
supabase login

# Link to your project
supabase link --project-ref your-project-ref

# Run migration
supabase db push --include-migrations
```

### Option 3: Via psql

```bash
# Connect to your Supabase database
psql "postgresql://postgres:[YOUR-PASSWORD]@db.[YOUR-PROJECT-REF].supabase.co:5432/postgres"

# Run migration
\i apps/backend/migrations/001_add_user_creation_trigger.sql
```

## Migration Files

### 001_add_user_creation_trigger.sql

**Purpose:** Automatically create user profiles when users sign up via Supabase Auth

**What it does:**
- Creates a database trigger that listens for new auth users
- Automatically inserts a corresponding record in the `users` table
- Backfills profiles for any existing auth users without profiles

**When to run:** 
- **REQUIRED** if you're experiencing "Profile not found" errors after sign-in
- Run this immediately if you've already deployed the app

**Safe to re-run:** Yes, includes conflict handling to prevent duplicates

## Migration Status

- [x] 001_add_user_creation_trigger.sql - Auto-create user profiles on signup

