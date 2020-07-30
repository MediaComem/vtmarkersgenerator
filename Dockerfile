FROM osgeo/gdal:ubuntu-small-3.1.2

ENV TCPWAIT_VERSION=2.2.0

# * Install tools required to compile npm packages and binaries.
# * Add tcpwait to wait for the database connection.
RUN apt-get update && \
    apt-get install -qy \
      g++ \
      git \
      make \
      wget \
      --no-install-recommends && \
      wget -O /usr/local/bin/tcpwait https://github.com/AlphaHydrae/tcpwait/releases/download/v${TCPWAIT_VERSION}/tcpwait_v${TCPWAIT_VERSION}_linux_amd64 && \
      chmod +x /usr/local/bin/tcpwait

# Copy tippecanoe files for build
RUN mkdir -p /tmp/tippecanoe-src
RUN apt-get -qy install libsqlite3-dev zlib1g-dev --no-install-recommends && \
    git clone https://github.com/mapbox/tippecanoe.git /tmp/tippecanoe-src
WORKDIR /tmp/tippecanoe-src

# Install tippecanoe
RUN make && \
    make install

# Remove the tippecanoe temp directory and unneeded packages
WORKDIR /
RUN rm -rf /tmp/tippecanoe-src \
  && apt-get -y remove --purge build-essential && apt-get -y autoremove

# Install node 14.x
RUN curl -sL https://deb.nodesource.com/setup_14.x | bash - && \
    apt-get install -qy nodejs

# The application will be mounted into this directory.
WORKDIR /usr/src/app

# Create non-privileged smapshot_vt user & group.
RUN addgroup --system smapshot_vt && \
    adduser --system smapshot_vt && \
    adduser smapshot_vt smapshot_vt && \
    chown smapshot_vt:smapshot_vt /usr/src/app

USER smapshot_vt:smapshot_vt

# Install dependencies.
COPY --chown=smapshot_vt:smapshot_vt package.json package-lock.json /usr/src/app/
RUN npm ci && \
    npm cache clean --force

# Copy the application sources and delete development dependencies.
COPY --chown=smapshot_vt:smapshot_vt ./ /usr/src/app/
RUN npm run build

# Wait for the database to be reachable before running the application.
ENTRYPOINT [ \
  "tcpwait", \
  "--interval", "${TCPWAIT_INTERVAL-1000}", \
  "--retries", "${TCPWAIT_ATTEMPTS-59}", \
  "--timeout", "${TCPWAIT_TIMEOUT-1000}", \
  "${DB_HOST-db}:${DB_PORT-5432}", \
  "--" \
]

CMD [ "node", "dist/index.js" ]
