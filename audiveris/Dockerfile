FROM ubuntu:22.04

WORKDIR /app

ENV DEBIAN_FRONTEND=noninteractive

RUN apt-get update && apt-get install -y \
    python3 \
    python3-pip \
    libfreetype6 \
    libfontconfig1 \
    libjpeg-turbo8 \
    libpng16-16 \
    tesseract-ocr \
    tesseract-ocr-eng \
    tesseract-ocr-ita \
    curl \
    && rm -rf /var/lib/apt/lists/*

RUN pip3 install --no-cache-dir flask flask-cors gunicorn

COPY audiveris /opt/audiveris

ENV PATH="/opt/audiveris/bin:${PATH}"

COPY server.py .

EXPOSE 8080

CMD ["gunicorn", "-b", "0.0.0.0:8080", "-w", "2", "--timeout", "600", "--graceful-timeout", "600", "server:app"]