# Canvas MVP Release Playbook

This is the complete step-by-step guide for shipping Canvas MVP v0.1.0 to production.

## 📋 Pre-Release Checklist

### Development Team ✅
- [ ] All planned features merged to main
- [ ] No breaking changes pending
- [ ] Database migrations tested
- [ ] Documentation updated
- [ ] Security audit completed
- [ ] Performance benchmarks met

### QA Team ✅
- [ ] Test plan prepared
- [ ] Test environment ready
- [ ] Regression test suite updated
- [ ] Performance benchmarks defined
- [ ] Mobile app testing devices ready

### DevOps Team ✅
- [ ] CI/CD pipelines tested
- [ ] Production environment ready
- [ ] Monitoring alerts configured
- [ ] Rollback procedures verified
- [ ] Database backup strategy tested

## 🚀 Release Timeline

### Day -5: Code Freeze
```bash
# Create release branch
node scripts/setup-release-branch.js
```

**Actions:**
- Create `release/v0.1.0` branch
- Notify team of code freeze
- Block new features from merging

### Day -4 to -2: RC Testing
```bash
# Create RC builds
pnpm release:rc 1
pnpm release:rc 2  # if needed
```

**Actions:**
- Build all platforms (web, iOS, Android)
- Deploy to staging environments
- Upload to TestFlight/Play Internal
- Execute QA test plan
- Fix critical bugs via hotfix branches

### Day -1: Final Preparation
- [ ] QA sign-off received
- [ ] Final RC approved
- [ ] Production environment verified
- [ ] Team notified of release schedule

### Day 0: Production Release
```bash
# Ship it! 🚀
pnpm release:prod --force
```

**Actions:**
- Merge release branch to main
- Create production tag
- Deploy web app to Vercel
- Run database migrations
- Submit mobile apps to stores
- Monitor deployment

### Day +1: Post-Release
- [ ] Smoke tests completed
- [ ] Monitoring metrics normal
- [ ] User feedback monitored
- [ ] Mobile app store status checked

## 🔄 Detailed Process

### 1. Code Freeze Phase

**Goal:** Stabilize codebase for release

```bash
# From main branch
git checkout main
git pull origin main
node scripts/setup-release-branch.js
```

**What happens:**
1. Creates `release/v0.1.0` branch
2. Enforces code freeze rules
3. Only hotfixes allowed to merge
4. All new features go to main for next release

**Team Communication:**
- [ ] Slack announcement in #canvas-mvp
- [ ] Email to stakeholders
- [ ] Update project status dashboard

### 2. Release Candidate Phase

**Goal:** Test release-ready builds

```bash
# From release branch
git checkout release/v0.1.0
pnpm release:rc 1
```

**What happens:**
1. Runs full CI pipeline (lint, test, build)
2. Creates RC tag (`v0.1.0-rc.1`)
3. Builds web, iOS, Android artifacts
4. Creates GitHub release (draft)
5. Uploads artifacts for download

**QA Process:**
1. Download artifacts from GitHub release
2. Deploy web build to staging.canvas-mvp.com
3. Upload iOS build to TestFlight (internal)
4. Upload Android build to Play Internal Testing
5. Execute comprehensive test plan
6. Report bugs via GitHub issues
7. Provide sign-off when ready

**Bug Fix Process:**
```bash
# Create hotfix branch
git checkout release/v0.1.0
git checkout -b hotfix/fix-critical-bug

# Make fixes
# ... code changes ...

# Merge back to release
git checkout release/v0.1.0
git merge hotfix/fix-critical-bug
git push origin release/v0.1.0

# Create new RC
pnpm release:rc 2
```

### 3. Production Release Phase

**Goal:** Ship to production

**Prerequisites:**
- [ ] QA sign-off received
- [ ] Final RC testing completed
- [ ] All critical bugs fixed
- [ ] Stakeholder approval obtained

```bash
# Final release
pnpm release:prod --force
```

**What happens:**
1. Validates QA sign-off (--force to skip)
2. Merges release branch to main
3. Creates production tag (`v0.1.0`)
4. Triggers GitHub Actions production workflow
5. Deploys to Vercel
6. Runs database migrations
7. Generates changelog
8. Bumps version for next dev cycle

**Manual Steps:**
1. Download signed binaries from GitHub release
2. Submit iOS app to App Store Connect
3. Submit Android app to Google Play Console
4. Monitor deployment progress
5. Run production smoke tests

## 🎯 Quality Gates

### Automated Checks
- ✅ TypeScript compilation
- ✅ ESLint/Prettier
- ✅ Unit tests (>80% coverage)
- ✅ Integration tests
- ✅ Security audit (no high/critical)
- ✅ Build successful on all platforms

### Manual Validation
- ✅ Feature completeness
- ✅ Cross-browser testing
- ✅ Mobile responsiveness
- ✅ Performance benchmarks
- ✅ Accessibility compliance
- ✅ Security review

### Production Readiness
- ✅ Database migrations tested
- ✅ Environment variables configured
- ✅ Monitoring alerts active
- ✅ Rollback plan prepared
- ✅ Team on-call schedule

## 🚨 Emergency Procedures

### Rollback Web App
```bash
# Delete the tag to trigger Vercel rollback
git tag -d v0.1.0
git push origin :refs/tags/v0.1.0
```

### Rollback Database
```bash
# Restore from backup (implement your strategy)
# This should be automated and tested
```

### Mobile App Issues
- **iOS**: Cannot rollback - prepare hotfix release
- **Android**: Cannot rollback - prepare hotfix release

### Communication Plan
1. **Immediate**: Slack #incidents channel
2. **5 minutes**: Email to leadership
3. **15 minutes**: Customer communication (if needed)
4. **Post-incident**: Retrospective meeting

## 📊 Success Metrics

### Technical KPIs
- Deployment success rate: 100%
- Mean time to production: < 2 hours
- Rollback time: < 10 minutes
- Test coverage: > 80%

### Business KPIs
- App store approval rate: > 95%
- Critical bugs in production: 0
- User-reported issues: < 5
- Customer satisfaction: > 4.5/5

## 🎉 Celebration

When the release is successful:
- [ ] Team celebration in #canvas-mvp
- [ ] Release announcement to company
- [ ] Customer announcement
- [ ] Retrospective scheduled
- [ ] Next sprint planning

---

**Remember**: A successful release is not just about shipping code, but delivering value to users safely and reliably. 🚀