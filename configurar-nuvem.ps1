# Liga o Minerador ao banco na nuvem (Supabase) em um passo.
# Pede a URL de conexão uma vez (fica oculta na tela) e:
#   1. grava DATABASE_URL como segredo no GitHub (robô 24h)
#   2. grava DATABASE_URL na Vercel (painel online)
#   3. copia para a nuvem os dados que você já minerou no computador
#   4. republica o painel e dispara a primeira rodada do robô
#   Use -PularMigracao se os dados ja foram copiados.
param([switch]$PularMigracao)
$ErrorActionPreference = 'Continue'   # erros checados pelo $LASTEXITCODE de cada comando
Set-Location $PSScriptRoot
$repo = 'KauanX28/minerador-ofertas'
$gh = 'C:\Program Files\GitHub CLI\gh.exe'
$cfg = Join-Path $PSScriptRoot '.vercel-cli'

# Login no GitHub nesta janela (se ainda nao estiver logado).
$null = & $gh auth status 2>&1
if ($LASTEXITCODE -ne 0) {
  Write-Host 'Entre na sua conta do GitHub (vai abrir o navegador com um codigo):' -ForegroundColor Cyan
  & $gh auth login --hostname github.com --git-protocol https --web --scopes workflow
  if ($LASTEXITCODE -ne 0) { throw 'Login no GitHub nao concluido.' }
}

Write-Host ''
Write-Host 'Supabase > projeto minerador-ofertas > botao Connect > aba "Transaction pooler" (porta 6543).' -ForegroundColor Cyan
Write-Host 'Copie a URL e troque [YOUR-PASSWORD] pela senha do banco.' -ForegroundColor Cyan
$seguro = Read-Host 'Cole aqui a URL de conexao' -AsSecureString
$url = [Runtime.InteropServices.Marshal]::PtrToStringAuto([Runtime.InteropServices.Marshal]::SecureStringToBSTR($seguro)).Trim()
if ($url -notmatch '^postgres(ql)?://') { throw 'A URL precisa comecar com postgresql://' }
if ($url -match '\[YOUR-PASSWORD\]') { throw 'Troque [YOUR-PASSWORD] pela senha do banco antes de colar.' }

$env:DATABASE_URL = $url
if (-not $PularMigracao) {
  Write-Host "`n[1/4] Testando a conexao e copiando os dados locais para a nuvem..." -ForegroundColor Yellow
  node --no-warnings src/migrar-para-nuvem.js
  if ($LASTEXITCODE -ne 0) { throw 'Nao consegui conectar no banco. Confira a URL e a senha.' }
} else { Write-Host "`n[1/4] Dados ja copiados, pulando." -ForegroundColor Yellow }

Write-Host "`n[2/4] Gravando o segredo DATABASE_URL no GitHub..." -ForegroundColor Yellow
$url | & $gh secret set DATABASE_URL --repo $repo
if ($LASTEXITCODE -ne 0) { throw 'Falha ao gravar o segredo no GitHub.' }

Write-Host "`n[3/4] Gravando DATABASE_URL na Vercel e republicando o painel..." -ForegroundColor Yellow
npx --yes vercel@latest env rm DATABASE_URL production --yes --global-config $cfg 2>$null | Out-Null
$url | npx --yes vercel@latest env add DATABASE_URL production --global-config $cfg
npx --yes vercel@latest deploy --prod --yes --global-config $cfg | Select-Object -Last 1

Write-Host "`n[4/4] Disparando a primeira rodada do robo no GitHub Actions..." -ForegroundColor Yellow
& $gh workflow run minerador.yml --repo $repo -f tarefa=rotina

Remove-Item Env:DATABASE_URL
Write-Host "`nPronto! Painel: https://minerador-ofertas-weld.vercel.app" -ForegroundColor Green
Write-Host "Robo rodando: https://github.com/$repo/actions" -ForegroundColor Green
