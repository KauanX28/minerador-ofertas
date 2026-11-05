# Grava os segredos da Fase 0 no GitHub (usados pelo robô). Nada fica salvo no computador nem no código.
#   - SUPABASE_SERVICE_ROLE_KEY: obrigatório para guardar as miniaturas no Storage
#   - TELEGRAM_BOT_TOKEN e TELEGRAM_CHAT_ID: opcionais, para receber alertas
$ErrorActionPreference = 'Continue'
Set-Location $PSScriptRoot
$repo = 'KauanX28/minerador-ofertas'
$gh = 'C:\Program Files\GitHub CLI\gh.exe'

$null = & $gh auth status 2>&1
if ($LASTEXITCODE -ne 0) {
  Write-Host 'Entre na sua conta do GitHub (vai abrir o navegador com um codigo):' -ForegroundColor Cyan
  & $gh auth login --hostname github.com --git-protocol https --web --scopes workflow
}

function LerOculto($pergunta) {
  $s = Read-Host $pergunta -AsSecureString
  return [Runtime.InteropServices.Marshal]::PtrToStringAuto([Runtime.InteropServices.Marshal]::SecureStringToBSTR($s)).Trim()
}
function Gravar($nome, $valor) {
  if (-not $valor) { Write-Host "  ${nome}: pulado" -ForegroundColor DarkGray; return }
  $valor | & $gh secret set $nome --repo $repo
  if ($LASTEXITCODE -eq 0) { Write-Host "  ${nome}: gravado" -ForegroundColor Green } else { Write-Host "  ${nome}: FALHOU" -ForegroundColor Red }
}

Write-Host ''
Write-Host '1) Chave de servico do Supabase' -ForegroundColor Cyan
Write-Host '   Supabase > projeto minerador-ofertas > Project Settings > API Keys > aba "Legacy API keys" > service_role > Reveal (formato antigo)'
Write-Host '   ou, na aba "API Keys", copie a "Secret key" (sb_secret_...). NUNCA use a publishable.'
Gravar 'SUPABASE_SERVICE_ROLE_KEY' (LerOculto 'Cole a chave de servico')

Write-Host ''
Write-Host '2) Alertas no Telegram (opcional - aperte Enter para pular)' -ForegroundColor Cyan
Write-Host '   No Telegram, fale com @BotFather > /newbot > copie o token. Depois mande uma mensagem para o seu bot.'
$tg = LerOculto 'Token do bot (ou Enter para pular)'
if ($tg) {
  Gravar 'TELEGRAM_BOT_TOKEN' $tg
  try {
    $up = Invoke-RestMethod "https://api.telegram.org/bot$tg/getUpdates"
    $chat = ($up.result | Select-Object -Last 1).message.chat.id
  } catch { $chat = $null }
  if (-not $chat) { $chat = Read-Host 'Nao achei sua conversa com o bot. Mande uma mensagem para ele e digite aqui o chat_id (ou Enter para pular)' }
  Gravar 'TELEGRAM_CHAT_ID' "$chat"
  if ($chat) { Invoke-RestMethod -Method Post "https://api.telegram.org/bot$tg/sendMessage" -Body @{ chat_id = $chat; text = 'Minerador: alertas ligados.' } | Out-Null }
}

Write-Host "`nPronto. O robo usa os segredos a partir da proxima rodada." -ForegroundColor Green
