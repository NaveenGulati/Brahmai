# AWS S3 Setup Guide for BrahmAI QB Admin

This guide will help you set up AWS S3 for PDF storage in the QB Admin module.

---

## 📋 Prerequisites

- AWS Account (create at https://aws.amazon.com if you don't have one)
- Access to AWS Console
- Access to Render dashboard (for environment variables)

---

## 🪣 Step 1: Create S3 Bucket

### 1.1 Navigate to S3
1. Log in to AWS Console: https://console.aws.amazon.com
2. Search for "S3" in the top search bar
3. Click on "S3" to open the S3 dashboard

### 1.2 Create Bucket
1. Click **"Create bucket"** button
2. Enter bucket details:
   - **Bucket name:** `brahmai-textbooks` (must be globally unique)
   - **AWS Region:** `us-east-1` (or your preferred region)
3. **Object Ownership:**
   - Select **"ACLs enabled"**
   - Select **"Bucket owner preferred"**
4. **Block Public Access settings:**
   - **Uncheck** "Block all public access"
   - Check the acknowledgment box
   - ⚠️ This allows students to access uploaded PDFs
5. Leave other settings as default
6. Click **"Create bucket"**

---

## 🔐 Step 2: Configure Bucket Policy

### 2.1 Open Bucket Permissions
1. Click on your newly created bucket name
2. Go to the **"Permissions"** tab
3. Scroll down to **"Bucket policy"**
4. Click **"Edit"**

### 2.2 Add Public Read Policy
Paste the following policy (replace `brahmai-textbooks` if you used a different name):

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "PublicReadGetObject",
      "Effect": "Allow",
      "Principal": "*",
      "Action": "s3:GetObject",
      "Resource": "arn:aws:s3:::brahmai-textbooks/*"
    }
  ]
}
```

5. Click **"Save changes"**

### 2.3 Enable CORS (Optional, for direct browser uploads)
1. In the same **"Permissions"** tab
2. Scroll to **"Cross-origin resource sharing (CORS)"**
3. Click **"Edit"**
4. Paste:

```json
[
  {
    "AllowedHeaders": ["*"],
    "AllowedMethods": ["GET", "PUT", "POST"],
    "AllowedOrigins": ["*"],
    "ExposeHeaders": []
  }
]
```

5. Click **"Save changes"**

---

## 👤 Step 3: Create IAM User for Programmatic Access

### 3.1 Navigate to IAM
1. In AWS Console, search for "IAM"
2. Click on **"IAM"** to open IAM dashboard

### 3.2 Create User
1. Click **"Users"** in the left sidebar
2. Click **"Add users"** (or "Create user")
3. Enter user details:
   - **User name:** `brahmai-s3-uploader`
4. Click **"Next"**

### 3.3 Set Permissions
1. Select **"Attach policies directly"**
2. Search for **"AmazonS3FullAccess"**
3. Check the box next to **"AmazonS3FullAccess"**
4. Click **"Next"**
5. Click **"Create user"**

### 3.4 Create Access Key
1. Click on the newly created user name
2. Go to **"Security credentials"** tab
3. Scroll to **"Access keys"**
4. Click **"Create access key"**
5. Select use case: **"Application running outside AWS"**
6. Click **"Next"**
7. (Optional) Add description: "BrahmAI QB Admin S3 Upload"
8. Click **"Create access key"**

### 3.5 Save Credentials
⚠️ **IMPORTANT:** Save these credentials immediately - you won't see them again!

- **Access Key ID:** `AKIA...` (starts with AKIA)
- **Secret Access Key:** `...` (long random string)

Click **"Download .csv file"** to save them securely.

---

## 🚀 Step 4: Add Environment Variables to Render

### 4.1 Navigate to Render Dashboard
1. Go to https://dashboard.render.com
2. Find your BrahmAI web service
3. Click on the service name

### 4.2 Add Environment Variables
1. Click **"Environment"** in the left sidebar
2. Click **"Add Environment Variable"**
3. Add the following variables:

| Key | Value | Example |
|-----|-------|---------|
| `AWS_ACCESS_KEY_ID` | Your Access Key ID | `AKIAIOSFODNN7EXAMPLE` |
| `AWS_SECRET_ACCESS_KEY` | Your Secret Access Key | `wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY` |
| `AWS_REGION` | Your bucket region | `us-east-1` |
| `AWS_S3_BUCKET_NAME` | Your bucket name | `brahmai-textbooks` |

4. Click **"Save Changes"**

### 4.3 Redeploy
1. Render will automatically redeploy your service
2. Wait for deployment to complete (5-10 minutes)

---

## ✅ Step 5: Verify Setup

### 5.1 Test PDF Upload
1. Log in to BrahmAI as QB Admin
2. Go to **QB Admin Dashboard** → **Textbooks** tab
3. Click **"Add Textbook"**
4. Create a test textbook
5. Click **"Upload PDF"**
6. Select the textbook and upload a small PDF
7. Check for success message

### 5.2 Verify S3 Upload
1. Go to AWS S3 Console
2. Open your bucket: `brahmai-textbooks`
3. You should see a folder: `textbooks/`
4. Inside, you should see your uploaded PDF

### 5.3 Test Public Access
1. Click on the uploaded PDF in S3
2. Copy the **"Object URL"**
3. Open the URL in a new browser tab
4. The PDF should download/open
5. ✅ If it works, setup is complete!

---

## 🔧 Troubleshooting

### Error: "Access Denied" when uploading
**Solution:**
- Check IAM user has `AmazonS3FullAccess` policy
- Verify Access Key ID and Secret Access Key are correct
- Check environment variables in Render

### Error: "Bucket not found"
**Solution:**
- Verify bucket name in `AWS_S3_BUCKET_NAME` matches actual bucket name
- Check region in `AWS_REGION` matches bucket region

### Error: "Cannot access PDF URL"
**Solution:**
- Verify bucket policy allows public read (`s3:GetObject`)
- Check "Block Public Access" is disabled
- Ensure ACLs are enabled

### PDF uploads but chapters not generated
**Solution:**
- Check Render logs for errors
- Verify PDF is OCR'd (has selectable text)
- Check AI API key is configured (`BUILT_IN_FORGE_API_KEY`)

---

## 💰 Cost Estimation

### S3 Storage Costs (us-east-1):
- **Storage:** $0.023 per GB/month
- **PUT requests:** $0.005 per 1,000 requests
- **GET requests:** $0.0004 per 1,000 requests

### Example Monthly Cost:
- 100 textbooks × 50 MB each = 5 GB storage
- Storage: 5 GB × $0.023 = **$0.12/month**
- 1,000 uploads = **$0.005**
- 10,000 student downloads = **$0.004**
- **Total: ~$0.13/month**

### Free Tier (First 12 months):
- 5 GB storage
- 20,000 GET requests
- 2,000 PUT requests
- **Your usage will likely be FREE for the first year!**

---

## 🔒 Security Best Practices

### 1. Restrict IAM Permissions (Optional)
Instead of `AmazonS3FullAccess`, create a custom policy:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "s3:PutObject",
        "s3:PutObjectAcl",
        "s3:GetObject",
        "s3:DeleteObject"
      ],
      "Resource": "arn:aws:s3:::brahmai-textbooks/*"
    },
    {
      "Effect": "Allow",
      "Action": "s3:ListBucket",
      "Resource": "arn:aws:s3:::brahmai-textbooks"
    }
  ]
}
```

### 2. Enable Versioning (Optional)
- Protects against accidental deletions
- Go to bucket → Properties → Versioning → Enable

### 3. Enable Server-Side Encryption (Optional)
- Encrypts PDFs at rest
- Go to bucket → Properties → Default encryption → Enable

### 4. Set Lifecycle Rules (Optional)
- Automatically delete old PDFs after X days
- Go to bucket → Management → Lifecycle rules

---

## 📞 Support

If you encounter issues:
1. Check Render logs for detailed error messages
2. Verify all environment variables are set correctly
3. Test S3 access using AWS CLI (optional)
4. Contact AWS Support for S3-specific issues

---

## ✅ Checklist

- [ ] AWS account created
- [ ] S3 bucket created: `brahmai-textbooks`
- [ ] Public access enabled for bucket
- [ ] Bucket policy added (public read)
- [ ] IAM user created: `brahmai-s3-uploader`
- [ ] Access key and secret key generated
- [ ] Environment variables added to Render
- [ ] Service redeployed
- [ ] Test PDF upload successful
- [ ] PDF accessible via public URL

---

**Once all checkboxes are complete, your S3 setup is ready! 🎉**

You can now upload PDFs and auto-generate chapters in the QB Admin module.
