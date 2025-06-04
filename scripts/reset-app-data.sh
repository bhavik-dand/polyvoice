#!/bin/bash

# PolyVoice App Data Reset Script
# This script resets both keychain entries and onboarding state for clean testing

set -e  # Exit on any error

APP_SERVICE="com.polyvoice.app"
APP_BUNDLE_ID="com.polyvoice.app"

echo "🧹 PolyVoice App Data Reset Script"
echo "=================================="
echo ""

# Function to safely delete keychain items
delete_keychain_item() {
    local account=$1
    if security find-generic-password -s "$APP_SERVICE" -a "$account" >/dev/null 2>&1; then
        security delete-generic-password -s "$APP_SERVICE" -a "$account" 2>/dev/null
        echo "✅ Deleted keychain item: $account"
    else
        echo "ℹ️  Keychain item not found: $account"
    fi
}

# Function to reset UserDefaults
reset_user_defaults() {
    local key=$1
    defaults delete "$APP_BUNDLE_ID" "$key" 2>/dev/null && echo "✅ Deleted UserDefaults: $key" || echo "ℹ️  UserDefaults not found: $key"
}

echo "1. 🔑 Resetting Keychain entries..."
echo "-----------------------------------"

# Delete all keychain items for our app
delete_keychain_item "session"
delete_keychain_item "codeVerifier" 
delete_keychain_item "deviceIdentifier"
delete_keychain_item "appToken"

# Try to delete any remaining items (wildcard approach)
echo ""
echo "🔍 Checking for any remaining keychain items..."
REMAINING=$(security dump-keychain 2>/dev/null | grep -c "$APP_SERVICE" || true)
if [ "$REMAINING" -gt 0 ]; then
    echo "⚠️  Found $REMAINING remaining keychain items for $APP_SERVICE"
    echo "💡 You may need to manually clean these via Keychain Access app"
else
    echo "✅ No remaining keychain items found"
fi

echo ""
echo "2. 📱 Resetting Onboarding & Auth State..."
echo "------------------------------------------"

# Reset authentication state
reset_user_defaults "isAuthenticated"
reset_user_defaults "currentUser"
reset_user_defaults "tokenExpiresAt"

# Reset onboarding state
reset_user_defaults "hasCompletedOnboarding"

# Additional cleanup for any other app-specific defaults
echo ""
echo "🧽 Additional UserDefaults cleanup..."
defaults delete "$APP_BUNDLE_ID" 2>/dev/null && echo "✅ Cleared all UserDefaults for $APP_BUNDLE_ID" || echo "ℹ️  No UserDefaults domain found"

echo ""
echo "3. 🎯 Optional: Quit PolyVoice app..."
echo "------------------------------------"

# Check if app is running and offer to quit it
if pgrep -f "PolyVoice" >/dev/null; then
    echo "🔄 PolyVoice is currently running"
    read -p "❓ Would you like to quit PolyVoice now? (y/N): " -n 1 -r
    echo ""
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        pkill -f "PolyVoice" 2>/dev/null || true
        echo "✅ PolyVoice app quit"
    else
        echo "ℹ️  App left running - you may need to restart it manually"
    fi
else
    echo "ℹ️  PolyVoice app is not currently running"
fi

echo ""
echo "🎉 Reset Complete!"
echo "=================="
echo ""
echo "Next steps:"
echo "1. 🏗️  Rebuild and run PolyVoice in Xcode"
echo "2. ✨ App should start fresh with onboarding"
echo "3. 🔐 No keychain prompts on first launch"
echo ""
echo "If you still see keychain prompts, try:"
echo "• 🔍 Open Keychain Access app"
echo "• 🔎 Search for '$APP_SERVICE'"
echo "• 🗑️  Manually delete any remaining items"
echo ""