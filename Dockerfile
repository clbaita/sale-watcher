# ----- BUILD -----
# Base image used for build node js apps
FROM node:lts-alpine AS build

# Set our working directory
WORKDIR /build

# Copy our application files
COPY . .

# Install node-gyp dependencies
# RUN apk add --no-cache python3 make g++

# Install dependencies and build
RUN npm ci
RUN npm run build

# ----- APP -----
FROM node:lts-alpine

ENV NODE_ENV=production

WORKDIR /app

# Copy package files
COPY --from=build /build/package.json .
COPY --from=build /build/package-lock.json .

## Grab server deps
RUN npm ci

# Remove package files as we no longer need
RUN rm package.json 
RUN rm package-lock.json

# Copy our static assets from our build container
COPY --from=build /build/dist .
COPY --from=build /build/data.json .

RUN chown -R node:node /app

# At the end, set the user to use when running this image
USER node

# Entry point
CMD ["node", "index.js"] 