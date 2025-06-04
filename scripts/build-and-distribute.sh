#!/bin/bash

# PolyVoice macOS App Distribution Script
# This script builds, signs, notarizes, and packages the app for distribution

set -e  # Exit on any error

# Configuration - UPDATE THESE VALUES
APPLE_ID="bhavik.dand007@gmail.com"
TEAM_ID="9C8X2W427Q"
APP_SPECIFIC_PASSWORD="xfwd-rjrw-ddna-npge"  # Generate in Apple ID settings
BUNDLE_ID="com.polyvoice.app"
APP_NAME="PolyVoice"

# Paths
PROJECT_DIR="/Users/bhavikdand/dev/polyvoice/macos-app"
BUILD_DIR="$PROJECT_DIR/build"
EXPORT_DIR="$BUILD_DIR/Export"
ARCHIVE_PATH="$BUILD_DIR/$APP_NAME.xcarchive"
APP_PATH="$EXPORT_DIR/$APP_NAME.app"
ZIP_PATH="$BUILD_DIR/$APP_NAME.zip"
DMG_PATH="$BUILD_DIR/$APP_NAME.dmg"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check prerequisites
check_prerequisites() {
    log_info "Checking prerequisites..."
    
    if ! command -v xcodebuild &> /dev/null; then
        log_error "xcodebuild not found. Please install Xcode."
        exit 1
    fi
    
    if ! command -v xcrun &> /dev/null; then
        log_error "xcrun not found. Please install Xcode Command Line Tools."
        exit 1
    fi
    
    log_success "Prerequisites check passed"
}

# Clean previous builds
clean_build() {
    log_info "Cleaning previous builds..."
    rm -rf "$BUILD_DIR"
    mkdir -p "$BUILD_DIR"
    log_success "Build directory cleaned"
}

# Build and archive the app
build_app() {
    log_info "Building and archiving $APP_NAME..."
    
    cd "$PROJECT_DIR"
    
    xcodebuild -project "$APP_NAME.xcodeproj" \
               -scheme "$APP_NAME" \
               -configuration Release \
               -archivePath "$ARCHIVE_PATH" \
               archive
    
    log_success "App archived successfully"
}

# Export the app with Developer ID signing
export_app() {
    log_info "Exporting app with Developer ID signing..."
    
    xcodebuild -exportArchive \
               -archivePath "$ARCHIVE_PATH" \
               -exportPath "$EXPORT_DIR" \
               -exportOptionsPlist "ExportOptions.plist"
    
    log_success "App exported with Developer ID signing"
}

# Create ZIP for notarization
create_zip() {
    log_info "Creating ZIP archive for notarization..."
    
    cd "$EXPORT_DIR"
    zip -r "$ZIP_PATH" "$APP_NAME.app"
    
    log_success "ZIP archive created: $ZIP_PATH"
}

# Submit for notarization
notarize_app() {
    log_info "Submitting app for notarization..."
    
    # Submit for notarization
    local submission_id=$(xcrun notarytool submit "$ZIP_PATH" \
                         --apple-id "$APPLE_ID" \
                         --team-id "$TEAM_ID" \
                         --password "$APP_SPECIFIC_PASSWORD" \
                         --output-format json | jq -r '.id')
    
    if [ -z "$submission_id" ] || [ "$submission_id" = "null" ]; then
        log_error "Failed to submit for notarization"
        exit 1
    fi
    
    log_info "Submission ID: $submission_id"
    log_info "Waiting for notarization to complete..."
    
    # Wait for notarization to complete
    while true; do
        local status=$(xcrun notarytool info "$submission_id" \
                      --apple-id "$APPLE_ID" \
                      --team-id "$TEAM_ID" \
                      --password "$APP_SPECIFIC_PASSWORD" \
                      --output-format json | jq -r '.status')
        
        case "$status" in
            "Accepted")
                log_success "Notarization completed successfully!"
                break
                ;;
            "Rejected")
                log_error "Notarization was rejected"
                # Show the log
                xcrun notarytool log "$submission_id" \
                     --apple-id "$APPLE_ID" \
                     --team-id "$TEAM_ID" \
                     --password "$APP_SPECIFIC_PASSWORD"
                exit 1
                ;;
            "In Progress")
                log_info "Notarization in progress..."
                sleep 30
                ;;
            *)
                log_warning "Unknown status: $status. Continuing to wait..."
                sleep 30
                ;;
        esac
    done
}

# Staple the notarization ticket
staple_app() {
    log_info "Stapling notarization ticket to app..."
    
    xcrun stapler staple "$APP_PATH"
    
    log_success "Notarization ticket stapled"
}

# Verify the notarization
verify_notarization() {
    log_info "Verifying notarization..."
    
    xcrun stapler validate "$APP_PATH"
    spctl -a -t exec -vv "$APP_PATH"
    
    log_success "Notarization verified"
}

# Create DMG for distribution
create_dmg() {
    log_info "Creating DMG for distribution..."
    
    # Create a temporary directory for DMG contents
    local dmg_temp_dir="$BUILD_DIR/dmg_temp"
    mkdir -p "$dmg_temp_dir"
    
    # Copy the app to the temp directory
    cp -R "$APP_PATH" "$dmg_temp_dir/"
    
    # Create a symbolic link to Applications folder
    ln -s /Applications "$dmg_temp_dir/Applications"
    
    # Create the DMG
    hdiutil create -size 100m \
                   -volname "$APP_NAME" \
                   -srcfolder "$dmg_temp_dir" \
                   -ov \
                   -format UDZO \
                   "$DMG_PATH"
    
    # Clean up temp directory
    rm -rf "$dmg_temp_dir"
    
    log_success "DMG created: $DMG_PATH"
}

# Main execution
main() {
    log_info "Starting $APP_NAME distribution build process..."
    
    check_prerequisites
    clean_build
    build_app
    export_app
    create_zip
    notarize_app
    staple_app
    verify_notarization
    create_dmg
    
    log_success "🎉 Distribution build completed successfully!"
    log_info "Files created:"
    log_info "  - Notarized app: $APP_PATH"
    log_info "  - ZIP archive: $ZIP_PATH"
    log_info "  - DMG installer: $DMG_PATH"
    log_info ""
    log_info "You can now distribute the DMG file to users."
}

# Check if configuration needs to be updated
if [ "$APPLE_ID" = "your-apple-id@example.com" ]; then
    log_error "Please update the configuration variables in this script:"
    log_error "  - APPLE_ID: Your Apple ID email"
    log_error "  - TEAM_ID: Your Apple Developer Team ID"
    log_error "  - APP_SPECIFIC_PASSWORD: Generate in Apple ID settings"
    exit 1
fi

# Run main function
main "$@"