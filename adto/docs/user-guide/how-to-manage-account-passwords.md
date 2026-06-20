# How to manage account passwords

## What this feature does

ADTO lets each signed-in user change their own password. Admins can reset or set a new password for a user account from Settings.

## When to use it

Use **Account** when you know your current password and want to change it. Admins should use **Settings** when a user needs help regaining access.

## Before you begin

You must be signed in with an active account. Admin password resets require a matching Supabase Auth user for the profile.

## Steps

1. Open **Account**.
2. Enter your current password.
3. Enter and confirm the new password.
4. Click **Update password**.
5. Admins can open **Settings**, find the user, enter a new password, confirm it, and click **Set password**.

## What happens next

The new password is saved in Supabase Auth. ADTO does not store or display plain-text passwords.

## Tips or reminders

Admins can reset passwords, but they cannot see an existing password. If a user forgets their password, set a new temporary password and tell the user to change it after signing in.

## Common questions or issues

If an admin reset fails, check that the profile email matches a Supabase Auth user and that the service role key is configured on the server.
