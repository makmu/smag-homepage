#!/bin/bash
set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$SCRIPT_DIR"

ENVIRONMENT=""
COMMIT=false
ROLLBACK=false

while [[ $# -gt 0 ]]; do
    case $1 in
        --dev)
            ENVIRONMENT="dev"
            shift
            ;;
        --prod)
            ENVIRONMENT="prod"
            shift
            ;;
        --commit)
            COMMIT=true
            shift
            ;;
        --rollback)
            ROLLBACK=true
            shift
            ;;
        *)
            echo "Error: Unknown option $1"
            echo "Usage: $0 --dev | --prod [--commit] [--rollback]"
            exit 1
            ;;
    esac
done

if [ -z "$ENVIRONMENT" ]; then
    echo "Error: Must specify --dev or --prod"
    echo "Usage: $0 --dev | --prod [--commit] [--rollback]"
    exit 1
fi

if [ "$ROLLBACK" = true ] && [ "$COMMIT" = true ]; then
    echo "Error: Cannot use --rollback and --commit together"
    exit 1
fi

CONFIG_FILE="$PROJECT_ROOT/deploy/$ENVIRONMENT.conf"
if [ ! -f "$CONFIG_FILE" ]; then
    echo "Error: Config file $CONFIG_FILE not found"
    exit 1
fi

source "$CONFIG_FILE"

if ! command -v composer &> /dev/null; then
    echo "Error: composer is not installed."
    echo "Please install composer: https://getcomposer.org/download/"
    exit 1
fi

if [ -z "$DEPLOY_HOST" ]; then
    echo "Error: DEPLOY_HOST is not set in $CONFIG_FILE"
    exit 1
fi

if [ -z "$DEPLOYMENTS_FOLDER" ]; then
    echo "Error: DEPLOYMENTS_FOLDER is not set in $CONFIG_FILE"
    exit 1
fi

if [ -z "$LIVE_SYMLINK" ]; then
    echo "Error: LIVE_SYMLINK is not set in $CONFIG_FILE"
    exit 1
fi

if [ -z "$ANGULAR_CONFIG" ]; then
    echo "Error: ANGULAR_CONFIG is not set in $CONFIG_FILE"
    exit 1
fi

if [ "$ROLLBACK" = true ]; then
    echo "Rolling back $ENVIRONMENT environment..."

    ssh "$DEPLOY_HOST" "set -e
        DEPLOYMENTS_DIR=\$HOME/smag/$DEPLOYMENTS_FOLDER
        if [ ! -L \$HOME/smag/$LIVE_SYMLINK ]; then
            echo 'Error: Symlink $LIVE_SYMLINK does not exist'
            exit 1
        fi
        CURRENT_LIVE=\$(readlink -f \$HOME/smag/$LIVE_SYMLINK)
        CURRENT_NUM=\$(basename \$(dirname \$CURRENT_LIVE))
        PREV_NUM=\$((CURRENT_NUM - 1))
        if [ ! -d \"\$DEPLOYMENTS_DIR/\$PREV_NUM\" ]; then
            echo \"Error: Previous deployment (\$PREV_NUM) does not exist\"
            exit 1
        fi
        ln -sfn \$DEPLOYMENTS_DIR/\$PREV_NUM/public \$HOME/smag/$LIVE_SYMLINK
        echo \"Rolled back from \$CURRENT_NUM to \$PREV_NUM\"
        echo \"Symlink now points to: \$PREV_NUM\"
    "

    exit 0
fi

echo "Building frontend..."
cd "$PROJECT_ROOT/frontend"
npm install
npm run build -- --configuration="${ANGULAR_CONFIG:-production}"

BUILD_DIR="$PROJECT_ROOT/build-$$"
rm -rf "$BUILD_DIR"
mkdir -p "$BUILD_DIR/public"
mkdir -p "$BUILD_DIR/backend"
mkdir -p "$BUILD_DIR/data"

echo "Packaging deployment..."
cp -r "$PROJECT_ROOT/frontend/dist/frontend/browser/"* "$BUILD_DIR/public/"
cp "$PROJECT_ROOT/deploy/public/.htaccess" "$BUILD_DIR/public/"
mkdir -p "$BUILD_DIR/public/api"
cp "$PROJECT_ROOT/deploy/public/api/index.php" "$BUILD_DIR/public/api/"

cp -r "$PROJECT_ROOT/backend/"* "$BUILD_DIR/backend/"
cp "$PROJECT_ROOT/backend/README.md" "$BUILD_DIR/"
rm -rf "$BUILD_DIR/backend/vendor"

echo "Installing PHP dependencies (production)..."
cd "$BUILD_DIR/backend"
composer install --no-dev --optimize-autoloader

cd "$PROJECT_ROOT"

cd "$BUILD_DIR"
ZIP_NAME="deployment-$(date +%Y%m%d-%H%M%S).zip"
zip -r "$ZIP_NAME" public backend data README.md
mv "$ZIP_NAME" "$PROJECT_ROOT/"
cd "$PROJECT_ROOT"

trap 'rm -rf "$BUILD_DIR" "$PROJECT_ROOT/$ZIP_NAME"' EXIT

echo "Deploying to $ENVIRONMENT environment..."

echo "Copying deployment package to server..."
scp "$ZIP_NAME" "$DEPLOY_HOST:~/smag/$DEPLOYMENTS_FOLDER/"

if [ "$COMMIT" = true ]; then
    SYMLINK_CMD="ln -sfn \$NEW_DIR/public \$HOME/smag/$LIVE_SYMLINK"
    echo "WARNING: Symlink will be updated to point to new deployment!"
else
    SYMLINK_CMD="# Symlink update skipped (use --commit to update)"
    echo "NOTE: Symlink will NOT be updated. Use --commit to switch to new deployment."
fi

ssh "$DEPLOY_HOST" "set -e
    DEPLOYMENTS_DIR=\$HOME/smag/$DEPLOYMENTS_FOLDER
    LATEST=\$(ls -1 \"\$DEPLOYMENTS_DIR\" 2>/dev/null | grep -E '^[0-9]+\$' | sort -n | tail -1)
    if [ -z \"\$LATEST\" ]; then
        NEW_NUM=1
    else
        NEW_NUM=\$((LATEST + 1))
    fi
    NEW_DIR=\$DEPLOYMENTS_DIR/\$NEW_NUM
    mkdir -p \$NEW_DIR
    cd \$NEW_DIR
    unzip -o \$DEPLOYMENTS_DIR/$ZIP_NAME
    rm \$DEPLOYMENTS_DIR/$ZIP_NAME
    if [ -L \$HOME/smag/$LIVE_SYMLINK ]; then
        CURRENT_LIVE=\$(readlink -f \$HOME/smag/$LIVE_SYMLINK)
        if [ -f "\$CURRENT_LIVE/../data/database.sqlite" ]; then
            cp "\$CURRENT_LIVE/../data/database.sqlite" data/
        fi
        if [ -f "\$CURRENT_LIVE/../backend/config.php" ]; then
            cp "\$CURRENT_LIVE/../backend/config.php" backend/
        fi
    fi
    if [ ! -f backend/config.php ] && [ -f backend/config.php.template ]; then
        mv backend/config.php.template backend/config.php
    fi
    $SYMLINK_CMD
    echo \"Prepared deployment \$NEW_NUM\"
"

echo "Done!"
