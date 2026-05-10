require('dotenv').config();
const { runPipeline } = require('./src/schedulers/cronJobs');
runPipeline().then(console.log).catch(console.error);
