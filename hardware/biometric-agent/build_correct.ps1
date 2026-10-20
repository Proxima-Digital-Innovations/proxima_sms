Remove-Item -Path "publish" -Recurse -Force -ErrorAction SilentlyContinue
dotnet publish KioskNative.csproj -c Release -o publish -r win-x64 --self-contained false
Remove-Item -Path "publish\libs" -Recurse -Force -ErrorAction SilentlyContinue
Remove-Item -Path "publish\dpfj.dll" -Force -ErrorAction SilentlyContinue
Remove-Item -Path "publish\dpfpdd.dll" -Force -ErrorAction SilentlyContinue
Remove-Item -Path "publish\SQLite.Interop.dll" -Force -ErrorAction SilentlyContinue

$nugetSqlite64 = "$env:USERPROFILE\.nuget\packages\stub.system.data.sqlite.core.netframework\1.0.118\build\net46\x64\SQLite.Interop.dll"
if (Test-Path $nugetSqlite64) {
    New-Item -ItemType Directory -Path "publish\x64" -Force | Out-Null
    Copy-Item $nugetSqlite64 -Destination "publish\x64\SQLite.Interop.dll" -Force
} else {
    Write-Host "Warning: 64-bit SQLite not found in nuget cache!"
}
& "$env:TEMP\nsis\nsis-3.10\makensis.exe" installer.nsi
