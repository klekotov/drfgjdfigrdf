!macro NSIS_HOOK_POSTINSTALL
  ; Remove shortcuts from older installers before creating the canonical ones.
  SetShellVarContext current
  Delete "$DESKTOP\multi-tool.lnk"
  Delete "$DESKTOP\Multi Tool.lnk"
  Delete "$SMPROGRAMS\Multi Tool\multi-tool.lnk"
  Delete "$SMPROGRAMS\Multi Tool\Multi Tool.lnk"

  ; Keep the visible shortcut name independent from the Rust executable name.
  CreateShortCut "$DESKTOP\Multi Tool.lnk" "$INSTDIR\multi-tool.exe" "" "$INSTDIR\multi-tool.exe" 0 SW_SHOWNORMAL "" "Multi Tool"
  CreateDirectory "$SMPROGRAMS\Multi Tool"
  CreateShortCut "$SMPROGRAMS\Multi Tool\Multi Tool.lnk" "$INSTDIR\multi-tool.exe" "" "$INSTDIR\multi-tool.exe" 0 SW_SHOWNORMAL "" "Multi Tool"
!macroend

!macro NSIS_HOOK_PREUNINSTALL
  SetShellVarContext current
  Delete "$DESKTOP\multi-tool.lnk"
  Delete "$DESKTOP\Multi Tool.lnk"
  Delete "$SMPROGRAMS\Multi Tool\multi-tool.lnk"
  Delete "$SMPROGRAMS\Multi Tool\Multi Tool.lnk"
  RMDir "$SMPROGRAMS\Multi Tool"
!macroend