# Generates the optional Higgsfield plates and an alternative score for
# "Off the Page", and registers the plates with the composition.
#
#   powershell -File scripts/higgsfield/generate-plates.ps1            # plates
#   powershell -File scripts/higgsfield/generate-plates.ps1 -Music     # plates + score
#
# STATUS: the parameters and costs below were validated against the live CLI
# with `higgsfield generate cost` on 13 November 2026. The generation and
# download steps have NOT been run, because the account had 0 credits. Expect
# to adjust the result-URL parsing the first time this is used.
#
# Costs measured that day: 2K still 2 credits, 6 s 1080p clip 96 credits,
# 60 s instrumental about 9 credits. A full run is roughly 205 credits.
#
# The film does not need any of this. It renders complete without it.

param(
  [switch]$Music,
  [switch]$Yes
)

$ErrorActionPreference = "Stop"
$root = Resolve-Path (Join-Path $PSScriptRoot "..\..")
$out = Join-Path $root "public\assets\generated"
New-Item -ItemType Directory -Force -Path $out | Out-Null

# One look for every plate, so generated footage sits inside the film's world
# instead of fighting it: warm paper, red chalk, soft daylight, no people.
$look = "Macro product cinematography, 85mm, shallow depth of field, soft north-window daylight, warm cream cotton paper with visible tooth, muted taupe and ink-black palette, one accent of red chalk (sanguine), restrained, editorial, no text, no logos, no people, no hands"

$jobs = @(
  @{ name = "hook-still"; model = "nano_banana_pro"; ext = "png"
     args = @("--aspect_ratio", "16:9", "--resolution", "2k")
     prompt = "A single sheet of warm cream drafting paper lying flat on a pale desk, seen from directly above, completely blank except for faint taupe construction lines and one large pencil arc. Even soft light, very subtle paper grain. $look" },
  @{ name = "hook-plate"; model = "seedance_2_5"; ext = "mp4"; startFrom = "hook-still"
     args = @("--mode", "omni_reference", "--aspect_ratio", "16:9", "--resolution", "1080p", "--duration", "6", "--generate_audio", "false")
     prompt = "Locked-off overhead shot of the same sheet of paper. Nothing moves except soft daylight drifting very slowly across the surface, as if a cloud passes. No camera movement. $look" },
  @{ name = "night-still"; model = "nano_banana_pro"; ext = "png"
     args = @("--aspect_ratio", "16:9", "--resolution", "2k")
     prompt = "Abstract dark studio surface, matte near-black, with a very fine regular grid of tiny pale dots receding in soft focus, a faint pool of cool light upper right, deep vignette. Minimal, technical, calm. No text, no logos, no people." }
)
if ($Music) {
  $jobs += @{ name = "score-alt"; model = "elevenlabs_music_v2_5"; ext = "mp3"
     args = @("--duration", "60", "--force_instrumental", "true")
     prompt = "Instrumental, 100 BPM, D minor. Opens almost silent with soft felt piano notes for seven seconds. At 12 seconds a tight impact and a warm, confident electronic pulse begins: round kick, plucked synth arpeggio, warm pad. From 24 seconds drier and more mechanical, ticking sixteenths. From 36 seconds layers build and rise. At 46 seconds drums drop out for a quiet, human passage of pad and piano. At 53 seconds a brief silence, then one full bright major chord that rings out to the end. Modern, premium, optimistic, restrained. No vocals." }
}

Write-Host "Account:" (higgsfield account status)
$total = 0.0
foreach ($j in $jobs) {
  $cost = (higgsfield generate cost $j.model --prompt $j.prompt @($j.args)) -join " "
  if ($cost -match "([\d.]+)\s*credits") { $total += [double]$Matches[1] }
  Write-Host ("  {0,-12} {1,-24} {2}" -f $j.name, $j.model, $cost)
}
Write-Host ("Estimated total: {0} credits" -f $total)
if (-not $Yes) {
  $answer = Read-Host "Spend these credits? Type yes to continue"
  if ($answer -ne "yes") { Write-Host "Nothing generated."; exit 0 }
}

$made = @{}
foreach ($j in $jobs) {
  $extra = @()
  if ($j.startFrom) {
    if (-not $made[$j.startFrom]) { Write-Warning "$($j.name): start image '$($j.startFrom)' missing, skipped."; continue }
    # A local path is uploaded by the CLI, which is how a reference reaches Higgsfield.
    $extra = @("--start-image", $made[$j.startFrom])
  }
  Write-Host "Generating $($j.name) ..."
  $result = (higgsfield generate create $j.model --prompt $j.prompt @($j.args) @extra --wait --wait-timeout 20m) -join "`n"
  $url = ([regex]::Matches($result, "https?://\S+") | Select-Object -First 1).Value
  if (-not $url) { Write-Warning "$($j.name): no result URL found in:`n$result"; continue }
  $file = Join-Path $out "$($j.name).$($j.ext)"
  Invoke-WebRequest -Uri $url.TrimEnd(".", ",", ")") -OutFile $file -UseBasicParsing
  $made[$j.name] = $file
  Write-Host "  saved $file"
}

# Register what exists with the composition. A clip wins over its still.
$pick = { param($names) foreach ($n in $names) { if ($made[$n]) { return "assets/generated/" + (Split-Path $made[$n] -Leaf) } } return $null }
$hook = & $pick @("hook-plate", "hook-still")
$night = & $pick @("night-still")
$q = { param($v) if ($v) { '"' + $v + '"' } else { "null" } }
$ts = @"
// Written by scripts/higgsfield/generate-plates.ps1. Set an entry to null to
// render without that plate.

export const PLATES: { hook: string | null; night: string | null } = {
  hook: $(& $q $hook),
  night: $(& $q $night),
};
"@
Set-Content -Path (Join-Path $root "src\plates.ts") -Value $ts -Encoding utf8
Write-Host "src/plates.ts updated. Re-render to see the plates."
if ($made["score-alt"]) {
  Write-Host "Alternative score saved. To use it, set the composition's 'audio' prop to assets/generated/score-alt.mp3."
}
