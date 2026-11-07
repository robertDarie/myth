FROM node:24-bookworm-slim
ENV NODE_ENV=production HOST=0.0.0.0 PORT=8080 THRONES_DB_PATH=/data/kingdom.sqlite
WORKDIR /app
COPY --chown=node:node server/*.mjs server/package.json ./
RUN mkdir /data && chown node:node /data && chmod 700 /data
USER node
EXPOSE 8080
VOLUME ["/data"]
HEALTHCHECK --interval=15s --timeout=5s --start-period=20s --retries=3 CMD ["node", "--input-type=module", "-e", "const r=await fetch('http://127.0.0.1:8080/readyz',{signal:AbortSignal.timeout(4000)});if(!r.ok)process.exit(1)"]
CMD ["node", "index.mjs"]
