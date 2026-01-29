# Food Sharing Feature Design

A simple food sharing feature where users can allow others to view and copy their foods.

## Overview

- **Owner controls access** - Add user IDs to your sharing list
- **View by user ID** - Recipients enter owner's user ID to see their foods
- **Copy convenience** - One-tap copy any visible food to your collection

## Data Model

### Firestore Structure

```
users/{userId}/
├── foods/{foodId}              # User's foods
└── sharingWith/{recipientId}   # User IDs I share with (doc ID = recipient)
```

Owner only writes to their own `sharingWith` collection. That's it.

### Document Data

```typescript
// sharingWith document (minimal)
{
  added: Date  // when sharing was granted
}
```

## Security Rules

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    
    function isAuthenticated() {
      return request.auth != null;
    }
    
    function isOwner(userId) {
      return isAuthenticated() && request.auth.uid == userId;
    }
    
    match /users/{userId} {
      allow read, write: if isOwner(userId);
      
      // Foods - owner has full access, shared users can read
      match /foods/{foodId} {
        allow read, write: if isOwner(userId);
        allow read: if isAuthenticated() && 
          exists(/databases/$(database)/documents/users/$(userId)/sharingWith/$(request.auth.uid));
      }
      
      // Sharing list - only owner can manage
      match /sharingWith/{recipientId} {
        allow read, write: if isOwner(userId);
      }
    }
  }
}
```

## Repository Interface

```typescript
interface IFoodSharingRepository {
  // Manage who I share with
  shareWith(recipientId: string): Promise<void>;
  stopSharingWith(recipientId: string): Promise<void>;
  getSharingWith(): Promise<string[]>;
  isSharingWith(recipientId: string): Promise<boolean>;

  // View and copy foods
  getFoodsFrom(ownerId: string): Promise<SharedFood[]>;
  copyFood(ownerId: string, foodId: string): Promise<FoodItem>;
}
```

## User Interface

### Sharing Settings

```
┌────────────────────────────────────────┐
│ ← Food Sharing                         │
├────────────────────────────────────────┤
│                                        │
│  MY USER ID                            │
│  ┌────────────────────────────────────┐│
│  │ abc123xyz             [Copy]       ││
│  └────────────────────────────────────┘│
│  Share this with others so they can    │
│  add you to view your foods.           │
│                                        │
│  ─────────────────────────────────────│
│                                        │
│  SHARING MY FOODS WITH                 │
│  ┌────────────────────────────────────┐│
│  │ user_def456           [Remove]     ││
│  │ user_ghi789           [Remove]     ││
│  └────────────────────────────────────┘│
│                                        │
│  [ + Add User ID ]                     │
│                                        │
└────────────────────────────────────────┘
```

### View Shared Foods

```
┌────────────────────────────────────────┐
│ ← View Shared Foods                    │
├────────────────────────────────────────┤
│                                        │
│  Enter user ID:                        │
│  ┌────────────────────────────────────┐│
│  │ abc123xyz                          ││
│  └────────────────────────────────────┘│
│  [ View Foods ]                        │
│                                        │
│  ─────────────────────────────────────│
│                                        │
│  FOODS FROM abc123xyz                  │
│  ┌────────────────────────────────────┐│
│  │ 🍗 Chicken Breast                  ││
│  │    165 cal • 31g protein    [Copy] ││
│  ├────────────────────────────────────┤│
│  │ 🍚 Brown Rice                      ││
│  │    112 cal • 2.6g protein   [Copy] ││
│  └────────────────────────────────────┘│
│                                        │
└────────────────────────────────────────┘
```

## Usage Flow

1. **Owner** adds recipient's user ID to their sharing list
2. **Recipient** enters owner's user ID to view their foods
3. **Recipient** taps "Copy" to add any food to their own collection

## Implementation

```typescript
// Share with someone
async shareWith(recipientId: string): Promise<void> {
  const myId = getCurrentUserId();
  await firestore.doc(`users/${myId}/sharingWith/${recipientId}`).set({
    added: new Date()
  });
}

// View someone's foods (security rules enforce access)
async getFoodsFrom(ownerId: string): Promise<SharedFood[]> {
  const docs = await firestore.collection(`users/${ownerId}/foods`).get();
  return docs.map(doc => ({ ...doc.data(), id: doc.id, ownerId }));
}

// Copy a food to my collection
async copyFood(ownerId: string, foodId: string): Promise<FoodItem> {
  const original = await firestore.doc(`users/${ownerId}/foods/${foodId}`).get();
  const newFood = { 
    ...original.data(), 
    id: generateId(),
    createdAt: new Date(),
    updatedAt: new Date()
  };
  await firestore.doc(`users/${myId}/foods/${newFood.id}`).set(newFood);
  return newFood;
}
```

## Notes

- Security rules handle access control - no need to track "sharedWithMe"
- If recipient isn't in owner's sharing list, Firestore denies the read
- Copy creates an independent food - no link to original
