FROM python:3.11-slim

WORKDIR /app

ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1

# Oracle Instant Client para modo thick (necesario para DPY-3015: verifier 10G)
# En Linux NO usar lib_dir: se registra con ldconfig
RUN apt-get update && apt-get install -y --no-install-recommends \
    libaio1t64 wget unzip \
    && ln -sf /usr/lib/x86_64-linux-gnu/libaio.so.1t64 /usr/lib/x86_64-linux-gnu/libaio.so.1 \
    && wget -q https://download.oracle.com/otn_software/linux/instantclient/instantclient-basiclite-linuxx64.zip -O /tmp/ic.zip \
    && unzip -q /tmp/ic.zip -d /opt/oracle \
    && echo /opt/oracle/instantclient_* >> /etc/ld.so.conf.d/oracle-instantclient.conf \
    && ldconfig \
    && rm /tmp/ic.zip \
    && apt-get purge -y wget unzip \
    && apt-get autoremove -y \
    && rm -rf /var/lib/apt/lists/*

# Microsoft ODBC Driver 18 for SQL Server (pyodbc)
# python:3.11-slim = Debian Trixie (13). El repo de Debian 12 usa SHA-1 rechazado desde 2026-02-01
RUN apt-get update && apt-get install -y --no-install-recommends curl ca-certificates \
    && curl -sSL -o /tmp/packages-microsoft-prod.deb https://packages.microsoft.com/config/debian/13/packages-microsoft-prod.deb \
    && dpkg -i /tmp/packages-microsoft-prod.deb && rm /tmp/packages-microsoft-prod.deb \
    && apt-get update \
    && ACCEPT_EULA=Y apt-get install -y --no-install-recommends msodbcsql18 unixodbc-dev libgssapi-krb5-2 libkrb5-3 \
    && apt-get purge -y curl \
    && apt-get autoremove -y \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .
ENV PYTHONPATH=/app

EXPOSE 8000

CMD ["sh", "-c", "alembic upgrade head 2>/dev/null || true && uvicorn main:app --host 0.0.0.0 --port 8000"]
