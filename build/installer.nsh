!macro customInstall
  ${if} ${FileExists} "$INSTDIR\icono.ico"
    !ifndef DO_NOT_CREATE_START_MENU_SHORTCUT
      ${if} ${FileExists} "$newStartMenuLink"
        Delete "$newStartMenuLink"
        CreateShortCut "$newStartMenuLink" "$appExe" "" "$INSTDIR\icono.ico" 0 "" "" "${APP_DESCRIPTION}"
        ClearErrors
        WinShell::SetLnkAUMI "$newStartMenuLink" "${APP_ID}"
      ${endIf}
    !endif

    !ifndef DO_NOT_CREATE_DESKTOP_SHORTCUT
      ${ifNot} ${isNoDesktopShortcut}
        Delete "$newDesktopLink"
        CreateShortCut "$newDesktopLink" "$appExe" "" "$INSTDIR\icono.ico" 0 "" "" "${APP_DESCRIPTION}"
        ClearErrors
        WinShell::SetLnkAUMI "$newDesktopLink" "${APP_ID}"
      ${endIf}
    !endif

    System::Call 'Shell32::SHChangeNotify(i 0x8000000, i 0, i 0, i 0)'
  ${endif}
!macroend
