# Security Specification — Smart Expense Tracker

## 1. Data Invariants

1. **Ownership Isolation**: Every `UserProfile`, `Transaction`, and `Budget` document belongs strictly to a single authenticated and email-verified user (`request.auth.uid == userId` and `data.userId == request.auth.uid`).
2. **Parent Existence (Master Gate)**: A `Transaction` or `Budget` document cannot be created unless the parent `/users/{userId}` document exists.
3. **Currency Integrity**: Every `currency` field must strictly match the 10-currency ISO allowlist (`USD`, `BDT`, `EUR`, `GBP`, `INR`, `CAD`, `AUD`, `AED`, `SAR`, `JPY`).
4. **Numeric Bounds**: Transaction `amount` and Budget `limitAmount` must be strictly positive numbers (`> 0`) and bounded (`<= 1000000000`) to prevent negative-amount or overflow manipulation.
5. **Temporal Integrity & Immutability**: `createdAt` must equal `request.time` on creation and cannot be altered on update; `updatedAt` must equal `request.time` on both create and update; `userId` and `uid` are immutable.
6. **Zero Shadow Fields**: Document payloads on `create` must strictly match allowed keys via `hasAll` + `hasOnly`, and `update` operations must strictly constrain `affectedKeys().hasOnly(...)`.

## 2. The "Dirty Dozen" Adversarial Payloads

1. **Cross-User Read/Write**: User B attempts to read or create `/users/{userA}/transactions/tx1` -> `PERMISSION_DENIED`.
2. **User Directory Enumeration**: Authenticated user attempts `list` on `/users` -> `PERMISSION_DENIED`.
3. **Unverified Email Write**: User with `email_verified: false` attempts to create a transaction -> `PERMISSION_DENIED`.
4. **UID Spoofing in Payload**: User A creates `/users/{userA}/transactions/tx1` with `userId: userB` -> `PERMISSION_DENIED`.
5. **Shadow Field Injection**: User A creates a transaction with an extra `isAdmin: true` or `verified: true` field -> `PERMISSION_DENIED`.
6. **Negative / Zero Amount**: User A creates a transaction with `amount: -500` or `amount: 0` -> `PERMISSION_DENIED`.
7. **Invalid Currency Code**: User A creates a budget with `currency: "XYZ"` -> `PERMISSION_DENIED`.
8. **Malformed Date/Month Format**: User A submits `date: "11/16/2026"` or `month: "Nov-2026"` -> `PERMISSION_DENIED`.
9. **Oversized Note (Denial of Wallet)**: User A submits a 10KB `note` string -> `PERMISSION_DENIED`.
10. **Path ID Poisoning**: User A submits a transaction ID containing spaces/special chars or >128 chars -> `PERMISSION_DENIED`.
11. **Client Timestamp Forgery**: User A creates a transaction with a backdated `createdAt` not equal to `request.time` -> `PERMISSION_DENIED`.
12. **Immutable Field Tampering**: User A updates a transaction attempting to mutate `userId` or `createdAt` -> `PERMISSION_DENIED`.
