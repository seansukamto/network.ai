# Quick Test Guide - QR Code Flow

## 🚀 Quick Start

### Start the App
```bash
# Terminal 1 - Backend
cd apps/backend
npm run dev

# Terminal 2 - Frontend  
cd apps/frontend
npm run dev
```

**Frontend:** http://localhost:5173  
**Backend:** http://localhost:3001

---

## ✅ Test Checklist

### 1. Profile Fix Test
- [ ] Sign in to your account
- [ ] Navigate to `/profile`
- [ ] **Expected:** Profile loads (auto-created if missing)
- [ ] **Success Indicator:** No "Profile not found" error

---

### 2. Create Session Test
- [ ] Click "Create Session" button
- [ ] Fill in form:
  - Name: `Tech Networking Meetup`
  - Description: `Connect with local developers`
  - Date: Tomorrow
  - Location: `Coffee Shop Downtown`
- [ ] Submit form
- [ ] **Expected:** Redirected to home page
- [ ] **Success Indicator:** New session appears in list

---

### 3. QR Code Display Test
- [ ] Click on your created session
- [ ] **Expected:** Event detail page loads
- [ ] **Verify:**
  - [ ] QR code image is displayed
  - [ ] Join URL is shown
  - [ ] "Copy" button works
  - [ ] Attendees section visible (empty at first)
- [ ] **Success Indicator:** QR code is scannable

---

### 4. Join via QR Code Test
- [ ] Copy the join URL from event detail page
- [ ] Open URL in **incognito window** or **different browser**
- [ ] **Expected:** Join event page loads
- [ ] Fill in form:
  - Name: `Jane Smith`
  - Email: `jane@example.com`
  - Company: `Tech Startup Inc`
  - Job Title: `Software Engineer`
  - Bio: `Passionate about AI and web development`
- [ ] Submit form
- [ ] **Expected:** Success message → redirect
- [ ] **Verify:**
  - [ ] Go back to event detail page
  - [ ] Jane Smith appears in attendees list
- [ ] **Success Indicator:** Attendee added successfully

---

### 5. Mark as Met Test
- [ ] Navigate to `/mark-met`
- [ ] **Verify:** Dropdown lists show users
- [ ] Select two people who attended
- [ ] Select event from dropdown
- [ ] Add note: `Discussed AI projects`
- [ ] Submit form
- [ ] **Expected:** Success message appears
- [ ] **Verify in Neo4j:** (if accessible)
  ```cypher
  MATCH (a:Person)-[r:MET_AT]->(b:Person)
  RETURN a.name, r.note, b.name
  ```
- [ ] **Success Indicator:** Meeting recorded

---

### 6. AI Assistant Test (GPT-4o-mini)
- [ ] Navigate to `/ai`
- [ ] Ask: `Who attended the Tech Networking Meetup?`
- [ ] **Expected:** GPT response with attendee info
- [ ] **Success Indicator:** AI uses GPT-4o-mini (check backend logs)

---

### 7. Connections Test
- [ ] Navigate to `/connections`
- [ ] **Verify:** People you marked as met appear
- [ ] Click "Add Note" on a connection
- [ ] Add note about your conversation
- [ ] **Expected:** Note is saved
- [ ] **Success Indicator:** Notes appear under connection

---

## 🐛 Common Issues & Fixes

### Issue: "Profile not found"
**Solution:** 
1. Backend should auto-create it now
2. Check backend logs for: `Creating missing profile for user...`
3. If still failing, run database migration

### Issue: QR code doesn't display
**Solution:**
1. Check backend is running (port 3001)
2. Test endpoint: `http://localhost:3001/api/sessions/<id>/qr`
3. Check browser console for errors

### Issue: Can't join via token
**Solution:**
1. Verify token in URL is correct
2. Check session hasn't been deleted
3. Test verify endpoint: `/api/sessions/verify/<token>`

### Issue: Mark met page shows no users
**Solution:**
1. Users must join events first
2. Check `/api/users` endpoint returns data
3. Verify at least 2 users exist in database

### Issue: AI not working
**Solution:**
1. Check `OPENAI_API_KEY` in backend `.env`
2. Verify backend logs don't show API errors
3. Test: `POST /api/ai/query` with simple query

---

## 📊 Expected Backend Logs

### Successful QR Code Generation
```
QR code generated for session: <id>
Join URL: http://localhost:5173/join?token=<uuid>
```

### Successful Join
```
Creating missing profile for user <uuid>
User joined session: <session-id>
Creating ATTENDED relationship in Neo4j
Generated embedding for user bio
```

### Successful Mark Met
```
Recording meeting between <userA> and <userB>
Creating bidirectional MET_AT relationship
```

### GPT-4o-mini Call
```
Using GPT-4o-mini for completion
Query processed successfully
```

---

## 🎯 Success Criteria

### All Tests Pass If:
✅ Profile loads without errors  
✅ Sessions can be created  
✅ QR codes display correctly  
✅ Users can join via token  
✅ Attendees appear in lists  
✅ Mark met creates relationships  
✅ AI responds with GPT-4o-mini  
✅ No console errors  
✅ Backend logs show successful operations  

---

## 🔍 Verification Queries

### Check Supabase Data
```sql
-- View all sessions
SELECT * FROM network_sessions;

-- View attendance
SELECT u.name, ns.name as session_name 
FROM attendance a
JOIN users u ON u.id = a.user_id
JOIN network_sessions ns ON ns.id = a.session_id;

-- View connections
SELECT 
  u1.name as user_name,
  u2.name as connected_to,
  c.met_at_session_name
FROM connections c
JOIN users u1 ON u1.id = c.user_id
JOIN users u2 ON u2.id = c.connection_id;
```

### Check Neo4j Graph
```cypher
// View all attendance
MATCH (p:Person)-[:ATTENDED]->(e:Event)
RETURN p.name, e.name;

// View all meetings
MATCH (a:Person)-[r:MET_AT]->(b:Person)
RETURN a.name, r.note, r.at, b.name;

// Count connections per person
MATCH (p:Person)-[:MET_AT]->(other)
RETURN p.name, count(other) as connections
ORDER BY connections DESC;
```

---

## 📱 Mobile QR Scan Test

### Using Phone Camera
1. Create session on desktop
2. View QR code at `/session/:id`
3. Scan QR code with phone camera
4. Join event from phone
5. Verify attendee appears on desktop

---

## 🎉 What Success Looks Like

1. **Smooth sign-in** → No profile errors
2. **Sessions created** → QR codes display
3. **Users join** → via QR scan or link
4. **Connections made** → Graph relationships created
5. **AI queries work** → GPT-4o-mini responds
6. **Real-time updates** → Attendees appear instantly

---

**Ready to test!** 🚀  
**Any issues?** Check backend logs and browser console first.

