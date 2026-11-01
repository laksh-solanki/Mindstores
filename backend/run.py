import sys
from pathlib import Path

import uvicorn


if __name__ == "__main__":
    sys.path.insert(0, str(Path(__file__).resolve().parent / "src"))
    uvicorn.run("app.main:app", host="localhost", port=8000, reload=True)
