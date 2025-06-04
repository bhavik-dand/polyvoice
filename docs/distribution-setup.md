# PolyVoice macOS App Distribution Setup

This guide walks you through setting up code signing and distribution for PolyVoice outside the App Store.

## Prerequisites

### 1. Apple Developer Program
- **Required**: Apple Developer Program membership ($99/year)
- Sign up at: https://developer.apple.com/programs/

### 2. Get Your Team ID
1. Log into Apple Developer portal
2. Go to Membership section
3. Note your **Team ID** (10-character alphanumeric)

### 3. Generate App-Specific Password
1. Go to https://appleid.apple.com/
2. Sign in with your Apple ID
3. In Security section, click "Generate Password"
4. Label it "PolyVoice Notarization"
5. Save the generated password securely

## Setup Steps

### 1. Configure Xcode Project
1. Open `macos-app/PolyVoice.xcodeproj`
2. Select the PolyVoice target
3. In **Signing & Capabilities**:
   - Team: Select your Apple Developer account
   - Bundle Identifier: `com.polyvoice.app` (or your domain)
   - Signing Certificate: "Developer ID Application"

### 2. Update Build Script Configuration
Edit `/Users/bhavikdand/dev/polyvoice/scripts/build-and-distribute.sh`:

```bash
# Update these values:
APPLE_ID="your-apple-id@example.com"           # Your Apple ID
TEAM_ID="YOUR_TEAM_ID"                         # From Apple Developer portal
APP_SPECIFIC_PASSWORD="your-app-specific-password"  # Generated above
```

### 3. Update Export Options
Edit `/Users/bhavikdand/dev/polyvoice/macos-app/ExportOptions.plist`:

```xml
<key>teamID</key>
<string>YOUR_TEAM_ID</string>  <!-- Replace with your Team ID -->
```

## Distribution Process

### Build and Notarize
```bash
# Run the automated build script
cd /Users/bhavikdand/dev/polyvoice
./scripts/build-and-distribute.sh
```

The script will:
1. **Build** the app in Release configuration
2. **Archive** and export with Developer ID signing
3. **Submit** for notarization to Apple
4. **Wait** for notarization approval (usually 5-15 minutes)
5. **Staple** the notarization ticket to the app
6. **Create** a DMG installer for distribution

### Manual Steps (if needed)

If you prefer manual control:

```bash
# 1. Build and archive
cd macos-app
xcodebuild -project PolyVoice.xcodeproj -scheme PolyVoice -configuration Release -archivePath build/PolyVoice.xcarchive archive

# 2. Export with Developer ID
xcodebuild -exportArchive -archivePath build/PolyVoice.xcarchive -exportPath build/Export -exportOptionsPlist ExportOptions.plist

# 3. Create ZIP for notarization
cd build/Export
zip -r ../PolyVoice.zip PolyVoice.app

# 4. Submit for notarization
xcrun notarytool submit ../PolyVoice.zip --apple-id "your@email.com" --team-id "TEAMID" --password "app-password"

# 5. Check status (replace ID with returned submission ID)
xcrun notarytool info SUBMISSION_ID --apple-id "your@email.com" --team-id "TEAMID" --password "app-password"

# 6. Staple when approved
xcrun stapler staple PolyVoice.app

# 7. Verify
xcrun stapler validate PolyVoice.app
spctl -a -t exec -vv PolyVoice.app
```

## Distribution Options

### Option 1: DMG Distribution (Recommended)
- Professional appearance
- Drag-to-Applications experience
- Single file to host on website

### Option 2: ZIP Distribution
- Simpler but less professional
- Users must manually move to Applications

### Option 3: Installer Package (PKG)
- Most enterprise-like
- Can install system-wide or user-specific
- Requires additional PKG signing certificate

## Website Integration

### Download Page Setup
Create a download page with:

```html
<!-- Download instructions -->
<h2>Download PolyVoice</h2>
<a href="PolyVoice.dmg" class="download-btn">Download for macOS</a>

<h3>Installation Instructions</h3>
<ol>
  <li>Download the DMG file</li>
  <li>Open the downloaded DMG</li>
  <li>Drag PolyVoice to the Applications folder</li>
  <li>Launch from Applications folder</li>
  <li>When prompted, click "Open" to allow the app to run</li>
</ol>

<h3>System Requirements</h3>
<ul>
  <li>macOS 12.0 or later</li>
  <li>Microphone access permission</li>
  <li>Accessibility permission (for text insertion)</li>
</ul>
```

### Gatekeeper Notice
Include this notice for users:

> **First Launch**: macOS may show a security warning on first launch. This is normal for apps distributed outside the App Store. Click "Open" when prompted, or go to System Preferences > Security & Privacy and click "Open Anyway" if needed.

## Troubleshooting

### Common Issues

**Notarization Rejected**
- Check entitlements are correct
- Ensure all frameworks are signed
- Review notarization log for specific errors

**Code Signing Errors**
- Verify Developer ID certificate is installed
- Check Team ID matches in all configurations
- Ensure bundle identifier is unique

**Gatekeeper Blocks App**
- Verify notarization was successful
- Check stapling with `xcrun stapler validate`
- Test with `spctl -a -t exec -vv`

## Security Best Practices

1. **Never commit** App-Specific Password to version control
2. **Use environment variables** for sensitive values in CI/CD
3. **Test distribution** on clean macOS system before release
4. **Monitor** Apple Developer portal for certificate expiration
5. **Keep backups** of signed releases for future reference

## Automation (Future)

Consider setting up GitHub Actions or similar CI/CD for:
- Automated building on version tags
- Notarization in cloud environment
- Automatic upload to website/CDN
- Release notes generation