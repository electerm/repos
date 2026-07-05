#!/bin/bash

# Build script for creating RPM repository
# This script uses public as the root folder, public/rpm as rpm src folder
# Uses the same GPG public key as the DEB repository

set -e

echo "Starting RPM repository build process..."

# Get the script directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
PUBLIC_DIR="$PROJECT_ROOT/public"
RPM_DIR="$PUBLIC_DIR/rpm"

echo "Script directory: $SCRIPT_DIR"
echo "Project root: $PROJECT_ROOT"
echo "Public directory: $PUBLIC_DIR"
echo "RPM directory: $RPM_DIR"

# Create RPM repository structure
mkdir -p "$RPM_DIR"

# Copy public key (same key as DEB repo)
if [ -f "$PROJECT_ROOT/src/static/public.key" ]; then
  cp "$PROJECT_ROOT/src/static/public.key" "$RPM_DIR/public.key"
  echo "Copied public.key to $RPM_DIR/public.key"
fi

echo "Repository structure created successfully"

# List the structure
echo "Repository structure:"
find "$RPM_DIR" -type d | sort

# Environment variables passed from the Node.js script
if [ -n "$RPM_ASSET_NAME" ] && ([ -n "$RPM_ASSET_URL" ] || [ -n "$RPM_FILE_PATH" ]); then
    echo "Found x86_64 .rpm asset: $RPM_ASSET_NAME"

    if [ -n "$RPM_FILE_PATH" ]; then
        # Use local file instead of downloading
        echo "Using local .rpm file: $RPM_FILE_PATH"

        if [ ! -f "$RPM_FILE_PATH" ]; then
            echo "Error: Local .rpm file not found at $RPM_FILE_PATH"
            exit 1
        fi

        # Copy the local file to the rpm directory
        cp "$RPM_FILE_PATH" "$RPM_DIR/$RPM_ASSET_NAME"
        if [ $? -eq 0 ]; then
            echo "Successfully copied local file: $RPM_ASSET_NAME"
            echo "File size: $(stat -c%s "$RPM_DIR/$RPM_ASSET_NAME" 2>/dev/null || stat -f%z "$RPM_DIR/$RPM_ASSET_NAME") bytes"
        else
            echo "Failed to copy local file: $RPM_FILE_PATH"
            exit 1
        fi
    else
        # Download the .rpm file to the rpm directory
        RPM_MIRROR_URL="${RPM_MIRROR_URL:-https://mirror.electerm.org/}"
        DOWNLOAD_URL="${RPM_MIRROR_URL}${RPM_ASSET_URL}"
        echo "Using mirror: $RPM_MIRROR_URL"
        echo "Downloading: $RPM_ASSET_NAME"
        echo "URL: $DOWNLOAD_URL"

        curl -L -o "$RPM_DIR/$RPM_ASSET_NAME" "$DOWNLOAD_URL"
        if [ $? -eq 0 ]; then
            echo "Successfully downloaded: $RPM_ASSET_NAME"
            echo "File size: $(stat -c%s "$RPM_DIR/$RPM_ASSET_NAME" 2>/dev/null || stat -f%z "$RPM_DIR/$RPM_ASSET_NAME") bytes"
        else
            echo "Failed to download: $RPM_ASSET_NAME"
            exit 1
        fi
    fi

    # Set consistent file timestamp based on release date if available
    if [ -n "$RELEASE_DATE" ]; then
        RELEASE_TIMESTAMP=$(date -d "$RELEASE_DATE" '+%Y%m%d%H%M.%S' 2>/dev/null || echo "")
        if [ -n "$RELEASE_TIMESTAMP" ]; then
            touch -t "$RELEASE_TIMESTAMP" "$RPM_DIR/$RPM_ASSET_NAME" 2>/dev/null || true
            echo "Set file timestamp to release date: $RELEASE_DATE"
        fi
    fi

    # Generate repodata metadata using createrepo
    echo "Generating RPM repository metadata..."
    if command -v createrepo_c &> /dev/null; then
        createrepo_c "$RPM_DIR"
    elif command -v createrepo &> /dev/null; then
        createrepo "$RPM_DIR"
    else
        echo "Error: createrepo or createrepo_c is not installed"
        echo "Install with: sudo apt-get install createrepo-c"
        exit 1
    fi

    if [ $? -eq 0 ]; then
        echo "Repository metadata generated successfully!"
    else
        echo "Error: Failed to generate repository metadata"
        exit 1
    fi

    # Validate the generated repomd.xml
    REPOMD_FILE="$RPM_DIR/repodata/repomd.xml"
    if [ -f "$REPOMD_FILE" ]; then
        echo "Validating repomd.xml..."
        echo "Generated repomd.xml successfully"
    else
        echo "Error: repomd.xml not found"
        exit 1
    fi

    # Set consistent timestamps on repository metadata files
    if [ -n "$RELEASE_DATE" ] && [ -n "$RELEASE_TIMESTAMP" ]; then
        find "$RPM_DIR/repodata" -type f -exec touch -t "$RELEASE_TIMESTAMP" {} \; 2>/dev/null || true
        echo "Set metadata file timestamps to release date: $RELEASE_DATE"
    fi

    # Delete the actual .rpm file — it's served via redirect to GitHub releases by worker.js
    echo "Deleting .rpm file (will serve via redirect to GitHub releases)..."
    if [ -f "$RPM_DIR/$RPM_ASSET_NAME" ]; then
        rm "$RPM_DIR/$RPM_ASSET_NAME"
        echo "Deleted: $RPM_ASSET_NAME"
    fi

else
    echo "No .rpm asset to download"
fi

# Display release information if provided
if [ -n "$RELEASE_TAG" ]; then
    echo "Release tag: $RELEASE_TAG"
fi

if [ -n "$RELEASE_DATE" ]; then
    echo "Release date: $RELEASE_DATE"
fi

# Sign the repomd.xml with GPG (using the same key as DEB repo)
if [ -n "$GPG_KEY_ID" ]; then
    echo "GPG Key ID provided: $GPG_KEY_ID"

    if [ -n "$GPG_PRIVATE_KEY" ]; then
        echo "GPG Private Key provided, signing repository metadata..."

        # Import GPG private key
        echo "$GPG_PRIVATE_KEY" | base64 -d | gpg --batch --import

        # Sign the repomd.xml file
        REPOMD_DIR="$RPM_DIR/repodata"
        cd "$REPOMD_DIR"
        if [ -f "repomd.xml" ]; then
            gpg --batch --yes --detach-sign --armor --local-user "$GPG_KEY_ID" --output repomd.xml.asc repomd.xml
            echo "Repository metadata signed successfully!"

            # Set consistent timestamp on signature file
            if [ -n "$RELEASE_DATE" ] && [ -n "$RELEASE_TIMESTAMP" ]; then
                touch -t "$RELEASE_TIMESTAMP" repomd.xml.asc 2>/dev/null || true
            fi
        else
            echo "repomd.xml not found, skipping signing"
        fi
    else
        echo "GPG Private Key not provided, skipping signing"
    fi
else
    echo "GPG Key ID not provided, skipping signing"
fi

echo "RPM repository build completed successfully!"
