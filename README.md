# Playwright MCP Server for Render.com + n8n

## What This Does

This deploys a Playwright MCP server to Render.com that you can connect to n8n for browser automation.

## Files You Need

1. **package.json** - Dependencies
2. **server.js** - The MCP server code
3. **render.yaml** - Render deployment config
4. **.gitignore** - Git ignore file

## Step-by-Step Deployment

### 1. Create GitHub Repository

```bash
# Create a new folder
mkdir playwright-mcp-server
cd playwright-mcp-server

# Put all the downloaded files in this folder

# Initialize git
git init
git add .
git commit -m "Initial commit"

# Create a repo on GitHub, then:
git remote add origin https://github.com/YOUR_USERNAME/playwright-mcp-server.git
git push -u origin main
```

### 2. Deploy to Render.com

1. Go to https://render.com and sign up/login
2. Click **"New +"** → **"Web Service"**
3. Click **"Connect account"** to link GitHub
4. Select your **playwright-mcp-server** repository
5. Render will auto-detect the configuration from `render.yaml`
6. Click **"Create Web Service"**
7. Wait 5-10 minutes for deployment
8. **Save your service URL**: `https://your-service-name.onrender.com`

### 3. Test Your Deployment

```bash
curl https://your-service-name.onrender.com/health
```

You should see:
```json
{
  "status": "healthy",
  "service": "playwright-mcp-server"
}
```

### 4. Connect to n8n

1. **In n8n, create a new workflow**

2. **Add an "AI Agent" node**
   - Search for "AI Agent" in n8n
   - Add it to your canvas

3. **Add "MCP Client Tool" to the AI Agent**
   - In the AI Agent settings
   - Under "Tools", click "Add tool"
   - Search for "MCP Client Tool"
   - Add it

4. **Configure the MCP Client Tool**
   - **SSE Endpoint**: `https://your-service-name.onrender.com/sse`
   - **Authentication**: Select "None"

5. **Activate your workflow**

6. **Test it** with a prompt like:
   ```
   Navigate to google.com and tell me what you see
   ```

## Your Endpoints

After deployment, you'll have:

- **SSE Endpoint**: `https://your-service-name.onrender.com/sse` (for n8n)
- **Health Check**: `https://your-service-name.onrender.com/health` (to verify it's running)

## Important Notes

### Free Tier Limitations
- Service sleeps after 15 minutes of no activity
- First request after sleep takes 30-60 seconds
- Upgrade to Starter ($7/month) for always-on service

### Troubleshooting

**"Can't connect to MCP server"**
1. Check if service is running: `curl https://your-service.onrender.com/health`
2. Wait 60 seconds if on free tier (service might be waking up)
3. Verify the SSE endpoint URL is exactly correct in n8n

**Server keeps sleeping**
- This is normal on free tier
- Upgrade to Starter plan for production use

## What You Can Do

Once connected, your n8n AI agent can:
- Navigate to any website
- Click buttons and links
- Fill out forms
- Take screenshots
- Extract text and data
- Scroll pages
- Wait for elements
- Run JavaScript on pages

## Example Prompts for n8n

- "Go to example.com and take a screenshot"
- "Navigate to google.com and search for 'n8n automation'"
- "Open this URL and extract all the headings"
- "Go to this form and fill in the email field with test@example.com"

## Security (For Production)

For production use, you should:
1. Add authentication (Bearer token)
2. Restrict CORS to only your n8n domain
3. Implement rate limiting
4. Upgrade to paid Render plan

## Cost

- **Free**: Good for testing, service sleeps
- **Starter ($7/month)**: Always-on, recommended
- **Standard ($25/month)**: High performance

## Support

Check Render logs if something goes wrong:
- Go to Render dashboard
- Click your service
- Click "Logs" tab

## License

MIT
