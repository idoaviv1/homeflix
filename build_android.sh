#!/usr/bin/env bash
set -e

DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$DIR"

echo "📦 Building web assets..."
pnpm --filter @omflix/web build

echo "⚡ Syncing Capacitor Android..."
cd "$DIR/apps/web"
npx cap sync android

echo "🔨 Building APK with Gradle (Java 21)..."
cd "$DIR/apps/web/android"
JAVA_HOME=/usr/lib/jvm/java-21-openjdk ANDROID_HOME=/home/idodi/Android/Sdk ./gradlew assembleDebug

APK_SRC="$DIR/apps/web/android/app/build/outputs/apk/debug/app-debug.apk"
DEST_DIR="/media/windows/Shared-APK"
mkdir -p "$DEST_DIR"

VERSION=$(node -p "require('$DIR/apps/web/package.json').version || '0.1.0'")
STAMP=$(date -u +%Y%m%d-%H%M)
SHA=$(git rev-parse --short HEAD 2>/dev/null || echo nogit)
NAME="Homeflix-${VERSION}-${STAMP}-${SHA}-debug.apk"

cp "$APK_SRC" "$DEST_DIR/$NAME"
cp "$APK_SRC" "$DEST_DIR/Homeflix.apk"
cp "$APK_SRC" "$DEST_DIR/Homeflix-Galaxy-S22-Ultra.apk"

echo "✅ Success! Android APK generated for Galaxy S22 Ultra at:"
ls -lh "$DEST_DIR"/Homeflix*
