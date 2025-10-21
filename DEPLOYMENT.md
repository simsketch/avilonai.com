# Deployment Guide for Avilon

This guide walks you through deploying the Avilon AI Therapy Bot to Vercel with Supabase.

## Prerequisites

- GitHub account
- Vercel account (free tier is sufficient)
- Supabase account (free tier is sufficient)
- OpenRouter account with credits

## Step 1: Set Up Supabase

1. Go to [https://supabase.com](https://supabase.com) and create a new project
2. Wait for the project to be provisioned (2-3 minutes)
3. Navigate to the SQL Editor in your Supabase dashboard
4. Copy the entire contents of `lib/db/schema.sql`
5. Paste and execute it in the SQL Editor
6. Verify tables were created by going to Table Editor

### Get Supabase Credentials

1. Go to Settings > API
2. Copy the following values:
   - Project URL
   - `anon` `public` key
   - `service_role` `secret` key (⚠️ keep this secret!)

## Step 2: Set Up OpenRouter

1. Go to [https://openrouter.ai](https://openrouter.ai)
2. Create an account or sign in
3. Navigate to Keys and create a new API key
4. Add credits to your account:
   - Click on "Credits" in the dashboard
   - Add $5-10 (sufficient for testing)
5. Copy your API key

## Step 3: Deploy to Vercel

### Option A: Deploy via Vercel Dashboard

1. Push your code to GitHub:
   ```bash
   git add .
   git commit -m "Initial Avilon deployment"
   git push origin main
   ```

2. Go to [https://vercel.com](https://vercel.com)
3. Click "Add New Project"
4. Import your GitHub repository
5. Configure your project:
   - Framework Preset: Next.js
   - Root Directory: ./
   - Build Command: `npm run build` (default)
   - Output Directory: `.next` (default)

6. Add Environment Variables:

   Click "Environment Variables" and add:

   ```
   NEXT_PUBLIC_SUPABASE_URL=https://YOUR-PROJECT.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
   SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
   NEXTAUTH_URL=https://YOUR-APP.vercel.app
   NEXTAUTH_SECRET=generate-with-openssl-rand-base64-32
   OPENROUTER_API_KEY=your-openrouter-key
   NEXT_PUBLIC_APP_URL=https://YOUR-APP.vercel.app
   ```

   To generate `NEXTAUTH_SECRET`:
   ```bash
   openssl rand -base64 32
   ```

7. Click "Deploy"

### Option B: Deploy via Vercel CLI

1. Install Vercel CLI:
   ```bash
   npm i -g vercel
   ```

2. Login to Vercel:
   ```bash
   vercel login
   ```

3. Deploy:
   ```bash
   vercel
   ```

4. Follow the prompts and add environment variables when asked

## Step 4: Configure Supabase for Production

1. In your Supabase project, go to Authentication > URL Configuration
2. Add your Vercel deployment URL to "Site URL"
3. Add your Vercel URL to "Redirect URLs" with these paths:
   - `https://YOUR-APP.vercel.app/api/auth/callback/credentials`
   - `https://YOUR-APP.vercel.app/*`

## Step 5: Test Your Deployment

1. Visit your Vercel deployment URL
2. Click "Get Started" to create an account
3. Complete the signup flow
4. Complete the intake wizard
5. Start a chat session
6. Verify:
   - Messages are sent and received
   - Mood tracking works
   - Dashboard displays correctly
   - Crisis detection triggers (try typing "I feel hopeless")

## Monitoring & Costs

### Vercel Free Tier Limits
- 100GB bandwidth/month
- 100 hours build time/month
- Unlimited deployments

### Supabase Free Tier Limits
- 500MB database
- 5GB bandwidth/month
- 2GB file storage
- 50,000 monthly active users

### OpenRouter Costs
- deepseek/deepseek-r1-distill-llama-70b: $0.27 per 1M tokens
- Estimated cost: $5-10/month for 100-200 conversations

### Monitor Usage

**Vercel:**
- Dashboard > Analytics
- Check bandwidth and build time usage

**Supabase:**
- Dashboard > Reports
- Monitor database size and API requests

**OpenRouter:**
- Dashboard > Usage
- Track token consumption and costs

## Troubleshooting

### Build Fails

1. Check build logs in Vercel dashboard
2. Verify all environment variables are set
3. Ensure Node.js version compatibility (use Node 18+)

### Authentication Issues

1. Verify `NEXTAUTH_URL` matches your deployment URL
2. Check `NEXTAUTH_SECRET` is set correctly
3. Verify Supabase credentials are correct

### Database Errors

1. Check Supabase SQL Editor for schema issues
2. Verify service role key has admin privileges
3. Check Supabase logs for errors

### Chat Not Working

1. Verify `OPENROUTER_API_KEY` is set
2. Check OpenRouter dashboard for API errors
3. Ensure you have credits in OpenRouter account
4. Check browser console for errors

## Scaling Considerations

For production use beyond POC:

1. **Security**:
   - Implement rate limiting
   - Add CSRF protection
   - Enable RLS (Row Level Security) in Supabase
   - Add content moderation

2. **Compliance**:
   - HIPAA compliance requirements
   - Data encryption at rest and in transit
   - Audit logging
   - Privacy policy and terms of service

3. **Performance**:
   - Add Redis for session caching
   - Implement message queue for chat
   - Optimize database queries
   - Add CDN for static assets

4. **Monitoring**:
   - Error tracking (Sentry)
   - Performance monitoring (Vercel Analytics)
   - User analytics (PostHog, Mixpanel)
   - Uptime monitoring

## Support

If you encounter issues:
1. Check Vercel deployment logs
2. Check Supabase logs
3. Review browser console errors
4. Open a GitHub issue with details

## Next Steps

After successful deployment:
1. Test with real users (5-10 beta testers)
2. Gather feedback on UX and therapy quality
3. Monitor costs and adjust as needed
4. Iterate based on user feedback
5. Consider adding features:
   - Voice input/output
   - Mobile app (React Native)
   - More CBT exercises
   - Progress tracking with charts
   - Therapist dashboard for oversight
