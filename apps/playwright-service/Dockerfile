FROM firecrawl:playwright-service-base

WORKDIR /app

# Install Python dependencies
COPY requirements.txt ./

# Remove py which is pulled in by retry, py is not needed and is a CVE
RUN pip config set global.index-url https://pypi.tuna.tsinghua.edu.cn/simple && \
    pip install --no-cache-dir --upgrade -r requirements.txt && \
    pip uninstall -y py && \
    playwright install chromium && playwright install-deps chromium && \
    ln -s /usr/local/bin/supervisord /usr/bin/supervisord

COPY . ./

EXPOSE $PORT
# run fast api hypercorn
CMD hypercorn main:app --bind [::]:$PORT
# CMD ["hypercorn", "main:app", "--bind", "[::]:$PORT"]
# CMD ["sh", "-c", "uvicorn main:app --host 0.0.0.0 --port $PORT"]
