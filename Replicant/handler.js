const {updateAccountKarma} = require('./db');
const {sequelize} = require('./db');
const {subredditPopulateJob} = require('./jobs/SubredditPopulateJob');
const {fetchTopPostsJob} = require('./jobs/FetchTopPostsJob');
const {schedulePostJobs} = require('./jobs/ScheduleJob');
const {farmKarmaJob} = require('./jobs/FarmKarmaJob');

/**
 *
 * @return {Promise<void>}
 */
module.exports.botHandler = async () => {
  await updateAccountKarma();
};

/**
 *
 * @return {Promise<void>}
 */
module.exports.updateHandler = async () => {
  await subredditPopulateJob();
  await fetchTopPostsJob('today');
  await sequelize.connectionManager.close();
};

/**
 *
 * @return {Promise<void>}
 */
module.exports.postHandler = async () => {
  // TODO : convert to manually updatable control values.
  await schedulePostJobs(3, 5);
  await sequelize.connectionManager.close();
};

/**
 * @return {Promise<void>}
 */
module.exports.karmaFarmingHandler = async () => {
  await farmKarmaJob();
};
