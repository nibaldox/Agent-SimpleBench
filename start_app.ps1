$currDir = Get-Location
Write-Host "Iniciando Agente Bench Web..." -ForegroundColor Green

# Detect Venv Python
$venvPython = "$currDir\venv\Scripts\python.exe"
if (Test-Path $venvPython) {
    $pythonCmd = $venvPython
    Write-Host "Using Venv Python: $pythonCmd" -ForegroundColor Gray
}
else {
    $pythonCmd = "python"
    Write-Host "Using System Python" -ForegroundColor Yellow
}

# Start Backend
Write-Host "Starting Backend (FastAPI)..."
Start-Process $pythonCmd -ArgumentList "-u -m uvicorn src.server:app --reload --port 8000 --reload-exclude '*.py' --reload-include 'src/*.py' --reload-include 'benchmarks/*.py'" -WorkingDirectory $currDir

# Start Frontend
Write-Host "Starting Frontend (Vite)..."
# Using cmd /c ensuring npm path resolution
Start-Process "cmd" -ArgumentList "/c cd web && npm run dev" -WorkingDirectory $currDir

Write-Host "------------------------------------------------"
Write-Host "Frontend: http://localhost:5173" -ForegroundColor Cyan
Write-Host "Backend:  http://localhost:8000" -ForegroundColor Cyan
Write-Host "------------------------------------------------"
