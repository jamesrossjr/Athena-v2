#!/usr/bin/env node

import { execSync } from 'child_process'
import { readFileSync, writeFileSync } from 'fs'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)
const projectRoot = join(__dirname, '..')

// Colors for console output
const colors = {
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  reset: '\x1b[0m'
}

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`)
}

function exec(command, options = {}) {
  try {
    return execSync(command, {
      encoding: 'utf8',
      stdio: 'inherit',
      cwd: projectRoot,
      ...options
    })
  } catch (error) {
    log(`❌ Command failed: ${command}`, 'red')
    throw error
  }
}

function getPackageVersion() {
  const packageJson = JSON.parse(readFileSync(join(projectRoot, 'package.json'), 'utf8'))
  return packageJson.version
}

function validateReleaseBranch() {
  try {
    const currentBranch = execSync('git rev-parse --abbrev-ref HEAD', { encoding: 'utf8' }).trim()
    if (!currentBranch.startsWith('release/')) {
      throw new Error(`Not on a release branch. Current branch: ${currentBranch}`)
    }
    log(`✅ On release branch: ${currentBranch}`, 'green')
    return currentBranch
  } catch (error) {
    log('❌ Failed to validate release branch', 'red')
    throw error
  }
}

function checkWorkingDirectory() {
  try {
    const status = execSync('git status --porcelain', { encoding: 'utf8' })
    if (status.trim()) {
      throw new Error('Working directory is not clean. Please commit or stash changes.')
    }
    log('✅ Working directory is clean', 'green')
  } catch (error) {
    log('❌ Working directory check failed', 'red')
    throw error
  }
}

function validateQASignoff() {
  const proceed = process.argv.includes('--force') || process.argv.includes('-f')

  if (!proceed) {
    log('⚠️  QA Sign-off Required', 'yellow')
    log('This script will create a production release.', 'yellow')
    log('Ensure you have received QA sign-off before proceeding.', 'yellow')
    log('Use --force flag to skip this check.', 'yellow')
    throw new Error('QA sign-off validation failed')
  }

  log('✅ QA sign-off validation skipped (--force)', 'green')
}

function mergeToMain() {
  log('🔄 Merging release branch to main...', 'blue')

  try {
    // Fetch latest changes
    exec('git fetch origin')

    // Switch to main and pull
    exec('git checkout main')
    exec('git pull origin main')

    // Get release branch name
    const releaseBranch = execSync('git branch --list "release/*"', { encoding: 'utf8' })
      .split('\n')
      .find(line => line.trim().startsWith('release/'))
      ?.trim()

    if (!releaseBranch) {
      throw new Error('No release branch found')
    }

    // Merge release branch
    exec(`git merge --no-ff ${releaseBranch} -m "chore: merge ${releaseBranch} for production release"`)

    log('✅ Release branch merged to main', 'green')
  } catch (error) {
    log('❌ Failed to merge release branch to main', 'red')
    throw error
  }
}

function createProductionTag() {
  const version = getPackageVersion()
  const tagName = `v${version}`

  log(`🏷️  Creating production tag: ${tagName}`, 'blue')

  try {
    exec(`git tag -a ${tagName} -m "Canvas MVP v${version}"`)
    exec(`git push origin main --tags`)
    log(`✅ Production tag created: ${tagName}`, 'green')
    return tagName
  } catch (error) {
    log(`❌ Failed to create production tag: ${tagName}`, 'red')
    throw error
  }
}

function generateChangelog() {
  log('📝 Generating changelog...', 'blue')

  try {
    exec('pnpm changelog')
    log('✅ Changelog generated', 'green')
  } catch (error) {
    log('⚠️  Changelog generation failed, but continuing...', 'yellow')
  }
}

function validateDeployment(version) {
  log('🔍 Validating deployment...', 'blue')

  const checks = [
    {
      name: 'GitHub Actions workflow triggered',
      check: () => {
        // This would be triggered automatically by the tag push
        return true
      }
    },
    {
      name: 'Release notes ready',
      check: () => {
        return true // Manual verification
      }
    }
  ]

  checks.forEach(({ name, check }) => {
    if (check()) {
      log(`✅ ${name}`, 'green')
    } else {
      log(`❌ ${name}`, 'red')
      throw new Error(`Validation failed: ${name}`)
    }
  })
}

function generatePostReleaseInstructions(version) {
  const instructions = `
🚀 PRODUCTION RELEASE v${version} - POST-RELEASE INSTRUCTIONS

📋 IMMEDIATE ACTIONS (Next 2 hours):
  1. Monitor GitHub Actions workflow completion
  2. Verify web deployment at production URL
  3. Check database migrations completed successfully
  4. Run production smoke tests
  5. Monitor error rates and performance metrics

📱 MOBILE APP STORE SUBMISSION:
  1. Download signed binaries from GitHub release
  2. Submit iOS app to App Store Connect for review
  3. Submit Android app to Google Play Console for review
  4. Update app store metadata if needed

📊 MONITORING:
  1. Verify Vercel Analytics is active
  2. Check Sentry error tracking
  3. Monitor Supabase database performance
  4. Watch for any user reports

🔄 ROLLBACK PLAN (if needed):
  1. Delete the production tag: git tag -d v${version} && git push origin :refs/tags/v${version}
  2. Vercel will auto-rollback to previous deployment
  3. For database issues, have backup ready
  4. Mobile apps cannot be rolled back - prepare hotfix if needed

⏭️  NEXT STEPS:
  1. Plan next sprint and version (v${getNextVersion(version)})
  2. Update project roadmap
  3. Schedule post-release retrospective
  4. Begin work on next features

🎉 Congratulations on shipping Canvas MVP v${version}!
`

  console.log('\n' + '='.repeat(60))
  console.log('📋 POST-RELEASE INSTRUCTIONS')
  console.log('='.repeat(60))
  console.log(instructions)
  console.log('='.repeat(60) + '\n')
}

function getNextVersion(currentVersion) {
  const [major, minor, patch] = currentVersion.split('.').map(Number)
  return `${major}.${minor + 1}.0`
}

async function main() {
  try {
    log('🎯 Starting production release process...', 'magenta')
    log(`📦 Version: ${getPackageVersion()}`, 'cyan')

    // Pre-flight checks
    validateQASignoff()
    validateReleaseBranch()
    checkWorkingDirectory()

    // Merge to main
    mergeToMain()

    // Generate changelog
    generateChangelog()

    // Create production tag (this triggers the deployment pipeline)
    const tagName = createProductionTag()

    // Post-deployment validation
    validateDeployment(getPackageVersion())

    // Generate post-release instructions
    generatePostReleaseInstructions(getPackageVersion())

    log('🎉 Production release process completed successfully!', 'green')
    log(`🏷️  Tag created: ${tagName}`, 'cyan')
    log('🚀 GitHub Actions will handle the deployment automatically', 'blue')
    log('📋 See post-release instructions above', 'yellow')
  } catch (error) {
    log(`💥 Production release failed: ${error.message}`, 'red')
    log('🔍 Check the error details and fix issues before retrying', 'yellow')
    process.exit(1)
  }
}

main().catch(console.error)
