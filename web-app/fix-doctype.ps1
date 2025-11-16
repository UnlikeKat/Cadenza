$file = 'app\components\MusicPlayer.tsx'
$lines = Get-Content $file

$fixed = @()
for ($i = 0; $i -lt $lines.Count; $i++) {
    if ($i -eq 194) {
        # Skip line 195 (0-indexed as 194) - it's the broken continuation
        continue
    }
    elseif ($i -eq 193) {
        # Line 194 - add proper string
        $fixed += $lines[$i]
        $fixed += '            ''<!DOCTYPE score-partwise PUBLIC "-//Recordare//DTD MusicXML 3.1 Partwise//EN" "http://www.musicxml.org/dtds/partwise.dtd">'''
        $i++ # Skip the broken line
        continue
    }
    elseif ($i -eq 198) {
        # Skip line 199 - it's the broken continuation
        continue
    }
    elseif ($i -eq 197) {
        # Line 198 - add proper string
        $fixed += $lines[$i]
        $fixed += '            ''<!DOCTYPE score-timewise PUBLIC "-//Recordare//DTD MusicXML 3.1 Timewise//EN" "http://www.musicxml.org/dtds/timewise.dtd">'''
        $i++ # Skip the broken line
        continue
    }
    else {
        $fixed += $lines[$i]
    }
}

$fixed | Set-Content $file -Encoding UTF8
Write-Host "Fixed DOCTYPE strings in $file"
