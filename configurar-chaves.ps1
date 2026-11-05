# Grava as chaves gratis (opcionais) no GitHub (robo) e na Vercel (painel). As chaves nao passam pelo chat
# e nao ficam salvas no computador nem no codigo. Aperte Enter para pular qualquer uma.
#   - GEMINI_API_KEY: IA principal (analise de criativos, hooks, roteiros, entregavel, pagina)
#   - GROQ_API_KEY:   IA reserva + transcricao dos videos (Whisper)
#   - GOOGLE_API_KEY: trafego real e velocidade dos sites (Chrome UX Report e PageSpeed)
#   - PEXELS_API_KEY: busca de fotos gratis no editor de criativo
$ErrorActionPreference = 'Continue'
Set-Location $PSScriptRoot
$repo = 'KauanX28/minerador-ofertas'
$gh = 'C:\Program Files\GitHub CLI\gh.exe'
$vcfg = Join-Path $PSScriptRoot '.vercel-cli'
$escopo = 'skylands-projects-ad394ac0'

$null = & $gh auth status 2>&1
if ($LASTEXITCODE -ne 0) {
  Write-Host 'Entre na sua conta do GitHub (vai abrir o navegador com um codigo):' -ForegroundColor Cyan
  & $gh auth login --hostname github.com --git-protocol https --web --scopes workflow
}
$null = & npx --yes vercel@latest whoami --global-config $vcfg 2>&1
if ($LASTEXITCODE -ne 0) {
  Write-Host 'Entre na sua conta da Vercel:' -ForegroundColor Cyan
  & npx --yes vercel@latest login --global-config $vcfg
}

function LerOculto($pergunta) {
  $s = Read-Host $pergunta -AsSecureString
  return [Runtime.InteropServices.Marshal]::PtrToStringAuto([Runtime.InteropServices.Marshal]::SecureStringToBSTR($s)).Trim()
}
$mudouVercel = $false
function Gravar($nome, $valor, [switch]$SoVercel) {
  if (-not $SoVercel) {
    $valor | & $gh secret set $nome --repo $repo
    if ($LASTEXITCODE -eq 0) { Write-Host "  ${nome}: gravado no GitHub (robo)" -ForegroundColor Green } else { Write-Host "  ${nome}: FALHOU no GitHub" -ForegroundColor Red }
  }
  $valor | & npx --yes vercel@latest env add $nome --environment production --force --sensitive --scope $escopo --global-config $vcfg 2>&1 | Out-Null
  if ($LASTEXITCODE -eq 0) { Write-Host "  ${nome}: gravado na Vercel (painel)" -ForegroundColor Green; $script:mudouVercel = $true } else { Write-Host "  ${nome}: FALHOU na Vercel" -ForegroundColor Red }
}
function Testar($nome, $bloco) {
  try { & $bloco | Out-Null; return $true } catch { Write-Host "  ${nome}: a chave nao funcionou ($($_.Exception.Message))" -ForegroundColor Red; return $false }
}

Write-Host ''
Write-Host '1) Gemini (IA principal, gratis, sem cartao)' -ForegroundColor Cyan
Write-Host '   Abra https://aistudio.google.com/apikey > "Create API key" > copie.'
$k = LerOculto 'Chave do Gemini (ou Enter para pular)'
if ($k -and (Testar 'GEMINI_API_KEY' { Invoke-RestMethod "https://generativelanguage.googleapis.com/v1beta/models?key=$k" })) { Gravar 'GEMINI_API_KEY' $k }

Write-Host ''
Write-Host '2) Groq (IA reserva + transcricao de video, gratis, sem cartao)' -ForegroundColor Cyan
Write-Host '   Abra https://console.groq.com/keys > "Create API Key" > copie.'
$k = LerOculto 'Chave do Groq (ou Enter para pular)'
if ($k -and (Testar 'GROQ_API_KEY' { Invoke-RestMethod 'https://api.groq.com/openai/v1/models' -Headers @{ Authorization = "Bearer $k" } })) { Gravar 'GROQ_API_KEY' $k }

Write-Host ''
Write-Host '3) Google (trafego real e velocidade dos sites, gratis)' -ForegroundColor Cyan
Write-Host '   a) https://console.cloud.google.com > crie um projeto (ex.: minerador).'
Write-Host '   b) Ative "Chrome UX Report API" e "PageSpeed Insights API" (APIs e servicos > Biblioteca).'
Write-Host '   c) APIs e servicos > Credenciais > Criar credenciais > Chave de API > copie.'
$k = LerOculto 'Chave do Google (ou Enter para pular)'
if ($k) {
  $ok = Testar 'GOOGLE_API_KEY' { Invoke-RestMethod -Method Post "https://chromeuxreport.googleapis.com/v1/records:queryRecord?key=$k" -ContentType 'application/json' -Body '{"origin":"https://www.google.com"}' }
  if (-not $ok) { Write-Host '  Dica: confira se a "Chrome UX Report API" foi ativada no mesmo projeto da chave.' -ForegroundColor Yellow }
  else { Gravar 'GOOGLE_API_KEY' $k }
}

Write-Host ''
Write-Host '4) Pexels (fotos gratis no editor de criativo, opcional)' -ForegroundColor Cyan
Write-Host '   Abra https://www.pexels.com/api/ > "Get started" > copie a chave.'
$k = LerOculto 'Chave do Pexels (ou Enter para pular)'
if ($k -and (Testar 'PEXELS_API_KEY' { Invoke-RestMethod 'https://api.pexels.com/v1/search?query=teste&per_page=1' -Headers @{ Authorization = $k } })) { Gravar 'PEXELS_API_KEY' $k -SoVercel }

if ($mudouVercel) {
  Write-Host "`nPublicando o painel de novo para as chaves valerem (1 a 2 minutos)..." -ForegroundColor Cyan
  & npx --yes vercel@latest deploy --prod --yes --scope $escopo --global-config $vcfg 2>&1 | Select-String -Pattern 'Aliased|Error' | ForEach-Object { Write-Host "  $_" }
}
Write-Host "`nPronto. O painel ja usa as chaves; o robo usa a partir da proxima rodada." -ForegroundColor Green
