# Rigenera i .pl dalle specifiche .rml, poi esegue ogni metrica contro
# una traccia conforme e una traccia violante, e confronta i due verdetti.
#
#   .\run-verdicts.ps1
#
# Le tracce in traces/ sono JSONL: un evento MIDI per riga, stesso formato
# di midi-probe/events.json (webmidi v3). Ogni metrica ha esattamente due
# file: <metrica>.ok.jsonl (Main soddisfatta) e <metrica>.fail.jsonl
# (Main violata). Il verdetto atteso e' implicito dal nome.
#
# Il monitor RML ha due soli esiti: "Execution terminated correctly" (exit 0)
# e "Trace did not match specification" (exit 1). Non c'e' un verdetto a 4
# valori: quello descritto in RUNTIME_VERIFICATION_ANALYSIS.md e' il modello
# teorico, non l'output del tool.
$ErrorActionPreference = 'Stop'
$metricsDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$tracesDir = Join-Path $metricsDir 'traces'
$monitorDir = (Resolve-Path (Join-Path $metricsDir '..\monitor')).Path -replace '\\', '/'

$failed = @()
foreach ($rml in Get-ChildItem (Join-Path $metricsDir '*.rml') | Sort-Object Name) {
    $name = $rml.BaseName
    $pl = Join-Path $metricsDir "$name.pl"
    if (-not (Test-Path $pl)) {
        Write-Host "$name`: SKIP (nessun .pl, lancia build-pl.ps1)" -ForegroundColor Yellow
        $failed += $name
        continue
    }
    foreach ($case in @('ok', 'fail')) {
        $trace = Join-Path $tracesDir "$name.$case.jsonl"
        if (-not (Test-Path $trace)) {
            Write-Host "$name/$case`: SKIP (manca $trace)" -ForegroundColor Yellow
            $failed += "$name/$case"
            continue
        }
        # gli argomenti sono posizionali: spec, trace, poi le flag.
        # una flag prima dello spec fa fallire load_spec con "File not found".
        $out = & swipl -O -p monitor="$monitorDir" "$monitorDir/monitor.pl" -- $pl $trace --silent 2>&1
        $code = $LASTEXITCODE
        $expect = if ($case -eq 'ok') { 0 } else { 1 }
        if ($code -eq $expect) {
            Write-Host ("{0,-20} {1,-4} OK  exit={2}" -f $name, $case, $code)
        }
        else {
            Write-Host ("{0,-20} {1,-4} FAIL atteso exit={2} ottenuto {3} :: {4}" -f $name, $case, $expect, $code, ($out | Select-Object -Last 1)) -ForegroundColor Red
            $failed += "$name/$case"
        }
    }
}

if ($failed.Count -gt 0) {
    Write-Host "`nverdetti inattesi: $($failed -join ', ')" -ForegroundColor Red
    exit 1
}
Write-Host "`ntutti i verdetti sono quelli attesi" -ForegroundColor Green
