FROM node:24.1.0-bookworm
ARG NPM_REGISTRY=https://registry.npmjs.org/
RUN npm config set registry "$NPM_REGISTRY"
RUN npm install -g npm@11.5.0
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .

# Generate the Prisma client into node_modules at build time
RUN npx prisma generate

COPY docker-entrypoint.sh /usr/local/bin/entrypoint
RUN chmod +x /usr/local/bin/entrypoint

EXPOSE 80
ENTRYPOINT ["entrypoint"]
