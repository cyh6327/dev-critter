#!/bin/bash
set -euo pipefail

TRAY_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SOURCE_FILE="$TRAY_ROOT/src/main/java/dev/critter/tray/DevCritterTray.java"
RESOURCES_DIR="$TRAY_ROOT/src/main/resources"
BUILD_ROOT="$TRAY_ROOT/build"
CLASSES_DIR="$BUILD_ROOT/package-classes"
INPUT_DIR="$BUILD_ROOT/package-input"
PACKAGE_DIR="$BUILD_ROOT/package"
JAR_PATH="$INPUT_DIR/dev-critter-tray.jar"

rm -rf "$CLASSES_DIR" "$INPUT_DIR" "$PACKAGE_DIR"
mkdir -p "$CLASSES_DIR" "$INPUT_DIR"

javac -d "$CLASSES_DIR" "$SOURCE_FILE"
cp "$RESOURCES_DIR"/* "$CLASSES_DIR"/
jar --create \
  --file "$JAR_PATH" \
  --main-class dev.critter.tray.DevCritterTray \
  -C "$CLASSES_DIR" .

jpackage \
  --type app-image \
  --name "Dev Critter" \
  --dest "$PACKAGE_DIR" \
  --input "$INPUT_DIR" \
  --main-jar "dev-critter-tray.jar" \
  --main-class dev.critter.tray.DevCritterTray \
  --add-modules "java.desktop,java.net.http,java.prefs,jdk.crypto.ec"

APP_IMAGE="$PACKAGE_DIR/Dev Critter.app"
LAUNCHER="$APP_IMAGE/Contents/MacOS/Dev Critter"
RUNTIME="$APP_IMAGE/Contents/runtime"

test -x "$LAUNCHER"
test -d "$RUNTIME"

echo "macOS app image created: $APP_IMAGE"
