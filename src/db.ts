import createSubscriber from 'pg-listen';

const subscriber = createSubscriber({
  connectionString: `postgres://${process.env.DB_USER}:${process.env.DB_PASS}@${process.env.DB_HOST}:${process.env.DB_PORT}/${process.env.DB_NAME}`
})

subscriber.events.on('connected', () => {
  console.error('Connection to database initialized')
})

subscriber.events.on('reconnect', () => {
  console.error('Connection to database lost, reconnect attempt')
})

subscriber.events.on('error', (error: Error) => {
  console.error('Fatal database connection error:', error)
  process.exit(1);
})

process.on('exit', () => {
  subscriber.close()
})

const connect = async () => {
  try{
    await subscriber.connect()
    return subscriber
  } catch(err){
    console.error('Database connection failure');
    process.exit(1);
  }
}

export {
  connect
};
