' Menyalakan server SIAP SMP tanpa jendela console.
'
' Dipakai oleh pintasan "SIAP SMP Server" di folder Startup agar aplikasi
' langsung siap saat Windows login. Tidak memerlukan PowerShell.
'
' Bila server sudah berjalan di port 5173, skrip ini tidak melakukan apa-apa.

Option Explicit

Dim fso, sh, appDir, nodeExe, serverJs, logDir, logFile, q, checkCmd, runCmd, rc

Set fso = CreateObject("Scripting.FileSystemObject")
Set sh = CreateObject("WScript.Shell")

' Folder aplikasi = satu tingkat di atas folder scripts ini.
appDir = fso.GetParentFolderName(fso.GetParentFolderName(WScript.ScriptFullName))
serverJs = appDir & "\server.cjs"
logDir = appDir & "\logs"
logFile = logDir & "\server.log"
q = Chr(34)

If Not fso.FileExists(serverJs) Then
  MsgBox "server.cjs tidak ditemukan di:" & vbCrLf & appDir, 16, "SIAP SMP"
  WScript.Quit 1
End If

' Cari Node portabel, lalu Node yang terpasang di Windows.
nodeExe = ""
If fso.FileExists(appDir & "\runtime\node.exe") Then nodeExe = appDir & "\runtime\node.exe"
If nodeExe = "" Then
  If fso.FileExists(sh.ExpandEnvironmentStrings("%ProgramFiles%") & "\nodejs\node.exe") Then
    nodeExe = sh.ExpandEnvironmentStrings("%ProgramFiles%") & "\nodejs\node.exe"
  End If
End If
If nodeExe = "" Then
  If fso.FileExists(sh.ExpandEnvironmentStrings("%ProgramFiles(x86)%") & "\nodejs\node.exe") Then
    nodeExe = sh.ExpandEnvironmentStrings("%ProgramFiles(x86)%") & "\nodejs\node.exe"
  End If
End If
If nodeExe = "" Then
  If fso.FileExists(sh.ExpandEnvironmentStrings("%LOCALAPPDATA%") & "\Programs\nodejs\node.exe") Then
    nodeExe = sh.ExpandEnvironmentStrings("%LOCALAPPDATA%") & "\Programs\nodejs\node.exe"
  End If
End If
If nodeExe = "" Then
  MsgBox "Node.js tidak ditemukan. Pastikan folder runtime\node.exe ikut tersalin.", 16, "SIAP SMP"
  WScript.Quit 1
End If

If Not fso.FolderExists(logDir) Then fso.CreateFolder(logDir)

' Cek port 5173 (exit code 0 = sudah ada server yang mendengarkan).
checkCmd = q & nodeExe & q & " -e " & q & _
  "const n=require('net');const s=n.connect(5173,'127.0.0.1');" & _
  "s.on('connect',()=>{s.destroy();process.exit(0)});" & _
  "s.on('error',()=>process.exit(1));setTimeout(()=>process.exit(1),500)" & q

rc = sh.Run(checkCmd, 0, True)
If rc = 0 Then WScript.Quit 0

' Jalankan server tersembunyi, log ke logs\server.log.
runCmd = "cmd /c " & q & q & nodeExe & q & " " & q & serverJs & q & _
  " >> " & q & logFile & q & " 2>&1" & q

sh.Run runCmd, 0, False
WScript.Quit 0
