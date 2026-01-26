# Firebase Auth: Free Plan vs Blaze Plan

## Spark (Free) Plan — What You Can Use

| Auth method              | Free on Spark? | Notes                                      |
|--------------------------|----------------|--------------------------------------------|
| **Email / Password**     | ✅ Yes         | 1,000 verification emails/day; 150 password-reset/day |
| **Google Sign-In**       | ✅ Yes         | No extra cost                              |
| **Apple Sign-In**        | ✅ Yes         | No extra cost                              |
| **Anonymous**            | ✅ Yes         | No extra cost                              |
| **Phone (SMS)**          | ❌ No          | Requires **Blaze** + billing               |

**Limits (Spark):**
- ~3,000 daily active users (Tier 1)
- 100 account creations/hour per IP
- Unlimited registered user accounts

---

## Blaze (Pay-as-you-go) Plan

**No fixed monthly fee.** You only pay for usage above the free quotas.

### Auth pricing on Blaze

| Service              | Free tier (Blaze)     | After free tier        |
|----------------------|------------------------|------------------------|
| **Phone (SMS)**      | ~10,000 verifications/month* | ~$0.01–0.06 per SMS (varies by country) |
| **Email / Password** | Same as Spark         | No extra charge        |
| **Google, Apple, etc.** | Same as Spark      | No extra charge        |

\* Exact free quota depends on region; check [Firebase Pricing](https://firebase.google.com/pricing).

### Other common Blaze costs (outside Auth)

- **Firestore:** ~$0.06/100K reads, ~$0.18/100K writes (generous free tier)
- **Cloud Functions:** 2M invocations/month free, then ~$0.40/million
- **Storage:** Free tier, then ~$0.026/GB/month

**Free credits:** New Google Cloud accounts often get **$300** in credits.

---

## Recommendation for Your App

- **Stay on Spark (free)** if you use **Email/Password**, **Google**, or **Apple** only → $0.
- **Use Blaze** only if you need **Phone (SMS)** auth.  
  - Use **test phone numbers** (Firebase Console) for development → no SMS, no billing.  
  - For production SMS, enable Blaze + billing; you’ll only pay beyond the free verification quota.

---

## References

- [Firebase Pricing](https://firebase.google.com/pricing)
- [Auth limits & quotas](https://firebase.google.com/docs/auth/limits)
- [Blaze plan overview](https://firebase.google.com/docs/projects/billing/firebase-pricing-plans)
