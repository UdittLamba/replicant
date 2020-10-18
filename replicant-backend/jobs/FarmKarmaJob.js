const {
  sequelize,
  getAccount,
  createRequester,
  getPost,
  insertSubmittedPost,
  setIsDone,
} = require('../db');
const dayjs = require('dayjs');
const {report} = require('../comms/telegram/replicantMessenger');

/**
 * Job that posts on reddit through one of the randomly selected bot accounts
 * in order to farm karma.
 * @return {Promise<Message|boolean>}
 */
farmKarmaJob = async () => {
  try {
    const jobs = await sequelize.models.PostQueue.findAll(
        {
          where: {
            toBePostedAt: dayjs().hour(),
            isDone: false,
          },
        },
    );
    if (typeof jobs != 'undefined' && jobs != null && jobs.length > 0) {
      return await farmKarma(jobs);
    } else {
      return false;
    }
  } catch (e) {
    throw e;
  }
};

/**
 * Iterate through job objects and post them on reddit.
 * @param {object[]} jobs
 * @return {Promise<Message>}
 */
farmKarma = async (jobs) => {
  let account = null;
  for (const job of jobs) {
    account = await getAccount(job.dataValues.submitter);
    const requester = await createRequester(account);
    await executeSubmission(account, job, requester);
    return await report(job.dataValues.submitter +
        ' just submitted on Reddit!');
  }
};

/**
 * Handles the process of submitting a post on reddit through replicant.
 *
 * @param {object} account
 * @param {object} job
 * @param {object} requester
 * @return {Promise<boolean>}
 */
executeSubmission = async (account, job, requester) => {
  const post = await getPost(job.dataValues.postId);
  if (post) {
    await recordSubmission(post, requester, job);
  } else {
    return false;
  }
};

/**
 * Submits post on reddit.
 * Inserts inti submittedPost table for history.
 * sets the flag isDone to true.
 *
 * @param {object} post
 * @param {object} requester
 * @param {object} job
 * @return {object} {Promise<void>}
 */
recordSubmission = async (post, requester, job) => {
  await submitPost(post, requester);
  await insertSubmittedPost(job);
  await setIsDone(job.dataValues.postId, true);
};

/**
 * Submits post on reddit.
 *
 * @param {object} post
 * @param {object} requester
 * @return {Promise<Submission | void>}
 */
submitPost = async (post, requester) => {
  if (post.dataValues.url != null || '') {
    console.log(post.dataValues.subreddit);
    return requester.getSubreddit(post.dataValues.subreddit).submitLink({
      title: post.dataValues.title,
      url: post.dataValues.url,
    }).catch((err) => console.log(err));
  }
  if (post.dataValues.isSelf === true && post.dataValues.edited === false) {
    console.log(post.dataValues.subreddit);
    return requester.getSubreddit(post.dataValues.subreddit).submitSelfPost({
      title: post.dataValues.title,
      text: post.dataValues.selfText,
    }).catch((err) => console.log(err));
  }
};

farmKarmaJob().then();

module.exports = {
  farmKarmaJob,
};
