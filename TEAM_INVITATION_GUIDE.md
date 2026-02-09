# 👥 Team Invitation Guide

## How to Invite Teammates to Your Project

### Quick Steps:

1. **Navigate to Team Page**
   - Click on "Team" in the sidebar navigation
   - Or go to: `http://localhost:5000/team`

2. **Click "Invite Member" Button**
   - Located in the top right corner of the Team page

3. **Fill in Member Details**
   - **Username**: Create a username for your teammate (e.g., "john.doe")
   - **Temporary Password**: Set a password they'll use to log in (minimum 6 characters)
   - **Role**: Choose either:
     - **Member** - Can view and work on projects/tasks
     - **Admin** - Full access to manage projects, tasks, and invite others

4. **Click "Invite Member"**
   - The new teammate is created instantly
   - They can log in immediately using the credentials you provided

5. **Share Login Details**
   - Send your teammate:
     - Username you created
     - Password you set
     - App URL: `http://localhost:5000`
   - **Important**: Share the password securely (Slack DM, encrypted email, password manager, etc.)

---

## Example Invitation

**Scenario:** Inviting "Sarah" as an Admin

1. Click "Invite Member"
2. Fill in:
   - Username: `sarah.johnson`
   - Password: `TempPass123!`
   - Role: `Admin`
3. Click "Invite Member"
4. Share with Sarah:
   ```
   Hey Sarah! I've added you to our TeamFlow workspace.
   
   Login here: http://localhost:5000
   Username: sarah.johnson
   Password: TempPass123!
   
   Please change your password after logging in.
   ```

---

## Roles Explained

### Owner
- **Who**: Person who created the organization
- **Can**: Everything (manage billing, invite/remove members, full project access)
- **Note**: Only one owner per organization

### Admin
- **Who**: Trusted team members
- **Can**: Invite members, manage all projects and tasks
- **Cannot**: Manage billing or subscription

### Member
- **Who**: Regular team members
- **Can**: Work on projects and tasks
- **Cannot**: Invite others or manage organization settings

---

## Subscription Limits

| Plan | Max Team Members |
|------|------------------|
| Free | 5 members |
| Professional | 20 members |
| Enterprise | Unlimited |

**Note**: Upgrade your plan in Settings if you need more team members.

---

## What Happens After Invitation?

1. ✅ New member appears in your Team page immediately
2. ✅ They can log in right away with the credentials you provided
3. ✅ They'll see all projects in your organization
4. ✅ They can create/edit tasks based on their role
5. ✅ They're part of the same organization (shared projects, tasks, etc.)

---

## Security Best Practices

### ✅ Do:
- Use strong temporary passwords (mix of letters, numbers, symbols)
- Share passwords through secure channels (Slack DM, encrypted email)
- Ask teammates to change their password after first login
- Assign appropriate roles (don't make everyone an admin)
- Regularly review your team members

### ❌ Don't:
- Share passwords in public channels
- Use simple passwords like "password123"
- Give admin access unless necessary
- Leave unused accounts active

---

## Removing Team Members

Currently, team member removal is not implemented. If you need to remove someone:

**Temporary Solution:**
1. Ask them to stop using their account
2. Change their password if security is a concern

**Future Feature:** 
We'll add a "Remove Member" button soon!

---

## Common Issues

### "Username already exists"
- Choose a different username
- Username must be unique across ALL organizations

### "Only owners and admins can invite members"
- You need Owner or Admin role to invite
- Ask your organization owner to invite or promote you

### "Failed to invite member"
- Check your subscription limits
- Ensure all fields are filled correctly
- Password must be at least 6 characters

---

## Alternative: Sharing Access

If you just want to show someone what you're working on:

1. **Screen Share**: Share your screen in a call
2. **Screenshots**: Take screenshots of your projects/tasks
3. **Export**: (Future feature) Export project data

---

## Need Help?

- Check the console for error messages (F12 in browser)
- Verify you're logged in as Owner or Admin
- Make sure you haven't reached your plan's member limit

---

## Pro Tips

💡 **Naming Convention**: Use a consistent format like `firstname.lastname`

💡 **Password Management**: Use a password generator for secure temporary passwords

💡 **Role Assignment**: Start with Member role, promote to Admin if needed

💡 **Onboarding**: Create a welcome message template to send new members

💡 **Documentation**: Keep a shared document with team member info

---

**Ready to build your team?** Head to the Team page and start inviting! 🚀
