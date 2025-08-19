# Canvas MVP - Build & Release Platform

[![Version](https://img.shields.io/badge/version-0.1.0-blue)](https://github.com/your-org/canvas-mvp/releases)
[![Build Status](https://img.shields.io/github/actions/workflow/status/your-org/canvas-mvp/common.yml?branch=main)](https://github.com/your-org/canvas-mvp/actions)
[![License](https://img.shields.io/badge/license-MIT-green)](LICENSE)

A comprehensive production-ready system for shipping Canvas MVP v0.1.0 with web app on Vercel + iOS/Android apps built with Capacitor.

🚀 **Built with**: Nuxt.js, Vue 3, TypeScript, Prisma, Capacitor  
🎯 **Goal**: Ship Canvas MVP to production with confidence  
📱 **Platforms**: Web (Vercel) + iOS (App Store) + Android (Google Play)

## 🚀 Quick Start

```bash
# Clone and install
git clone <repository-url>
cd canvas-mvp
pnpm install

# Copy environment variables
cp .env.example .env

# Run development server
pnpm dev
```

## 📦 Project Structure

```
canvas-mvp/
├── .github/workflows/     # CI/CD pipelines
├── android/              # Android Capacitor project
├── ios/                  # iOS Capacitor project
├── prisma/              # Database schema & migrations
├── scripts/             # Release automation scripts
├── app/                 # Nuxt.js application
│   ├── components/      # Vue components
│   ├── pages/          # Application pages
│   └── assets/         # Static assets
├── capacitor.config.ts  # Mobile app configuration
├── nuxt.config.ts      # Nuxt configuration
└── package.json        # Dependencies & scripts
```

## 🛠️ Available Scripts

### Development
```bash
pnpm dev              # Start development server
pnpm build            # Build for production
pnpm preview          # Preview production build
pnpm lint             # Run ESLint
pnpm typecheck        # TypeScript checking
pnpm test             # Run tests
pnpm test:ui          # Run tests with UI
```

### Database
```bash
pnpm db:generate      # Generate Prisma client
pnpm db:migrate       # Run database migrations
pnpm db:studio        # Open Prisma Studio
```

### Mobile Development
```bash
pnpm cap:sync         # Sync web build to mobile
pnpm cap:ios          # Open iOS project in Xcode
pnpm cap:android      # Open Android project in Android Studio
pnpm mobile:build     # Build web and sync to mobile
```

### Release Management
```bash
# Setup release branch (run once per release)
node scripts/setup-release-branch.js

# Create release candidate
pnpm release:rc 1

# Create production release
pnpm release:prod --force
```

## 🔄 Release Process

### 1. Code Freeze & Release Branch

```bash
# From main branch - create release branch
node scripts/setup-release-branch.js
```

This creates a `release/v0.1.0` branch and enforces code freeze.

### 2. Release Candidate (RC)

```bash
# From release branch - create RC
pnpm release:rc 1
```

This will:
- Run quality gates (lint, test, typecheck)
- Create RC tag (`v0.1.0-rc.1`)
- Trigger GitHub Actions to build all platforms
- Create draft GitHub release with artifacts

### 3. QA Testing

Download builds from GitHub release:
- **Web**: Deploy to staging environment
- **iOS**: Upload to TestFlight for internal testing
- **Android**: Upload to Play Console internal track

### 4. Production Release

```bash
# After QA sign-off
pnpm release:prod --force
```

This will:
- Merge release branch to main
- Create production tag (`v0.1.0`)
- Trigger production deployment
- Generate changelog
- Bump version for next development cycle

## 🏗️ CI/CD Pipeline

### GitHub Actions Workflows

1. **Common CI** (`.github/workflows/common.yml`)
   - Runs on every push to main/release branches
   - Lint, test, build, security audit
   - Stores build artifacts

2. **Release Candidate** (`.github/workflows/rc.yml`)
   - Manual trigger with RC number
   - Builds web, iOS, Android
   - Creates GitHub release with artifacts

3. **Production** (`.github/workflows/prod.yml`)
   - Triggered by version tags
   - Deploys to Vercel
   - Runs database migrations
   - Updates changelog

## 🔧 Environment Setup

Copy `.env.example` to `.env` and configure:

### Required for Development
- `DATABASE_URL`: PostgreSQL connection string
- `NUXT_UI_PRO_LICENSE`: Nuxt UI Pro license

### Required for CI/CD
- `VERCEL_TOKEN`, `VERCEL_ORG_ID`, `VERCEL_PROJECT_ID`
- `FASTLANE_APPLE_APPLICATION_SPECIFIC_PASSWORD`
- `ANDROID_KEYSTORE_*` variables
- `SLACK_WEBHOOK` for notifications

## 🚦 Quality Gates

### Pre-Release Checks
- ✅ TypeScript compilation
- ✅ ESLint passing
- ✅ Unit tests passing
- ✅ Security audit
- ✅ Build successful

### Production Checks
- ✅ QA sign-off required
- ✅ Database backup created
- ✅ Smoke tests passing
- ✅ Monitoring active

## 🆘 Troubleshooting

### Common Issues

**Build failures:**
```bash
# Clear cache and reinstall
rm -rf node_modules .nuxt .output
pnpm install
pnpm build
```

**Mobile sync issues:**
```bash
# Reset Capacitor
pnpm cap:sync
```

### Rollback Procedures

**Web app rollback:**
```bash
git tag -d v0.1.0
git push origin :refs/tags/v0.1.0
```

**Mobile apps:**
- Cannot rollback once published - prepare hotfix instead

## 🤝 Contributing

1. Create feature branch from `main`
2. Make changes following conventions
3. Run quality checks: `pnpm lint && pnpm test`
4. Create pull request to `main`
5. After merge, changes go to next release

### Commit Convention

```
<type>[optional scope]: <description>
```

Types: `feat`, `fix`, `docs`, `style`, `refactor`, `perf`, `test`, `build`, `ci`, `chore`

---

**🎯 Goal**: Ship Canvas MVP 0.1.0 to production with confidence!
