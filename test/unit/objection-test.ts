import * as Knex from 'knex';
import { setupUnitTest } from 'denali';
import { ObjectionAdapter } from 'denali-objection';
import runAdapterTests from 'denali-adapter-test-suite';
import * as tmp from 'tmp';

// Connect to the database
let knex = Knex({
  client: 'sqlite3',
  useNullAsDefault: true,
  connection: {
    filename: tmp.fileSync({ unsafeCleanup: true, postfix: '.db' }).name
  }
});

const test = setupUnitTest(() => new ObjectionAdapter(), {
  'model:post': true,
  'model:comment': true
});

test.before(async () => {
  let { schema } = knex;
  await schema.dropTableIfExists('posts');
  await schema.dropTableIfExists('comments');
  // Posts
  await schema.createTableIfNotExists('posts', (posts) => {
    posts.increments('id');
    posts.text('title');
  });
  // Comments
  await schema.createTableIfNotExists('comments', (comments) => {
    comments.increments('id');
    comments.text('body');
    comments.integer('post_id').references('post.id');
  });
});

test.beforeEach((t: any) => {
  return new Promise((resolve) => {
    t.context.transaction = knex.transaction((trx) => {
      t.context.transactionClient = trx;
      t.context.inject('objection:knex', trx, { singleton: false });
      resolve();
    }).catch((reason) => {
      if (reason !== 'finished') {
        throw reason;
      }
    });
  });
});

test.afterEach.always(async (t: any) => {
  await t.context.transactionClient.rollback('finished');
});

runAdapterTests(test, ObjectionAdapter);
