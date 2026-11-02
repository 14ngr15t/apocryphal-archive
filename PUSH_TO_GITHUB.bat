@echo off
set "PATH=%LOCALAPPDATA%\Programs\Git\cmd;%PATH%"
cd /d "%~dp0"

echo ========================================================
echo   Pushing Ian's Retro RPG Shrine to GitHub
echo   Repository: https://github.com/14ngr15t/apocryphal-archive.git
echo ========================================================
echo.

git push -u origin main

echo.
if %ERRORLEVEL% EQU 0 (
    echo ========================================================
    echo   SUCCESS! Your website is now live on GitHub!
    echo   Visit: https://github.com/14ngr15t/apocryphal-archive
    echo ========================================================
) else (
    echo [!] Push failed or authorization was cancelled.
    echo If prompted, please sign in with your GitHub account in the browser or enter a Personal Access Token.
)
echo.
pause
