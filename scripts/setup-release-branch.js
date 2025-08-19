#!/usr/bin/env node

import { execSync } from 'child_process'
import { readFileSync } from 'fs'
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

function validateMainBranch() {
  try {
    const currentBranch = execSync('git rev-parse --abbrev-ref HEAD', { encoding: 'utf8' }).trim()
    if (currentBranch !== 'main') {
      throw new Error(`Not on main branch. Current branch: ${currentBranch}. Please switch to main first.`)
    }
    log('✅ On main branch', 'green')
  } catch (error) {
    log('❌ Failed to validate main branch', 'red')
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

function pullLatest() {
  log('🔄 Pulling latest changes from main...', 'blue')
  try {
    exec('git fetch origin')
    exec('git pull origin main')
    log('✅ Latest changes pulled', 'green')
  } catch (error) {
    log('❌ Failed to pull latest changes', 'red')
    throw error
  }
}

function createReleaseBranch() {
  const version = getPackageVersion()
  const branchName = `release/v${version}`

  log(`🌿 Creating release branch: ${branchName}`, 'blue')

  try {
    // Check if branch already exists
    try {
      exec(`git rev-parse --verify ${branchName}`, { stdio: 'pipe' })
      log(`⚠️  Release branch ${branchName} already exists`, 'yellow')

      const proceed = process.argv.includes('--force') || process.argv.includes('-f')
      if (!proceed) {
        throw new Error(`Release branch ${branchName} already exists. Use --force to recreate it.`)
      }

      log('🗑️  Deleting existing release branch...', 'blue')
      exec(`git branch -D ${branchName}`)
      exec(`git push origin --delete ${branchName}`, { stdio: 'pipe' }).catch(() => {
        // Ignore error if remote branch doesn't exist
      })
    } catch (error) {
      // Branch doesn't exist, which is what we want
    }

    // Create and push new release branch
    exec(`git checkout -b ${branchName}`)
    exec(`git push -u origin ${branchName}`)

    log(`✅ Release branch created: ${branchName}`, 'green')
    return branchName
  } catch (error) {
    log(`❌ Failed to create release branch: ${branchName}`, 'red')
    throw error
  }
}

function generateReleaseNotes(branchName) {
  const version = getPackageVersion()

  const notes = `# Release Branch Created: ${branchName}

## 🚧 Code Freeze in Effect

**Version:** ${version}  
**Branch:** ${branchName}  
**Created:** ${new Date().toISOString()}

## 📋 Pre-Release Checklist

### Development Team
- [ ] All planned features merged to main
- [ ] No breaking changes pending
- [ ] Database migrations tested
- [ ] Documentation updated

### QA Team  
- [ ] Test plan prepared
- [ ] Test environment ready
- [ ] Regression test suite updated
- [ ] Performance benchmarks defined

### DevOps Team
- [ ] CI/CD pipelines tested
- [ ] Production environment ready
- [ ] Monitoring alerts configured
- [ ] Rollback procedures verified

## 🚫 Branch Restrictions

After this point, only **hotfix branches** may be merged to ${branchName}.

All new feature work should target **main branch** for the next release.

## ⏭️ Next Steps

1. **Create RC1:** \`npm run release:rc 1\`
2. **QA Testing:** Deploy RC builds to staging
3. **Bug Fixes:** Create hotfix/* branches if needed
4. **Final Release:** \`npm run release:prod --force\`

## 🔗 Useful Commands

\`\`\`bash
# Switch to release branch
git checkout ${branchName}

# Create a hotfix
git checkout -b hotfix/fix-critical-bug
# ... make fixes ...
git checkout ${branchName}
git merge hotfix/fix-critical-bug

# Create RC
npm run release:rc 1

# Final production release
npm run release:prod --force
\`\`\`

---
**🎯 Goal:** Ship Canvas MVP ${version} to production!
`

  console.log('\n' + '='.repeat(60))
  console.log('📋 RELEASE BRANCH CREATED')
  console.log('='.repeat(60))
  console.log(notes)
  console.log('='.repeat(60) + '\n')
}

async function main() {
  try {
    log('🎯 Setting up release branch...', 'magenta')
    log(`📦 Version: ${getPackageVersion()}`, 'cyan')

    // Pre-flight checks
    validateMainBranch()
    checkWorkingDirectory()
    pullLatest()

    // Create release branch
    const branchName = createReleaseBranch()

    // Generate release notes
    generateReleaseNotes(branchName)

    log('🎉 Release branch setup completed successfully!', 'green')
    log(`🌿 Branch created: ${branchName}`, 'cyan')
    log('📋 See release notes above for next steps', 'yellow')
    log('🚧 Code freeze is now in effect!', 'magenta')
  } catch (error) {
    log(`💥 Release branch setup failed: ${error.message}`, 'red')
    process.exit(1)
  }
}

main().catch(console.error)
