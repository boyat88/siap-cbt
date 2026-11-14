' Membuat pintasan SIAP SMP tanpa PowerShell.
'
' Jalankan dengan klik dua kali file ini. Pintasan yang dibuat:
'   1. Desktop  : SIAP SMP            (menyalakan server bila perlu + buka browser)
'   2. Start Menu: SIAP SMP           (sama seperti Desktop)
'   3. Startup  : SIAP SMP Server     (menyalakan server otomatis saat login)
'
' Berguna bila PowerShell diblokir kebijakan Windows.

Option Explicit

Dim fso, sh, appDir, q, launcher, silentServer, iconPath, iconCandidates, i
Dim desktopLink, menuLink, startupLink, lnk, report

Set fso = CreateObject("Scripting.FileSystemObject")
Set sh = CreateObject("WScript.Shell")
q = Chr(34)

appDir = fso.GetParentFolderName(fso.GetParentFolderName(WScript.ScriptFullName))
launcher = appDir & "\scripts\buka-siap.cmd"
silentServer = appDir & "\scripts\start-server-senyap.vbs"

If Not fso.FileExists(launcher) Then
  MsgBox "File buka-siap.cmd tidak ditemukan di:" & vbCrLf & appDir & "\scripts", 16, "SIAP SMP"
  WScript.Quit 1
End If

If Not fso.FileExists(silentServer) Then
  MsgBox "File start-server-senyap.vbs tidak ditemukan di:" & vbCrLf & appDir & "\scripts", 16, "SIAP SMP"
  WScript.Quit 1
End If

' Ikon memakai browser yang tersedia agar terlihat familiar.
iconPath = ""
iconCandidates = Array( _
  sh.ExpandEnvironmentStrings("%ProgramFiles(x86)%") & "\Microsoft\Edge\Application\msedge.exe", _
  sh.ExpandEnvironmentStrings("%ProgramFiles%") & "\Microsoft\Edge\Application\msedge.exe", _
  sh.ExpandEnvironmentStrings("%ProgramFiles%") & "\Google\Chrome\Application\chrome.exe", _
  sh.ExpandEnvironmentStrings("%ProgramFiles(x86)%") & "\Google\Chrome\Application\chrome.exe", _
  sh.ExpandEnvironmentStrings("%LOCALAPPDATA%") & "\Google\Chrome\Application\chrome.exe")

For i = 0 To UBound(iconCandidates)
  If iconPath = "" And fso.FileExists(iconCandidates(i)) Then iconPath = iconCandidates(i)
Next

' 1) Pintasan Desktop
desktopLink = sh.SpecialFolders("Desktop") & "\SIAP SMP.lnk"
Set lnk = sh.CreateShortcut(desktopLink)
lnk.TargetPath = launcher
lnk.WorkingDirectory = appDir
lnk.WindowStyle = 7
lnk.Description = "Buka aplikasi absensi SIAP SMP"
If iconPath <> "" Then lnk.IconLocation = iconPath & ",0"
lnk.Save

' 2) Pintasan Start Menu
menuLink = sh.SpecialFolders("Programs") & "\SIAP SMP.lnk"
Set lnk = sh.CreateShortcut(menuLink)
lnk.TargetPath = launcher
lnk.WorkingDirectory = appDir
lnk.WindowStyle = 7
lnk.Description = "Buka aplikasi absensi SIAP SMP"
If iconPath <> "" Then lnk.IconLocation = iconPath & ",0"
lnk.Save

' 3) Server otomatis saat Windows login (tanpa jendela)
startupLink = sh.SpecialFolders("Startup") & "\SIAP SMP Server.lnk"
Set lnk = sh.CreateShortcut(startupLink)
lnk.TargetPath = sh.ExpandEnvironmentStrings("%SystemRoot%") & "\System32\wscript.exe"
lnk.Arguments = q & silentServer & q
lnk.WorkingDirectory = appDir
lnk.WindowStyle = 7
lnk.Description = "Menyalakan server SIAP SMP saat Windows login"
If iconPath <> "" Then lnk.IconLocation = iconPath & ",0"
lnk.Save

report = "Pintasan berhasil dibuat:" & vbCrLf & vbCrLf & _
  "Desktop      : " & desktopLink & vbCrLf & _
  "Start Menu   : " & menuLink & vbCrLf & _
  "Auto-start   : " & startupLink & vbCrLf & vbCrLf & _
  "Klik dua kali pintasan SIAP SMP untuk membuka aplikasi." & vbCrLf & _
  "Server akan menyala otomatis saat Windows login berikutnya."

MsgBox report, 64, "SIAP SMP"
