# Universal AI Assistant - Installation & Setup Guide

## 🚀 Quick Start

The Universal AI Assistant is now integrated into your Nuxt 4.0 application! This embeddable AI assistant works alongside your existing codebase without requiring any architectural changes.

### ✅ What's Already Installed

Your application now includes:

- **🧠 AI Composable**: Auto-imported `useAI()` composable
- **🔌 Client Plugin**: Automatic AI initialization on client-side
- **💬 UI Component**: Beautiful overlay AI assistant interface  
- **⚙️ Configuration**: Environment variables for AI providers
- **🎯 Actions**: Pre-built actions for navigation, API calls, and browser operations

## ⚡ Instant Usage

**Press `Ctrl/Cmd + K` anywhere in your application to open the AI assistant!**

The AI can immediately:
- Navigate your app: *"Go to the about page"*
- Get page info: *"Show me current route information"*
- Scroll and interact: *"Scroll to top of page"*
- Call your APIs: *"Call the /api/users endpoint"*

## 🔑 AI Provider Setup

### Step 1: Choose Your AI Provider

Add your API key to the `.env` file (create it if it doesn't exist):

```bash
# Option A: OpenAI (Recommended)
NUXT_OPENAI_API_KEY="sk-your-openai-key-here"
NUXT_AI_PROVIDER="openai"

# Option B: Anthropic Claude
NUXT_CLAUDE_API_KEY="sk-ant-your-claude-key-here" 
NUXT_AI_PROVIDER="claude"

# Option C: Google Gemini (Free tier available)
NUXT_GEMINI_API_KEY="your-gemini-key-here"
NUXT_AI_PROVIDER="gemini"
```

### Step 2: Get API Keys

#### OpenAI (Recommended)
1. Go to [OpenAI API](https://platform.openai.com/api-keys)
2. Create new API key
3. Copy key to `NUXT_OPENAI_API_KEY`

#### Anthropic Claude
1. Go to [Anthropic Console](https://console.anthropic.com/)
2. Generate API key
3. Copy key to `NUXT_CLAUDE_API_KEY`

#### Google Gemini (Free!)
1. Go to [Google AI Studio](https://makersuite.google.com/app/apikey)
2. Create API key
3. Copy key to `NUXT_GEMINI_API_KEY`

### Step 3: Restart Your Dev Server

```bash
npm run dev
# or
pnpm dev
```

## 🎯 Available AI Actions

The AI assistant comes pre-loaded with powerful actions:

### Navigation Actions
- `[ACTION:navigateToPage("/path")]` - Navigate using Nuxt router
- `[ACTION:getCurrentRoute()]` - Get current route info
- `[ACTION:goBack()]` - Browser back button
- `[ACTION:goForward()]` - Browser forward button

### API Integration
- `[ACTION:callNuxtAPI("endpoint", "method", data)]` - Call your API routes
- `[ACTION:fetchNuxtData("key", "endpoint")]` - Fetch with Nuxt composables

### Browser Operations  
- `[ACTION:scrollToTop()]` - Scroll to page top
- `[ACTION:scrollToElement("selector")]` - Scroll to specific element
- `[ACTION:copyToClipboard("text")]` - Copy text to clipboard
- `[ACTION:getPageInfo()]` - Get detailed page information

### Data Operations
- `[ACTION:setLocalStorage("key", value)]` - Store in localStorage
- `[ACTION:getLocalStorage("key")]` - Get from localStorage

### UI Interactions
- `[ACTION:highlightElement("selector")]` - Highlight page element
- `[ACTION:fillForm(formData)]` - Auto-fill form fields

## 💡 Usage Examples

### Basic Navigation
```
User: "Go to the dashboard page"
AI: [ACTION:navigateToPage("/dashboard")]
✅ Navigated to /dashboard
```

### API Integration
```
User: "Get all users from the API"  
AI: [ACTION:callNuxtAPI("users", "GET")]
✅ API call to users completed
📊 Data: [array of users...]
```

### Browser Automation
```
User: "Fill out the contact form with my info"
AI: [ACTION:fillForm({"name": "John Doe", "email": "john@example.com"})]
✅ Filled 2 form fields
```

## 🔧 Custom Integration

### Add Custom Actions for Your App

In any Vue component or composable:

```javascript
// Add app-specific actions
const { registerActions } = useAI()

registerActions({
  createBlogPost: {
    description: "Create a new blog post",
    parameters: ["title: string", "content: string"],
    execute: async (title, content) => {
      const result = await $fetch('/api/blog', {
        method: 'POST',
        body: { title, content }
      })
      return {
        success: true,
        message: `Blog post "${title}" created!`,
        data: result
      }
    }
  }
})
```

### Set Custom Context

```javascript
const { setContext } = useAI()

// Give AI context about your app state
setContext({
  currentUser: user.value,
  activeProject: project.value,
  permissions: userPermissions.value
})
```

### Advanced Configuration

```javascript
const { ai } = useAI()

// Configure AI behavior
ai.setContext({
  appName: "My Amazing App",
  userRole: "admin",
  availableFeatures: ["posts", "users", "analytics"]
})

// Register complex workflows
ai.registerActions({
  generateReport: {
    description: "Generate analytics report",
    parameters: ["type: string", "dateRange: string"],
    execute: async (type, dateRange) => {
      // Multi-step workflow
      const data = await fetchAnalytics(type, dateRange)
      const report = await generatePDF(data)
      await saveReport(report)
      return { success: true, reportUrl: report.url }
    }
  }
})
```

## 🎨 UI Customization

The AI assistant automatically adapts to your app's theme:

- **Light/Dark Mode**: Automatically detects `prefers-color-scheme`
- **Responsive**: Works on desktop, tablet, and mobile
- **Accessible**: Full keyboard navigation and screen reader support
- **Non-intrusive**: Overlay design that doesn't affect your existing UI

### Custom Styling (Optional)

Override AI assistant styles in your CSS:

```css
/* Custom AI assistant theme */
.ai-assistant-modal {
  /* Your custom styles */
  --ai-primary-color: #your-brand-color;
  --ai-background: #your-background;
}
```

## 📱 Mobile Support

The AI assistant is fully responsive and works perfectly on mobile devices:

- **Touch-friendly**: Large touch targets
- **Responsive layout**: Adapts to screen size
- **Mobile keyboard**: Optimized input experience
- **Performance**: Lightweight and fast

## 🔒 Security & Privacy

- **Client-side only**: No data stored on our servers
- **Your API keys**: Direct connection to AI providers
- **Local storage**: History and context stored locally
- **No tracking**: Zero analytics or data collection

## 🛠️ Troubleshooting

### AI Assistant Not Opening
1. Check that `Ctrl/Cmd + K` is not blocked by browser
2. Verify the component is properly imported
3. Check browser console for errors

### No AI Responses  
1. Verify API key in `.env` file
2. Check API key is valid and has credits
3. Restart dev server after adding keys

### Actions Not Working
1. Check browser console for JavaScript errors
2. Verify action syntax: `[ACTION:functionName(params)]`
3. Ensure actions are properly registered

### Common Issues

```bash
# Issue: "AI provider not configured"
# Solution: Add API key to .env file
NUXT_OPENAI_API_KEY="your-key-here"

# Issue: Component not rendering
# Solution: Restart dev server
pnpm dev

# Issue: Actions not executing  
# Solution: Check action syntax
[ACTION:navigateToPage("/path")]  # ✅ Correct
navigateToPage("/path")           # ❌ Missing [ACTION: wrapper
```

## 🚀 Advanced Features

### Multi-Provider Setup
```bash
# Use multiple AI providers for redundancy
NUXT_OPENAI_API_KEY="key1"
NUXT_CLAUDE_API_KEY="key2"  
NUXT_GEMINI_API_KEY="key3"
NUXT_AI_PROVIDER="openai"  # Primary provider
```

### Production Deployment

For production builds, ensure environment variables are set:

```bash
# Vercel
vercel env add NUXT_OPENAI_API_KEY

# Netlify  
netlify env:set NUXT_OPENAI_API_KEY your-key

# Docker
ENV NUXT_OPENAI_API_KEY=your-key
```

## 🎯 Next Steps

1. **Press `Ctrl/Cmd + K`** to try the AI assistant
2. **Add your API key** to enable full AI capabilities
3. **Create custom actions** for your specific app needs
4. **Set context** to give AI understanding of your app state

## 💪 What's Possible Now

Your app now has a powerful AI assistant that can:

- ✅ Navigate your entire application
- ✅ Call any of your existing API endpoints
- ✅ Interact with the browser and DOM
- ✅ Store and retrieve data
- ✅ Automate complex workflows
- ✅ Provide intelligent suggestions
- ✅ Execute multi-step processes

**The AI assistant becomes more powerful as you add custom actions specific to your application!**

---

## 🆘 Need Help?

- **Documentation**: This guide covers all basic setup
- **Examples**: Look at the pre-built actions for inspiration
- **Debug**: Check browser console for detailed error messages
- **API Keys**: Each provider has specific setup instructions above

**🎉 Congratulations! Your app now has a Universal AI Assistant that can help users accomplish tasks naturally through conversation.**