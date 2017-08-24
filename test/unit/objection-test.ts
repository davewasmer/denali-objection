import test, { TestContext, Context } from 'ava';
import * as Knex from 'knex';
import { Container } from 'denali';
import { ObjectionAdapter } from 'denali-objection';
import testAdapter from 'denali-adapter-test-suite';
import * as tmp from 'tmp';

// Connect to the database
let knex = Knex({
  client: 'sqlite3',
  useNullAsDefault: true,
  connection: {
    filename: tmp.fileSync({ unsafeCleanup: true, postfix: '.db' }).name
  }
});


// Run migrations to get the schema the test suite needs
test.before(async () => {
  let { schema } = knex;

  // Posts
  await schema.dropTableIfExists('posts');
  await schema.createTableIfNotExists('posts', (posts) => {
    posts.increments('id');
    posts.text('title');
  });

  // Comments
  await schema.dropTableIfExists('comments');
  await schema.createTableIfNotExists('comments', (comments) => {
    comments.increments('id');
    comments.text('body');
    comments.integer('post_id').references('post.id');
  });

});

// Run every test inside a transaction
test.beforeEach(async (t) => {
  return new Promise((resolve) => {
    t.context.transaction = knex.transaction((trx) => {
      t.context.transactionClient = trx;
      resolve();
    }).catch((reason) => {
      if (reason !== 'finished') {
        throw reason;
      }
    });
  });
});

// Rollback test transactions when the test finishes
test.afterEach.always(async (t) => {
  // if (!t.context.transaction.isCompleted()) {
    await t.context.transactionClient.rollback('finished');
  // }
});

testAdapter(test, ObjectionAdapter, async (t: TestContext & Context<any>, container: Container) => {
  container.register('objection:knex', t.context.transactionClient);
});
