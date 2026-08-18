$ErrorActionPreference = "Stop"

$trayRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
$sourceFile = Join-Path $trayRoot "src\main\java\dev\critter\tray\DevCritterTray.java"
$resourcesDir = Join-Path $trayRoot "src\main\resources"
$iconFile = Join-Path $trayRoot "src\main\package\dev-critter-app-icon.ico"
$buildRoot = Join-Path $trayRoot "build"
$classesDir = Join-Path $buildRoot "package-classes"
$inputDir = Join-Path $buildRoot "package-input"
$packageDir = Join-Path $buildRoot "package"
$jarPath = Join-Path $inputDir "dev-critter-tray.jar"

Remove-Item -Recurse -Force $classesDir, $inputDir, $packageDir -ErrorAction SilentlyContinue
New-Item -ItemType Directory -Force $classesDir, $inputDir | Out-Null

javac -d $classesDir $sourceFile
if ($LASTEXITCODE -ne 0) {
    throw "javac failed."
}

Copy-Item (Join-Path $resourcesDir "*") $classesDir -Recurse
jar --create --file $jarPath --main-class dev.critter.tray.DevCritterTray -C $classesDir .
if ($LASTEXITCODE -ne 0) {
    throw "jar failed."
}

jpackage `
    --type app-image `
    --name "Dev Critter" `
    --dest $packageDir `
    --input $inputDir `
    --main-jar "dev-critter-tray.jar" `
    --main-class dev.critter.tray.DevCritterTray `
    --icon $iconFile `
    --add-modules "java.desktop,java.net.http,java.prefs,jdk.crypto.ec"
if ($LASTEXITCODE -ne 0) {
    throw "jpackage failed."
}

$appImage = Join-Path $packageDir "Dev Critter"
$launcher = Join-Path $appImage "Dev Critter.exe"
$runtime = Join-Path $appImage "runtime"

if (-not (Test-Path -LiteralPath $launcher -PathType Leaf)) {
    throw "Packaged launcher is missing: $launcher"
}
if (-not (Test-Path -LiteralPath $runtime -PathType Container)) {
    throw "Bundled Java runtime is missing: $runtime"
}

Write-Output "Windows app image created: $appImage"
