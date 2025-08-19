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

function runTests() {
  log('🧪 Running tests...', 'blue')
  exec('pnpm test:ci')
  log('✅ Tests passed', 'green')
}

function runLinting() {
  log('🔍 Running linting...', 'blue')
  exec('pnpm lint')
  exec('pnpm typecheck')
  log('✅ Linting passed', 'green')
}

function createRCTag(rcNumber) {
  const version = getPackageVersion()
  const tagName = `v${version}-rc.${rcNumber}`

  log(`🏷️  Creating RC tag: ${tagName}`, 'blue')

  try {
    exec(`git tag -a ${tagName} -m "Canvas MVP RC ${rcNumber}"`)
    exec(`git push origin ${tagName}`)
    log(`✅ RC tag created: ${tagName}`, 'green')
    return tagName
  } catch (error) {
    log(`❌ Failed to create RC tag: ${tagName}`, 'red')
    throw error
  }
}

function triggerGitHubActionRC(rcNumber) {
  log('🚀 Triggering GitHub Actions RC workflow...', 'blue')

  try {
    exec(`gh workflow run rc.yml -f rc_number=${rcNumber}`)
    log('✅ GitHub Actions RC workflow triggered', 'green')
    log('🔗 Check progress at: https://github.com/your-org/canvas-mvp/actions', 'cyan')
  } catch (error) {
    log('❌ Failed to trigger GitHub Actions workflow', 'red')
    log('ℹ️  You can manually trigger it from the GitHub UI', 'yellow')
  }
}

function generateReleaseNotes(rcNumber) {
  const version = getPackageVersion()

  const notes = `# Canvas MVP v${version}-rc.${rcNumber}

## What's New
- [Add your changes here]

## Testing Instructions
1. Download the builds from the GitHub release
2. Test web app at staging URL
3. Install iOS app via TestFlight
4. Install Android app via Play Internal Testing

## QA Checklist
- [ ] Web app smoke test
- [ ] iOS functionality test
- [ ] Android functionality test
- [ ] Cross-platform consistency check
- [ ] Performance validation
- [ ] Security review

## Known Issues
- [List any known issues]

---
**Build Info:**
- Version: ${version}
- RC: ${rcNumber}
- Branch: release/v${version}
- Date: ${new Date().toISOString()}
`

  console.log('\n' + '='.repeat(50))
  console.log('📝 RELEASE NOTES TEMPLATE')
  console.log('='.repeat(50))
  console.log(notes)
  console.log('='.repeat(50) + '\n')
}

async function main() {
  const rcNumber = process.argv[2]

  if (!rcNumber || !/^\d+$/.test(rcNumber)) {
    log('❌ Please provide a valid RC number', 'red')
    log('Usage: npm run release:rc <rc_number>', 'yellow')
    log('Example: npm run release:rc 1', 'yellow')
    process.exit(1)
  }

  try {
    log('🎯 Starting RC release process...', 'magenta')
    log(`📦 RC Number: ${rcNumber}`, 'cyan')

    // Pre-flight checks
    validateReleaseBranch()
    checkWorkingDirectory()

    // Quality gates
    runLinting()
    runTests()

    // Create RC tag
    const tagName = createRCTag(rcNumber)

    // Trigger CI/CD
    triggerGitHubActionRC(rcNumber)

    // Generate release notes
    generateReleaseNotes(rcNumber)

    log('🎉 RC release process completed successfully!', 'green')
    log(`🏷️  Tag created: ${tagName}`, 'cyan')
    log('📋 Next steps:', 'yellow')
    log('  1. Wait for CI/CD to complete', 'yellow')
    log('  2. Download builds from GitHub release', 'yellow')
    log('  3. Distribute to QA team', 'yellow')
    log('  4. Update release notes with actual changes', 'yellow')
    log('  5. Wait for QA sign-off', 'yellow')
  } catch (error) {
    log(`💥 RC release failed: ${error.message}`, 'red')
    process.exit(1)
  }
}

main().catch(console.error)
