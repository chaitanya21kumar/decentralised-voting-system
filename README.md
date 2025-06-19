Temporary Read Me ( Instructions to run locally )

git pull
npm install
ganache    # to run the Ganache server

In another terminal:
truffle migrate --reset
npm run dev

Then, create a database in MongoDB, and inside it, create the following collection:

admins → Add one entry with the admin's email and password.

Next:

First, log in as admin, then upload the voter and candidate JSON files.

After that, voters can log in using the credentials sent to their email.
