Param(
  [string]$BaseUrl = "http://127.0.0.1:8090",
  [string]$AdminEmail = "admin@example.com",
  [string]$AdminPassword = "admin123"
)

$ErrorActionPreference = 'Stop'

function ApiPost($url, $body, $headers) {
  $json = $body | ConvertTo-Json -Depth 10
  return Invoke-RestMethod -Uri $url -Method Post -Headers $headers -ContentType 'application/json' -Body $json
}

function ApiPatch($url, $body, $headers) {
  $json = $body | ConvertTo-Json -Depth 10
  return Invoke-RestMethod -Uri $url -Method Patch -Headers $headers -ContentType 'application/json' -Body $json
}

function ApiGet($url, $headers) {
  return Invoke-RestMethod -Uri $url -Method Get -Headers $headers -ContentType 'application/json'
}

Write-Host "Authenticating as admin..." -ForegroundColor Cyan
$authRes = ApiPost "$BaseUrl/api/admins/auth-with-password" @{ identity = $AdminEmail; password = $AdminPassword } @{}
$token = $authRes?.token
if (-not $token) { throw "Admin auth failed" }
$headers = @{ Authorization = "Bearer $token" }

Write-Host "Ensuring 'rounds' collection exists..." -ForegroundColor Cyan
$existing = $null
try { $existing = ApiGet "$BaseUrl/api/collections/rounds" $headers } catch {}

$payload = @{ 
  name = 'rounds';
  type = 'base';
  system = $false;
  schema = @(
    @{ name='round_id'; type='number'; required=$true; options=@{ min=0; max=$null; noDecimal=$true } },
    @{ name='chain'; type='select'; required=$true; options=@{ values=@('btc','eth') } },
    @{ name='status'; type='select'; required=$true; options=@{ values=@('ACTIVE','CLOSED','RESOLVED') } },
    @{ name='resolution_price'; type='number'; required=$false; options=@{ min=0; max=$null; noDecimal=$false } },
    @{ name='closing_price'; type='number'; required=$false; options=@{ min=0; max=$null; noDecimal=$false } },
    @{ name='up_bets'; type='number'; required=$true; options=@{ min=0; max=$null; noDecimal=$true } },
    @{ name='down_bets'; type='number'; required=$true; options=@{ min=0; max=$null; noDecimal=$true } },
    @{ name='result'; type='select'; required=$false; options=@{ values=@('UP','DOWN') } },
    @{ name='prize_pool'; type='number'; required=$true; options=@{ min=0; max=$null; noDecimal=$false } },
    @{ name='up_bets_pool'; type='number'; required=$true; options=@{ min=0; max=$null; noDecimal=$false } },
    @{ name='down_bets_pool'; type='number'; required=$true; options=@{ min=0; max=$null; noDecimal=$false } },
    @{ name='created_at'; type='date'; required=$true; options=@{} },
    @{ name='resolved_at'; type='date'; required=$false; options=@{} },
    @{ name='closed_at'; type='date'; required=$false; options=@{} }
  );
  indexes = @(
    'CREATE UNIQUE INDEX IF NOT EXISTS idx_rounds_chain_round_id ON rounds(chain, round_id)',
    'CREATE INDEX IF NOT EXISTS idx_rounds_chain_status ON rounds(chain, status)',
    'CREATE INDEX IF NOT EXISTS idx_rounds_created_at ON rounds(created_at)'
  );
  listRule = 'true';
  viewRule = 'true';
  createRule = '@request.admin != null';
  updateRule = '@request.admin != null';
  deleteRule = '@request.admin != null';
}

if ($existing) {
  Write-Host "Updating existing collection (id=$($existing.id))..." -ForegroundColor Yellow
  $res = ApiPatch "$BaseUrl/api/collections/$($existing.id)" $payload $headers
  Write-Host "Updated collection 'rounds'" -ForegroundColor Green
} else {
  Write-Host "Creating collection 'rounds'..." -ForegroundColor Yellow
  $res = ApiPost "$BaseUrl/api/collections" $payload $headers
  Write-Host "Created collection 'rounds'" -ForegroundColor Green
}

Write-Host "PocketBase 'rounds' collection is ready." -ForegroundColor Cyan

