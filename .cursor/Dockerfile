FROM ubuntu:24.04

RUN apt-get update \
    && apt-get install -y --no-install-recommends \
      ca-certificates \
      curl \
      git \
      unzip \
    && rm -rf /var/lib/apt/lists/*

ENV BUN_INSTALL=/usr/local/bun
RUN curl -fsSL https://bun.sh/install | bash -s -- bun-v1.3.1
ENV PATH="${BUN_INSTALL}/bin:${PATH}"

USER ubuntu
