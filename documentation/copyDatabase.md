Create a new event database from an existing one

1. copy database

> use cms
switched to db cms
> db.copyDatabase("cms","cmsClone")
(this one works on the server - the dump/restore didn't)



./mongodump --archive --db={oldkey} | ./mongorestore --archive  --nsFrom='{oldkey}.*' --nsTo='{newkey}.*'

eg

./mongodump --archive --db=cms | ./mongorestore --archive  --nsFrom='cms.*' --nsTo='newCms.*'


2. update eventDb - add an entry for new key

3. update admin in new db
    - key, name, confluenceUrl

4. restart server

5. From robo 3t

    - drop result collection
    

    