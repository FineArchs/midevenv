#!/bin/bash -euxo pipefail
export PORT=3000
export DB_PORT=5432
export REDIS_PORT=6379

cp $SCRIPTS_DIR/default.yml $MISSKEY_DIR/.config/default.yml

apt update -y
apt install curl nano jq gnupg2 apt-transport-https ca-certificates lsb-release software-properties-common uidmap ffmpeg build-essential libjemalloc-dev

# postgresql 
apt install postgresql-common
sh /usr/share/postgresql-common/pgdg/apt.postgresql.org.sh -i -v 15
db_user=misskey
db_pass=misskey
service postgresql start
sudo -iu postgres psql -c "CREATE ROLE $db_user LOGIN PASSWORD '$db_pass';";
sudo -iu postgres psql -c "CREATE DATABASE $db_name OWNER $db_user;";

# redis
curl -fsSL https://packages.redis.io/gpg | sudo gpg --dearmor -o /usr/share/keyrings/redis-archive-keyring.gpg;
echo "deb [signed-by=/usr/share/keyrings/redis-archive-keyring.gpg] https://packages.redis.io/deb $(lsb_release -cs) main" | sudo tee /etc/apt/sources.list.d/redis.list;
apt update -y
apt install redis
systemctl start redis-server;
systemctl enable redis-server;
redis_pass=misskey
echo "requirepass $redis_pass" > /etc/redis/misskey.conf
if ! grep "include /etc/redis/misskey.conf" /etc/redis/redis.conf; then
	echo "include /etc/redis/misskey.conf" >> /etc/redis/redis.conf;
fi
systemctl restart redis-server

cd $MISSKEY_DIR
export NODE_ENV=production
pnpm install --frozen-lockfile;
pnpm run build
pnpm run init
pnpm run start
