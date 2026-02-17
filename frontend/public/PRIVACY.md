# Privacy Policy

Last updated: February 17, 2026

## Overview

OpenDots ("we", "our", or "us") is committed to protecting your privacy. This Privacy Policy explains how we collect, use, and safeguard your information when you use our website and services.

## Information We Collect

### Account Information
- **GitHub Profile**: When you sign in with GitHub, we receive your GitHub username, email address, and profile avatar
- **Session Data**: We maintain authentication sessions using secure, HTTP-only cookies

### Bundle Content
- **Public Repository Data**: We clone and index public GitHub repositories that you register
- **Configuration Files**: We scan and display configuration files from your repositories
- **Metadata**: Bundle names, descriptions, tags, and compatibility information

### Usage Data
- **IP Addresses**: Temporarily logged for rate limiting and security purposes
- **Request Logs**: Basic access logs for debugging and security monitoring

## How We Use Your Information

1. **Authentication**: To verify your identity and maintain your session
2. **Bundle Management**: To import, display, and serve your configuration bundles
3. **Security**: To prevent abuse, rate limit requests, and protect our services
4. **Improvements**: To understand usage patterns and improve the platform

## Data Storage & Security

- **Database**: User and bundle data stored in Turso/libSQL (SQLite)
- **File Storage**: Bundle snapshots stored in Vercel Blob (optional) or local filesystem
- **Cookies**: Session cookies are HTTP-only, SameSite=strict, and secure in production
- **Rate Limiting**: Upstash Redis used for distributed rate limiting

## Third-Party Services

We use the following third-party services:
- **GitHub**: For authentication and repository access
- **Vercel**: For hosting and serverless functions
- **Turso**: For database hosting
- **Upstash**: For Redis rate limiting
- **Cloudflare Turnstile**: For CAPTCHA verification (optional)

## Your Rights

You have the right to:
- Access your personal data
- Delete your account and associated data
- Export your bundle data
- Opt-out of non-essential communications

## Data Deletion

To delete your account and all associated data:
1. Contact us at [contact email]
2. We will remove your user record, sessions, and unlink your bundles
3. Note: Published bundles may remain visible if other users depend on them

## Changes to This Policy

We may update this Privacy Policy periodically. We will notify users of significant changes via email or site notification.

## Contact Us

If you have questions about this Privacy Policy, please contact us at:
- Email: contact@micr.dev
- GitHub Issues: [github.com/Microck/opendots](https://github.com/Microck/opendots)

## Cookie Usage

We use minimal cookies:
- **Session Cookie**: Required for authentication (HTTP-only, SameSite=strict)
- **No Tracking Cookies**: We don't use analytics or advertising cookies
