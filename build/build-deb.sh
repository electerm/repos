#!/bin/bash

# Build script for creating Debian repository
# This script copies everything from src/deb-build to repos/deb

set -e

echo "Starting Debian repository build process..."

# Get the script directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
SRC_DEB_BUILD="$PROJECT_ROOT/src/deb-build"
REPOS_DEB="$PROJECT_ROOT/repos/deb"

echo "Script directory: $SCRIPT_DIR"
echo "Project root: $PROJECT_ROOT"
echo "Source directory: $SRC_DEB_BUILD"
echo "Destination directory: $REPOS_DEB"

# Check if source directory exists
if [ ! -d "$SRC_DEB_BUILD" ]; then
    echo "Error: Source directory $SRC_DEB_BUILD does not exist"
    exit 1
fi

# Create proper Debian repository structure
rm -rf "$REPOS_DEB"
mkdir -p "$REPOS_DEB/dists/stable/main/binary-amd64"
mkdir -p "$REPOS_DEB/pool/main/e/electerm"

# Copy static files to the root
echo "Copying static files from $SRC_DEB_BUILD to $REPOS_DEB..."
if [ -f "$SRC_DEB_BUILD/index.html" ]; then
    cp "$SRC_DEB_BUILD/index.html" "$REPOS_DEB/"
fi
if [ -f "$SRC_DEB_BUILD/public.key" ]; then
    cp "$SRC_DEB_BUILD/public.key" "$REPOS_DEB/"
fi

echo "Repository structure created successfully"

# List the structure
echo "Repository structure:"
find "$REPOS_DEB" -type d | sort

# Environment variables passed from the Express server
if [ -n "$DEB_ASSET_NAME" ] && [ -n "$DEB_ASSET_URL" ]; then
    echo "Found amd64 .deb asset to download: $DEB_ASSET_NAME"
    
    # Download the .deb file to the pool directory
    echo "Downloading: $DEB_ASSET_NAME"
    echo "URL: $DEB_ASSET_URL"
    
    curl -L -o "$REPOS_DEB/pool/main/e/electerm/$DEB_ASSET_NAME" "$DEB_ASSET_URL"
    if [ $? -eq 0 ]; then
        echo "Successfully downloaded: $DEB_ASSET_NAME"
        echo "File size: $(stat -c%s "$REPOS_DEB/pool/main/e/electerm/$DEB_ASSET_NAME" 2>/dev/null || stat -f%z "$REPOS_DEB/pool/main/e/electerm/$DEB_ASSET_NAME") bytes"
    else
        echo "Failed to download: $DEB_ASSET_NAME"
        exit 1
    fi
        
        # Generate Packages file in the proper location
        echo "Generating Packages file..."
        PACKAGES_DIR="$REPOS_DEB/dists/stable/main/binary-amd64"
        PACKAGES_FILE="$PACKAGES_DIR/Packages"
        > "$PACKAGES_FILE"  # Clear the file
        
        # Process .deb files from the pool
        for deb_file in "$REPOS_DEB/pool/main/e/electerm"/*.deb; do
            if [ -f "$deb_file" ]; then
                deb_basename=$(basename "$deb_file")
                echo "Processing package: $deb_basename"
                
                # Extract control file from the .deb package
                tmpdir=$(mktemp -d)
                dpkg-deb --control "$deb_file" "$tmpdir"
                
                # Read control file and extract needed fields
                if [ -f "$tmpdir/control" ]; then
                    # Extract specific fields in the correct order
                    grep -E "^(Package|Version|Architecture|Maintainer|Description|Depends|Priority|Section):" "$tmpdir/control" >> "$PACKAGES_FILE"
                fi
                
                # Clean up temp directory
                rm -rf "$tmpdir"
                
                # Add file information with relative path from repository root
                echo "Filename: pool/main/e/electerm/$deb_basename" >> "$PACKAGES_FILE"
                echo "Size: $(stat -c%s "$deb_file" 2>/dev/null || stat -f%z "$deb_file")" >> "$PACKAGES_FILE"
                echo "MD5sum: $(md5sum "$deb_file" 2>/dev/null | cut -d' ' -f1 || md5 -q "$deb_file")" >> "$PACKAGES_FILE"
                echo "SHA1: $(sha1sum "$deb_file" 2>/dev/null | cut -d' ' -f1 || shasum -a 1 "$deb_file" | cut -d' ' -f1)" >> "$PACKAGES_FILE"
                echo "SHA256: $(sha256sum "$deb_file" 2>/dev/null | cut -d' ' -f1 || shasum -a 256 "$deb_file" | cut -d' ' -f1)" >> "$PACKAGES_FILE"
                echo "" >> "$PACKAGES_FILE"
            fi
        done
        
        # Compress Packages file
        gzip -k "$PACKAGES_FILE"
        
        # Generate Release file in the proper location
        echo "Generating Release file..."
        RELEASE_DIR="$REPOS_DEB/dists/stable"
        RELEASE_FILE="$RELEASE_DIR/Release"
        RELEASE_DATE_FORMATTED=""
        if [ -n "$RELEASE_DATE" ]; then
            # Try to format the release date, fallback to current date
            RELEASE_DATE_FORMATTED=$(date -u -d "$RELEASE_DATE" '+%a, %d %b %Y %H:%M:%S UTC' 2>/dev/null || date -u '+%a, %d %b %Y %H:%M:%S UTC')
        else
            RELEASE_DATE_FORMATTED=$(date -u '+%a, %d %b %Y %H:%M:%S UTC')
        fi
        
        cat > "$RELEASE_FILE" << EOF
Origin: Electerm
Label: Electerm Repository
Suite: stable
Codename: stable
Architectures: amd64
Components: main
Description: Official Electerm Debian Repository
Date: $RELEASE_DATE_FORMATTED
EOF
        
        # Add version information if available
        if [ -n "$RELEASE_TAG" ]; then
            echo "Version: $RELEASE_TAG" >> "$RELEASE_FILE"
        fi
        
        # Add checksums to Release file (relative to dists/stable directory)
        cd "$RELEASE_DIR"
        echo "MD5Sum:" >> "$RELEASE_FILE"
        for file in main/binary-amd64/Packages main/binary-amd64/Packages.gz; do
            if [ -f "$file" ]; then
                md5_hash=$(md5sum "$file" 2>/dev/null | cut -d' ' -f1 || md5 -q "$file")
                size=$(stat -c%s "$file" 2>/dev/null || stat -f%z "$file")
                printf " %s %8s %s\n" "$md5_hash" "$size" "$file" >> "$RELEASE_FILE"
            fi
        done
        
        echo "SHA1:" >> "$RELEASE_FILE"
        for file in main/binary-amd64/Packages main/binary-amd64/Packages.gz; do
            if [ -f "$file" ]; then
                sha1_hash=$(sha1sum "$file" 2>/dev/null | cut -d' ' -f1 || shasum -a 1 "$file" | cut -d' ' -f1)
                size=$(stat -c%s "$file" 2>/dev/null || stat -f%z "$file")
                printf " %s %8s %s\n" "$sha1_hash" "$size" "$file" >> "$RELEASE_FILE"
            fi
        done
        
        echo "SHA256:" >> "$RELEASE_FILE"
        for file in main/binary-amd64/Packages main/binary-amd64/Packages.gz; do
            if [ -f "$file" ]; then
                sha256_hash=$(sha256sum "$file" 2>/dev/null | cut -d' ' -f1 || shasum -a 256 "$file" | cut -d' ' -f1)
                size=$(stat -c%s "$file" 2>/dev/null || stat -f%z "$file")
                printf " %s %8s %s\n" "$sha256_hash" "$size" "$file" >> "$RELEASE_FILE"
            fi
        done
        
        echo "Repository files generated successfully!"
        
else
    echo "No .deb asset to download"
fi

# Display release information if provided
if [ -n "$RELEASE_TAG" ]; then
    echo "Release tag: $RELEASE_TAG"
fi

if [ -n "$RELEASE_DATE" ]; then
    echo "Release date: $RELEASE_DATE"
fi

if [ -n "$GPG_KEY_ID" ]; then
    echo "GPG Key ID provided: $GPG_KEY_ID"
    
    if [ -n "$GPG_PRIVATE_KEY" ]; then
        echo "GPG Private Key provided, signing repository..."
        
        # Import GPG private key
        echo "$GPG_PRIVATE_KEY" | base64 -d | gpg --batch --import
        
        # Sign the Release file in the proper location
        RELEASE_DIR="$REPOS_DEB/dists/stable"
        cd "$RELEASE_DIR"
        if [ -f "Release" ]; then
            gpg --batch --yes --detach-sign --armor --local-user "$GPG_KEY_ID" --output Release.gpg Release
            gpg --batch --yes --clearsign --local-user "$GPG_KEY_ID" --output InRelease Release
            echo "Repository signed successfully!"
        else
            echo "Release file not found, skipping signing"
        fi
    else
        echo "GPG Private Key not provided, skipping signing"
    fi
else
    echo "GPG Key ID not provided, skipping signing"
fi

echo "Debian repository build completed successfully!"