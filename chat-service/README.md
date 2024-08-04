## Install .venv

```bash
python -m venv .venv
```

## Active .venv

```bash
.\.venv\Scripts\activate
```

## Install dependencies

```bash
pip install -r requirements.txt
```

-   Add dependencies to requirements.txt

```bash
pip freeze > requirements.txt
```

## Run

```bash
uvicorn app.api.main:app --reload
```
