#!/bin/bash
# Setup script for deploying the application on the remote server.
#
# This script:
#   1. Unpacks the deployment zip file into a new deployment directory
#   2. Migrates configuration (config.php), database, and uploads from the previous deployment
#   3. Updates the symlink to point to the new deployment (if --commit is set)
#
# Usage: setup.sh -d <deployments_folder> -l <live_symlink> -z <zip_name> [--commit]
#   -d <folder>  : The deployments folder name (e.g., .deployments-dev)
#   -l <symlink> : The live symlink name (e.g., public)
#   -z <zip>     : The deployment zip file name
#   --commit     : Update the symlink to make the new deployment live
#
# Note: This script uses php8.0-cli instead of php because the hosting provider's
# default 'php' command invokes PHP 4.4.9 (cgi-fcgi) which is incompatible.
# The correct CLI binary is php8.0-cli - this may change in the future.
set -e

DEPLOYMENTS_FOLDER=""
LIVE_SYMLINK=""
ZIP_NAME=""
COMMIT=false

while [[ $# -gt 0 ]]; do
    case $1 in
        -d)
            DEPLOYMENTS_FOLDER="$2"
            shift 2
            ;;
        -l)
            LIVE_SYMLINK="$2"
            shift 2
            ;;
        -z)
            ZIP_NAME="$2"
            shift 2
            ;;
        --commit)
            COMMIT=true
            shift
            ;;
        *)
            echo "Error: Unknown option $1"
            echo "Usage: $0 -d <deployments_folder> -l <live_symlink> -z <zip_name> [--commit]"
            exit 1
            ;;
    esac
done

if [ -z "$DEPLOYMENTS_FOLDER" ] || [ -z "$LIVE_SYMLINK" ] || [ -z "$ZIP_NAME" ]; then
    echo "Error: Missing required options"
    echo "Usage: $0 -d <deployments_folder> -l <live_symlink> -z <zip_name> [--commit]"
    exit 1
fi

if ! command -v php8.0-cli &> /dev/null; then
    echo "Error: php8.0-cli is not installed or not in PATH"
    echo "Note: This server uses php8.0-cli instead of php for CLI operations"
    exit 1
fi

DEPLOYMENTS_DIR="$HOME/smag/$DEPLOYMENTS_FOLDER"

LATEST=$(ls -1 "$DEPLOYMENTS_DIR" 2>/dev/null | grep -E '^[0-9]+$' | sort -n | tail -1)
if [ -z "$LATEST" ]; then
    NEW_NUM=1
else
    NEW_NUM=$((LATEST + 1))
fi

NEW_DIR="$DEPLOYMENTS_DIR/$NEW_NUM"
mkdir -p "$NEW_DIR"
cd "$NEW_DIR"
echo "Unzipping deployment..."
unzip -qo "$DEPLOYMENTS_DIR/$ZIP_NAME"
rm "$DEPLOYMENTS_DIR/$ZIP_NAME"

if [ -L "$HOME/smag/$LIVE_SYMLINK" ]; then
    CURRENT_LIVE=$(dirname $(readlink -f "$HOME/smag/$LIVE_SYMLINK"))
    echo "Current live deployment: $CURRENT_LIVE"
    OLD_CONFIG="$CURRENT_LIVE/backend/config.php"
    if [ -f "$OLD_CONFIG" ]; then
        echo "Copying config.php from previous deployment..."
        cp "$OLD_CONFIG" backend/

        OLD_DB_PATH=$(php8.0-cli -r "\$c=require('$CURRENT_LIVE/backend/config.php'); echo \$c['DB_PATH'];")
        OLD_UPLOAD_PATH=$(php8.0-cli -r "\$c=require('$CURRENT_LIVE/backend/config.php'); echo \$c['UPLOAD_PATH'];")

        echo "Old DB_PATH: $OLD_DB_PATH"
        echo "Old UPLOAD_PATH: $OLD_UPLOAD_PATH"

        if [ -n "$OLD_DB_PATH" ] && [ -f "$OLD_DB_PATH" ]; then
            echo "Copying database..."
            NEW_DB_PATH=$(php8.0-cli -r "\$c=require('$NEW_DIR/backend/config.php'); echo \$c['DB_PATH'];")
            mkdir -p "$(dirname "$NEW_DB_PATH")"
            cp "$OLD_DB_PATH" "$NEW_DB_PATH"
            echo "Database copied to: $NEW_DB_PATH"
        else
            echo "WARNING: Old DB_PATH not found or not a file: $OLD_DB_PATH"
        fi

        if [ -n "$OLD_UPLOAD_PATH" ] && [ -d "$OLD_UPLOAD_PATH" ]; then
            echo "Copying uploads..."
            NEW_UPLOAD_PATH=$(php8.0-cli -r "\$c=require('$NEW_DIR/backend/config.php'); echo \$c['UPLOAD_PATH'];")
            mkdir -p "$(dirname "$NEW_UPLOAD_PATH")"
            cp -r "$OLD_UPLOAD_PATH" "$(dirname "$NEW_UPLOAD_PATH")/"
            echo "Uploads copied to: $NEW_UPLOAD_PATH"
        else
            echo "WARNING: Old UPLOAD_PATH not found or not a directory: $OLD_UPLOAD_PATH"
        fi
    else
        echo "WARNING: Old config.php not found at: $OLD_CONFIG"
    fi
else
    echo "No live symlink found at: $HOME/smag/$LIVE_SYMLINK (fresh deployment)"
fi

if [ "$COMMIT" = true ]; then
    ln -sfn "$NEW_DIR/public" "$HOME/smag/$LIVE_SYMLINK"
fi
echo "Prepared deployment $NEW_NUM"