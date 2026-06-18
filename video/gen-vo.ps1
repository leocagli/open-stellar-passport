# Generate per-line voiceover WAVs with Windows SAPI (Zira, en-US). No API key.
Add-Type -AssemblyName System.Speech
$s = New-Object System.Speech.Synthesis.SpeechSynthesizer
try { $s.SelectVoice("Microsoft Zira Desktop") } catch {}
$s.Rate = 0

$dir = Join-Path $PSScriptRoot "public\vo"
New-Item -ItemType Directory -Force -Path $dir | Out-Null

$lines = @(
  "Agent Passport. Zero-knowledge credentials for autonomous A.I. agent payments on Stellar.",
  "Today, letting an agent pay means handing it your keys, or K Y C into a honeypot. Both leak money or identity.",
  "Agent Passport replaces that with one zero-knowledge proof: personhood, anti-Sybil, and solvency, proven all at once.",
  "The owner picks a spend cap, and a Groth16 proof is built entirely in the browser. The private key and balance never leave the page.",
  "It is verified on-chain. Soroban runs the B-N-254 pairing check live on testnet, and mints an attestation. No wallet needed.",
  "The x402 gate authorizes a payment only within the proven, hidden cap. Within the cap, approved. Over it, denied.",
  "Each passport burns a one-time nullifier, so replaying a spent proof is rejected on-chain.",
  "Under the hood: a Circom circuit and two contracts, deployed on Stellar testnet. It is open source."
)

for ($i = 0; $i -lt $lines.Count; $i++) {
  $f = Join-Path $dir ("{0:00}.wav" -f ($i + 1))
  $s.SetOutputToWaveFile($f)
  $s.Speak($lines[$i])
}
$s.Dispose()
Get-ChildItem $dir -Filter *.wav | ForEach-Object { "{0}  {1} bytes" -f $_.Name, $_.Length }
