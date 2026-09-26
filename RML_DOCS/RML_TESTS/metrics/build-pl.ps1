# Compila ogni metrica .rml nel modulo Prolog .pl corrispondente.
# Il compilatore RML (ANTLR + Kotlin) sta in RML_DOCS/RML_TESTS/compiler/,
# che e' gitignored: su clone pulito va re-clonato. vedi .gitignore sezione
# "RML cloned repos".
# ponytail: nessuna gestione errori esplicita, il compilatore esce non-zero
# solo su errori di sintassi che fallirebbero anche il monitor poi.
$ErrorActionPreference = 'Stop'
$metricsDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$repoRoot = (Resolve-Path (Join-Path $metricsDir '..\..\..')).Path
$jar = Join-Path $repoRoot 'RML_DOCS\RML_TESTS\compiler\build\libs\rml-compiler.jar'

if (-not (Test-Path $jar)) { throw "compilatore RML non trovato: $jar" }

Get-ChildItem (Join-Path $metricsDir '*.rml') | ForEach-Object {
    $pl = Join-Path $metricsDir ($_.BaseName + '.pl')
    # non usare il redirect `> $pl`: PowerShell 5.1 scrive UTF-16LE e
    # SWI-Prolog non lo legge. si cattura l'output e si scrive UTF-8 senza BOM.
    $out = & java -jar $jar --input $_.FullName 2>&1
    if ($LASTEXITCODE -ne 0) { throw "compilazione fallita: $($_.Name)`n$out" }
    [System.IO.File]::WriteAllText($pl, ($out -join "`n") + "`n", (New-Object System.Text.UTF8Encoding($false)))
    Write-Host "compilato $($_.Name) -> $([System.IO.Path]::GetFileName($pl))"
}
