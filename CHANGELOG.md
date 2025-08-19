# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- Initial Canvas MVP setup
- Complete CI/CD pipeline with GitHub Actions
- Fastlane configuration for iOS and Android builds
- Automated release process with RC and production workflows
- Comprehensive testing setup with Vitest
- Database integration with Prisma
- Mobile app support with Capacitor
- Monitoring and analytics setup

### Changed
- N/A

### Deprecated
- N/A

### Removed
- N/A

### Fixed
- N/A

### Security
- Added dependency vulnerability scanning
- Implemented secure build pipelines

---

## Release Process

This changelog is automatically generated using conventional commits.

### Commit Message Format
```
<type>[optional scope]: <description>

[optional body]

[optional footer(s)]
```

### Types
- **feat**: A new feature
- **fix**: A bug fix
- **docs**: Documentation only changes
- **style**: Changes that do not affect the meaning of the code
- **refactor**: A code change that neither fixes a bug nor adds a feature
- **perf**: A code change that improves performance
- **test**: Adding missing tests or correcting existing tests
- **build**: Changes that affect the build system or external dependencies
- **ci**: Changes to our CI configuration files and scripts
- **chore**: Other changes that don't modify src or test files