# Pull Request

## 📋 Description

<!-- Provide a detailed description of your changes -->

## 🎯 Type of Change

<!-- Mark the relevant option with an 'x' -->

- [ ] 🐛 Bug fix (non-breaking change which fixes an issue)
- [ ] ✨ New feature (non-breaking change which adds functionality)
- [ ] 💥 Breaking change (fix or feature that would cause existing functionality to not work as expected)
- [ ] 📝 Documentation update
- [ ] 🏪 New platform addition
- [ ] ⚡ Performance improvement
- [ ] ♻️ Code refactoring
- [ ] 🎨 UI/Style update
- [ ] 🔧 Configuration change

## 🔗 Related Issues

<!-- Link related issues here -->

Closes #
Relates to #

## 📝 Changes Made

<!-- List the key changes made in this PR -->

- 
- 
- 

## 🏪 Platform-Specific (if applicable)

**Platform**: 
**Platform URL**: 
**Scraping Strategy**: [Browser/Static/API]

**Selectors added/updated**:
```json
{
  "product_name": "...",
  "price": "..."
}
```

## 🧪 Testing

### Test Coverage

- [ ] Unit tests added/updated
- [ ] Integration tests added/updated
- [ ] Manual testing completed
- [ ] All tests passing locally

**Test results**:
```bash
# Paste test output here
```

### Manual Testing

<!-- Describe how you tested your changes -->

**URLs tested**:
- 
- 

**Test results**:
```
Describe what you tested and the results
```

## 📸 Screenshots (if applicable)

<!-- Add screenshots to demonstrate changes -->

## ✅ Checklist

### Code Quality

- [ ] Code follows project style guidelines (`npm run lint` passes)
- [ ] Code is formatted (`npm run format`)
- [ ] Self-review completed
- [ ] Complex code has comments
- [ ] No console.log statements left in code
- [ ] No commented-out code left

### Documentation

- [ ] Documentation updated (README, docs/, JSDoc)
- [ ] CHANGELOG.md updated
- [ ] Platform guide created/updated (if platform change)
- [ ] Configuration documented

### Testing

- [ ] All existing tests pass
- [ ] New tests added for new functionality
- [ ] Test coverage maintained/improved
- [ ] Edge cases tested

### Configuration

- [ ] Environment variables documented in .env.example
- [ ] Platform configuration validated (`npm run validate:config`)
- [ ] No secrets or sensitive data in code

### Dependencies

- [ ] No new dependencies added OR new dependencies justified
- [ ] package.json updated if dependencies changed
- [ ] Dependencies are compatible with Node.js 18+

### Integration

- [ ] Changes integrate properly with backend schema
- [ ] Data validation against backend models tested
- [ ] No breaking changes to database schema

## 🚀 Deployment Notes

<!-- Any special deployment instructions or considerations -->

### Breaking Changes

<!-- If this PR contains breaking changes, describe them and migration steps -->

### Environment Variables

<!-- List any new or modified environment variables -->

```env
# New variables
NEW_VAR=value
```

### Database Migrations

<!-- Are database changes required? -->

- [ ] No database changes
- [ ] Database changes included (describe below)

### Rollback Plan

<!-- How can this change be rolled back if needed? -->

## 📊 Performance Impact

<!-- Describe any performance implications -->

- **Memory**: 
- **CPU**: 
- **Network**: 
- **Database**: 

**Benchmarks** (if applicable):
```bash
# Before:
# After:
```

## 🔒 Security Considerations

<!-- Any security implications of this change? -->

- [ ] No security impact
- [ ] Security review required (describe below)

## 📚 Additional Context

<!-- Add any other context about the PR here -->

## 👀 Reviewers

<!-- Tag specific reviewers if needed -->

@username

---

## For Reviewers

### Review Checklist

- [ ] Code is clean and maintainable
- [ ] Logic is correct and efficient
- [ ] Tests are comprehensive
- [ ] Documentation is clear
- [ ] No security vulnerabilities
- [ ] Follows project conventions
- [ ] Ready to merge
