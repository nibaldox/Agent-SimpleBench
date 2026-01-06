import sys
import os

# Add current directory to path to allow imports
sys.path.append(os.getcwd())

try:
    from benchmarks.eval_cases import TASKS
    
    print(f"Successfully imported TASKS. Total count: {len(TASKS)}")
    
    ifeval_tasks = [t for t in TASKS if t.category == 'instruction-following']
    print(f"Found {len(ifeval_tasks)} instruction-following tasks:")
    
    for t in ifeval_tasks:
        print(f" - {t.id}: {t.name} ({t.difficulty})")
        
    expected_ids = [
        "IF001", "IF002", "IF003", 
        "IF004", "IF005", "IF006", 
        "IF007", "IF008", "IF009"
    ]
    
    found_ids = [t.id for t in ifeval_tasks]
    missing = [ID for ID in expected_ids if ID not in found_ids]
    
    if missing:
        print(f"ERROR: Missing tasks: {missing}")
        sys.exit(1)
    
    print("All expected instruction-following tasks are present.")
    
except Exception as e:
    print(f"ERROR: Failed to import or verify tasks: {e}")
    sys.exit(1)
