# Mandatory Rating Implementation

## Overview
Implemented mandatory rating system where mentees must provide a rating after each session ends before they can proceed. The session is not considered fully completed until a rating is submitted.

## Key Changes

### 1. New Session Status
- **Added**: `pending_rating` status to session workflow
- **Purpose**: Indicates session ended but waiting for mandatory rating

### 2. Session Flow
```
Active Session → End Session → Status Based on User Role
├── Mentor ends: status = "completed" (no rating required)
└── Mentee ends: status = "pending_rating" (rating required)
    └── Rating submitted: status = "completed"
```

## Backend Implementation

### Database Schema Updates
```sql
-- Updated sessions table constraint
ALTER TABLE sessions DROP CONSTRAINT IF EXISTS sessions_status_check;
ALTER TABLE sessions ADD CONSTRAINT sessions_status_check 
CHECK (status IN ('requested', 'active', 'completed', 'cancelled', 'pending_rating'));
```

### Files Modified

#### 1. `backend/src/routes/sessions.js`
- **Session End Logic**: Sets `pending_rating` for mentees, `completed` for mentors
- **Query Updates**: Include `pending_rating` in session history and logs
- **Statistics**: Only count truly completed sessions

#### 2. `backend/src/routes/ratings.js`
- **Rating Validation**: Accept ratings for `pending_rating` sessions
- **Session Completion**: Auto-complete session when rating submitted
- **Statistics Update**: Trigger mentor stats recalculation

#### 3. `backend/src/routes/chat.js`
- **Message Access**: Allow viewing messages for `pending_rating` sessions

#### 4. `backend/src/config/schema.sql`
- **Status Enum**: Added `pending_rating` to allowed session statuses

## Frontend Implementation

### Files Modified

#### 1. `frontend/src/pages/ChatPage.js`
- **End Session**: Different behavior for mentees vs mentors
- **Rating Modal**: Pass `mandatory` prop for mentees
- **Navigation**: Blocked until rating submitted

#### 2. `frontend/src/components/RatingModal.js`
- **Mandatory Mode**: New prop to enforce rating requirement
- **UI Changes**: 
  - No close button when mandatory
  - Warning message about requirement
  - Different button text
  - Prevent closing without rating

## User Experience

### For Mentees (Rating Required)
1. **End Session**: Click "End Session" button
2. **Notification**: "Session ended. Please rate your experience."
3. **Modal Opens**: Rating modal appears (cannot be closed)
4. **Warning**: Clear message that rating is required
5. **Rating**: Must select 1-5 stars to continue
6. **Completion**: After rating, session fully completes
7. **Navigation**: Can now return to dashboard

### For Mentors (No Rating Required)
1. **End Session**: Click "End Session" button
2. **Completion**: Session immediately completes
3. **Navigation**: Directly return to dashboard

## Technical Details

### API Endpoints Modified

#### POST `/api/sessions/:id/end`
```javascript
// Before: Always set status = 'completed'
// After: Set status based on user role
const newStatus = userData?.role === 'mentee' ? 'pending_rating' : 'completed';
```

#### POST `/api/ratings`
```javascript
// Before: Only accept ratings for completed sessions
// After: Accept ratings for completed OR pending_rating sessions
if (sessionData.status !== 'completed' && sessionData.status !== 'pending_rating') {
  return res.status(400).json({ error: 'Session must be completed or pending rating to rate' });
}

// Auto-complete pending sessions
if (sessionData.status === 'pending_rating') {
  await query('UPDATE sessions SET status = \'completed\' WHERE id = $1', [sessionId]);
}
```

### Database Queries Updated
- Session history queries include `pending_rating`
- Message access allows `pending_rating` sessions
- Statistics calculations exclude `pending_rating` (only count completed)

## Migration Steps

### 1. Database Migration
```bash
# Run the migration script
node migrate-mandatory-rating.js

# Or manually execute SQL:
ALTER TABLE sessions DROP CONSTRAINT IF EXISTS sessions_status_check;
ALTER TABLE sessions ADD CONSTRAINT sessions_status_check 
CHECK (status IN ('requested', 'active', 'completed', 'cancelled', 'pending_rating'));
```

### 2. Application Restart
- Restart backend server to load new schema
- Frontend automatically uses new components

## Benefits

### For Platform Quality
- **Guaranteed Feedback**: Every session gets rated
- **Data Completeness**: No missing ratings in analytics
- **Mentor Improvement**: Consistent feedback for growth

### For Mentors
- **Reliable Statistics**: Accurate rating calculations
- **Feedback Loop**: Regular input for improvement
- **Recognition**: Consistent rating collection

### For Students
- **Accountability**: Encouraged to provide feedback
- **Quality Assurance**: Helps maintain platform standards
- **Voice**: Ensures their experience is recorded

## Error Handling

### Frontend Safeguards
- Modal cannot be closed without rating (for mentees)
- Clear error messages if rating missing
- Graceful handling of network errors
- Fallback navigation if needed

### Backend Validation
- Proper status validation in all endpoints
- Transaction safety for status updates
- Error logging for debugging
- Backward compatibility maintained

## Testing Scenarios

### Test Cases
1. **Mentee Ends Session**: Verify mandatory rating flow
2. **Mentor Ends Session**: Verify direct completion
3. **Rating Submission**: Verify session completion
4. **Modal Behavior**: Verify cannot close without rating
5. **Statistics**: Verify only completed sessions counted
6. **Navigation**: Verify blocked until rating submitted

### Manual Testing Steps
1. Start a session as mentee
2. End the session
3. Verify rating modal appears and cannot be closed
4. Submit rating
5. Verify session completes and navigation works
6. Check mentor statistics updated

## Future Enhancements

### Potential Additions
- **Rating Reminders**: Email/notification if rating pending too long
- **Partial Ratings**: Allow saving draft ratings
- **Rating Categories**: Separate ratings for different aspects
- **Anonymous Feedback**: Option for anonymous ratings
- **Rating Analytics**: Detailed rating trend analysis

## Troubleshooting

### Common Issues
1. **Migration Fails**: Run SQL commands manually
2. **Modal Won't Close**: Check mandatory prop is set correctly
3. **Statistics Wrong**: Verify only completed sessions counted
4. **Session Stuck**: Check rating submission completes session

### Debug Steps
1. Check database constraint exists
2. Verify session status in database
3. Check frontend props passed correctly
4. Verify API responses include new status
5. Test rating submission flow end-to-end